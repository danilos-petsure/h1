# UPM+ (incl. UPM DB)

> **Role in claim submission:** PetSure's insurance ERP (Microsoft Dynamics 365 Business Central) — the system where the claim is lodged and processed. It ingests the claim from the staging tables, runs duplicate, fraud and bank-details checks, requests the medical assessment from Clawdia, receives the *Write*, calculates the benefit and settles the payment.
> **Deployment model:** one instance per insurer that uses it — Australia (incl. Luna), Trupanion, New Zealand. Vet Partners is not on UPM+.
> **Back to:** [Component index](README.md) · Insurer views: [Australia](../go-tech-platform/01-australia.md#9-upm-and-upm-dynamics-api) · [Trupanion](../go-tech-platform/02-trupanion.md#9-upm-and-upm-dynamics-api-trupanion) · [New Zealand](../go-tech-platform/03-new-zealand.md#8-upm-and-upm-dynamics-api)

## 1. Deployment picture

![UPM+ Australia](../09%20-%20Australia%20-%20UPMand%20Australia.png)

Other environments: [UPM+ Trupanion](../11%20-%20Trupanion%20-%20UPMand%20Trupanion.png) · [UPM+ New Zealand](../15%20-%20New%20Zealand%20-%20UPMand%20New%20Zealand.png)

## 2. Interfaces for claim submission

| # | Kind | Interface | Counterpart |
|---|---|---|---|
| 1 | Data (inbound) | `DS_*` staging tables / views in the UPM DB, written by DAPI | DAPI (AU R/W, TPN, NZ) |
| 2 | Data polling from **UPM DB** | Ingestion through the UPM Dynamics API (every 10 min) | [UPM Dynamics API](09-upm-dynamics-api.md) |
| 3 | REST API (inbound) | `…/api/upm/claims/v1.0/{lodge\|write\|inspect\|finish\|return}` — exposed through the UPM Dynamics API | Dynamic CLAPI |
| 4 | Outbound REST | → Dynamic CLAPI: `POST api/Claims/CLAW-INIT-API` — request the medical assessment (by CRN) | Dynamic CLAPI → STP / Clawdia |
| 5 | Outbound REST (*TBC*) | → Dynamic CLAPI: gap-only benefit (routed on to COS) | Dynamic CLAPI → COS |
| 6 | Data (outbound, read) | AU read replica | AU RO DAPI; Clawdia UPM ReadOnly DataService |
| 7 | Data polling from **UPM+** (through CLAPI → DAPI) | `UpdatedClaims` — status changes | COS UPM Status Poller (every 30 s) |
| 8 | File share | `auapidocuments` (AU), `PRD_TP_UPMClaimDoc` (TPN), `\\nz-prd-bcs-app3\NZ_UPM-Store_1` (NZ) | Claim documents written by DAPI |

## 3. Databases

| Use | Database | Instance | Location |
|---|---|---|---|
| **Write** | `PETSURE_PRD_UPM` | SQL Server Always On, listener `PS-BCS-PROD`: `PS-PRD-BCS-DB01` (primary, Equinix), `PS-PRD-BCS-DB02` (secondary, AirTrunk) | On-premises (AU + Luna) |
| **Write** | `TRUPANION_PRD_UPM` | SQL Server Always On, listener `TP-PRD-BCS-LS01` | On-premises (TPN; from the model) |
| **Write** | `PETSURE_PRD_UPM_NZ` | SQL VMs `nz-prd-bcs-db01/02` (Standard E4bds v5), cluster `NZ-BCS-PRDDNZ`, listener `NZ-PRD-BCS-LS01` | Azure IaaS (NZ) |
| **Read only (offered to others)** | AU read replica; data warehouse | Always On secondary | Read by RO DAPI and the Clawdia ReadOnly DataService |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| (AU, TPN) Hub connectivity only | Azure Firewall `ps-syd-prd-hub-afw`, ExpressRoute `ps-syd-prd-hub-erc-at`, DNS Private Resolver `ps-syd-prd-hub-dnspr` | Azure ↔ on-premises path (both directions: Dynamic CLAPI → UPM; UPM → Dynamic CLAPI) |
| (NZ) Azure Load Balancer | `NZUPMPRD` (10.54.0.6) | In front of the BC application VMs |
| (NZ) Landing-zone VNet, hub firewall and DNS | `nz-syd-prd-bcs-vnet`, `sub-prd-core-nz` | Networking |

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| Shared | — | — | — |
| **Australia PetSure** | Business Central (version TBC) | n/a (BC server) | **None — on-premises** (Equinix + AirTrunk): app servers `PS-PRD-BCS-APP1/2/5/6`, job servers `APP3/APP4`; SQL Always On `PS-PRD-BCS-DB01/02`. Last DR test 2026-10-11 |
| **Trupanion** | Business Central (version TBC) | n/a | **None — on-premises**: `TP-PRD-BCS-APP1/2`; SQL Always On `TP-PRD-BCS-LS01` |
| **New Zealand** | Business Central (version TBC) | n/a | **Virtual Machines** `nz-prd-bcs-app3/4` + SQL VMs `nz-prd-bcs-db01/02`; **Azure Load Balancer** `NZUPMPRD`; `sub-prd-core-nz`, RG `nz-syd-prd-bcs-rg` |
| Vet Partners | — | — | Not used (Vet Partners Salesforce via Boomi) |

## 6. Open points

- **Trupanion** servers, listener and database come from the model only — confirm against Confluence.
- **BC versions** are not recorded.
- **Gap-only benefit** call from UPM+ to Dynamic CLAPI is *inferred* from the Earlier Birds flow matrix; route TBC.
- Whether **UPM+ TPN** calls CLAW-INIT is not documented.
