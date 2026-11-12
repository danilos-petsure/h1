# ABC-16 — Re-host COS services to App Service, or refactor COS into Logic Apps

| | |
|---|---|
| **Tier** | 3 · AI Claim Assessment Harness (platform) |
| **Solution** | Platform modernisation **[solution TBC]** |
| **Problems solved (part)** | [LP-5 Fragile, ageing platform, LP-3 Coupling to UPM](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-05](abc-05-rehost-cos-api-app-service.md) (deployed), [ABC-06](abc-06-remove-clapi-dapi-dependencies.md) (deployed — fewer services to move) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

Move COS's sagas, workers and remaining pollers off the Go Tech VMs, either re-hosted as App Service WebJobs next to COS.API or refactored into Logic Apps (Standard, stateful workflows), and retire the VMs together with VetHub's ([ABC-15](abc-15-rehost-vethub-remaining-vms.md)).

## Problem it solves

| Item | Finding |
|---|---|
| Hosting | Windows services on AU `PS-PRD-AZS-P3-3`, NZ `NZ-PRD-AZ-P3APP`, VP `PS-PRD-AZ-P3APP` |
| Services | ClaimSubmissionSaga, ClaimAttachmentSubmissionSaga, ValidatePolicy, SubmitClaims, ClaimsAutomationIntegration, ClaimActions, ConsolidateClaimAttachments, SubmitClaimAttachment, ClaimAttachmentActions, VetHub Claims Saga + workers, AddAttachments saga + workers, UPM Status Poller |
| Runtime | .NET Framework 4.8; NServiceBus over Azure Service Bus; SQL saga persistence |
| Blockers | Windows services; MSMQ log appender; continuous background work |
| Remediation | Local temp files and `ConsolidatedFiles\`; iText licence file on disk; pollers with static state → single instance |

**Options:** re-host on App Service WebJobs (keeps NServiceBus code; already proposed with Early Starter) · refactor into Logic Apps (same platform as Clawdia and Claims Automation; re-write of saga logic) · containers · keep on VM.

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-16.1 | COS services | Evolve | Log to Application Insights; remove the MSMQ appender |
| ABC-16.2 | COS services | Evolve | Files to Storage; iText licence from Key Vault / storage |
| ABC-16.3 | COS UPM Status Poller | Evolve | Safe for scale-out, or replaced by events from UPM **[TBC]** |
| ABC-16.4 | Hosting (WebJobs or Logic Apps Standard **[TBC]**) | Add | Target hosting for sagas and workers |
| ABC-16.5 | COS Windows services | Decommission | AU, NZ, VP, after cut-over |
| ABC-16.6 | Go Tech VMs `PS-PRD-AZS-P3-3`, `NZ-PRD-AZ-P3APP`, `PS-PRD-AZ-P3APP` | Decommission | Once VetHub services (ABC-15) are also off |
| ABC-16.7 | LogManager.Handler | Decommission | Once no app logs through MSMQ |

## Dependencies

- [ABC-05](abc-05-rehost-cos-api-app-service.md) — **deployed first**: COS.API is already on App Service.
- [ABC-06](abc-06-remove-clapi-dapi-dependencies.md) — **deployed first**: CLAPI-based steps are gone, so fewer services move.

## Acceptance criteria

- **AC-1** No COS service runs on a Go Tech VM in AU, NZ or VP.
- **AC-2** No MSMQ dependency remains.
- **AC-3** A decision record compares re-hosting with refactoring into Logic Apps (effort, risk, run cost, team skills).

## Open questions

- Does the ClaimSubmissionSaga belong in COS at all once the harness exists, or in a common claims pathway (H2)?
