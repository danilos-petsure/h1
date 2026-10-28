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
| 4 | REST API | `POST {vh}/api/Claim/{conversationId}` — submit claim (VetXML or JSON) | VPMS; Tyro through APIM |
| 5 | REST API | `GET {vh}/api/policy/validate` | VPMS; Tyro through APIM (`GET {apim}/Policy/validate`) |
| 6 | REST API | `GET {vh}/api/GapOnly/Eligibility` | VPMS; COS ValidatePolicy (`GapEligibilityCheckEndPoint`, *inferred* to be this operation) |
| 7 | REST API | `POST {vh}/api/Claim/{conversationId}/GapOnly/ConfirmFinalPayment` | VPMS; Tyro through APIM |
| 8 | REST API | `GET {vh}/api/Poll/{pollId}`, `GET {vh}/api/Poll/LastRef`, `GET {vh}/api/Poll/{conversationId}/Status` | VPMS (status polling) |
| 9 | REST API | `POST {vh}/api/Claim/{conversationId}/Acknowledge` | VPMS |

### 2.2 Hand-over to the insurer (inbound, insurer-facing)

| # | Kind | Interface | Called by |
|---|---|---|---|
| 10 | REST API (polled) | `GET {vh}/api/Claim/NewConversations?numberOfClaims=&claimType=` | COS VetHub Poller (AU, NZ, VP) — timer per insurer |
| 11 | REST API | `GET {vh}/api/Claim/{conversationId}` | COS VetHub SaveClaims |
| 12 | REST API | `GET {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}` | COS VetHub SaveClaims |
| 13 | REST API | `POST {vh}/api/Claim/{conversationId}/ConfirmDownload` | COS VetHub SaveClaims |
| 14 | REST API | `POST {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}/ConfirmDownload` | COS VetHub SaveClaims |
| 15 | REST API | `POST {vh}/api/Claim/{conversationId}/UpdateStatus/ClaimProcessing` · `/ClaimSettled` · `/ClaimDeclined` | COS (SubmitClaims, UPM Status Poller, COS.API) |
| 16 | REST API | `POST {vh}/api/Claim/{conversationId}/Nullify` | COS UPM Status Poller |
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
- The COS gap-eligibility endpoint (`GapEligibilityCheckEndPoint`) is configured but its URL is not in the repo; mapping to `GET api/GapOnly/Eligibility` is *inferred*.
