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

## 7. Confluence pages

Pages found on Confluence on 28 Oct 2026. The *Technical Assessments* (Mar 2026) are per-repo code reviews; they predate 2026_R4.

| Page | Space | What it adds |
|---|---|---|
| [ClaimsAutomationFunctions – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728872449) | P3 | Function Apps on .NET 8 isolated (Windows); anonymous functions; Terraform |
| [ClaimsAutomationAzureResourceGroup – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1728872461) | P3 | Logic App Standard, Event Grid, Service Bus, Function Apps, Key Vault, **AKS**; MSI; Terraform + legacy ARM |
| [ClaimsAutomationDatabase – Technical Assessment](https://petsure.atlassian.net/wiki/spaces/P3/pages/1737588798) | P3 | Database project for `PSPRODClaimsAutoDB` |
| [Claims Automation – Main Functions](https://petsure.atlassian.net/wiki/spaces/P3/pages/448331875) | P3 | Functional overview |
| [Claims Automation – Master Logic App Performance (PROD)](https://petsure.atlassian.net/wiki/spaces/P3/pages/559349762) | P3 | Master Logic App performance in PROD |
| [Claims Automation & Auto-lodgement on a page](https://petsure.atlassian.net/wiki/spaces/P3/pages/15315539) | P3 | Overview of CA and auto-lodgement |
| [5.a) Claims Automation (round trip from→to COS.Service.Saga)](https://petsure.atlassian.net/wiki/spaces/P3/pages/1804730397) | P3 | Round trip with COS |
| [SPIKE 99818 – Update Claims Automation App Service authentication to V2](https://petsure.atlassian.net/wiki/spaces/P3/pages/911998978) | P3 | Easy Auth v2 |
| [Sophia Jnr](https://petsure.atlassian.net/wiki/spaces/AC/pages/800358444) | AC | The Sophia Junior model |
| [ClaimsAutomation AKS Sophia jr (TStar) disaster recovery procedure](https://petsure.atlassian.net/wiki/spaces/PBIAR/pages/28312858) | PBIAR | Sophia Junior runs on **AKS** (answers the open point on model hosting) |
| [GOTech Deployments Summary](https://petsure.atlassian.net/wiki/spaces/P3/pages/1736048734) | P3 | Deployment targets `ps-prod-fapp-caassessment`, `-cabusinessrules`, `ps-prod-logic-claimsauto`; .NET 10 upgrade TBC in 2026_R5 |
