# Go Tech Platform — Component architecture (PROD, as-is)

This folder is the **base for the component architecture** of the claims path. It takes the per-insurer documents in [`../go-tech-platform`](../go-tech-platform/README.md) and turns them around: **one document per component**, each with the same five sections.

| Section | Content |
|---|---|
| 1. Deployment picture | The existing ArchiMate export. The **Australia** picture is the default; the pictures of the other environments are linked, not embedded. Global pictures are used for the shared components. |
| 2. Interfaces for claim submission | Every interface the component has with another component on the claim-submission path (see the legend below). |
| 3. Databases | The database(s) the component **writes** to, and any it only **reads**. |
| 4. Azure managed services used | Services the component *uses* (not the ones that host it): which service, which resource, and how. |
| 5. Current technology by environment | For each environment: .NET version, IIS version, and the Azure managed service(s) hosting the component. |

This README also holds the [App Service migration readiness](#app-service-migration-readiness) assessment across all components.

**Sources:** [`../infrastructure-summary-as-is.md`](../infrastructure-summary-as-is.md) (2026-10-26), [`../go-tech-platform`](../go-tech-platform/README.md), [`../../systems/COS/COS-summary.md`](../../systems/COS/COS-summary.md), [`../../systems/VetHub/VetHub-summary.md`](../../systems/VetHub/VetHub-summary.md) (source-code analysis) and the Earlier Birds flow matrix ([`../../../solutions/earlier birds/Earlier birds - high-level solution v0.2.md`](<../../../solutions/earlier birds/Earlier birds - high-level solution v0.2.md>)). Items marked *inferred* are not confirmed by any source; **TBC** means no source has the value.

## Components

| # | Component | Document | Default picture | Deployment model |
|---|---|---|---|---|
| 1 | VetHub | [01-vethub.md](01-vethub.md) | Global | One shared deployment |
| 2 | COS — Claim Orchestration Service | [02-cos.md](02-cos.md) | Australia | Per insurer stack |
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

This section checks each component against the requirements for moving from IIS on Windows VMs (or Windows services) to **Azure App Service**. The requirements come from the IIS → App Service compatibility research (28 Oct 2026). The current state is taken from the component documents in this folder and from [`../go-tech-platform`](../go-tech-platform/README.md). Anything those documents don't record is marked ❓.

### Requirements checklist

| ID | Requirement | What to check | Ready for standard App Service when… |
|---|---|---|---|
| **R1** | Runtime / target framework | `TargetFramework(Version)` in the project files; installed runtimes on the VM | .NET Framework 4.8 or .NET 10. .NET Framework 4.5–4.7.2 needs testing or an upgrade to 4.8. .NET 8 and .NET 9 reach **end of support on 10 Nov 2026**, so plan .NET 10 |
| **R2** | Application type | Project type; whether the app is an IIS site or a Windows service | ASP.NET Web API 2, MVC, Web Forms or ASP.NET Core over HTTP(S). **Windows services, WCF net.tcp / named pipes = blocker** |
| **R3** | IIS configuration and co-hosting | `Get-Website`, `Get-WebApplication`, `IIS:\AppPools`: pipeline mode, 32/64-bit, bindings, URL Rewrite, native modules, other sites on the same server | One app pool per web app. Each co-hosted site becomes its own web app (they can share one plan); no unsupported native modules |
| **R4** | Machine-level Windows dependencies | GAC, COM registration, registry writes, MSI installs, native DLLs, MSMQ, Windows Event Log, GDI-based PDF or image libraries | None. Otherwise consider **Managed Instance on App Service** or Windows containers |
| **R5** | Inbound authentication | `web.config` `<authentication>`; how callers authenticate | Token, API key, basic auth or Entra ID. **Windows auth (NTLM / Kerberos) = blocker** |
| **R6** | Domain identity / Integrated Security | App-pool identity; `Integrated Security=True` / `Trusted_Connection=True`; use of the `petprod.internal` domain account | No dependency on AD domain membership. App Service and Managed Instance can't join a domain |
| **R7** | Database reachability and authentication | Target SQL server, network path, auth mode | DB reachable from App Service (public or VNet integration + DNS), using SQL auth, Entra ID or managed identity |
| **R8** | File system and file shares | Local disk writes, UNC paths, file shares on the same server | No persistent local writes; files in Blob / Storage API or Azure Files. **UNC shares on other servers need redesign** |
| **R9** | Network: inbound protocols and private outbound | Inbound protocols; private targets (on-prem over ExpressRoute, landing-zone VNets, `internal.petsure.com.au` DNS); IP allow-lists | HTTP(S) inbound only; private targets reachable through VNet integration and the hub; allow-lists updated for App Service outbound IPs |
| **R10** | State and scale-out | InProc session, static caches, singletons, timers inside the web app | Stateless, or state in Redis / SQL. Safe to run on more than one instance and to restart at any time |
| **R11** | Background and scheduled processing | Windows services, scheduled tasks, long-running work, continuous pollers | None inside the web app. Otherwise move it to WebJobs (needs Always On; not supported on Managed Instance), Azure Functions or containers |
| **R12** | Secrets, certificates and operations | Secret injection, TLS bindings and custom domains, monitoring, deployment pipeline | Key Vault references in app settings; App Service certificates or custom domains; App Insights instead of the Event Log and PRTG; deployment with `azure/webapps-deploy` instead of PowerShell remoting through the self-hosted runner |

### Current state by component

Legend: ✅ meets the requirement · ⚠️ needs remediation or a decision · ❌ blocker for standard App Service · ❓ not documented (to check) · — not applicable

| Component (deployable) | Current hosting | R1 Runtime | R2 App type | R3 IIS / co-hosting | R4 Windows deps | R5 Inbound auth | R6 Domain / Integrated Security | R7 Database | R8 Files / shares | R9 Network | R10 State / scale-out | R11 Background | R12 Secrets / certs / ops | **Readiness** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **VetHub** — APIs + UI | App Service (since 2026_R4) | ✅ .NET 10; UI Node | ✅ ASP.NET Core | ✅ one web app each, shared plan | ✅ | ✅ APIM JWT / Entra ID, header credentials | ✅ | ✅ Azure SQL `VetHub_PROD` via VNet integration | ✅ Storage API | ✅ VNet integration + hub | ✅ Redis HybridCache; zone-redundant | — | ✅ Key Vault refs, App Insights, staging slot | **Already on App Service** |
| **VetHub** — MessageFormat.API | IIS on `PS-PRD-AZS-P3-1/2` | ✅ .NET Fx 4.8 | ✅ ASP.NET Web API | ⚠️ co-hosted with COS.API, CLAPI and helper APIs; IIS settings ❓ | ❓ | ❓ (called by Twilio) | ❓ | ✅ no DB | ✅ none documented | ✅ public HTTPS `api-messageformat-prod.petsure.com.au` | ✅ stateless (*inferred*) | ✅ none | ⚠️ custom domain + cert; legacy deployment | **Ready** (after inventory) |
| **VetHub** — Windows services | Windows services on `PS-PRD-AZS-P3-3` (*inferred*) | ✅ .NET Fx 4.x / 4.8 | ❌ NServiceBus Windows services and timer pollers | — | ❓ PDF generation; MSMQ log queue (VetHub system summary) | — | ❓ | ✅ Azure SQL `VetHub_PROD`; also reads `COS_PROD` / COS NZ DB | ✅ Storage API | ⚠️ Service Bus, SQL and internal APIs from Azure; SMTP relay ❓ | ⚠️ pollers (5 s / 60 s / 90 s) must not run twice when scaled out | ❌ continuous background work | ⚠️ PRTG service sensors; App Insights `ps-prd-insight-p3` | **Not a web app** — re-host (WebJobs / Functions / containers) or keep on VM |
| **COS** — COS.API | IIS: AU `PS-PRD-AZS-P3-1/2`; NZ `NZ-PRD-AZ-P3WEB`; VP `PS-PRD-AZ-P3WEB` | ✅ .NET Fx 4.8 | ✅ ASP.NET Web API 2 | ⚠️ co-hosted with CLAPI and helper APIs; AU runs on 2 servers → 1 web app scaled to 2 instances | ❓ | ❓ | ❓ | ✅ Azure SQL `COS_PROD*`, `NSBusPersistence` | ✅ Storage API | ⚠️ VNet integration for Service Bus / Event Grid / internal APIs; DNS names kept for callers | ⚠️ already on 2 servers (AU), but session / cache use ❓ | ✅ none (send-only to Service Bus) | ⚠️ deploy-time token replacement in `Web.config` → Key Vault refs; PRTG; certs | **Ready after remediation** — matches the agreed long-term option |
| **COS** — Windows services | Windows services: AU `PS-PRD-AZS-P3-3`; NZ `NZ-PRD-AZ-P3APP`; VP `PS-PRD-AZ-P3APP` | ✅ .NET Fx 4.8 | ❌ NServiceBus sagas, workers and timer pollers | — | ❓ PDF conversion / merge (ConvertPDF, Consolidate) | — | ❓ | ✅ Azure SQL `COS_PROD*`, `NSBusPersistence` | ✅ Storage API | ⚠️ Service Bus, VetHub, CLAPI, Dynamic CLAPI, Storage API | ⚠️ VetHub and UPM pollers (UPM every 30 s) must run as a single instance | ❌ continuous background work | ⚠️ PRTG service sensors; Key Vault tokens | **Not a web app** — re-host (WebJobs / Functions / containers) or keep on VM |
| **Claims Automation** | Logic Apps Standard | ✅ (managed runtime) | ✅ workflows | — | ✅ | ✅ Event Grid subscription | ✅ | ✅ Azure SQL `PSPRODClaimsAutoDB` | ✅ | ✅ | ✅ | ✅ (event-driven) | ⚠️ Logic App name TBC | **Already PaaS** |
| **CLAPI** | IIS: AU `PS-PRD-AZS-P3-1/2`; NZ `NZ-PRD-AZ-P3WEB`; VP `PS-PRD-AZ-P3WEB` | ✅ .NET Fx 4.8 | ✅ ASP.NET Web API 2 (OWIN) | ⚠️ co-hosted with COS.API and helper APIs | ❓ | ✅ token from the Security API | ❓ | ✅ no DB | ✅ Storage API | ⚠️ needs the on-prem AU / TPN DAPI over hub + ExpressRoute; NZ DAPI in the landing zone; Boomi allow-list ❓ | ✅ stateless (Polly per insurer) | ✅ none | ⚠️ committed DAPI / Boomi passwords → Key Vault; `appsettings` file swap at deploy | **Ready after remediation** — OpsLevel already lists it as App Service |
| **DAPI** — AU R/W + Trupanion | IIS on on-prem `PS-BCS-PRD-API1` (two apps) | ✅ .NET Fx 4.8 | ✅ Web API | ⚠️ two apps on one server → two web apps | ❓ | ❓ | ❓ high risk: server sits next to UPM+ on-prem | ⚠️ direct writes to on-prem `PETSURE_PRD_UPM` / `TRUPANION_PRD_UPM` — moving to Azure puts every write across ExpressRoute | ❌ local Windows shares `auapidocuments`, `PRD_TP_UPMClaimDoc` that UPM+ reads | ⚠️ the network path reverses (today Azure → on-prem) | ❓ | ✅ none documented | ⚠️ end-of-life in OpsLevel | **Keep on current hosting** — end-of-life; redesign of the file share needed first |
| **DAPI** — AU RO | IIS on Azure VM `PS-PRD-AZS-CSP1` | ✅ .NET Fx 4.8 | ✅ Web API | ❓ | ❓ | ❓ | ❓ | ⚠️ on-prem UPM AU read replica over ExpressRoute (already the case today) | ✅ none documented | ⚠️ VNet integration via the hub | ❓ | ✅ none | ⚠️ end-of-life | **Candidate after checks** — low priority (end-of-life, callers not documented) |
| **DAPI** — NZ | IIS on Azure VM `NZ-PRD-INT-API1` | ✅ .NET Fx 4.8 | ✅ Web API (R/W + RO on one server) | ⚠️ two flavours on one server | ❓ | ❓ | ❓ | ✅ `PETSURE_PRD_UPM_NZ` on SQL VMs in the landing zone (VNet integration) | ❌ claim documents on the UNC share `\\nz-prd-bcs-app3\NZ_UPM-Store_1` | ⚠️ VNet integration into `sub-prd-digital-nz` | ❓ | ✅ none | ⚠️ end-of-life | **Investigate** — Managed Instance or keep on VM (UNC share) |
| **Dynamic CLAPI** | App Service | ⚠️ **.NET 8 — end of support 10 Nov 2026** → .NET 10 | ✅ ASP.NET Core | ✅ | ✅ | ✅ managed identity + basic | ✅ | ✅ no DB | ✅ | ✅ VNet integration + hub to on-prem | ✅ | ✅ | ✅ Key Vault | **Already on App Service** — runtime upgrade due |
| **STP / Clawdia** | Logic Apps Std, Functions ×3, App Service | ⚠️ Functions **.NET 8** (end of support 10 Nov 2026); ReadOnly DataService ❓ | ✅ | ✅ | ✅ | ✅ managed identity | ✅ | ✅ Azure SQL; on-prem UPM replica via hub | ✅ | ✅ private endpoints + VNet integration | ✅ | ✅ event-driven | ⚠️ App Insights still on the legacy structure | **Already PaaS** — runtime upgrade due |
| **ML Environment** | Azure ML managed endpoint | — | — | — | — | — | — | — | — | — | — | — | — | **Not applicable** |
| **UPM Dynamics API / UPM+** | Business Central (on-prem AU / TPN; Azure VMs NZ) | — | — | — | — | — | — | — | — | — | — | — | — | **Out of scope** — not IIS; a BC platform decision |
| **Go Tech helper APIs** (Storage.API, Security.API, Security.AAD.API, Notification.API, P3ITTools) | IIS on `PS-PRD-AZS-P3-1/2` | ❓ | ❓ | ⚠️ co-hosted | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | **Unknown** — not documented, but COS and CLAPI depend on them and they share the servers |

### What the table says

- **The IIS sites are the easy part.** COS.API, CLAPI and MessageFormat.API are .NET Framework 4.8 Web APIs with no documented blocker. They fit one Windows App Service plan as separate web apps. What remains unknown for them is R3–R6 and R10, which the IIS inventory (below) answers.
- **The Windows services are the real constraint.** `PS-PRD-AZS-P3-3` (and the NZ / VP `P3APP` servers) run NServiceBus sagas, workers and timer pollers. App Service has no direct equivalent (R2, R11). These need their own target — WebJobs, Azure Functions or containers — or they stay on VMs. Any decision about adding or removing a VM depends mostly on these servers, not on the IIS servers.
- **The IIS servers can't be retired without the helper APIs.** Storage, Security, Security.AAD, Notification and P3ITTools share `PS-PRD-AZS-P3-1/2` and are not documented anywhere in these folders.
- **DAPI should stay where it is.** The on-prem R/W DAPI and the NZ DAPI depend on Windows file shares read by UPM+ (R8) and on direct SQL writes to UPM+. DAPI is also end-of-life, and Earlier Birds reduces its callers.
- **Two runtime deadlines are already due.** Dynamic CLAPI and the STP / Clawdia function apps are on .NET 8, which reaches end of support on 10 Nov 2026.

### Inventory still needed

Run the IIS / runtime inventory from the research (sites, applications, app pools, installed runtimes, `web.config` authentication, connection-string auth mode, GAC / COM / scheduled tasks) on: `PS-PRD-AZS-P3-1`, `PS-PRD-AZS-P3-2`, `PS-PRD-AZS-P3-3`, `NZ-PRD-AZ-P3WEB`, `NZ-PRD-AZ-P3APP`, `PS-PRD-AZ-P3WEB`, `PS-PRD-AZ-P3APP`, `PS-PRD-AZS-CSP1`, `NZ-PRD-INT-API1` and `PS-BCS-PRD-API1`. Microsoft's App Service migration assessment can produce a first pass of R1–R4. Keep secrets out of the inventory.

## Main open points across components

- **IIS / Windows Server versions** — not documented (see above).
- **Dynamic CLAPI URL conflict** — COS code calls `https://api-dynamicclaims-prod.petsure.com.au` (`PUT /api/Claims/Lodge/{claimId}`); the infrastructure summary names `ps-syd-prod-dynamicclapi-api.petsure.com.au`. Possibly two DNS names for the same App Service — confirm.
- **HTTP methods missing** for the DAPI operations, the UPM Dynamics API operations and some Dynamic CLAPI operations (marked TBC).
- **Inferred placements** — VetHub Windows services on `PS-PRD-AZS-P3-3`; the Vet Partners COS / CLAPI servers; the NZ COS database name `COS_PROD_NZ`.
- **Names TBC** — Claims Automation Logic App; UPM NZ BC API service instance.
