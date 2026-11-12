# Solution options — from Go Tech review 2026-11-11

The design options that emerged during the walkthrough. Status reflects the meeting, not a final decision. Timestamps refer to `High-level solution.vtt`.

---

## 1. When to lodge in UPM relative to the medical assessment

| Option | Description | Pros | Cons | Raised by |
|---|---|---|---|---|
| **A. Assess, then lodge** *(proposed)* | COS lodges only once Clawdia knows the diagnosis and final line items | Handles line items split across diagnoses; decouples UPM from Clawdia | Larger change to COS and Clawdia | Danilo |
| B. Lodge first (today), enhance write API | Keep today's order and extend the UPM write API to accept extra line items | Smaller flow change | Untested, and expected to fail because each invoice line has a pre-assigned number; still couples the steps | Cris |
| C. Start lodging as soon as line items are known | Lodge early to save time | Faster | Line items aren't known until the full assessment is done | Danilo (Cris doubts it) |

**Leaning:** A. *(00:09:40–00:13:12)*

## 2. How the diagnosis gets into UPM

| Option | Description | Notes |
|---|---|---|
| A. New single API | One UPM API to lodge the claim with treatment codes and diagnosis | Depends on UPM delivering the API, which "may or may not happen" |
| B. Two-step | Lodge with treatment codes, wait for confirmation (init or RFA), then write diagnosis and case (write, inspect, finish) | Reuses existing Dynamic Claims API calls |

The waiting step in B can live in **COS** (preferred) or in **Clawdia**, as it does today. *(00:05:43–00:06:40, 01:07:44)*

## 3. Who calls UPM write

| Option | Pros | Cons | Support |
|---|---|---|---|
| **A. COS** (sole UPM integrator) | Meets Brett's objective of decoupling Clawdia from UPM in both directions; COS knows the lodge outcome; cleaner error handling | Write, inspect and finish must move; the write request is built today from Clawdia Logic App state, so COS needs that payload | Danilo, Jen |
| B. Clawdia (today) | Less work, because the APIs already exist there; "Go Tech calls UPM" either way | Tech debt; the Clawdia workflow must stay alive waiting for the init call; still coupled | Cris, Toby |

*(01:08:37–01:14:58)*

## 4. How COS knows lodgement succeeded (reached RFA)

| Option | Description | Notes |
|---|---|---|
| A. UPM callback on RFA (init call) | Event-driven; UPM tells COS once the claim reaches RFA | Cris prefers it ("cleaner, no 'are you there yet'") |
| B. Synchronous lodge | Enhance the lodge API to respond only after it reaches INI or RFA | Jen; this was the original solution. Needs a UPM change |
| C. Status check after 200 | Lodge stays async; COS queries the status | Jen; polling-like |
| + Timer / timeout | For the edge case where UPM never responds | Already exists for gap claims (~30–50 s); Danilo wants it in COS |

If the claim reaches RFA, COS writes the diagnosis and case. Otherwise a human fixes it. *(01:15:01–01:26:40)*

## 5. UPM-only business validations (bank details, duplicate invoice, blacklist)

| Option | Notes |
|---|---|
| A. Keep in UPM | Less work. COS only learns the outcome via RFA or no RFA |
| B. Call UPM APIs before lodging | COS knows up front, so only technical errors remain. Opens the possibility of fixing in QFB |

*(01:17:35–01:18:45)*

## 6. Failure handling after lodgement

| Option | Notes |
|---|---|
| A. Human takes over in UPM, claim exits STP (BAU) | Notification plus assignment |
| B. QFB task | Tell the user what to fix. Open question: can QFB input tell UPM to continue? |
| ~~C. Return error to VetHub~~ | Rejected. Don't go back to the vet with a technical error |

*(01:22:08–01:23:51)*

## 7. Claims submission saga / Logic Apps

| Option | Description |
|---|---|
| A. Logic App wrapping the existing saga | Call the saga with claim and treatment codes, wait, then write. This is the quick way to move write into COS |
| B. Replace the saga with Logic Apps | Adds auto-retry and helps the move off VMs to managed services |
| C. Keep the saga as is | Write stays in Clawdia |

*(00:06:40–00:07:40, 01:00:54, 01:05:51)*

## 8. COS hosting (Windows services VM)

| Option | Description | Notes |
|---|---|---|
| COS API → App Service | Framework and logging update | Agreed; same work as just done for VetHub |
| A. AKS, single instance | Lift and shift of the Windows container | Danilo's initial view |
| B. Upgrade to .NET 10 (background/hosted services) → Azure Container Apps | Runs on Linux; no cluster management | Basit. Containerisation PoC was planned |
| C. Re-implement in Logic Apps / Functions | Managed services | Danilo's earlier thinking, based on the assumed limitation |

Taken **offline**. *(01:01:36–01:05:12)*

## 9. Diagnosis family source

| Option | Notes |
|---|---|
| **A. GP model output below the confidence threshold** *(MVP)* | Bryce agrees, within a threshold |
| B. Dedicated diagnosis-family model | Expected to be efficient; later |
| C. Derived from structured data (XML, PetBERT, consult notes) before the GP model | Can start early; no GP model needed first |

*(00:18:34–00:20:23, 00:53:03)*

## 10. Answering relevant questions

| Option | Notes |
|---|---|
| A. Deterministic / SQL | |
| B. ML model per question | Bryce. Historical data is available |
| C. AI agent ("Cashew" / "Golden Retriever") | Answers are validated by tracing the agent's reasoning |
| D. Human via QFB | Missing from the diagram |

Downstream, choose one or both:

- a fine-tuned model on Q&A to produce the diagnosis
- business rules on the Q&A values

*(00:23:50, 00:28:23–00:30:57, 00:38:53)*

## 11. Attachment classification

| Option | Notes |
|---|---|
| A. OCR plus ML classification for all attachments | Value unconfirmed; most content is already structured in the XML |
| B. Only for EasyVet, the VPMS without structured consult notes | Or remove the need entirely if EasyVet supplies structured notes (Alex is on it) |
| C. Drop / low priority | Pending a sample review and a business view. Assessors may not use X-rays (recheck) |

The trigger is either **per attachment as it arrives** (earlier) or **once everything is saved and ready for COS** (simpler). *(00:51:04–00:55:35)*

## 12. Benefit amount route

| Option | Notes |
|---|---|
| A. UPM Plus → COS → VetHub (BAU) | Supports the manual "retrieve benefit" fallback (CATCH/QFB) |
| B. UPM Plus → VetHub directly on the happy path | Manual fallback through QFB or CATCH |

*(00:56:13–00:57:48)*

## 13. Case not found

| Option | Notes |
|---|---|
| A. Write the diagnosis to UPM, case "unable to find", human fixes in UPM | Today's partial assessment |
| B. Case-only fallout → QFB, optionally with an AI-suggested case, before lodging | Proposed |

In both options, re-run the case model after any new diagnosis. *(00:35:05–00:37:35)*

## 14. Policy loading for enrichment

| Option | Notes |
|---|---|
| A. Load after COS policy validation | Safe |
| B. Pre-load before validation and detect policy changes | Earlier start |

*(00:46:53–00:47:11)*

## 15. CATCH / Quick Fix Bay

| Option | Notes |
|---|---|
| A. QFB replaces CATCH features (1.0 and 2.0), backed by a task manager for allocation | Proposed. Present it as "replacing features", not "replacing CATCH" |
| B. Keep CATCH with the Reactor-based allocation | Today |

*(00:07:40–00:09:06)*

## 16. BCP mode (UPM down)

| Option | Notes |
|---|---|
| A. Hold claims in COS (today's switch) | |
| B. Fully assess the claim while UPM is down, lodge later | Possible with assess-before-lodge |

To be discussed next session. *(01:28:04–01:28:52)*

---

**Presentation strategy:** take the best version to the business first and expect it to be trimmed. *(00:57:48–00:58:35)*
