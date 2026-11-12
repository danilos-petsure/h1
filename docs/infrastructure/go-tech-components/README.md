# Go Tech Platform — Component architecture (PROD, as-is)

This folder is the **base for the component architecture** of the claims path. It takes the per-insurer documents in [`../go-tech-platform`](../go-tech-platform/README.md) and turns them around: **one document per component**, each with the same sections.

| Section | Content |
|---|---|
| 1. Deployment picture | The existing ArchiMate export. The **Australia** picture is the default; the pictures of the other environments are linked, not embedded. Global pictures are used for the shared components. |
| 2. Interfaces for claim submission | Every interface the component has with another component on the claim-submission path (see the legend below). |
| 3. Databases | The database(s) the component **writes** to, and any it only **reads**. |
| 4. Azure managed services used | Services the component *uses* (not the ones that host it): which service, which resource, and how. |
| 5. Current technology by environment | For each environment: .NET version, IIS version, and the Azure managed service(s) hosting the component. |
| 6. Open points | What no source confirms yet. |
| 7. Confluence pages | Confluence pages relevant to the component, with what each one adds (checked 28 Oct 2026). |

This README also holds the [App Service migration readiness](#app-service-migration-readiness) assessment across all components.

**Sources:** [`../infrastructure-summary-as-is.md`](../infrastructure-summary-as-is.md) (2026-10-26), [`../go-tech-platform`](../go-tech-platform/README.md), [`../../systems/COS/COS-summary.md`](../../systems/COS/COS-summary.md), [`../../systems/VetHub/VetHub-summary.md`](../../systems/VetHub/VetHub-summary.md) (source-code analysis), the source code in `repos by system` (checked 28 Oct 2026), the Confluence pages linked in section 7 of each component document, and the Earlier Birds flow matrix ([`../../../solutions/earlier birds/Earlier birds - high-level solution v0.2.md`](<../../../solutions/earlier birds/Earlier birds - high-level solution v0.2.md>)). Items marked *inferred* are not confirmed by any source; **TBC** means no source has the value.

## Components

| # | Component | Document | Default picture | Deployment model |
|---|---|---|---|---|
| 1 | VetHub | [01-vethub.md](01-vethub.md) | Global | One shared deployment |
| 2 | COS — Claim Orchestration Service | [02-cos.md](02-cos.md) · detail: [02a-cos-flow-model.md](02a-cos-flow-model.md) (sagas and polling) | Australia | Per insurer stack |
| 3 | Claims Automation (Sophia Jr) | [03-claims-automation.md](03-claims-automation.md) | Global | One shared deployment |
| 4 | Claims API (CLAPI) | [04-clapi.md](04-clapi.md) | Australia | Per insurer stack |
| 5 | CSP Digital API (DAPI) | [05-dapi.md](05-dapi.md) | Australia | Per UPM+ instance |
| 6 | Dynamic CLAPI | [06-dynamic-clapi.md](06-dynamic-clapi.md) | Australia | Australia only |
| 7 | STP / Clawdia | [07-stp-clawdia.md](07-stp-clawdia.md) | Australia | Australia only |
| 8 | ML Environment (ClawGP) | [08-ml-environment.md](08-ml-environment.md) | Australia | Australia only |
| 9 | UPM Dynamics API | [09-upm-dynamics-api.md](09-upm-dynamics-api.md) | Australia | Per UPM+ instance |
| 10 | UPM+ (incl. UPM DB) | [10-upm.md](10-upm.md) | Australia | Per UPM+ instance |

Boomi and the Vet Partners Salesforce are external and out of scope. Shared Go Tech helper APIs (Storage, Security, Notification) appear only as dependencies.

## Environments

> **On the TODO — is "Australia Shared / Australia PetSure / NZ / Vet Partners" a fair categorisation?** Not quite. Two adjustments make it fit the deployment:
>
> 1. **"Shared" is global, not Australian.** VetHub and Claims Automation are *one deployment for every insurer*. They are physically hosted in Australia East, but they belong to no insurer. They get their own column, **Shared (global, hosted in AU)**.
> 2. **Trupanion needs its own column.** Trupanion runs on the Australian COS, CLAPI, Dynamic CLAPI and STP / Clawdia, but it has its **own DAPI, its own UPM+ instance and its own UPM Dynamics API**, and a dedicated UPM status poller in COS. Folding it into "Australia PetSure" hides those differences.
>
> Luna has no dedicated deployment anywhere, so it stays inside Australia PetSure.

The documents therefore use five environment columns:

| Environment | Includes | Notes |
|---|---|---|
| **Shared** | VetHub, Claims Automation | One deployment, Australia East, serves all insurers |
| **Australia PetSure** | PetSure AU + Luna | The full stack; also hosts the parts Trupanion shares |
| **Trupanion** | TPN | Shares the AU COS / CLAPI / Dynamic CLAPI / STP; dedicated DAPI, UPM+, UPM Dynamics API |
| **New Zealand** | PetSure NZ | Own COS, CLAPI, DAPI, UPM+ (UPM+ on Azure VMs) |
| **Vet Partners** | VP | Own COS and CLAPI only; claims go to Salesforce via Boomi |

## Interface legend (section 2)

| Kind | Written as | Meaning |
|---|---|---|
| **Data polling** | *Data polling from X* | This component reads from X on a timer (API or table) |
| **REST API** | `METHOD url` — called by *Y* | An HTTP operation this component exposes, and who calls it |
| **Event** | Event Grid topic / event type — publisher → subscriber | Asynchronous event between components |
| **Outbound REST** | → *X*: `METHOD url` | An HTTP call this component makes to another one (listed so each document stands alone) |

Internal messaging inside a component (for example the NServiceBus queues between COS services) is not listed as an interface; it appears under *Azure managed services used*.

## Cross-component summary

### Hosting by environment

| Component | Shared | Australia PetSure | Trupanion | New Zealand | Vet Partners |
|---|---|---|---|---|---|
| VetHub | App Service ×4, API Management, VM (Windows services, IIS) | *uses Shared* | *uses Shared* | *uses Shared* | *uses Shared* |
| COS | — | VM ×3 (IIS + Windows services) | *on the AU stack* (+ dedicated UPM poller) | VM ×2 | VM ×2 (*inferred*) |
| Claims Automation | Logic Apps Standard | *uses Shared* | *uses Shared* | *uses Shared* | *uses Shared* |
| CLAPI | — | VM ×2 (IIS) | *on the AU deployment* | VM (IIS) | VM (IIS, *inferred*) |
| DAPI | — | On-prem server (R/W) + VM (RO) | On-prem server (own app) | VM (IIS) | not used |
| Dynamic CLAPI | — | App Service | *on the AU deployment* | not used (see open points) | not used |
| STP / Clawdia | — | Logic Apps Std, Functions ×3, App Service | *on the AU deployment* | not used | not used |
| ML Environment | — | Azure ML managed endpoint | *on the AU deployment* | not used | not used |
| UPM Dynamics API | — | On-prem (BC service instance) | On-prem (BC service instance) | VMs (BC service instance) | not used |
| UPM+ | — | On-prem BC + SQL Always On | On-prem BC + SQL Always On | VMs + Load Balancer + SQL on VMs | not used |

### Runtime

| Component | .NET | IIS |
|---|---|---|
| VetHub | APIs .NET 10; UI Node (React 19 / Express 5); Windows services and MessageFormat.API .NET Framework 4.8 / 4.x | MessageFormat.API only — version TBC |
| COS | .NET Framework 4.8 | COS.API — version TBC |
| Claims Automation | n/a (Logic Apps Standard workflows) | n/a |
| CLAPI | .NET Framework 4.8 | version TBC |
| DAPI | .NET Framework 4.8 | version TBC |
| Dynamic CLAPI | .NET 8 | n/a (App Service) |
| STP / Clawdia | Functions .NET 8 (isolated); ReadOnly DataService TBC | n/a |
| ML Environment | n/a (ML model) | n/a |
| UPM Dynamics API / UPM+ | Business Central (version TBC) | n/a (BC server) |

**IIS and Windows Server versions are not recorded in any source.** Every IIS cell is TBC. They can be read from the Azure VM inventory (OS image of `PS-PRD-AZS-P3-1/2/3`, `NZ-PRD-AZ-P3WEB/APP`, `PS-PRD-AZ-P3WEB/APP`, `PS-PRD-AZS-CSP1`, `NZ-PRD-INT-API1`) and from the on-premises server `PS-BCS-PRD-API1`; IIS 10 ships with Windows Server 2016 and later.

## App Service migration readiness

This section checks each component against the requirements for moving from IIS on Windows VMs (or Windows services) to **Azure App Service**. The requirements come from the IIS → App Service compatibility research (28 Oct 2026). The *Resources* column links the Microsoft documentation behind each requirement. The current state is taken from the component documents in this folder and from [`../go-tech-platform`](../go-tech-platform/README.md). Anything those documents don't record is marked ❓.

### Requirements checklist

| ID | Requirement | What to check | Ready for standard App Service when… | Resources |
|---|---|---|---|---|
| **R1** | Runtime / target framework | `TargetFramework(Version)` in the project files; installed runtimes on the VM | .NET Framework 4.8 or .NET 10. .NET Framework 4.5–4.7.2 needs testing or an upgrade to 4.8. .NET 8 and .NET 9 reach **end of support on 10 Nov 2026**, so plan .NET 10 | [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) · [.NET Framework lifecycle](https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-framework) · [Migrate .NET apps to App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-asp-net-migration) |
| **R2** | Application type | Project type; whether the app is an IIS site or a Windows service | ASP.NET Web API 2, MVC, Web Forms or ASP.NET Core over HTTP(S). **Windows services, WCF net.tcp / named pipes = blocker** | [Migrate .NET apps to App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-asp-net-migration) · [Operating system functionality](https://learn.microsoft.com/en-us/azure/app-service/operating-system-functionality) |
| **R3** | IIS configuration and co-hosting | `Get-Website`, `Get-WebApplication`, `IIS:\AppPools`: pipeline mode, 32/64-bit, bindings, URL Rewrite, native modules, other sites on the same server | One app pool per web app. Each co-hosted site becomes its own web app (they can share one plan); no unsupported native modules | [Configure an App Service app](https://learn.microsoft.com/en-us/azure/app-service/configure-common) · [App Service plans](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans) · [Azure Migrate App Service assessment](https://learn.microsoft.com/en-us/azure/migrate/concepts-azure-webapps-assessment-calculation?view=migrate-classic) |
| **R4** | Machine-level Windows dependencies | GAC, COM registration, registry writes, MSI installs, native DLLs, MSMQ, Windows Event Log, GDI-based PDF or image libraries | None. Otherwise consider **Managed Instance on App Service** or Windows containers | [Operating system functionality](https://learn.microsoft.com/en-us/azure/app-service/operating-system-functionality) · [Managed Instance on App Service](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-instance) |
| **R5** | Inbound authentication | `web.config` `<authentication>`; how callers authenticate | Token, API key, basic auth or Entra ID. **Windows auth (NTLM / Kerberos) = blocker** | [Authentication and authorization](https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization) · [Configure Microsoft Entra authentication](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad) |
| **R6** | Domain identity / Integrated Security | App-pool identity; `Integrated Security=True` / `Trusted_Connection=True`; use of the `petprod.internal` domain account | No dependency on AD domain membership. App Service and Managed Instance can't join a domain | [Managed identities](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity) · [Managed Instance on App Service](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-instance) |
| **R7** | Database reachability and authentication | Target SQL server, network path, auth mode | DB reachable from App Service (public or VNet integration + DNS), using SQL auth, Entra ID or managed identity | [Connect to Azure SQL with managed identity](https://learn.microsoft.com/en-us/azure/app-service/tutorial-connect-msi-sql-database) · [Virtual network integration](https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration) |
| **R8** | File system and file shares | Local disk writes, UNC paths, file shares on the same server | No persistent local writes; files in Blob / Storage API or Azure Files. **UNC shares on other servers need redesign** | [Operating system functionality (file access)](https://learn.microsoft.com/en-us/azure/app-service/operating-system-functionality) · [Mount Azure Storage as a local share](https://learn.microsoft.com/en-us/azure/app-service/configure-connect-to-azure-storage) |
| **R9** | Network: inbound protocols and private outbound | Inbound protocols; private targets (on-prem over ExpressRoute, landing-zone VNets, `internal.petsure.com.au` DNS); IP allow-lists | HTTP(S) inbound only; private targets reachable through VNet integration and the hub; allow-lists updated for App Service outbound IPs | [Networking features](https://learn.microsoft.com/en-us/azure/app-service/networking-features) · [Virtual network integration](https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration) · [Private endpoints](https://learn.microsoft.com/en-us/azure/app-service/overview-private-endpoint) · [Inbound / outbound IP addresses](https://learn.microsoft.com/en-us/azure/app-service/overview-inbound-outbound-ips) |
| **R10** | State and scale-out | InProc session, static caches, singletons, timers inside the web app | Stateless, or state in Redis / SQL. Safe to run on more than one instance and to restart at any time | [Well-Architected: App Service](https://learn.microsoft.com/en-us/azure/well-architected/service-guides/app-service-web-apps) · [Caching guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching) · [Configure an App Service app (ARR affinity, Always On)](https://learn.microsoft.com/en-us/azure/app-service/configure-common) |
| **R11** | Background and scheduled processing | Windows services, scheduled tasks, long-running work, continuous pollers | None inside the web app. Otherwise move it to WebJobs (needs Always On; not supported on Managed Instance), Azure Functions or containers | [WebJobs overview](https://learn.microsoft.com/en-us/azure/app-service/overview-webjobs) · [Run background tasks with WebJobs](https://learn.microsoft.com/en-us/azure/app-service/webjobs-create) · [Well-Architected: background jobs](https://learn.microsoft.com/en-us/azure/well-architected/reliability/background-jobs) |
| **R12** | Secrets, certificates and operations | Secret injection, TLS bindings and custom domains, monitoring, deployment pipeline | Key Vault references in app settings; App Service certificates or custom domains; App Insights instead of the Event Log and PRTG; deployment with `azure/webapps-deploy` instead of PowerShell remoting through the self-hosted runner | [Key Vault references](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references) · [Install a TLS/SSL certificate](https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate) · [Monitor App Service](https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service) · [Deploy with GitHub Actions](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions) |

### Current state by component

Legend: ✅ meets the requirement · ⚠️ needs remediation or a decision · ❌ blocker for standard App Service · ❓ not documented (to check) · — not applicable

Verified on 28 Oct 2026 against the source code in `repos by system` and against Confluence. The [verification results](#verification-against-source-code-and-confluence-28-oct-2026) list what changed and where each value came from.

| Component (deployable) | Current hosting | R1 Runtime | R2 App type | R3 IIS / co-hosting | R4 Windows deps | R5 Inbound auth | R6 Domain / Integrated Security | R7 Database | R8 Files / shares | R9 Network | R10 State / scale-out | R11 Background | R12 Secrets / certs / ops | **Readiness** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **VetHub** — APIs + UI | App Service (since 2026_R4), plan `ps-syd-prd-vethub-asp` (P1v3, Windows, zone-redundant). Old IIS copies on `PS-PRD-AZS-P3-1/2`, `NZ-PRD-AZ-P3WEB` and `PS-PRD-AZ-P3WEB` are waiting for decommission | ✅ .NET 10 (`net10.0` in every project); UI Node ≥ 20 | ✅ ASP.NET Core; UI on Express (iisnode) | ✅ one web app each, shared plan | ✅ (Vet.Portal.API uses `System.Drawing.Common`, so it needs a Windows plan) | ✅ APIM `validate-jwt` / Entra ID; API key header; Vet.Portal.API validates through the Security API | ✅ | ✅ Azure SQL `VetHub_PROD` (Key Vault refs) via VNet integration | ✅ Storage API | ✅ VNet integration + hub | ✅ Redis HybridCache (VetHub.API); zone-redundant | — | ✅ Key Vault refs, App Insights, staging slot + swap | **Already on App Service** |
| **VetHub** — MessageFormat.API | IIS on `PS-PRD-AZS-P3-1/2`, `NZ-PRD-AZ-P3WEB`, `PS-PRD-AZ-P3WEB` | ✅ .NET Fx 4.8 (`httpRuntime` 4.6.1) | ✅ ASP.NET Web API 5.2 | ✅ minimal `Web.config`; co-hosted | ⚠️ `System.Drawing` (GDI+), OK on a Windows plan | ⚠️ none: anonymous endpoints, CORS `*` (security gap) | ✅ no connection strings | ✅ no DB | ✅ reads `Images\` only (path-traversal risk) | ✅ inbound HTTPS only; no outbound calls | ✅ stateless | ✅ none | ⚠️ PS-remoting deploy; no logging at all | **Out of scope: decommission planned** (2026_R4 Part 3 cleanup / R5) |
| **VetHub** — Windows services | Windows services on `PS-PRD-AZS-P3-3` (confirmed) | ✅ .NET Fx 4.8 (shared `VetHub.Core.DataModel` DLL is 4.6.1) | ❌ NServiceBus 8 `UseWindowsService()` and Topshelf services | — | ❌ MSMQ log appender in all six services; PDFsharp-MigraDoc-GDI, iTextSharp 5 / itext7; binary-only `PetSure.LogManager.dll`, `Azure.Region.Configuration.dll` (VM IMDS) | — | ✅ no Integrated Security; services run as LocalSystem | ✅ Azure SQL `VetHub_PROD`, `NSBusPersistenceDB`; StuckClaims also reads the COS AU and NZ DBs | ⚠️ local writes: fixed `test.pdf` next to the exe (Attachments), `C:\ApplicationLogs\…` | ⚠️ Service Bus (SYD + MEL); legacy `WindowsAzure.ServiceBus` SDK in ProcessConversations; SMTP `mail-out.petsure.com.au:25` without TLS | ⚠️ pollers (5 s / 60 s / 90 s) have no row locking → single instance only | ❌ continuous background work | ⚠️ PS-remoting deploy; no App Insights (logs go MSMQ → LogManager.Handler); PRTG | **Not a web app**: re-host (WebJobs / Functions / containers) or keep on VM; replace MSMQ logging first |
| **COS** — COS.API | IIS: AU `PS-PRD-AZS-P3-1/2`; NZ `NZ-PRD-AZ-P3WEB`; VP `PS-PRD-AZ-P3WEB` (confirmed) | ✅ .NET Fx 4.8 (some libraries 4.6.1; `COS.EFCore.DataModel` net6.0) | ✅ ASP.NET Web API 2 + OWIN | ⚠️ simple `Web.config`, but co-hosted with CLAPI and helper APIs; AU on 2 servers → 1 web app, 2 instances | ❌ MSMQ log appender (`PetSure.LogManager`, System.Messaging) | ✅ `APIKey` + `clientId` header filter against the Security API (can be switched off in config); leftover OWIN `/Token` with `AllowInsecureHttp` | ✅ SQL auth (only a LocalDB template uses Integrated Security) | ✅ Azure SQL `COS_PROD*`, `NSBusPersistence` (SQL auth, Key Vault tokens) | ⚠️ NServiceBus log files in the site root; `LogsPath` `C:\ApplicationLogs\COSAPI\` | ⚠️ VNet integration for Service Bus / Event Grid / internal APIs; DNS names kept for callers | ✅ no session or cache | ⚠️ NServiceBus endpoint is **not send-only**: `EnableInstallers()` and a receive pump on `{Env}_COSAPI` in the web process | ⚠️ token replacement in `Web.config` / `log4net.config` → Key Vault refs; PS-remoting deploy; App Insights config empty; dev credentials committed | **Ready after remediation**: MSMQ logging, send-only endpoint, log paths. Matches the agreed long-term option (.NET 10 estimate 18–22 days) |
| **COS** — Windows services | Windows services: AU `PS-PRD-AZS-P3-3`; NZ `NZ-PRD-AZ-P3APP`; VP `PS-PRD-AZ-P3APP` (confirmed) | ✅ .NET Fx 4.8 for all deployed Exes (several libraries 4.6.1) | ❌ NServiceBus `UseWindowsService`; Topshelf pollers | — | ❌ MSMQ log appender. iText 7 is managed code (OK) but needs a licence file at `C:\Applications\Licenses\itextkey.xml` | — | ✅ SQL auth; services run as LocalSystem | ✅ Azure SQL `COS_PROD*`, `NSBusPersistence` | ⚠️ temp files in the working folder (ConvertPDF), `ConsolidatedFiles\` (Consolidate), local log paths | ⚠️ Service Bus, VetHub, CLAPI, Dynamic CLAPI, Storage / Security / Notification APIs, CATCH | ⚠️ UPM poller (30 s) and VetHub pollers (per insurer, static rate-limit state) → single instance | ❌ continuous background work | ⚠️ PS-remoting deploy, Key Vault + replace-tokens; PRTG service sensors | **Not a web app**: re-host (WebJobs / Functions / containers) or keep on VM |
| **Claims Automation** — Logic App | Logic Apps Standard `ps-prod-logic-claimsauto` (RG `ps-prod-rg-claimsauto`) | ✅ (managed runtime) | ✅ workflows | — | ✅ | ✅ Event Grid subscription with service-tag restriction; MSI to downstream | ✅ | ✅ Azure SQL `PSPRODClaimsAutoDB` (Key Vault) | ✅ | ✅ VNet integration | ✅ | ✅ event-driven | ✅ Terraform; workspace-based App Insights | **Already PaaS** |
| **Claims Automation** — Function Apps | Azure Functions `ps-prod-fapp-caassessment`, `-cabusinessrules`, `-cadb` (Windows) | ⚠️ **.NET 8 isolated, end of support 10 Nov 2026** (upgrade "TBC" in 2026_R5) | ✅ Functions v4 | — | ❓ | ⚠️ most functions `AuthorizationLevel.Anonymous`; Easy Auth v2 on CA.UI | ✅ | ✅ Azure SQL via Key Vault `CA-DB-CONNECTION` | ❓ | ❓ | ✅ | ✅ triggered | ⚠️ shared legacy App Insights `ps-prd-insight-p3`; Terraform | **Already PaaS**: runtime upgrade due |
| **CLAPI** | IIS: AU `PS-PRD-AZS-P3-1/2`; NZ `NZ-PRD-AZ-P3WEB`; VP `PS-PRD-AZ-P3WEB` (confirmed) | ✅ .NET Fx 4.8 | ✅ ASP.NET Web API 2 (OWIN) | ⚠️ simple `Web.config`; co-hosted with COS.API and helper APIs | ❌ MSMQ log appender (SumoLogic appender in the Release config) | ⚠️ **no inbound authentication is enforced**: OWIN bearer middleware without `[Authorize]`; only an `InsuranceProviderId` header allow-list. The Security API token is *outbound* (to DAPI) | ✅ no connection strings | ✅ no DB | ✅ Storage API | ⚠️ needs the on-prem AU / TPN DAPI over hub + ExpressRoute; NZ DAPI in the landing zone; Boomi allow-list ❓ | ✅ per-instance token cache; Polly per insurer | ✅ none | ⚠️ PROD DAPI / Boomi passwords committed in `appsettings.*.json` → Key Vault; appsettings swap at deploy; DAPI auth payload logged | **Ready after remediation**: MSMQ logging, inbound auth, secrets (.NET 10 estimate 18–22 days). OpsLevel still says App Service |
| **DAPI** — AU R/W + Trupanion | IIS on on-prem `PS-BCS-PRD-API1` (two apps; the TPN deployment is not defined in the repo) | ✅ .NET Fx 4.8 | ✅ Web API 2 / MVC 5 (+ two Web Forms pages) | ⚠️ two apps → two web apps; Elmah modules; `executionTimeout` 3600 s and ~2 GB uploads vs the 230 s App Service limit | ❌ MSMQ log appender; native `mpr.dll` `WNetAddConnection2` to mount shares | ✅ custom token checked against `DS_Tokens` (no Windows auth) | ✅ SQL auth; SMB with explicit credentials | ⚠️ EF6 direct writes to on-prem `PETSURE_PRD_UPM` / `TRUPANION_PRD_UPM` `DS_*`; moving to Azure puts every write across ExpressRoute | ❌ writes claim files to the share path stored in `DS_ClaimDocuments` (`auapidocuments`, `PRD_TP_UPMClaimDoc`), which UPM+ reads | ⚠️ SQL + SMB to on-prem; the network path reverses (today Azure → on-prem) | ✅ stateless (tokens in DB) | ✅ none | ⚠️ PS-remoting deploy; PROD SMB credentials read from a non-prod Key Vault; hard-coded encryption key; end-of-life | **Keep on current hosting**: end-of-life; MSMQ, `mpr.dll` and the file share need redesign first |
| **DAPI** — AU RO | IIS on Azure VM `PS-PRD-AZS-CSP1` | ✅ .NET Fx 4.8 | ✅ Web API (same build as R/W) | ⚠️ same `Web.config` as R/W | ❌ MSMQ log appender; `mpr.dll` code | ✅ custom DB token | ✅ SQL auth | ⚠️ reads the on-prem UPM AU replica, **but writes tokens to the primary UPM DB** | ⚠️ deployed with share path and SMB credentials (download / upload endpoints present) | ⚠️ VNet integration via the hub | ✅ stateless | ✅ none | ⚠️ end-of-life | **Retire rather than migrate**: CSP "Always On" work is moving its claims APIs off RO DAPI |
| **DAPI** — NZ | IIS on Azure VM `NZ-PRD-INT-API1` (`NZMaster` branch, last commit May 2023) | ⚠️ **.NET Fx 4.5.1**: master's upgrade to 4.8 never reached NZ | ✅ Web API (R/W + RO on one server) | ⚠️ two flavours on one server | ❌ `mpr.dll` share mounting (no MSMQ on this branch) | ✅ custom DB token | ❌ RO connection uses `integrated security=True` | ✅ `PETSURE_PRD_UPM_NZ` on SQL VMs in the landing zone (VNet integration) | ❌ claim documents on the UNC share `\\nz-prd-bcs-app3\NZ_UPM-Store_1` | ⚠️ VNet integration into `sub-prd-digital-nz` | ✅ stateless | ✅ none | ⚠️ no CI/CD (manual publish profiles); end-of-life | **Keep on VM**: 4.5.1, Integrated Security and a UNC share |
| **Dynamic CLAPI** | App Service `ps-syd-prd-claw-dynamicclapi-app` | ⚠️ **.NET 8, end of support 10 Nov 2026** → .NET 10 planned for 2026_R5 (10 Dec 2026) | ✅ ASP.NET Core | ✅ | ✅ | ✅ Basic + Entra JWT (managed-identity policy) | ✅ | ✅ no DB | ✅ | ✅ private endpoint, VNet integration + hub to on-prem | ✅ | ✅ | ✅ Key Vault; `azure/webapps-deploy` (legacy `cicd.yml` still on .NET 6) | **Already on App Service**: runtime upgrade due |
| **STP / Clawdia** | Logic Apps Std, Functions ×3, App Service (ReadOnly DataService) | ⚠️ Functions **.NET 8 isolated**; ReadOnly DataService (`DataService.UPM`) **.NET 8** on Linux App Service, with one net6.0 library. Upgrades planned for 2026_R5 | ✅ | ✅ | ✅ | ⚠️ functions are anonymous (MSI to downstream); DataService.UPM accepts **Basic auth only** | ✅ | ✅ Azure SQL; DataService.UPM reads the UPM RO replica and DWH, and can switch to the primary UPM | ✅ | ✅ private endpoints + VNet integration | ✅ | ✅ event-driven | ⚠️ classic App Insights (no workspace, instrumentation key) | **Already PaaS**: runtime upgrade due |
| **ML Environment** | Azure ML managed endpoint (Python 3.10; Ubuntu 18.04 base image) | — | — | — | — | — | — | — | — | — | — | — | — | **Not applicable** (base image out of support; separate item) |
| **UPM Dynamics API / UPM+** | Business Central (on-prem AU / TPN; Azure VMs NZ) | — | — | — | — | — | — | — | — | — | — | — | — | **Out of scope**: not IIS; a BC platform decision |
| **Go Tech helper APIs** (Storage.API, Security.API, Security.AAD.API, Notification.API, P3.ITTools.Api) | IIS on `PS-PRD-AZS-P3-1/2`, `NZ-PRD-AZ-P3WEB`, `PS-PRD-AZ-P3WEB` (P3.ITTools AU only) | ✅ .NET Fx 4.8 (all five) | ✅ ASP.NET Web API 2 | ⚠️ co-hosted | ❌ MSMQ log appender | ⚠️ API key + `clientId` (Storage, Notification); Entra bearer (Security.AAD, P3.ITTools); Security.API has no auth on itself | ❓ | ❓ (Notification.API has a DB connection) | ⚠️ Notification.API writes logs to local paths | ❓ | ⚠️ static `HttpClient` with shared headers (Storage, Notification): thread-safety | ✅ none in the APIs | ⚠️ PS-remoting deploy; token replacement; no IaC | **Upgrade with COS.API / CLAPI**: .NET 10 estimates 7–14 days each. Security.API is "candidate for upgrade or removal" |
| **Go Tech helper services** (Notification.Service, PetSure.Logger LogManager.Handler) | Windows services on `PS-PRD-AZS-P3-3` / `NZ-PRD-AZ-P3APP` / `PS-PRD-AZ-P3APP`; LogManager.Handler on every Go Tech server | ✅ .NET Fx 4.8 | ❌ Windows services | — | ❌ LogManager.Handler *is* the MSMQ consumer (→ SQL / App Insights) | — | ❓ | ❓ | ❓ | ❓ | ⚠️ | ❌ | ⚠️ no IaC | **Not a web app**: LogManager.Handler is retired once apps log straight to App Insights |

### What the table says

- **MSMQ logging is the first job for every legacy app.** Every Go Tech PROD server (AU `P3-1/2/3`, NZ and VP `P3WEB` / `P3APP`) runs the log4net MSMQ appender into `.\PRIVATE$\TransactionMessageLog`, which LogManager.Handler forwards. This covers COS.API, CLAPI, the helper APIs, the COS and VetHub services and DAPI. App Service has no MSMQ (R4), so each app must log straight to App Insights before it can move. The Deployments Summary already plans to retire LogManager.Handler "after log modernisation".
- **The IIS sites are still the easy part, with a short fix list.** COS.API, CLAPI and the helper APIs are .NET Framework 4.8 Web APIs with simple `Web.config` files, no Windows auth and SQL authentication. Before they move:
  - Replace the MSMQ logging.
  - Make COS.API's NServiceBus endpoint send-only.
  - Move log and temp paths off the local disk.
  - Add inbound authentication to CLAPI (a security gap more than a platform blocker).
  - Move CLAPI's committed passwords to Key Vault.
- **The Windows services are the real constraint, and the code makes it firmer.** `PS-PRD-AZS-P3-3` and the NZ / VP `P3APP` servers run NServiceBus and Topshelf services that use MSMQ, write local files, run as LocalSystem and poll without locks (R2, R4, R8, R10, R11). ProcessConversations still uses the legacy `WindowsAzure.ServiceBus` SDK; Microsoft retired it on 30 Sep 2026 (to confirm), so this is a risk whatever the hosting.
- **The helper APIs are now documented** (Confluence technical assessments, Mar 2026). They look like COS.API: .NET Fx 4.8, MSMQ logging, PS-remoting deploys. The IIS servers can only be retired once they have moved too.
- **MessageFormat.API drops out.** It is in the 2026_R4 Part 3 decommission list and is not upgraded in the IIS estimates.
- **DAPI should stay where it is, and it has more blockers than documented.** On top of the file shares: MSMQ (AU), native `mpr.dll` share mounting (AU, NZ), NZ on .NET Fx 4.5.1 with Integrated Security, and AU RO writing to the primary UPM DB.
- **The .NET 8 deadline will be missed by a month.** Dynamic CLAPI, the STP / Clawdia functions, DataService.UPM and the Claims Automation Function Apps (TBC) are on .NET 8, which reaches end of support on 10 Nov 2026. Their .NET 10 upgrade is scheduled for 2026_R5, on 10 Dec 2026.

### Verification against source code and Confluence (28 Oct 2026)

**Method:** each R1–R12 cell was checked against the repos in `repos by system` (project files, `Web.config` / `App.config`, `log4net.config`, auth handlers, deploy workflows, Terraform / Bicep) and against Confluence. On Confluence the main sources were the per-repo **Technical Assessments** (Mar 2026), the [GOTech Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734), the [LogManager.Handler & Log4Net Configuration Audit](https://petsure.atlassian.net/wiki/spaces/P3/pages/2164260872), [Estimates for IIS Upgrades](https://petsure.atlassian.net/wiki/spaces/P3/pages/1629913104) and the [2026_R4 PROD Runsheet (Part 3 – Cleanup)](https://petsure.atlassian.net/wiki/spaces/P3/pages/2238513154). Component-specific pages are linked in section 7 of each component document. Secret values found in code or on Confluence are not reproduced.

| Component | Result | What changed (was → now) | Evidence |
|---|---|---|---|
| VetHub APIs + UI | Confirmed | R3 shared plan confirmed: P1v3, Windows, zone-redundant, Always On; legacy IIS copies still to decommission | `*/*.csproj` (`net10.0`), `apim-vethub-api/Infra/templates/ApimPolicy_VetHub.xml`, `.github/workflows/alz-reusable-deploy.yml`; [VetHub in Azure Landing Zone (Prod)](https://petsure.atlassian.net/wiki/spaces/P3/pages/2021130259), [Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734) |
| MessageFormat.API | Changed | R3 ❓→✅; R4 ❓→⚠️ System.Drawing; R5 ❓→⚠️ no auth; R6 ❓→✅; hosting also on NZ / VP web servers; readiness "Ready" → **decommission** | `MessageFormat.API/Web.config`, `Controllers/VoiceController.cs`, `Helpers/ImageHelper.cs`; [MessageFormat.API – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1735327757), [R4 Part 3 runsheet](https://petsure.atlassian.net/wiki/spaces/P3/pages/2238513154) |
| VetHub Windows services | Changed | Host P3-3 *inferred* → confirmed; R4 ❓→❌ MSMQ + GDI PDF; R6 ❓→✅; R8 ✅→⚠️ local files; R9 SMTP filled + legacy Service Bus SDK; R12 App Insights not used | `*/log4net.config`, `VetHub.Service.Infrastructure/PdfConverter.cs`, `VetHub.Alert.StuckClaims/App.config`, `*/Program.cs`, `ConfigureService.cs`; [VetHub.Service – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728708610), [LogManager audit](https://petsure.atlassian.net/wiki/spaces/P3/pages/2164260872) |
| COS.API | Changed | R4 ❓→❌ MSMQ; R5 ❓→✅ API key; R6 ❓→✅; R8 ✅→⚠️ local logs; R10 ❓→✅; R11 ✅ "send-only" → ⚠️ full endpoint; VP server *inferred* → confirmed | `COS.API/COS.API/log4net.config`, `Handlers/AuthenticationFilter.cs`, `COS.API.UPMDataAdapter/Services/NServiceBusProvider.cs`, `.github/workflows/reusable-deploy.yml`; [COS.API – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1697939528) |
| COS Windows services | Changed | R4 ❓→❌ MSMQ; PDF = iText 7 (managed) + licence file; R6 ❓→✅; R8 ✅→⚠️ temp files; VP servers confirmed | `COS.AddAttachments.Service.Consolidate/**/DocumentMerger.cs`, `…ConvertPDF.Helper/TextToPdfConverter.cs`, `COS.Poll.Services/Services/*/ConfigureService.cs`; [COS.Services – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1698201673), [Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734) |
| Claims Automation | Changed | Logic App name TBC → `ps-prod-logic-claimsauto`; **new row** for 3 × .NET 8 Function Apps | `Claims Automation/ClaimsAutomationAzureResourceGroup/Infra/envs/prod.tfvars`, `ClaimsAutomationFunctions/Infra/main.tf`; [ClaimsAutomationFunctions – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728872449) |
| CLAPI | Changed | R4 ❓→❌ MSMQ; **R5 ✅→⚠️**: the table said "token from the Security API", but that token is outbound to DAPI and no inbound check is enforced; R6 ❓→✅ | `ClaimsAPI/App_Start/WebApiConfig.cs` (no `AuthorizeAttribute`), `Claims.API.Infrastructure/Behaviours/AuthorisationHandler.cs`, `Handlers/AuthenticationHandler.cs`, `ClaimsAPI/log4net.config`; [ClaimsAPI – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1711505510) |
| DAPI AU R/W + TPN | Changed | R3 Elmah / long timeouts; R4 ❓→❌ MSMQ + `mpr.dll`; R5 ❓→✅; R6 ❓→✅ SQL auth; R10 ❓→✅; TPN deployment not in the repo | `CSP Gen 3/CSP.Au.DigitalApi/PetsureAPI/Web.config`, `Web.Prod.config`, `Class/NetworkAccess.cs`, `Controllers/ClaimsController.cs`, `Filters/BasicAuthenticationAttribute.cs`; [Upgrading DAPI .Net Framework 4.8](https://petsure.atlassian.net/wiki/spaces/DIGITAL/pages/913080393) |
| DAPI AU RO | Changed | R4 ❓→❌; R5/R6 ❓→✅; **R7 also writes tokens to the primary UPM DB**; R8 ✅→⚠️; readiness → retire | `Web.Prod_RO.config`, `Class/Token.cs`, `.github/workflows/components-deploy.yml`; [CSP Always On – Claims APIs to be migrated from RO DAPI](https://petsure.atlassian.net/wiki/spaces/DIGITAL/pages/1032355843) |
| DAPI NZ | Changed | **R1 ✅ 4.8 → ⚠️ 4.5.1**; R4 ❓→❌ `mpr.dll`; R6 ❓→❌ Integrated Security; R12 no CI/CD | `CSP.Au.DigitalApi` branch `origin/NZMaster` (`PetsureAPI.csproj`, `Web.Prod_RO.config`) |
| Dynamic CLAPI | Confirmed | .NET 10 upgrade scheduled for 2026_R5 (10 Dec 2026) | `STP/DynamicCLAPI/DynamicClaimsAPI/DynamicClaimsAPI.csproj`, `Program.cs`; [DynamicCLAPI – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1726971950), [Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734) |
| STP / Clawdia | Changed | ReadOnly DataService runtime ❓ → .NET 8 on Linux (+ one net6.0 library); R5 DataService.UPM is Basic-only; R7 can switch to the primary UPM | `STP/DataService.UPM/**/*.csproj`, `DataService.UPM.API/Startup.cs`, `DataService.UPM.Common/Constants.cs`, `STP/StraightThroughProcessFunctions/InfrastructureSetup/modules/createappinsight.bicep`; [DataService.UPM – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1735327745) |
| ML Environment | Confirmed | Python 3.10; Ubuntu 18.04 base image noted | `STP/ClawGP/.github/workflows/deploy.yml`; [ClawGP – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1735098377) |
| Helper APIs | Filled in | Row was all ❓; R1, R2, R4, R5, R12 now from the technical assessments; helper services added as a row | [Storage.API – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728905229), [Security.API – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728774161), [Security.AAD.API – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728905217), [Notification.API – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1711308893), [P3.ITTools.Api – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728806921), [PetSure.Logger – TA](https://petsure.atlassian.net/wiki/spaces/P3/pages/1735360513) |

**Security findings found along the way** (not migration blockers, but worth tickets):

- CLAPI and MessageFormat.API accept unauthenticated calls. MessageFormat.API's `Images` endpoint takes a caller-supplied file name.
- Production DAPI / Boomi credentials are committed in the CLAPI repo.
- DAPI reads PROD SMB credentials from a non-prod Key Vault.
- The VetHub StuckClaims e-mails go over SMTP without TLS.

**Note on the Confluence technical assessments:** they predate 2026_R4. The VetHub.API assessment still describes the .NET 4.8 / IIS version.

### Inventory still needed

Run the IIS / runtime inventory from the research on these servers: `PS-PRD-AZS-P3-1`, `PS-PRD-AZS-P3-2`, `PS-PRD-AZS-P3-3`, `NZ-PRD-AZ-P3WEB`, `NZ-PRD-AZ-P3APP`, `PS-PRD-AZ-P3WEB`, `PS-PRD-AZ-P3APP`, `PS-PRD-AZS-CSP1`, `NZ-PRD-INT-API1` and `PS-BCS-PRD-API1`. It covers sites, applications, app pools, installed runtimes, `web.config` authentication, connection-string auth mode, and GAC / COM / scheduled tasks.

The code check settles R1–R6 for the repos. The inventory is still needed for what code can't show:

- the actual site and app-pool layout per server, and IIS / Windows Server versions
- certificates and bindings
- which MSMQ queues exist and who consumes them
- where the iText licence file sits
- the real DAPI share paths and Boomi IP allow-lists

Microsoft's App Service migration assessment can produce a first pass. Keep secrets out of the inventory.

## Main open points across components

- **IIS / Windows Server versions** — not documented (see above).
- **Dynamic CLAPI URL conflict** — COS code calls `https://api-dynamicclaims-prod.petsure.com.au` (`PUT /api/Claims/Lodge/{claimId}`); the infrastructure summary names `ps-syd-prod-dynamicclapi-api.petsure.com.au`. Possibly two DNS names for the same App Service — confirm.
- **HTTP methods missing** for the DAPI operations, the UPM Dynamics API operations and some Dynamic CLAPI operations (marked TBC).
- **Inferred placements** — VetHub Windows services on `PS-PRD-AZS-P3-3`; the Vet Partners COS / CLAPI servers; the NZ COS database name `COS_PROD_NZ`.
- **Names TBC** — Claims Automation Logic App; UPM NZ BC API service instance.
