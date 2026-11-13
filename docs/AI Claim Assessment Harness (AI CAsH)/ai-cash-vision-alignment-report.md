# AI CAsH — Alignment report: architecture vision v0.3 vs existing design documents

| | |
|---|---|
| **Baseline (source of truth)** | [AI CAsH — Architecture Vision](ai-cash-architecture-vision.md) · v0.3 · 13 Nov 2026 (text and `diagrams/vision-*.png`) |
| **Compared** | [High-level solution v0.3](cash-high-level-solution.md) (3 Nov) · every `.md` in [`solutions/`](solutions/), [`solutions/tools/`](solutions/tools/) and [`changes/`](changes/) |
| **Date** | 13 Nov 2026 |
| **Purpose** | For each document: what changed in the design, what to remove, what to add, what contradicts the vision |

**How to read.** Section 1 lists the decisions in the vision as **V-nn**, so the rest of the report can refer to them. Section 2 shows the cross-cutting replacements that touch many documents. Section 3 goes document by document. Section 4 proposes the new changes (ABCs) the vision needs. Section 5 lists the non-markdown artefacts to refresh, section 6 the points inside the vision itself that need a decision, and section 7 a suggested order of work.

Where a vision statement is open to two readings, the report says so and marks it **[confirm]** instead of guessing.

---

## 1. Decisions in the architecture vision (the new baseline)

| # | Decision | Where in the vision |
|---|---|---|
| **V-01** | **Two event buses.** *Conversation event bus* (VetHub): *conversation initiated*, *vetXml submitted*, *attachment uploaded*, *conversation completed*. *Clawdia event bus*: *medical assessment completed*, *medical assessment fell out*. Broker (Service Bus or Event Grid) is still open. | §2.1 picture, §5 (OQ-02) |
| **V-02** | **Clawdia starts *enriching the claim context* from the first conversation event.** This is enrichment, not the assessment. No ML change in Tier 1. | §2.1, §3.1 |
| **V-03** | **An Azure Function on *conversation completed*** runs fuzzy matching (FuzzyWuzzy): calculates the insurer / UPM instance, retrieves the service provider id (the VetHub GUID travels in the VetXml; the UPM id saved in VetHub is ignored), auto-corrects the policy id and initiates COS. Australia is the default; the claim can be reflowed if the policy is validated manually. | D3, §2.2 |
| **V-04** | **COS orchestrates the claim:** Save CRN → Validate policy → Treatment codes via Claims Automation (Sophia Jr) → **in parallel** lodge claim + treatment lines in UPM **and** request the medical assessment → wait for *medical assessment completed* → **Write, Inspect, Finish** in UPM. On *medical assessment fell out* → handle fall-out → **Return** in UPM. | §2.1 picture and caption |
| **V-05** | **Clawdia is decoupled from UPM in both directions:** not started by UPM (no CLAW-INIT), never writes to UPM. COS gets the diagnosis, duplicates the invoice line items and hands the claim to UPM. | D2, §2.1 |
| **V-06** | **UPM Dedicated Azure Functions, one set per UPM instance** (AU, Trupanion, NZ), replace **CLAPI, DAPI and Dynamic CLAPI**. Operations shown: *Submit Claim, Submit Attachment, Finish Submit Claim, Sync Lodge* (DS\* tables and UPM Dynamics API); *Write, Inspect, Finish*; *Return*. | D1, §2.1, §2.4 |
| **V-07** | **One global, insurer-aware COS** for all insurers, on App Service + Container Apps and/or Logic Apps, with insurer-specific data behind the **Insurer Related COS Repository** (Azure Functions). Option: decommission COS services and move COS to Logic Apps. | §2.2, §2.4, §3.3 |
| **V-08** | **One copy of each attachment** (today VetHub and COS both keep one in blob storage). New change, not yet in `changes/`. | D1, §5 |
| **V-09** | **Tier 2 ML:** **PetBERT-ICD** maps the consultation notes into the **ICD-11** ontology; **OCR + Classifier** classifies the attachments into the **ICD-11** ontology; the GP model uses the richer context. | D4, §3.1 |
| **V-10** | **Tier 2 Quick Fix Bay — two bays** (analysis to be completed): **Manual assessment** (raised on a Clawdia error, AI-assisted, publishes *medical assessment completed*, no integration with the CATCH notification flow) and **Policy validation** (raised on a failed policy validation in COS, hard dependency on CATCH task allocation). | §3.1, §3.2 |
| **V-11** | **ABC-15 and ABC-16 move from Tier 3 to Tier 2** ("could be part of Tier 1 as well"). No VMs left on the claim path at the end of Tier 2. | §3.3, §5 |
| **V-12** | **Tier names:** 1 · Quick wins; 2 · Round 2 – dependencies; 3 · **AI Claims**. Clawdia becomes the AI Claim Assessment Harness in Tier 3; learning loop; automatic audit analysis and improvement proposals. | §1, §4 |
| **V-13** | **Open business question:** appetite to automate New Zealand. | §2.4 |
| **V-14** | **Guardrails:** automated-first; benefit calculation and payment stay in UPM; AI never declines; small reversible steps. | §1, §5 |
| **V-15** | **Infrastructure view by insurer** (as is and to be) is now part of the architecture; per-insurer COS / CLAPI / DAPI stacks are a problem in their own right. | §2.3, §2.4 |

---

## 2. Cross-cutting replacements

These replacements touch several documents. Section 3 refers to them as **X-nn**.

| # | Obsolete design element | Replaced by (vision) | Documents affected |
|---|---|---|---|
| **X-01** | Clawdia **starts the assessment** on *Conversation Initiated*, finishes early, **waits**, and is **released by CLAW-INIT** from UPM | Clawdia **enriches** from the first event (V-02); **COS requests** the assessment after treatment codes (V-04); no CLAW-INIT | HLS, early-starter, ABC-03, ABC-07, ABC-08, SOL-2, SOL-3, target-application diagram |
| **X-02** | Clawdia **writes** the result to UPM (directly or through Dynamic CLAPI *Write*) | Clawdia **publishes** *medical assessment completed / fell out*; **COS** writes through the UPM Dedicated Azure Functions (V-04, V-05) | HLS (terminology, §3.5, §3.6), early-starter, ABC-03, ABC-13, SOL-3, SOL-4, BPMN |
| **X-03** | COS lodges **directly in DAPI and the UPM Dynamics API**; DAPI kept (evolved); Dynamic CLAPI only loses *Lodge Claim* | **UPM Dedicated Azure Functions** per UPM; **CLAPI, DAPI and Dynamic CLAPI all removed** (V-06) | HLS, early-starter, ABC-02, ABC-06, ABC-09, ABC-13, SOL-3 |
| **X-04** | **VetHub calculates the insurer routing context** once and publishes *Insurer Routing Context Calculated*; COS has a routing-context resolver | **Azure Function on *conversation completed*** with fuzzy matching decides insurer, UPM and service provider (V-03) | ABC-02, ABC-04, ABC-06, early-starter, SOL-3 task model |
| **X-05** | COS **per insurer** (AU, NZ, VP) re-hosted on App Service | **One global, insurer-aware COS** + Insurer Related COS Repository (V-07) | HLS, early-starter, ABC-05, ABC-16 |
| **X-06** | Event names *Conversation Submission Completed*, *Insurer Routing Context Calculated*, *Claim Initiated in COS*, *Claim Lodged in UPM*, *Quick Fix Raised / Completed* | *conversation initiated*, *vetXml submitted*, *attachment uploaded*, *conversation completed*; *medical assessment completed*, *medical assessment fell out* (V-01) | ABC-03, ABC-04, ABC-08, early-starter, SOL-3 |
| **X-07** | Platform modernisation (ABC-15, ABC-16) in **Tier 3** | **Tier 2** (V-11) | HLS, ABC-15, ABC-16, SOL list |
| **X-08** | Attachment taxonomy = **document types** (clinical history, lab result, imaging, invoice…); extraction model "e.g. PetBERT or LLM [TBC]" | **PetBERT-ICD** and classification **into ICD-11** (V-09) — see the [confirm] in ABC-01A | HLS, ABC-01, ABC-07, SOL-2, Claim Context |
| **X-09** | First Tier 2 bay **[TBC]** (attachment review or diagnosis confirmation); the bay **resumes Clawdia** from a checkpoint | **Manual assessment** and **Policy validation** bays; the manual bay **publishes *medical assessment completed***; the policy bay resumes COS (V-10) | HLS, ABC-08, ABC-09, SOL-3 |
| **X-10** | Multiple diagnoses per line item: **five open options** (A, B1, B2, D1, D2) | The vision describes **one flow**: lodge in parallel with the assessment, then COS writes with duplicated line items (V-04, V-05) — see early-starter §9 below | early-starter, HLS (ABC-17 missing), Claim Context |

---

## 3. Document-by-document analysis

### 3.1 [`cash-high-level-solution.md`](cash-high-level-solution.md) (v0.3, 3 Nov)

**What changed in the design**

- The vision is now the entry document; the HLS becomes the "detail" layer it links to (vision header and §5).
- Tier 1 flow: COS orchestrates the claim and requests the medical assessment; Clawdia only enriches early (X-01, X-02).
- Lodgement path: UPM Dedicated Azure Functions replace CLAPI, DAPI and Dynamic CLAPI (X-03).
- COS becomes one global, insurer-aware service (X-05).
- Service Provider 1:N is solved in Tier 1 by fuzzy matching (X-04).
- ABC-15 and ABC-16 move to Tier 2 (X-07).
- Tier 2 gets two named quick fix bays (X-09); Tier 3 is called **AI Claims** (V-12).
- The vision frames the work with four business drivers **D1–D4**; the HLS uses BMM drivers and LP-1…LP-8.

**What should be removed**

| Section | Remove |
|---|---|
| 1.2 Terminology | *Clawdia STP* "… and writes the result to UPM" (X-02). *CLAPI / Dynamic CLAPI / DAPI* as live components — keep them only as retired. |
| 1.4, 3.3, 4 | ABC-15 and ABC-16 from Tier 3 (X-07). |
| 2.1 Phases | Phase 3 "Go Tech VMs on the claim path retired" (now Tier 2). Phase 1 "Event-driven start of Clawdia STP" as worded (it is the enrichment that starts early). |
| 3.1 | ABC-02 dependency "ABC-06 (started)" (routing context no longer exists — X-04). |
| 3.3 Outcome | "the Go Tech VMs on the claim path are retired". |
| 3.5 BPMN table | "released to UPM when requested" on the three end events (X-02). |
| 3.6 | Current target-application picture and its notes (DAPI, Dynamic CLAPI *release result · write*, "COS sagas re-hosted", VetHub routing context) — replace, see section 5. |
| 6.2 | "Clawdia STP evolves into the harness … released to UPM" implications; any answer that assumes CLAW-INIT. |
| Next steps 4 | "Turn Early Starter into a component architecture (it reuses the Earlier Birds analysis)" — Earlier Birds' wait / release-on-CLAW-INIT design is superseded; reuse only the impact-analysis method and inventories. |

**What should be added**

- A short **"Relation to the architecture vision"** note in the header, and a **D1–D4 ↔ LP** mapping (D1 → LP-5 and new LP-9 / LP-10; D2 → LP-2, LP-3; D3 → LP-6; D4 → LP-1, LP-4, LP-8).
- **New problems** surfaced by the vision:
  - **LP-9 Per-insurer stacks** — COS, CLAPI and DAPI duplicated per insurer, each with a different back end (vision §2.3).
  - **LP-10 Duplicated attachment storage** — VetHub and COS each keep a copy (D1).
- **Terminology:** Conversation event bus · Clawdia event bus · *medical assessment completed / fell out* · UPM Dedicated Azure Functions · Insurer Related COS Repository · global (insurer-aware) COS · fuzzy matching (FuzzyWuzzy) · PetBERT-ICD · ICD-11 · AI Claims (Tier 3) · learning loop · Claims Automation / Sophia Jr (treatment codes).
- **Tier 1 table:** ABC-17 (multiple diagnoses — today only in early-starter, missing from the HLS), the new ABCs of section 4 (global COS, UPM Dedicated Functions if not folded into ABC-06, single attachment store **[tier TBC]**).
- **Tier 2 table:** ABC-15, ABC-16; the policy-validation bay (inside ABC-08 or new ABC).
- **§3.5:** the Tier 1–2 path (Easy Cohort → GP → business rules → publish event) and the *fell out* end state; Tier 2 Clawdia error → Quick Fix Bay.
- **§2.3 / new section:** the infrastructure-by-insurer view (link to vision §2.3–2.4).
- **Open questions:** NZ automation appetite (V-13); policy-validation bay vs CATCH task allocation; CATCH notification tool **[tool to confirm]**; who duplicates the line items (COS or Clawdia); tier and owner of the single attachment store; fuzzy-matching thresholds and reflow mechanism once CATCH is retired; replacement for the gap-only return path and CATCH's calls to Dynamic CLAPI; whether Tier 2's AI-assisted manual bay and ABC-13 are one change or two.
- **§5 principles:** AP1 add DAPI, Dynamic CLAPI and the second attachment copy; AP5 name the two event buses; add the V-14 guardrails.

**What is contradictory**

| HLS | Vision |
|---|---|
| §1.2 *Clawdia STP* writes the result to UPM | Clawdia never writes to UPM; COS writes (D2) |
| §3.1 ABC-06 "Remove dependencies on CLAPI and DAPI" keeps DAPI as a direct target | DAPI is removed; UPM Dedicated Functions instead |
| §3.3 / §4 ABC-15, ABC-16 in Tier 3 | Tier 2 |
| §3.5 end events "released to UPM when requested" | Result is published on the Clawdia event bus; COS writes |
| §3.6 target picture keeps DAPI, Dynamic CLAPI, CLAW-INIT, per-insurer COS | All removed; one global COS |
| §2.2 LP-6 "Solved by [Solution TBC]" with a master-data approach | Tier 1 fuzzy matching on *conversation completed* (solution owner still TBC) |
| Tier 3 name "AI Claim Assessment Harness" | "AI Claims" (the harness is the platform Clawdia becomes) |

**Keep stable:** the vision links to `#61-open-questions`, `#5-architecture-principles-applied` and `#34-dependencies-between-changes`. Keep those headings (or update the links) when the HLS is revised.

---

### 3.2 [`solutions/early-starter.md`](solutions/early-starter.md) — SOL-1

This is the document most affected by the vision.

**What changed in the design**

- The trigger is split: **enrichment** starts on the first conversation event; the **assessment** is requested by COS after Save CRN → Validate policy → Treatment codes (X-01, V-04).
- Routing moves from VetHub to the fuzzy-matching Azure Function on *conversation completed* (X-04).
- Lodgement and write go through UPM Dedicated Azure Functions; CLAPI, DAPI and Dynamic CLAPI are all removed (X-03).
- COS is one global service (X-05).
- §9 (ABC-17): the vision describes a single flow — lodge claim + treatment lines **in parallel** with the assessment, then **COS** Writes / Inspects / Finishes after *medical assessment completed*, duplicating line items (X-10). This matches none of A, B1, B2, D1, D2 exactly: lodgement timing is B1/B2-like (no wait), the writer is COS as in D1, and there is no UPM request (no CLAW-INIT, no *Medical assessment required*).
- The ABC-17 open question "does Clawdia still prepare early on *Conversation Initiated*?" is answered: **yes, it enriches the claim context**.

**What should be removed**

- §1 Summary: "starts Clawdia's medical assessment as soon as a VetHub conversation is initiated"; "COS lodges directly in DAPI and the UPM Dynamics API using a routing context VetHub calculates once".
- §2: ABC-03 description "(early start, wait, release on CLAW-INIT)"; ABC-06 "(routing context, direct lodgement)".
- §3: ABC-06.1 (VetHub routing context), ABC-03.6/03.7 (CLAW-INIT finds/releases workflow), ABC-03.9 (link CRN to workflow), ABC-06.5 (DAPI evolve), ABC-06.6 as "direct" caller; Dynamic CLAPI as *Evolve*.
- §4 Target flow (Mermaid): `UPM -->|CLAW-INIT: release result| DCL`, `CLW -->|Write| DCL`, `COS -->|direct| DAPI`, "VetHub + routing context", "Routing Context Calculated", "start early · wait".
- §5 Patterns: "long-running process with a wait state" **in Clawdia** (the wait is now in COS); "speculative (eager) processing" of the assessment (only enrichment is speculative).
- §7 Risks: "Routing rules diverge between VetHub and COS"; "A, D1, D2: lodgement waits…"; "D2 depends on a new UPM API".
- §8 Measures: "API layers … Target: None (direct)" (target is one layer: the UPM Dedicated Functions); "COS.API on PaaS (AU, NZ, VP)" (one global COS).
- §9: options A, B1, B2, D1, D2 as open alternatives, check C, and the per-option dependency table 9.11 — replace with the chosen flow (keep the analysis in an appendix or a decision record if useful for the trail).

**What should be added**

- Replace §4 with the vision picture [`vision-t1-1-start-early.png`](diagrams/vision-t1-1-start-early.png) and a component table for: Conversation event bus · fuzzy-matching Azure Function · COS (Save CRN, Validate policy, Treatment codes via CA, Lodge, Request MA, Wait, Handle fall-out) · Insurer Related COS Repository · Clawdia (Start enriching, Easy Cohort, GP, business rules, publish) · Clawdia event bus · UPM Dedicated Azure Functions (*Submit Claim, Submit Attachment, Finish Submit Claim, Sync Lodge*; *Write, Inspect, Finish*; *Return*).
- **Fall-out path:** *medical assessment fell out* → COS *Handle claim fell out* → *Return* in UPM (today the fall-out stays inside UPM).
- **Treatment codes via Claims Automation (Sophia Jr)** as an explicit step before the assessment request.
- **Composition:** ABC-02 inside Tier 1 alongside SOL-1 (owner still TBC), ABC-17 as a decided change, and the new ABCs of section 4.
- **§9 rewritten as the decision:** "Lodge in parallel, COS writes after *medical assessment completed*". Keep **E1** (can the write duplicate a lodged line item, now through the UPM Dynamics API via the dedicated *Write* function) as the **gating experiment**; keep E2 only as a possible later improvement (lodge with diagnosis, no write).
- **New risks:** UPM checks (duplicate, fraud, bank) run in parallel with the assessment — what happens if UPM finishes its checks before *medical assessment completed* arrives; timeout on the COS wait; *Inspect* semantics.
- **Out of scope / in scope:** decide where the **gap-only return path** goes now that Dynamic CLAPI is removed (it was "out of scope" because Dynamic CLAPI stayed).
- **Measures:** time from *conversation completed* to *medical assessment completed*; % of claims where the assessment is ready before UPM's checks finish.

**What is contradictory**

| Early Starter | Vision |
|---|---|
| Clawdia starts the assessment on *Conversation Initiated* | Clawdia enriches on the first event; COS requests the assessment |
| UPM sends CLAW-INIT; Clawdia writes through Dynamic CLAPI | No CLAW-INIT; COS writes through UPM Dedicated Functions |
| DAPI evolved, direct caller COS | DAPI removed |
| Routing context calculated in VetHub | Fuzzy-matching function on *conversation completed* |
| ABC-17.3: **Clawdia** duplicates the line items | D2: **COS** gets the diagnosis and duplicates the invoice line items **[confirm — wording "it duplicate"]** |
| §6 Out of scope: re-hosting COS and VetHub services | Vision §3.3: "could be part of Tier 1 as well" |
| §6 Out of scope: gap-only return path through Dynamic CLAPI | Dynamic CLAPI removed in Tier 1 — the return path needs a new home |

---

### 3.3 [`solutions/medical-information-claim-enrichment.md`](solutions/medical-information-claim-enrichment.md) — SOL-2

**What changed in the design**

- Enrichment starts **from the first VetHub event** (*conversation initiated, vetXml submitted, attachment uploaded*), not "after loading the claim" (V-02).
- Models named: **PetBERT-ICD** for notes; **OCR + Classifier** for attachments; both map into **ICD-11** (V-09).
- In Tier 2, a Clawdia error goes to the **Quick Fix Bay (manual assessment)**, which then publishes *medical assessment completed* (V-10).

**What should be removed**

- "e.g. a fine-tuned PetBERT, or an LLM extractor" as an open choice (now PetBERT-ICD) — keep LLM only as a fallback option if you want to.
- Implicit assumption that enrichment runs only when the assessment starts.

**What should be added**

- Event-driven enrichment triggers and an **external dependency on ABC-04** (the conversation events), not only ABC-03.
- ICD-11 as the target ontology for clinical facts and attachment classification; who owns the ICD-11 mapping and its version.
- Link to the **single attachment store** (V-08): the claim-check pattern (§5) should point at it.
- Replace the §4 Mermaid with [`vision-t2-1b-richer-claim-context.png`](diagrams/vision-t2-1b-richer-claim-context.png) or align the Mermaid to it.
- Open question "Should UPM receive typed attachments instead of one merged PDF?" — relate it to the single attachment store.

**What is contradictory**

| SOL-2 | Vision |
|---|---|
| Attachment classification into **document types** (via ABC-01A) | Attachments classified **into the ICD-11 ontology** **[confirm whether both: type + ICD-11 codes]** |
| Clawdia calls the ML router, which sequences OCR → classifier | Vision picture shows Clawdia calling *PetBERT-ICD* and *OCR + Classifier* directly in the ML environment; the router is not drawn. Not necessarily a conflict — **[confirm the router stays the single entry point]** |

---

### 3.4 [`solutions/quick-fix-bay.md`](solutions/quick-fix-bay.md) — SOL-3

**What changed in the design**

- Tier 2 now has **two bays**: **Manual assessment** (raised by a Clawdia error, AI-assisted, may use generative UI) and **Policy validation** (raised by COS) (V-10).
- The manual bay does **not resume Clawdia**: it **publishes *medical assessment completed*** on the Clawdia event bus and COS carries on.
- The manual bay needs **no integration with the CATCH notification flow**; the policy-validation bay has a **hard dependency on CATCH task allocation**.
- The vision marks the whole bay as "analysis to be completed".

**What should be removed**

- "first bay type **[TBC]**" and §9 open question "First bay type for Tier 2".
- §4 component rows on **Dynamic CLAPI** (ABC-09.3, ABC-13.3) — Dynamic CLAPI is gone in Tier 1.
- §5 Target flow: "Write to UPM (same path as automation)" as a bay → UPM write.

**What should be added**

- Bay table: Tier 2 = Manual assessment + Policy validation; Tier 3 = Answers bay + AI-assisted manual assessment (or merge the two manual-assessment bays — see contradiction).
- Task-model "Resume point" differentiated: *manual assessment* → publish *medical assessment completed*; *policy validation* → resume the COS flow (and possibly reflow to another UPM — V-03).
- Component changes: **Clawdia event bus** (consumer and publisher), **COS** (raise policy-validation task), **task allocation** carried over from CATCH.
- A "status: analysis to be completed" banner, matching the vision.

**What is contradictory**

| SOL-3 | Vision |
|---|---|
| AI-assisted manual medical assessment is **Tier 3** (ABC-13) | Tier 2 manual-assessment bay "should be AI-assisted" — **[decide: one change across two tiers, or a Tier 2 basic bay + Tier 3 pre-filled co-pilot]** |
| CATCH retired in Tier 2 after ABC-08 | Policy-validation bay depends on CATCH task allocation — CATCH cannot go until that capability has a new home |
| Bay hands the claim back to Clawdia | Manual bay publishes the outcome; COS continues |

---

### 3.5 [`solutions/ai-claim-assessment-harness.md`](solutions/ai-claim-assessment-harness.md) — SOL-4

Largely consistent with the vision §4.

**What changed in the design**

- Tier 3 is named **AI Claims**; the harness is what Clawdia becomes.
- The harness outcome is **published as an event** to COS, not written to UPM.
- The vision makes the **learning loop** and an **automatic audit analysis with improvement proposals** explicit (D4).

**What should be removed**

- Any phrasing that the result is "released to UPM when requested" (inherited from the BPMN and HLS §3.5).

**What should be added**

- In §6 *AI operating model hooks*: an explicit **auto-audit → improvement proposal** step (proposed changes to questions, thresholds and models, tested on past claims before release — vision §4.3).
- End states of the assessment path mapped to *medical assessment completed* / *fell out*.
- Note that diagnosis outputs must carry the **line item ↔ diagnosis** association that COS needs to duplicate line items (X-10).

**What is contradictory**

- None material. Only the inherited "released to UPM" wording.

---

### 3.6 [`solutions/tools/claim-context-high-level-solution.md`](solutions/tools/claim-context-high-level-solution.md)

Matches vision D4 ("one safe, auditable place"; automatic audit). Some invariants clash with Tier 1–2 behaviour.

**What changed in the design**

- The claim context starts being **enriched from the first conversation event**, in Tier 1 (V-02) — well before agents use it.
- **Policy id** can be **auto-corrected** by the fuzzy-matching function (V-03) and **corrected by a person** in the policy-validation bay (V-10).
- Enrichment produces **ICD-11-coded** clinical information and attachment classification (V-09).
- Assessment outcome is published as *medical assessment completed / fell out* (V-01).

**What should be removed**

- Nothing outright.

**What should be added**

- Commands for enrichment: e.g. `AddClinicalInformation` (ICD-11, provenance) and `AddAttachmentClassification`; `RegisterAttachment` pointing at the single attachment store.
- Lifecycle mapping: `CompleteAssessment` → *medical assessment completed*; fall-out / `FreezeContext` → *medical assessment fell out*.
- A note on **when** each part exists: claim context data in Tier 1 (loaded conversation), enriched store in Tier 2 (ABC-07), MCP server for agents in Tier 3.
- Open question 7 (resolving duplicated line items): link to the decision that **COS** duplicates line items for UPM **[confirm]**, and how `DuplicateLineItem` in the context relates to it.

**What is contradictory**

| Claim Context | Vision |
|---|---|
| `CorrelateToPolicy`: "Can be set once. A second, different policy is rejected and raised as a **security signal**" | Policy id is auto-corrected (fuzzy matching) and can be fixed in the policy-validation bay. Either correlation happens only **after** policy validation, or a **legitimate `CorrectPolicy`** command is needed that is distinguishable from an agent attack |
| Context "correlated to the claim, the animal and the policy by STP / Clawdia before any agent starts working" | In the vision COS owns CRN and policy validation; Clawdia receives them with the assessment request. Correlation is driven by COS's request, not by Clawdia on its own |

---

### 3.7 [`solutions/tools/claim-context-implementation-approach.md`](solutions/tools/claim-context-implementation-approach.md)

**What changed in the design** — nothing directly; it implements the Claim Context.

**What should be removed** — nothing.

**What should be added**

- Integration events on the **Clawdia event bus** (vision V-01) rather than a generic "Azure Service Bus" — broker still open (OQ-02).
- Event types for the new enrichment commands (see 3.6).
- Hosting note: Azure Container Apps matches the vision's managed-services direction (D1) — worth saying so.

**What is contradictory** — none.

---

### 3.8 [`solutions/tools/entity-mapper-mcp-tool.md`](solutions/tools/entity-mapper-mcp-tool.md)

**What changed in the design**

- Vision D3 / §2.2: **one VetHub service provider (GUID) to N UPM service provider ids**; resolved at run time by **fuzzy matching**; the UPM id stored in VetHub is ignored; the result also prepares Service Provider Master Data.

**What should be removed** — nothing.

**What should be added**

- **`vethub`** as a registered system (the GUID is the source id in the vision) — today the systems list has UPM AU / NZ / Trupanion, COS, VTAB, HubSpot, mobile app, but not VetHub. Consider `catch` too while it lives.
- How the Entity Mapper relates to the fuzzy-matching function: store confirmed matches as associations, so the fuzzy match is needed only for unknown pairs.
- Link to ABC-02 as a candidate home for the "service provider master" (ABC-02.1 location TBC).

**What is contradictory**

| Entity Mapper | Vision |
|---|---|
| §5.2 default rule "**one ID per system** per real-world entity" | If one VetHub clinic maps to **several service providers in the same UPM instance**, the default is wrong for UPM systems. **[confirm whether the 1:N is across UPM instances or inside one]** |

---

### 3.9 [`changes/abc-01-ml-improvement.md`](changes/abc-01-ml-improvement.md) — ABC-01A…E

**What changed in the design**

- **ABC-01A:** classification target is the **ICD-11 ontology** (V-09).
- **ABC-01B:** model chosen: **PetBERT-ICD**, output mapped to **ICD-11**.
- **ABC-01C–E:** consistent with the vision (GP model uses richer context; questions per family; ML predicts the diagnosis from Q&A).

**What should be removed**

- ABC-01B.1 "For example a fine-tuned PetBERT, or an LLM extractor under AI governance **[TBC]**" — replace with PetBERT-ICD.

**What should be added**

- ICD-11 version and mapping governance; how ICD-11 codes relate to PetSure diagnosis codes and diagnosis families (needed by ABC-01C and ABC-11).
- ABC-01C.3 / ABC-01E.1: output the **line item ↔ diagnosis** association (many-to-many), not "one diagnosis per invoice line" — COS needs it to duplicate line items (early-starter §9 note already says so).
- Context section: enrichment is triggered by conversation events (Tier 2), not only when Clawdia assesses.

**What is contradictory**

| ABC-01A | Vision |
|---|---|
| Type per attachment from a **document taxonomy** (clinical history, lab result, imaging report, referral, invoice, estimate, other) | "classifies the attachments **into the ICD-11 ontology**" **[confirm: replace, or add ICD-11 coding on top of document type]** |

---

### 3.10 [`changes/abc-02-service-provider-master-data.md`](changes/abc-02-service-provider-master-data.md)

**What changed in the design**

- Concrete Tier 1 solution (V-03): VetHub GUID in VetXml; ignore the UPM id stored in VetHub; **fuzzy-matching Azure Function** on *conversation completed* retrieves the service provider id, **auto-corrects the policy id** and decides the UPM instance; Australia default; reflow if the policy is validated manually.
- Benefits now include **correct service provider registration in CATCH** (D3).
- Master data becomes the **longer-term foundation**, not the Tier 1 deliverable.

**What should be removed**

- Dependency "ABC-06 (started — routing context)" and the "routing context" rationale.
- ABC-02.2 (VetHub routing context uses the mapped id) and ABC-02.4 (Dynamic CLAPI gap-only route) — both components lose that role.
- Status "picture is not yet clear enough" — the vision gives the picture (owner still TBC).

**What should be added**

- Component changes: **fuzzy-matching Azure Function** (Add) · **policy id auto-correction** (Add) · **UPM instance selection / reflow** (Add) · VetHub event payload carries the GUID (Evolve, via ABC-04) · Insurer Related COS Repository lookup.
- Dependency on **ABC-04** (deployed — *conversation completed*).
- Acceptance criteria for match confidence, a threshold for automatic correction, and the path when the match is uncertain (policy-validation bay, V-10).
- Optional link to the Entity Mapper as the store for confirmed mappings.

**What is contradictory**

| ABC-02 | Vision |
|---|---|
| Fix comes from a **system of record + mapping** synchronised to each UPM | Fix comes from **run-time fuzzy matching**; master data is the foundation for later |
| Routing decided in VetHub's routing context | Routing decided in the Azure Function on *conversation completed* |
| Reflow (implicitly via CATCH `ClaimAction` → `ReflowClaim`) | CATCH is retired in Tier 2 — the reflow needs a new mechanism **[open]** |

---

### 3.11 [`changes/abc-03-decouple-upm-clawdia.md`](changes/abc-03-decouple-upm-clawdia.md)

**What changed in the design**

- From "start early, wait, release on CLAW-INIT, write back as today" to **full decoupling**: Clawdia enriches on conversation events, **assesses when COS asks**, and **publishes** *medical assessment completed / fell out*; it never writes to UPM (X-01, X-02).

**What should be removed**

- ABC-03.3 "Initialise assessment on the event instead of CLAW-INIT" (as worded), ABC-03.5 wait state, ABC-03.6 CLAW-INIT fallback, ABC-03.7 Dynamic CLAPI "release the result", ABC-03.9 link CRN to workflow, ABC-03.8 *Claim Initiated in COS* (COS passes the CRN in the request).
- AC-3 and AC-4 (write-back remains).
- Open question "Expiry and ML cost of speculative runs" (only enrichment is speculative now — keep a lighter version).

**What should be added**

- Component changes: **Clawdia event bus** (Add) · **Publish *medical assessment completed*** with line item ↔ diagnosis association (Add) · **Publish *medical assessment fell out*** with reason (Add) · **Assessment request entry point for COS** (Add) · enrichment subscriptions to *conversation initiated, vetXml submitted, attachment uploaded* (Add) · **Decommission** CLAW-INIT function, Clawdia → Dynamic CLAPI *Write*, UPM ReadOnly DataService reads for claim data.
- AC: "Clawdia has no inbound or outbound dependency on UPM" (except read-only history **[TBC]**).
- Open question kept: which policy / history data Clawdia still reads, and from where.

**What is contradictory**

| ABC-03 | Vision |
|---|---|
| Clawdia starts the workflow on *Conversation Initiated* without any call | Assessment starts on **COS's request** after treatment codes |
| "When UPM requests the assessment, Clawdia finds the running workflow and **writes back**" | No UPM request; no write by Clawdia |

---

### 3.12 [`changes/abc-04-remove-polling-vethub-cos.md`](changes/abc-04-remove-polling-vethub-cos.md)

**What changed in the design**

- Event set and bus naming (X-06, V-01).
- The Azure Function on *conversation completed* does **fuzzy matching and initiates COS** — more than a thin adapter (V-03).

**What should be removed**

- ABC-04.2 events *Insurer Routing Context Calculated* and *Conversation Submission Completed* (rename to *conversation completed*).
- "VetHub topic, COS topic" in ABC-04.1 if the buses are named by producer (Conversation, Clawdia).

**What should be added**

- Events *vetXml submitted* and *attachment uploaded* (used by Clawdia enrichment).
- The **Clawdia event bus** — either here (the event platform ABC) or in ABC-03.
- Event payload carries the VetHub service provider GUID (for ABC-02).
- Answer the open question "attachments by reference?" — **yes**, pointing at the single attachment store (V-08).

**What is contradictory**

| ABC-04 | Vision |
|---|---|
| ABC-04.4 Function = "start claim in COS" only | Function = fuzzy matching + insurer + service provider + start COS |
| ABC-04.5 *Start claim from conversation* API on per-insurer COS.API | One global COS |

---

### 3.13 [`changes/abc-05-rehost-cos-api-app-service.md`](changes/abc-05-rehost-cos-api-app-service.md)

**What changed in the design**

- COS.API on a managed service stays a Tier 1 outcome, but COS becomes **one global, insurer-aware service** (V-07), on App Service + Container Apps and/or Logic Apps.

**What should be removed**

- ABC-05.6 "App Service (AU, NZ, VP)" as three stacks; AC-1 "AU first, then NZ and VP"; open question on NZ / VP order (as phrased).

**What should be added**

- Global deployment with insurer resolution through the **Insurer Related COS Repository**; migration path from three per-insurer COS.API sites and three `COS_PROD*` databases.
- Either extend this ABC or reference the new "Global insurer-aware COS" ABC (section 4).

**What is contradictory**

| ABC-05 | Vision |
|---|---|
| Re-host per insurer, same DNS names per caller | One COS for all insurers |

---

### 3.14 [`changes/abc-06-remove-clapi-dapi-dependencies.md`](changes/abc-06-remove-clapi-dapi-dependencies.md)

**What changed in the design**

- **CLAPI, DAPI and Dynamic CLAPI are all removed** and replaced by **UPM Dedicated Azure Functions per UPM** (X-03).
- The functions still write the **DS\* tables** (*Submit Claim, Submit Attachment, Finish Submit Claim*) and add **Sync Lodge** to the UPM Dynamics API; *Write, Inspect, Finish* and *Return* are separate functions.
- Routing is no longer a VetHub routing context (X-04).

**What should be removed**

- ABC-06.1 (VetHub routing context), ABC-06.2 (COS routing-context resolver), ABC-06.3 "directly in DAPI", ABC-06.5 (DAPI evolve).
- Title / change text "COS uses it to lodge directly in the right DAPI".

**What should be added**

- Component changes: **UPM Dedicated Azure Functions** per UPM instance (Add, ×3: AU, Trupanion, NZ) with the operations above · **DAPI** (Decommission) · **Dynamic CLAPI** (Decommission — all operations, not only *Lodge Claim*) · CLAPI (Decommission).
- Mapping of every CLAPI and Dynamic CLAPI operation to a function or to a retirement decision: policy find / details (Validate policy), status list (*Inspect*?), attachments (*Submit Attachment*), gap-only operations, CATCH's calls to Dynamic CLAPI, the gap-only return path.
- Clarify **Sync Lodge**: does it trigger UPM's ingestion of the DS tables synchronously (removing the ~10-minute poll)? If yes, ABC-06.9 / ABC-06.10 change. **[confirm]**
- Vet Partners: no UPM — confirm CLAPI → Boomi is replaced by an equivalent function, since CLAPI is removed.

**What is contradictory**

| ABC-06 | Vision |
|---|---|
| DAPI kept and called directly | DAPI removed |
| Dynamic CLAPI loses only *Lodge Claim* | Dynamic CLAPI removed |
| Routing context from VetHub | Fuzzy-matching function |

---

### 3.15 [`changes/abc-07-enrich-claims-clinical-information-attachment-classification.md`](changes/abc-07-enrich-claims-clinical-information-attachment-classification.md)

**What changed in the design**

- Enrichment is **event-driven from the first conversation event** (V-02), with PetBERT-ICD and OCR + Classifier into ICD-11 (V-09).

**What should be removed**

- "After loading the claim, it calls the ML environment" as the trigger.
- Sequence diagram step order that ties enrichment to the assessment call.

**What should be added**

- Triggers: *conversation initiated*, *vetXml submitted*, *attachment uploaded*; incremental enrichment per attachment.
- Dependency on **ABC-04** (events) and on the **single attachment store** for ABC-07.4.
- ICD-11 fields in the claim context model (ABC-07.2).

**What is contradictory** — attachment "type" vs ICD-11 (as ABC-01A).

---

### 3.16 [`changes/abc-08-introduce-quick-fix-bays.md`](changes/abc-08-introduce-quick-fix-bays.md)

**What changed in the design**

- Two Tier 2 bays: **Manual assessment** and **Policy validation** (V-10, X-09). Manual bay publishes *medical assessment completed*.

**What should be removed**

- ABC-08.2 "first bay type [candidate: attachment classification review or diagnosis confirmation]".
- ABC-08.3 "resume from the step on *Quick Fix Completed*" and ABC-08.4 *Quick Fix Raised / Completed* events (as the hand-back mechanism for the manual bay).
- Dependency rationale "ABC-03 — Clawdia's wait state and correlation make pause / resume possible".

**What should be added**

- Component changes: Clawdia raises the manual-assessment task **on error** · bay **publishes *medical assessment completed*** on the Clawdia event bus · **COS raises a policy-validation task** · **task allocation** (from CATCH) · reflow to another UPM after policy validation (V-03).
- Dependencies: ABC-03 (Clawdia event bus), ABC-04 (COS flow), ABC-10.
- "Analysis to be completed" status, as in the vision.

**What is contradictory**

| ABC-08 | Vision |
|---|---|
| The bay resumes Clawdia at a checkpoint | Manual bay replaces Clawdia's output by publishing the event |
| Bay type undecided | Two bays decided (direction) |

---

### 3.17 [`changes/abc-09-decommission-catch.md`](changes/abc-09-decommission-catch.md)

**What changed in the design**

- The policy-validation bay **needs CATCH task allocation**; the manual bay does **not** need the CATCH notification flow (V-10).

**What should be removed**

- ABC-09.3 "Dynamic CLAPI — remove the CATCH caller" as a Tier 2 change: Dynamic CLAPI is gone in Tier 1, so CATCH's dependency on it must be solved **in Tier 1**.

**What should be added**

- Explicit **task allocation** capability moved into the bays before decommission.
- Sequencing note: CATCH must keep working while Dynamic CLAPI is removed (ABC-06), or the CATCH → Dynamic CLAPI calls move to the UPM Dedicated Functions.
- Service provider registration in CATCH (vision D3 benefit) — what replaces it after CATCH goes.

**What is contradictory**

| ABC-09 | Vision |
|---|---|
| CATCH retired in Tier 2 | D3 improves "Service Provider Registration in **Catch**"; policy bay depends on CATCH task allocation — retiring CATCH in the same tier needs both capabilities moved first |
| CATCH calls Dynamic CLAPI until Tier 2 | Dynamic CLAPI removed in Tier 1 |

---

### 3.18 [`changes/abc-10-claim-visualiser.md`](changes/abc-10-claim-visualiser.md)

**What changed in the design** — minor. Claims now exist in UPM early (lodged in parallel), and are keyed by CRN from COS.

**What should be removed** — nothing.

**What should be added**

- The visualiser is the base of the Tier 2 **manual-assessment** bay with ICD-11-coded facts; key on `conversationId` / CRN.
- Tier 2 vision wants the manual bay **AI-assisted** — decide whether that UI work starts here.

**What is contradictory** — none.

---

### 3.19 [`changes/abc-11-questions-answers-diagnosis-family.md`](changes/abc-11-questions-answers-diagnosis-family.md)

**What changed in the design** — consistent with vision §4.1 and D4. Outcome is published as an event.

**What should be removed** — nothing.

**What should be added**

- Step 5 outcome: publish *medical assessment completed* (or hand to ABC-13) instead of "assessment is ready".
- Diagnosis families and questions expressed against the ICD-11-coded claim context (V-09).

**What is contradictory** — none.

---

### 3.20 [`changes/abc-12-quick-fix-bays-for-answers.md`](changes/abc-12-quick-fix-bays-for-answers.md)

**What changed in the design** — none material; still Tier 3.

**What should be removed** — nothing.

**What should be added** — dependency on the Tier 2 bay platform as it is now scoped (manual + policy validation), not on a "first bay type".

**What is contradictory** — none.

---

### 3.21 [`changes/abc-13-ai-assisted-manual-medical-assessment.md`](changes/abc-13-ai-assisted-manual-medical-assessment.md)

**What changed in the design**

- The outcome reaches UPM through **COS** (bay publishes *medical assessment completed* → COS *Write*), not through Dynamic CLAPI.
- An **AI-assisted manual bay already appears in Tier 2** (V-10).

**What should be removed**

- ABC-13.3 "Dynamic CLAPI *Write* — accept human-completed assessments … or a lifecycle-stage API".
- "the outcome is written back through the same path as an automated assessment" — keep the idea, change the path.

**What should be added**

- Publish *medical assessment completed* marked as a **human decision**; COS writes via the UPM Dedicated Functions.
- Clarify the split with the Tier 2 manual bay: Tier 2 = AI-assisted UI (generative UI, evidence at the fingertips); Tier 3 = answers and proposed diagnosis pre-filled by the harness **[confirm]**.

**What is contradictory**

| ABC-13 | Vision |
|---|---|
| Write path via Dynamic CLAPI | Dynamic CLAPI removed; COS writes |
| AI-assisted manual assessment introduced in Tier 3 | Tier 2 manual bay "should be AI-assisted" |

---

### 3.22 [`changes/abc-14-specialist-models.md`](changes/abc-14-specialist-models.md)

**What changed in the design** — none. OQ-12 (bring multiple-diagnosis models into Tier 2) becomes **more pressing**, because COS duplicates line items from Tier 1 onward and needs the line item ↔ diagnosis association.

**What should be removed** — nothing.

**What should be added** — a pointer to ABC-17 and E1.

**What is contradictory** — none.

---

### 3.23 [`changes/abc-15-rehost-vethub-remaining-vms.md`](changes/abc-15-rehost-vethub-remaining-vms.md)

**What changed in the design** — **Tier 3 → Tier 2** (possibly Tier 1) (X-07). Options unchanged (App Service, Functions, Container Apps).

**What should be removed** — "Tier 3 · AI Claim Assessment Harness (platform)".

**What should be added** — the single attachment store (V-08) affects VetHub storage; consider whether this ABC carries the VetHub side.

**What is contradictory** — tier only.

---

### 3.24 [`changes/abc-16-rehost-cos-services.md`](changes/abc-16-rehost-cos-services.md)

**What changed in the design**

- **Tier 3 → Tier 2** (X-07).
- The vision leans to **decommissioning COS services and moving COS to Logic Apps**, as one **global** COS (V-07).
- The UPM Status Poller and the sagas are replaced by the COS flow and the *Inspect* function.

**What should be removed**

- "Tier 3"; ABC-16.5 / AC-1 phrased "AU, NZ, VP" as three separate COS stacks; "already proposed with Early Starter" for WebJobs re-host (the vision prefers the refactor, pending analysis).

**What should be added**

- Logic Apps-based COS flow matching vision V-04 (Save CRN → … → Write, Inspect, Finish / Return) and the Insurer Related COS Repository.
- Link to OQ-07 with the vision's preference.
- Open question: decommission vs re-host per service (the vision says "some COS services need an upgrade and a strong refactor").

**What is contradictory**

| ABC-16 | Vision |
|---|---|
| Per-insurer COS services | One global COS |
| Re-host and refactor are equal options | Vision prefers decommission + Logic Apps (analysis required) |

---

## 4. New changes (ABCs) the vision needs

Numbers are proposals; ABC-17 is already used in early-starter.

| Proposed | Change | Tier | Solution | Depends on | Notes |
|---|---|---|---|---|---|
| **ABC-17** | Multiple diagnoses per line item — **lodge in parallel, COS writes with duplicated line items after *medical assessment completed*** | 1 | SOL-1 | ABC-03, ABC-06 (deployed); E1 passed | Create the page in `changes/`; record the rejected options A–D2 as alternatives |
| **ABC-18** | **Global, insurer-aware COS** + Insurer Related COS Repository | 1 (start) → 2 (complete) | SOL-1 / platform modernisation | ABC-05 | Could absorb ABC-05; affects ABC-16 |
| **ABC-19** | **UPM Dedicated Azure Functions** per UPM instance | 1 | SOL-1 | ABC-04 | Or fold into a rewritten ABC-06; includes Sync Lodge, Write / Inspect / Finish, Return |
| **ABC-20** | **Single attachment store** (one copy per attachment, by reference) | **[TBC]** | **[TBC]** | ABC-04 (started) | Named as missing in vision §5; ABC-07.4 and ABC-04 open question depend on it |
| **ABC-21** | **COS fall-out handling** (*medical assessment fell out* → Return to UPM) | 1 | SOL-1 | ABC-03, ABC-19 | Or part of ABC-03 / ABC-06 |
| **ABC-22** | **Policy-validation quick fix bay** incl. task allocation from CATCH | 2 | SOL-3 | ABC-08, ABC-02 | Or part of ABC-08; prerequisite for ABC-09 |

---

## 5. Non-markdown artefacts to refresh

| Artefact | Issue |
|---|---|
| [`diagrams/ai-cash-target-application.mmd`](diagrams/ai-cash-target-application.mmd) / `.svg` / `.png` | Shows DAPI, Dynamic CLAPI (*release result · write*), UPM requesting the result, COS "sagas re-hosted", VetHub routing context, a single event platform. Redraw with V-01…V-09. |
| [`diagrams/ai-cash-assessment-path.bpmn`](diagrams/ai-cash-assessment-path.bpmn) / `.png` | End events "released to UPM when requested" → publish *medical assessment completed*; add the *fell out* end; start event should be "assessment requested by COS" (enrichment has already started). |
| [`changes/dependency_map.png`](changes/dependency_map.png) | Already stale for v0.3; now also needs ABC-15/16 in Tier 2, ABC-02 → ABC-04, and the new ABCs. |

---

## 6. Points inside the vision to decide or tidy

1. **Who duplicates the line items** — D2 says COS ("it duplicate…"), early-starter ABC-17.3 says Clawdia. Probably: Clawdia returns the association, COS builds the duplicated lines for UPM. State it.
2. **AI-assisted manual assessment in Tier 2 (§3.2) vs Tier 3 (§4.2, ABC-13)** — say what differs between the two.
3. **D3 "Correct Service Provider Registration in Catch"** while CATCH is retired in Tier 2.
4. **Reflow** after manual policy validation (§2.2) — today's reflow lives in CATCH (`ClaimAction` → `ReflowClaim`).
5. **Gap-only return path and CATCH's calls to Dynamic CLAPI** — not covered once Dynamic CLAPI is removed in Tier 1.
6. **Single attachment store** — no tier.
7. **"COS.API on a managed service"** is a Tier 1 outcome, but §2 links no ABC for it (ABC-05).
8. **D2 wording** — "the assessment starts as soon as the VPMS conversation is initiated" vs §2.1 where COS requests the assessment after treatment codes. Suggest "the claim context starts being enriched as soon as…".
9. **Sophia Junior** is drawn inside the ML environment in the §2.1 pictures but listed as the separate Claims Automation component in §2.3–2.4.
10. **§5 "Differences from the high-level solution v0.3"** lists two items; this report lists the full set — consider linking it.
11. Typos: "it duplicate" (D2), "performin" (D4).

---

## 7. Suggested order of updates

1. Decide the open points in section 6 (1, 2, 5 first — they change several pages).
2. Rewrite **ABC-03, ABC-06** and create **ABC-17, ABC-19, ABC-21** (Tier 1 core).
3. Rewrite **early-starter.md** around the vision picture; move the old option analysis to an appendix.
4. Update **ABC-02, ABC-04, ABC-05** (+ ABC-18).
5. Update the **HLS**: terminology, tier tables, problems LP-9 / LP-10, §3.5, §3.6, open questions; bump to v0.4.
6. Tier 2: **ABC-01, ABC-07, SOL-2** (ICD-11, events); **ABC-08, ABC-09, SOL-3** (two bays, CATCH sequencing); **ABC-15, ABC-16** (tier).
7. Tier 3: **ABC-13**, **SOL-4**, Claim Context (`CorrelateToPolicy` rule), Entity Mapper (VetHub system, 1:N rule).
8. Redraw the diagrams in section 5.
