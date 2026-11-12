# ABC-12 — Introduce quick fix bays for answers

| | |
|---|---|
| **Tier** | 3 · AI Claim Assessment Harness |
| **Solution** | [SOL-3 Quick Fix Bay](../solutions/quick-fix-bay.md) (expanded) |
| **Problems solved (part)** | [LP-1 All-or-nothing assessment](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-08](abc-08-introduce-quick-fix-bays.md) (deployed), [ABC-11](abc-11-questions-answers-diagnosis-family.md) (deployed) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

The "Quick fix bay: assessor confirms and answers" user task of the [assessment path](../cash-high-level-solution.md#35-assessment-path-at-the-end-of-tier-3). The assessor sees only what needs a person — **AI-agent answers to confirm or correct**, and **assessor-led questions** to answer — with the evidence and the harness's best guess, and the harness continues with the diagnosis prediction.

## Problem it solves

- Without this bay, any answer that needs a person would still send the whole claim to manual assessment (LP-1).

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-12.1 | Quick fix bay UI | Add | Answers bay: AI-agent answers to confirm, assessor-led questions, evidence, best guess |
| ABC-12.2 | Quick fix task service | Evolve | Task type *answers*; routing by diagnosis family / skill |
| ABC-12.3 | STP – Clawdia (harness) | Evolve | Raise answers tasks; resume at the diagnosis prediction on completion |
| ABC-12.4 | ML environment | Evolve | Assessor answers fed back as labelled data (ABC-01D.3) |

## Dependencies

- [ABC-08](abc-08-introduce-quick-fix-bays.md) — **deployed first** (task model and bay UI).
- [ABC-11](abc-11-questions-answers-diagnosis-family.md) — **deployed first** (questions and answers).

## Acceptance criteria

- **AC-1** An answers task lists only the answers to confirm and the assessor-led questions, with evidence.
- **AC-2** When the assessor completes the task, the harness predicts the diagnosis with the confirmed answers.
- **AC-3** Every assessor answer is stored with who, when and the evidence shown.
- **AC-4** Median handling time of an answers task is lower than a full manual assessment **[target TBC]**.

## Open questions

- Who answers: claims assessors, vet nurses, clinical specialists?
- SLA, and what happens when a task is not done in time?
