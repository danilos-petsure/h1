# Horizon 1 Form – Claims Automation – Continuous STP Uplift

> Source: *HORIZON 1 FORM Claims Automation - Continuous STP Uplift.pdf* (5 slides). Wording kept as in the presentation; layout converted from multi-column slides to a sequential read.

**Contents**

1. [GapOnly Platform & Claims Automation | ROADMAP](#1-gaponly-platform--claims-automation--roadmap)
2. [Key Component Descriptions](#2-key-component-descriptions)
3. [Horizon 1 Form (1 of 2)](#3-horizon-1-form-1-of-2)
4. [Horizon 1 Form (2 of 2) – H1 Outcomes](#4-horizon-1-form-2-of-2--h1-outcomes)
5. [Horizon 2 Form](#5-horizon-2-form)

---

## 1. GapOnly Platform & Claims Automation | ROADMAP

**Status:** WORKING DRAFT
**Investment (FY27):** ~$1.5m total

### HORIZON 1 – Optimise and scale (FY27 – FY28)

*Capture near-term value and grow the platform*

#### Automate more claims now

*Optimise PetSure claims within the existing architecture*

**Purpose**

Capture near-term claims administration savings by increasing E2E STP across GapOnly and Pet Portal claims, while establishing how far the current claims architecture can take us before material re-architecture.

**Automation paradigm:** STP or manual.

**Key components**

1. Structured inputs & OCR
2. Scalable model orchestration
3. Platform resilience
4. Additional ML models
5. Automated assessment & decisioning
6. Existing UX/UI & exception handling
7. Monitoring & model assurance
8. Platform Resilience

**Success measures**

STP % | Manual claim volume | CPC | Claims administration cost

#### Expand the GapOnly platform

*Establish GapOnly as a pet health, provider and ClaaS platform*

**Purpose**

Transform and expand GapOnly beyond the core claims experience into a broader pet-health ecosystem, connecting pet owners, veterinary providers, insurers and complementary services through the GapOnly brand. Create a common digital experience spanning claims and other pet-health moments, while expanding reach and creating new revenue opportunities.

**Key components**

1. Common clinic experience & VPMS ecosystem
2. GapOnly consumer app / digital wallet
3. Pet-health ecosystem & services
4. Global eligibility, provider configuration & MDM
5. Multi-insurer / multi-transaction claiming
6. New Zealand expansion
7. GapOnly Always On
8. Claim Pre-Approval automation
9. AI scribe integration
10. ClaaS & flexible service boundaries

> **Dependency (10 ↔ Horizon 2, component 1):** ClaaS flexibility dependent on common claims automation pathway and modular claims capabilities.

**Success measures**

GapOnly utilisation | Platform reach | Transaction volume | Revenue | Profitability

### HORIZON 2 – Transform (FY28+)

*Address the residual automation opportunity*

#### Automate more of every claim

*Transform PetSure claims through future-state automation*

**Purpose**

Address the residual manual effort and claims administration cost remaining after Stream 1, by automating as much of each claim as possible.

**Automation paradigm:** Targeted intervention, then resume automation.

**Investment gate:** Proceed only if residual manual effort and cost justify further investment.

**Key components**

1. Common claims automation pathway
2. Medical facts & clinical intelligence
3. Configurable policy decisioning
4. Quick-Fix Claims Advisor experience
5. Business-managed rules & configuration
6. Automation intelligence & optimisation
7. Performance, assurance & operational controls

**Success measures**

CPC | Manual effort / AHT | % claim automated | Quick-Fix rate | Full manual fallout | STP %

### TECHNOLOGY RESILIENCE & MODERNISATION

Strengthen enduring technology foundations to support roadmap scale, availability and automation through FY30.

---

## 2. Key Component Descriptions

**Status:** WORKING DRAFT

### Automate more claims now

#### Structured inputs & OCR

Improve the quality and structure of information entering the claims pathway. Enhance document extraction from CSP so more claims can enter the automated Medical Record Claims pathway, and use OCR within the standalone GapOnly Vet Portal to reduce clinic data entry, simplify submission and increase utilisation. The objective is to maximise the proportion of claims arriving with sufficient structured evidence to support downstream automation.

#### Scalable model orchestration

Evolve Clawdia as the orchestration service for automated claims assessment, enabling a claim to be dynamically routed to the specialist models and services required for that claim. Use a modular approach so individual models or services can be introduced, improved or replaced incrementally without redesigning the entire claims pathway. The specific technical implementation (e.g. microservices) remains subject to architecture design.

#### Platform resilience & architecture

Validate the component and target architecture required to support increased automation and claim volumes, including orchestration, resilience, scalability, performance, maintainability and obsolescence. Define the transition from the current environment, focusing investment on components expected to remain part of the future claims landscape.

#### Additional ML models

Introduce specialist AI/ML and deterministic models to automate additional clinical assessment activities that cannot currently be reliably completed through the existing Clawdia capability (GP Model). Prioritise models according to claim volume, automation opportunity, accuracy and expected administrative benefit.

#### Automated assessment & decisioning

Reuse relevant capabilities developed through STP90, including Condition Linking, treatment attribution and deterministic assessment rules, to progressively automate more of the end-to-end claims assessment. Combine AI-derived clinical facts with deterministic decisioning wherever appropriate to maintain explainability and control.

#### Existing UX/UI & exception handling

Maximise the existing Claims Advisor experience rather than materially redesigning the assessor interface before the residual manual workload is understood. Make targeted improvements where they materially reduce handling effort, including improved exception handling and potentially agentic-enabled workflow automation.

#### Monitoring & model assurance

Continue monitoring across model accuracy, confidence, STP/fallout, leakage, …

> *Note: text is cut off at the bottom of the source slide.*

### Expand the GapOnly platform

#### Common clinic experience & VPMS ecosystem ✈

Establish a consistent GapOnly claiming experience across veterinary workflows, whether accessed through the standalone GapOnly Vet Portal or embedded within a VPMS using the SDK, preserving a recognisable GapOnly experience.

#### GapOnly consumer app / digital wallet

Create a common GapOnly digital experience for pet owners, with verified policy and pet information available to initiate claims accurately and easily. Over time, evolve the experience beyond claiming to provide a digital front door into relevant pet-health services and experiences, with GapOnly acting as the unifying brand across the ecosystem.

#### Pet-health ecosystem & services

Extend GapOnly into complementary pet-health services beyond claiming. Use the GapOnly brand and digital experience to connect customers with services such as online pharmacy through partners including PetScripts and PetChemist, and LiveVet for on-demand online veterinary consultations, with the potential to progressively add other relevant pet-health moments.

#### Global eligibility, provider configuration & MDM

Establish a common platform capability to manage who can access what, and how transactions are routed, based on Provider × Administrator × Claim/Transaction/Service Type. Maintain a reliable provider identity and source of truth, with configurable provider eligibility, segmentation, service access, performance-based controls and lifecycle management. This provides the foundation for scaling GapOnly consistently across providers, insurers, transaction types, regions and new ecosystem services.

#### Multi-insurer / multi-transaction platform

Enable the common GapOnly experience to support multiple insurers and an expanding range of transactions and pet-health services, with the platform determining eligibility and routing each interaction to the appropriate provider, insurer or service (e.g. routing claim to the appropriate assessment system: PetSure → UPM; Trupanion → TrUPM).

#### New Zealand expansion

Extend the common GapOnly experience into NZ through two complementary channels: the standalone GapOnly Vet Portal to provide broad/100% clinic coverage, and VPMS/SDK integrations (Vision & ezyVet).

#### GapOnly Always On

Extend GapOnly availability so clinics can use the service when treatment occurs, reducing availability as a barrier to utilisation.

#### Claim Pre-Approval automation

Extend GapOnly earlier in the treatment journey by automating pre-approval for eligible planned procedures. Specific solution (e.g., FSAI) to be decided.

#### AI scribe integration

> *Note: description is cut off at the bottom of the source slide.*

### Automate more of every claim

#### Common claims automation "Golden pathway"

Establish a common pathway that standardises and normalises claims received from different channels before they enter automated assessment. Enable the same core automation capabilities to be reused across channels, insurers, products and regions rather than maintaining bespoke end-to-end claims pathways (see slides 6 &7).

#### Medical facts & clinical intelligence

Create a common, insurer-agnostic clinical intelligence layer that derives the medical facts required for claims assessment from available clinical evidence. This includes diagnosis, FCS, relatedness, treatment attribution and other relevant clinical facts. These facts can then be reused independently of the insurer or policy against which the claim is subsequently assessed.

#### Configurable policy decisioning

Apply the relevant insurer/product configuration to common medical facts to determine policy eligibility, case assignment, benefit calculation and claims outcomes.

#### Quick-Fix & Claims Advisor experience

Design the future assessor experience around targeted exception handling. Where a claim cannot continue automatically, identify the specific issue requiring human intervention, present it as a targeted Quick-Fix, then return the claim to the automated pathway rather than defaulting to end-to-end manual assessment.

#### Business-managed rules & configuration

Enable authorised business teams to create and maintain rules, mappings, thresholds and relevant configuration without relying on routine technology deployments.

#### Automation intelligence & optimisation

Continuously analyse automation outcomes, fallout and Quick-Fix reasons, model confidence, rule performance, audit findings and false positive/negative outcomes to identify opportunities to safely increase automation. Use analytics and AI to identify patterns and simulate potential improvements, while retaining human governance over what changes are ultimately deployed.

#### Performance, assurance & operational controls

Provide end-to-end visibility across automation, fallout, AHT/CPC, model and rule performance, leakage, integrity and exception patterns. Detect systemic failures or abnormal behaviour early and support failure isolation, circuit breakers, controlled degradation and safe recovery. Avoid an all-or-nothing model where failure of one capability unnecessarily sends large volumes of otherwise automatable claims into manual assessment.

---

## 3. Horizon 1 Form (1 of 2)

**Status:** DRAFT
**Forum:** Oct-26 PSC

### Initiative overview

| Field | Value |
|---|---|
| Initiative name | **Claims Automation - Continuous STP Uplift** |
| Strategic placement | *Pillar 3 - Extending Vet Claiming Advantage* |
| Delivery lead | Julie C |
| Business lead | Alex H |
| Benefit owner | Jade A |
| Exec sponsor | Peter K |
| Target RFS date | ~Q4/Early FY28: TBC as an output of planning |
| EAC $ | TBC as an output of planning |

### Decision request

Approve progression to **detailed discovery and planning** for the next phase of claims automation beyond STP25, to:

- establish the achievable automation/STP opportunity, feasibility and expected value; and
- validate the target architecture, transition strategy, human-in-the-loop operating model and AI governance required to support increased automation safely and sustainably.

Return to PSC with a Horizon 2 Form in Jan/Feb 2027 setting out the recommended implementation scope, investment, benefits and delivery plan.

### Problem Statement

We have progressively increased STP, with STP25 targeting the next uplift from Dec-26. However, most claims will continue to require manual assessment, driving claims administration cost as volumes grow.

Before committing to further investment, we need to establish **how far automation can practically and sustainably be extended within the existing claims environment**, the STP value available, and the architecture and operating model required to support it.

While the recent pivot away from Condition Code Claims changes the approach to solving for automation, it does not remove the need for model orchestration, human/automation interaction, platform resilience, maintainability and appropriate AI governance. **These architectural questions therefore need to be resolved alongside the automation opportunity before seeking implementation approval.**

### Solution Summary

Undertake a structured planning and discovery phase across Claims, AI and technology to establish the next claims automation uplift.

**Oct–Nov:**

- <u>ML and Claims SMEs</u> will assess the data and automation opportunity, including structured inputs/OCR, additional ML capability, deterministic decisioning and the AI operating model, to establish achievable STP uplift, feasibility and expected value.
- <u>Technology and GoTech</u> will complete component architecture discovery, assessing the orchestration, resilience, maintainability and human/automation interaction capabilities required to safely scale automation.

**Nov–Dec:** Bring these streams together to define the recommended target architecture, transition strategy, human-in-the-loop operating model and AI governance approach, alongside the enabling technology/infrastructure changes, implementation scope and business case.

**The intent is to maximise near-term automation while ensuring investment is aligned to a sustainable architectural pathway, before determining whether more material claims transformation is warranted.**

### Business Case

**Funding context:** ~$1.5m FY27 Capex allocated across GapOnly Growth and Claims Automation initiatives, of which $321k is already committed to STP25.

**Benefit context:** Claims administrative savings (reduced CPC/FTE); material increase in claims AHT

### Risks

| Risk | Mitigation |
|---|---|
| **Automation opportunity** – The achievable STP uplift may be lower than anticipated once claim complexity, model accuracy and exception volumes are understood. | Validate the automation ceiling, model feasibility and expected benefit before seeking implementation funding. Prioritise opportunities based on claim volume, accuracy and administrative benefit. |
| **Technology complexity** – Existing architecture, resilience or scalability constraints may increase the effort and cost required to safely support higher automation. | Establish the automation opportunity first, then determine the proportionate technology response. Focus investment on components expected to remain part of the future claims landscape. |
| **Benefits** – Forecast claims administration savings may not be realised if STP uplift, claim volumes or operational effort reduction differ from assumptions. | Develop the Horizon 2 business case using validated automation opportunities, operational baselines and sensitivity analysis before implementation approval. |
| **AI/model sustainability** – Increasing the number of models without appropriate controls may create operational, quality and supportability risk. | Establish an AI operating model covering ***develop → test/simulate → approve → release → monitor → auto-audit → optimise***, including model assurance and business-managed controls. |
| **Strategic alignment / rework** – Near-term investment could be superseded if a more material future-state claims transformation is subsequently pursued. | Prioritise reusable capabilities and modernise components expected to remain relevant. Defer material re-architecture until the residual automation opportunity and business case are understood. |

---

## 4. Horizon 1 Form (2 of 2) – H1 Outcomes

**Status:** DRAFT
**Forum:** Oct-26 PSC

### H1 Outcomes

| Outcome | What we will establish |
|---|---|
| **Automation opportunity & inputs** | Achievable STP opportunity and value, including how structured inputs/OCR across CSP and GapOnly Vet Portal can increase claims entering automation. |
| **AI/ML automation capability** | Priority specialist AI/ML and deterministic models to automate clinical assessment activities that cannot currently be reliably completed by the Clawdia GP Model, alongside opportunities to extend Condition Linking, treatment attribution and automated decisioning. |
| **Current & target architecture** | Establish the current-state architecture and define the target component architecture required to scale automation, including Clawdia/model orchestration and integration across specialist models and services. Develop the architectural roadmap to close the gap, aligning each iteration of STP investment to the target state while enabling efficient deployment and evolution and minimising rework. |
| **Platform resilience & transition** | Priority improvements to resilience, scalability, performance, maintainability and obsolescence, together with a transition strategy identifying what should be retained, upgraded, introduced or deferred as automation scales. |
| **Claims UX & exception handling** | Identify targeted improvements to the existing Claims Advisor experience, exception handling and workflow automation that materially reduce manual effort, while retaining the existing UX/UI where it remains fit for purpose. |
| **AI operating model & governance** | Sustainable controls for model deployment, business-managed rules/configuration, monitoring and assurance, covering ***develop → test/simulate → approve → release → monitor → auto-audit → optimise.*** |
| **Implementation case** | Recommended H2 scope, sequencing, investment, benefits and delivery plan, informed by the validated automation opportunity and architectural roadmap. |

---

## 5. Horizon 2 Form

**Status:** APPROVED
**Forum:** Sep-26 PSC

### Initiative overview

| Field | Value |
|---|---|
| Initiative name | **Continuous STP Claims Uplift** |
| Strategic placement | *Pillar 3 - Extending Vet Claiming Advantage* |
| Delivery lead | Julie C |
| Business lead | Jade A |
| Exec sponsor | Peter K |
| Target RFS date | December 2026 |
| EAC $ | $321k |

### Decision request

Approve **$321k** implementation funding and delivery commencement to lift STP Claims from **17.5% to 25%** in FY27 (and enable future uplifts in outer years), following completion of impact assessment, solution definition, planning and costing.

### Problem Statement

Claims automation is currently ~17.5% STP, with existing assessment automation constrained to annual or $0 condition based excess policies.

Achieving the FY27 25% target requires enabling non-$0 condition based excess policies to become STP-compatible, with Condition Linking and supporting automation capabilities required to safely determine and apply condition-based excesses.

Project Bingo increases the future relevance and value of Condition Linking as more policies move to condition-based excesses but is not the primary driver for the capability.

### Opportunity

Enable non-$0 condition based excess policies to become STP-compatible and increase STP from ~17.5% → 25% in FY27, reducing manual handling and processing cost while improving claim speed and consistency.

Investment creates reusable Condition Linking, ML and platform capabilities that support further STP uplift and the pathway to STP90, with increasing relevance as condition-based excess policies grow.

### Solution Summary

**Condition Linking** capability; ML endpoint deployment and operationalisation; UPM+ / Gratex enhancements; Audit, verification and threshold calibration; Monitoring, dashboarding and operational readiness; Business readiness and testing; and Production deployment and hyper-care within FY27

### Out-Of-Scope

Specialist Diagnosis Models; Multi-Diagnosis Models; Condition Code Claims; Automated model retraining; Broader STP90 infrastructure

### Risks

| Risk | Mitigation |
|---|---|
| **Architecture** – Future-state direction may create rework | Prioritise reusable capabilities; ARB approval of interfaces/data contracts |
| **Benefits** – Condition Linking uplift unvalidated; STP forecast ~24% Dec → ~22–23% post-Bingo, risking sustained 25% target. | Validate model uplift; track uplift vs Bingo erosion; identify further levers to reach/sustain 25% |
| **Model / Audit** – Insufficient governance or traceability may compromise assurance | Decision trace, audit evidence and version-controlled thresholds |
| **Delivery** – December window, scope stability and technical debt may impact delivery | Active RAID, scope and deployment governance |

**Note:** Risk in change assessment deemed not required.

### Business Case

**Cost (excl. GST)**

| Category | Amount |
|---|---|
| IT & Change | $178k (GoTech, PMO – PSA, PSI and Contractor) |
| Non-IT internal staff | $98k (Claims, BI, AI ML) |
| External | $45k (Gratex, TMA) |

**Benefit**

| Metric | Base Case | Low Case (50% reduced benefits) |
|---|---|---|
| FY27-29 NPV – 15% disc rate, no TV | $661k | $18k |
| Payback month (undiscounted) | October 2027 | January 2029 |
| Annualised benefit – from 1 Feb 27 | $435k (8 FTE) | $218k (4 FTE) |
