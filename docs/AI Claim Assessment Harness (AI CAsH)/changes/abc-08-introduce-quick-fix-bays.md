# ABC-08 — Introduce quick fix bays

| | |
|---|---|
| **Tier** | 2 · Round 2 |
| **Solution** | [SOL-3 Quick Fix Bay](../solutions/quick-fix-bay.md) (foundation) |
| **Problems solved (part)** | [LP-1 All-or-nothing assessment, LP-7 Fragmented exception handling](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-10](abc-10-claim-visualiser.md) (deployed — base UI), [ABC-03](abc-03-decouple-upm-clawdia.md) (deployed — Clawdia can wait and resume) |
| **Related** | [ABC-09 Decommission CATCH](abc-09-decommission-catch.md), [ABC-10 Claim Visualiser](abc-10-claim-visualiser.md) |
| **Needed by** | ABC-09, ABC-12, ABC-13 (deployed) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

When automation can't finish a claim, it raises a **quick fix task** for one specific issue instead of falling out to full manual assessment. A person resolves the issue in a bay built on the Claim Visualiser, and the claim resumes on the automated path from the step that raised it.

## Problem it solves

- Automation paradigm today: **STP or manual**.
- Exceptions are spread across COS *Action Required* claims, CATCH work queues (`ClaimGroup`, `ClaimEvent`, `Notification`) and reflow (`ClaimAction` → `ReflowClaim`), and UPM's task lists.
- Clawdia's fall-out reason is not presented as an actionable task.

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-08.1 | Quick fix task service | Add | Task model (type, claim, issue, evidence, proposal, outcome, resume point), assignment, SLA, decision trace |
| ABC-08.2 | Quick fix bay UI | Add | First bay type on the Claim Visualiser **[candidate: attachment classification review or diagnosis confirmation]** |
| ABC-08.3 | STP – Clawdia | Evolve | Raise a task instead of falling out; resume from the step on *Quick Fix Completed* |
| ABC-08.4 | Event platform | Evolve | *Quick Fix Raised* / *Quick Fix Completed* events |
| ABC-08.5 | Monitoring | Add | Quick fix rate, full manual fall-out, time per task |

## Dependencies

- [ABC-10](abc-10-claim-visualiser.md) — **deployed first**: the bay is built on the visualiser.
- [ABC-03](abc-03-decouple-upm-clawdia.md) — **deployed first**: Clawdia's wait state and correlation make pause / resume possible.

## Acceptance criteria

- **AC-1** A task carries the specific issue, the evidence and the automated proposal with its confidence.
- **AC-2** Completing a task resumes the automated path from the step that raised it.
- **AC-3** Each decision is recorded (who, what, when).
- **AC-4** At least one bay type is live end to end.

## Open questions

- Build in-house, extend the UPM Claims Advisor experience (Gratex), or use a workflow / low-code tool?
- Which bay type brings the biggest STP gain first?
