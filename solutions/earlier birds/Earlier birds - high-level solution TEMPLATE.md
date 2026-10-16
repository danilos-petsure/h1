# Earlier Birds — High-level solution
TODO-CLAUD: Fill with my data 
| | |
|---|---|
| **Initiative** | STP Up Lifting|
| **Solution** | Earlier Birds |
| **Author** | |
| **Status** | |
| **Version** | |

**Glossary:**
TODO-CLAUD: add here abbreviations as well as CRN Claim Reference Number,STP etc
---

## 1. High-level solution

<!-- Summary -->
TODO-CLAUD: complete
### Problems addressed

| # | Problem | How the solution addresses it | Status |
|---|---|---|---|
| P1 | | | |
TODO-CLAUD: refer to docs/STP90 Architecture Vision.pdf

### 1.1 Systems and components involved

| System | Component(s) | Responsibility in the claim lifecycle | Impact |
|---|---|---|---|
| VPMS / GapOnly SDK | | | |
| VetHub | | | |
| Event platform (Azure Service Bus + Azure Functions) | | | |
| COS | COS, Clapi, Dynamic Clapi, DAPI | | |
| Claim Automation | | | |
| STP – Clawdia | | | |
| ML environment | | | |
| UPM | UPM+, UPM Dynamics API, UPM DB  | | | |

### 1.2 High-level flow — as is

<!-- Flow matrix image: rows = components, columns = time chunks, cells = functions -->

| Component | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|
| VPMS / GapOnly SDK | | | | | | | |
| VetHub | | | |
| Event platform (Azure Service Bus + Azure Functions) | | | | | | | |
| COS | COS, Clapi, Dynamic Clapi, DAPI | | | | | | |
| Claim Automation | | | | | | | |
| STP – Clawdia | | | | | | | |
| ML environment | | | | | | | |
| UPM | UPM+, UPM Dynamics API, UPM DB  | | | | | | | |

TODO-CLAUD: Look at the docs/Medical assessment- as is_v2.0.0.json and fill each cell of the flow with steps on the right component. Use the table 1.1 Systems and components involved to match which system I'm speaking about

---

## 2. Motivation

| Driver | Today | With the solution | Indicative measure |
|---|---|---|---|
| | | | |
TODO-CLAUD: Use docs/90_ STP Architecture Vision — Business Motivation Model.md (adjust also the table based on the structure given by the document)
---

## 3. General architecture patterns

| # | Pattern | Where it is applied | Why | Watch-outs |
|---|---|---|---|---|
| AP-01 | | | | |

TODO-CLAUD: Refer to this document but add a note that this section is a working in progress and it is not reviewed yet

---

## 4. Component architecture changes by system

TODO-CLAUD: Instead of a list of changes by system, refer to docs/earlier-birds.md and docs/STP90 Architecture Vision.pdf for grouping the changes. Change name, description



TODO-CLAUD: based on the list above and docs/earlier-birds.md  for each component add the behaviours to introduce, evolve, and decommission
### 4.1 VPMS / GapOnly SDK

#### Integrations — as is

Keep it empty for the moment

#### Integrations — to be

Keep it empty for the moment
TODO-CLAUD: for each component keep the integrations as is and to be empty. Remove the table 

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| VPMS-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| VPMS-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| VPMS-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| VPMS-?-01 | | | | | | | | | |

### 4.2 VetHub

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| VH-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| VH-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| VH-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| VH-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| VH-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| VH-?-01 | | | | | | | | | |

### 4.3 Event platform (Azure Service Bus + Azure Functions)

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| EVT-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| EVT-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| EVT-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| EVT-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| EVT-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| EVT-?-01 | | | | | | | | | |

### 4.4 COS

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| COS-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| COS-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| COS-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| COS-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| COS-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| COS-?-01 | | | | | | | | | |

### 4.5 Claim Automation

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| CA-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| CA-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| CA-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| CA-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| CA-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| CA-?-01 | | | | | | | | | |

### 4.6 CLAPI

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| CLP-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| CLP-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| CLP-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| CLP-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| CLP-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| CLP-?-01 | | | | | | | | | |

### 4.7 DAPI (CSP.Au.DigitalApi)

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| DAPI-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| DAPI-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| DAPI-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| DAPI-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| DAPI-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| DAPI-?-01 | | | | | | | | | |

### 4.8 Dynamic CLAPI

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| DCL-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| DCL-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| DCL-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| DCL-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| DCL-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| DCL-?-01 | | | | | | | | | |

### 4.9 STP – Clawdia

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| CLW-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| CLW-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| CLW-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| CLW-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| CLW-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| CLW-?-01 | | | | | | | | | |

### 4.10 UPM+

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| UPM-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| UPM-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| UPM-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| UPM-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| UPM-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| UPM-?-01 | | | | | | | | | |

### 4.11 UPM Dynamics API

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| UAPI-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| UAPI-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| UAPI-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| UAPI-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| UAPI-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| UAPI-?-01 | | | | | | | | | |

### 4.12 UPM DB

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| UDB-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| UDB-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| UDB-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| UDB-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| UDB-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| UDB-?-01 | | | | | | | | | |

### 4.13 ML environment

#### Integrations — as is

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| ML-A1 | | | | | |

#### Integrations — to be

```mermaid
flowchart LR
```

| ID | Counterpart | Direction | Interaction | Style | Interface |
|---|---|---|---|---|---|
| ML-B1 | | | | | |

#### Behaviours

##### To introduce

| ID | Behaviour | Description |
|---|---|---|
| ML-I-01 | | |

##### To evolve

| ID | Behaviour | Description |
|---|---|---|
| ML-E-01 | | |

##### To decommission

| ID | Behaviour | Description |
|---|---|---|
| ML-D-01 | | |

#### Impact analysis

| ID | Interface | Data | Perf | Security | Resilience | Observability | Infra | Dependents | Description |
|---|---|---|---|---|---|---|---|---|---|
| ML-?-01 | | | | | | | | | |

---

## 5. Components with no change

| Component | Why there is no change | Watch item |
|---|---|---|
| | | |

---

## 6. Open questions and next steps

| # | Open question | Affects |
|---|---|---|
| OQ-01 | | |

**Next steps**

1. 
