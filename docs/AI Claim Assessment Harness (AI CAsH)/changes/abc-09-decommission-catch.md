# ABC-09 — Decommission CATCH / CATCH2

| | |
|---|---|
| **Tier** | 2 · Round 2 |
| **Solution** | [SOL-3 Quick Fix Bay](../solutions/quick-fix-bay.md) |
| **Problems solved (part)** | [LP-7 Fragmented exception handling, LP-5 Fragile, ageing platform](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-08](abc-08-introduce-quick-fix-bays.md) (deployed) |
| **Status** | Draft — CATCH2 scope **[TBC]** |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

Move every CATCH function still in use into the quick fix bays (or into UPM, or retire it by decision), then remove CATCH in AU, NZ and VP.

## Problem it solves

CATCH is a second place where the claims team handles claim exceptions, next to UPM, on legacy hosting. What the sources show:

| Part | Detail |
|---|---|
| UI and API | CATCH.API and CATCH UI on the IIS servers `PS-PRD-AZS-P3-1/2` (PRTG map) |
| Data | CATCH tables in `COS_PROD` / COS NZ DB: users, roles, events, Gap-Only; `ClaimGroup`, `ClaimEvent`, `Notification` |
| Events | COS publishes `PetSure.Catch.Notification` to Event Grid `ps-prod-egt-eventnotifications` → CATCH Notification Function App → SignalR function → SignalR API |
| Service Bus | Topic `p3-prod-sbt-claimprogress-trackers` consumed by the CATCH Notification Function App |
| Actions | `ClaimAction` from COS.API / CATCH → `ReflowClaim` |
| Other | CATCH calls Dynamic CLAPI with basic authentication; NZ and VP have their own CATCH |

**CATCH2:** not found in any source **[TBC]**.

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-09.1 | Quick fix bays | Evolve | Take over the CATCH functions in use (work queues, reflow, gap-only monitoring **[TBC]**) |
| ABC-09.2 | COS | Evolve | Stop publishing `PetSure.Catch.Notification`; reflow requested from the bays |
| ABC-09.3 | Dynamic CLAPI | Evolve | Remove the CATCH caller and its basic-auth credentials |
| ABC-09.4 | CATCH UI and API | Decommission | AU, NZ, VP |
| ABC-09.5 | CATCH Notification and SignalR functions, SignalR API | Decommission | With their Event Grid topic subscriptions and Service Bus subscription |
| ABC-09.6 | CATCH tables in the COS DBs | Decommission | After data retention is agreed |
| ABC-09.7 | CATCH2 | Decommission **[TBC]** | Scope unknown |

## Dependencies

- [ABC-08](abc-08-introduce-quick-fix-bays.md) — **deployed first**.

## Acceptance criteria

- **AC-1** Every CATCH function in use has a new home or is retired by decision.
- **AC-2** No user logs in to CATCH; its events and actions have no consumer.
- **AC-3** All CATCH resources are removed in AU, NZ and VP.

## Open questions

- What is CATCH2, and is it live?
- Who uses CATCH today, for which tasks and volumes?
- Is gap-only monitoring in CATCH needed by the vet-channel team outside claims assessment?
