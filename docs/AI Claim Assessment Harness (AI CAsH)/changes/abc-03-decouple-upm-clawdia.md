# ABC-03 — Decouple UPM / Clawdia

| | |
|---|---|
| **Tier** | 1 · Quick wins |
| **Solution** | [SOL-1 Early Starter](../solutions/early-starter.md) |
| **Problems solved (part)** | [LP-3 Coupling to UPM, LP-2 Late, serial assessment](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-04](abc-04-remove-polling-vethub-cos.md) (deployed — event platform and VetHub events) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

Clawdia starts its assessment when VetHub publishes *Conversation Initiated*, loads claim data from VetHub / COS instead of UPM, finishes early and waits. When UPM requests the medical assessment, Clawdia finds the running workflow by correlation and writes back as today.

## Problem it solves

- **Effect today:** any change to the medical assessment is driven by the UPM claim lifecycle instead of by the Claim Orchestration Service.
- UPM+ → *Request medical assessment* → Dynamic CLAPI `POST api/Claims/CLAW-INIT-API` → KeyVault Function `CLAW-INIT` → Clawdia workflows.
- Clawdia loads claim and policy data through Dynamic CLAPI → UPM ReadOnly DataService (UPM replica, can switch to the primary) over ExpressRoute.
- Before Clawdia can start: VetHub intake → COS polling → CLAPI/DAPI → DS-table poll (~10 min) → UPM duplicate, fraud and bank checks.

See [STP / Clawdia](../../infrastructure/go-tech-components/07-stp-clawdia.md) and the [Earlier Birds as-is flow](<../../../solutions/earlier birds/Earlier birds - high-level solution.md>).

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-03.1 | Event platform | Add | Function *On Conversation Initiated → start Clawdia workflow* (idempotent on `conversationId`) |
| ABC-03.2 | STP – Clawdia | Add | Workflow correlation store `conversationId / CRN → workflowInstanceId` |
| ABC-03.3 | STP – Clawdia | Evolve | Initialise assessment on the event instead of CLAW-INIT |
| ABC-03.4 | STP – Clawdia | Evolve | Load claim data from VetHub / COS before the claim exists in UPM, and map it to the ML environment's existing input (no ML change in Tier 1) |
| ABC-03.5 | STP – Clawdia | Add | Wait state after mapping; expiry for conversations never submitted |
| ABC-03.6 | STP – Clawdia | Evolve | CLAW-INIT finds the waiting workflow; fallback: start a new one |
| ABC-03.7 | Dynamic CLAPI | Evolve | CLAW-INIT means "release the result" (contract unchanged **[TBC]**) |
| ABC-03.8 | COS | Add | Publish *Claim Initiated in COS* (`conversationId`, CRN) |
| ABC-03.9 | Event platform | Add | Function *On Claim Initiated → link CRN to workflow* (only if CLAW-INIT carries the CRN alone) |

Impact analysis per change: [Earlier Birds §4.4](<../../../solutions/earlier birds/Earlier birds - high-level solution.md>).

## Dependencies

- [ABC-04](abc-04-remove-polling-vethub-cos.md) — **deployed first**: event broker and VetHub business events.

## Acceptance criteria

- **AC-1** Given a conversation is initiated in VetHub, when the event is published, then a Clawdia workflow starts without any call from UPM.
- **AC-2** Clawdia loads the claim data it needs from VetHub or COS, not from the UPM replica.
- **AC-3** When UPM requests the assessment, Clawdia finds the running workflow and writes back; if none is found, it starts one.
- **AC-4** The only remaining Clawdia → UPM dependency is the write-back (until a lifecycle-stage lodgement API exists — T1.3).

## Open questions

- Which policy data does Clawdia still need from UPM; can VetHub policy validation (T1.6) provide it?
- Expiry and ML cost of speculative runs for abandoned conversations.
