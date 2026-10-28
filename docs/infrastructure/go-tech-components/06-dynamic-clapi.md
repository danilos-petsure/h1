# Dynamic CLAPI

> **Role in claim submission:** the cloud-native bridge between Azure and UPM+. It lodges claims into UPM+ (for COS), lets UPM+ start Clawdia (`CLAW-INIT`), gives Clawdia claim data and writes Clawdia's decision back into UPM+, and routes the gap-only benefit from UPM+ back to COS.
> **Deployment model:** one Australian App Service; it lodges into both the Australian and the Trupanion UPM+.
> **Back to:** [Component index](README.md) · Insurer views: [Australia](../go-tech-platform/01-australia.md#7-dynamic-clapi) · [Trupanion](../go-tech-platform/02-trupanion.md#7-dynamic-clapi-australian-deployment)

## 1. Deployment picture

![Dynamic CLAPI Australia + Trupanion](../06%20-%20Australia%20-%20Dynamic%20CLAPI%20Australia%20and%20Trupanion.png)

No other environment pictures (Australian deployment only).

## 2. Interfaces for claim submission

Base URL `{dcl}` = `https://ps-syd-prod-dynamicclapi-api.petsure.com.au` (infrastructure summary). COS code uses `https://api-dynamicclaims-prod.petsure.com.au` — see open points.

### 2.1 REST APIs exposed

| # | Kind | Interface | Called by | Auth |
|---|---|---|---|---|
| 1 | REST API | `PUT {dcl}/api/Claims/Lodge/{claimId}` — Lodge Claim → UPM routing (AU or TPN) | COS SubmitClaimAttachment (optional, `Lodge` flag) | Basic |
| 2 | REST API | `POST {dcl}/api/Claims/CLAW-INIT-API` — request the medical assessment (by CRN) | UPM+ AU (and TPN, *inferred*) | Basic |
| 3 | REST API | `POST {dcl}/api/Claims/Write` — assessment write-back → UPM routing | STP / Clawdia | Managed identity (Entra app `api://8e082fac-…`) |
| 4 | REST API | `[TBC] {dcl}/api/claims/…` — load claim / policy data for Clawdia (via the ReadOnly DataService) | STP / Clawdia | Managed identity |
| 5 | REST API | `[TBC]` — gap-only benefit → routing to COS | UPM+ (*inferred* from the Earlier Birds flow matrix); CATCH | Basic |

### 2.2 Outbound calls

| # | Target | Interface |
|---|---|---|
| 6 | UPM Dynamics API AU — lodge | `upmprod.internal.petsure.com.au:9248/PETSURE_UPM_API_BASIC/api/upm/claims/v1.0/lodge` |
| 7 | UPM Dynamics API AU — claims API | `upmprod-capi.internal.petsure.com.au:9248/…/api/upm/claims/v1.0/{write\|inspect\|finish\|return}` |
| 8 | UPM Dynamics API Trupanion — lodge only | `tpupm.internal.petsure.com.au:9148/TRUPANION_PROD_API_BASIC/…/lodge` |
| 9 | STP KeyVault Function | `CLAW-INIT` (`ps-syd-prod-keyvault-func-app.petsure.com.au`) — starts Clawdia |
| 10 | UPM ReadOnly DataService | `ps-syd-prd-claw-readonlydataservice-app` — claim history reads |
| 11 | COS.API | gap benefit (`POST {cos}/api/GapOnly/Benefit`, *inferred*) |

## 3. Databases

| Use | Database | Notes |
|---|---|---|
| **Write** | none directly | Writes go to UPM+ through the UPM Dynamics API |
| **Read only** | none directly | Reads go through the UPM ReadOnly DataService (UPM AU read replica / DWH) |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| Azure Key Vault | `pssydprdclawkv` | Credentials for the UPM Dynamics API (basic auth), switches |
| Azure Event Grid | CLAW topic (via the `CLAW-INIT` proxy) and notifications | Hand-off to Clawdia |
| Entra ID / Managed Identity | App registration `api://8e082fac-…` | Authenticates Clawdia's calls |
| Application Insights | (CLAW App Insights) | Telemetry |
| VNet integration + Hub (Azure Firewall, ExpressRoute, DNS Private Resolver) | `ps-syd-prd-claw-vnet` → `ps-syd-prd-hub-afw` → `ps-syd-prd-hub-erc-at`; `internal.petsure.com.au` via `ps-syd-prd-hub-dnspr` | Outbound path to the on-premises UPM Dynamics API |

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| Shared | — | — | — |
| **Australia PetSure** | **.NET 8** | n/a (App Service) | **App Service** `ps-syd-prd-claw-dynamicclapi-app`, RG `ps-syd-prd-claw-rg`, subscription `sub-prd-vethub-ps` |
| **Trupanion** | .NET 8 | n/a | *On the AU deployment* — TPN lodge endpoint only |
| New Zealand | — | — | Not used (PRTG lists it; the code configures only AU and TPN) |
| Vet Partners | — | — | Not used |

## 6. Open points

- **Base URL conflict** — `api-dynamicclaims-prod.petsure.com.au` (COS code) vs `ps-syd-prod-dynamicclapi-api.petsure.com.au` (infrastructure summary).
- **HTTP methods / routes TBC** for the claim-data reads and the gap-only benefit route; the CLAW-INIT and Write routes come from the Earlier Birds flow matrix.
- **Trupanion scope** — only *lodge* is documented for TPN; whether UPM+ TPN calls CLAW-INIT is not documented.
- **NZ** — PRTG vs code disagreement.
- Earlier Birds retires *Lodge Claim* (DCL-D-01) and changes the meaning of CLAW-INIT (DCL-E-01).
