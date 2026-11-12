# STP / Clawdia (CLAW)

> **Role in claim submission:** the straight-through-processing engine of 90STP. When UPM+ requests the medical assessment, Clawdia loads claim and policy data, applies Easy Cohort rules, calls the ClawGP model, applies business rules to the prediction, maps the result to logical claims and writes the decision back into UPM+ through Dynamic CLAPI.
> **Deployment model:** Australia only; serves Australian, Trupanion and Luna claims. Not used for NZ or VP.
> **Back to:** [Component index](README.md) · Insurer views: [Australia](../go-tech-platform/01-australia.md#8-stp--clawdia-and-the-ml-environment) · [Trupanion](../go-tech-platform/02-trupanion.md#8-stp--clawdia-and-the-ml-environment-australian-deployment)

## 1. Deployment picture

![STP - Clawdia Australia](../07%20-%20Australia%20-%20STP%20-%20Clawdia%20Australia.png)

No other environment pictures. The ML model it calls is in [ML Environment](08-ml-environment.md).

## 2. Interfaces for claim submission

### 2.1 Inbound

| # | Kind | Interface | Called by |
|---|---|---|---|
| 1 | REST API (Function) | KeyVault Function `CLAW-INIT` — `https://ps-syd-prod-keyvault-func-app.petsure.com.au` (route TBC) | Dynamic CLAPI (on UPM+'s `POST api/Claims/CLAW-INIT-API`) |
| 2 | Event (Event Grid) | CLAW topic — KeyVault Function `CLAW-INIT` → four entry Logic App workflows | Internal hand-off |
| 3 | Event (Event Grid) | CLAW audit topic (pattern `ps-<env>-evgt-clawaudit`) — all stages → DBCommand audit functions | Internal |
| 4 | REST API (Function) | DBCommand `https://ps-syd-prod-dbcommand-func-app.petsure.com.au` — Easy Cohorts, business rules, GP enrichment | Clawdia Logic App workflows (*inferred*) |
| 5 | REST API (Function) | DBQuery `https://ps-syd-prod-dbquery-func-app.petsure.com.au` — token conversion, PrepareSubmissionToInsurer | Clawdia Logic App workflows (*inferred*) |
| 6 | REST API (App Service) | UPM ReadOnly DataService `ps-syd-prd-claw-readonlydataservice-app` | Dynamic CLAPI; Clawdia (*inferred*) |

### 2.2 Outbound / data

| # | Kind | Interface | Target |
|---|---|---|---|
| 7 | Outbound REST | → Dynamic CLAPI: load claim / policy data (`/api/claims/…`, route TBC) | Dynamic CLAPI → ReadOnly DataService |
| 8 | Outbound REST | → Dynamic CLAPI: `POST api/Claims/Write` | Dynamic CLAPI → UPM Dynamics API → UPM+ |
| 9 | Outbound REST | → ML Environment: `POST {scoring URI}` of `ps-prd-claimsauto-gp` (standard Azure ML online-endpoint scoring call, *inferred*) | ClawGP model (KeyVault Function and DBCommand GP enrichment) |
| 10 | Data read (on demand) | ReadOnly DataService reads the UPM AU read replica / primary / DWH | UPM+ AU (on-premises, over ExpressRoute) |
| 11 | Outbound REST (*TBC*) | KeyVault Function "COS payload" — likely `GET {cos}/GetInvoicePayload/{ClaimRefNumber}` | COS.API |
| 12 | Outbound | Office 365 connector `office365-1` | Alert e-mails |

## 3. Databases

| Use | Database | Server | Notes |
|---|---|---|---|
| **Write** | `PSPRODClaimsAutoDB` | Azure SQL `petsure-production` | Shared with Claims Automation; Clawdia's tables include `Diagnosis`, `STPClaim`. Secrets `CA-DB-CONNECTION` / `LZ-AU-CA-DB-CONNECTION` |
| **Read only** | `PETSURE_PRD_UPM` read replica (also primary), data warehouse | On-prem SQL Always On (`PS-BCS-PROD`) | Through the UPM ReadOnly DataService |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| Azure Event Grid | CLAW topic, CLAW audit topic; blob dead-letter | Chains the workflow stages; audit trail |
| Azure Storage | `pssydprdclawdlqueuesa`, `pssydprdclawevgtclawsa` | Event Grid dead-letter / topic storage |
| Azure Key Vault | `pssydprdclawkv` | Switches, function keys, DB connection |
| Azure Cache for Redis | `ps-syd-prd-claw-redis` | Cache |
| Azure SQL Database | `PSPRODClaimsAutoDB` | Working data and audit |
| Azure Machine Learning | `ps-prd-claimsauto-gp` | ClawGP scoring (see [ML Environment](08-ml-environment.md)) |
| Managed Identity / Entra ID | CLAW ↔ Dynamic CLAPI | Authenticates calls to Dynamic CLAPI |
| Private Endpoints / VNet integration | `ps-syd-prd-claw-vnet` (10.50.4.0/22); subnets `funcapp-snet`, `logicapp-snet`, `webapp-snet`, `pep-snet` | Private networking; egress through the hub |
| Hub (Azure Firewall, ExpressRoute, DNS Private Resolver) | `ps-syd-prd-hub-*` | ReadOnly DataService → on-premises UPM SQL |
| Application Insights + Log Analytics | (still pointed at the legacy structure) | Telemetry |
| Office 365 managed connector | `office365-1` | Alerts from Logic Apps |

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| Shared | — | — | — |
| **Australia PetSure** | Function apps **.NET 8 (isolated)**; Logic App workflows (no .NET); ReadOnly DataService **TBC** | n/a | **Logic Apps Standard** `ps-syd-prd-claw-stp-lapp` (plan `ps-syd-prd-claw-stp-la-asp`). **Azure Functions** `ps-syd-prd-claw-dbcommand-func-app`, `-dbquery-func-app`, `-keyvault-func-app`. **App Service** `ps-syd-prd-claw-readonlydataservice-app`. All in RG `ps-syd-prd-claw-rg`, subscription `sub-prd-vethub-ps` |
| **Trupanion** | as AU | n/a | *On the AU deployment* (ReadOnly DataService reads UPM **AU** only) |
| New Zealand | — | — | Not used |
| Vet Partners | — | — | Not used |

Deployed with Terraform and GitHub Actions (`lz-au-*`, `au-alz-*`).

## 6. Open points

- **Logic App → Function wiring** (which flow calls which function) is *inferred*; function routes are not documented.
- **CLAW topic names** are not in the repo (pattern only).
- **Trupanion data reads** — the ReadOnly DataService reads UPM AU; how TPN claim data is loaded is not documented.
- **App Insights** still points at the legacy structure.
- **Committed credentials** in one Confluence page (CLAW auth FAQ) — rotate.

## 7. Confluence pages

Pages found on Confluence on 28 Oct 2026. The *Technical Assessments* (Mar 2026) are per-repo code reviews; they predate 2026_R4.

| Page | Space | What it adds |
|---|---|---|
| [StraightThroughProcessFunctions – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728839696) | P3 | .NET 8 isolated Functions; anonymous functions; Bicep IaC |
| [StraightThroughProcessLogicApps – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728905241) | P3 | Logic Apps Standard workflows; auth per connection |
| [DataService.UPM – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1735327745) | P3 | ReadOnly DataService: .NET 8 on **Linux** App Service; Basic auth |
| [DataService.UPM.SQLScript.STP – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1737588822) | P3 | SQL scripts |
| [CLAW Infrastructure](https://petsure.atlassian.net/wiki/spaces/P3/pages/873234445) | P3 | Resources, network settings and role assignments |
| [CLAW Project Infrastructure Deployment Process](https://petsure.atlassian.net/wiki/spaces/PET/pages/1069940906) | PET | Deployment process |
| [CLAW Architecture / Infrastructure Diagram](https://petsure.atlassian.net/wiki/spaces/P3/pages/964559055) | P3 | Diagram |
| [CLAW Application Architecture](https://petsure.atlassian.net/wiki/spaces/P3/pages/185499672) | P3 | Application architecture (2023) |
| [STP Function App Infrastructure Setup](https://petsure.atlassian.net/wiki/spaces/P3/pages/991199294) | P3 | Function App setup |
| [STP Logic App Infrastructure Setup](https://petsure.atlassian.net/wiki/spaces/P3/pages/991887369) | P3 | Logic App setup |
| [UPM+ RO DataService API Infrastructure Setup](https://petsure.atlassian.net/wiki/spaces/P3/pages/991232056) | P3 | ReadOnly DataService setup |
| [CLAW Redis Cache Infrastructure Setup](https://petsure.atlassian.net/wiki/spaces/P3/pages/991395931) | P3 | Redis |
| [CLAW Key Vault Infrastructure Setup](https://petsure.atlassian.net/wiki/spaces/P3/pages/991133744) | P3 | Key Vault |
| [STP and related infrastructure authentication](https://petsure.atlassian.net/wiki/spaces/P3/pages/269451680) | P3 | Auth between the STP components |
| [CLAW / DynamicCLAPI / DynamicAPI / UPM+RO API Flow and Authentication Mechanism](https://petsure.atlassian.net/wiki/spaces/P3/pages/519012357) | P3 | Flow and auth |
| [Terraform + Landing zone – CLAW Logic App and Function App (AUS) – Test Result](https://petsure.atlassian.net/wiki/spaces/P3/pages/1028816935) | P3 | Landing-zone deployment test |
| [UPM+ RO API Documentation](https://petsure.atlassian.net/wiki/spaces/P3/pages/595296393) | P3 | ReadOnly DataService API |
| [90% STP Architecture Vision — Business Motivation Model](https://petsure.atlassian.net/wiki/spaces/PET/pages/2178613297) | PET | Target vision |
| [GOTech Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734) | P3 | Deployment targets; .NET 8 → .NET 10 upgrades of the functions and DataService.UPM in 2026_R5 |
