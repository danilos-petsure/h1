# UPM Dynamics API

> **Role in claim submission:** the Business Central web-services / API layer of UPM+. It polls the `DS_*` staging tables that DAPI fills and lodges the claim in UPM+, accepts lodgements from Dynamic CLAPI, and receives Clawdia's assessment *Write*.
> **Deployment model:** **not a separate system** — a BC API service instance (`…_API_BASIC`) on the UPM+ application servers of each UPM+ instance (AU, Trupanion, NZ). It follows UPM+'s location.
> **Back to:** [Component index](README.md) · Insurer views: [Australia](../go-tech-platform/01-australia.md#9-upm-and-upm-dynamics-api) · [Trupanion](../go-tech-platform/02-trupanion.md#9-upm-and-upm-dynamics-api-trupanion) · [New Zealand](../go-tech-platform/03-new-zealand.md#8-upm-and-upm-dynamics-api)

## 1. Deployment picture

![UPM+ Australia](../09%20-%20Australia%20-%20UPMand%20Australia.png)

The UPM Dynamics API is drawn inside the UPM+ picture, on application servers `APP1`, `APP2`, `APP5`, `APP6` (not on the job servers). Other environments: [UPM+ Trupanion](../11%20-%20Trupanion%20-%20UPMand%20Trupanion.png) · [UPM+ New Zealand](../15%20-%20New%20Zealand%20-%20UPMand%20New%20Zealand.png)

## 2. Interfaces for claim submission

Path pattern: `api/upm/claims/v1.0/{lodge|write|inspect|finish|return}`. **HTTP methods are not documented (TBC).**

| # | Kind | Interface | Called by |
|---|---|---|---|
| 1 | Data polling from **UPM DB** (`DS_*` tables) | Every 10 min — reads what DAPI staged and lodges the claim in UPM+ | Internal (BC job) |
| 2 | REST API | `[TBC] https://upmprod.internal.petsure.com.au:9248/PETSURE_UPM_API_BASIC/…/lodge` (AU, load-balanced) | Dynamic CLAPI (Lodge Claim) |
| 3 | REST API | `[TBC] https://upmprod-capi.internal.petsure.com.au:9248/…/write` — assessment write-back | Dynamic CLAPI (on Clawdia's `Write`) |
| 4 | REST API | `[TBC] …:9248/…/{inspect\|finish\|return}` (AU) | Dynamic CLAPI |
| 5 | REST API | `[TBC] tpupm.internal.petsure.com.au:9148/TRUPANION_PROD_API_BASIC/…/lodge` (TPN) | Dynamic CLAPI |
| 6 | REST API | NZ — endpoint and instance name not documented | No caller documented |

Callers in Azure reach it through hub Azure Firewall → ExpressRoute → AirTrunk with **basic auth** (managed identity is not possible on-premises).

## 3. Databases

| Use | Database | Instance |
|---|---|---|
| **Write** (through Business Central) | `PETSURE_PRD_UPM` (AU), `TRUPANION_PRD_UPM` (TPN), `PETSURE_PRD_UPM_NZ` (NZ) | Listeners `PS-BCS-PROD`, `TP-PRD-BCS-LS01`, `NZ-PRD-BCS-LS01` |
| **Read** | Same databases — the `DS_*` staging tables / views written by DAPI | — |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| (AU, TPN) none for hosting; Hub connectivity as a target | `ps-syd-prd-hub-afw`, `ps-syd-prd-hub-erc-at`, DNS Private Resolver `ps-syd-prd-hub-dnspr` (`internal.petsure.com.au`) | How Dynamic CLAPI reaches it |
| (NZ) Azure Load Balancer | `NZUPMPRD` (10.54.0.6) | Fronts the NZ BC servers |

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| Shared | — | — | — |
| **Australia PetSure** | Business Central service instance `PETSURE_UPM_API_BASIC` (BC version TBC) | n/a (BC server) | **None — on-premises**: `PS-PRD-BCS-APP1`, `APP5` (Equinix), `APP2`, `APP6` (AirTrunk) |
| **Trupanion** | BC service instance `TRUPANION_PROD_API_BASIC` (version TBC) | n/a | **None — on-premises**: `TP-PRD-BCS-APP1`, `TP-PRD-BCS-APP2` |
| **New Zealand** | BC service instance (name TBC) | n/a | **Virtual Machines** `nz-prd-bcs-app3`, `nz-prd-bcs-app4` (Standard D4as v4) behind **Azure Load Balancer** `NZUPMPRD`, `sub-prd-core-nz` |
| Vet Partners | — | — | Not used |

## 6. Open points

- **HTTP methods** and full contracts are TBC.
- **NZ** endpoint and service-instance name are not documented, and no caller is documented.
- **BC version** of each instance is not recorded.
- Earlier Birds makes COS a direct caller of *Lodge Claim* (UAPI-E-01).
