# ABC-10 — Claim Visualiser: the claim from a medical assessment point of view

| | |
|---|---|
| **Tier** | 2 · Round 2 |
| **Solution** | [SOL-3 Quick Fix Bay](../solutions/quick-fix-bay.md) |
| **Problems solved (part)** | [LP-7 Fragmented exception handling, LP-8 Diagnosis predictions not traceable](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-07](abc-07-enrich-claims-clinical-information-attachment-classification.md) (started — facts and attachment types) |
| **Needed by** | ABC-08, ABC-13 (deployed) |
| **Status** | Draft |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

A read-only UI that shows a claim the way a medical assessor thinks about it, with every automated statement linked to its evidence. It is the base UI of the quick fix bays.

| Area | Content |
|---|---|
| Claim | Invoice lines with treatment codes; predicted diagnosis codes per line with confidence |
| Evidence | Attachments by type, clinical notes with highlighted facts and their sources |
| Automation trace | Models and rules run, results, confidence, why the claim fell out |
| History | Prior claims and linked cases for the pet (case linking) |

## Problem it solves

- Assessors work in UPM, where the claim is a policy and invoice record and the evidence is one merged PDF.
- Clawdia's intermediate results sit in `PSPRODClaimsAutoDB` and the Clawdia audit topic; they are not shown to the person who takes over.
- Assessors rebuild the medical picture by hand on every fall-out (LP-7) and can't see why a code was predicted (LP-8).

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-10.1 | Claim Visualiser (web app) | Add | Read-only medical view of a claim |
| ABC-10.2 | STP – Clawdia / `PSPRODClaimsAutoDB` | Evolve | Read API for the automation trace (steps, results, confidence, rules) |
| ABC-10.3 | Claim context store | Evolve | Read API for clinical information and attachment types, with provenance |
| ABC-10.4 | UPM+ | Evolve **[TBC]** | Deep link from the claim to the visualiser |

## Dependencies

- [ABC-07](abc-07-enrich-claims-clinical-information-attachment-classification.md) — **started already**: the visualiser can ship with the automation trace first and add clinical information and attachment types as they become available.

## Acceptance criteria

- **AC-1** For any claim, an assessor sees the medical view in one screen without opening UPM.
- **AC-2** Every automated statement links to its evidence.
- **AC-3** The quick fix bays (ABC-08, ABC-12, ABC-13) are built on it.

## Open questions

- Embedded in UPM (Gratex) or a separate Go Tech web app with a deep link?
