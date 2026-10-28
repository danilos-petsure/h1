# CSP Digital API (DAPI)

> **Role in claim submission:** the legacy web API that writes the claim into the UPM+ database. It stages claims, documents and policy lookups in the `DS_*` views / staging tables, from which UPM+ ingests them, and keeps claim documents on a Windows file share.
> **Deployment model:** one deployment per UPM+ instance, in two flavours — read/write and read-only. Vet Partners does not use DAPI (Boomi instead). Marked end-of-life in OpsLevel.
> **Back to:** [Component index](README.md) · Insurer views: [Australia](../go-tech-platform/01-australia.md#6-csp-digital-api-dapi) · [Trupanion](../go-tech-platform/02-trupanion.md#6-dapi-trupanion) · [New Zealand](../go-tech-platform/03-new-zealand.md#6-csp-digital-api-dapi)

## 1. Deployment picture

![DAPI Australia](../05%20-%20Australia%20-%20DAPI%20Australia.png)

Other environments: [DAPI Trupanion](../10%20-%20Trupanion%20-%20DAPI%20Trupanion.png) · [DAPI New Zealand](../14%20-%20New%20Zealand%20-%20DAPI%20New%20Zealand.png)

## 2. Interfaces for claim submission

Base URL `{dapi}` = `https://api.petsure.com.au/` (AU R/W), `https://tp-api.petsure.com.au` (Trupanion), `https://nz-digitalapi.petsure.com.au/` (NZ); read-only `https://digitalapi-prod-ro.petsure.com.au` (AU RO).

### 2.1 REST APIs exposed

Routes are taken from the CLAPI code that calls them. **HTTP methods are not documented (TBC).**

| # | Kind | Interface | Called by |
|---|---|---|---|
| 1 | REST API | `[TBC] {dapi}/api/Claims/Submit` — claim submission → prepare DS tables | CLAPI `POST api/Claims` |
| 2 | REST API | `[TBC] {dapi}/api/Claims/SubmitDocument` | CLAPI `POST api/Claims/Attachments` |
| 3 | REST API | `[TBC] {dapi}/api/Claims/FinishSubmitClaim` — finish submission → update DS tables | CLAPI `PUT api/Claims/FinishSubmitClaim` |
| 4 | REST API | `[TBC] {dapi}/api/Claims/SubmitAdditionalDocument2`, `…/SubmitAdditionalDocument` | CLAPI (CSP / COS additional documents) |
| 5 | REST API | `[TBC] {dapi}/api/Claims/FinishClaimAdditionalDocument` | CLAPI `PUT api/Claims/FinaliseAdditionalAttachment` |
| 6 | REST API | `[TBC] {dapi}/api/Claims/UpdatedClaims` | CLAPI `GET api/Claims/GetUpdatedClaimsList` (for the COS UPM Status Poller) |
| 7 | REST API | `[TBC] {dapi}/api/customer/FindPolicy` | CLAPI `POST api/Policy/Find` |
| 8 | REST API | `[TBC] {dapi}/api/customer/policies/GetPolicyDetails/{policyNumber}`, `GetPolicyDetailsByPolicyNumber` | CLAPI policy endpoints |
| 9 | REST API | `[TBC] {dapi}/api/Claims/GetClaimDetailsByClaimNumber`, `ClaimsByServiceProvider`, `ServiceProviders`, `GetGapClaimBenefitDetails`, `UpdateCSPReferenceNumber`, `SubmitServiceProviderFee` | CLAPI |
| 10 | REST API (RO flavour) | `digitalapi-prod-ro.petsure.com.au` — operations not documented | Callers not documented (CSP *inferred*) |

### 2.2 Data hand-off to UPM+

| # | Kind | Interface | Counterpart |
|---|---|---|---|
| 11 | Data (write) | Inserts / updates the UPM `DS_*` staging tables | **UPM Dynamics API** polls these tables every 10 min and lodges the claim (see [UPM Dynamics API](09-upm-dynamics-api.md)) |
| 12 | File share | `\\PS-BCS-PRD-API1\auapidocuments` (AU), `PRD_TP_UPMClaimDoc` (TPN) | Claim documents read by UPM+ |

## 3. Databases

| Use | Database | Instance | Notes |
|---|---|---|---|
| **Write** | `PETSURE_PRD_UPM` | On-prem SQL Always On, listener `PS-BCS-PROD` | AU R/W DAPI — direct writes to `DS_*` tables |
| **Write** | `TRUPANION_PRD_UPM` | On-prem SQL Always On, listener `TP-PRD-BCS-LS01` | TPN DAPI (from the model; *to confirm*) |
| **Write** | `PETSURE_PRD_UPM_NZ` | SQL on Azure VMs, listener `NZ-PRD-BCS-LS01` | NZ DAPI (R/W and RO on the same server) |
| **Read only** | UPM AU read replica | On-prem SQL Always On secondary | AU RO DAPI on `PS-PRD-AZS-CSP1` |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| Azure Key Vault | `CSP_KEYVAULT` variable | Secrets at deploy time |
| Hub (Azure Firewall, ExpressRoute, DNS Private Resolver) | `ps-syd-prd-hub-afw`, `ps-syd-prd-hub-erc-at`, `ps-syd-prd-hub-dnspr` | AU / TPN: Azure callers (CLAPI) reach the on-premises server; AU RO: the Azure VM reaches the on-premises read replica |
| VNet (landing zone) | `nz-syd-prd-sharedapis-vnet` (10.55.8.0/22) | NZ: network for `NZ-PRD-INT-API1` and access to the UPM NZ SQL VMs |

Deployed by GitHub Actions through the self-hosted runner `petsure-azure-windows-runner`.

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| Shared | — | — | — |
| **Australia PetSure** | **.NET Framework 4.8** (`CSP.Au.DigitalApi`) | R/W `PS-BCS-PRD-API1`: **TBC**; RO `PS-PRD-AZS-CSP1`: **TBC** | R/W: **none — on-premises** server `PS-BCS-PRD-API1` (172.16.25.50). RO: **Virtual Machines** `PS-PRD-AZS-CSP1` (10.3.0.92, legacy estate) |
| **Trupanion** | .NET Framework 4.8 (`CSP.Au.Trupanion.DigitalApi`) | `PS-BCS-PRD-API1`: **TBC** | **None — on-premises**, same server as the AU R/W DAPI (from the model) |
| **New Zealand** | .NET Framework 4.8 (NZ Digital API) | `NZ-PRD-INT-API1`: **TBC** | **Virtual Machines** `NZ-PRD-INT-API1` (Standard_D4as_v4, 10.55.8.68), `sub-prd-digital-nz`, RG `nz-syd-prd-sharedapis-rg` |
| Vet Partners | — | — | Not used (Boomi → Salesforce) |

## 6. Open points

- **HTTP methods** of all DAPI operations are TBC (only the routes are known, from CLAPI).
- **Trupanion DAPI** server, share and DB come from the model only; `tp-api.petsure.com.au` → `PS-BCS-PRD-API1` mapping to confirm.
- **AU RO host** — `PS-PRD-AZS-CSP1` (10.3.0.92, Oct 2026) used; a 2025 page names `AZ-SY-P-CSPRO01` (10.3.0.55).
- **RO DAPI callers** are not documented.
- End-of-life in OpsLevel; Earlier Birds proposes COS calling DAPI directly (DAPI-E-01).
