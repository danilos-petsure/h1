# Multi insurer environments — requirements from Earlier Birds

> Working note, 16 Oct 2026. Collects what *Earlier Birds* needs from the multi insurer environments work, so the requirements can be extended and adjusted there. Source: `solutions/earlier birds/Earlier birds - high-level solution v0.2.md` (VH-I-01, COS-I-03, §1.5), `docs/systems/VetHub/VetHub-summary.md`, `docs/systems/COS/COS-summary.md`.

## Why Earlier Birds depends on it

Earlier Birds removes COS polling of VetHub. Today each COS instance (AU, NZ, Vet Partners) polls VetHub for the conversations of its own insurer, so routing is implicit. In the target, VetHub calculates an **insurer routing context** before or during the Eligibility Check and *Conversation Completed* triggers the new start-claim API of the right COS. The routing context is decided by the **insurer environment**.

## Insurer environments seen today

| Environment | COS | Claims API target | UPM / back-end | Notes |
|---|---|---|---|---|
| AU (PetSure) | `api-cos-prod` | UPM+ DAPI AU | UPM+ AU | SYD / MEL variants |
| NZ | `api-cos-prod-nz` | UPM+ DAPI NZ | UPM+ NZ | Separate deployment of the same code |
| Vet Partners (VP) | VP stack (URLs not in repos) | Boomi | Partner system | No DAPI |
| Trupanion (TPN) | — (UPM poller only) | Trupanion instance | TrUPM | Confirm how VPMS claims reach it |
| PetYellow Canada (PY) | `api-cos-prod-py` | — | — | Confirm whether live |

## Requirements to carry over

1. **Routing context definition:** insurer (`InsuranceProviderId`, brand) and insurer environment (COS instance, DAPI or Boomi target, UPM instance, storage container).
2. **Single source of routing rules:** today they live in VetHub settings (`InsurerRouting:*`, `Claims:DefaultInsuranceProviderId(ForNZ)`, `VetPartners:InsuranceProviderId`), CLAPI (`InsuranceProviderId` → client) and Dynamic CLAPI. Decide which one is the master.
3. **Shared vs per-insurer components:** the event platform and the Functions can be shared and route by insurer; COS, DAPI and UPM stay per insurer environment.
4. **Isolation:** events carry the insurer; subscriptions or handlers must not cross insurer boundaries.
5. **Duplicated Service Provider IDs:** the routing context touches provider resolution; align with the Mastering Data initiative.

## Open points

- Which insurer environments are live and in scope for Earlier Birds (TPN, PY)?
- How Vet Partners claims are lodged when COS calls DAPI directly (Boomi has no DAPI).
