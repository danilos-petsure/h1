# ABC-02 — Service Provider Master Data

| | |
|---|---|
| **Tier** | 1 · Quick wins |
| **Solution** | **Candidate** — no solution yet; [Early Starter](../solutions/early-starter.md) touches it through the routing context |
| **Problems solved (part)** | [LP-6 Service Provider Master Data](../cash-high-level-solution.md#22-problems-to-solve-and-associated-drivers) |
| **Depends on** | [ABC-06](abc-06-remove-clapi-dapi-dependencies.md) (started — routing context) |
| **Status** | Draft — the picture is not yet clear enough |
| **Back to** | [AI CAsH high-level solution](../cash-high-level-solution.md) |

## Change

Give service provider (vet clinic) data one system of record, and map every system-specific identifier to it, so routing and claims always refer to the right clinic and no manual synchronisation is needed.

## Problem it solves

Service provider data is duplicated in several systems and is sometimes inconsistent, for example the UPM service provider id.

- **Effect today:** vet clinic information is inconsistent; **Trupanion claims refer to the wrong vet clinic and can't be processed automatically**.
- Divergent vet ids across UPM instances are kept aligned by a manual dual-insert function.
- DAPI validates the provider against `DS_ServiceProviders_All`; COS SubmitClaims sets `PayToServiceProvider`.
- The gap-only route back to COS goes through Dynamic CLAPI, where the inconsistency is also visible (Earlier Birds OQ-08).
- The H1 roadmap names *Global eligibility, provider configuration & MDM* as a GapOnly platform component.

## Component changes

| ID | Component | Type | Change |
|---|---|---|---|
| ABC-02.1 | Service provider master **[location TBC — VetHub / GapOnly MDM / new service]** | Add | System of record with a Go Tech service provider id and a mapping to each system's id (UPM AU, UPM Trupanion, UPM NZ, VetHub, COS, CATCH) |
| ABC-02.2 | VetHub | Evolve | Routing context uses the mapped service provider id |
| ABC-02.3 | COS | Evolve | Uses the mapped id when lodging (`PayToServiceProvider`) |
| ABC-02.4 | Dynamic CLAPI | Evolve | Gap-only route to COS uses the mapped id |
| ABC-02.5 | UPM+ (AU, Trupanion) | Evolve | Provider ids synchronised from the master (anti-corruption layer) |
| ABC-02.6 | Manual dual-insert function | Decommission | No longer needed once ABC-02.5 is live |

## Dependencies

- [ABC-06](abc-06-remove-clapi-dapi-dependencies.md) — **started already**: the routing context is the single place where routing is decided and where the mapping applies.

## Acceptance criteria

- **AC-1** Each service provider has one Go Tech identifier; every system-specific id is mapped to it.
- **AC-2** Trupanion claims reference the correct clinic and are not blocked from automation by provider data.
- **AC-3** No manual dual insert is needed when a provider is created or changed.

## Open questions

- Where exactly do the ids diverge, and which system creates them?
- Who owns the master: VetHub (GapOnly MDM) or a separate service? Which solution should own this ABC?
