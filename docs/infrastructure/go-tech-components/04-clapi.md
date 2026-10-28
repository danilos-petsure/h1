# Claims API (CLAPI)

> **Role in claim submission:** the layer COS uses to reach the insurer's system. It routes each request, by `InsuranceProviderId`, to the right back-end: the AU DAPI, the Trupanion DAPI, the NZ DAPI, or Boomi for Vet Partners. It also serves policy lookups and the status changes COS polls for.
> **Deployment model:** same code per insurer stack, insurer-specific `appsettings.prod[.nz/.vp].json`. The AU deployment also serves Trupanion.
> **Back to:** [Component index](README.md) · Insurer views: [Australia](../go-tech-platform/01-australia.md#5-claims-api-clapi) · [Trupanion](../go-tech-platform/02-trupanion.md#5-claims-api-clapi-australian-deployment) · [New Zealand](../go-tech-platform/03-new-zealand.md#5-claims-api-clapi) · [Vet Partners](../go-tech-platform/04-vet-partners.md#5-claims-api-clapi)

## 1. Deployment picture

![Claims API Australia + Trupanion](../04%20-%20Australia%20-%20Claims%20API%20Australia%20and%20Trupanion.png)

Other environments: [Claims API New Zealand](../13%20-%20New%20Zealand%20-%20Claims%20API%20New%20Zealand.png) · [Claims API Vet Partners](../17%20-%20Vet%20Partners%20-%20Claims%20API%20Vet%20Partners.png)

## 2. Interfaces for claim submission

Base URL `{clapi}` = `https://api-claims-prod.petsure.com.au` (AU + TPN), `https://api-claims-prod-nz.petsure.com.au` (NZ), `https://api-claims-prod-vp.petsure.com.au` (VP).

### 2.1 REST APIs exposed

| # | Kind | Interface | Called by | Forwards to (DAPI route) |
|---|---|---|---|---|
| 1 | REST API | `POST {clapi}/api/Policy/Find` | COS ValidatePolicy; VetHub.API | `api/customer/FindPolicy` |
| 2 | REST API | `GET {clapi}/api/Policy/DetailsByPolicyNumber?policyNumber=&fullPolicyNumber=` | VetHub.API | `GetPolicyDetailsByPolicyNumber` |
| 3 | REST API | `POST {clapi}/api/Claims` — lodge claim | COS SubmitClaims | `api/Claims/Submit` (or TPN / NZ / Boomi equivalent) |
| 4 | REST API | `POST {clapi}/api/Claims/Attachments` | COS SubmitClaimAttachment | `api/Claims/SubmitDocument` |
| 5 | REST API | `PUT {clapi}/api/Claims/FinishSubmitClaim` | COS SubmitClaimAttachment | `api/Claims/FinishSubmitClaim` |
| 6 | REST API | `POST {clapi}/api/Claims/AdditionalAttachments` | COS AddAttachments Submit | `api/Claims/SubmitAdditionalDocument2` |
| 7 | REST API | `PUT {clapi}/api/Claims/FinaliseAdditionalAttachment` | COS AddAttachments Submit | `api/Claims/FinishClaimAdditionalDocument` |
| 8 | REST API | `POST {clapi}/api/Claims/CosAdditionalAttachments` | COS (COS-generated documents, e.g. CA PDF) | `api/Claims/SubmitAdditionalDocument` |
| 9 | REST API | `POST {clapi}/api/Claims/UpdateCSPReferenceNumber` | COS (*inferred*) | `api/Claims/UpdateCSPReferenceNumber` |
| 10 | REST API | `POST {clapi}/api/Claims/SubmitServiceProviderFee` | COS (gap-only; feature flag) | `api/Claims/SubmitServiceProviderFee` |
| 11 | REST API (polled) | `GET {clapi}/api/Claims/GetUpdatedClaimsList?lastStatusUpdateFrom=&lastStatusUpdateTo=` | COS UPM Status Poller (every 30 s) | `api/Claims/UpdatedClaims` |
| 12 | REST API | `GET {clapi}/api/Claims/GetGapClaimBenefitDetails?cspReferenceNumber=` | COS (*inferred*) | `api/Claims/GetGapClaimBenefitDetails` |
| 13 | REST API | `GET {clapi}/api/Claims/GetServiceProviders` | Vet.Portal.API | `api/Claims/ServiceProviders/` |
| 14 | REST API | `POST {clapi}/api/External/UpdateStatus` | Vet Partners (Boomi) | → COS.API `api/Claims/UpdateStatus` |
| 15 | REST API | `POST {clapi}/api/External/GapOnlyBenefit` | Vet Partners (Boomi) | → COS.API `api/GapOnly/GapOnlyBenefit` |

HTTP methods of the DAPI routes are not documented.

### 2.2 Outbound calls

| # | Target | Base URL | Used by stack |
|---|---|---|---|
| 16 | DAPI AU (R/W, on-premises) | `https://api.petsure.com.au/` | AU |
| 17 | DAPI Trupanion (on-premises) | `https://tp-api.petsure.com.au` | AU (Trupanion claims) |
| 18 | DAPI NZ (Azure VM) | `https://nz-digitalapi.petsure.com.au/` | NZ |
| 19 | Boomi → Vet Partners Salesforce | `https://c01-aus.integrate.boomi.com/` | VP |
| 20 | Storage API | `https://api-storage-prod.petsure.com.au/api/documents/{0}` | all (attachments) |
| 21 | Security API | token | all |

Polly retry and circuit breaker per insurer client (`InsurerHttpClients`).

## 3. Databases

| Use | Database | Notes |
|---|---|---|
| **Write** | none | Stateless. Writes reach UPM+ through DAPI (or Salesforce through Boomi) |
| **Read only** | none | `ServiceProviders.json` static file in the repo |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| Azure Storage (Blob) | `p3storageprod`, indirectly through the Storage API | Reads claim documents before posting them to DAPI |
| Azure Key Vault | (deploy-time tokens) | Secrets; note DAPI / Boomi passwords are committed in `appsettings.*.json` and should move to Key Vault |
| Application Insights | `ps-prd-insight-p3` | Telemetry (log4net also used) |
| Hub (Azure Firewall, ExpressRoute) | `ps-syd-prd-hub-afw`, `ps-syd-prd-hub-erc-at` | Path to the on-premises AU / TPN DAPI |

No other Azure service is used directly besides hosting.

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| Shared | — | — | — |
| **Australia PetSure** | **.NET Framework 4.8** (ASP.NET Web API 2, OWIN) | `PS-PRD-AZS-P3-1/2`: **TBC** | **Virtual Machines** `PS-PRD-AZS-P3-1`, `PS-PRD-AZS-P3-2` (IIS, side by side with COS.API) |
| **Trupanion** | .NET Framework 4.8 | *AU servers* | *On the AU deployment* (second back-end `tp-api.petsure.com.au`) |
| **New Zealand** | .NET Framework 4.8 | `NZ-PRD-AZ-P3WEB`: **TBC** | **Virtual Machines** `NZ-PRD-AZ-P3WEB` (IIS) |
| **Vet Partners** | .NET Framework 4.8 | `PS-PRD-AZ-P3WEB`: **TBC** | **Virtual Machines** `PS-PRD-AZ-P3WEB` (IIS, *inferred VP*) |

OpsLevel labels CLAPI `azure-app-service`, but the workflows deploy to IIS on VMs. Long-term option: App Service on .NET 10.

## 6. Open points

- **OpsLevel vs reality** — App Service vs IIS on VMs; correct OpsLevel.
- **Committed credentials** (DAPI / Boomi) in `appsettings.*.json` — rotate.
- **Other consumers** of `POST api/Claims` / `PUT api/Claims/FinishSubmitClaim` outside the COS and VetHub repos are unknown (Earlier Birds OQ-10).
