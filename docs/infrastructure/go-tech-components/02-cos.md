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

### 2.5 How COS.API and the COS services work together

See [COS: sagas and polling](02a-cos-flow-model.md) for the detailed model per sub-component: services (REST API, queue worker, timer), functions, data objects and events.

The same pattern is used in every stack: AU uses `PS-PRD-AZS-P3-1/2` for the API and `PS-PRD-AZS-P3-3` for the services; NZ uses `NZ-PRD-AZ-P3WEB` / `NZ-PRD-AZ-P3APP`; VP uses `PS-PRD-AZ-P3WEB` / `PS-PRD-AZ-P3APP`. Below, the AU names are used.

**COS.API (IIS on `PS-PRD-AZS-P3-1` and `PS-PRD-AZS-P3-2`).** COS.API is a regular ASP.NET Web API 2 application. Its controllers handle each HTTP request and run business logic themselves; the request is not just passed on to the bus. Operations fall into two groups:

- **Synchronous:** completed inside the API and answered in the same HTTP call. Examples: claim search and details (COS DB + CLAPI), `POST api/Claims/UpdateStatus`, the gap-only operations, and `GetInvoicePayload` for Clawdia.
- **Asynchronous:** the API does the first step, then hands the rest to the services by sending an NServiceBus command to an Azure Service Bus queue. For `POST api/Claims` the API:
  1. generates the CRN from a daily sequence in the COS DB;
  2. stamps the CRN on the claim and its documents;
  3. sets the insurer and registration country;
  4. builds the invoice payload;
  5. sends the `Claim` command;
  6. returns the CRN to the caller.

  Policy validation, the Claims Automation assessment and the submission to CLAPI all happen later, on the service server (`COS.API.Business/Claims/PostClaimsManager.cs`, `COS.API.UPMDataAdapter/ConnectionAdapter/NServiceBusAdapter.cs`).

| COS.API operation | Command sent | Destination queue (`{env}_…`) | Handled by, on `PS-PRD-AZS-P3-3` |
|---|---|---|---|
| `POST api/Claims` | `Claim` | `PROD_ClaimSubmissionSaga` | ClaimSubmissionSaga |
| `POST api/Claims/Attachments` | `AdditionalAttachments` | `PROD_COS.AddAttachments.Saga` | COS.AddAttachments.Saga |
| Portal claim action (e.g. cancel) | `ClaimAction` | `PROD_ClaimAction` | COS.Service.ClaimAction |
| `POST api/Claims/ClaimsAutomation/Completed` | `ClaimsAutomationCompleted` | `PROD_ClaimSubmissionSaga` | ClaimSubmissionSaga (resumes the saga that is waiting for the assessment) |

**What COS.API creates on Service Bus, and why two VMs don't conflict.** The NServiceBus endpoint inside COS.API (`NServiceBusProvider.cs`) starts on the first request that needs the bus. It is a full endpoint, not a send-only one, and it calls `EnableInstallers()`. Installers run on every start and create anything missing for **COS.API's own endpoint**:

- its input queue, named by the `EndPointName` setting (`DEV_COSAPI` in the dev config; the PROD value is a deployment variable, expected to be `PROD_COSAPI`);
- the error and audit queues it is configured with (`…_COSError`, `…_COSAudit`), which it shares with the services;
- the transport's publish/subscribe topic (`bundle-1` by default in the NServiceBus Azure Service Bus transport) and a subscription for the endpoint.

It does not create the destination queues in the table above; those belong to the services' own endpoints.

This is not a problem today, for three reasons:

1. **Creation only happens if the entity is missing.** The second VM, and every app-pool restart, finds the entities already there. The only cost is that COS.API's Service Bus connection needs *Manage* rights.
2. **Both VMs share one input queue.** They use the same endpoint name, so their receivers compete for the same queue. That is the normal NServiceBus scale-out model.
3. **Nothing ever arrives on that queue.** COS.API has no message handlers, and no COS repo sends to `…_COSAPI`, so both receivers sit idle. If a message did arrive, it would fail with "no handler" and end up in the error queue.

So the setup is harmless but unnecessary. Making the endpoint send-only would remove the idle receiver, the audit forwarding and the need for Manage rights. It also matters for App Service, where the process is recycled and scaled out by the platform.

**COS services (Windows services on `PS-PRD-AZS-P3-3`).** The services are of two kinds.

1. **Message workers.** These are NServiceBus endpoints that run only when a message arrives on their queue. They include:
   - the sagas: ClaimSubmissionSaga, the attachment sagas, the VetHub claims saga;
   - the handlers: ValidatePolicy, SubmitClaims, ClaimsAutomationIntegration, ClaimAction, SubmitClaimAttachment, ConsolidateClaimAttachments, ClaimAttachmentActions, VetHub LoadConversations / ProcessClaims / SaveClaims, and AddAttachments Submit / ConvertPDF / Consolidate.

   They are message-driven, not scheduled. Messages come from COS.API, from each other (saga → handler → saga), or from the pollers below. ClaimSubmissionSaga's wait for Claims Automation (`ClaimsAutomationMiliseconds`, 100 s) is an NServiceBus timeout. That is a delayed message on Service Bus, not a background job.
2. **Background jobs.** Only the Topshelf pollers in `COS.Poll.Services` run on a timer (`System.Timers.Timer` / `System.Threading.Timer`):
   - **UPM status poller** (`COS.Poll.Services.UPM`): `UPMPROD` and `UPMPRODTPN` run on `PS-PRD-AZS-P3-3`, `UPMPRODNZ` on `NZ-PRD-AZ-P3APP`. Every 30 s, with a full sweep every 120 min, it calls CLAPI `GET api/Claims/GetUpdatedClaimsList`. It then updates the claim status in COS and pushes it to VetHub (`ClaimProcessing` / `ClaimSettled` / `ClaimDeclined`, and `Nullify` for a cancelled claim).
   - **VetHub poller** (`COS.Poll.Services.VetHub`): VH and VH-eClaim run on `PS-PRD-AZS-P3-3`; the NZ and VP variants run on their own servers. On a timer per insurer, it calls VetHub `GET api/Claim/NewConversations` and sends `StartPoll` to the VetHub claims saga. The saga downloads the claims and attachments and feeds them into the claim-submission flow.
   - `COS.Poll.Services.CA.AdditionalAttachment` is also a timer poller (.NET Fx 4.6.1), but it has no deployment workflow. The polling and scheduler endpoints under `COS.Service/ServiceEndpoints/Poll` are not in the deployment list either ([GOTech Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734)).

So the only scheduled background work in COS is the **UPM polling and the VetHub polling**; every other COS process waits for messages. The same server also runs background services that are *not* COS: VetHub ProcessConversations (5 s), StatusUpdate (60 s), StuckClaims (90 s), Notification.Service and LogManager.Handler (the MSMQ log forwarder).

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
- **COS.API Service Bus entities** — confirm in the namespace which entities exist for COS.API's endpoint (input queue, expected `PROD_COSAPI`, and its `bundle-1` subscription), and the PROD value of `EndPointName`.
- **Routing of `ClaimAction`** — `Claim`, `ClaimAction` and `ClaimsAutomationCompleted` live in the same assembly (`COS.Common.Models`), and `NServiceBusProvider.cs` routes that assembly twice with `RouteToEndpoint(assembly, …)` (to `ClaimAction` and to `ClaimSubmissionSaga`). Confirm which destination NServiceBus actually uses for each command.

## 7. Confluence pages

Pages found on Confluence on 28 Oct 2026. The *Technical Assessments* (Mar 2026) are per-repo code reviews; they predate 2026_R4.

| Page | Space | What it adds |
|---|---|---|
| [COS.API – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1697939528) | P3 | Web API 2 on IIS VMs; API key + OWIN OAuth; MSMQ logging; empty App Insights config |
| [COS.Services – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1698201673) | P3 | NServiceBus services on Windows VMs; credential schemes per insurer; MSMQ logging |
| [COS.Poll.Services – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1698136116) | P3 | UPM and VetHub pollers (Topshelf); CA.AdditionalAttachment on 4.6.1 without a deployment |
| [COS.VetHub.Services – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1687486472) | P3 | VetHub download services |
| [COS.AddAttachments.Saga – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1696956452) | P3 | Additional-attachments saga |
| [COS.AddAttachments.Service.Submit – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1697054740) | P3 | Submit to CLAPI |
| [COS.AddAttachments.Service.ConvertPDF – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1698496607) | P3 | Text → PDF conversion |
| [COS.AddAttachments.Service.Consolidate – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1698955307) | P3 | PDF merge (iText 7, hard-coded licence path) |
| [COS.AddAttachments.Common – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1698005021) | P3 | Shared library |
| [COS.Data – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1696989263) | P3 | Data model (incl. the net6.0 EF Core model) |
| [COS.SQLServer – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1737588810) | P3 | Database project |
| [GOTech Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734) | P3 | Deployment targets. Confirms VP on `PS-PRD-AZ-P3WEB` / `P3APP` and NZ on `NZ-PRD-AZ-P3WEB` / `P3APP`; COS.API is a candidate for VM removal |
| [Estimates for IIS Upgrades](https://petsure.atlassian.net/wiki/spaces/P3/pages/1629913104) | P3 | COS.API .NET 10 upgrade estimate: 18–22 days; target App Service |
| [LogManager.Handler & Log4Net Configuration Audit](https://petsure.atlassian.net/wiki/spaces/P3/pages/2164260872) | P3 | MSMQ logging on every COS server |
| [COS & VetHub Service Bus Message Maps](https://petsure.atlassian.net/wiki/spaces/P3/pages/2180481051) | P3 | NServiceBus queues and messages |
| [NServiceBus License Location](https://petsure.atlassian.net/wiki/spaces/P3/pages/69796121) | P3 | Where the NServiceBus licence lives (a machine dependency) |
| [COS API Basic Authentication](https://petsure.atlassian.net/wiki/spaces/P3/pages/269746696) | P3 | API key / client ID from Dynamic CLAPI to COS.API (values shared via 1Password; not reproduced) |
| [TPN: COS API – Removing Security API call](https://petsure.atlassian.net/wiki/spaces/P3/pages/1422196744) | P3 | Insurance provider ID passed in a header instead of a Security API call |
| [TPN: COS Services – Removing Security API call](https://petsure.atlassian.net/wiki/spaces/P3/pages/1422196753) | P3 | Same change for the services |
| [COS Validate Policy Service](https://petsure.atlassian.net/wiki/spaces/P3/pages/550633487) | P3 | Fuzzy matching and policy validation settings |
| [Azure Web VMs Disaster Recovery Review](https://petsure.atlassian.net/wiki/spaces/P3/pages/1072594945) | P3 | DR of the IIS / service VMs (cold backup, single region) |
| [GoTech P3 – Disaster Recovery](https://petsure.atlassian.net/wiki/spaces/PET/pages/2209054726) | PET | DR scenarios and procedures for `PS-PRD-AZS-P3-1/2/3` |
