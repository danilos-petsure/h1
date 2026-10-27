# Go Tech Platform — PROD deployment per insurer

This folder describes how the Go Tech claims platform is deployed in **production** for each insurer. It is a reader-friendly companion to [`infrastructure-summary-as-is.md`](../infrastructure-summary-as-is.md) (compiled 2026-10-26), which remains the detailed source. The component pictures are the PNG exports in the parent folder, generated from the ArchiMate model `archi/h1.archimate` (view *H1 – PROD deployment by insurer*).

| Document | Covers |
|---|---|
| [Australia](01-australia.md) | PetSure Australia, including Luna. The full stack: VetHub, COS, Claims Automation, CLAPI, DAPI, Dynamic CLAPI, STP / Clawdia, UPM Dynamics API, UPM+ |
| [Trupanion](02-trupanion.md) | Trupanion (TPN). Runs on the Australian COS / CLAPI / Dynamic CLAPI / STP stack, with its own DAPI and UPM+ |
| [New Zealand](03-new-zealand.md) | PetSure New Zealand. Own COS, CLAPI, DAPI and UPM+ (UPM+ hosted in Azure) |
| [Vet Partners](04-vet-partners.md) | Vet Partners (VP). Own COS and CLAPI; claims go to Vet Partners' Salesforce through Boomi |
| [Servers by managed service](servers-by-managed-service.md) | Every PROD server, grouped by the Azure or on-premises service that hosts it |

## Structure of each insurer document

1. **High-level picture** — one diagram that combines all the components used by that insurer and shows how a claim moves between them. The diagram sources (`images/*.mmd`, Mermaid) sit next to the PNGs so they can be edited.
2. **One section per component** — the component picture, a plain-language description, and then a separate *Technical reference* block with servers, artefacts, resource names and URLs for technical readers.
3. **Open points** — gaps and *inferred* items from the source that affect that insurer.

## How to read the component pictures

The component pictures use the same nesting in every case, from the outside in:

| Shape | Meaning | Example |
|---|---|---|
| Outer frame (tab label) | The component for a given insurer | *COS Australia + Trupanion* |
| Green rounded box | The managed service that hosts it | *Azure Virtual Machines*, *App Service (code)* |
| Box with a cube icon | A server, app or instance | `PS-PRD-AZS-P3-1` |
| Cyan box | The application component running there | *COS*, *VetHub* |
| Box with a document icon | The artefact actually deployed (package, binary, database) | *COS.API*, `COS_PROD` |

## Shared and dedicated components at a glance

| Component | Australia (+ Luna) | Trupanion | New Zealand | Vet Partners |
|---|---|---|---|---|
| VetHub | Shared | Shared | Shared | Shared |
| Claims Automation | Shared | Shared | Shared | Shared |
| COS | Own stack | On the Australian stack | Own stack | Own stack |
| CLAPI | Own deployment | On the Australian deployment | Own deployment | Own deployment |
| Dynamic CLAPI | Yes | On the Australian deployment (TPN lodge) | Not used (see open points) | Not used |
| STP / Clawdia | Yes | On the Australian deployment | Not used | Not used |
| DAPI | On-premises R/W + Azure VM RO | Own instance on the AU on-premises server | Azure VM | Not used (Boomi) |
| UPM Dynamics API + UPM+ | On-premises | On-premises | Azure VMs | Not used (Vet Partners Salesforce) |
