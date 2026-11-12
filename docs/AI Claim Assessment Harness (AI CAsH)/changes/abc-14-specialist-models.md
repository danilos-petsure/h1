# ABC-14 — ML Improvement · Specialist models

| | |
|---|---|
| **Category** | ML Improvement (see also [ABC-01](abc-01-ml-improvement.md)) |
| **Tier** | 3 · AI Claim Assessment Harness (candidates may move to Tier 2 **[TBC — OQ-12]**) |
| **Solution** | [SOL-4 AI Claim Assessment Harness](../solutions/ai-claim-assessment-harness.md) |
| **Problems solved (part)** | [LP-1 All-or-nothing assessment](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-11](abc-11-questions-answers-diagnosis-family.md), [ABC-01C](abc-01-ml-improvement.md#abc-01c--ml-improvement--gp-model-on-the-enriched-claim-context) (deployed) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

Add specialist models behind the existing **ML router** for what the GP model and the case linking model don't cover well. Candidates:

- **Multiple-diagnosis models** — claims with more than one condition per invoice.
- **Pre-existing condition models** — whether a condition predates the policy, using the animal case history in the claim context.
- Models for diagnosis families with a high fall-out rate (for example dermatology, orthopaedics, dental, oncology) **[selection TBC]**.

The router calls them per claim, per diagnosis family or per question, and records which model produced each result.

## Problem it solves

- Specialist and multi-diagnosis models were out of scope for STP25; claims in these areas still fall out (LP-1).

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-14.1 | ML environment | Add | Specialist model endpoints, chosen by volume × automation opportunity × accuracy |
| ABC-14.2 | ML router | Evolve | Route by claim type, diagnosis family or question; standard contract (input claim context, output answers / diagnoses, confidence, version) |
| ABC-14.3 | STP – Clawdia (harness) | Evolve | Record which model produced each answer or diagnosis in the decision trace |
| ABC-14.4 | ML environment — monitoring | Add | Per-model accuracy, drift, kill switch; AI operating model release gates |

## Dependencies

- [ABC-11](abc-11-questions-answers-diagnosis-family.md), [ABC-01C](abc-01-ml-improvement.md#abc-01c--ml-improvement--gp-model-on-the-enriched-claim-context) — **deployed first**.

## Acceptance criteria

- **AC-1** A new model is added through the router contract without changing the harness process.
- **AC-2** Each result records the model and version that produced it.
- **AC-3** A model can be switched off without stopping the assessment (controlled degradation).

## Open questions

- Which specialist models first? Should multiple-diagnosis and pre-existing condition models come in Tier 2 (OQ-12)?
