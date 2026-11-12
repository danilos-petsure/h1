# ABC-05 — Re-host COS.API to App Service

| | |
|---|---|
| **Tier** | 1 · Quick wins |
| **Solution** | [SOL-1 Early Starter](../solutions/early-starter.md) |
| **Problems solved (part)** | [LP-5 Fragile, ageing platform](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | — |
| **Needed by** | ABC-04 (started), ABC-16 (deployed) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

Move COS.API from IIS on Windows VMs to Azure App Service, as a send-only web API that logs to Application Insights, takes its secrets from Key Vault and deploys with slot swaps. Moving COS.API to App Service on .NET 10 is already the agreed long-term option.

## Problem it solves

From the [App Service migration readiness](../../infrastructure/go-tech-components/README.md#app-service-migration-readiness) assessment:

| Item | Finding |
|---|---|
| Hosting | IIS on `PS-PRD-AZS-P3-1/2` (AU), `NZ-PRD-AZ-P3WEB` (NZ), `PS-PRD-AZ-P3WEB` (VP), co-hosted with CLAPI and helper APIs; Sydney VMs with cold backup only |
| Runtime | .NET Framework 4.8, ASP.NET Web API 2 + OWIN |
| Blocker | MSMQ log appender (`PetSure.LogManager`) |
| Remediation | NServiceBus endpoint not send-only; local log paths |
| Operations | Token replacement in config; PowerShell-remoting deploy; App Insights not configured |
| Estimate | .NET 10 upgrade 18–22 days (Confluence *Estimates for IIS Upgrades*) |

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-05.1 | COS.API | Evolve | Log to Application Insights; remove the MSMQ log appender |
| ABC-05.2 | COS.API | Evolve | NServiceBus endpoint send-only (no receive pump, no `EnableInstallers()` in the web process) |
| ABC-05.3 | COS.API | Evolve | Log and temp paths off the local disk |
| ABC-05.4 | COS.API | Evolve | Key Vault references instead of token replacement |
| ABC-05.5 | COS.API | Evolve | .NET 10 **[TBC — same move or later]** |
| ABC-05.6 | App Service (AU, NZ, VP) | Add | Plan and web apps, VNet integration to Service Bus / Event Grid / internal APIs, slots |
| ABC-05.7 | CI/CD | Evolve | `azure/webapps-deploy` instead of PowerShell remoting |
| ABC-05.8 | COS.API IIS sites | Decommission | On `PS-PRD-AZS-P3-1/2`, `NZ-PRD-AZ-P3WEB`, `PS-PRD-AZ-P3WEB` after DNS switch |

## Dependencies

None.

## Acceptance criteria

- **AC-1** COS.API runs on App Service (AU first, then NZ and VP) with the same DNS names for callers.
- **AC-2** No MSMQ dependency remains; logs reach Application Insights.
- **AC-3** No receive pump runs in the web process.
- **AC-4** Secrets come from Key Vault references; deployment uses a slot swap.

## Open questions

- .NET 10 in the same move, or re-host on .NET Framework 4.8 first?
- Order of NZ and VP, given they share the IIS servers with CLAPI and the helper APIs.
