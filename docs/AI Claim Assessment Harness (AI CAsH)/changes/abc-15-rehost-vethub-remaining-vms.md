# ABC-15 — Re-host the remaining VetHub VMs to App Service, or refactor for containers

| | |
|---|---|
| **Tier** | 3 · AI Claim Assessment Harness (platform) |
| **Solution** | Platform modernisation **[solution TBC]** |
| **Problems solved (part)** | [LP-5 Fragile, ageing platform](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-04](abc-04-remove-polling-vethub-cos.md) (started — events reduce what has to move) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

Move VetHub's remaining background processing off the Go Tech VM, to App Service WebJobs, Azure Functions or containers, and remove the legacy VetHub IIS copies and MessageFormat.API.

## Problem it solves

From the [App Service migration readiness](../../infrastructure/go-tech-components/README.md#app-service-migration-readiness) assessment:

| Deployable | Hosting | Findings |
|---|---|---|
| VetHub Windows services | `PS-PRD-AZS-P3-3` | NServiceBus 8 / Topshelf services; MSMQ log appender in all six; GDI-based PDF libraries; binary-only `PetSure.LogManager.dll`; local file writes; pollers (5 s / 60 s / 90 s) without row locking → single instance; legacy `WindowsAzure.ServiceBus` SDK in ProcessConversations (retired 30 Sep 2026 **[to confirm]**); SMTP without TLS |
| MessageFormat.API | IIS on the Go Tech web servers | Decommission planned (2026_R4 Part 3 / R5) |
| Old VetHub IIS copies | `PS-PRD-AZS-P3-1/2`, NZ and VP web servers | Waiting for decommission |

**Options:** App Service WebJobs (closest to today, Windows plan for GDI) · Azure Functions (fits event-triggered work after ABC-04) · containers (Azure Container Apps / Windows containers) · keep on VM.

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-15.1 | VetHub Windows services | Evolve | Log to Application Insights; remove the MSMQ appender |
| ABC-15.2 | VetHub ProcessConversations | Evolve | Replace the legacy `WindowsAzure.ServiceBus` SDK |
| ABC-15.3 | VetHub services | Evolve | Local files to Storage; pollers safe for scale-out, or replaced by events |
| ABC-15.4 | Hosting (WebJobs / Functions / containers **[TBC]**) | Add | Target hosting for the services |
| ABC-15.5 | VetHub Windows services on `PS-PRD-AZS-P3-3` | Decommission | After cut-over |
| ABC-15.6 | MessageFormat.API, legacy VetHub IIS copies | Decommission | AU, NZ, VP |

## Dependencies

- [ABC-04](abc-04-remove-polling-vethub-cos.md) — **started already**: once VetHub publishes events, some pollers no longer need moving.

## Acceptance criteria

- **AC-1** No VetHub component runs on a Go Tech VM.
- **AC-2** No MSMQ dependency remains.
- **AC-3** Background processing runs safely on more than one instance, or is event-triggered.

## Open questions

- Which VetHub pollers disappear after ABC-04?
- One hosting choice for VetHub and COS services ([ABC-16](abc-16-rehost-cos-services.md)), or per component?
