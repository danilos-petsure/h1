# COS — Claim Orchestration Service

> **Role in claim submission:** orchestrates each claim from the moment it leaves VetHub until it is submitted to the insurer. It downloads the claim, creates the Claim Reference Number (CRN), validates the policy, asks Claims Automation for an assessment, submits the claim and its attachments through CLAPI, optionally lodges it through Dynamic CLAPI, then polls UPM+ for status changes and reports them back to VetHub.
> **Deployment model:** one stack per insurer — Australia (also serves Trupanion and Luna), New Zealand, Vet Partners.
> **Back to:** [Component index](README.md) · Insurer views: [Australia](../go-tech-platform/01-australia.md#3-cos--claim-orchestration-service) · [Trupanion](../go-tech-platform/02-trupanion.md#3-cos-australian-stack) · [New Zealand](../go-tech-platform/03-new-zealand.md#3-cos--claim-orchestration-service) · [Vet Partners](../go-tech-platform/04-vet-partners.md#3-cos--claim-orchestration-service)

## 1. Deployment picture

![COS Australia + Trupanion](../03%20-%20Australia%20-%20COS%20Australia%20and%20Trupanion.png)

Other environments: [COS New Zealand](../12%20-%20New%20Zealand%20-%20COS%20New%20Zealand.png) · [COS Vet Partners](../16%20-%20Vet%20Partners%20-%20COS%20Vet%20Partners.png)

## 2. Interfaces for claim submission

Base URL `{cos}` = `https://api-cos-prod.petsure.com.au` (AU + TPN + Luna), `https://api-cos-prod-nz.petsure.com.au` (NZ), `https://api-cos-prod-vp.petsure.com.au` (VP, from VetHub config).

### 2.1 Data polling

| # | Kind | Interface | Component / schedule |
|---|---|---|---|
| 1 | Data polling from **VetHub** | `GET {vh}/api/Claim/NewConversations?numberOfClaims=&claimType=` | `COS.Poll.Services.VetHub` — one timer per insurer (`TimerInterval`); sends `StartPoll` to the VetHub Claims Saga |
| 2 | Data polling from **UPM+** (through CLAPI → DAPI) | `GET {clapi}/api/Claims/GetUpdatedClaimsList?lastStatusUpdateFrom=&lastStatusUpdateTo=` | `COS.Poll.Services.UPM` — every 30 s, full sweep every 120 min. Deployments: AU (`UPMPROD`), NZ (`UPMPRODNZ`), TPN (`UPMPRODTPN`). Not deployed for VP |

### 2.2 REST APIs exposed (COS.API)

| # | Kind | Interface | Called by |
|---|---|---|---|
| 3 | REST API | `POST {cos}/api/Claims` — submit a claim (queued to `ClaimSubmissionSaga`, returns the CRN) | CSP and partner channels (outside the VetHub path) |
| 4 | REST API | `POST {cos}/api/Claims/Attachments` — additional documents | CSP |
| 5 | REST API (callback) | `POST {cos}/api/Claims/ClaimsAutomation/Completed` | Claims Automation (`CACallbackURL`) |
| 6 | REST API | `GET {cos}/GetInvoicePayload/{ClaimRefNumber}` | Claims Automation / Clawdia (labelled "CLAW" in the code) |
| 7 | REST API | `POST {cos}/api/GapOnly/ConfirmFinalPayment` | VetHub.API |
| 8 | REST API | `POST {cos}/api/GapOnly/Benefit` — gap-only benefit from the UPM+ assessment | Dynamic CLAPI (gap-benefit routing to COS; mapping to this operation *inferred*) |
| 9 | REST API | `POST {cos}/api/Claims/UpdateStatus` | CLAPI `api/External/UpdateStatus` (Vet Partners via Boomi) |
| 10 | REST API | `POST {cos}/api/GapOnly/GapOnlyBenefit` | CLAPI `api/External/GapOnlyBenefit` (Vet Partners via Boomi) |
| 11 | REST API | `GET {cos}/api/Claims/GetClaims`, `GET {cos}/api/Claims/GetClaimDetails/{ClaimNumber}` | CSP (claim views; not part of the submission itself) |

### 2.3 Events

| # | Kind | Interface | Direction |
|---|---|---|---|
| 12 | Event (Event Grid) | Topic `ps-prod-egt-claimsautoclaims`, event `Petsure.ClaimsAutomation.Claim` (subject `Claim`) | COS `ClaimsAutomationIntegration` → Claims Automation Logic App |
| 13 | Event (Event Grid) | Topic `ps-prod-egt-eventnotifications`, event `PetSure.Catch.Notification` | COS.API / COS services → CATCH Notification Function App (AU, NZ) |

### 2.4 Outbound calls

| # | Target | Interface | COS caller |
|---|---|---|---|
| 14 | VetHub | `GET /api/Claim/{id}`, `GET /api/Claim/{id}/Attachment/{attId}`, `POST …/ConfirmDownload` | VetHub SaveClaims |
| 15 | VetHub | `POST /api/Claim/{id}/UpdateStatus/ClaimProcessing\|ClaimSettled\|ClaimDeclined`, `POST /api/Claim/{id}/Nullify`, `…/UpdatePolicyNumber/…`, `…/GapOnly/BenefitAmount`, `…/VetFee` | SubmitClaims, UPM Status Poller, COS.API |
| 16 | CLAPI | `POST api/Policy/Find` | ValidatePolicy |
| 17 | CLAPI | `POST api/Claims` | SubmitClaims |
| 18 | CLAPI | `POST api/Claims/Attachments`, `PUT api/Claims/FinishSubmitClaim` | SubmitClaimAttachment |
| 19 | CLAPI | `POST api/Claims/AdditionalAttachments`, `PUT api/Claims/FinaliseAdditionalAttachment` | AddAttachments Submit |
| 20 | Dynamic CLAPI | `PUT /api/Claims/Lodge/{claimId}` (base `https://api-dynamicclaims-prod.petsure.com.au` in code) | SubmitClaimAttachment (when `Lodge` is on) |
| 21 | Storage API | `https://api-storage-prod.petsure.com.au/api/documents/` | SaveClaims, Consolidate, ConvertPDF |
| 22 | Security API | `https://api-security-prod.petsure.com.au/api/security/clapi/token` | All CLAPI callers |
| 23 | Notification API | `POST https://api-notification-prod.petsure.com.au/api/Notification` | Error / gap-only notifications |

## 3. Databases

| Use | Database | Server | Notes |
|---|---|---|---|
| **Write** | `COS_PROD` (AU + TPN + Luna), `COS_PROD_NZ` (NZ, name *inferred*), `COS_PROD_VP` (VP) | Azure SQL `petsure-production` | Claims, statuses, gap-only, vet fees, polling logs; also the CATCH tables (users, roles, events) |
| **Write** | `NSBusPersistence` | Azure SQL (PROD name not in repo) | Saga state, timeouts, outbox |
| **Read only** | none | — | UPM+ and VetHub data are read through their APIs, not directly |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| Azure Service Bus | NServiceBus over `AzureServiceBusConnection_SYD`; queues `PROD_<Endpoint>` (e.g. `PROD_ClaimSubmissionSaga`, `PROD_ValidatePolicy`, `PROD_SubmitClaims`), `PROD_COSAudit` / `PROD_COSError`; namespace `p3-prod-syd` (*inferred*) | All commands and events between the COS sagas, workers and pollers; COS.API is send-only |
| Azure Event Grid | `ps-prod-egt-claimsautoclaims`; `ps-prod-egt-eventnotifications` | Trigger Claims Automation; CATCH real-time notifications |
| Azure SQL Database | `COS_PROD*` and `NSBusPersistence` | System of record and saga persistence |
| Azure Storage (Blob) | `p3storageprod` (through the Storage API) | Claim blobs, attachments, merged PDFs |
| Azure Key Vault | names in GitHub secrets `KEYVAULT` / `CRED_KEYVAULT` | Deploy-time token replacement in `Web.config` / `App.config` |
| Application Insights | `ps-prd-insight-p3` | Logs; Azure Monitor alert rules per insurer (`[AUS]…`, NZ, VP) |

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| Shared | — | — | — |
| **Australia PetSure** | **.NET Framework 4.8** (COS.API: ASP.NET Web API 2; services: NServiceBus Windows services). `COS.EFCore.DataModel` library is .NET 6 | COS.API on `PS-PRD-AZS-P3-1/2`: **TBC** | **Virtual Machines** `PS-PRD-AZS-P3-1` (10.6.0.35), `PS-PRD-AZS-P3-2` (10.6.0.39) — IIS; `PS-PRD-AZS-P3-3` (10.6.0.40) — Windows services. **Azure SQL Database** `COS_PROD` |
| **Trupanion** | .NET Framework 4.8 | *on the AU servers* | *On the AU stack.* Dedicated `COS.Poll.Services.UPM` deployment `UPMPRODTPN` on the AU service server |
| **New Zealand** | .NET Framework 4.8 | COS.API on `NZ-PRD-AZ-P3WEB`: **TBC** | **Virtual Machines** `NZ-PRD-AZ-P3WEB` (IIS), `NZ-PRD-AZ-P3APP` (Windows services). **Azure SQL Database** `COS_PROD_NZ` (*inferred*) |
| **Vet Partners** | .NET Framework 4.8 | COS.API on `PS-PRD-AZ-P3WEB`: **TBC** | **Virtual Machines** `PS-PRD-AZ-P3WEB` (10.3.0.151, IIS), `PS-PRD-AZ-P3APP` (Windows services) — both *inferred VP*. **Azure SQL Database** `COS_PROD_VP` |

Agreed long-term option: COS.API to App Service on .NET 10 (".NET 4.8 → .NET 10 and App Services").

## 6. Open points

- **Dynamic CLAPI base URL** — code uses `api-dynamicclaims-prod.petsure.com.au`; infrastructure summary uses `ps-syd-prod-dynamicclapi-api.petsure.com.au`.
- **VP servers** `PS-PRD-AZ-P3WEB/APP` mapped by analogy (*inferred*); **NZ DB name** `COS_PROD_NZ` *inferred*.
- **Service Bus namespace** for NServiceBus is in GitHub secrets; `p3-prod-syd` confirmed only for the claim-progress topic.
- **Gap-only benefit caller** — that Dynamic CLAPI calls `POST api/GapOnly/Benefit` (rather than another GapOnly operation) is *inferred*.
- **Single-region risk** — all COS VMs are in Sydney with cold backup only.
