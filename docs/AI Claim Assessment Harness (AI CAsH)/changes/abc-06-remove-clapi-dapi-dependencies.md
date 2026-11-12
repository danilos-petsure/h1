# ABC-06 — Remove dependencies on CLAPI and DAPI

| | |
|---|---|
| **Tier** | 1 · Quick wins |
| **Solution** | [SOL-1 Early Starter](../solutions/early-starter.md) |
| **Problems solved (part)** | [LP-2 Late, serial assessment, LP-5 Fragile, ageing platform, LP-3 Coupling to UPM](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-04](abc-04-remove-polling-vethub-cos.md) (deployed — the routing context travels in *Conversation Submission Completed*) |
| **Needed by** | ABC-02 (started), ABC-16 (deployed) |
| **Status** | Draft — DAPI part **[TBC]** |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

VetHub calculates the insurer routing context once; COS uses it to lodge directly in the right DAPI and UPM Dynamics API. CLAPI and Dynamic CLAPI *Lodge Claim* are retired. Replacing DAPI staging (and the ~10-minute DS-table poll) with a direct UPM lodgement API is assessed with Gratex.

## Problem it solves

COS reaches UPM through several API layers, with routing decided in each: CLAPI picks the DAPI, Dynamic CLAPI picks the UPM instance for lodgement and again for write-back, and DAPI stages the claim in DS tables that UPM polls.

**CLAPI** (IIS on VMs, .NET Framework 4.8; no inbound authentication; production credentials committed in the repo) is used by COS for:

| COS use | CLAPI operation |
|---|---|
| Claim submission | `POST api/Claims`, `PUT api/Claims/FinishSubmitClaim` |
| Attachments | `POST api/Claims/Attachments`, `POST api/Claims/AdditionalAttachments`, `PUT api/Claims/FinaliseAdditionalAttachment`, `POST api/Claims/CosAdditionalAttachments` |
| Policy validation | `POST api/Policy/Find`, `GET api/Policy/DetailsByPolicyNumber` |
| Status sync (UPM Status Poller, 30 s) | `GET api/Claims/GetUpdatedClaimsList` |
| Gap-only (feature-flagged) | `SubmitServiceProviderFee`, `UpdateCSPReferenceNumber`, `GetGapClaimBenefitDetails` |

**DAPI** writes to the UPM `DS_*` tables; a Business Central job ingests them about every 10 minutes. It is end-of-life, on-prem for AU / Trupanion, with MSMQ, `mpr.dll` share mounting and a file share UPM reads.

See [CLAPI](../../infrastructure/go-tech-components/04-clapi.md), [DAPI](../../infrastructure/go-tech-components/05-dapi.md), [COS flow model](../../infrastructure/go-tech-components/02a-cos-flow-model.md).

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-06.1 | VetHub | Add | Calculate the insurer routing context at the start of the conversation; carry it in *Conversation Submission Completed* |
| ABC-06.2 | COS | Add | Routing-context resolver (routing context → DAPI and UPM Dynamics API instance) |
| ABC-06.3 | COS services | Evolve | Submit / finish directly in DAPI; lodge directly in the UPM Dynamics API |
| ABC-06.4 | COS services | Evolve | Remaining CLAPI uses (attachments, policy find, status list, gap-only) moved to DAPI / VetHub / COS **[per operation TBC]** |
| ABC-06.5 | DAPI | Evolve | New direct caller: COS (authentication, network path, contract) |
| ABC-06.6 | UPM Dynamics API | Evolve | New direct caller for *Lodge Claim*: COS |
| ABC-06.7 | Dynamic CLAPI | Decommission | *Lodge Claim* operation and its UPM routing logic |
| ABC-06.8 | CLAPI | Decommission | *Submit* / *Finish* and DAPI routing; then the component (hosting, secrets, monitors, pipelines) once no consumer remains |
| ABC-06.9 | UPM+ | Add **[TBC]** | Lifecycle-stage lodgement API (T1.3, Gratex) |
| ABC-06.10 | DAPI staging + DS-table poll | Decommission **[TBC]** | Only if ABC-06.9 is agreed |

## Dependencies

- [ABC-04](abc-04-remove-polling-vethub-cos.md) — **deployed first**: COS receives the routing context from the event-triggered start.

## Acceptance criteria

- **AC-1** CLAPI *Submit* / *Finish* and Dynamic CLAPI *Lodge Claim* have no callers.
- **AC-2** Every other CLAPI operation used by COS has a named replacement or an explicit decision to keep it for now.
- **AC-3** CLAPI is retired once no consumer remains (per insurer if needed).
- **AC-4** A decision is recorded on ABC-06.9 / ABC-06.10.

## Open questions

- Other consumers of CLAPI (CSP, Boomi / Vet Partners, NZ).
- Is a direct UPM lodgement API feasible with Gratex in the H1 timeframe?
