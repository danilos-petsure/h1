# Go Tech Platform — Component architecture (PROD, as-is)

This folder is the **base for the component architecture** of the claims path. It takes the per-insurer documents in [`../go-tech-platform`](../go-tech-platform/README.md) and turns them around: **one document per component**, each with the same five sections.

| Section | Content |
|---|---|
| 1. Deployment picture | The existing ArchiMate export. The **Australia** picture is the default; the pictures of the other environments are linked, not embedded. Global pictures are used for the shared components. |
| 2. Interfaces for claim submission | Every interface the component has with another component on the claim-submission path (see the legend below). |
| 3. Databases | The database(s) the component **writes** to, and any it only **reads**. |
| 4. Azure managed services used | Services the component *uses* (not the ones that host it): which service, which resource, and how. |
| 5. Current technology by environment | For each environment: .NET version, IIS version, and the Azure managed service(s) hosting the component. |

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

## Main open points across components

- **IIS / Windows Server versions** — not documented (see above).
- **Dynamic CLAPI URL conflict** — COS code calls `https://api-dynamicclaims-prod.petsure.com.au` (`PUT /api/Claims/Lodge/{claimId}`); the infrastructure summary names `ps-syd-prod-dynamicclapi-api.petsure.com.au`. Possibly two DNS names for the same App Service — confirm.
- **HTTP methods missing** for the DAPI operations, the UPM Dynamics API operations and some Dynamic CLAPI operations (marked TBC).
- **Inferred placements** — VetHub Windows services on `PS-PRD-AZS-P3-3`; the Vet Partners COS / CLAPI servers; the NZ COS database name `COS_PROD_NZ`.
- **Names TBC** — Claims Automation Logic App; UPM NZ BC API service instance.
