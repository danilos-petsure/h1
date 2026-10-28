# ML Environment (ClawGP)

> **Role in claim submission:** hosts the ClawGP (Clawdia GP) model that predicts diagnoses. STP / Clawdia calls it during enrichment.
> **Deployment model:** Australia only (one managed online endpoint).
> **Back to:** [Component index](README.md) · Insurer view: [Australia → STP / Clawdia and the ML environment](../go-tech-platform/01-australia.md#8-stp--clawdia-and-the-ml-environment)

## 1. Deployment picture

![ML Environment Australia](../08%20-%20Australia%20-%20ML%20Environment%20Australia.png)

No other environment pictures.

## 2. Interfaces for claim submission

| # | Kind | Interface | Called by |
|---|---|---|---|
| 1 | REST API | `POST {scoring URI}` of the managed online endpoint `ps-prd-claimsauto-gp` (Azure ML standard `…/score`, *inferred*) — diagnose-code prediction, case linking | STP KeyVault Function (GP model call) and DBCommand Function (GP enrichment) |
| 2 | REST API (*TBC*) | "Sophia Junior API (reads Sophia Junior model)" | Claims Automation — from the Earlier Birds flow matrix; not confirmed to be hosted here |

## 3. Databases

| Use | Database | Notes |
|---|---|---|
| **Write** | none | Stateless scoring |
| **Read only** | none | Model artefact only |

## 4. Azure managed services used

| Managed service | Resource | How |
|---|---|---|
| Azure Machine Learning workspace | `ps-prd-ml-ws-claimsauto` (RG `ps-prod-ml-claimsauto`) | Model registry and endpoint management |

The workspace's dependent resources (storage, registry, Key Vault, App Insights) are not documented.

## 5. Current technology by environment

| Environment | .NET | IIS | Azure managed services hosting the component |
|---|---|---|---|
| Shared | — | — | — |
| **Australia PetSure** | n/a (ML model artefact; runtime TBC) | n/a | **Azure Machine Learning** managed online endpoint `ps-prd-claimsauto-gp` (subscription not confirmed) |
| **Trupanion** | n/a | n/a | *On the AU deployment* |
| New Zealand | — | — | Not used |
| Vet Partners | — | — | Not used |

## 6. Open points

- **Subscription** of the workspace is not confirmed.
- **Scoring URI, auth mode and model runtime** are not documented.
- **Sophia Junior model** — whether Claims Automation's model is also served from this workspace is TBC.
