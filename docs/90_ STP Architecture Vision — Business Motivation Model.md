# 90% STP Architecture Vision — Business Motivation Model

**90% STP Architecture Vision** — Business Motivation Model for Claims-as-a-Service. Generated 3 August 2026 from the Architecture Repository. Status: DRAFT FOR REVIEW

## 1. Purpose and scope

This page records the Business Motivation Model (BMM) for the Claims-as-a-Service programme, known as the 90% STP initiative. It sets out why the transformation is being undertaken, what it is intended to achieve, and how it will be delivered.

The model follows the Object Management Group Business Motivation Model and is organised into four parts. **Drivers** are the influencers and assessments that motivate change. **Ends** describe the state we intend to reach, expressed as a vision, goals and measurable objectives. **Means** describe how we will get there, expressed as a mission, strategies and tactics. **Directives** govern the courses of action, and comprise architecture principles and policies.

Every element carries a stable reference identifier so that it can be cited in design documents, architecture decision records and delivery artefacts. Where a target value is not yet agreed it is shown in square brackets.

## 2. Drivers

Drivers are the internal and external influences that motivate the transformation. They are grouped into six categories and are traceable to the goals and strategies they motivate.

### 2.1 Customer & Market

| Ref | Driver |
| --- | --- |
| **D1** | **Point-of-care claim expectation**Australians are used to Medicare, HICAPS and other modern digital experiences. |
| **D2** | **Customer feedback**Market expectations of the claims experience; desire to reduce out-of-pocket expense. |
| **D3** | **Customer clarity**Customers want to know what is happening and when. Delays in correspondence (Gap Only already notifies at authorisation). |
| **D4** | **Protecting market share**Frictionless experiences minimise customer churn. |

### 2.2 Network & Providers

| Ref | Driver |
| --- | --- |
| **D5** | **Clinic coverage reach**Broad reach so customers can choose their local, preferred with or without VPMS providers. |
| **D6** | **Vet provider satisfaction**Providers want to minimise administrative burden to focus on care. |

### 2.3 Brand & Values

| Ref | Driver |
| --- | --- |
| **D7** | **PetSure values**Desire to do the right thing by pets and their parents. |

### 2.4 Financial

| Ref | Driver |
| --- | --- |
| **D8** | **Insurance affordability**Cost is a major influence on acquisition and retention. |
| **D9** | **Revenue diversification**Open a new line by selling claims services to other insurers. |

### 2.5 Technology & Risk

| Ref | Driver |
| --- | --- |
| **D10** | **Growing claims processing without UPM**Reliance on Gratex/UPM and heavily customised legacy code. |
| **D11** | **Technical debt and key-person risk**Poor documentation and reliance on a few staff. |
| **D12** | **Scalability demand**Must sustain 2.5M+ claims per annum. |
| **D13** | **Security and data-integrity exposure**Heightened by a multi administrator model. |
| **D14** | **Data inconsistency across systems**We have multiple sources of truth for Service Providers. E.g. clinic-ID drift. |

### 2.6 Operational

| Ref | Driver |
| --- | --- |
| **D16** | **Automation imperative**Reach \~90% STP, human by exception, cut manual effort. |
| **D17** | **Resource constraints**Small team forcing hard prioritisation. |
| **D18** | **Standardise and retire**Move to Tyro Health, retire direct VPMS and eClaims. |

## 3. Ends

The Ends describe what the organisation intends to have in place once the transformation is complete. The vision is the overall aspiration; goals amplify it; objectives quantify the goals.

### 3.1 Vision

> **A headless, AI-first claims platform that automates the customer journey across multiple insurers, with humans in the loop.**

### 3.2 Goals and objectives

#### 3.2.1 G1 — Prioritise Gap Only Claims

A fully automated, end-to-end Gap Only network through which all claims flow - building a competitive moat.

| Ref | Objective |
| --- | --- |
| **O2.1** | **Maximise claims via Gap Only**100% of claims submitted via Gap Only Direct. We will allow customer choice and meet our obligations for alternative channels. |
| **O2.2** | **Minimal non-Tyro claims**Minimal claims via non-Tyro VPMS/eClaims (legacy fully retired). |
| **O2.3** | **Common platform for all insurers**Gap Only Tech serves \>=3 insurers. |

#### 3.2.2 G2 — Industry leading customer claiming experience

The industry's fastest, best claiming experience (target \<30s) that drives demand for Gap Only-enabled products.

| Ref | Objective |
| --- | --- |
| **O3.1** | **Gap Only STP real-time claiming**\>90% straight through process with a claim cycle time \<= 30 seconds. |
| **O3.2a** | **Non-Gap Only claims outside of automation**Claims outside of STP may require human intervention. I.e. claims over thresholds or other control/rule. |
| **O3.2b** | **Customer notification on benefit request**100% of claims receive real-time communications (outside email/letter). Provide notice that a customer policy has been used to reduce fraud. |

#### 3.2.3 G3 — Reduce admin cost per claim to $xx

A sustainably low administrative cost per claim (target $xx) that supports a more affordable future for pet healthcare.

| Ref | Objective |
| --- | --- |
| **O4.1** | **Reduce cost per claim**Cost per claim \<= $\[xx\]. |
| **O4.2** | **Auto-assessment based on condition coding**\>=\[X\]% of claims auto-assessed via condition-coded claiming. |
| **O4.3** | **Humans handle exceptions only (\<10%)**Reduce human cost per claim by \>=\[X\]% vs baseline. |
| **O4.4** | **Reduce telephone queries per 1,000 claims**\>=\[X\]% of telephone queries per 1,000 claims. |

#### 3.2.4 G4 — Grow market awareness of Gap Only

Strong national awareness of Gap Only across partners, media and in-clinic channels.

| Ref | Objective |
| --- | --- |
| **O5.1** | **O5.1**Customer NPS \>= \[X\]. |
| **O5.2** | **O5.2**Vet/clinic NPS \>= \[X\]. |
| **O5.3** | **O5.3**Build a competitive moat. |

#### 3.2.5 G5 — Sell Claims services to other general insurers

Maximise the value of our claims capability as an asset by offering tailored claims services to other general insurers and partners.

| Ref | Objective |
| --- | --- |
| **O1.1** | **Current claim process without UPM**COS processes claims with zero dependency on the UPM/policy object (measure: 0 UPM calls in the claims path). |
| **O1.2** | **At least one new insurer on Gap Only**Clawdia assesses claims live for \>=\[N\] external insurers. |
| **O1.3** | **Support Trademark 2030 volumes**Platform resiliently sustains 2.5M claims/annum at \>=\[99.9\]% availability. |

## 4. Means

The Means describe how the Ends will be achieved. The mission makes the vision operative; strategies channel effort toward the goals; tactics implement the strategies.

### 4.1 Mission

> **Deliver the best pet insurance claims experience through fast, intelligent, and efficient customer journeys.**

### 4.2 Strategies and tactics

#### 4.2.1 S1 — Decouple from insurer (any platform)

Run the claims capability independently of UPM, so it serves our multiple UPM instances and administrators who don't have UPM. Serves G5, G1.

| Ref | Tactic |
| --- | --- |
| **T1.1** | **COS and Clawdia run without UPM**Build the claims orchestration system to function with no UPM or policy-object dependency. |
| **T1.2** | **Unique GO Service Provider IDs**Reconcile Clinic-ID anti-corruption identifiers across UPM and external systems through a mapping/anti-corruption layer. |
| **T1.3** | **Lifecycle-stage lodgement**Add a UPM API that lodges claims at the correct assessment stage (write after medical assessment). |
| **T1.4** | **Platform-agnostic APIs**Design all new APIs to be platform and insurer-agnostic. |
| **T1.5** | **Global Administrators model**Define “Global Administrators” to represent non-PetSure policies (Vet Partners, Budget Direct, PetSafetyNet). |
| **T1.6** | **VetHub policy validation**Validate policies via VetHub rather than the UPM policy object. |

#### 4.2.2 S2 — Invest in component-based software

Compose the platform from components, so we can flex to the differing agreements we hold with insurers and administrators. E.g. VetHub, COS and Clawdia. Serves G5, G3.

| Ref | Tactic |
| --- | --- |
| **T2.1** | **Clearly define our component boundaries**Coordinate with Gratex on API and component boundaries. |
| **T2.2** | **Domain-driven components**Break business logic into components with clear API contracts. |
| **T2.3** | **Own our core components and IP**Retain ownership of the back end, condition-taxonomy code and exchange APIs in a component we fully control and can evolve; partners may own channel/presentation layers. |

#### 4.2.3 S3 — Engineer for resiliency and scale

Engineer our material claims processes for resilience and 2030-scale volumes, protecting them under load and failure. Serves G5, G2.

| Ref | Tactic |
| --- | --- |
| **T3.1** | **Map out current Gap Only ecosystem**Map current application + infrastructure layers. |
| **T3.2** | **Identify bottlenecks to 2.5M+ claims**Capacity and failover design for 2.5M+ claims/annum. |
| **T3.3** | **Testing that achieves resiliency**Invest in automated end-to-end testing. |
| **T3.4** | **Real-time view of Service Level Objects**Gap to fill: availability Service Level Objects SLO and DR/runbook ownership. |
| **T3.5** | **Design for automation, escalate to humans**Risk based escalation of claims to humans. |
| **T3.6** | **Always-on availability**Blue-green / zero-downtime deployment, with a per-layer definition of 'down' so availability is measurable per component. |
| **T3.7** | **Build to PetSure SDLC and IS Policies**Security review of the componentised architecture and external APIs. |
| **T3.8** | **Use logical segregation of administrators**Tenant data segregation and access controls for the multi-insurer model. |

#### 4.2.4 S5 — Gap Only Direct Focus (GapOnly Vet Portal)

Consolidate reach on Gap Only Direct via the GapOnly Vet Portal (already in market) to cover every clinic across Australia and New Zealand; allow multi-insured pets. The work is the guided condition-code experience within the portal. Serves G1.

| Ref | Tactic |
| --- | --- |
| **T5.1** | **Tyro will campaign and integrate all clinics**Roll out Tyro coverage across all addressable clinics. |
| **T5.2** | **Claims submitter to specify condition**Introduce user driven condition-code claiming from PetSure taxonomy. |
| **T5.3** | **Prioritise Gap Only channels**Minimise non Gap Only channels such as eClaims. Note: do allow these for customer choice and regulatory requirements. |

#### 4.2.5 S6 — Automate lifecycle with data + AI & ML

Use data, AI and ML to bring structure to unstructured sources and automate the claims lifecycle - enrichment, diagnosis and assessment. Serves G2, G3.

| Ref | Tactic |
| --- | --- |
| **T6.1** | **Use Condition Coded Claims**Gap Only users will be asked to provide the related condition via PetSure taxonomy on benefit request submission for the Gap Only Vet Portal. |
| **T6.2** | **Insured asset database \[TBC\]**An insurer-agnostic record of the insured asset - conditions, presenting signs and how they link. PEC determination is a separate insurer overlay held elsewhere. Framed as asset insurance, deliberately avoiding the claims-metaphor trap that ended Pet Health Record. Necessity depends on the STP path (required if solved via ML). |
| **T6.3** | **Invest in Clawdia's STP rate**Continue to uplift Clawdia's straight-through-processing rate through more data, better models and more rules. |
| **T6.4** | **Claims without clinical notes**We settle on provider-supplied condition coding rather than waiting on clinical notes, because speed at the point of care is worth more than pre-settlement certainty. Assurance comes from risk-based post-settlement verification, not from inspecting every claim. |
| **T6.5** | **CLAWdia independent of policy record**Extend Clawdia to support external administrators (links to S1/G1). |
| **T6.6** | **Parallel AI verification**Validate, alongside assessment, (a) whether the vet-entered diagnosis is plausible and (b) whether invoice items are likely fraudulent. |
| **T6.7** | **Deterministic eligibility gate**Claims pass deterministic eligibility rules before entering automated enrichment, diagnosis and assessment. |

#### 4.2.6 S7 — Own the digital vet/customer experience

Deliver best-in-class digital service so we become the chain vets want to work with (driving demand). Serves G2, G4.

| Ref | Tactic |
| --- | --- |
| **T7.1** | **Guided vet experience**Guided Vet Experience in the Gap Only Vet Portal to reach non-VPMS integrated clinics. |
| **T7.2** | **Mobile app**Mobile app for claiming and self-service. |
| **T7.3** | **Digital pass**Digital pass on iOS and Android. |
| **T7.4** | **Real-time claim notifications**Real-time claim notifications. |
| **T7.5** | **AI-chat**AI-chat to explore value. |
| **T7.6** | **Proprietary condition taxonomy as moat**Treat the PetSure condition taxonomy as the core defensible asset underpinning automated claiming. |
| **T7.7** | **Reserved fast-path advantage**Retain the sub-30s condition-coded experience for PetSure products as a market differentiator. |
| **T7.8** | **Widest clinic coverage**Pursue the broadest addressable clinic network so the GapOnly network effect compounds. |
| **T7.9** | **Real-time status transparency**Real-time claim notifications and status visibility for customers and clinics. |

## 5. Architecture principles

Architecture principles are enduring beliefs that guide design and delivery decisions. They are directional rather than measurable.

| Ref | Statement |
| --- | --- |
| **AP1** | **Simplicity first**Removing a step is better than optimising. It should ensure that we create a simple architecture. |
| **AP2** | **Pragmatism over perfection**Favour small, reversible changes over big-bang re-architecture, and build for known need rather than speculation (YAGNI). |
| **AP3** | **Design for failure and resilience**Assume components will fail; design material claims processes to isolate faults, degrade gracefully and recover - protected from the point of entry. |
| **AP4** | **Automate first, human by exception**Automation owns the claims lifecycle and is trusted by default; humans hold decision rights at defined control points and verify via risk-based controls. |
| **AP5** | **Clear coupling**Define explicit, deliberate couplings between components (not aspirational loose coupling); clear coupling documents our dependencies and drives our availability and failure models. |
| **AP6** | **Secure by design**Security is designed in at two layers - secure interactions between components, and secure software build practices across the SDLC - not bolted on. |
| **AP8** | **Make it understandable**Capture and communicate the architecture so diverse audiences can understand it - current, transitional and target states - not just document it. |
| **AP9** | **Automation is engineered**Engineer automation into the SDLC (shift-left, embrace AI); quality is the outcome, automation is the means. |
| **AP10** | **Human accountability for AI decisions**AI assists and automates, but a human remains accountable for the outcome. AI must not autonomously decline a claim; accountability is not delegable to a model. |

## 6. Policies

Policies are enforceable rules that govern the courses of action. Compliance with each policy is testable.

| Ref | Statement |
| --- | --- |
| **PO1** | **Condition-coded claims from PetSure taxonomy**All claims are coded against the PetSure condition taxonomy as the basis for adjudication and auto-assessment. Tightly coupled to PO1.1 (IP protection). |
| **PO1.1** | **Gap Only IP Protection**The PetSure condition taxonomy and codes are proprietary and must stay within a carefully-defined platform boundary - not exposed in partner surfaces (e.g. the Tyro help portal). Tightly coupled to PO1. |
| **PO2** | **Adjudicate independent of policy ownership**Assess and process a claim regardless of who owns or administers the policy - leverage UPM's claims-lifecycle logic rather than rebuilding it outside UPM, storing the minimum policy data needed for benefit calculation (a 'dummy policy') or using a dedicated UPM instance. |
| **PO4** | **Master for shared Vet IDs**Shared cross-system identifiers (e.g. clinic/vet IDs) must have a single system of record and be reconciled through a mapping/anti-corruption layer - no manual sync in production. |
| **PO5** | **Right-sized testing**Test the right things to infer coverage (stub/harness within the clear-coupled architecture) to enable fast, safe releases - not exhaustive end-to-end automation. |
| **PO6** | **Protect published SLOs**No change may ship if it is projected to regress the availability, cycle-time or status-notification SLOs. |
| **PO7** | **Reserve the fast path for PetSure**Condition-coded / sub-30-second claiming is reserved for PetSure. External insurers are served on a slower tier (e.g. 10-minute SLA). A deliberate moat control; pairs with PO1.1. |
| **PO8** | **Tyro / PetSure ownership boundary \[provisional\]**VPMSs own source data. PetSure owns claim data, back-end code, the condition taxonomy and the exchange APIs. Tyro owns the vet-channel platform/interface IP (specs returned on exit) plus business-verification/KYC and payment metadata. To be verified against the Tyro agreement. |
| **PO9** | **Concentrate investment on GapOnly Direct**Investment is directed almost exclusively to GapOnly Direct; other channels are contained, not enhanced. |
