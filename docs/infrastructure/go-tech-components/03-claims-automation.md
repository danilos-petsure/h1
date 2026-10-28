# Claims Automation (Sophia Jr)

> **Role in claim submission:** assesses each incoming claim before COS submits it (predicts treatment codes, converts them, applies business rules) and returns the result to COS through a callback.
> **Deployment model:** one shared deployment for all insurers; every row in its database is tagged with the insurer.
> **Back to:** [Component index](README.md) · Insurer view: [Australia → Claims Automation](../go-tech-platform/01-australia.md#4-claims-automation-shared)

## 1. Deployment picture

![Claim Automation Global](../02%20-%20Global%20-%20Claim%20Automation%20Global.png)

Global picture (no per-insurer variants).

## 2. Interfaces for claim submission

| # | Kind | Interface | Counterpart |
|---|---|---|---|
| 1 | Event (Event Grid, inbound) | Topic `ps-prod-egt-claimsautoclaims` (australiaeast), event `Petsure.ClaimsAutomation.Claim` → master flow | Published by COS `ClaimsAutomationIntegration` (AU, NZ, VP — one topic) |
| 2 | Outbound REST (callback) | → COS.API: `POST {cos}/api/Claims/ClaimsAutomation/Completed` (URL passed in the event as `CACallbackURL`) | COS AU / NZ / VP. If no reply arrives, the COS saga times out after `ClaimsAutomationMiliseconds` (100 s) |
| 3 | Outbound REST | → COS.API: `GET {cos}/GetInvoicePayload/{ClaimRefNumber}` | COS (avoids reading the VetHub DB) |
| 4 | Outbound REST (*TBC*) | → ML Environment: "Sophia Junior API (reads Sophia Junior model)" | Listed in the Earlier Birds flow matrix; endpoint and hosting not documented |

Claims Automation exposes no REST API of its own on the claim path; it is driven only by the Event Grid subscription.

## 3. Databases

| Use | Database | Server | Notes |
|---|---|---|---|
| **Write** | `PSPRODClaimsAutoDB` | Azure SQL `petsure-production` | One database for all insurers, rows keyed by `InsuranceProviderId`. **Shared with STP / Clawdia** (`Diagnosis`, `STPClaim`… tables). Secrets `CA-DB-CONNECTION` / `LZ-AU-CA-DB-CONNECTION` |
| **Read only** | none documented | — | — |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| Azure Event Grid | Topic `ps-prod-egt-claimsautoclaims` | Event subscription that triggers the master flow |
| Azure Storage (Blob) | `p3storageprod` / container `prod-dead-letter-queue` | Event Grid dead-lettering |
| Azure SQL Database | `PSPRODClaimsAutoDB` | Assessment data |
| Azure Key Vault | (name not documented) | DB connection secrets `CA-DB-CONNECTION` / `LZ-AU-CA-DB-CONNECTION` |

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| **Shared** | n/a — Logic App workflows (runtime managed by Logic Apps Standard) | n/a | **Logic Apps Standard** — *Claims Automation Logic App* (name TBC). **Azure SQL Database** `PSPRODClaimsAutoDB` |
| Australia PetSure | *uses Shared* | — | — |
| Trupanion | *uses Shared* | — | — |
| New Zealand | *uses Shared* (published through `App.ProductionNZ`) | — | — |
| Vet Partners | *uses Shared* | — | — |

## 6. Open points

- **Logic App name** is TBC in the model; its plan, resource group and subscription are not documented.
- **Boundary with Clawdia.** COS code only knows "Claims Automation" behind the topic; the infrastructure summary places Clawdia's data in the same DB. Confirm which workflows answer the `claimsautoclaims` event.
- **Sophia Junior model** hosting (ML workspace / endpoint) is not documented.
- The Earlier Birds document has *Integrations — as is* for this component still "to be completed"; this page can fill it.
