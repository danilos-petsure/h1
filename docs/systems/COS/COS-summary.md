# COS — Claim Orchestration Service

> COS (Claims Orchestration Services) is PetSure's claim intake and orchestration hub. It receives pet insurance claims and supporting documents from vet practice-management systems via **VetHub** (VPMS e-claims, including gap-only and real-time claims), from the customer self-service portal (**CSP**) and from partner channels (Vet Partners / Wellness via Boomi/Salesforce, Trupanion, NZ, PetYellow Canada). It stores each claim in the COS database, generates a claim reference number, validates and auto-corrects policy numbers (fuzzy policy matching), invokes **Claims Automation** via Azure Event Grid (straight-through-processing / AI assessment, waiting for the callback), lodges the claim and its consolidated PDF attachments into the insurer ERP (**UPM+** AUS/NZ, Trupanion instance, or Boomi for Vet Partners) through the **Claims API (CLAPI)**, optionally auto-lodges low-value claims through the Dynamic Claims Lodge API, and synchronises claim status and gap-only benefit amounts back to **VetHub**. It also raises email / real-time notifications and CATCH work-queue events (ClaimGroup / ClaimEvent / Notification tables) for the claims team.
> Generated from source code analysis on 2026-10-14. Items marked *inferred* are not explicit in the repo.

## System
- **System name:** COS
- **Full name:** Claims Orchestration Services (a.k.a. Claim Orchestration Service); OpsLevel system `cos`, owner team `go_tech`
- **Repositories (13):** COS.API, COS.AddAttachments.Common, COS.AddAttachments.Saga, COS.AddAttachments.Service.Consolidate, COS.AddAttachments.Service.ConvertPDF, COS.AddAttachments.Service.Submit, COS.Common.Models, COS.Data, COS.Poll.Services, COS.SQLServer, COS.Service, COS.VetHub.Services, ClaimsAPI

**Technology baseline:** all runtime components are .NET Framework 4.8 (some libraries 4.5.2–4.6.1; `COS.EFCore.DataModel` is .NET 6). Messaging uses **NServiceBus** over **Azure Service Bus** (`AzureServiceBusConnection_SYD` / `_MEL` regional connections) with SQL saga persistence (`NSBusPersistence` database). Data access is EF6 (Reverse POCO generated `COSDataContext`) against the **COS** Azure SQL database. All deployable components are built by GitHub Actions (`windows-latest`, MSBuild) and pushed by a self-hosted runner (`petsure-azure-windows-runner`) over PowerShell remoting to Azure Windows VMs — as **IIS sites** (the two APIs) or **Windows services** (all NServiceBus endpoints and pollers).

**Environments / instances** (GitHub environment names in the workflows): DEV, SIT, UAT (UATWEB1/2, UATMEL/UATSYD configs), PREPROD, PROD (PRODWEB1/2 for APIs; ProductionMEL/ProductionSYD configs for services), plus separate stacks for **NZ** (SITNZ/PREPRODNZ/PRODNZ), **VP** – Vet Partners (SITVP/PREPRODVP/PRODVP), **TPN** – Trupanion (UPM poller: UPMSITTPN/UPMPREPRODTPN/UPMPRODTPN) and **PY** – PetYellow Canada (`*.petyellow.ca`; PY targets in AddAttachments.Saga workflow, commented out in Submit).

### High-level flow (for diagrams)
1. **VPMS e-claim:** `COS.Poll.Services.VetHub` (timer) polls VetHub API for new conversations → sends `StartPoll` → `COS.VetHub.Saga.Claims` → `LoadConversations` (save conversation + generate ClaimRefNumber) → `SaveClaims` (download claim + attachments from VetHub, upload to Storage API, ACK VetHub) → `ProcessClaims` (VetXML → COS claim model) → sends `Claim` command to `ClaimSubmissionSaga`.
2. **CSP / partner claim:** caller → `POST COS API /api/Claims` → `Claim` command to `ClaimSubmissionSaga`.
3. **ClaimSubmissionSaga:** save Claim/ClaimBlob/ClaimStatus → (VPMS UPM+ flow) `ValidatePolicyNumber` → `ValidatePolicy` (CLAPI policy find + fuzzy matching + VetHub gap-eligibility) → `InvokeClaimsAutomation` → `ClaimsAutomationIntegration` publishes Event Grid event `Petsure.ClaimsAutomation.Claim` → Claims Automation calls back `POST COS API /api/Claims/ClaimsAutomation/Completed` (or saga timeout) → `SubmitClaim` → `SubmitClaims` worker (CLAPI `POST api/Claims` → UPM+ DAPI; auto-RFA rules; VetHub status "processing") → `ClaimSubmitted` → saga sends `ClaimAttachments` → `ClaimAttachmentSubmissionSaga` → `ConsolidateClaimAttachments` (merge PDFs via Storage API) → `SubmitClaimAttachment` (CLAPI attachments, finish-submit, optional Dynamic Claims Lodge API).
4. **Status sync:** `COS.Poll.Services.UPM` (timer, 30 s) polls CLAPI `GetUpdatedClaimsList` → updates COS DB (ClaimStatus, GapOnly, VetFee) → pushes status to VetHub API (ClaimProcessing / ClaimSettled / ClaimDeclined / Nullify).
5. **CSP additional documents:** `POST COS API /api/Claims/Attachments` → `AdditionalAttachments` → `COS.AddAttachments.Saga` → `ConvertPDF` (comment → PDF) → `Consolidate` (merge by type) → `Submit` (CLAPI `AdditionalAttachments` + `FinaliseAdditionalAttachment` → UPM+).
6. **Gap-only:** VetHub / partners → COS API `/api/GapOnly/*` (benefit amount, final-payment confirmation) → COS DB + VetHub API + Event Grid notification `PetSure.Catch.Notification`.

## Components

| Component | Component type | Deployment type | Artifact type | Production deployment name(s) | Repository |
|---|---|---|---|---|---|
| COS API | REST API (integration facade) | Azure Virtual Machines (`ts-virtual-machines`) | IIS deployment (`iis-deployment`) | URL `https://api-cos-prod.petsure.com.au` (AU), `https://api-cos-prod-nz.petsure.com.au` (NZ), `https://api-cos-prod-py.petyellow.ca` (PY); GitHub envs PRODWEB1, PRODWEB2, PRODNZ, PRODVP; IIS site/server names held in GitHub env vars (not in repo) | COS.API |
| Claims API (CLAPI) | REST API (UPM+ / DAPI wrapper) | Azure Virtual Machines (`ts-virtual-machines`) | IIS deployment (`iis-deployment`) | URL `https://api-claims-prod.petsure.com.au` (AU), `https://api-claims-prod-nz.petsure.com.au` (NZ), `https://api-claims-prod-py.petyellow.ca` (PY); GitHub envs PRODWEB1, PRODWEB2, PRODNZ, PRODVP | ClaimsAPI |
| Claim Submission Saga | Saga / orchestrator (NServiceBus Windows service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_ClaimSubmissionSaga`; GitHub env `SagasClaimsPROD` (+NZ/VP) | COS.Service |
| Claim Attachment Submission Saga | Saga / orchestrator (NServiceBus Windows service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_ClaimAttachmentSubmissionSaga`; env `SagasAttachmentPROD` | COS.Service |
| ValidatePolicy | Event-driven worker (NServiceBus Windows service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_ValidatePolicy`; env `ValidatePolicyPROD` | COS.Service |
| SubmitClaims | Event-driven worker (NServiceBus Windows service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_SubmitClaims`; env `SubmitClaimsPROD` | COS.Service |
| ClaimsAutomationIntegration | Event-driven worker → Event Grid publisher | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_InvokeClaimsAutomation`; env `ClaimsAutomationIntegrationPROD` | COS.Service |
| ClaimActions | Event-driven worker (claim reflow) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_ClaimAction`; env `ClaimActionsPROD` | COS.Service |
| ConsolidateClaimAttachments | Event-driven worker (PDF merge) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_ConsolidateClaimAttachments`; env `ConsolidateClaimAttachmentsPROD` | COS.Service |
| SubmitClaimAttachment | Event-driven worker | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_ClaimAttachmentSubmission`; env `SubmitClaimAttachmentPROD` | COS.Service |
| ClaimAttachmentActions | Event-driven worker (attachment reflow) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_ClaimAttachmentAction`; env `ClaimAttachmentActionsPROD` | COS.Service |
| VetHub Claims Saga | Saga / orchestrator (NServiceBus Windows service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | Endpoint name tokenised (`#{EndPointName}#`); env `ClaimsPROD`, `ClaimsPRODNZ`, `ClaimsPRODVP` | COS.VetHub.Services |
| VetHub LoadConversations | Event-driven worker | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | env `LoadConversationsPROD` (+NZ/VP); endpoint name not in repo | COS.VetHub.Services |
| VetHub SaveClaims | Event-driven worker (download + store) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | env `SaveClaimsPROD` (+NZ/VP); endpoint name not in repo | COS.VetHub.Services |
| VetHub ProcessClaims | Event-driven worker (VetXML transform) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | env `ProcessClaimsPROD` (+NZ/VP); endpoint name not in repo | COS.VetHub.Services |
| VetHub Poller | Scheduled job (timer Windows service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | GitHub envs `VETHUBPROD`, `VETHUBPRODNZ`, `VETHUBPRODVP`; service name in GitHub vars | COS.Poll.Services |
| UPM Status Poller | Scheduled job (timer Windows service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | GitHub envs `UPMPROD`, `UPMPRODNZ`, `UPMPRODTPN`; service name in GitHub vars | COS.Poll.Services |
| AddAttachments Saga | Saga / orchestrator (NServiceBus Windows service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_COS.AddAttachments.Saga`; envs PROD, PRODNZ, PRODPY, PRODVP | COS.AddAttachments.Saga |
| AddAttachments ConvertPDF | Event-driven worker (text → PDF) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_COS.AddAttachments.Service.ConvertPDF`; envs PROD, PRODNZ, PRODVP | COS.AddAttachments.Service.ConvertPDF |
| AddAttachments Consolidate | Event-driven worker (PDF merge) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_COS.AddAttachments.Service.Consolidate` (from saga routing pattern); envs PROD, PRODNZ, PRODVP | COS.AddAttachments.Service.Consolidate |
| AddAttachments Submit | Event-driven worker (submit to UPM+) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | NSB endpoint `PROD_COS.AddAttachments.Service.Submit` (from saga routing pattern); envs PROD, PRODNZ, PRODVP | COS.AddAttachments.Service.Submit |
| COS Database | Database (Azure SQL, SSDT project) | Not in reference table — SSDT database project (DACPAC) for Azure SQL Database | Not in reference table — DACPAC / SQL scripts | DB `COS_<ENV>` on `p3-db-cluster.database.windows.net` (non-prod evidence); production DB/server name not in repo | COS.SQLServer |
| COS.Common.Models | Shared library (message contracts) | Not deployed independently (NuGet / project reference) | Not in reference table — NuGet package | NuGet `COS.Common.Models` (e.g. 91.0.0, 1.0.332-VETHUBR1) | COS.Common.Models |
| COS.AddAttachments.Common | Shared library | Not deployed independently (NuGet / project reference) | Not in reference table — NuGet / DLL | n/a | COS.AddAttachments.Common |
| COS.Data (EF model) | Shared library (data access) | Not deployed independently (NuGet / project reference) | Not in reference table — NuGet / DLL | n/a | COS.Data |

### COS API
- **Purpose:** Primary HTTP integration surface for non-COS consumers (VetHub, CSP, Claims Automation, STP, Vet Partners/Boomi, CLAPI). Accepts new claims and additional attachments (queued to NServiceBus), merges COS + UPM claim views for CSP, receives Claims Automation results, and manages gap-only benefit/payment flows and VP status updates.
- **Runtime/framework:** ASP.NET Web API 2 on .NET Framework 4.8, Autofac, AutoMapper, EF6, NServiceBus (send-only), Azure.Messaging.EventGrid, log4net.
- **Component type:** REST API (integration facade)
- **Deployment type:** Azure Virtual Machines (`ts-virtual-machines`) — **Artifact type:** IIS deployment (`iis-deployment`)
- **Production deployment name(s):** `https://api-cos-prod.petsure.com.au` (AU; evidence `COS.Service/.../COS.Service.Sagas.Claims/App.Production.config` key `CACallbackURL`), `https://api-cos-prod-nz.petsure.com.au`, `https://api-cos-prod-py.petyellow.ca`; GitHub environments PRODWEB1/PRODWEB2 (two IIS web servers, AU), PRODNZ, PRODVP. VP URL not in repo.
- **Evidence:** `COS.API/.github/workflows/build-and-deploy-iis.yml`, `reusable-deploy.yml` (Set-ItemProperty IIS:\Sites physicalPath), `COS.API/COS.API/COS.API.csproj` (web project), `App_Start/WebApiConfig.cs`, `Controllers/*.cs`, `opslevel.yml` (deployment-method azure-virtual-machine).
- **Security:** `APIKey` + `clientId` headers validated against the **Security API** (`AuthenticationFilter` / `AuthorizationFilter`, toggle `EnableAPIKeyAuthentication`); CORS `*`.
- **Inbound:** VetHub / VPMS, CSP (customer portal), Claims Automation (callback), Vet Partners via Boomi/Salesforce, ClaimsAPI `api/External/*` forwarding, CATCH (*inferred*).
- **Outbound:** Azure Service Bus (NServiceBus commands to `ClaimSubmissionSaga`, `COS.AddAttachments.Saga`, `ClaimAction`), COS DB (`COSDataContext`, `COSTableContext`), Claims API/CLAPI (`ClapiBaseAddress`), Storage API (`StorageApiBaseAddress`), Security API, VetHub API (`VetHubBaseUrl`, status + benefit endpoints), Notification API, Azure Event Grid notification topic (`EndPointForNotification`, e.g. `ps-dev-egt-eventnotifications`), CATCH (links in notifications).

### Claims API (CLAPI)
- **Purpose:** Light internal wrapper between GoTech applications (COS, CSP, pollers) and the insurer back-ends ("DAPI" digital API of UPM+). Routes each request to an insurer-specific HTTP client chosen by `InsuranceProviderId` (UPM+ AUS `https://api.petsure.com.au/`, Trupanion `https://tp-api.petsure.com.au`, NZ `https://nz-digitalapi.petsure.com.au/`, Vet Partners via Boomi `https://c01-aus.integrate.boomi.com/`), with Polly retry/circuit breaker. Also forwards VP status / gap benefit updates to COS API.
- **Runtime/framework:** ASP.NET Web API 2 on .NET Framework 4.8, OWIN OAuth bearer, Autofac, Microsoft.Extensions.Configuration (`AppSettings/appsettings.<env>.json`).
- **Component type:** REST API (backend wrapper / anti-corruption layer for UPM+)
- **Deployment type:** Azure Virtual Machines (`ts-virtual-machines`) — **Artifact type:** IIS deployment (`iis-deployment`)
- **Production deployment name(s):** `https://api-claims-prod.petsure.com.au/` (evidence `COS.Service.Sagas.Claims/App.Production.config` `ClaimsApiBaseAddress`), `https://api-claims-prod-nz.petsure.com.au/`, `https://api-claims-prod-py.petyellow.ca/`; GitHub envs PRODWEB1, PRODWEB2, PRODNZ, PRODVP.
- **Evidence:** `ClaimsAPI/.github/workflows/dotnet.yml`, `deploy.yml` (IIS `SITE_NAME`, appsettings file swap), `ClaimsAPI/ClaimsAPI/AppSettings/appsettings.prod*.json`, `Claims.API.Infrastructure/InsurerRouting/InsurersClientRegistration.cs`, `Controllers/*.cs`. Note `opslevel.yml` says `azure-app-service`, but the workflow deploys to IIS on a VM.
- **Security:** `ServiceHandler`, `AuthorisationHandler` (insurer must be in `AllowedInsurers`), `AuthenticationHandler`; OAuth bearer tokens (token issued via Security API `api/security/clapi/token`).
- **Inbound:** COS API, COS.Service workers, AddAttachments Submit, UPM poller, CSP / other GoTech apps (*inferred*), Vet Partners (`api/External/*`).
- **Outbound:** UPM+ DAPI (AUS/NZ), Trupanion UPM instance, Boomi (VP), File Storage API (`FileStorageBaseAddress`), COS API (`COSApiUpdateStatusEndPoint`, `COSApiGapOnlyBenefitEndPoint`).

### Claim Submission Saga
- **Purpose:** Core orchestrator for every claim (`COS.Service.Sagas.Claims`). Started by `Claim` (from COS API or VetHub ProcessClaims) or `ReflowClaim`; persists Claim, ClaimBlob, ClaimStatus; sends real-time phone / email notifications; branches per source (VPMS UPM+ flow = validate policy → claims automation → submit; CSP/VetPartners flow = claims automation → submit); applies `InsuranceProviderRules`; handles CA timeout; flags TPN/BCP claims as Action Required; starts attachment saga after `ClaimSubmitted`.
- **Runtime/framework:** .NET Framework 4.8 console/Windows service, NServiceBus (Azure Service Bus transport, SQL persistence), EF6.
- **Component type:** Saga / orchestrator — **Deployment:** Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`)
- **Production name:** NSB endpoint `PROD_ClaimSubmissionSaga` (audit `PROD_COSAudit`, error `PROD_COSError`); GitHub env `SagasClaimsPROD`, `SagasClaimsPRODNZ`, `SagasClaimsPRODVP`.
- **Evidence:** `COS.Service/.github/workflows/build-and-deploy-service.yml`, `reusable-deploy.yml` (New-Service / Start-Service), `Sagas/Claim/COS.Service.Sagas.Claims/ClaimSubmissionSaga.cs`, `App.Production.config`.
- **Dependencies:** COS DB, NSBusPersistence DB, Azure Service Bus, Notification API (`https://api-notification-prod.petsure.com.au/`), Event Grid (`PetSure.Catch.Notification`), Storage API, Security API, CATCH UI links (`https://catch-prod.petsure.com.au/#/claim/`).

### Claim Attachment Submission Saga
- **Purpose:** Orchestrates documents of a claim (`COS.Service.Sagas.Attachment`): started by `ClaimAttachments` or `ReflowClaimAttachment`, saves Document rows, sends `ConsolidateAttachments` then `SubmitAttachment`, tracks document status.
- **Component type:** Saga / orchestrator — Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`).
- **Production name:** `PROD_ClaimAttachmentSubmissionSaga`; env `SagasAttachmentPROD`.
- **Evidence:** `Sagas/Attachment/COS.Service.Sagas.Attachment/ClaimAttachmentSaga.cs`, `App.Production.config`.
- **Dependencies:** COS DB (Document*, ClaimBlob), Service Bus.

### ValidatePolicy
- **Purpose:** Handles `ValidatePolicyNumber`: looks up the policy in UPM+ through CLAPI (`api/Policy/Find`), runs fuzzy policy-number matching ("FuzzyMatching2", scores in PolicyNumberMatching* tables) and auto-correction, checks VetHub gap eligibility, replies `PolicyValidated`.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_ValidatePolicy`.
- **Evidence:** `ServiceEndpoints/Claim/COS.Service.ValidatePolicy/Handlers/ValidatePolicyNumberHandler.cs`.
- **Dependencies:** Claims API → UPM+, VetHub API (`GapEligibilityCheckEndPoint`), COS DB (Lookup_*VetPolicyNumber*, PolicyNumberMatching*), Notification API.

### SubmitClaims
- **Purpose:** Handles `SubmitClaim`: assigns Claims-Automation sub-category / AI type (low-value thresholds `EClaimLodgeCodeLessThanValue`, `GapOnlyLodgeCodeLessThanValue`), applies auto-RFA flags and the `AutolodgeBlacklist`, posts the claim to UPM+ via CLAPI (`api/Claims/`), sets VetHub status to "processing", replies `ClaimSubmitted`, emails errors.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_SubmitClaims`.
- **Evidence:** `ServiceEndpoints/Claim/COS.Service.SubmitClaims/Handlers/ClaimSubmittedEventHandler.cs`.
- **Dependencies:** Claims API → UPM+, VetHub API, COS DB (Claim, ClaimStatus, VetFee, AutolodgeBlacklist), Notification API.

### ClaimsAutomationIntegration
- **Purpose:** Handles `InvokeClaimsAutomation`: enriches with invoice data (CSP claims from ClaimBlob) and publishes Event Grid event type `Petsure.ClaimsAutomation.Claim` (subject `Claim`) to the Claims Automation topic; the result returns asynchronously via `POST /api/Claims/ClaimsAutomation/Completed` on COS API (callback URL `CACallbackURL`).
- **Type / deployment:** Event-driven worker (Event Grid publisher); Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_InvokeClaimsAutomation`; topic `https://ps-prod-egt-claimsautoclaims.australiaeast-1.eventgrid.azure.net/api/events`.
- **Evidence:** `ServiceEndpoints/Claim/COS.Service.ClaimsAutomationIntegration/Handlers/SendToEventGridHandler.cs`, `App.Production.config`.
- **Dependencies:** Azure Event Grid → Claims Automation (STP / AI assessment; relation to Clawdia *inferred*, no Clawdia reference in COS code), COS DB.

### ClaimActions
- **Purpose:** Handles `ClaimAction` (reflow request with notes) and re-starts the claim saga with `ReflowClaim` (routing also lists `CancelClaim` → `PROD_CancelClaims`, an endpoint not present in these repos).
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_ClaimAction`.
- **Evidence:** `ServiceEndpoints/Claim/COS.Service.ClaimAction/Handlers/ClaimActionEventHandler.cs`, `App.config`.

### ConsolidateClaimAttachments
- **Purpose:** Handles `ConsolidateAttachments`: groups claim documents by type (`DocumentGroupKeywords`), downloads from Storage API, merges into PDFs (iText), uploads merged document, replies `ClaimAttachmentsConsolidated`.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_ConsolidateClaimAttachments`.
- **Evidence:** `ServiceEndpoints/Attachment/COS.Service.ConsolidateClaimAttachments/Handlers/ConsolidateClaimAttachmentsEventHandler.cs`.
- **Dependencies:** Storage API (`https://api-storage-prod.petsure.com.au/api/documents/`), COS DB (Document*), Notification API.

### SubmitClaimAttachment
- **Purpose:** Handles `SubmitAttachment`: posts each document to UPM+ via CLAPI (`api/Claims/{0}/Attachments`, additional attachments), marks last attachment sent (`FinishSubmitClaim`), optionally lodges the claim via the Dynamic Claims Lodge API (`/api/Claims/Lodge/{0}`, `https://api-dynamicclaims-prod.petsure.com.au`), updates VetHub on failed lodge, replies `ClaimAttachmentSubmitted`.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_ClaimAttachmentSubmission`.
- **Evidence:** `ServiceEndpoints/Attachment/COS.Service.SubmitClaimAttachment/Handlers/ClaimAttachmentSubmittedEventHandler.cs`, `App.Production.config`.
- **Dependencies:** Claims API → UPM+, Dynamic Claims Lodge API, VetHub API (`https://api-vh-prod.vethub.net`), Security API (token), COS DB.

### ClaimAttachmentActions
- **Purpose:** Handles `ClaimAttachmentAction` and sends `ReflowClaimAttachment` to the attachment saga (document reflow).
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_ClaimAttachmentAction` (deployed as `COS.Service.ServiceEndpoints.Attachment.ClaimAttachmentActions`).
- **Evidence:** `ServiceEndpoints/Attachment/COS.Service.ClaimAttachmentActions/Handlers/ClaimAttachmentActionEventHandler.cs`.

### VetHub Claims Saga
- **Purpose:** `COS.VetHub.Saga.Claims` — per-poll orchestration of VPMS claims: started by `StartPoll`, sends `SaveConversations` → `DownloadContent` → `ProcessClaim`, completes on `ClaimProcessed`. Tracks status SavedInCOS → ClaimReceivedByCOSButNotYetProcessed → ProcessedByCOS.
- **Type / deployment:** Saga / orchestrator; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** endpoint tokenised; GitHub env `ClaimsPROD`/`ClaimsPRODNZ`/`ClaimsPRODVP`.
- **Evidence:** `COS.VetHub.Services/.github/workflows/dotnet.yml`, `reusable-deploy.yml`, `Sagas/COS.VetHub.Saga.Claims/Saga.cs`, `App.config` (`MessageEndpointSettings`).
- **Dependencies:** Azure Service Bus, NSBusPersistence, COS DB (VetHubConversation*).

### VetHub LoadConversations
- **Purpose:** Handles `SaveConversations`: saves VetHub conversation metadata to COS DB and generates the claim reference number (`USP_GET_ClaimReferenceNumber`); replies `ConversationsSaved`. Failed conversations are reverted via `FailedConversation` to `RevertConversationEndPointName`.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`).
- **Evidence:** `Services/COS.VetHub.Services.LoadConversations/Handlers/LoadConversationsEventHandler.cs`.

### VetHub SaveClaims
- **Purpose:** Handles `DownloadContent`: downloads claim + attachments from VetHub API (`api/Claim/{0}`, `api/Claim/{0}/Attachment/{1}`), uploads attachments to Storage API (insurer-specific containers), confirms download to VetHub (`.../ConfirmDownload`), replies `ContentDownloaded`.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`).
- **Evidence:** `Services/COS.VetHub.Services.SaveClaims/Handlers/SaveClaimsEventHandler.cs`, `App.config`.
- **Dependencies:** VetHub API, Storage API, COS DB.

### VetHub ProcessClaims
- **Purpose:** Handles `ProcessClaim`: deserialises VetXML (RxWorks and standard invoice formats), maps to the COS API claim model, validates mandatory fields, sends `Claim` to the Claim Submission Saga and replies `ClaimProcessed`.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`).
- **Evidence:** `Services/COS.VetHub.Services.ProcessClaims/Handlers/ProcessClaimsEventHandler.cs`, `App.config` (routes `Claim` → `#{Claim}#`).

### VetHub Poller
- **Purpose:** `COS.Poll.Services.VetHub` — timer-driven Windows service, one timer per configured insurer (`TimerInterval` per insurance-provider element); polls VetHub API `api/claim/newconversations?claimType={0}&NumberofClaims={1}` and sends `StartPoll` to the VetHub Claims Saga (`DestinationEndPointName`).
- **Type / deployment:** Scheduled job; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** GitHub env `VETHUBPROD`, `VETHUBPRODNZ`, `VETHUBPRODVP`.
- **Evidence:** `COS.Poll.Services/.github/workflows/dotnetCOS.Poll.Services.VetHub.yml`, `deployCOS.Poll.Services.VetHub.yml`, `Services/COS.Poll.Services.VetHub/ServiceRunner.cs`, `ProcessVethubConversationsService.cs`.

### UPM Status Poller
- **Purpose:** `COS.Poll.Services.UPM` — timer (every `PollingClaimStatusInSeconds` = 30 s) pulls UPM claim status changes through CLAPI (`api/Claims/GetUpdatedClaimsList`, `GetClaimDetails`), updates COS status, gap-only and vet-fee data, finalises settled claims, and pushes the status to VetHub (`api/Claim/{0}/UpdateStatus/ClaimProcessing|ClaimSettled|ClaimDeclined`, `api/Claim/{0}/Nullify`); retries failed syncs via `StatusPollFailedClaim`.
- **Type / deployment:** Scheduled job; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** GitHub env `UPMPROD`, `UPMPRODNZ`, `UPMPRODTPN`.
- **Evidence:** `COS.Poll.Services/.github/workflows/dotnetCOS.Poll.Services.UPM.yml`, `Services/COS.Poll.Services.UPM/ProcessUPMClaimsService.cs`, `App.config`.
- **Dependencies:** Claims API → UPM+ (AUS/NZ/TPN), VetHub API, COS DB (PollingClaimStatus*, StatusPollFailedClaim, ClaimStatus, GapOnly*, VetFee).

### AddAttachments Saga
- **Purpose:** Orchestrates CSP "add more documents to an existing claim" requests: started by `AdditionalAttachments` (from COS API), sends `ConvertTextToFile` when user comments exist, then `ConsolidateAttachmentsByType`, then `SubmitAdditionalAttachments`; completes on `AdditionalAttachmentsSubmitted`.
- **Type / deployment:** Saga / orchestrator; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_COS.AddAttachments.Saga` (audit `PROD_COS.AddAttachments.Saga_Audit`, error `..._Error`).
- **Evidence:** `COS.AddAttachments.Saga/.github/workflows/build-and-deploy.yml`, `reusable-deploy.yml`, `AttachmentsSaga.cs`, `App.Production.config`.

### AddAttachments ConvertPDF
- **Purpose:** Handles `ConvertTextToFile`: renders customer comments to a PDF (`COMM-{ClaimNumber}-{timestamp}.pdf`, iText), uploads to Storage API, records AddDocumentSubmit/AddDocumentList, replies `TextToFileConverted`; failed messages mark the attachment failed and notify.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_COS.AddAttachments.Service.ConvertPDF`.
- **Evidence:** `Handler/ConvertTextToPDFHandler.cs`, `App.Production.config` (`StorageUrlAddress` = `https://api-vethubportal-prod.vethub.net/api/Attachments/`), `DocumentTypes.json`.

### AddAttachments Consolidate
- **Purpose:** Handles `ConsolidateAttachmentsByType`: merges multiple files of the same document type into one PDF (`{DocumentType}-{ClaimNumber}-{Timestamp}.pdf`), skipping single files and COMM, records merges in AddDocumentList/AddDocumentSubmit, replies `AttachmentsByTypeConsolidated`.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_COS.AddAttachments.Service.Consolidate` (*inferred* from saga routing `#{ApplicationEnvironment}#_COS.AddAttachments.Service.Consolidate`).
- **Evidence:** `.github/workflows/dotnet.yml`, `deploy.yml`, `AddAttachmentServiceConsolidateHandler.cs`, `DocumentTypes.json`.

### AddAttachments Submit
- **Purpose:** Handles `SubmitAdditionalAttachments`: gets a bearer token from Security API, posts each document to CLAPI `/api/Claims/AdditionalAttachments`, marks `IsSubmittedToUPM`, then `PUT /api/Claims/FinaliseAdditionalAttachment`; replies `AdditionalAttachmentsSubmitted` or notifies failure (Notification API) with `AddAttachmentMeta`.
- **Type / deployment:** Event-driven worker; Azure Virtual Machines (`ts-virtual-machines`) / Executable / binary (`executable`). **Production name:** `PROD_COS.AddAttachments.Service.Submit` (*inferred* from saga routing pattern).
- **Evidence:** `.github/workflows/build-and-deploy.yml`, `reusable-deploy.yml`, `AddAttachmentsSubmitEventHandler.cs`.

### COS Database
- **Purpose:** System of record for COS: claims, documents, statuses/errors, gap-only benefits, vet fees, VetHub conversations, policy-matching results, polling logs, notification/work-assignment and CATCH user/role tables. SSDT project tracks schema and especially stored procedures.
- **Runtime:** SQL Server 2016+ schema provider (`Sql130DatabaseSchemaProvider`) — Azure SQL.
- **Deployment type:** Not in reference table — SSDT/DACPAC to Azure SQL Database (no deployment pipeline in repo; post-deployment scripts per region: `Script.PostDeployment*.sql` for AU/NZ/TPN/VP/R2D, with rollbacks).
- **Production name:** not in repo (non-prod: `COS_DEV`, `COS_SIT`, `COS_LOCAL` on `p3-db-cluster.database.windows.net`).
- **Evidence:** `COS.SQLServer/COS.SQLServer/COS.SQLServer.sqlproj`, `dbo/Tables/*.sql`, `dbo/Stored Procedures/*.sql`, `Security/*.sql` (logins for CATCH notification/SignalR Function Apps, e.g. `ps-sit-func-catch-notification`, `ps-sit-func-catch-signalr`, DWH service account).
- **Consumers:** all COS components (EF6 via COS.Data), CATCH Function Apps and UI (*inferred* from security scripts and RBAC tables), data warehouse (`grpAzureDWHServiceAccount`).

### COS.Common.Models
- **Purpose:** NServiceBus message contracts and DTOs shared across COS (namespaces `COSAPI.Commands`, `COSService.Claims/Attachments.Commands|Messages`, `VetHub.Commands|Messages`, `ClaimsAPI.Models`, `StorageAPI`, `Security`, `Policy`).
- **Type:** Shared library — Not deployed independently (NuGet / project reference). **Evidence:** `COS.Common.Models/COS.Common.Models.nuspec`, consumers' `packages.config`.

### COS.AddAttachments.Common
- **Purpose:** Commands/messages (`AdditionalAttachments`, `ConvertTextToFile`, `ConsolidateAttachmentsByType`, `SubmitAdditionalAttachments`, replies) and shared business code (failed-message sender to Notification API, AddDocument repository) for the add-attachments process.
- **Type:** Shared library — Not deployed independently (NuGet / project reference). **Evidence:** `COS.AddAttachments.Common.Models.csproj`, `COS.AddAttachments.Common.Business/Features/FailedMessage/FailedMessageSender.cs`.

### COS.Data (EF model)
- **Purpose:** EF Reverse-POCO generated `COSDataContext` for the COS DB — EF6 (`COS.Core.DataModel`, .NET 4.8, 128 DbSets) and EF Core (`COS.EFCore.DataModel`, .NET 6, 100 DbSets).
- **Type:** Shared library — Not deployed independently (NuGet / project reference; also copied as DLL into consumers' `CommonDLLs`). **Evidence:** `COS.Data/COS.Core.DataModel/COSDataContext.tt`, `COS.EFCore.DataModel.csproj`.

## Services

Base URLs: COS API prod AU `https://api-cos-prod.petsure.com.au` (NZ `https://api-cos-prod-nz.petsure.com.au`, PY `https://api-cos-prod-py.petyellow.ca`); Claims API prod AU `https://api-claims-prod.petsure.com.au` (NZ `https://api-claims-prod-nz.petsure.com.au`, PY `https://api-claims-prod-py.petyellow.ca`). VP base URLs not in repo. All COS API calls require `APIKey` + `clientId` headers (validated by Security API).

### COS API — REST (`api/Claims`, `api/GapOnly`, CLAW, health)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | GetClaimsByPolicy | REST | `GET https://api-cos-prod.petsure.com.au/api/Claims/GetClaims?policyNumber=&status=&petName=` | Returns claim summaries for a policy, merging UPM claims (via CLAPI) with COS claims not yet visible in UPM (for CSP users right after submission). | CLAPI → UPM+ claims; [Claim](#tables--records), [ClaimStatus](#tables--records), ClaimStatusMappingLookUp |
| 2 | GetClaimDetails | REST | `GET https://api-cos-prod.petsure.com.au/api/Claims/GetClaimDetails/{ClaimNumber}` | Claim detail (incl. documents) for a UPM claim number, proxied through CLAPI. | CLAPI → UPM+ `GetClaimDetailsDocs`; Claim |
| 3 | SubmitClaim | REST → Service Bus | `POST https://api-cos-prod.petsure.com.au/api/Claims` | Validates the claim and insurer (`AllowedInsurersToSubmitClaim` / default `InsuranceProviderId`), normalises document names, sends `Claim` command to `ClaimSubmissionSaga`; returns the Claim Reference Number used for later attachments. | Service Bus `PROD_ClaimSubmissionSaga`; COS DB (claim ref no. via `USP_GET_ClaimReferenceNumber`, ClaimRefNoGenerator) |
| 4 | SubmitClaimAttachments | REST → Service Bus | `POST https://api-cos-prod.petsure.com.au/api/Claims/Attachments` | Validates comments, document types, count (`NumberOfAllowedDocumentsPerType`) and size (`AllowedFileSize`), then sends `AdditionalAttachments` to the AddAttachments saga (CSP additional documents). | Service Bus `PROD_COS.AddAttachments.Saga`; [AddDocument / AddDocumentList](#tables--records); Storage API |
| 5 | SubmitClaimsAutomationResponse | REST (webhook / callback) | `POST https://api-cos-prod.petsure.com.au/api/Claims/ClaimsAutomation/Completed` | Callback from Claims Automation with assessment results; marks validation failure or sends `ClaimsAutomationCompleted` to the claim saga. | [ClaimsAutomation](#tables--records), ClaimBlob; Service Bus `ClaimSubmissionSaga` |
| 6 | UpdateStatus (VP) | REST | `POST https://api-cos-prod.petsure.com.au/api/Claims/UpdateStatus` | Vet Partners / 3rd-party insurer pushes a claim status; COS validates against status mappings and updates COS and VetHub. | ClaimStatus, ClaimStatusMappingLookUp / ClaimStatusUPMLookUp / ClaimStatusVPMSLookUp, SubStatus, ClaimNotesRemarkCodes; VetHub API status endpoints (`19000/19001/19002/-999` keys) |
| 7 | ConfirmFinalPayment | REST | `POST https://api-cos-prod.petsure.com.au/api/GapOnly/ConfirmFinalPayment` | Vet confirms final payment of a gap-only claim; updates gap status, sends confirmation notification (email template + Event Grid `PetSure.Catch.Notification`). | [GapOnly / GapOnlyStatus](#tables--records), ClaimEvent, NotificationLookUp; Notification API; Event Grid |
| 8 | Benefit | REST | `POST https://api-cos-prod.petsure.com.au/api/GapOnly/Benefit` | Records/updates the gap-only benefit amount from UPM+ assessment (checks benefit vs paid amount, finalises per description ids), updates VetHub benefit amount and notifies. | GapOnly, GapOnlyDescription, VetFee; VetHub API `BenefitAmountEndPoint`; Event Grid |
| 9 | GapOnlyBenefit (VP) | REST | `POST https://api-cos-prod.petsure.com.au/api/GapOnly/GapOnlyBenefit` | Cut-down benefit update used by 3rd-party insurance providers (not UPM) — updates COS and VetHub. | GapOnly, VetFee; VetHub API |
| 10 | GetInvoicePayload (CLAW) | REST | `GET https://api-cos-prod.petsure.com.au/GetInvoicePayload/{ClaimRefNumber}` | Returns the stored VetHub invoice payload of a claim to Claims Automation (avoids CA calling the VetHub DB). | [ClaimBlob](#tables--records).InvoicePayload |
| 11 | HealthCheck | REST | `GET https://api-cos-prod.petsure.com.au/api/HealthCheck` | Liveness/dependency check. | COS DB (`USP_HealthCheck` *inferred*) |
| 12 | Portal SearchClaims (disabled) | REST | `GET {baseUrl}/api/Portal/Claims?policyNumber=&customerName=&petName=&status=&errorId=&submittedFrom=&submittedTo=` | Internal claims search — action method is `private`, so not reachable. | Claim, ClaimStatus |
| 13 | Portal ClaimDetails (disabled) | REST | `GET {baseUrl}/api/Portal/ClaimDetails/{ClaimRefNumber}` | Original claim as submitted — `private`, not reachable. | Claim, ClaimBlob |
| 14 | Portal ClaimAction (disabled) | REST → Service Bus | `POST {baseUrl}/api/Portal/Action/{ActionType}` | Cancel/reflow request (`ClaimAction` → `PROD_ClaimAction`) — `private`, not reachable. | Service Bus |

### Claims API (CLAPI) — REST (UPM+ / insurer wrapper)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | GetClaimDetails | REST | `GET https://api-claims-prod.petsure.com.au/api/Claims/GetClaimDetails?claimRefNumber=&claimNumber=` | Claim detail by COS ref or UPM claim number. | UPM+ DAPI `api/Claims/GetClaimDetailsByClaimNumber` |
| 2 | GetClaimsByServiceProvider | REST | `GET https://api-claims-prod.petsure.com.au/api/Claims/GetClaimsByServiceProvider?lastStatusUpdateFrom=&lastStatusUpdateTo=&serviceProviderNumber=&status=` | Claims list for a vet practice, filtered by status/date. | UPM+ `api/Claims/ClaimsByServiceProvider` |
| 3 | GetUpdatedClaimsList | REST | `GET https://api-claims-prod.petsure.com.au/api/Claims/GetUpdatedClaimsList?lastStatusUpdateFrom=&lastStatusUpdateTo=` | Claims whose status changed since a timestamp (used by UPM poller). | UPM+ `api/Claims/UpdatedClaims` |
| 4 | GetServiceProviders | REST | `GET https://api-claims-prod.petsure.com.au/api/Claims/GetServiceProviders` | Vet service providers (filtered by `ClapiServiceProviderTypeRemoveFilter`). | UPM+ `api/Claims/ServiceProviders/`; `ServiceProviders.json` (static list) |
| 5 | SubmitClaim | REST | `POST https://api-claims-prod.petsure.com.au/api/Claims` | Lodges a claim (with invoices) in the insurer system. | UPM+ `api/Claims/Submit` (or TPN/NZ/Boomi equivalent) |
| 6 | SubmitClaimAttachment | REST | `POST https://api-claims-prod.petsure.com.au/api/Claims/Attachments` | Submits a claim document (from Storage API) to UPM+. | Storage API `api/documents/{0}`; UPM+ `api/Claims/SubmitDocument` |
| 7 | FinaliseAdditionalAttachment | REST | `PUT https://api-claims-prod.petsure.com.au/api/Claims/FinaliseAdditionalAttachment` | Finalises a set of CSP additional documents. | UPM+ `api/Claims/FinishClaimAdditionalDocument` |
| 8 | SubmitCspAdditionalClaimAttachment | REST | `POST https://api-claims-prod.petsure.com.au/api/Claims/AdditionalAttachments` | Adds a CSP additional document to an existing claim. | UPM+ `api/Claims/SubmitAdditionalDocument2` |
| 9 | SubmitCosAdditionalClaimAttachment | REST | `POST https://api-claims-prod.petsure.com.au/api/Claims/CosAdditionalAttachments` | Adds a COS-generated additional document (e.g. CA PDF). | UPM+ `api/Claims/SubmitAdditionalDocument` |
| 10 | SubmitServiceProviderFee | REST | `POST https://api-claims-prod.petsure.com.au/api/Claims/SubmitServiceProviderFee` | Submits the vet (service provider) fee for gap-only claims (feature flag `IsUPMSubmitServiceProviderFeetReady`). | UPM+ `api/Claims/SubmitServiceProviderFee` |
| 11 | GetGapClaimBenefitDetails | REST | `GET https://api-claims-prod.petsure.com.au/api/Claims/GetGapClaimBenefitDetails?cspReferenceNumber=` | Gap claim benefit amount and claim number by CSP reference. | UPM+ `api/Claims/GetGapClaimBenefitDetails` |
| 12 | UpdateCSPReferenceNumber | REST | `POST https://api-claims-prod.petsure.com.au/api/Claims/UpdateCSPReferenceNumber` | Stores the CSP/COS reference on the UPM claim. | UPM+ `api/Claims/UpdateCSPReferenceNumber` |
| 13 | FinishSubmitClaim | REST | `PUT https://api-claims-prod.petsure.com.au/api/Claims/FinishSubmitClaim` | Marks claim submission complete (last attachment sent). | UPM+ `api/Claims/FinishSubmitClaim` |
| 14 | External UpdateStatus (VP) | REST | `POST https://api-claims-prod.petsure.com.au/api/External/UpdateStatus` | Partner (Vet Partners via Boomi) status update, forwarded to COS API `api/Claims/UpdateStatus`. | COS API |
| 15 | External GapOnlyBenefit (VP) | REST | `POST https://api-claims-prod.petsure.com.au/api/External/GapOnlyBenefit` | Partner gap benefit update, forwarded to COS API `api/GapOnly/GapOnlyBenefit`. | COS API |
| 16 | GetPolicyDetails | REST | `GET https://api-claims-prod.petsure.com.au/api/Policy/Details/{policyNumber}` | Policy detail. | UPM+ `api/customer/policies/GetPolicyDetails/{0}` |
| 17 | GetPolicyDetailsByPolicyNumber | REST | `GET https://api-claims-prod.petsure.com.au/api/Policy/DetailsByPolicyNumber?policyNumber=&fullPolicyNumber=` | Policy detail by short/full number. | UPM+ `GetPolicyDetailsByPolicyNumber` |
| 18 | FindPolicy | REST | `POST https://api-claims-prod.petsure.com.au/api/Policy/Find` | Finds a policy by search criteria (used by ValidatePolicy). | UPM+ `api/customer/FindPolicy` |
| 19 | HealthCheck | REST | `GET https://api-claims-prod.petsure.com.au/api/HealthCheck` | Liveness check. | — |
| 20 | ChangeLogLevel | REST (ops) | `POST https://api-claims-prod.petsure.com.au/api/log/ChangeLogLevel` | Changes log4net level at runtime. | log4net config |

### Claims Automation integration — Event Grid / webhook
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | Publish `Petsure.ClaimsAutomation.Claim` | Event Grid topic (outbound) | `POST https://ps-prod-egt-claimsautoclaims.australiaeast-1.eventgrid.azure.net/api/events` (subject `Claim`) | ClaimsAutomationIntegration asks Claims Automation to assess a claim (with invoice data, callback URL, PDF/medical flags). | ClaimBlob, Claim, ClaimsAutomation |
| 2 | Claims Automation callback | Webhook (inbound) | `POST https://api-cos-prod.petsure.com.au/api/Claims/ClaimsAutomation/Completed` | See COS API #5. Saga times out after `ClaimsAutomationMiliseconds` if no reply. | ClaimsAutomation |

### Notifications — Event Grid / Notification API (outbound)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | `PetSure.Catch.Notification` events | Event Grid topic | `EndPointForNotification` (dev `https://ps-dev-egt-eventnotifications.australiasoutheast-1.eventgrid.azure.net/api/events`; prod tokenised) | Claim events (e.g. gap-only benefit, payment confirmed, claim events) for CATCH notification / SignalR functions. | ClaimEvent, EventType, NotificationLookUp |
| 2 | Email / real-time phone notifications | REST (Notification API) | `POST https://api-notification-prod.petsure.com.au/api/Notification` (also `api/Notification/ApiNotification`, `api/Notification/Hub`) | Error emails to claims team groups, real-time phone notifications, add-attachment failures. | NotificationLookUp, NotificationTemplate, ClaimErrorNotification |

### VetHub-facing interfaces (COS as client of VetHub API)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | Poll new conversations | Timer → REST | `GET {VetHubBaseAddress}/api/claim/newconversations?claimType={0}&NumberofClaims={1}` | VetHub Poller fetches new VPMS claims per insurer on a timer. | VetHubConversation |
| 2 | Download claim / attachment + ACK | REST | `GET {VetHubBaseURI}/api/Claim/{0}`, `GET .../api/Claim/{0}/Attachment/{1}`, `.../ConfirmDownload` | SaveClaims downloads content and acknowledges it. | Storage API, ClaimBlob |
| 3 | Push claim status | REST | `{VetHubBaseAddress}/api/Claim/{0}/UpdateStatus/ClaimProcessing|ClaimSettled|ClaimDeclined`, `/api/Claim/{0}/Nullify` | UPM poller / COS API / SubmitClaims update the vet's view of the claim. | ClaimStatus, StatusPollFailedClaim |
| 4 | Gap benefit / eligibility | REST | `BenefitAmountEndPoint`, `GapEligibilityCheckEndPoint` (prod host `https://api-vh-prod.vethub.net`) | Pushes gap-only benefit amounts; checks gap eligibility during policy validation. | GapOnly, VetFee |

### Scheduled jobs
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | VetHub poll | Timer (Windows service) | per-insurer `TimerInterval` | Sends `StartPoll` to VetHub Claims Saga for new conversations. | VetHub API, Service Bus |
| 2 | UPM status poll | Timer (Windows service), every 30 s; sweep every 120 min | `PollingClaimStatusInSeconds`, `SweepPeriodInMinutes` | Syncs UPM claim status → COS → VetHub; retries failed syncs. | CLAPI, PollingClaimStatusHistory/Error, StatusPollFailedClaim, ClaimStatus, GapOnly, VetFee |

### Internal interfaces (NServiceBus commands/messages over Azure Service Bus)
Endpoint names are `<ENV>_<name>` (e.g. `PROD_ClaimSubmissionSaga`); shared audit/error queues `PROD_COSAudit` / `PROD_COSError` (AddAttachments uses `<endpoint>_Audit` / `_Error`).
- COS API → `ClaimSubmissionSaga`: `COS.Common.Models.COSAPI.Commands.Claim`, `ClaimsAutomationCompleted`
- COS API → `COS.AddAttachments.Saga`: `AdditionalAttachments`; COS API → `ClaimAction`: `ClaimAction` (portal, disabled)
- VetHub ProcessClaims → `ClaimSubmissionSaga` (`#{Claim}#`): `Claim`; ProcessClaims → VetHub saga: `ClaimProcessed`
- ClaimSubmissionSaga → `ValidatePolicy`: `ValidatePolicyNumber` ← `PolicyValidated`
- ClaimSubmissionSaga → `InvokeClaimsAutomation`: `InvokeClaimsAutomation`; saga self: `TriggerClaimsAutomationTimeOut`, timeout `ClaimsAutomationTimeOut`, `ClaimSaved`
- ClaimSubmissionSaga → `SubmitClaims`: `SubmitClaim` ← `ClaimSubmitted`
- ClaimSubmissionSaga → `ClaimAttachmentSubmissionSaga`: `ClaimAttachments`
- ClaimAttachmentSubmissionSaga → `ConsolidateClaimAttachments`: `ConsolidateAttachments` ← `ClaimAttachmentsConsolidated`
- ClaimAttachmentSubmissionSaga → `ClaimAttachmentSubmission`: `SubmitAttachment` ← `ClaimAttachmentSubmitted`; saga self: `ClaimAttachmentsSaved`
- `ClaimAction` → `ClaimSubmissionSaga`: `ReflowClaim`; `ClaimAction` → `CancelClaims`: `CancelClaim` (endpoint not in repos)
- `ClaimAttachmentAction` → `ClaimAttachmentSubmissionSaga`: `ReflowClaimAttachment` (source of `ClaimAttachmentAction` not in repos — CATCH *inferred*)
- Legacy: sagas → `PollingClaimsSubmissionSaga` / `PollingAttachmentsSubmissionSaga`: `NotifyPolling…SagaStarted` (only when request comes from the old polling saga)
- VetHub Poller → VetHub Claims Saga: `StartPoll`; saga → LoadConversations `SaveConversations` ← `ConversationsSaved`; → SaveClaims `DownloadContent` ← `ContentDownloaded`; → ProcessClaims `ProcessClaim` ← `ClaimProcessed`; failures `FailedConversation` → `RevertConversationEndPointName`
- AddAttachments Saga → `COS.AddAttachments.Service.ConvertPDF`: `ConvertTextToFile` ← `TextToFileConverted`; → `.Consolidate`: `ConsolidateAttachmentsByType` ← `AttachmentsByTypeConsolidated`; → `.Submit`: `SubmitAdditionalAttachments` ← `AdditionalAttachmentsSubmitted`
- Internal HTTP: COS components → Storage API (`https://api-storage-prod.petsure.com.au/api/documents/`), Security API (`https://api-security-prod.petsure.com.au/`, `api/security/clapi/token`), Dynamic Claims Lodge API (`https://api-dynamicclaims-prod.petsure.com.au`, `PUT /api/Claims/Lodge/{claimId}`)

## Data objects

### Tables / records

Schema source: `COS.SQLServer/COS.SQLServer/dbo/Tables` (117 tables), EF model `COS.Data`. Main fields exclude audit columns (CreatedBy/On, UpdatedBy/On).

| Data object | Store (DB / container) | Owned by system? | Description | Main fields |
|---|---|---|---|---|
| Claim | COS DB (Azure SQL) | owned (COS) | Master claim record received by COS (VPMS/CSP/VP/TPN/NZ): source, policy (original + auto-corrected), vet practice, totals, gap-only / real-time / BCP / STP flags, UPM claim number & id, current status/error/group, insurer. | Id, ClaimRefNumber, ClaimNumber, ConversationId, ClaimType, IsPreAuthorized, PreAuthorizationRefNumber, PreAuthorizationUPMNumber, Source, PolicyNo … |
| ClaimBlob | COS DB (Azure SQL) | owned (COS) | Raw claim JSON payload as received and the VetHub invoice payload (served to Claims Automation via GetInvoicePayload). | Id, ClaimRefNumber, ConversationId, Payload, InvoicePayload |
| ClaimStatus | COS DB (Azure SQL) | owned (COS) | Timeline of COS statuses per claim (e.g. ClaimReceivedInCOS, ClaimReadyToBeSubmitted, ActionRequired, Submitted) with source. | Id, ClaimRefNumber, StatusId, Source |
| ClaimError | COS DB (Azure SQL) | owned (COS) | Errors raised against a claim status (e.g. NoAttachment, policy not found, BCP), drive action-required work. | Id, ClaimRefNumber, ErrorId, ClaimStatusId, Notes |
| ClaimGroup | COS DB (Azure SQL) | owned (COS) | Assignment of a claim/status to a claims-team work group (e.g. Gap Claims Team) for CATCH queues. | Id, ClaimStatusId, ClaimRefNumber, GroupId |
| ClaimNotes | COS DB (Azure SQL) | owned (COS) | Free-text notes on a claim (reflow/cancel/user actions). | Id, ClaimRefNumber, Notes, NoteTypeId |
| ClaimCancelReason | COS DB (Azure SQL) | owned (COS) | Reason recorded when a claim is cancelled. | Id, ClaimRefNumber, ClaimNoteId, CancelReasonTypeId |
| ClaimEvent | COS DB (Azure SQL) | owned (COS) | Business events per claim (EventType) used for notifications, dashboards and SLA trackers. | Id, ClaimRefNumber, EventTypeId, ClaimNumber, NotificationReason |
| ClaimEventDailySummary | COS DB (Azure SQL) | owned (COS) | Per-claim completion summary (submitted → completed event). | ClaimRefNumber, SubmittedOn, DateTimeCompleted, ClaimEventIdOnCompletion |
| ClaimErrorNotification | COS DB (Azure SQL) | owned (COS) | Whether an error notification has been sent for a claim error. | Id, ClaimRefNumber, ClaimErrorId, IsNotificationSent, DateSent |
| ClaimNotificationTracker | COS DB (Azure SQL) | owned (COS) | Active SLA/notification timers per claim (linked to ClaimProgressTracker). | Id, ClaimRefNumber, ClaimProgressTrackerId, TrackingNumber, IsStopped |
| ClaimProgressTracker | COS DB (Azure SQL) | owned (COS) | Definition of SLA trackers (name, duration). | Id, Name, Duration, IsActive |
| ClaimsAutomation | COS DB (Azure SQL) | owned (COS) | Claims Automation request per claim: requested on, responded at, error type. | Id, ClaimRefNumber, RespondedAt, ErrorId |
| ClaimsAutomationErrorType | COS DB (Azure SQL) | owned (COS) | Lookup of Claims Automation error codes. | Id, Code |
| AuditActionLog | COS DB (Azure SQL) | owned (COS) | Audit of user field changes on claims (from/to values). | Id, AuditActionLogTypeId, From, To, ClaimRefNumber |
| AuditActionLogType | COS DB (Azure SQL) | owned (COS) | Lookup of auditable field types. | Id, Name, UIFieldName |
| RequestHeader | COS DB (Azure SQL) | owned (COS) | Original request header blob (transaction id, client application) for claims/documents. | RequestHeaderId, RequestBlob |
| ClaimRefNoGenerator | COS DB (Azure SQL) | owned (COS) | Daily counter used by USP_GET_ClaimReferenceNumber to generate Claim Reference Numbers. | DateValue, Count |
| ClaimRefCount | COS DB (Azure SQL) | owned (COS) | Counter table for claim reference generation (legacy/GM variant). | CountId, CurrentDate |
| PolicyNumberMatchingSummary | COS DB (Azure SQL) | owned (COS) | Fuzzy policy-number matching result per claim (total score vs threshold). | Id, ClaimRefNumber, TotalScore, OverallThreshold |
| PolicyNumberMatchingDetail | COS DB (Azure SQL) | owned (COS) | Per-item matching scores (customer, pet, phone, postcode …) behind policy auto-correction. | Id, ClaimRefNumber, ItemName, MatchingType, MatchingFrom, MatchingTo, MatchingScore, Threshold, HigherThreshold, MatchingWeightRatio … |
| Lookup_IncorrectVetPolicyNumberFixed | COS DB (Azure SQL) | owned (COS) | Learned mapping of incorrect vet-supplied policy numbers to the correct UPM policy. | Id, ServiceProviderNumber, VetPolicyNumber, CustomerName, PetName, UPMPolicyNumber, StatusId |
| Lookup_MissingVetPolicyNumberFixed | COS DB (Azure SQL) | owned (COS) | Learned mapping for claims arriving without a policy number (customer/pet/phone/postcode → UPM policy). | Id, ServiceProviderNumber, CustomerName, Phone, Postcode, PetName, UPMPolicyNumber, StatusId |
| Lookup_OverriddenFWFalseNegatives | COS DB (Azure SQL) | owned (COS) | Overrides for fuzzy-matching false negatives. | Id, ServiceProviderNumber, VetPolicyNumber, CustomerName, PetName, UPMPolicyNumber, StatusId |
| PolicyCorrectionMethodType | COS DB (Azure SQL) | owned (COS) | Lookup: how a policy number was corrected. | Id, Value, Type |
| AutolodgeBlacklist | COS DB (Azure SQL) | owned (COS) | Vet service providers blocked from auto-lodge, per channel (CSP / VPMS). | ServiceProviderNumber, BlockCSP, BlockVPMS |
| InsuranceProviderRules | COS DB (Azure SQL) | owned (COS) | Per-insurer orchestration rules: validate policy, run Claims Automation, submit attachments, set VetHub status to processing, send submit-error notifications, CA GST/discount bypass, include clinical history. | Id, InsuranceProviderId, InsuranceProviderName, ValidatePolicyNumber, RunClaimsAutomation, SubmitAttachments, SetStatusToProcessing, SendSubmitClaimErrorNotifications, CA_BypassGstCalcs, CA_BypassDiscounting … |
| VetFee | COS DB (Azure SQL) | owned (COS) | Vet (service provider) fee / benefit pay-to for gap-only claims and its submission to the insurer. | ClaimRefNumber, VetFee, Rate, IsSubmittedToInsurance, SubmittedToInsuranceOn, Remarks, RateType, MaxCapAmountUsed, GSTAmount, CostBaseAmount … |
| GapOnly | COS DB (Azure SQL) | owned (COS) | Gap-only claim benefit: benefit amount, paid amount, description, status, assignee. | Id, ClaimRefNumber, BenefitAmount, GapOnlyDescriptionId, PaidAmount, StatusId, AssignedTo, AssignedAt |
| GapOnlyStatus | COS DB (Azure SQL) | owned (COS) | Gap-only status history per claim (open, payment confirmed, full payment, finalised). | Id, GapOnlyStatusTypeId, ClaimRefNumber |
| GapOnlyDescription | COS DB (Azure SQL) | owned (COS) | Lookup of gap-only benefit outcome descriptions (with VPMS wording). | Id, Description, IsDefault, VpmsDescription, Order |
| GapOnlyStatusType | COS DB (Azure SQL) | owned (COS) | Lookup of gap-only statuses. | Id, Name |
| BenefitAmountPayToType | COS DB (Azure SQL) | owned (COS) | Lookup: who the benefit is paid to (vet / customer). | Id, Type |
| VetHubConversation | COS DB (Azure SQL) | owned (COS) | VetHub conversation (message) ids linked to claim reference, VetHub status and COS processing status (SavedInCOS → ProcessedByCOS). | Id, ConversationId, ParentConversationId, ClaimRefNumber, Blob, VetHubStatusId, TransactionId, CosStatusId |
| StatusPollFailedClaim | COS DB (Azure SQL) | owned (COS) | Claims whose status push to VetHub failed; retried by the UPM poller. | Id, ConversationId, ClaimRefNumber, ClaimNumber, IsGapOnly, ClaimStatusCode, VethubStatus, Remittance, ProcessedOn, Status … |
| StatusPollFailedClaimStatusType | COS DB (Azure SQL) | owned (COS) | Lookup for StatusPollFailedClaim states. | Id, Type |
| PollingClaimStatusHistory | COS DB (Azure SQL) | owned (COS) | Run log of each UPM status-poll cycle (window, number of claims, outcome). | Id, StartDateTime, EndDateTime, PollingClaimStatusLookUpId, ServiceProviderId, Notes, NumberOfClaims, TransactionId, InsuranceProviderId |
| PollingClaimStatusError | COS DB (Azure SQL) | owned (COS) | Per-claim errors during a UPM status poll. | Id, PollingClaimStatusHistoryId, ClaimRefNumber, PollingDateTime, Blob, Notes |
| PollingClaimStatusLookUp | COS DB (Azure SQL) | owned (COS) | Lookup of poll run statuses. | Id, Code |
| Polling | COS DB (Azure SQL) | owned (COS) | Legacy polling payload log. | PollingId, TransactionId, Payload, PollingStatusId, CompletedOn |
| PollingStatusLookUp | COS DB (Azure SQL) | owned (COS) | Lookup for Polling. | Id, Code |
| Document | COS DB (Azure SQL) | owned (COS) | Claim documents (attachments) with type, storage path, VPMS, merge info and status. | DocumentId, ClaimRefNumber, DocumentName, DocumentType, DocumentDate, VPMSName, VetPracticeId, ConversationId, Source, IsMergedDocument … |
| DocumentStatus | COS DB (Azure SQL) | owned (COS) | Status timeline per document. | Id, DocumentId, DocumentStatusId, Source |
| DocumentError | COS DB (Azure SQL) | owned (COS) | Errors per document status. | Id, ErrorId, DocumentStatusId, Notes |
| DocumentNotes | COS DB (Azure SQL) | owned (COS) | Notes on documents. | Id, DocumentId, Notes, NoteTypeId |
| DocumentStatusLookUp | COS DB (Azure SQL) | owned (COS) | Lookup of document statuses. | Id, Code |
| DocumentErrorCodeLookUp | COS DB (Azure SQL) | owned (COS) | Lookup of document error codes. | Id, Code, Description |
| AddDocument | COS DB (Azure SQL) | owned (COS) | CSP additional-documents request header per claim (claim no./ref, source, transaction). | Id, ClaimNumber, ClaimRefNumber, Source, TransactionId |
| AddDocumentList | COS DB (Azure SQL) | owned (COS) | Each additional document in a request (type, path, merge reference, status, comments). | Id, AddDocumentId, DocumentName, DocumentType, DocumentPath, MergedDocumentId, AddDocumentStatusId, Comments |
| AddDocumentSubmit | COS DB (Azure SQL) | owned (COS) | Documents (merged/converted) to submit to UPM+ and whether submitted (IsSubmittedToUPM). | Id, AddDocumentId, DocumentName, DocumentType, DocumentPath, IsSubmittedToUPM |
| AddDocumentStatus | COS DB (Azure SQL) | owned (COS) | Lookup of additional-document statuses. | Id, StatusName |
| UpmLineItem | COS DB (Azure SQL) | owned (COS) | UPM+ invoice item codes (hierarchy). | Id, ItemDescription, ItemCode, ParentCode |
| VetLineItem | COS DB (Azure SQL) | owned (COS) | Vet invoice item descriptions. | Id, ItemDescription |
| UpmVetItemMapping | COS DB (Azure SQL) | owned (COS) | Mapping of vet invoice items to UPM item codes (used when transforming invoices). | Id, VetLineItemId, UPMLineItemId |
| EventType | COS DB (Azure SQL) | owned (COS) | Event definitions: notification type, dashboard behaviour, IsSTPAssigneeOnly, SLA tracker start/stop. | Id, EventName, EventDescription, IsActive, IsClaimProcessingCompletionEvent, DropClaimFromDashboard, IsSTPAssigneeOnly, NotificationType, ClaimProgressTrackerId, StartTracker … |
| ClaimStatusLookUp | COS DB (Azure SQL) | owned (COS) | COS claim status codes (with type). | Id, Code, Description, ClaimStatusLookUpTypeId |
| ClaimStatusLookUpType | COS DB (Azure SQL) | owned (COS) | Lookup of claim status types. | Id, Code |
| ClaimStatusUPMLookUp | COS DB (Azure SQL) | owned (COS) | UPM+ claim status codes. | Id, Code, Description |
| ClaimStatusVPMSLookUp | COS DB (Azure SQL) | owned (COS) | VetHub/VPMS claim status codes. | Id, Code, Description |
| ClaimStatusMappingLookUp | COS DB (Azure SQL) | owned (COS) | Mapping COS ↔ UPM ↔ VPMS statuses (drives status sync to VetHub). | ClaimStatusLookupId, ClaimStatusUPMLookupId, ClaimStatusVPMSLookupId |
| ClaimErrorCodeLookUp | COS DB (Azure SQL) | owned (COS) | Claim error codes with notification group and whether a notification is required. | ClaimErrorCodeLookUpId, Code, Description, NotificationGroupId, IsNotificationRequired |
| CosStatusType | COS DB (Azure SQL) | owned (COS) | Lookup of COS processing statuses for VetHub conversations. | Id, Status |
| SubStatus | COS DB (Azure SQL) | owned (COS) | UPM sub-status codes accepted on UpdateStatus. | ID, Code, Description |
| ClaimNotesRemarkCodes | COS DB (Azure SQL) | owned (COS) | Remark codes accepted on status updates. | ID, Code, Description |
| NoteType | COS DB (Azure SQL) | owned (COS) | Lookup of note types. | Id, Name |
| CancelReasonType | COS DB (Azure SQL) | owned (COS) | Lookup of cancel reasons. | Id, Name |
| PolicyStatusLookUp | COS DB (Azure SQL) | owned (COS) | Lookup of policy statuses. | Id, Code |
| Notification | COS DB (Azure SQL) | owned (COS) | Stored notification messages (blob, delivery/receipt) for CATCH notification delivery. | NotificationId, ApplicationName, TransactionId, NotificationBlob, Status, DeliveredOn, ReceivedBy, ReceivedOn |
| NotificationLookUp | COS DB (Azure SQL) | owned (COS) | Notification routing per application/group/type: from/to addresses, subject/body template, URI, business hours. | Id, ApplicationId, GroupId, NotificationTypeId, FromAddress, ToAddresses, Subject, Body, NotificationTemplateId, NotificationUri … |
| NotificationTemplate | COS DB (Azure SQL) | owned (COS) | Notification templates (e.g. final payment confirmed). | Id, Name, Description |
| NotificationType | COS DB (Azure SQL) | owned (COS) | Lookup of notification types. | Id, Name |
| NotificationDailyAssignment | COS DB (Azure SQL) | owned (COS) | Daily assignment of claim events to claims-team users (accept/decline/on-hold). | Id, ClaimEventId, UserId, DeliveredOn, AcceptedOn, IsDeclined, DeclinedBy, DeclinedDateTime, CreatedByUserId, DoNotShow … |
| NotificationDailyAssignmentOnHold | COS DB (Azure SQL) | owned (COS) | On-hold periods of daily assignments. | Id, NotificationDailyAssignmentId, StartedOn, CompletedOn |
| NotificationAssignmentHistory | COS DB (Azure SQL) | owned (COS) | Archived assignments. | Id, ClaimEventId, UserId, DeliveredOn, AcceptedOn, IsDeclined, DeclinedBy, DeclinedDateTime, CreatedByUserId, DoNotShow … |
| NotificationAssignmentOnHoldHistory | COS DB (Azure SQL) | owned (COS) | Archived on-hold periods. | Id, NotificationAssignmentHistoryId, StartedOn, CompletedOn |
| User | COS DB (Azure SQL) | owned (COS) | Claims-team users of CATCH (type, email, site). | Id, UserTypeId, UserName, UserId, EmailId, IsActive, SiteId |
| Role | COS DB (Azure SQL) | owned (COS) | Roles for CATCH RBAC. | Id, RoleName, Description, IsActive |
| RoleAccess | COS DB (Azure SQL) | owned (COS) | Role → access (application/module/interface) grants. | Id, RoleId, AccessId, IsActive |
| RoleInsuranceProvider | COS DB (Azure SQL) | owned (COS) | Insurers a role may see. | Id, RoleId, InsuranceProviderId |
| Access | COS DB (Azure SQL) | owned (COS) | Access points (application, module, interface). | Id, ApplicationName, Module, Interface, IsActive |
| UserRole | COS DB (Azure SQL) | owned (COS) | User ↔ role. | Id, UserId, RoleId, IsActive |
| UserGroup | COS DB (Azure SQL) | owned (COS) | User ↔ work group. | Id, UserId, GroupId, IsActive |
| UserGroupDefinition | COS DB (Azure SQL) | owned (COS) | Work groups / teams (claims assigned via ClaimGroup). | Id, GroupName, Description, IsActive |
| UserAccessExclusion | COS DB (Azure SQL) | owned (COS) | Per-user access exclusions. | Id, UserId, AccessId, IsActive |
| UserDailyAvailability | COS DB (Azure SQL) | owned (COS) | User availability windows (for assignment). | Id, UserId, FromDateTime, ToDateTime |
| UserDailyLogin | COS DB (Azure SQL) | owned (COS) | User logins per application type. | Id, UserId, ApplicationTypeId, FromDateTime, ToDateTime, IsConditionalLogOut |
| UserTypeLookUp | COS DB (Azure SQL) | owned (COS) | Lookup of user types. | Id, Name |
| Site | COS DB (Azure SQL) | owned (COS) | Sites/locations of users. | Id, SiteName |
| Application | COS DB (Azure SQL) | owned (COS) | Applications for notifications/access. | Id, Name |
| ApplicationTypes | COS DB (Azure SQL) | owned (COS) | Application types for logins. | Id, ApplicationType |
| CommandLog | COS DB (Azure SQL) | owned (COS) | DB maintenance log (index/statistics jobs). | ID, ObjectType, IndexType, PartitionNumber, ExtendedInfo, Command, CommandType, StartTime, EndTime, ErrorNumber … |
| History tables (23): ClaimHistory, ClaimBlobHistory, ClaimStatusHistory, ClaimErrorHistory, ClaimGroupHistory, ClaimNotesHistory, ClaimEventHistory, ClaimEventSummaryHistory, ClaimNotificationTimerHistory, ClaimNotificationTrackerHistory, DocumentHistory, DocumentStatusHistory, DocumentErrorHistory, DocumentNotesHistory, VetHubConversationHistory, VetFeeHistory, UpmVetItemMappingHistory, UserHistory, UserRoleHistory, UserGroupHistory, UserAccessExclusionHistory, UserAvailabilityHistory, UserLoginHistory | COS DB (Azure SQL) | owned (COS) | Archive copies of the corresponding live tables (claims/documents moved after completion, user/role changes). | same as live table + parent history id |
| Backup tables: ClaimError_20190529, ClaimGroup_20190529, ClaimStatus_20190529 | COS DB (Azure SQL) | owned (COS) | One-off backups from 2019-05-29 (candidates for removal). | same as live table |
| ProductHistory | COS DB | owned (COS) | Empty script in SQL project (no CREATE TABLE). | — |
| Views (12) | COS DB (Azure SQL) | owned (COS) | Read models for dashboards / CATCH / reporting: vwClaimDetails, vwClaimDocumentCurrentStatus, vwClaimDocumentLatestStatus, vwClaimStatusHistory, vwClaimWithCurrentStatus, vwDashboard, vwDashboardAll, vwDashboardClaimsGroupByGroup, vwGapClaim, vwRoleAccessList, vwUserAccessList, vwUserRoleList. | — |
| Stored procedures (47) | COS DB (Azure SQL) | owned (COS) | ADD_Lookup_IncorrectVetPolicyNumberFixed, ADD_Lookup_MissingVetPolicyNumberFixed, ADD_Lookup_OverriddenFWFalseNegatives, CommandExecute, SP_AddUpdateAutolodgeBlacklist, USP_ArchiveDailyClaimEvents, USP_Audit_Claim, USP_Audit_ClaimAttachments, USP_Cancel_CSPClaim, USP_ClaimErrorCodeLookUp_GetList, USP_ClaimEvent_GetClaimEvent_By_ClaimRefNumber, USP_ClaimNotificationTracker_GetClaimNotificationTracker, USP_ClaimNotificationTracker_InsertClaimNotificationTracker, USP_ClaimNotificationTracker_UpdateClaimNotificationTracker, USP_ClaimProgressTracker_GetClaimProgressTracker, USP_Claim_GetByClaimRefNumber, USP_Claims_ArchiveDailyClaimEvents, USP_Dashboard, USP_DeleteStatusPollFailedClaim, USP_Delete_Documents_ByClaimRefNumber, USP_EventType_GetEventTypes, USP_EventType_UpdateEventType, USP_GET_ClaimDetailsForNotification, USP_GET_ClaimReferenceNumber, USP_GET_ClaimReferenceNumber_GM, USP_GET_GapOnlyClaimsPaging, USP_GapOnly_UpdatePaymentAmount, USP_GetFailedStatusPollFailedClaim, USP_Get_LatestClaimStatusDateTime, USP_HealthCheck, USP_INSERT_ClaimEvent, USP_RemoveActionRequiredStatus, USP_Remove_Lookup_IncorrectVetPolicyNumberFixed_By_Id, USP_Remove_Lookup_MissingVetPolicyNumberFixed_By_Id, USP_Remove_Lookup_OverriddenFWFalseNegatives_By_Id, USP_Switch_STPAlertsProcessing, USP_UpdateServiceProviderEmail, USP_UpdateStatusToReflow, USP_Update_PolicyNumber_By_ClaimRefNumber, USP_Update_VetFee, USP_User_AddExclusion, USP_User_AssignToRoles, USP_User_Create, USP_User_RemoveExclusion, USP_User_RemoveRoles, p_get_xe_data, sp_WhoIsActive. | — |
| NSBusPersistence | Azure SQL DB `NSBusPersistence` (p3-db-cluster in non-prod) | owned (COS, shared NServiceBus infra *inferred*) | NServiceBus SQL persistence: saga state (ClaimSubmissionSaga, ClaimAttachmentSubmissionSaga, AddAttachments saga, VetHub saga), timeouts, outbox. | managed by NServiceBus |
| NServiceBus queues | Azure Service Bus (`AzureServiceBusConnection_SYD`/`_MEL`; non-prod namespace `p3-dev`) | owned (COS) | Endpoint input queues `<ENV>_<Endpoint>`, audit `<ENV>_COSAudit`, error `<ENV>_COSError`, AddAttachments `<endpoint>_Audit/_Error`. | NSB message headers + JSON body |
| Claim documents | Storage API (central storage, domain `claims`; prod `https://api-storage-prod.petsure.com.au/api/documents/`) | read/write via Storage API (storage owned by Storage service) | Claim attachments, merged PDFs, comment PDFs (insurer-specific containers). | file name, document path |
| UPM+ claims / policies / service providers | UPM+ ERP via DAPI (AUS, NZ, Trupanion) / Boomi (VP) | read from / written to UPM+ through Claims API | Claims, claim documents, policies, gap benefit details, service providers. | per DAPI contracts |
| VetHub conversations / claims / attachments | VetHub API | read from VetHub (status written back) | VPMS claim conversations (VetXML), attachments, status/benefit updates. | conversationId, claim payload |
| ServiceProviders.json | ClaimsAPI repo file | owned (static data in repo) | Static list of vet service providers (number, name, address, state). | serviceProviderNumber, serviceProvider, ServiceProviderType, address, postCode, state |
| DocumentTypes.json | ConvertPDF / Consolidate repos | owned (static data in repo) | Document type codes: CCORRES, CFORM, CNNOTES, INVOICE, OTHER, PATH, PPURCH, PREAUTH, RECEIPT, RTG, VETHIST, COMM. | Code, Description |

### Configuration
Configuration is held in `Web.config` / `App.config` with per-environment XDT transforms (`App.Production.config`, `App.ProductionNZ.config`, `App.ProductionPY.config`, `App.ProductionMEL/SYD.config`, …) and `#{Token}#` placeholders replaced at deploy time from **GitHub environment variables** and **Azure Key Vault** secrets (`az keyvault secret show`, vault names held in GitHub secrets `KEYVAULT` / `CRED_KEYVAULT`). Claims API uses `AppSettings/appsettings.<env>.json` swapped in at deploy time. Some business rules live in the COS DB.

| Configuration | Location (file / Key Vault / app settings) | Business meaning |
|---|---|---|
| `AllowedInsurers`, `InsurerHttpClients` (BaseUrl, Endpoints, Authentication, RetryPolicy, Timeout, Cache) | ClaimsAPI `AppSettings/appsettings.<env>.json` | Which insurers CLAPI serves in each environment and how each insurer back-end is reached: UPM+ AUS DAPI, Trupanion UPM instance, NZ digital API, Boomi for Vet Partners; retry/circuit-breaker behaviour. |
| `AllowedInsurersToSubmitClaim`, `InsuranceProviderId`, `TPNInsuranceProviderId`, `VPInsuranceProviderId`, `DefaultInsuranceProviderId(ForNZ/ForTPN)` | COS API Web.config, COS.Service / VetHub services App.config (GitHub vars/secrets) | Which insurers may submit claims to a COS instance and the default insurer when the caller does not supply one (AU / NZ / Trupanion / Vet Partners routing). |
| `InsuranceProviderRules` table | COS DB | Per-insurer orchestration switches: validate policy, run Claims Automation, submit attachments, set VetHub status to processing, send submit-error notifications, CA GST/discount bypass, include clinical history. |
| `ClaimsAutomationEnabled`, `ClaimType` (`eClaim,GapOnly`), `CSPClaimCARequestPercentage` (100), `PdfRequired`, `MedicalRequired`, `ClaimsAutomationMiliseconds` (100000), `ClaimsAutomationTimeout`, `CACallbackURL`, `EventGridTopicEndPoint` / `EventGridTopicKey` (Key Vault/vars) | COS.Service.Sagas.Claims / ClaimsAutomationIntegration App.Production.config | Whether and for which claim types Claims Automation (STP/AI assessment) is invoked, what share of CSP claims go to CA, whether CA should produce a PDF/medical summary, how long the saga waits for the CA result before continuing, and where CA should call back. |
| `EClaimLodgeCodeLessThanValue` (500), `GapOnlyLodgeCodeLessThanValue` (500), `EnableAutoRFAForEclaim/Gap/CSP` (true), `Lodge` | SubmitClaims / SubmitClaimAttachment App.config | Straight-through thresholds: claims at or below $500 are categorised as low-value for automatic lodgement / "ready for assessment" in UPM+; auto-RFA per channel; whether to call the Dynamic Claims Lodge API after attachments. |
| `AutolodgeBlacklist` table | COS DB | Vet practices excluded from auto-lodgement, separately for CSP and VPMS claims. |
| `IsPolicyNumberAutoCorrectionEnabled` (true), FuzzyMatching2 thresholds (PolicyNumberMatching tables), Lookup_*VetPolicyNumberFixed | ValidatePolicy App.config + COS DB | Automatic correction of wrong/missing vet-supplied policy numbers using fuzzy matching and learned corrections. |
| `EnableVetHubGapEligibilityCheck` (true), `GapEligibilityCheckEndPoint` | ValidatePolicy App.config | Check with VetHub that a gap-only claim is eligible before processing. |
| Gap-only: `NoPaymentRequiredGapOnlyDescriptionIds`, `GapOnlyDescriptionIdsForVetFee`, `GapOnlyDescriptionIdsToFinalize/NotToFinalize`, `AdmittedGapDescriptionIdList`, `NotAdmittedGapDescriptionIdList`, `GapOnlyClaimUpdateStatuses`, `GapOpen/PaymentConfirmed/FullPaymentConfirmed/FinalizedStatusCode`, `ClaimStatus401DNRDescriptionIdsToFinalize`, assessment-outcome keys (`Authorised`, `NotAdmittedWaitingPeriod`, `NotAdmittedPreExistingCondition`, `PartiallyAuthorisedLimitsReached`, `ExGratia`, …) | COS API Web.config, UPM poller App.config | Rules for the gap-only (vet paid directly) product: which UPM assessment outcomes mean benefit admitted / not admitted, when a gap claim is finalised, when a vet fee applies, and how outcomes are worded to the vet. |
| `ClaimSettledList` (`106_PAID;705_PAID;OTAD;301_NOTAD;…`), `Settled`, `CancelledInCOS`, status endpoint keys `19000`/`19001`/`19002`/`-999` | UPM poller / VetHub poller / COS API config | Which UPM statuses count as settled/declined/cancelled and which VetHub status call (Processing / Settled / Declined / Nullify) each maps to. |
| `ClaimStatusMappingLookUp`, `ClaimStatusUPMLookUp`, `ClaimStatusVPMSLookUp`, `SubStatus`, `ClaimNotesRemarkCodes` | COS DB | Status vocabulary and mapping between UPM+, COS and VetHub; valid partner sub-status / remark codes. |
| `PollingClaimStatusInSeconds` (30), `SweepPeriodInMinutes` (120), `OffSetTimeInSeconds`, `AutoCorrectionThresholdMinutes`, `HoursToClearFailedRecordsOnSuccessfulRetry`, `CacheRefreshInSeconds` | COS.Poll.Services.UPM App.config | How often UPM status changes are synchronised to COS/VetHub, overlap window, periodic full sweep and retry of failed VetHub updates. |
| VetHub poll `TimerInterval` per insurer, `ClaimType`, `NumberofClaims` | COS.Poll.Services.VetHub App.config (insurance-provider section) | How often and how many new VPMS claims are pulled from VetHub per insurer. |
| `NumberOfAllowedDocumentsPerType` (8), `AllowedFileSize` (10.4 MB), `DocumentGroupKeywords`, `DocumentTypes.json`, `NameMergedDocument`, `iTextLicense` (secret) | COS API Web.config, Consolidate/ConvertPDF services | Limits on CSP uploads and how documents are grouped/merged by type into single PDFs for assessors. |
| `IsRealTimeNotificationEnabled`, `NotificationTemplate*`, `SendNotificationEvent*`, `EndPointForNotification`, `TopicKeyForNotification` (secret), `GapOnlySendEmailNoOfRetry`, `NumberOfValidPhoneNumber`, `CATCHUIClaimDetails` | COS API / COS.Service config; `NotificationLookUp`/`NotificationTemplate` tables | Who is notified (email / real-time phone / CATCH Event Grid event) on claim errors, gap-only events and payment confirmations, with deep links to CATCH. |
| `RxWorksInvoiceFormat`, `SpecialCharacterSeparateDescriptions`, `UnknownTreatmentDescription` | VetHub ProcessClaims / SubmitClaims config | Invoice parsing rules per VPMS vendor (RxWorks vs standard) and fallback treatment description. |
| `MaxCharactersForNameByDAPI`, `UPMIncorrectStatusSpellingMappings`, `ClapiServiceProviderTypeRemoveFilter`, `SubmitServiceProviderNoToUPM`, feature flags `IsGetGapClaimBenefitDetailsReady`, `IsUPMSubmitServiceProviderFeetReady`, `IsUpdateCSPReferenceNumberReady`, `SensitiveDataKeyWords` | ClaimsAPI Web.config | DAPI compatibility rules (name truncation, status spelling fixes, provider-type filtering), feature toggles for gap-only operations, log masking. |
| `EnableAPIKeyAuthentication`, `APIKey`/`ClientId` (secrets), `SecurityAPIBaseAddress` | COS API Web.config | Whether callers must present an API key validated by the Security API. |
| Endpoint/queue names (`EndPointName`, `AuditQueueName`, `ErrorQueueName`, `MessageEndpointSettings`), `Retries`/`SecondRetries`/`DelayedTimeIncrease`, `TimeToBeReceived` | Each NServiceBus host App.config | Message routing between COS endpoints and retry policy before messages land in the error queue. |
| Connection strings `COSDataContext`, `COSTableContext`, `NSBusPersistence`, `AzureServiceBusConnection_SYD/_MEL` | Web/App.config tokens ← Key Vault | COS DB, saga persistence DB and regional Service Bus namespaces per environment. |

## Notes & gaps
- **Production resource names:** VM/server names, IIS site names, Windows service names, Key Vault names and prod DB/Service Bus namespace names are held in GitHub environment variables/secrets, not in the repos. Prod NServiceBus endpoint names (`PROD_*`) and public API URLs are taken from `App.Production*.config`. VP (Vet Partners) production URLs are not in the repos.
- **Deployment classification:** every runtime component deploys to Azure Windows VMs (IIS for the two APIs, Windows services for NServiceBus hosts/pollers). ClaimsAPI `opslevel.yml` claims `azure-app-service` but its workflow deploys to IIS on a VM — verify.
- **COS.SQLServer:** no deployment pipeline; schema is applied manually/out-of-band. Contains 2019 backup tables (`*_20190529`) and an empty `ProductHistory.sql`.
- **Disabled endpoints:** COS API `api/Portal/*` action methods are `private` and therefore not routable; ClaimActions/ClaimAttachmentActions are reached only by messages whose sender (likely CATCH) is outside these repos (*inferred*). `CancelClaim` routes to a `CancelClaims` endpoint not present in any COS repo.
- **Routing ambiguity:** COS API maps the whole `COS.Common.Models` assembly twice (to `ClaimAction` and `ClaimSubmissionSaga`) in `NServiceBusProvider.cs`; confirm where `ClaimsAutomationCompleted` is effectively routed.
- **Legacy / unused code:** `COS.Service/ServiceEndpoints/Poll/*`, `Error/COS.Service.ErrorHandler`, `Notification/COS.Service.NotificationService`, `Sagas/Claim/COS.Service.Sagas.Claims.Action`, `Policy.Validation`, `COS.Service.Data`, `COS.Service.Manager` are not in `COS.Service.sln` nor deployed; `COS.Poll.Services.CA.AdditionalAttachment` is not in the Poll solution or workflows. Old `PollingClaimsSubmissionSaga` / `PollingAttachmentsSubmissionSaga` endpoints are still referenced in saga routing.
- **Clawdia / STP:** COS integrates with "Claims Automation" only via the Event Grid topic `claimsautoclaims` and the `/api/Claims/ClaimsAutomation/Completed` + `GetInvoicePayload` endpoints; no explicit reference to Clawdia — the CA service behind the topic should be confirmed (STP Logic Apps / Functions *inferred*).
- **CATCH:** COS DB holds CATCH user/role/assignment/notification tables and grants for CATCH notification/SignalR Function Apps; CATCH itself is outside this system — the boundary (shared DB) is worth showing on diagrams.
- **Security observations (values not reproduced):** non-placeholder credentials appear committed in a few files — a Service Bus SAS key in `COS.API/COS.API/Web.config` and some test/legacy configs, DB passwords in dev configs, and DAPI/Boomi passwords in `ClaimsAPI/ClaimsAPI/AppSettings/appsettings.*.json`. Recommend rotation and moving to Key Vault tokens.
- **Region instances:** AU runs SYD/MEL config variants; NZ, VP, TPN (UPM poller) and PY (PetYellow, `petyellow.ca`) have separate deployments of the same code — confirm which are live (PY targets are commented out in some workflows).
- Message contract package versions differ across repos (`COS.Common.Models` 91.0.0 vs 1.0.33x-VETHUBR1) — check compatibility when changing contracts.
