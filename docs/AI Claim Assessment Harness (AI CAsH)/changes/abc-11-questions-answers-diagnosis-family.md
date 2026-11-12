# ABC-11 — Questions and answers per candidate diagnosis family, then predict the diagnosis

| | |
|---|---|
| **Tier** | 3 · AI Claim Assessment Harness |
| **Solution** | [SOL-4 AI Claim Assessment Harness](../solutions/ai-claim-assessment-harness.md) |
| **Problems solved (part)** | [LP-1 All-or-nothing assessment, LP-8 Diagnosis predictions not traceable](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-07](abc-07-enrich-claims-clinical-information-attachment-classification.md), [ABC-01C](abc-01-ml-improvement.md#abc-01c--ml-improvement--gp-model-on-the-enriched-claim-context), [ABC-01E](abc-01-ml-improvement.md#abc-01e--ml-improvement--diagnosis-from-questions-and-answers) (deployed); [ABC-01D](abc-01-ml-improvement.md#abc-01d--ml-improvement--question-answering) (started) |
| **Needed by** | ABC-12, ABC-13, ABC-14 (deployed) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

Clawdia STP becomes the harness. When the model ensemble is not confident, it runs the [assessment path](../cash-high-level-solution.md#35-assessment-path-at-the-end-of-tier-3) (BPMN: [`ai-cash-assessment-path.bpmn`](../diagrams/ai-cash-assessment-path.bpmn)):

1. **Retrieve questions** with their relevant information for the **candidate diagnosis families** returned by the GP model.
2. **Answer in parallel**, using the strategies configured for each question:
   - **Answer via SQL** — deterministic query on structured data;
   - **Answer via ML** — question-answering inference in the ML environment ([ABC-01D](abc-01-ml-improvement.md#abc-01d--ml-improvement--question-answering));
   - **Answer via AI agent** — the agent receives the claim context and the question and returns an answer with its evidence.
3. **Assessor input needed?** — yes when at least one answer comes from the AI agent and needs confirmation, or at least one question is **assessor-led**. Then the claim goes to the quick fix bay ([ABC-12](abc-12-quick-fix-bays-for-answers.md)).
4. **Predict the diagnosis** from all the questions and answers ([ABC-01E](abc-01-ml-improvement.md#abc-01e--ml-improvement--diagnosis-from-questions-and-answers)).
5. **Confidence low?** — the claim goes to the AI-assisted manual medical assessment ([ABC-13](abc-13-ai-assisted-manual-medical-assessment.md)); otherwise the assessment is ready.

## Problem it solves

- When the ensemble (Easy Cohort, GP model, case linking) isn't confident, nothing more specific is tried and the claim goes to full manual assessment (LP-1).
- The prediction can't be traced to the clinical questions and evidence behind it (LP-8).
- A Medical Assessment configuration prototype (questions, questionnaires, segments, diagnosis codes) exists **[TBC — status and ownership]**.

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-11.1 | STP – Clawdia (harness) | Evolve | Run the assessment path after a low-confidence ensemble result; checkpoints, pause / resume, timeouts |
| ABC-11.2 | Question catalogue | Add | Questions per diagnosis family with the relevant information each needs, the allowed answer strategies (SQL / ML / AI agent) and an *assessor-led* flag; business-managed, versioned, approved (builds on the configuration prototype **[TBC]**) |
| ABC-11.3 | STP – Clawdia (harness) | Add | Retrieve the questions for the candidate families returned by the GP model (ABC-01C.4) |
| ABC-11.4 | SQL answerer | Add | Deterministic queries over the claim context store and history **[sources TBC]** |
| ABC-11.5 | STP – Clawdia (harness) | Evolve | Call question answering in the ML environment (ABC-01D) |
| ABC-11.6 | AI agent | Add | Input: claim context + question; output: answer with evidence citations. Hosting and LLM **[TBC — OQ-06]** |
| ABC-11.7 | STP – Clawdia (harness) | Add | *Assessor input needed?* rule (AI-agent answers to confirm, or assessor-led questions) |
| ABC-11.8 | STP – Clawdia (harness) | Evolve | Call diagnosis-from-Q&A (ABC-01E) and apply the confidence threshold per family |
| ABC-11.9 | Decision trace | Add | Questions, answers, strategy, sources, versions, assessor actions per claim |

## Dependencies

- [ABC-07](abc-07-enrich-claims-clinical-information-attachment-classification.md), [ABC-01C](abc-01-ml-improvement.md#abc-01c--ml-improvement--gp-model-on-the-enriched-claim-context), [ABC-01E](abc-01-ml-improvement.md#abc-01e--ml-improvement--diagnosis-from-questions-and-answers) — **deployed first**.
- [ABC-01D](abc-01-ml-improvement.md#abc-01d--ml-improvement--question-answering) — **started already**: the harness can go live with SQL and AI-agent answers and add ML answers question by question.

## Acceptance criteria

- **AC-1** Every question has an answer with strategy, source and confidence, or is routed to an assessor.
- **AC-2** The predicted diagnosis lists the answers it relied on.
- **AC-3** The question catalogue and thresholds are versioned configuration, approved under the AI operating model.
- **AC-4** On the evaluation set, STP rises over the ensemble-only baseline **[target TBC]**.
- **AC-5** AI never declines a claim; a decline is always an assessor's decision.

## Open questions

- Who owns the question catalogue, and who decides which questions are assessor-led (OQ-04)?
- Where does the AI agent run, and which LLM (OQ-06)?
