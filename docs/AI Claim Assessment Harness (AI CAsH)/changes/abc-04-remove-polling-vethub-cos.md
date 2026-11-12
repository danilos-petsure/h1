# ABC-04 — Remove polling mechanisms from VetHub to COS

| | |
|---|---|
| **Tier** | 1 · Quick wins |
| **Solution** | [SOL-1 Early Starter](../solutions/early-starter.md) |
| **Problems solved (part)** | [LP-2 Late, serial assessment, LP-5 Fragile, ageing platform](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-05](abc-05-rehost-cos-api-app-service.md) (started — the new COS entry point should land on App Service) |
| **Needed by** | ABC-03, ABC-06, ABC-07 (deployed); ABC-15 (started) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

VetHub becomes an event publisher. When a conversation submission is complete, VetHub publishes *Conversation Submission Completed*; an Azure Function calls a new COS API that starts the claim from the conversation. COS no longer polls VetHub. This ABC introduces the event platform that later ABCs reuse.

## Problem it solves

- `COS.Poll.Services.VetHub` (Topshelf Windows service on `PS-PRD-AZS-P3-3`, and on the NZ / VP app servers) calls `GET api/claim/newconversations?claimType=&NumberofClaims=` per insurer and sends `StartPoll` to the VetHub Claims Saga.
- The polling interval sits on the critical path of every claim; the poller keeps static rate-limit state, so it runs as a single instance.
- Other polls on the path (COS UPM Status Poller, UPM DS-table poll, VPMS outcome polling, VetHub's own pollers) are out of scope here.

See [COS flow model — VetHub Poller](../../infrastructure/go-tech-components/02a-cos-flow-model.md).

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-04.1 | Event platform | Add | Broker namespace (**Azure Service Bus or Event Grid [TBC]**), VetHub topic, COS topic, subscriptions, dead-letter, alerting; event contract catalogue and schema validation |
| ABC-04.2 | VetHub | Add | Publish *Conversation Initiated*, *Insurer Routing Context Calculated*, *Conversation Submission Completed* (transactional outbox) |
| ABC-04.3 | VetHub | Evolve | Conversation data model: explicit *submission completed* state |
| ABC-04.4 | Event platform | Add | Function *On Conversation Submission Completed → start claim in COS* (idempotent on `conversationId`) |
| ABC-04.5 | COS.API | Add | *Start claim from conversation* API (idempotent on `conversationId`) |
| ABC-04.6 | COS services | Evolve | VetHub Claims Saga started by command from COS.API instead of `StartPoll` |
| ABC-04.7 | COS services | Decommission | `COS.Poll.Services.VetHub` (AU, NZ, VP) |
| ABC-04.8 | VetHub | Decommission | `newconversations` query used by COS, once no other consumer is confirmed |

Impact analysis per change: [Earlier Birds §4.1–4.3](<../../../solutions/earlier birds/Earlier birds - high-level solution.md>).

## Dependencies

- [ABC-05](abc-05-rehost-cos-api-app-service.md) — **started already**: ABC-04.5 is built on the re-hosted COS.API. It can ship on IIS if ABC-05 slips, at the cost of re-testing after the move.

## Acceptance criteria

- **AC-1** Given a conversation submission is complete, when VetHub publishes *Conversation Submission Completed*, then COS starts the claim without polling.
- **AC-2** A redelivered or duplicated event does not create a second claim.
- **AC-3** Failed events are dead-lettered and alerted; none is silently dropped.
- **AC-4** The VetHub poller and the query it uses are retired.

## Open questions

- Broker choice (Service Bus vs Event Grid).
- Does any other consumer use the `newconversations` endpoint?
- Should attachments be carried by reference in the event rather than downloaded by COS?
