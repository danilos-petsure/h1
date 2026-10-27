# Go Tech Platform — PROD servers by managed service

> **Scope:** PROD, all insurers (Australia incl. Luna, Trupanion, New Zealand, Vet Partners).
> **Source:** the picture is the ArchiMate view *H1 – PROD servers by managed service* in `archi/h1.archimate`; the descriptions come from [`infrastructure-summary-as-is.md`](../infrastructure-summary-as-is.md) (2026-10-26). Items marked *inferred* are not confirmed by any source.

## Contents

1. [The picture](#1-the-picture)
2. [Azure](#2-azure)
   - [API Management](#21-api-management)
   - [App Service](#22-app-service)
   - [Azure Virtual Machines](#23-azure-virtual-machines)
   - [Logic Apps Standard](#24-logic-apps-standard)
   - [Azure Functions](#25-azure-functions)
   - [Azure Machine Learning (managed endpoints)](#26-azure-machine-learning-managed-endpoints)
   - [Azure SQL Database](#27-azure-sql-database)
3. [On-premises](#3-on-premises)
   - [On-premises data centre (Equinix + AirTrunk)](#31-on-premises-data-centre-equinix--airtrunk)
   - [On-premises SQL Server](#32-on-premises-sql-server)
4. [Summary by managed service](#4-summary-by-managed-service)
5. [Open points](#5-open-points)

---

## 1. The picture

![PROD servers by managed service](../servers%20by%20managed%20service.jpg)

The per-insurer documents look at the platform one insurer at a time, so a shared server such as `PS-PRD-AZS-P3-1` appears several times. This view turns that around: **every PROD server appears once**, inside the managed service that hosts it, together with every application component and artefact deployed on it. It answers questions such as "what runs on this server?" and "how much of the platform still depends on virtual machines?".

The picture has two top-level areas. **Azure** holds seven managed services, from fully managed platform services (App Service, Functions, Logic Apps, Azure ML, Azure SQL) to plain virtual machines. **On-premises** holds the two Equinix / AirTrunk data-centre services that host UPM+ for Australia and Trupanion, the Australian and Trupanion DAPI, and their SQL Server databases. The nesting inside each service is the same as in the component pictures: server or instance → application component → deployed artefact (see [How to read the component pictures](README.md#how-to-read-the-component-pictures)).

The view was generated from the model relationships by the script `archi-scripts/dev/2026-10-26-create-h1-servers-by-service-view.ajs`, so it stays consistent with the per-insurer views.

---

## 2. Azure

All Azure resources are in the tenant `petsureau.onmicrosoft.com`, in the **Australia East** (Sydney) region. They are spread over two estates: the older **legacy estate** (subscription `60181c42-…`, VNet `Pacnet`, AD domain `petprod.internal`), where most Go Tech virtual machines and the shared Azure SQL server live, and the **Azure Landing Zone**, a hub-and-spoke network built with Terraform, where VetHub's App Services, STP / Clawdia and the New Zealand UPM+ and DAPI servers live. The landing-zone hub provides the Azure Firewall, the ExpressRoute link to the AirTrunk data centre and the DNS Private Resolver.

### 2.1 API Management

Azure API Management is used for a single purpose: it is the facade in front of VetHub for Tyro's Gap-Only integration, and it validates Entra ID tokens before passing calls to the VetHub API. It runs on the Basic tier in the legacy estate and is reached through Cloudflare.

**Servers and deployed artefacts**

| Instance | Insurer | Component | Artefact |
|---|---|---|---|
| `ps-prod-apim-vethub` | All (shared) | VetHub | apim-vethub-api — API definition with policies |

Resource group `ps-prod-rg-vethub`; Basic_1; App Insights `ps-prod-insights-vethubapim`; Log Analytics `ps-prod-log-analytics-vethubapim`.

### 2.2 App Service

Azure App Service hosts the newer, cloud-native parts of the platform. VetHub's four front-end apps moved here from IIS virtual machines in release 2026_R4 (September 2026); they run on one Windows P1v3 plan, zone-redundant and with a staging slot, in the VetHub spoke of the landing zone. The STP / Clawdia spoke has two more apps: Dynamic CLAPI, the bridge between Azure and UPM+, and the UPM ReadOnly DataService, which reads the on-premises UPM+ read replica for Clawdia.

**Servers and deployed artefacts**

| App | Insurer | Component | Artefact |
|---|---|---|---|
| `ps-syd-prd-claw-dynamicclapi-app` | Australia, Trupanion | Dynamic Clapi | Dynamic Clapi — compiled application package |
| `ps-syd-prd-claw-readonlydataservice-app` | Australia (STP) | STP - Clawdia | DataService.UPM — compiled application package |
| `ps-syd-prd-vethub-vhapi-app` | All (shared) | VetHub | VetHub — compiled application package |
| `ps-syd-prd-vethub-vhportalapi-app` | All (shared) | VetHub | Vet.Portal.API — compiled application package |
| `ps-syd-prd-vethub-vhregapi-app` | All (shared) | VetHub | VetHub.Reg.API — compiled application package |
| `ps-syd-prd-vethub-vhui-app` | All (shared) | VetHub | VetHub.UI — source package |

VetHub apps: plan `ps-syd-prd-vethub-asp`, RG `ps-syd-prd-vethubapi-rg`, VNet `ps-syd-prd-vethubapi-vnet`. CLAW apps: RG `ps-syd-prd-claw-rg`, VNet `ps-syd-prd-claw-vnet`. Both in subscription `sub-prd-vethub-ps`.

### 2.3 Azure Virtual Machines

Virtual machines are still the largest hosting service for the platform. They fall into three groups.

The **Go Tech web and service VMs** in the legacy estate run COS and CLAPI for each insurer. Australia has two IIS web servers and one Windows-service server; New Zealand and Vet Partners have one of each. The Australian servers also run the VetHub Windows services and MessageFormat.API, plus the shared Go Tech helper APIs. They are deployed by GitHub Actions through a self-hosted runner and monitored by PRTG. All of them are in Sydney with cold backup only, which is a known single-region risk; the agreed long-term plan is to move them to App Service on .NET 10.

The **DAPI VMs** run the read-only Australian DAPI (legacy estate) and the New Zealand DAPI (New Zealand digital subscription of the landing zone).

The **UPM+ NZ VMs** run Business Central and its SQL Server database as infrastructure-as-a-service in the New Zealand core subscription of the landing zone, behind an Azure Load Balancer. In the picture the SQL Server Always On listener for New Zealand appears in this service, because its SQL servers are Azure VMs.

**Servers and deployed artefacts — Go Tech web servers (IIS)**

| Server | Insurer | Component | Artefacts |
|---|---|---|---|
| `PS-PRD-AZS-P3-1` (10.6.0.35) | Australia, Trupanion, Luna; VetHub shared | Claims API (CLAPI); COS; VetHub | CLAPI — IIS deployment; COS.API; MessageFormat.API — IIS deployment |
| `PS-PRD-AZS-P3-2` (10.6.0.39) | Australia, Trupanion, Luna; VetHub shared | Claims API (CLAPI); COS; VetHub | CLAPI — IIS deployment; COS.API; MessageFormat.API — IIS deployment |
| `NZ-PRD-AZ-P3WEB` | New Zealand | Claims API (CLAPI); COS | CLAPI — IIS deployment; COS.API |
| `PS-PRD-AZ-P3WEB` (10.3.0.151) | Vet Partners (*inferred*) | Claims API (CLAPI); COS | CLAPI — IIS deployment; COS.API |

**Servers and deployed artefacts — Go Tech service servers (Windows services)**

| Server | Insurer | Component | Artefacts |
|---|---|---|---|
| `PS-PRD-AZS-P3-3` (10.6.0.40) | Australia, Trupanion, Luna; VetHub shared | COS; VetHub (*inferred*) | COS.Service, COS.VetHub.Services, COS.Poll.Services, COS.AddAttachments.Saga, COS.AddAttachments.Service.ConvertPDF / Consolidate / Submit; VetHub.Service, VetHub.Service.ProcessConversations, VetHub.Service.StatusUpdate, VetHub.Alert.StuckClaims |
| `NZ-PRD-AZ-P3APP` | New Zealand | COS | COS.Service, COS.VetHub.Services, COS.Poll.Services, COS.AddAttachments.Saga, COS.AddAttachments.Service.ConvertPDF / Consolidate / Submit |
| `PS-PRD-AZ-P3APP` | Vet Partners (*inferred*) | COS | COS.Service, COS.VetHub.Services, COS.Poll.Services, COS.AddAttachments.Saga, COS.AddAttachments.Service.ConvertPDF / Consolidate / Submit |

**Servers and deployed artefacts — DAPI**

| Server | Insurer | Component | Artefact |
|---|---|---|---|
| `PS-PRD-AZS-CSP1` (10.3.0.92) | Australia (read-only) | CSP.Au.DigitalApi (DAPI) | CSP.Au.DigitalApi (DAPI) — IIS deployment |
| `NZ-PRD-INT-API1` (10.55.8.68, Standard_D4as_v4) | New Zealand | CSP.Au.DigitalApi (DAPI) | NZ Digital API — IIS deployment |

**Servers and deployed artefacts — UPM+ New Zealand**

| Server | Insurer | Component | Artefact |
|---|---|---|---|
| `nz-prd-bcs-app3` (Standard D4as v4) | New Zealand | UPM+; UPM Dynamics API | UPM+ NZ — Business Central application; UPM NZ — BC API service instance (*name TBC*) |
| `nz-prd-bcs-app4` (Standard D4as v4) | New Zealand | UPM+; UPM Dynamics API | UPM+ NZ — Business Central application; UPM NZ — BC API service instance (*name TBC*) |
| SQL Server Always On `NZ-PRD-BCS-LS01` | New Zealand | UPM Db | `PETSURE_PRD_UPM_NZ` |

NZ SQL VMs `nz-prd-bcs-db01/02` (Standard E4bds v5), cluster `NZ-BCS-PRDDNZ`; load balancer `NZUPMPRD` (10.54.0.6); subscription `sub-prd-core-nz`, RG `nz-syd-prd-bcs-rg`.

### 2.4 Logic Apps Standard

Logic Apps Standard runs the two workflow-based automation engines of the platform. The shared Claims Automation (Sophia Jr) master flow is triggered by COS through Event Grid for all insurers. The STP / Clawdia workflows — four entry flows, a master flow and sub-flows — run the Australian straight-through-processing process and are triggered through the CLAW Event Grid topic.

**Instances and deployed artefacts**

| Instance | Insurer | Component | Artefact |
|---|---|---|---|
| Claims Automation Logic App (*name TBC*) | All (shared) | Claim Automation | Claim Automation — compiled application package |
| `ps-syd-prd-claw-stp-lapp` | Australia, Trupanion, Luna | STP - Clawdia | STP - Clawdia — compiled application package |

CLAW plan `ps-syd-prd-claw-stp-la-asp`; Office 365 managed connector `office365-1` for alerts.

### 2.5 Azure Functions

Azure Functions hosts the three .NET 8 (isolated) function apps that do the detailed work for STP / Clawdia: intake and the ML model call, business rules and audit, and preparation of the submission back to the insurer. They are only used for Australia, Trupanion and Luna claims.

**Instances and deployed artefacts**

| Function app | Insurer | Component | Artefact |
|---|---|---|---|
| `ps-syd-prd-claw-dbcommand-func-app` | Australia (STP) | STP - Clawdia | STP DBCommand Function App — compiled application package |
| `ps-syd-prd-claw-dbquery-func-app` | Australia (STP) | STP - Clawdia | STP DBQuery Function App — compiled application package |
| `ps-syd-prd-claw-keyvault-func-app` | Australia (STP) | STP - Clawdia | STP KeyVault Function App — compiled application package |

Custom domains: `ps-syd-prod-dbcommand-func-app.petsure.com.au`, `ps-syd-prod-dbquery-func-app.petsure.com.au`, `ps-syd-prod-keyvault-func-app.petsure.com.au`.

### 2.6 Azure Machine Learning (managed endpoints)

Azure Machine Learning hosts the ClawGP (Clawdia GP) model as a managed online endpoint. The STP / Clawdia functions call it to enrich claims with a predicted diagnosis. It is the only Azure ML endpoint in scope.

**Instances and deployed artefacts**

| Endpoint | Insurer | Component | Artefact |
|---|---|---|---|
| `ps-prd-claimsauto-gp` | Australia (STP) | ML Environment | ML Environment — ML model artefact |

Workspace `ps-prd-ml-ws-claimsauto`, RG `ps-prod-ml-claimsauto`; subscription not confirmed.

### 2.7 Azure SQL Database

All the Azure-hosted databases of the platform sit on one Azure SQL logical server, `petsure-production`, in the legacy estate: the shared VetHub and Claims Automation databases and one COS database per insurer stack. Trupanion and Luna share the Australian `COS_PROD`. `VetHub_PROD` is in a failover group with the secondary server `p3-ro-db` and is synchronised to the data warehouse.

**Server and databases**

| Server | Database | Insurer | Used by |
|---|---|---|---|
| `petsure-production` | `VetHub_PROD` | All (shared) | VetHub APIs and services |
| | `COS_PROD` | Australia, Trupanion, Luna | COS AUS, CATCH AUS |
| | `COS_PROD_NZ` (*name inferred*) | New Zealand | COS NZ, CATCH NZ |
| | `COS_PROD_VP` | Vet Partners | COS VP |
| | `PSPRODClaimsAutoDB` | All (shared) | Claims Automation and STP / Clawdia |

---

## 3. On-premises

The on-premises estate is split across two data centres, **Equinix** and **AirTrunk**. Azure reaches it through the landing-zone hub: Azure Firewall → ExpressRoute circuit `ps-syd-prd-hub-erc-at` → AirTrunk, with `internal.petsure.com.au` names resolved by the DNS Private Resolver. Because these systems are not in Azure, Azure callers cannot use managed identities to reach them and use basic authentication instead.

### 3.1 On-premises data centre (Equinix + AirTrunk)

This service hosts the Business Central application servers of UPM+ for **Australia** (six servers) and **Trupanion** (two servers), and the DAPI server shared by both. On the Australian UPM+, four servers (`APP1`, `APP2`, `APP5`, `APP6`) run both the Business Central application and the **UPM Dynamics API** service instance, while `APP3` and `APP4` are job servers that run only the application. This confirms that the UPM Dynamics API is not a separate system but a service instance of UPM+ on the same servers. The DAPI server `PS-BCS-PRD-API1` runs the Australian read/write DAPI and the Trupanion DAPI side by side, each with its own document share.

**Servers and deployed artefacts — UPM+ Australia**

| Server | Site | Components | Artefacts |
|---|---|---|---|
| `PS-PRD-BCS-APP1` | Equinix | UPM+; UPM Dynamics API | UPM+ AU — Business Central application; `PETSURE_UPM_API_BASIC` — BC API service instance |
| `PS-PRD-BCS-APP2` | AirTrunk | UPM+; UPM Dynamics API | UPM+ AU — Business Central application; `PETSURE_UPM_API_BASIC` — BC API service instance |
| `PS-PRD-BCS-APP3` (job server) | Equinix | UPM+ | UPM+ AU — Business Central application |
| `PS-PRD-BCS-APP4` (job server) | AirTrunk | UPM+ | UPM+ AU — Business Central application |
| `PS-PRD-BCS-APP5` | Equinix | UPM+; UPM Dynamics API | UPM+ AU — Business Central application; `PETSURE_UPM_API_BASIC` — BC API service instance |
| `PS-PRD-BCS-APP6` | AirTrunk | UPM+; UPM Dynamics API | UPM+ AU — Business Central application; `PETSURE_UPM_API_BASIC` — BC API service instance |

UPM Dynamics API AU endpoints: `upmprod.internal.petsure.com.au:9248/PETSURE_UPM_API_BASIC` (lodge), `upmprod-capi.internal.petsure.com.au:9248` (write / inspect / finish / return).

**Servers and deployed artefacts — UPM+ Trupanion**

| Server | Components | Artefacts |
|---|---|---|
| `TP-PRD-BCS-APP1` | UPM+; UPM Dynamics API | UPM+ Trupanion — Business Central application; `TRUPANION_PROD_API_BASIC` — BC API service instance |
| `TP-PRD-BCS-APP2` | UPM+; UPM Dynamics API | UPM+ Trupanion — Business Central application; `TRUPANION_PROD_API_BASIC` — BC API service instance |

UPM Dynamics API TPN endpoint: `tpupm.internal.petsure.com.au:9148/TRUPANION_PROD_API_BASIC`.

**Servers and deployed artefacts — DAPI**

| Server | Insurer | Component | Artefacts |
|---|---|---|---|
| `PS-BCS-PRD-API1` (172.16.25.50) | Australia (R/W), Trupanion | CSP.Au.DigitalApi (DAPI) | CSP.Au.DigitalApi (DAPI) — IIS deployment; CSP.Au.Trupanion.DigitalApi — IIS deployment; `auapidocuments` — Windows file share; `PRD_TP_UPMClaimDoc` — Windows file share |

DAPI AU R/W endpoint: `api.petsure.com.au`; Trupanion back-end used by CLAPI: `tp-api.petsure.com.au`.

### 3.2 On-premises SQL Server

The UPM+ databases for Australia and Trupanion run on SQL Server Always On availability groups on-premises. The Australian group has its primary in Equinix (`PS-PRD-BCS-DB01`) and its secondary in AirTrunk (`PS-PRD-BCS-DB02`); its read-only replica is used by the read-only DAPI and the Clawdia ReadOnly DataService, and there is also a data warehouse. The read/write DAPI works directly against the primary database.

**Listeners and databases**

| Listener | Insurer | Component | Database |
|---|---|---|---|
| `PS-BCS-PROD` | Australia (incl. Luna) | UPM Db | `PETSURE_PRD_UPM` |
| `TP-PRD-BCS-LS01` | Trupanion | UPM Db | `TRUPANION_PRD_UPM` |

---

## 4. Summary by managed service

| Managed service | Servers / instances | Components hosted |
|---|---|---|
| API Management | 1 | VetHub |
| App Service | 6 | VetHub (4), Dynamic CLAPI, STP / Clawdia |
| Azure Virtual Machines | 11 servers + 1 SQL listener | COS, CLAPI, VetHub, DAPI, UPM+ NZ, UPM Dynamics API NZ, UPM Db NZ |
| Logic Apps Standard | 2 | Claims Automation, STP / Clawdia |
| Azure Functions | 3 | STP / Clawdia |
| Azure Machine Learning | 1 | ML Environment (ClawGP) |
| Azure SQL Database | 1 server, 5 databases | VetHub, COS (×3), Claims Automation / STP |
| On-premises data centre | 9 | UPM+ AU, UPM+ TPN, UPM Dynamics API, DAPI |
| On-premises SQL Server | 2 listeners | UPM Db AU, UPM Db TPN |

---

## 5. Open points

- **VP servers.** `PS-PRD-AZ-P3WEB` / `PS-PRD-AZ-P3APP` are mapped to Vet Partners by analogy (*inferred*).
- **VetHub Windows services** on `PS-PRD-AZS-P3-3` are *inferred*.
- **NZ COS database name** `COS_PROD_NZ` is *inferred*.
- **Names TBC in the model:** the Claims Automation Logic App and the UPM NZ BC API service instance.
- **Trupanion DAPI and UPM+** (servers, shares, listener `TP-PRD-BCS-LS01`, database `TRUPANION_PRD_UPM`) come from the model only and are not described in the source summary.
- **AU DAPI read-only host.** The newer source (`PS-PRD-AZS-CSP1`, 10.3.0.92) is used; a 2025 page names `AZ-SY-P-CSPRO01` (10.3.0.55).
