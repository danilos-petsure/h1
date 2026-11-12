# ABC-13 — Introduce AI-assisted manual medical assessment

| | |
|---|---|
| **Tier** | 3 · AI Claim Assessment Harness |
| **Solution** | [SOL-3 Quick Fix Bay](../solutions/quick-fix-bay.md) (expanded) |
| **Problems solved (part)** | [LP-1 All-or-nothing assessment, LP-7 Fragmented exception handling, LP-8 Diagnosis predictions not traceable](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-08](abc-08-introduce-quick-fix-bays.md), [ABC-10](abc-10-claim-visualiser.md), [ABC-11](abc-11-questions-answers-diagnosis-family.md) (all deployed) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

The **ultimate quick fix bay**: a full manual medical assessment *assisted* by AI — pre-filled answers, proposed diagnoses with evidence, highlighted gaps — before the claim is managed in UPM. The assessor accepts, edits or rejects each proposal; the outcome is written back through the same path as an automated assessment.

## Problem it solves

- Fall-out claims are assessed manually in UPM from the raw evidence, with nothing from the automation that already ran (LP-1, LP-7).
- The assessor can't see why the automation proposed what it did (LP-8).

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-13.1 | Quick fix bay UI | Add | Manual medical assessment bay on the Claim Visualiser, with harness proposals per question and diagnosis |
| ABC-13.2 | STP – Clawdia (harness) | Evolve | Hand over low-confidence claims with all proposals and the trace |
| ABC-13.3 | Dynamic CLAPI *Write* | Evolve **[TBC]** | Accept human-completed assessments (same contract, marked as human decision) — or a lifecycle-stage API (T1.3) |
| ABC-13.4 | UPM+ | Evolve **[TBC]** | Manual medical assessment step reduced to claims the bay can't complete |

## Dependencies

- [ABC-08](abc-08-introduce-quick-fix-bays.md), [ABC-10](abc-10-claim-visualiser.md), [ABC-11](abc-11-questions-answers-diagnosis-family.md) — **deployed first**.

## Acceptance criteria

- **AC-1** The assessor sees the Claim Visualiser plus proposals with evidence and confidence.
- **AC-2** The final assessment is written to UPM through the standard write path.
- **AC-3** Claims not completed here go to UPM's manual path with the reason recorded.
- **AC-4** AI never declines a claim; any decline is a recorded human decision.
- **AC-5** AHT on assisted manual assessments is lower than the unassisted baseline **[target TBC]**.

## Open questions

- Which part of today's UPM manual assessment moves into this bay, and which stays in UPM?
