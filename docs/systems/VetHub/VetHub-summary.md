# VetHub
> VetHub is PetSure's vet-integration platform (the "vet channel"). It lets Vet Practice Management Systems (VPMS: RxWorks, OpenVPMS, ezyVet, VetLink SQL, PetBooqz, CHSVet, Vision) and vet payment platforms (Tyro Health "GapOnly") lodge insurance claims and attachments electronically, validate a policy and check GapOnly (on-the-spot / gap-only) eligibility before submitting, confirm gap payments, and poll for claim status changes. Inside PetSure, an asynchronous pipeline (Windows services on NServiceBus over Azure Service Bus) prepares each claim. It creates invoice and clinical-history PDFs when the VPMS does not send them, moves attachments into insurer-specific storage, and marks the claim "ready to download". The insurer side (COS – Claim Orchestration Service, AU/NZ/VetPartners) then polls VetHub, downloads the claim and pushes back status, gap benefit amounts and policy-number corrections. VetHub tells the vets about those changes through polling, ezyVet push and Tyro webhooks. The system also covers vet-practice registration and onboarding (VetHub.UI and VetHub.Reg.API), CATCH back-office screens for practice admin, vet fees and stuck claims (Vet.Portal.API), stuck-claim e-mail alerts, and Twilio voice notifications for GapOnly claims.
> Generated from source code analysis on 2026-10-14. Items marked *inferred* are not explicit in the repo.

## System
- **System name:** VetHub
- **Full name:** VetHub – PetSure Vet Practice Integration / e-Claims Gateway (OpsLevel system `vethub`, owner team `go_tech`)
- **Repositories (12):** apim-vethub-api, VetHub.API, Vet.Portal.API, VetHub.Reg.API, VetHub.UI, VetHub.Service, VetHub.Service.ProcessConversations, VetHub.Service.StatusUpdate, VetHub.Alert.StuckClaims, MessageFormat.API, VetHub.SQLServer, VetHub.Data (`_to_delete` folder ignored)

## Components

| Component | Component type | Deployment type | Artifact type | Production deployment name(s) | Repository |
|---|---|---|---|---|---|
| VetHub APIM | API gateway facade (APIM) + Infrastructure as Code | API Management (`ts-api-management`) | API definition with policies (`api-definition`) | APIM `ps-prod-apim-vethub` (RG `ps-prod-rg-vethub`, Basic_1, australiaeast); product `VetHub`; App Insights `ps-prod-insights-vethubapim`; Log Analytics `ps-prod-log-analytics-vethubapim`; logger `ps-prod-apim-vethub-logger`; gateway `https://ps-prod-apim-vethub.azure-api.net` *inferred* from the nonprod Postman env | apim-vethub-api |
| VetHub.API | REST API (VPMS + insurer integration API) | App Service (code) (`ts-app-service-code`) | Compiled application package (`compiled-package`) | App Service = GitHub var `APP_SERVICE_NAME` (not in repo), env `alz-prod`, staging-slot swap; hosts `internal-api-vh-prod.petsure.com.au` (APIM backend), `https://api-vh-prod.vethub.net/` (direct); Key Vault `pssydprdvethubapikv`; Redis `ps-syd-prd-vethubapi-redis` | VetHub.API |
| Vet.Portal.API | Backend for Frontend API (CATCH back-office) | App Service (code) (`ts-app-service-code`) | Compiled application package (`compiled-package`) | App Service = GitHub var `APP_SERVICE_NAME` (not in repo), env `alz-prod`; host `https://api-vethubportal-prod.vethub.net/`; Key Vault `pssydprdvetportalkv` | Vet.Portal.API |
| VetHub.Reg.API | Backend for Frontend API (vet registration) | App Service (code) (`ts-app-service-code`) | Compiled application package (`compiled-package`) | App Service = GitHub var `APP_SERVICE_NAME` (not in repo), env `alz-prod`; hosts `https://api-vethubreg-prod.vethub.net/`, `internal-api-vethubreg-prod.petsure.com.au` (APIM backend); Key Vault `pssydprdvhregkv` | VetHub.Reg.API |
| VetHub.UI | Web UI (SPA, React/Vite served by Express) | App Service (code) (`ts-app-service-code`) | Static web bundle (`static-web-bundle`) | `https://vetportal.vethub.net/`; CDN `https://petcdnstore.blob.core.windows.net/vethubui-prod/`; App Service = GitHub var `APP_SERVICE_NAME` | VetHub.UI |
| VetHub.Service.ProcessConversations | Scheduled job / poller (Windows Service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | Windows service = GitHub var `SERVICE_NAME` on var `SERVER_NAME`; sends to queue `<ENV>_VetHub.Service.Saga.Claim` (DEV value in repo; prod value is `#{QueueName}#` token); pipeline only covers DEV/SIT | VetHub.Service.ProcessConversations |
| VetHub.Service.Saga.Claim | Saga / orchestrator (NServiceBus Windows Service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | GitHub env `SagaClaimPROD`; NSB endpoint `VetHub.Claims.Saga.Service` (route for ProcessClaimCommand); Windows service = var `SERVICE_NAME` | VetHub.Service |
| VetHub.Service.Attachments | Event-driven worker (NServiceBus Windows Service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | GitHub env `AttachmentsPROD`; endpoint name token `#{EndPointName}#` | VetHub.Service |
| VetHub.Service.Claims | Event-driven worker (NServiceBus Windows Service) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | GitHub env `ClaimsPROD`; endpoint name token `#{EndPointName}#` | VetHub.Service |
| VetHub.Service.StatusUpdate | Scheduled job (Windows Service – ezyVet status push) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | GitHub env `PROD` (deploy-PROD-AUS); service = var `SERVICE_NAME` | VetHub.Service.StatusUpdate |
| VetHub.Alert.StuckClaims | Scheduled job (Windows Service – alerting) | Azure Virtual Machines (`ts-virtual-machines`) | Executable / binary (`executable`) | Not found in repo (pipeline only covers DEV/SIT; `App.Production.config` exists) | VetHub.Alert.StuckClaims |
| MessageFormat.API | REST API (Twilio TwiML voice formatter) | Azure Virtual Machines (`ts-virtual-machines`) | IIS deployment (`iis-deployment`) | `https://api-messageformat-prod.petsure.com.au/` (from VetHub.Reg.API prod config); IIS site = var `SITE_NAME`; pipeline only covers DEV/SIT/UAT | MessageFormat.API |
| VetHub Database | Database | Not in reference table — SQL Server Database Project (DACPAC, SqlAzureV12) for Azure SQL Database | Not in reference table — DACPAC | DB name not in repo (connection string `VetHubContext` / `ConnectionStrings-VetHubDb` in Key Vault); no deployment pipeline | VetHub.SQLServer |
| VetHub.Core.DataModel / DomainModel | Shared library (EF6 model) | Not deployed independently (NuGet / project reference) | Not in reference table — NuGet package | GitHub Packages NuGet (publish-nuget-package workflow); also copied as `CommonDLL(s)/VetHub.Core.DataModel.dll` | VetHub.Data |

### VetHub APIM
- **Purpose:** The external facade for vet payment platforms (mainly **Tyro Health GapOnly**; Terraform state keys `tyroAPIM`/`tyroAPIMv2`, TESTING.md says "client IP restrictions to the Tyro client"). It publishes the VPMS claim-lodgement subset of VetHub.API plus the practice-registration API of VetHub.Reg.API.
- **Runtime/framework:** Terraform (azurerm), shared module `PetSureAustralia/terraform-library//api_management`; GitHub Actions `infra-validate.yml` (plan) / `infra-release.yml` (apply on main/release/*).
- **Component type:** API gateway facade (APIM) · **Deployment:** API Management (`ts-api-management`) · **Artifact:** API definition with policies (`api-definition`).
- **Prod names:** `ps-prod-apim-vethub` in `ps-prod-rg-vethub`; nonprod `ps-nonprod-apim-vethub` (Developer_1) in `ps-nonprod-rg-vethub`.
- **Policies (all APIs, `Infra/templates/ApimPolicy_VetHub.xml`):** validate-jwt against Azure AD tenant `ce9f1d01-…ff729` (audience = VetHub API app registration, required `appid` claim = the single allowed client app); default `Content-Type: application/json`; **IP allow-list of Cloudflare ranges (prod only, commented out in nonprod)**, so traffic must come through Cloudflare, with mTLS client certs for PetSure testers; `rate-limit 60 calls / 60 s`; `set-backend-service` per API. `/health` skips JWT and is rewritten to `/healthcheck`. HTTPS only, no subscription key.
- **Evidence:** `api_mapping.json`, `Infra/main.tf`, `Infra/envs/prod.tfvars`, `Infra/envs/nonprod.tfvars`, `Infra/templates/ApimPolicy_VetHub.xml`, `.github/workflows/infra-release.yml`, `TESTING.md`, `postman.collection/*`.
- **Dependencies:** inbound from Tyro (and possibly other platforms), via Cloudflare and Azure AD. Outbound to VetHub.API (`https://internal-api-vh-prod.petsure.com.au`) and VetHub.Reg.API (`https://internal-api-vethubreg-prod.petsure.com.au`). Logs go to App Insights.

### VetHub.API
- **Purpose:** The core VetHub integration API. VPMS systems use a conversation-based flow: get a conversation id, upload attachments, submit the claim (XML or JSON), raise queries, poll and acknowledge. They also validate policies and check GapOnly eligibility. Insurer systems (COS) use it to download new claims and attachments, confirm downloads, and update status, gap benefit, vet fee and policy number. Gap-payment confirmations are forwarded to COS and CATCH. Outcomes are pushed to Tyro and ezyVet.
- **Runtime/framework:** ASP.NET Core Web API on **.NET 10** (`Microsoft.NET.Sdk.Web`, net10.0), MediatR, AutoMapper, EF Core + Dapper (SQL Server), HybridCache + Azure Redis, Polly resilience, Microsoft.Identity.Web, OpenTelemetry → App Insights. (README still says .NET Framework 4.8; it is stale.)
- **Component type:** REST API · **Deployment:** App Service (code) (`ts-app-service-code`) · **Artifact:** Compiled application package (`compiled-package`; `dotnet publish` and `azure/webapps-deploy` to the `staging` slot, then swap).
- **Prod names:** App Service from GitHub var `APP_SERVICE_NAME` / `AZURE_RG` (not in repo); `internal-api-vh-prod.petsure.com.au`, `api-vh-prod.vethub.net`; Key Vault `pssydprdvethubapikv`; Redis `ps-syd-prd-vethubapi-redis.redis.cache.windows.net`. Environments dev/sit/uat/preprod/prod (`environments/*.json`).
- **AuthN/Z:** `AuthorisationMiddleware`. VPMS and insurers send `UserId`/`UserPassword`/`SenderId` headers, checked against `Account`/`VendorLookUp`. Platforms such as Tyro send an Azure AD bearer token with `VetPracticeId`/`RequestType` headers. Roles are vet clinic vs insurance provider (`IsVetClinicAuthorised`, `IsInsuranceProviderAuthorised`).
- **Evidence:** `VetHub.API/VetHub.API.csproj`, `VetHub.API/Controllers/**`, `VetHub.API/appsettings.json`, `environments/prod.json`, `.github/workflows/alz-code-release.yml`, `alz-reusable-deploy.yml`, `VetHub.API.Infrastructure/Configuration/HttpClientServiceCollectionExtensions.cs`, `opslevel.yml`.
- **Outbound dependencies:**
  - **PetSure Claims API**, insurer-routed AU / NZ / VetPartners (`api-claims-prod[-nz/-vp].petsure.com.au`): `POST api/Policy/Find`, `GET api/Policy/DetailsByPolicyNumber`. This is the policy validation and GapOnly policy eligibility source (backed by UPM *inferred*).
  - **COS**, routed AU/NZ/VP (`api-cos-prod[-nz/-vp].petsure.com.au`): `POST api/GapOnly/ConfirmFinalPayment`.
  - **CATCH API** (`api-catch-prod.petsure.com.au`): `api/portal/Claims/GapOnly/FullPaymentConfirmation` and `…/ConfirmFinalPayment`.
  - **Tyro Health:** OAuth at `auth.tyrohealth.com`, then `gaponly-api.tyrohealth.com` webhooks `/trpc/webhook.vethub.adjudicateClaim` (GapOnly outcome) and `/trpc/webhook.vethub.updateLocationStatus` (practice status). Signed with VetHub private/public keys held in Key Vault.
  - **ezyVet** (`integrations.ezyvet.com`): `call/claim/updateStatus`.
  - **PetSure Notification API** (`api-notification-prod.petsure.com.au`): e-mails.
  - **PetSure File Storage API** (`api-storage-prod.petsure.com.au`): `api/documents/UploadFile` and `api/documents/{id}`, for attachments.
  - Also UPM settings (`uatupmwebservice…/DigitalAPI_UAT`, user RXWORKS), Azure Key Vault, Redis, and the VetHub DB.

### Vet.Portal.API
- **Purpose:** The back-office API behind CATCH (PetSure's internal claims UI; CORS `catch-prod[-nz/-vp].petsure.com.au`). Staff use it to administer registered vet practices (details, contacts, GapOnly eligibility, VPMS, T&Cs, onboarding e-mails, activation of external/Tyro onboarding requests), search VetHub claims, view and **reflow stuck claims**, and look up rate cards and vet-fee transactions.
- **Runtime/framework:** ASP.NET Core on .NET 10 (`Directory.Build.props` net10.0), EF Core; auth validated through the PetSure Security API (`/api/security/aad/validate`, AU and VP instances).
- **Component type:** Backend for Frontend API · **Deployment:** App Service (code) (`ts-app-service-code`) · **Artifact:** Compiled application package (`compiled-package`).
- **Prod names:** `https://api-vethubportal-prod.vethub.net/` (referenced in VetHub.API and Reg.API prod config); Key Vault `pssydprdvetportalkv`; App Service from var `APP_SERVICE_NAME`.
- **Evidence:** `Vet.Portal.API/Controllers/*.cs`, `environments/prod.json`, `.github/workflows/alz-*.yml`, `README.md`.
- **Dependencies:** VetHub DB (direct EF), PetSure Security API, Notification API, File Storage API (container `vethub-reg-prod-userguide`), Claims API (`api/claims/GetServiceProviders/`), links to VetHub.UI/Reg API/CATCH UI in e-mails.

### VetHub.Reg.API
- **Purpose:** The registration and onboarding API behind VetHub.UI and the APIM `VetPractice/Register` operation. It takes new practice registrations (stored as external onboarding requests), returns practice details by encrypted id, records T&C acceptance, sends onboarding e-mails, and serves the per-VPMS payment-confirmation user guides and encrypted documents.
- **Runtime/framework:** ASP.NET Core on .NET 10 (net10.0, "R4 2026 .NET 10 modernisation"), EF Core, MediatR; Azure AD (`Security__ClientId` = VetHub API app reg) plus an API-key handler.
- **Component type:** Backend for Frontend API · **Deployment:** App Service (code) (`ts-app-service-code`) · **Artifact:** Compiled application package (`compiled-package`). OpsLevel still says `azure-virtual-machine`; the current workflows deploy to App Service.
- **Prod names:** `https://api-vethubreg-prod.vethub.net/`, `internal-api-vethubreg-prod.petsure.com.au`; Key Vault `pssydprdvhregkv`.
- **Evidence:** `VetHub.Reg.API/Controllers/*.cs`, `VetHub.Reg.API/Program.cs`, `environments/prod.json`, `.github/workflows/alz-code-release.yml`.
- **Dependencies:** VetHub DB, Notification API, File Storage API, VetHub Security (AAD), MessageFormat.API URL (config).

### VetHub.UI
- **Purpose:** The vet-facing onboarding portal, opened from an encrypted e-mail link. Staff verify the practice details, accept the VetHub Terms of Use, confirm e-mail changes, and follow VPMS-specific (including Tyro) setup guides.
- **Runtime/framework:** React 19 + Vite + TypeScript SPA, served by Express 5 (`server.js`, `/health`); config `public/app/configs/appConfig.production.json`.
- **Component type:** Web UI (SPA) · **Deployment:** App Service (code) (`ts-app-service-code`) · **Artifact:** Static web bundle (`static-web-bundle`; Vite build plus Node server, `azure/webapps-deploy`).
- **Prod names:** `https://vetportal.vethub.net/` (CORS/links in Reg API/Vet.Portal config); CDN `petcdnstore/vethubui-prod`.
- **Dependencies:** VetHub.Reg.API (`https://api-vethubreg-prod.vethub.net/`).

### VetHub.Service.ProcessConversations
- **Purpose:** A Topshelf Windows service on a 5 s timer. It finds conversations with status `ClaimIsReceived` (12002) and workflow `NotProcessed`, GapOnly first, and sends a `ProcessClaimCommand` (JSON with NServiceBus headers) to the saga queue on Azure Service Bus. It then sets the workflow status to `Processing` and writes `ConversationHistory`.
- **Runtime:** .NET Framework console/Windows service, EF6 (`VetHub.Core.DataModel.dll`), Azure Service Bus (SYD/MEL namespace chosen from the Azure VM instance metadata region).
- **Deployment:** Azure Virtual Machines (`ts-virtual-machines`) · **Artifact:** Executable (`executable`) via PowerShell remoting `New-Service`.
- **Evidence:** `VetHub.Service.ProcessConversations/App.config`, `ProcessConversationService.cs`, `.github/workflows/build-and-deploy-iis.yml`, `reusable-deploy.yml`.

### VetHub.Service (Saga.Claim, Attachments, Claims)
- **Purpose:** The NServiceBus claim-preparation pipeline.
  - **Saga.Claim:** started by `ProcessClaimCommand`. Sends `CreateAttachmentCommand` and `UpdateClaimConversationCommand`, handles `AttachmentCreatedMessage`, `ClaimConversationUpdatedMessage` and `AttachmentRemovedMessage`, and applies `ClaimTimeOut`.
  - **Attachments:** generates invoice PDFs for RXWORKS/VETLINKSQL/TYRO from templates, and an Animal Clinical History PDF for CHSVET. Converts HTML/text to PDF and moves files into insurer-specific storage containers.
  - **Claims:** handles `UpdateClaimConversationCommand`/`UpdateStatusClaimCommand`. Validates attachment content types against COS-supported types, moves the claim to `ClaimReadyToDownload` (13000) or `ClaimIsInvalid` (12001), and writes `ConversationHistory` and `PollClaim`.
- **Runtime:** .NET Framework 4.x, NServiceBus with `AzureServiceBusTransport` (SYD/MEL connection strings), NServiceBus SQL Persistence (`NSBusPersistenceDB`), EF6, iText/MigraDoc, log4net + MSMQ log queue.
- **Deployment:** Azure Virtual Machines (`ts-virtual-machines`) · **Artifact:** Executable (`executable`) as Windows services; GitHub environments `SagaClaimPROD`, `AttachmentsPROD`, `ClaimsPROD`.
- **Shared libs in repo:** VetHub.Service.Messages (message contracts), .Backend/.Backend.Contracts (adapters), .Infrastructure (PDF and HTTP helpers). These are not deployed independently.
- **Evidence:** `*/Program.cs`, `ProcessClaimsSaga.cs`, `*/App.config`, `.github/workflows/dotnetVetHub.*.yml`, `deployVetHub.*.yml`, `README.md`.
- **Dependencies:** VetHub DB, NSB persistence DB, Azure Service Bus, File Storage API (`api/documents/UploadFile|MoveFile|RenameFile|{id}`).

### VetHub.Service.StatusUpdate
- **Purpose:** A 60 s poller. It reads changed `PollClaim` rows since the last `PollingClaimStatusHistory` run, groups them by clinic, and pushes status, policy, GapOnly benefit, vet fee and remittance details to **ezyVet** (`POST call/claim/updateStatus`). Each run is logged in `PollingClaimStatusHistory`.
- **Runtime:** .NET Framework Windows service (Topshelf), Dapper, MediatR.
- **Deployment:** Azure Virtual Machines (`ts-virtual-machines`) · **Artifact:** Executable (`executable`); envs DEV, SIT, UAT, PREPROD, PROD.
- **Evidence:** `Vethub.Service.StatusUpdate/App.config`, `.github/workflows/build-and-deploy.yml`, `README.md`.

### VetHub.Alert.StuckClaims
- **Purpose:** Runs every 90 s and finds claims stuck in statuses 12002/13000/13001 (GapOnly after 100 s, eClaims after 1 h). It also finds claims "downloaded" (13002) that are missing in the **COS AU DB (`COSDataContext`) and COS NZ DB (`COSNZDataContext`)**. It e-mails the vet-channel team over SMTP `mail-out.petsure.com.au:25` using templates from `NotificationLookUp`, and de-duplicates through `StuckClaimAlert`.
- **Runtime:** .NET Framework 4.8 Windows service, EF6 (VetHub and COS data models), ADO.NET for COS NZ.
- **Deployment:** Azure Virtual Machines (`ts-virtual-machines`) · **Artifact:** Executable (`executable`).
- **Evidence:** `VetHub.Alert.StuckClaims/App.config`, `App.Production.config`, `.github/workflows/dotnet.yml`, `README.md`.

### MessageFormat.API
- **Purpose:** Returns Twilio TwiML `<Say>` XML so that Twilio can phone the GapOnly claims team when a GapOnly or real-time VetHub claim arrives. It spells out policy and claim numbers and uses the Polly.Nicole voice. It also serves logo images.
- **Runtime:** ASP.NET Web API, .NET Framework 4.8 (`Web.config` transforms DEV/SIT/UAT/PreProduction/Production).
- **Deployment:** Azure Virtual Machines (`ts-virtual-machines`) · **Artifact:** IIS deployment (`iis-deployment`). The workflow switches the IIS site physical path; OpsLevel says azure-app-service.
- **Prod name:** `https://api-messageformat-prod.petsure.com.au/`.
- **Evidence:** `MessageFormat.API/MessageFormat.API.csproj`, `Controllers/VoiceController.cs`, `.github/workflows/reusable-deploy.yml`.

### VetHub Database (VetHub.SQLServer)
- **Purpose:** SQL Server Database Project (Azure SQL V12) holding the VetHub schema: about 75 tables and 12 stored procedures, plus a post-deployment seed (GapOnlyDescription rows).
- **Deployment:** Not in reference table — DACPAC to Azure SQL Database (no pipeline in repo; snapshot dacpac from 2017).
- **Evidence:** `VetHub.SQLServer/VetHub.SQLServer.sqlproj`, `dbo/Tables/*.sql`, `dbo/Stored Procedures/*.sql`, `DeploymentScript/Script.PostDeployment.sql`.

### VetHub.Data
- **Purpose:** The EF6 reverse-engineered model of the VetHub DB (`VetHubContext`, about 100 DbSets including tables that are missing from the sqlproj) plus domain models (`VetXmlClaimWithHeader`, `InsuranceClaim`, `VetPracticeRegistrationDetails`). The legacy Windows services use it.
- **Component type:** Shared library · **Deployment:** Not deployed independently (NuGet / project reference) — GitHub Packages via `build-publish-dotnet-framework.yml`.

## Services

Prod base URLs used below:
- `{apim}` = `https://ps-prod-apim-vethub.azure-api.net` (*inferred*; nonprod `https://ps-nonprod-apim-vethub.azure-api.net` is in the Postman env).
- `{vh}` = `https://api-vh-prod.vethub.net` (direct, also `https://internal-api-vh-prod.petsure.com.au` behind APIM).
- `{portal}` = `https://api-vethubportal-prod.vethub.net`.
- `{reg}` = `https://api-vethubreg-prod.vethub.net`.
- `{mf}` = `https://api-messageformat-prod.petsure.com.au`.

### VetHub APIM — REST (external facade for vet payment platforms, e.g. Tyro)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | Claim API / NewConversationId | REST (APIM) | `GET {apim}/Claim/NewConversationId` → backend `/api/Claim/NewConversationId` | Starts a claim conversation | Conversation |
| 2 | Claim API / NewAttachmentId | REST (APIM) | `GET {apim}/Claim/{conversationId}/Attachment/NewConversationId` | Gets an attachment conversation id | Conversation, Attachment |
| 3 | Claim API / SubmitAttachment | REST (APIM) | `POST {apim}/Claim/{conversationId}/Attachment/{attachmentId}` | Uploads an attachment file | Attachment, File Storage API |
| 4 | Claim API / SubmitClaim | REST (APIM) | `POST {apim}/Claim/{conversationId}` | Submits the claim (JSON/XML) | Claim, ClaimBlob, Conversation, GapOnly |
| 5 | Claim API / ConfirmFinalPayment | REST (APIM) | `POST {apim}/Claim/{conversationId}/Gaponly/ConfirmFinalPayment` | Confirms the customer paid the gap; forwards to COS/CATCH | GapOnly, GapOnlyStatus, COS, CATCH API |
| 6 | Claim API / Declaration | REST (APIM) | `GET {apim}/Claim/Declaration` | Insurer declaration text | Declaration, BrandPartner, LegalAgreement |
| 7 | Policy API / PolicyValidate | REST (APIM) | `GET {apim}/Policy/validate` | Validates the policy before lodgement | Claims API (Policy/Find), InsuranceBrand, PlanNumber |
| 8 | ServiceProvider API / GetServiceProvider | REST (APIM) | `GET {apim}/ServiceProvider/GetServiceProviders/{show}` | Lists supported insurers | InsuranceProvider, InsuranceBrand |
| 9 | VetPracticeRegistration API / Onboarding | REST (APIM) | `POST {apim}/VetPractice/Register` → VetHub.Reg.API `/api/VetPractice/Register` | Registers or onboards a practice | ExternalOnboardingRequest, VetPractice, Contact, Address, Location |
| 10 | GapOnly API / ServiceHours | REST (APIM) | `GET {apim}/GapOnly/ServiceHours` → `/api/Claim/GapOnly/ServiceHours` | GapOnly service hours | GapOnlyServiceHours, Settings |
| 11 | GapOnly API / PublicHolidays | REST (APIM) | `GET {apim}/GapOnly/PublicHolidays` → `/api/Claim/GapOnly/PublicHolidays` | GapOnly public holidays | PublicHolidays |
| 12 | Health API / Health | REST (APIM, no JWT) | `GET {apim}/Health/health` → backend `/api/healthcheck` | Liveness | — |

### VetHub.API — REST (VPMS / vet platform-facing; auth headers or AAD token)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | GetConversationID | REST | `GET {vh}/api/Claim/NewConversationId` | New claim conversation (supports multi-location headers) | Conversation, VetPractice, Location, Settings (outages) |
| 2 | GetAttachmentId | REST | `GET {vh}/api/Claim/{conversationId}/Attachment/NewConversationId` | New attachment conversation | Conversation |
| 3 | SubmitAttachment | REST | `POST {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}` | Upload attachment (content-type whitelist) | Attachment, File Storage API |
| 4 | SubmitClaim | REST | `POST {vh}/api/Claim/{conversationId}` | Submit claim (XML VetXML or JSON); GapOnly checks, vet fee calc, OpenVPMS rules, notifications | Claim, ClaimBlob, Conversation, GapOnly, VetFee, RateCard, ProviderRate, Notification API |
| 5 | GetQueryId | REST | `GET {vh}/api/Claim/{conversationId}/Query/NewConversationId` | New query on a claim | Conversation, Query |
| 6 | SubmitQuery | REST | `POST {vh}/api/Claim/{conversationId}/Query/{queryId}` | Send query message (e-mailed to the claims team) | Query, NotificationLookUp, Notification API |
| 7 | GetDeclarations | REST | `GET {vh}/api/Claim/Declaration` | Insurer declaration / T&Cs | Declaration, BrandPartner |
| 8 | GetGapOnlyServiceHours | REST | `GET {vh}/api/Claim/GapOnly/ServiceHours` | GapOnly service hours | GapOnlyServiceHours, RealTimeClaimServiceHours |
| 9 | GetGapOnlyPublicHolidays | REST | `GET {vh}/api/Claim/GapOnly/PublicHolidays?request.DateFrom=&request.DateTo=` | Public holidays | PublicHolidays, RealTimeClaimPublicHolidays |
| 10 | ConfirmFinalPayment | REST | `POST {vh}/api/Claim/{conversationId}/GapOnly/ConfirmFinalPayment` | Gap payment confirmation → COS `api/GapOnly/ConfirmFinalPayment` + CATCH | GapOnly, GapOnlyStatus, COS, CATCH API |
| 11 | AcknowledgeClaim | REST | `POST {vh}/api/Claim/{conversationId}/Acknowledge` | VPMS acknowledges a final status (settled/declined/cancelled) | Claim, Conversation, ConversationHistory |
| 12 | AcknowledgeAttachment | REST | `POST {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}/Acknowledge` | Acknowledge final attachment status | Attachment |
| 13 | CancelClaim | REST | `POST {vh}/api/Claim/{conversationId}/Cancel/{cancelReasonType}/EmailNotification/{isSendEmail}` | Cancel a submitted claim (within cancellation hours), optional e-mail | Claim, Conversation, Notification API |
| 14 | GapOnly Eligibility | REST | `GET {vh}/api/GapOnly/Eligibility` | Practice + brand/plan + hours/holiday GapOnly eligibility (with or without policy) | VetPractice, InsuranceBrand, PlanNumber, GapOnlyServiceHours, PublicHolidays, Claims API |
| 15 | VetPractice GapOnly eligibility | REST | `GET {vh}/api/VetPractice/GapOnly/GetEligibility` | Practice-level GapOnly eligibility | VetPractice, Location |
| 16 | Policy validate | REST | `GET {vh}/api/policy/validate` | Policy lookup (name, pet, contact) | Claims API (AU/NZ/VP) |
| 17 | GetServiceProviders | REST | `GET {vh}/api/ServiceProvider/GetServiceProviders/{show?}` | Insurers by registration country | InsuranceProvider, InsuranceBrand |
| 18 | Poll | REST | `GET {vh}/api/Poll/{pollId}` | Bulk delta of claim/attachment/policy/vet-fee changes since a poll reference | Poll, PollHistory, PollClaim, UpdatedFieldValue, Claim, VetFee, Remittance |
| 19 | LatestPollId | REST | `GET {vh}/api/Poll/LastRef` | Latest poll reference | Poll |
| 20 | StatusUpdate | REST | `GET {vh}/api/Poll/{conversationId}/Status` | Per-claim status (manual refresh) | Claim, Conversation, GapOnly, Remittance |
| 21 | HealthCheck | REST | `GET {vh}/api/HealthCheck` | Liveness / DB (`USP_HealthCheck`) | VetHub DB |

### VetHub.API — REST (insurer-facing: COS AU/NZ/VetPartners)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | NewConversations | REST (polled by COS) | `GET {vh}/api/Claim/NewConversations?numberOfClaims=&claimType=` | Claims and attachments ready to download for the insurer | Claim, Attachment, Conversation, InsuranceProvider |
| 2 | GetClaim | REST | `GET {vh}/api/Claim/{conversationId}` | Download claim payload | Claim, ClaimBlob |
| 3 | GetAttachment | REST | `GET {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}` | Download attachment | Attachment, File Storage API |
| 4 | ConfirmClaimDownload | REST | `POST {vh}/api/Claim/{conversationId}/ConfirmDownload` | Mark downloaded (13002) | Claim, ConversationHistory, PollClaim |
| 5 | ConfirmAttachmentDownload | REST | `POST {vh}/api/Claim/{conversationId}/Attachment/{attachmentId}/ConfirmDownload` | Mark attachment downloaded (33002) | Attachment |
| 6–8 | UpdateStatus ClaimProcessing / ClaimDeclined / ClaimSettled | REST | `POST {vh}/api/Claim/{conversationId}/UpdateStatus/ClaimProcessing`, `…/ClaimDeclined`, `…/ClaimSettled` (body: claim number) | Insurer status back to VetHub (19000/19002/19001); pushes to ezyVet/Tyro | Claim, PollClaim, UpdatedFieldValue, Remittance, ezyVet, Tyro |
| 9 | Nullify | REST | `POST {vh}/api/Claim/{conversationId}/Nullify` | Nullify claim (-1000) | Claim, Conversation |
| 10 | UpdatePolicyNumber | REST | `POST {vh}/api/Claim/{conversationId}/UpdatePolicyNumber/{*policyNumber}?isPolicyNumberCorrectedByLookups=` | Corrects the policy number and notifies the vet | Claim, UpdatedFieldValue, Notification API |
| 11 | UpdateGapBenefitAmount | REST | `POST {vh}/api/Claim/{conversationId}/GapOnly/BenefitAmount` | Sets the GapOnly benefit (max 99,999) and sends the outcome to Tyro | GapOnly, GapOnlyDescription, GapOnlyStatus, Tyro webhook |
| 12 | GetVetFee | REST | `GET {vh}/api/GapOnly/{conversationId}/VetFee` | Vet service fee for a GapOnly claim | VetFee |
| 13 | UpdateVetFee | REST | `POST {vh}/api/GapOnly/{conversationId}/VetFee` | Update vet fee / submitted-to-COS flag (`USP_Update_VetFee`) | VetFee |
| 14 | SendStatusToExternalVetPractice | REST | `POST {vh}/api/ExternalVetPractice/SendStatus` | Push practice onboarding/location status to Tyro (`updateLocationStatus`) | VetPractice, Location, Tyro |
| 15 | ChangeLogLevel | REST (ops) | `POST {vh}/api/log/ChangeLogLevel` | Runtime log-level change (hidden from Swagger) | — |

### Vet.Portal.API — REST (consumed by CATCH UI / back-office)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | GetClaimStatusList | REST | `GET {portal}/api/Claims/StatusList` | Claim status reference list | ClaimStatusType |
| 2 | SearchVethubClaims | REST | `GET {portal}/api/Claims/SearchVethubClaims` | Search VetHub claims by date range etc. | Claim, Conversation, VetPractice |
| 3 | GetVetPractices | REST | `GET {portal}/api/Claims/VetPractices` | Practice lookup | VetPractice |
| 4 | GetVpmsLookUp / GetVendorProviderLookUp | REST | `GET {portal}/api/Claims/VpmsLookUp`, `GET {portal}/api/Claims/VendorProviderLookUp` | VPMS / vendor reference data | VendorLookUp, VetProvider |
| 5 | GetVethubStuckClaimList | REST | `GET {portal}/api/Claims/VethubStuckClaimList` | Stuck-claim list / dashboard count | Claim, Conversation, ConversationHistory |
| 6 | Reflow | REST | `POST {portal}/api/Claims/Reflow` | Resets a stuck claim to `ClaimIsReceived` and re-queues it for polling/processing | Conversation, ConversationHistory, Poll, PollClaim |
| 7 | ActivateRegistration / GetExternalOnboarding | REST | `POST {portal}/api/ExternalVetPractice/{id}/ActivateRegistration`, `GET {portal}/api/ExternalVetPractice` | Approve or list external (e.g. Tyro) onboarding requests | ExternalOnboardingRequest/Status, VetPractice, ProviderMember |
| 8 | VetFee | REST | `GET {portal}/api/VetFee/GetRateCards`, `GET {portal}/api/VetFee/VetFeeTransactions` | Rate cards and vet-fee transaction history | RateCard, ProviderRate, VetFee (VwVetFeeTransactions) |
| 9 | VetPractice read | REST | `GET {portal}/api/VetPractice` (encrypted id), `GET {portal}/api/VetPractice/{id:guid}`, `GET …/LegalAgreement`, `GET …/CheckIfTncAccepted`, `GET …/Account`, `GET …/ServiceProviderAgreement`, `GET …/EmailStatusTypes`, `GET …/GetOpenVpmsVetPractices` | Practice details and reference data | VetPractice, Contact, Address, Location, Account, LegalAgreement, ServiceProviderAgreement, EmailStatusType |
| 10 | VetPractice write | REST | `POST {portal}/api/VetPractice/UpdateEmailStatus`, `…/SubmitVetPractice`, `…/SendEmail`, `…/{id}/SendConfirmEmailChange`, `…/{id}/SendVetHubEmail`, `…/{id}/SendWelcomeEmailNonPrimary`, `…/{id}/SendVetHubDetails`, `…/{id}/UpdateVPMS`, `…/AcceptTermsandCondition`, `…/{id}/UpdateDetails`, `…/{id}/UpdateContacts`, `…/{id}/UpdateGapEligibility` | Maintain practices, GapOnly flag, VPMS, T&Cs; send onboarding e-mails | VetPractice, Contact, Address, ServiceProviderAgreement, NotificationLookUp, Notification API |
| 11 | GetVendorSupportList | REST | `GET {portal}/api/VPMS/GetVendorSupportList/{vpms}` | Vendors supported by a VPMS | VendorSupport |
| 12 | Images / Attachments | REST | `GET {portal}/api/Images/{fileName}`, `GET {portal}/api/Attachments/{container}/{filePath}/{fileName}` | E-mail logo, attachment proxy | File Storage API |
| 13 | HealthCheck | REST | `GET {portal}/api/HealthCheck` | Liveness | VetHub DB |

### VetHub.Reg.API — REST (consumed by VetHub.UI and APIM)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | Register | REST | `POST {reg}/api/VetPractice/Register` | New practice registration (duplicate VPMS id / location checks) | ExternalOnboardingRequest, VetPractice, Location, Contact, Address |
| 2 | GetVetPracticeByEncryptedId | REST | `GET {reg}/api/VetPractice?…` | Practice summary for the onboarding link | VetPractice, VetProvider, Contact, Address, Location |
| 3 | T&Cs | REST | `GET {reg}/api/VetPractice/LegalAgreement`, `GET {reg}/api/VetPractice/CheckIfTncAccepted`, `POST {reg}/api/VetPractice/AcceptTermsandCondition` | Terms of Use retrieval and acceptance | LegalAgreement, LegalAgreementType, ServiceProviderAgreement |
| 4 | E-mails | REST | `POST {reg}/api/VetPractice/UpdateEmailStatus`, `…/SendVetHubEmail`, `…/SendWelcomeEmailNonPrimary`, `…/SendVetHubDetails` | Onboarding e-mail flow | VetPractice, Account, NotificationLookUp/Attribute, Notification API |
| 5 | Settings | REST | `GET {reg}/api/Setting/Email`, `GET {reg}/api/Setting/Phone` | Vet helpline e-mail / phone | Settings |
| 6 | User guide | REST | `GET {reg}/api/userguide` | Per-VPMS payment-confirmation guide PDF | File Storage API (`vethub-reg-prod-userguide`) |
| 7 | Email document | REST | `GET {reg}/api/Email/Document?v=&c=&f=` | Decrypts and proxies a document link from e-mails | File Storage API |
| 8 | Health | REST | `GET {reg}/health`, `GET {reg}/` | Liveness | VetHub DB (`usp_GetDatabaseServerDetails`) |

### MessageFormat.API — REST (consumed by Twilio)
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | Say | REST / TwiML | `GET/POST {mf}/api/voice/Say` | TwiML for "A Gap Only Claim was received…" | AppSettings (Voice, VoiceLoop) |
| 2 | Say RealTime | REST / TwiML | `GET/POST {mf}/api/voice/Say/RealTime` | TwiML for "A VetHub Claim was received…" | — |
| 3 | Say by policy | REST / TwiML | `GET/POST {mf}/api/voice/Say/{policyNumber}` | Simple policy-number message | — |
| 4 | Images | REST | `GET {mf}/api/images?filename=` | Serves logo images | local Images folder |
| 5 | HealthCheck | REST | `GET {mf}/api/HealthCheck` | Liveness | — |

### VetHub — outbound webhooks / pushes to external parties
| # | Operation | Kind | Method & URL | What it does | Data accessed |
|---|---|---|---|---|---|
| 1 | Tyro adjudicateClaim | Webhook (outbound) | `POST https://gaponly-api.tyrohealth.com/trpc/webhook.vethub.adjudicateClaim?batch=1` | GapOnly outcome (benefit, description) to Tyro | GapOnly, GapOnlyDescription |
| 2 | Tyro updateLocationStatus | Webhook (outbound) | `POST https://gaponly-api.tyrohealth.com/trpc/webhook.vethub.updateLocationStatus?batch=1` | Practice location activation status | VetPractice, Location |
| 3 | ezyVet claim status | REST push (outbound) | `POST https://integrations.ezyvet.com/call/claim/updateStatus` | Claim status / remittance / gap / vet fee per clinic (VetHub.API and StatusUpdate service) | PollClaim, Claim, GapOnly, VetFee, Remittance, PollingClaimStatusHistory |
| 4 | Stuck-claim alert | Email (SMTP) | `mail-out.petsure.com.au:25` | Stuck eClaim / GapOnly alerts to the vet-channel team | StuckClaimAlert, NotificationLookUp |

### Internal interfaces
- **ProcessConversations → Saga:** Azure Service Bus queue `<ENV>_VetHub.Service.Saga.Claim` (NSB endpoint `VetHub.Claims.Saga.Service`), message `ProcessClaimCommand {ConversationId, SourceId, IsGapOnly}`. The Service Bus namespaces are SYD and MEL (connection strings `AzureServiceBusConnection_SYD/_MEL`).
- **Saga → Attachments:** `CreateAttachmentCommand`, `RemoveAttachmentsCommand`. Replies: `AttachmentCreatedMessage`, `AttachmentRemovedMessage`.
- **Saga → Claims:** `UpdateClaimConversationCommand`, `UpdateStatusClaimCommand`. Reply: `ClaimConversationUpdatedMessage`. NSB audit and error queues are configured per environment (`#{AuditQueueName}#`, `#{ErrorQueueName}#`).
- **Shared VetHub SQL DB:** VetHub.API, Vet.Portal.API, VetHub.Reg.API, all Windows services and the alert service read and write the same `VetHubContext` database directly. The DB is the hand-off point between the API and the async pipeline (status 12002 → 13000).
- **VetHub.UI → VetHub.Reg.API** (REST). **CATCH → Vet.Portal.API** (REST). **VetHub.API → Vet.Portal.API** (only the logo URL for e-mails).
- **VetHub.Alert.StuckClaims → COS AU/NZ databases** (direct read of `Claim.ConversationId`). This is a cross-system DB dependency.
- **Shared PetSure platform APIs:** Notification API, File Storage API, Security API, Claims API.

## Data objects

### Tables / records
| Data object | Store (DB / container) | Owned by system? | Description | Main fields |
|---|---|---|---|---|
| Conversation / ConversationHistory / ConversationType | VetHub SQL DB | owned | Every VPMS interaction (claim, attachment, query) and its status audit trail | ConversationId, Type, ParentId, Status, PollSequenceNumber, SourceId, RecipientId, VPMS, VPMSVersion, WorkFlowStatusId, GeneratedBy |
| Claim / ClaimHistory / ClaimStatusType | VetHub SQL DB | owned | Claim header submitted by the vet | ClaimId, ConversationId, PolicyNumber, PolicyHolder, PetName, Amount, IsGapOnly, VPMSPracticeId, VPMSClaimRef, ClaimRefNumber (COS/UPM claim no.), Status, RemittanceTotalAmount |
| ClaimBlob / ClaimBlobHistory | VetHub SQL DB | owned | Raw claim payload | ClaimId, XmlClaim, JsonClaim, NoSqlId |
| Attachment / AttachmentHistory / AttachmentStatusType | VetHub SQL DB (+ File Storage API blobs) | owned | Claim attachments; files held in insurer-specific blob containers through File Storage API | Id, ConversationId, ParentId, Status, DocumentPath, DocumentId, DocumentName, ContentType |
| Query | VetHub SQL DB | owned | Vet queries on claims | QueryId, ConversationId, Subject, MessageBody |
| GapOnly / GapOnlyStatus / GapOnlyStatusType / GapOnlyDescription | VetHub SQL DB | owned | GapOnly benefit and payment state per claim; benefit/decline reason texts | ClaimRefNumber, ConversationId, BenefitAmount, PaidAmount, GapOnlyDescriptionId; Description, VpmsDescription |
| GapOnlyServiceHours / RealTimeClaimServiceHours / PublicHolidays / RealTimeClaimPublicHolidays | VetHub SQL DB | owned | GapOnly / real-time claim operating calendar | DayCode, StartTime, EndTime; HolidayName, Date |
| VetFee (+VetFeeHistory*) / RateCard / RateCardHistory / ProviderRate / ProviderRateHistory | VetHub SQL DB | owned | Vet service fee owed to practices on GapOnly claims, from rate cards per provider type and insurer | ConversationId, VetFee, Rate, IsSubmittedToCOS; RateType, RateValue, MaxAmountCap, InsuranceProviderId |
| Remittance | VetHub SQL DB | owned (data from insurer) | Payments made on claims | ConversationId, RemittanceNumber, PaidAmount |
| Poll / PollHistory / PollClaim* / UpdatedFieldValue / FieldType | VetHub SQL DB | owned | Per-VPMS (SourceId) polling sequence and change deltas (status, policy no., vet fee) | SourceId, LastestPollSequenceNumber, PollSequenceID, XmlDeltaPayload; ConversationId, FieldTypeId, FromValue, ToValue |
| PollingClaimStatusHistory | VetHub SQL DB | owned | ezyVet push-run audit | StartDateTime, EndDateTime, VPMSName, NumberOfClaims |
| VetPractice / VetPracticeHistory / VetProvider / VetProviderHistory / VetProviderStatus / Location | VetHub SQL DB | owned | Registered vet practices (branches) and corporate groups, VPMS used, GapOnly / real-time eligibility, VPMS location ids | VetPracticeId, PracticeName, VPMSName, BusinessNumber (ABN), ServiceProviderNumber, IsGapEligible, IsRealTimeEligible, PrimaryRegisteredPracticeId, Status |
| ProviderMember / ProviderMemberRole / ProviderMemberType / Role / Account / AccountType / VendorLookUp | VetHub SQL DB | owned | Identity of every party (practice, provider, insurer) and API credentials for VPMS vendors and insurers | ProviderMemberId, ServiceProviderTypeId; AccountName, AccountTypeId; VendorName, VendorVersion |
| Contact / ContactHistory / ContactType / Address / AddressHistory | VetHub SQL DB | owned | Practice contacts and addresses | ContactName, Email, Phone; AddressLine1, Suburb, State, PostCode, Country |
| InsuranceProvider / InsuranceBrand / BrandPartner / PlanNumber | VetHub SQL DB | owned (reference data mirrored from UPM partners *inferred*) | Insurers (PetSure AU/NZ, VetPartners), brands with GapOnly eligibility, plan-level GapOnly eligibility | InsuranceProviderId, InsuranceBrandName, PartnerNumber, IsGapEligible; PlanNumber, IsGapEligible |
| Declaration / LegalAgreement / LegalAgreementType / LegalTemplate / LegalAgreementLegalTemplate / ServiceProvider* / ServiceProviderAgreement(+History) / ServiceProviderLegalAgreement | VetHub SQL DB | owned | Claim declarations and VetHub Terms of Use accepted by practices | Statement, Version; AgreementId, AcceptedOn |
| NotificationLookUp / NotificationAttribute / NotificationType / EmailStatusType | VetHub SQL DB | owned | E-mail templates and recipients (stuck-claim alerts, onboarding, queries) | Category, FromAddress, ToAddresses, Subject, Body |
| Settings | VetHub SQL DB | owned | Name/value runtime switches (see Configuration) | Name, Value |
| StuckClaimAlert / UpdateFailedConversations | VetHub SQL DB | owned | Alert de-duplication; failed VPMS status pushes | ConversationId, Status, NumberOfAlerts; StatusCode, VPMSStatus, Error |
| FinancialReport / VetPracticeFinancialReport(+History) | VetHub SQL DB | owned | Practice financial-report e-mail subscriptions | Id (columns minimal in sqlproj) |
| ExternalOnboardingRequest / ExternalOnboardingStatus*, Region*, GapOnlyOutcome*, Users*, MosAppointments*, VendorSupport*, Diagnosis*, Configuration* | VetHub SQL DB | owned | Tables used by code / EF model but **not in VetHub.SQLServer** (external onboarding from Tyro, region routing, etc.) | — |
| NServiceBus saga / outbox / subscription tables | NSB persistence DB (`NSBusPersistenceDB`) | owned | ProcessClaimsSaga state | ConversationId correlation |
| COS Claim (AU & NZ) | COS databases (`COSDataContext`, `COSNZDataContext`) | read from COS | Checked by StuckClaims to confirm a downloaded claim reached COS | ConversationId |
| Policy details | Claims API (AU/NZ/VP) | read from Claims API / UPM *inferred* | Policy validation and GapOnly product eligibility | policy number, customer, pet |
| Attachment / user-guide blobs | File Storage API containers (insurer-specific; `vethub-reg-prod-userguide`) | owned via shared service | Claim documents, generated invoices / clinical history PDFs, VPMS guides | container, document id |

(* = present in EF model / code but not in the SQL project.)

### Configuration
| Configuration | Location | Business meaning |
|---|---|---|
| `api_mapping.json` + `Infra/envs/*.tfvars` | apim-vethub-api | Which VetHub operations Tyro or other external platforms may call and which backend serves each one |
| APIM policy (JWT audience/appid, Cloudflare IP filter, rate-limit 60/min) | `Infra/templates/ApimPolicy_VetHub.xml`, `Infra/main.tf` | Only the approved partner app, coming through Cloudflare, can lodge claims; partners are throttled |
| `GapMessages:*` | VetHub.API appsettings | Text shown to the vet when a GapOnly claim is refused (practice not activated, public holiday, outside hours, product not eligible, brand unsupported) |
| `GapEligibility:ValidateBrandPartnerEligibility / ValidatePlanNumberEligibility` | VetHub.API appsettings | Whether GapOnly eligibility is checked at insurance-brand level (Y) and/or plan level (N) |
| `GapStatus:*` codes | VetHub.API appsettings | GapOnly payment lifecycle states (benefit sent, payment confirmed, full payment confirmed, finalised) |
| `Claims:ServiceDay/ServiceHour` (Mon–Fri 9–5), `CancellationServiceDay/Hour` (Mon–Fri 8–8), `GapAndRTCServiceHoursTicks` | VetHub.API appsettings | GapOnly service window and when vets may cancel claims |
| `Claims:ScheduledOutagesMessage`, `BusinessContinuityMessge`; Settings `ScheduledOutages[NZ/Global]`, `UnscheduledOutages[NZ/Global]` | VetHub.API appsettings + `Settings` table | Planned or unplanned GapOnly outage switches by region, and the messages telling vets to lodge a standard eClaim instead |
| Settings `VetHelplinePhoneNumber`, `VetHelplineEmailAddress`, `SwitchOffMarketing` | `Settings` table | Vet helpline contact details in messages; marketing switch |
| `Claims:DefaultInsuranceProviderId` / `…ForNZ`, `VetPartners:InsuranceProviderId`, `InsurerRouting:*` | VetHub.API appsettings / env json | Routing of claims and policy lookups to the AU, NZ or VetPartners insurer stacks (Claims API and COS instances) |
| `Claims:ContentTypesSupported`, `VPMSThatCanAcceptAllContentType`; services `COSSupportContentTypes` | VetHub.API / VetHub.Service App.config | Which document types vets may upload and which COS accepts (others are converted to PDF or invalidate the claim) |
| `Claims:GapBenefitMaxValue` (99,999) | VetHub.API appsettings | Cap on the GapOnly benefit an insurer may set |
| `Claims:PayClaimTo`, `PayVetVpms`, `IsAutoAuth`, `PublicHolidayResponseXML`, `VPMSSupportsMultiLocation` | VetHub.API appsettings | VPMS-specific behaviour (pay vet for RxWorks, OpenVPMS XML holiday response, multi-location practices) |
| `VetFee:CostBaseDivValue` (1.1 = GST) / `…ForNZ` | VetHub.API appsettings | How the vet service fee is split into GST and cost base for AU/NZ |
| `Polling:*` (`NoClaimsPerPoll`, `DoNotAddToPollClaim` = chsvet,vision,tyro, valid statuses) | VetHub.API appsettings, services App.config | Which VPMS get poll records and which status changes they see |
| `Tyro:*` (endpoints, Key Vault secret names for keys/client id) | VetHub.API appsettings / Key Vault | Integration with Tyro GapOnly (OAuth and signed webhooks) |
| `EzyVet:*`, StatusUpdate `VPMSToUpdate`, `PollingClaimStatusInSeconds`, `NumberOfClaimsPerPoll` | VetHub.API / StatusUpdate App.config | ezyVet push integration and its frequency and batch size |
| `ClaimTimeOut`, `GenerateInvoiceFor` (RXWORKS,VETLINKSQL,TYRO), `GenerateAnimalClinicalHistoryPDFFor` (CHSVET), `InvalidateClaimFor` (EZYVET) | VetHub.Service App.config | How long the pipeline waits for attachments, and for which VPMS VetHub generates invoices or clinical history or invalidates claims |
| `TimerInterval`, `QueueName` | ProcessConversations App.config | Claim pick-up frequency (5 s) and target saga queue |
| `AllowedStatus`, `SecondsOffSetForGapClaims` (-100), `EClaimsSecondsOffSet` (-3600), `NoOfAlertsPerClaim`, `AlertInterval` | StuckClaims App.config | When a claim counts as stuck and how often ops are alerted |
| `Resilience:*`, `DatabaseResilience:*`, `Cache:*` | VetHub.API appsettings | Retry, circuit-breaker and caching for downstream calls |
| `VetPracticeSettings:*`, `Application:VetPracticeEncryptionKey` (KV/secret), `FileStorage:SetupGuideStorageContainer` | Vet.Portal.API / Reg.API env json | Onboarding links (UI URLs), encryption of practice ids in e-mails, user-guide storage |
| Template JSON `InvoiceTemplate_RXWORKS/VETLINKSQL/TYRO_VETLINKSQL.json`, `AnimalClinicalHistoryTemplate.json` | VetHub.Service/VetHub.Services.Attachments/Templates | Layout of generated invoice and clinical-history PDFs per VPMS |
| `Voice`, `VoiceLoop` | MessageFormat.API Web.config | Twilio voice and repeat count for GapOnly call alerts |
| Key Vaults `pssydprdvethubapikv`, `pssydprdvetportalkv`, `pssydprdvhregkv`; `ps-uat-kv-vetchannel` (UAT) | env json `@Microsoft.KeyVault(...)` | DB connection strings, App Insights, partner credentials |

## Notes & gaps
- **Prod App Service / VM / Windows-service names** come from GitHub environment variables (`APP_SERVICE_NAME`, `AZURE_RG`, `SERVER_NAME`, `SERVICE_NAME`, `SITE_NAME`) and are not in the repos. The Key Vault and Redis names suggest a `pssydprd…`/`ps-syd-prd-…` naming pattern (*inferred*).
- **APIM gateway URL** for prod (`ps-prod-apim-vethub.azure-api.net`) is *inferred* from the nonprod Postman env. A custom domain fronted by Cloudflare is likely, but none is defined in Terraform.
- The APIM facade only exposes the VPMS lodgement subset. Insurer operations (NewConversations, UpdateStatus, BenefitAmount, VetFee…) and polling are not in APIM. COS and the classic VPMS presumably call `api-vh-prod.vethub.net` directly; COS code is needed to confirm which host COS uses.
- **Who calls `POST /api/ExternalVetPractice/SendStatus`** cannot be determined from these repos (likely CATCH or Vet.Portal activation flow *inferred*).
- **VetHub.SQLServer is stale.** It lacks tables used by code (PollClaim, Region, GapOnlyOutcome, ExternalOnboardingRequest, Users, VetFeeHistory, VendorSupport…), its snapshot dates from 2017, and it has no deployment pipeline. The EF model in VetHub.Data is closer to the live schema. Treat the live DB as the source of truth.
- The database name is not in the repo (connection strings are in Key Vault or replaced at deploy time).
- Pipelines for **VetHub.Service.ProcessConversations** (DEV/SIT), **VetHub.Alert.StuckClaims** (DEV/SIT) and **MessageFormat.API** (DEV/SIT/UAT) do not deploy to PROD, so prod deployment of these is manual or unknown.
- OpsLevel metadata conflicts with the workflows: Reg.API is labelled VM but deploys to App Service, and MessageFormat is labelled App Service but deploys to IIS on a VM. Several READMEs still say ".NET Framework 4.8" although VetHub.API, Vet.Portal.API and Reg.API are now .NET 10.
- `VetHub.API/appsettings.json` contains a `Upm` section (UAT DigitalAPI, user RXWORKS) whose `CustomerClaimsEndPoint` has no code usage found. It may be dead config.
- VetHub.Alert.StuckClaims builds the COS NZ query by string concatenation, and it couples directly to COS databases.
- Legacy services use committed binaries (`CommonDLL(s)/*.dll`) rather than package references, so versions of VetHub.Core.DataModel may drift.
- Security: credentials appear to be committed in some config files. File names are listed in the hand-off report, not here.
