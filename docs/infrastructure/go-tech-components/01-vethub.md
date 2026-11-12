# VetHub

> **Role in claim submission:** the vet-facing gateway. Vet practice management systems (VPMS) and Tyro lodge claims and attachments here; VetHub prepares each claim and holds it until the insurer's COS downloads it. Status, gap benefit and policy-number corrections come back from COS and are pushed to the vets.
> **Deployment model:** one shared deployment for all insurers (AU, Luna, Trupanion, NZ, VP); insurer routing happens inside the code.
> **Back to:** [Component index](README.md) · Insurer view: [Australia → VetHub](../go-tech-platform/01-australia.md#2-vethub-shared)

## 1. Deployment picture

![VetHub Global](../01%20-%20Global%20-%20VetHub%20Global.png)

Global picture (VetHub has no per-insurer deployment, so there are no other variants).

## 2. Interfaces for claim submission

Base URLs: `{vh}` = `https://api-vh-prod.vethub.net` (through Cloudflare) or `https://internal-api-vh-prod.petsure.com.au` (APIM back-end and internal callers); `{apim}` = `https://ps-prod-apim-vethub.azure-api.net` (*inferred*).

### 2.1 Claim lodgement by the vet (inbound)

| # | Kind | Interface | Called by |
|---|---|---|---|
| 1 | REST API | `GET {vh}/api/Claim/NewConversationId` | VPMS; Tyro through APIM (`GET {apim}/Claim/NewConversationId`) |
| 2 | REST API | `GET {vh}/api/Claim/{conversationId}/Attachment/NewConversationId` | VPMS; Tyro through APIM |
| 3 | REST API | `POST {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}` | VPMS; Tyro through APIM |
| 4 | REST API | `POST {vh}/api/Claim/{conversationId}` — submit claim (VetXML or JSON); the only signal that the vet has sent everything (see [2.1.1](#211-lodgement-sequence-and-when-a-conversation-is-complete)) | VPMS; Tyro through APIM |
| 5 | REST API | `GET {vh}/api/policy/validate` | VPMS; Tyro through APIM (`GET {apim}/Policy/validate`) |
| 6 | REST API | `GET {vh}/api/GapOnly/Eligibility` | VPMS; COS ValidatePolicy (`GapEligibilityCheckEndPoint`, *inferred* to be this operation) |
| 7 | REST API | `POST {vh}/api/Claim/{conversationId}/GapOnly/ConfirmFinalPayment` | VPMS; Tyro through APIM |
| 8 | REST API | `GET {vh}/api/Poll/{pollId}`, `GET {vh}/api/Poll/LastRef`, `GET {vh}/api/Poll/{conversationId}/Status` | VPMS (status polling) |
| 9 | REST API | `POST {vh}/api/Claim/{conversationId}/Acknowledge` | VPMS |

#### 2.1.1 Lodgement sequence and when a conversation is complete

Confirmed by Go Tech on 30 Oct 2026. A VPMS submits a claim with four calls (rows 1–4 above), in this order:

| Step | Call | What happens | Status |
|---|---|---|---|
| 1 | `GET {vh}/api/Claim/NewConversationId` | Creates the **claim conversation** | `11000` |
| 2 | `GET {vh}/api/Claim/{conversationId}/Attachment/NewConversationId` | Creates an **attachment conversation**, linked to the claim conversation by its parent `conversationId`. Called once per attachment | `31000` |
| 3 | `POST {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}` | Uploads the file of one attachment | `32002`, then `33000` |
| 4 | `POST {vh}/api/Claim/{conversationId}` | **Submits the claim.** The VPMS is telling VetHub that it has sent all relevant attachments | `ClaimIsReceived` (`12002`, *inferred*) |

Rules:

- **Step 4 is the only completion signal.** Attachments are created and uploaded one by one, and nothing in the attachment API or its statuses says which one is the last. Until the VPMS calls step 4, VetHub cannot know that the conversation is complete.
- **VetHub starts processing only after step 4.** `ProcessConversations` (row 20) picks up the claim at `12002` and starts the claim-preparation saga.
- **COS can pick up the claim only when both conditions hold:** at least one attachment is *valid*, and every attachment conversation created in step 2 for this claim has been handled (supported and uploaded, or timed out). The claim then becomes ready to download (`ClaimReadyToDownload`, `13000`) and is returned by `GET api/Claim/NewConversations` (row 10).
- **Consequence for design:** a "conversation completed" signal can only come from step 4 or later. The earliest point where the claim is complete *and* ready for the insurer is `13000`, not any attachment upload.

Go Tech gave the statuses of steps 1–3. The status after step 4 (`12002`) and the ready-to-download status (`13000`) come from the source-code analysis in [`VetHub-summary.md`](../../systems/VetHub/VetHub-summary.md); `12002` after step 4 is *inferred* from Go Tech's statement that processing starts only after step 4.

### 2.2 Hand-over to the insurer (inbound, insurer-facing)

| # | Kind | Interface | Called by |
|---|---|---|---|
| 10 | REST API (polled) | `GET {vh}/api/Claim/NewConversations?numberOfClaims=&claimType=` | COS VetHub Poller (AU, NZ, VP) — timer per insurer |
| 11 | REST API | `GET {vh}/api/Claim/{conversationId}` | COS VetHub SaveClaims |
| 12 | REST API | `GET {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}` | COS VetHub SaveClaims |
| 13 | REST API | `POST {vh}/api/Claim/{conversationId}/ConfirmDownload` | COS VetHub SaveClaims |
| 14 | REST API | `POST {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}/ConfirmDownload` | COS VetHub SaveClaims |
| 15 | REST API | `POST {vh}/api/Claim/{conversationId}/UpdateStatus/ClaimProcessing` · `/ClaimSettled` · `/ClaimDeclined` | COS (SubmitClaims, UPM Status Poller, COS.API) |
| 16 | REST API | `POST {vh}/api/Claim/{conversationId}/Nullify` | COS UPM Status Poller (UPM cancelled status → VetHub status `-999`); COS.API `POST api/Claims/UpdateStatus` with a cancelled status (Vet Partners via Boomi) |
| 17 | REST API | `POST {vh}/api/Claim/{conversationId}/UpdatePolicyNumber/{*policyNumber}` | COS (policy-number correction) |
| 18 | REST API | `POST {vh}/api/Claim/{conversationId}/GapOnly/BenefitAmount` | COS (gap-only benefit) |
| 19 | REST API | `GET` / `POST {vh}/api/GapOnly/{conversationId}/VetFee` | COS |

### 2.3 Internal data polling

| # | Kind | Interface | Notes |
|---|---|---|---|
| 20 | Data polling from VetHub_PROD | `VetHub.Service.ProcessConversations`, every 5 s: conversations with status `ClaimIsReceived` (12002) → `ProcessClaimCommand` on Service Bus | Starts the claim-preparation saga |
| 21 | Data polling from VetHub_PROD | `VetHub.Service.StatusUpdate`, every 60 s: changed `PollClaim` rows → ezyVet | Status push to vets |
| 22 | Data polling from VetHub_PROD and the COS AU / NZ databases | `VetHub.Alert.StuckClaims`, every 90 s | Stuck-claim e-mails |

### 2.4 Outbound calls

| # | Target | Interface |
|---|---|---|
| 23 | CLAPI (AU / NZ / VP, routed by insurer) | `POST api/Policy/Find`, `GET api/Policy/DetailsByPolicyNumber` |
| 24 | COS.API (AU / NZ / VP) | `POST api/GapOnly/ConfirmFinalPayment` |
| 25 | Tyro (external) | `POST https://gaponly-api.tyrohealth.com/trpc/webhook.vethub.adjudicateClaim` |
| 26 | ezyVet (external) | `POST https://integrations.ezyvet.com/call/claim/updateStatus` |
| 27 | Storage API (Go Tech helper) | `api/documents/UploadFile`, `MoveFile`, `RenameFile`, `{id}` |

## 3. Databases

| Use | Database | Server | Notes |
|---|---|---|---|
| **Write** | `VetHub_PROD` | Azure SQL `petsure-production` | DTU 400; failover group to `p3-ro-db`; Data Sync to the DWH. Shared by the APIs and all Windows services — it is the hand-off point between the API and the async pipeline |
| **Write** | NServiceBus persistence (`NSBusPersistenceDB`) | Azure SQL (PROD name not in repo) | Saga state of `VetHub.Service.Saga.Claim` |
| **Read only** | `COS_PROD`, COS NZ DB (`COS_PROD_NZ`, *inferred*) | Azure SQL `petsure-production` | Read by `VetHub.Alert.StuckClaims` only — a cross-system DB dependency |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| Azure SQL Database | `VetHub_PROD` on `petsure-production`; failover group `p3-ro-db`; SQL Data Sync | System of record; DR copy; feed to the DWH |
| Azure Service Bus | NServiceBus queues `<ENV>_VetHub.Service.Saga.Claim` etc. (`AzureServiceBusConnection_SYD`) | Claim-preparation pipeline between the Windows services |
| Azure Key Vault | `pssydprdvethubapikv`, `pssydprdvhregkv`, `pssydprdvetportalkv`, `pssydprdvhuikv` | Connection strings, Tyro keys and credentials via `@Microsoft.KeyVault(...)` |
| Azure Cache for Redis | `ps-syd-prd-vethubapi-redis` (C1 Standard) | HybridCache for VetHub.API |
| Azure Storage (Blob) | `p3storageprod` (through the Storage API); `petcdnstore/vethubui-prod` | Attachments and generated PDFs; VetHub.UI static assets |
| Application Insights / Log Analytics | `ps-syd-prd-vethubapi-ai`; legacy services → `ps-prd-insight-p3`; APIM → `ps-prod-insights-vethubapim` | Telemetry and Azure Monitor alerts |
| Entra ID | VetHub API app registration | APIM JWT validation (Tyro); AAD bearer tokens from platforms |
| VNet integration / Private Endpoints | `ps-syd-prd-vethubapi-vnet` (10.52.16.0/22) | Outbound from App Services to legacy SQL and internal APIs through the hub |
| Hub (Azure Firewall, DNS Private Resolver) | `ps-syd-prd-hub-afw`, `ps-syd-prd-hub-dnspr` | Egress and name resolution of internal names |

Cloudflare (WAF, DDoS, rate limit) sits in front of `*.vethub.net`; it is not an Azure service.

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| **Shared** | VetHub.API, VetHub.Reg.API, Vet.Portal.API: **.NET 10**. VetHub.UI: Node (React 19 + Vite, Express 5). Windows services (`VetHub.Service.*`, `ProcessConversations`, `StatusUpdate`, `Alert.StuckClaims`): **.NET Framework 4.x / 4.8**. MessageFormat.API: **.NET Framework 4.8** | MessageFormat.API on `PS-PRD-AZS-P3-1/2`: **TBC**. The four front-end apps are on App Service (no IIS to manage) | **App Service** (Windows P1v3, zone-redundant, staging slot): `ps-syd-prd-vethub-vhapi-app`, `-vhregapi-app`, `-vhportalapi-app`, `-vhui-app` on plan `ps-syd-prd-vethub-asp`. **API Management** `ps-prod-apim-vethub` (Basic_1). **Virtual Machines**: `PS-PRD-AZS-P3-3` (Windows services, *inferred*), `PS-PRD-AZS-P3-1/2` (MessageFormat.API). **Azure SQL Database** `VetHub_PROD` |
| Australia PetSure | *uses Shared* | — | — |
| Trupanion | *uses Shared* | — | — |
| New Zealand | *uses Shared* | — | — |
| Vet Partners | *uses Shared* | — | — |

## 6. Open points

- Windows-service host `PS-PRD-AZS-P3-3` is *inferred*.
- PRTG still shows IIS VetHub.API / VetPortal.API sensors that no longer exist after 2026_R4.
- Naming conflict: `ps-syd-prd-vethub-rg` / `-redis` (design page) vs `ps-syd-prd-vethubapi-rg` / `-redis` (runsheet, code).
- Attachment rules (2.1.1): what makes an attachment *valid*, how long VetHub waits before an attachment conversation times out (`ClaimTimeOut` in `VetHub.Service.Saga.Claim`), and whether a claim with no attachment at all ever reaches COS are not documented. Ask Go Tech.
- The COS gap-eligibility endpoint (`GapEligibilityCheckEndPoint`) is configured but its URL is not in the repo; mapping to `GET api/GapOnly/Eligibility` is *inferred*.

## 7. Confluence pages

Pages found on Confluence on 28 Oct 2026. The *Technical Assessments* (Mar 2026) are per-repo code reviews; they predate 2026_R4.

| Page | Space | What it adds |
|---|---|---|
| [VetHub in Azure Landing Zone (Prod)](https://petsure.atlassian.net/wiki/spaces/P3/pages/2021130259) | P3 | Subscription, RG, plan `ps-syd-prd-vethub-asp` (P1v3, Windows, zone-redundant, burst to 9), per-app settings (.NET 10, Always On, access restrictions), Key Vaults |
| [VetHub App Service Mappings](https://petsure.atlassian.net/wiki/spaces/P3/pages/2162327561) | P3 | App Service names, external / internal / staging DNS and Entra client IDs per environment |
| [2026_R4 PROD Runsheet (Part 2)](https://petsure.atlassian.net/wiki/spaces/P3/pages/2225307672) | P3 | Cut-over of the VetHub APIs and UI to App Service |
| [2026_R4 PROD Runsheet (Part 3 – Cleanup)](https://petsure.atlassian.net/wiki/spaces/P3/pages/2238513154) | P3 | Decommission of the IIS copies on `PS-PRD-AZS-P3-1/2`, `NZ-PRD-AZ-P3WEB`, `PS-PRD-AZ-P3WEB`; **MessageFormat.API to be decommissioned**; dead config removed |
| [GOTech Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734) | P3 | Deployment target per repo. Confirms the Windows services on `PS-PRD-AZS-P3-3`; MessageFormat.API also on the NZ / VP web servers |
| [Upgrade VetHub.API to .Net 10 Planning](https://petsure.atlassian.net/wiki/spaces/P3/pages/1849655297) | P3 | Planning for the .NET 10 upgrade |
| [MessageFormat.API – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1735327757) | P3 | No inbound auth, CORS `*`, path-traversal risk on `Images`, no logging |
| [VetHub.Service – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728708610) | P3 | NServiceBus services, MSMQ logging, PS-remoting deployment |
| [VetHub.Service.ProcessConversations – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728774197) | P3 | Topshelf service as LocalSystem, MSMQ logging |
| [VetHub.Service.StatusUpdate – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1686044727) | P3 | EzyVet status push; runs on an Azure VM as LocalSystem |
| [VetHub.Alert.StuckClaims – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1696825395) | P3 | Reads COS AU / NZ DBs; SMTP without TLS |
| [VetHub.API – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1687715854) | P3 | Pre-R4 (.NET 4.8 / IIS) assessment; superseded by the .NET 10 App Service version |
| [VetHub.Reg.API – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1697939553) | P3 | Registration API |
| [Vet.Portal.API – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728774173) | P3 | Vet portal API |
| [VetHub.UI – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728905253) | P3 | UI |
| [VetHub API Manager – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1687912451) | P3 | APIM configuration |
| [VetHub.Security.API – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728774185) | P3 | Security API (being decommissioned; functions merged into VetHub.Reg.API) |
| [CXPRFRINITD024-15994 – Security.API function merged into VetHub.Reg.API](https://petsure.atlassian.net/wiki/spaces/P3/pages/2038562873) | P3 | Story for removing VetHub.Security.API |
| [VetHub.Data – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1687552025) | P3 | Shared data model (4.6.1 DLL used by the services) |
| [VetHub.SQLServer – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1737588834) | P3 | Database project |
| [COS & VetHub Service Bus Message Maps](https://petsure.atlassian.net/wiki/spaces/P3/pages/2180481051) | P3 | NServiceBus queues and messages between VetHub and COS |
| [LogManager.Handler & Log4Net Configuration Audit](https://petsure.atlassian.net/wiki/spaces/P3/pages/2164260872) | P3 | MSMQ `TransactionMessageLog` on every PROD server; services' startup / recovery settings |
| [VetHub Stuck Claims](https://petsure.atlassian.net/wiki/spaces/P3/pages/1804730451) | P3 | How stuck claims are detected |
| [VetHub_PROD – ClaimBlob Archive & Purge Runbook](https://petsure.atlassian.net/wiki/spaces/BIDM/pages/2402680866) | BIDM | Data retention in `VetHub_PROD` |
| [Azure App Services Disaster Recovery Review](https://petsure.atlassian.net/wiki/spaces/P3/pages/1078886401) | P3 | App Service DR (manual failover to Australia Southeast) |
