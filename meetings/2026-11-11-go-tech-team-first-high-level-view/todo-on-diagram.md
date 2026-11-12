# TODO on the diagram — from Go Tech review 2026-11-11

Changes to the high-level solution diagram that came up in the meeting. Timestamps refer to `High-level solution.vtt`.

## Missing boxes / steps

- [ ] **Claims Automation (CA)**: add it to the COS flow after policy validation. *(00:04:32)*
- [ ] **Claim reference number generation**: show it in COS next to policy validation. *(00:04:20)*
- [ ] **Business Rules**: add it as a box after the GP model (EasyCohort → GP model → Business Rules). The business will look for it. *(00:25:35–00:31:23)*
- [ ] **QFB as the 4th answer source**: under the question-answering step, add "human-answerable questions" going through Quick Fix Bay, next to SQL/deterministic, ML model and AI agent. *(00:23:50)*
- [ ] **Re-run the case linking model**: call condition linking again after the diagnosis is found through the new AI path. *(00:35:05)*
- [ ] **Case-only fallout path**: when the diagnosis is found but the case isn't, route to QFB, optionally with an AI-suggested case. *(00:35:34–00:37:35)*
- [ ] **Optional business rules after Q&A**: rules evaluated on the deterministic answer values. *(00:28:23)*

## Sequencing / process clarity

- [ ] **Enrichment order**: fix the order inside "Enriched medical assessment state". Diagnosis family currently appears before the GP model has run. Show the dependencies and which steps run in parallel vs in sequence (confirm with Bryce and Sophia). *(00:18:34–00:21:31)*
- [ ] **Early exits**: show that not every claim goes through every step. A claim solved by EasyCohort, the GP model or Business Rules exits early, and the AI path only replaces "fall out". The diagram should show the process, not just the components. *(00:24:15–00:25:07)*
- [ ] **New timing view**: add a diagram showing what happens when and in parallel. Cover VetHub completing the submission alongside enrichment steps 1–4, then COS policy validation and CA, then the "ready" signal to Clawdia. *(00:46:18)*
- [ ] **Enrichment trigger point**: show when enrichment starts. It should be once all attachments (VPMS-sent plus VetHub-generated) are saved and the claim is ready for COS, or optionally per attachment. *(00:51:19–00:51:56)*
- [ ] **Model sequencing**: GP model, then the condition linking model. Case allocation rules (e.g. routine care) are deterministic and can come earlier. *(00:33:37–00:34:15)*

## Corrections

- [ ] **Attachment classification**: mark it with "?" / "!" because its value is unconfirmed. Most content is already structured in the XML; EasyVet is the main OCR case. *(00:54:21)*
- [ ] **Benefit amount**: the diagram draws it UPM Plus → VetHub directly. Decide whether it goes via COS (BAU, which supports the manual "retrieve benefit" in CATCH/QFB) and draw it accordingly. *(00:56:13–00:57:48)*
- [ ] **Lodge claim box**: make explicit that "lodge claim" means lodge **plus** write (write, inspect, finish), all done by COS. *(01:07:44, 01:08:37)*
- [ ] **QFB scope**: show QFB as a fix bay for the **whole flow**, not only medical assessment. Entry points to draw:
  - retry
  - lodgement or technical failure
  - CA line creation for GapOnly before Clawdia
  - case fix
  - manual benefit amount
  - UPM-held validations such as bank details or duplicate invoice, if surfaced
  
  *(01:00:11–01:00:32, 01:17:15)*
- [ ] **CATCH wording**: label QFB as replacing *features of* CATCH, not CATCH itself. *(00:08:05)*

## Related (not the diagram itself)

- [ ] Fix the Confluence statement that claims are "not partially assessed". Today the diagnosis gets written and the case is left as "unable to find case". *(00:37:35)*
- [ ] Next session: overlay **BCP mode**, where claims are held in COS while UPM is down. *(01:28:04)*
