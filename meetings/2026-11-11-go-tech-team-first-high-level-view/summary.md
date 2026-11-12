# Summary — Go Tech team: first high-level view of the H1 solution

- **Date:** 2026-11-11 (~91 min)
- **Source:** `High-level solution.vtt`
- **Presenter:** Danilo Scuderoni
- **Attendees:** Cris Bull, Jeniefer Saunders, Toby Yoo, Basit Ameen, Julie Crisp (start only)
- **Purpose:** Walk the Go Tech team through the target-state diagram and challenge the ideas before engaging the business. Danilo framed it as the "ideal" version; the final design will be settled through these workshops, and the business hasn't been engaged yet (especially on the AI part).

> Transcript names normalised: "Claudia/Claw" = Clawdia, "Cos/cause/CODS" = COS, "Vet up" = VetHub, "UPN Plus" = UPM Plus, "Easycohortaudit" = EasyCohort, "CLO in it" = Clawdia init call.

---

## 1. Target flow presented

1. VetHub submits the conversation. Polling is replaced with an **event**, and COS reacts to it.
2. COS validates the policy, generates the claim reference number and runs Claims Automation (CA). CA was missing from the diagram.
3. COS signals Clawdia that it's ready for the **medical assessment**. Clawdia finishes the enrichment it has already started, then assesses.
4. Only **after** the diagnosis is known does COS lodge the claim in UPM, with treatment codes **and** diagnosis.
5. **Quick Fix Bay** (QFB) replaces CATCH features (CATCH 1.0 and 2.0) for quick fixes and manual medical assessment. It's backed by a task manager for allocation.

**Why assess before lodging:** sometimes a line item has to be split across diagnoses. For example, an $80 consult covering an itchy ear and arthritis becomes two $40 lines, so 20 lines turn into 21. Nobody has tested whether the UPM write API accepts line items that weren't lodged, but everyone expects it to fail: Jen noted each invoice line has a pre-assigned number. Lodging once the final line items are known avoids that problem and also decouples the steps. Danilo noted that speed is no longer a priority.

## 2. Making the medical assessment "AI-ready"

- **Enriched medical assessment state.** Building it starts at conversation submission. Inputs:
  - claim XML
  - policy
  - attachment classification (OCR plus an ML classifier)
  - clinical information extracted from consult notes with **PetBERT** (body part such as left vs right ear, observations, the vet's suspected syndrome)
  - diagnosis family
- **Diagnosis family.** For the MVP, use the GP model's output when its confidence is too low to set the diagnosis. Bryce agreed this works within a confidence threshold. A dedicated model is a possible later step. Cris pointed out that the diagram currently shows diagnosis family before the GP model runs.
- **Relevant-question lists per diagnosis family.** An AI deep search produced a draft list for GI diseases (e.g. a cPL test to rule pancreatitis in or out). Sophia, as SME, is to review it. Danilo still needs to validate the "guess who" model of how assessors think with Sophia.
- **Answer sources:**
  - deterministic answers (SQL)
  - ML model per question
  - **AI agent** (name ideas: "Cashew", "Golden Retriever")
  - **human via QFB** (missing from the diagram)
- **Answer validation.** The agent's reasoning is traced to detect hallucination. Low-confidence answers go to QFB, and gaps (missing state, poor questions) feed a self-improvement loop as automatic tickets.
- **Diagnosis from Q&A.** The question-and-answer set feeds a fine-tuned model trained on historical data. Business rules can then run on the Q&A values.
- **Existing path unchanged.** EasyCohort → GP model → **Business Rules** (missing from the diagram) stays as is. If a claim is solved early, it exits. The new path replaces "fall out" with AI assessment.
- **Business Rules today** cover about 6 diagnoses that need human-like decisions. For example, for flea/tick/worm the rules check coverage, such as routine care, to maximise the customer's benefit. Cris noted this is essentially a "relevant questions" pattern that already exists.

## 3. Case linking

- The condition-linking model needs the diagnosis first, so it runs after the GP model unless EasyCohort or a deterministic rule already set the diagnosis. Routine-care cases, for example, are allocated by rule.
- With the new path, the **case model must be called again after the diagnosis is found**.
- Bryce reports the case model at about 98.6% success, but the overall uplift is much lower once rules apply. Danilo believes the rules will be removed only partway through.
- **Today claims ARE partially assessed:** the diagnosis is written but the case shows "unable to find case", and a human fixes it in UPM. UPM is effectively the QFB for cases. The Confluence statement saying otherwise needs correcting.
- A claim that falls out only on case could go to QFB, possibly with an AI-suggested case.

## 4. Processing time

- Toby raised a concern: assessment already takes 15–30 s, and more AI, OCR and attachment steps could push it past a minute. He asked whether Clawdia could run in parallel with the rest of the process.
- Danilo's answer:
  - Enrichment steps 1–4 run **while VetHub is still completing the submission**.
  - Removing polling saves time.
  - COS only signals "ready" after policy validation and CA (about 6 s); it doesn't invoke the assessment synchronously.
- The team asked for a diagram showing what runs when and in parallel.

## 5. Attachments

- There are two kinds of attachments:
  - **sent by the VPMS**
  - **generated by VetHub** from the XML, for RxWorks, CHS Vet and VetLink SQL. These contain clinical history, consult notes and/or invoice depending on the VPMS.
- The merged PDF is created in COS at the end.
- **Trigger point:** once all attachments (received and generated) are saved and the claim is ready for COS. Reacting to each attachment as it arrives could start the work earlier.
- Most attachment content is already structured in the XML, so attachment classification may be low value. It should be marked "?", and the business should decide after a sample review.
- **EasyVet** doesn't send structured consult notes, so it's the clear OCR case. Alex is talking to EasyVet about providing them.
- Jen recalls assessors don't really look at X-rays, but that was a few years ago and should be rechecked.
- All received attachments are saved. File types are restricted at the VPMS.

## 6. Benefit amount

- The diagram draws the benefit amount going UPM Plus → VetHub directly. BAU routes it via COS because of CATCH's manual "retrieve benefit" fallback.
- On the happy path it could go directly, with QFB or CATCH covering the manual case.

## 7. Lodgement into UPM and decoupling Clawdia

- **Lodge and write both use the Dynamic Claims API.** Jen confirmed this. Write is three calls: **write, inspect, finish** (Basit). All three would move to COS.
- **Brett's objective** is to decouple Clawdia from UPM in both directions: UPM calling Clawdia, and Clawdia calling UPM. COS would become the only UPM integrator.
- **Debate:**
  - Cris and Toby: leaving write in Clawdia is less work, since "Go Tech calls UPM" either way.
  - Jen: it makes sense in COS.
  - Danilo: keeping it in Clawdia is tech debt and affects error handling.
- **Today the write request is built from the Logic App workflow state** (JSON in memory), not from the database.
- **Lodge success:**
  - Lodge is currently async: it returns 200 without knowing whether the claim reached RFA. Write is blocked while the claim is in initial (INI) status.
  - Cris prefers an event-driven UPM callback on RFA. Jen suggested a synchronous lodge that returns the status, or a status check after the 200. Once the claim is in RFA, COS writes the diagnosis and case.
  - A timer is still needed for the edge case where UPM never responds. One already exists for gap claims.
- **UPM-only validations** (bank details, duplicate invoice, blacklist) are unknown to COS and Clawdia. Either keep them in UPM or expose them via UPM APIs before lodging.
- **On failure** a human takes over and the claim exits STP. Don't return a technical error to the vet; fix it internally.
- **QFB covers the whole flow, not just medical assessment.** That includes retries, lodgement failures and fixing CA line creation for GapOnly before Clawdia.
- Lodgement failures from DAPI or CLAPI (today fixed by assessors creating claims manually in UPM) will still occur.

## 8. COS hosting

- **COS API → App Service.** This needs a framework and logging update; the same work was just done for VetHub.
- **Windows services VM:** Danilo believed only AKS (single-instance lift-and-shift) would work, because Container Apps runs Linux only. **Basit:** upgrade to **.NET 10** (background or hosted services), which runs on Linux, so it can use **Azure Container Apps** without managing clusters. A containerisation PoC was already planned. This was taken offline.
- **Quick option:** a Logic App that calls the existing saga with claim and treatment codes, waits, then writes. This moves write into COS while reusing the saga, and also helps the move off VMs.

## 9. Strategy and other points

- Cris: don't say "replace CATCH" to the business. Say QFB replaces *features* of CATCH.
- Agreed approach: present the best version first and let the business trim it.
- **BCP mode:** a switch holds claims in COS when UPM is down. It needs to be overlaid on the new architecture, and the new flow might even allow full assessment while UPM is down. This is for the next session.

## Decisions / agreements

- Present the full ideal version to the business first.
- Keep EasyCohort → GP model → Business Rules unchanged and add Business Rules to the diagram.
- QFB scope is the whole flow; it is not limited to medical assessment.
- Attachment classification is marked as questionable (low priority unless the business sees value).
- The next sessions focus on **integration calls between components** (who calls whom, when). Model internals are out of scope for this team.

## Actions

| Owner | Action |
|---|---|
| Danilo | Update the diagram (see `todo-on-diagram.md`) |
| Danilo | Fix the Confluence "claims are not partially assessed" statement |
| Danilo | Confirm sequencing and dependencies of the enrichment and models with Bryce and Sophia |
| Danilo | Validate the assessor "guess who" approach and the question lists with Sophia |
| Danilo / Basit / Toby | Offline: hosting options for the COS Windows services (.NET 10 + Container Apps vs AKS) |
| Team | Test whether the UPM write API accepts line items that weren't lodged (optional, expected to fail) |
| Alex | Ongoing: ask EasyVet for structured consult notes |
| Danilo | Set up follow-up sessions: tomorrow 9:30–10:30 (smaller, more detail), then a deep dive (Wednesdays and Thursdays suit; Toby is out Mondays and Fridays; Tuesday is worst) |
| Next session | Deep dive into the end-to-end flow and integration points; BCP mode overlay |
