/*
 * h1-prod-deployment-data.js
 * ---------------------------------------------------------------------------
 * Purpose     : Data for the "H1 – PROD deployment by insurer" view. Describes,
 *               for every component × insurer pair, which Azure (or on-premises)
 *               technology service hosts it, which instances (nodes / system
 *               software) exist, which application components run on each
 *               instance and which deployment artifacts realise them.
 * Authored    : 2026-10-26
 * Kind        : Data module. Nothing in this file changes the model.
 * Used by     : dev/2026-10-26-create-h1-prod-deployment-view.ajs
 * Sources     : docs/infrastructure/infrastructure-summary-as-is.md (2026-10-26),
 *               Confluence (Trupanion AU Server Specs, CSP – Environment,
 *               Trupanion UPM+ DR plan), source code and git remotes under
 *               "repos by system" (COS, VetHub, STP, CSP Gen 3), ClawGP/settings.toml.
 * Conventions : - "existing" = concepts already in the H1 model, matched by Archi ID.
 *               - "elements" = concepts this script creates (or reuses by type + name).
 *               - Property "inferred" = "true" marks facts not confirmed by any source.
 *               - source_code = "TBC …" where the repository was not accessible.
 * Australian English is used throughout.
 */

var H1_PROD_DEPLOYMENT = (function () {
    "use strict";

    var GH = "https://github.com/PetSureAustralia/";
    var LEGACY = "Legacy estate – subscription 60181c42-6ab1-4a45-86e2-27d2a74ff8b0";
    var LZ_VETHUB = "sub-prd-vethub-ps (ea27562d-5f85-4227-a600-587d274cb37e)";
    var ONPREM = "On-premises (Equinix + AirTrunk)";

    function art(name, type, repo, extra) {
        var p = { type: type, source_code: repo ? (repo.indexOf("TBC") === 0 ? repo : GH + repo + ".git") : "" };
        for (var k in (extra || {})) { p[k] = extra[k]; }
        return { type: "artifact", name: name, props: p };
    }
    function node(name, props) { return { type: "node", name: name, props: props || {} }; }
    function sysSw(name, props) { return { type: "system-software", name: name, props: props || {} }; }
    function tsvc(name, provider) { return { type: "technology-service", name: name, props: { provider: provider } }; }

    return {
        source: "H1 PROD deployment by insurer – data 2026-10-26",
        viewName: "H1 – PROD deployment by insurer",
        viewIdProperty: "h1_view_id",
        viewIdValue: "H1-PROD-DEPLOYMENT-BY-INSURER",
        folderName: "H1 PROD Deployment",

        // ------------------------------------------------ concepts already in the model (Archi IDs)
        existing: {
            AC_VETHUB: "id-d7e6683d45f0406e9031163deac92dd0",
            AC_COS: "id-b44b981321a9470bb8ae756b28ea8d8a",
            AC_CA: "id-049508a883b044e4a78e79f95a92efa0",
            AC_CLAPI: "id-10537b0f6f33411ea9308d72c8664509",
            AC_DAPI: "id-33cfd8b12bdc4243a6799ac952b91c3d",
            AC_DCLAPI: "id-d96d0d881a85486a946f8bcebfbd3392",
            AC_CLAW: "id-8a89555aeaaa4a77a4e4d5c67eb39a84",
            AC_UPMDB: "id-0e37e6c143ee49cd90807b79471116e2",
            AC_UPMAPI: "id-a3d02518353947c890f07ef93d1e779e",
            AC_ML: "id-b6d4dd148e7941e3a31b65883613c4a6",
            AC_UPM: "id-f21a15c743204cb6b4f5cdefd7a617cb",

            TS_APPSVC: "id-3a929a9e189c4ae987e35833c42ae445",
            TS_VM: "id-04a83155828543379df5ee466ae29c96",
            TS_LA: "id-cf523cff9c4a44dea59c60e6a5d50c4d",
            TS_FUNC: "id-8a92973d02fd47f6a23016c11cd43de1",
            TS_ML: "id-cc9788f684a047a28e115610cb433071",

            ART_VETHUB_API: "id-404d8fc1ffad4e558549bbcbded82f67",   // VetHub – Compiled application package (VetHub.API)
            ART_COS_API: "id-319f156a4aed4c7190b3df8854023acb",      // COS – IIS deployment (COS.API)
            ART_CA: "id-86f832e13f414eac9c1d1c6e03914de8",          // Claim Automation – Compiled application package
            ART_CLAPI: "id-58fbf7b23c354a94b5e736da4404519b",       // Claims API (CLAPI) – IIS deployment
            ART_DAPI: "id-a203756cf33749aeb02ec82f7eccc81a",        // CSP.Au.DigitalApi (DAPI) – IIS deployment
            ART_DCLAPI: "id-207e27ceea9545239c23c80862698ba2",      // Dynamic Clapi – Compiled application package
            ART_CLAW_LA: "id-9bd6004d067f417ca9648956b409e792",     // STP - Clawdia – Compiled application package (Logic App)
            ART_ML: "id-098506fa4e674eb69c1755c98a5b7c70"           // ML Environment – ML model artifact
        },

        // Properties added to existing artifacts only when the key is not already set.
        existingProps: {
            ART_VETHUB_API: { source_code: GH + "VetHub.API.git", deployable: "VetHub.API" },
            ART_COS_API: { source_code: GH + "COS.API.git", deployable: "COS.API" },
            ART_CA: { source_code: "TBC – Claims Automation repository not yet reviewed" },
            ART_CLAPI: { source_code: GH + "ClaimsAPI.git" },
            ART_DAPI: { source_code: GH + "CSP.Au.DigitalApi.git" },
            ART_DCLAPI: { source_code: GH + "DynamicCLAPI.git" },
            ART_CLAW_LA: { source_code: GH + "StraightThroughProcessLogicApps.git", deployable: "Logic App workflows (ps-logic-master, entry and sub-flows)" },
            ART_ML: { source_code: GH + "ClawGP.git", models: "sleepy_king-14.pt (GP), musing_onion_md.pkl (MD)", bundle: "sleepy_king_bundle" }
        },

        // ------------------------------------------------ concepts created (or reused by type + name)
        elements: {
            // Technology services
            TS_SQL: tsvc("Azure SQL Database", "Azure"),
            TS_APIM: tsvc("API Management", "Azure"),
            TS_ONPREM: tsvc("On-premises data centre (Equinix + AirTrunk)", "On-premises"),
            TS_ONPREM_SQL: tsvc("On-premises SQL Server", "On-premises"),

            // Nodes – VetHub
            N_APIM: node("ps-prod-apim-vethub", { hosting: "API Management Basic_1", resource_group: "ps-prod-rg-vethub", landing_zone: LEGACY, url: "ps-prod-apim-vethub.azure-api.net", inferred_url: "true" }),
            N_VHAPI: node("ps-syd-prd-vethub-vhapi-app", { hosting: "App Service P1v3 (zone-redundant)", plan: "ps-syd-prd-vethub-asp", resource_group: "ps-syd-prd-vethubapi-rg", landing_zone: LZ_VETHUB, url: "api-vh-prod.vethub.net; internal-api-vh-prod.petsure.com.au" }),
            N_VHREG: node("ps-syd-prd-vethub-vhregapi-app", { plan: "ps-syd-prd-vethub-asp", resource_group: "ps-syd-prd-vethubapi-rg", landing_zone: LZ_VETHUB, url: "api-vethubreg-prod.vethub.net; internal-api-vethubreg-prod.petsure.com.au" }),
            N_VHPORTAL: node("ps-syd-prd-vethub-vhportalapi-app", { plan: "ps-syd-prd-vethub-asp", resource_group: "ps-syd-prd-vethubapi-rg", landing_zone: LZ_VETHUB, url: "api-vethubportal-prod.vethub.net; internal-api-vethubportal-prod.petsure.com.au", public_access: "off" }),
            N_VHUI: node("ps-syd-prd-vethub-vhui-app", { plan: "ps-syd-prd-vethub-asp", resource_group: "ps-syd-prd-vethubapi-rg", landing_zone: LZ_VETHUB, url: "vetportal.vethub.net" }),

            // Nodes – GoTech Windows VMs (legacy estate)
            N_P31: node("PS-PRD-AZS-P3-1", { role: "IIS", ip: "10.6.0.35", landing_zone: LEGACY, domain: "petprod.internal", insurer: "AUS (incl. TPN, Luna)" }),
            N_P32: node("PS-PRD-AZS-P3-2", { role: "IIS", ip: "10.6.0.39", landing_zone: LEGACY, domain: "petprod.internal", insurer: "AUS (incl. TPN, Luna)" }),
            N_P33: node("PS-PRD-AZS-P3-3", { role: "Windows services", ip: "10.6.0.40", landing_zone: LEGACY, domain: "petprod.internal", insurer: "AUS (incl. TPN, Luna)" }),
            N_NZWEB: node("NZ-PRD-AZ-P3WEB", { role: "IIS", landing_zone: LEGACY, insurer: "NZ" }),
            N_NZAPP: node("NZ-PRD-AZ-P3APP", { role: "Windows services", landing_zone: LEGACY, insurer: "NZ" }),
            N_VPWEB: node("PS-PRD-AZ-P3WEB", { role: "IIS", ip: "10.3.0.151", landing_zone: LEGACY, insurer: "VP", inferred: "true" }),
            N_VPAPP: node("PS-PRD-AZ-P3APP", { role: "Windows services", landing_zone: LEGACY, insurer: "VP", inferred: "true" }),

            // Nodes – DAPI
            N_BCSAPI: node("PS-BCS-PRD-API1", { role: "IIS", ip: "172.16.25.50", location: ONPREM, url: "api.petsure.com.au; tp-api.petsure.com.au; tp-api-ro.petsure.com.au" }),
            N_CSP1: node("PS-PRD-AZS-CSP1", { role: "IIS (DAPI read-only)", ip: "10.3.0.92", landing_zone: LEGACY, url: "digitalapi-prod-ro.petsure.com.au" }),
            N_NZAPI: node("NZ-PRD-INT-API1", { role: "IIS", size: "Standard_D4as_v4", ip: "10.55.8.68", landing_zone: "sub-prd-digital-nz", resource_group: "nz-syd-prd-sharedapis-rg", url: "nz-digitalapi.petsure.com.au" }),

            // Nodes – Dynamic CLAPI / CLAW / Claim Automation / ML
            N_DCLAPI: node("ps-syd-prd-claw-dynamicclapi-app", { resource_group: "ps-syd-prd-claw-rg", landing_zone: LZ_VETHUB, url: "ps-syd-prod-dynamicclapi-api.petsure.com.au" }),
            N_CLAWLA: node("ps-syd-prd-claw-stp-lapp", { plan: "ps-syd-prd-claw-stp-la-asp", resource_group: "ps-syd-prd-claw-rg", landing_zone: LZ_VETHUB }),
            N_FDBC: node("ps-syd-prd-claw-dbcommand-func-app", { resource_group: "ps-syd-prd-claw-rg", landing_zone: LZ_VETHUB, url: "ps-syd-prod-dbcommand-func-app.petsure.com.au" }),
            N_FDBQ: node("ps-syd-prd-claw-dbquery-func-app", { resource_group: "ps-syd-prd-claw-rg", landing_zone: LZ_VETHUB, url: "ps-syd-prod-dbquery-func-app.petsure.com.au" }),
            N_FKV: node("ps-syd-prd-claw-keyvault-func-app", { resource_group: "ps-syd-prd-claw-rg", landing_zone: LZ_VETHUB, url: "ps-syd-prod-keyvault-func-app.petsure.com.au" }),
            N_RODS: node("ps-syd-prd-claw-readonlydataservice-app", { resource_group: "ps-syd-prd-claw-rg", landing_zone: LZ_VETHUB }),
            N_CALA: node("Claims Automation Logic App (name TBC)", { landing_zone: "TBC", inferred: "true" }),
            N_MLEP: node("ps-prd-claimsauto-gp", { hosting: "Managed online endpoint", deployment: "gp-prod-deployment", workspace: "ps-prd-ml-ws-claimsauto", resource_group: "ps-prod-ml-claimsauto", landing_zone: LEGACY, url: "…/score (standard Azure ML path)" }),

            // Nodes – UPM+ application tier
            N_BCS1: node("PS-PRD-BCS-APP1", { role: "BC application server", location: "Equinix" }),
            N_BCS2: node("PS-PRD-BCS-APP2", { role: "BC application server", location: "AirTrunk" }),
            N_BCS5: node("PS-PRD-BCS-APP5", { role: "BC application server", location: "Equinix" }),
            N_BCS6: node("PS-PRD-BCS-APP6", { role: "BC application server", location: "AirTrunk" }),
            N_BCS3: node("PS-PRD-BCS-APP3", { role: "BC job server", location: "Equinix" }),
            N_BCS4: node("PS-PRD-BCS-APP4", { role: "BC job server", location: "AirTrunk" }),
            N_TP1: node("TP-PRD-BCS-APP1", { role: "BC application / job server", ip: "172.16.25.241", location: ONPREM }),
            N_TP2: node("TP-PRD-BCS-APP2", { role: "BC application / job server", ip: "172.16.25.242", location: ONPREM }),
            N_NZBC3: node("nz-prd-bcs-app3", { role: "BC application server", size: "Standard D4as v4", landing_zone: "sub-prd-core-nz", resource_group: "nz-syd-prd-bcs-rg", load_balancer: "NZUPMPRD (10.54.0.6)" }),
            N_NZBC4: node("nz-prd-bcs-app4", { role: "BC application server", size: "Standard D4as v4", landing_zone: "sub-prd-core-nz", resource_group: "nz-syd-prd-bcs-rg", load_balancer: "NZUPMPRD (10.54.0.6)" }),

            // System software – databases
            SS_SQL_PSPROD: sysSw("SQL Server – petsure-production", { kind: "Azure SQL logical server", server: "petsure-production.database.windows.net", failover_secondary: "p3-ro-db.database.windows.net", landing_zone: LEGACY }),
            SS_UPM_AU: sysSw("SQL Server Always On – PS-BCS-PROD", { kind: "SQL Server AG listener", nodes: "PS-PRD-BCS-DB01 (Equinix), PS-PRD-BCS-DB02 (AirTrunk)", location: ONPREM }),
            SS_UPM_TP: sysSw("SQL Server Always On – TP-PRD-BCS-LS01", { kind: "SQL Server AG listener", ip: "172.16.25.57", nodes: "PS-PRD-BCS-DB01, PS-PRD-BCS-DB02 (shared with AU)", location: ONPREM }),
            SS_UPM_NZ: sysSw("SQL Server Always On – NZ-PRD-BCS-LS01", { kind: "SQL Server on Azure VMs, AG listener", nodes: "nz-prd-bcs-db01, nz-prd-bcs-db02 (Standard E4bds v5)", landing_zone: "sub-prd-core-nz", resource_group: "nz-syd-prd-bcs-rg" }),

            // Artifacts – VetHub
            ART_APIM: art("apim-vethub-api – API definition with policies", "API definition with policies", "apim-vethub-api"),
            ART_VHREG: art("VetHub.Reg.API – Compiled application package", "Compiled application package", "VetHub.Reg.API"),
            ART_VHPORTAL: art("Vet.Portal.API – Compiled application package", "Compiled application package", "Vet.Portal.API"),
            ART_VHUI: art("VetHub.UI – Source package", "Source package", "VetHub.UI"),
            ART_VHSVC: art("VetHub.Service – Executable / binary", "Executable / binary", "VetHub.Service"),
            ART_VHPC: art("VetHub.Service.ProcessConversations – Executable / binary", "Executable / binary", "VetHub.Service.ProcessConversations"),
            ART_VHSU: art("VetHub.Service.StatusUpdate – Executable / binary", "Executable / binary", "VetHub.Service.StatusUpdate"),
            ART_VHSTUCK: art("VetHub.Alert.StuckClaims – Executable / binary", "Executable / binary", "VetHub.Alert.StuckClaims"),
            ART_MSGFMT: art("MessageFormat.API – IIS deployment", "IIS deployment", "MessageFormat.API"),
            ART_DB_VETHUB: art("VetHub_PROD", "Database", "VetHub.SQLServer", { tier: "DTU 400", sync: "Azure SQL Data Sync to DWH" }),

            // Artifacts – COS
            ART_COSSVC: art("COS.Service – Executable / binary", "Executable / binary", "COS.Service"),
            ART_COSVH: art("COS.VetHub.Services – Executable / binary", "Executable / binary", "COS.VetHub.Services"),
            ART_COSPOLL: art("COS.Poll.Services – Executable / binary", "Executable / binary", "COS.Poll.Services"),
            ART_COSAAS: art("COS.AddAttachments.Saga – Executable / binary", "Executable / binary", "COS.AddAttachments.Saga"),
            ART_COSAACP: art("COS.AddAttachments.Service.ConvertPDF – Executable / binary", "Executable / binary", "COS.AddAttachments.Service.ConvertPDF"),
            ART_COSAACO: art("COS.AddAttachments.Service.Consolidate – Executable / binary", "Executable / binary", "COS.AddAttachments.Service.Consolidate"),
            ART_COSAASU: art("COS.AddAttachments.Service.Submit – Executable / binary", "Executable / binary", "COS.AddAttachments.Service.Submit"),
            ART_DB_COS: art("COS_PROD", "Database", "COS.SQLServer"),
            ART_DB_COSNZ: art("COS_PROD_NZ", "Database", "COS.SQLServer", { inferred: "true", note: "NZ COS database name not confirmed" }),
            ART_DB_COSVP: art("COS_PROD_VP", "Database", "COS.SQLServer"),

            // Artifacts – DAPI
            ART_SHARE_AU: art("auapidocuments – Windows file share", "File share (claim documents)", "", { path: "\\\\PS-BCS-PRD-API1\\auapidocuments" }),
            ART_DAPI_TP: art("CSP.Au.Trupanion.DigitalApi – IIS deployment", "IIS deployment", "CSP.Au.Trupanion.DigitalApi", { sites: "tp-api.petsure.com.au, tp-api-ro.petsure.com.au" }),
            ART_SHARE_TP: art("PRD_TP_UPMClaimDoc – Windows file share", "File share (claim documents)", "", { path: "\\\\PS-BCS-PRD-API1\\PRD_TP_UPMClaimDoc" }),
            ART_DAPI_NZ: art("NZ Digital API – IIS deployment", "IIS deployment", "TBC – NZ Digital API repository not confirmed"),

            // Artifacts – CLAW / Claim Automation
            ART_FDBC: art("STP DBCommand Function App – Compiled application package", "Compiled application package", "StraightThroughProcessFunctions", { project: "StraightThroughProcessDBCommandFunctionApp" }),
            ART_FDBQ: art("STP DBQuery Function App – Compiled application package", "Compiled application package", "StraightThroughProcessFunctions", { project: "StraightThroughProcessDBQueryFunctionApp" }),
            ART_FKV: art("STP KeyVault Function App – Compiled application package", "Compiled application package", "StraightThroughProcessFunctions", { project: "StraightThroughProcessKeyVaultFunctionApp" }),
            ART_RODS: art("DataService.UPM – Compiled application package", "Compiled application package", "DataService.UPM"),
            ART_DB_CA: art("PSPRODClaimsAutoDB", "Database", "TBC – Claims Automation repository not yet reviewed", { shared_by: "Claim Automation, STP - Clawdia" }),

            // Artifacts – UPM+
            ART_UPM_AU: art("UPM+ AU – Business Central application", "Installer", "TBC – UPM AU repository not yet reviewed"),
            ART_UPMAPI_AU: art("PETSURE_UPM_API_BASIC – BC API service instance", "Installer", "TBC – UPM AU repository not yet reviewed", { endpoints: "upmprod.internal.petsure.com.au:9248 (lodge); upmprod-capi.internal.petsure.com.au:9248 (write/inspect/finish/return)" }),
            ART_DB_UPM_AU: art("PETSURE_PRD_UPM", "Database", "TBC – UPM AU repository not yet reviewed"),
            ART_UPM_TP: art("UPM+ Trupanion – Business Central application", "Installer", "TBC – UPM repository not yet reviewed", { bc_instance: "TPUPM:9046/TRUPANION_PRD_UPM" }),
            ART_UPMAPI_TP: art("TRUPANION_PROD_API_BASIC – BC API service instance", "Installer", "TBC – UPM repository not yet reviewed", { endpoints: "tpupm.internal.petsure.com.au:9148" }),
            ART_DB_UPM_TP: art("TRUPANION_PRD_UPM", "Database", "TBC – UPM repository not yet reviewed"),
            ART_UPM_NZ: art("UPM+ NZ – Business Central application", "Installer", "TBC – UPM NZ repository not yet reviewed"),
            ART_UPMAPI_NZ: art("UPM NZ – BC API service instance (name TBC)", "Installer", "TBC – UPM NZ repository not yet reviewed", { inferred: "true" }),
            ART_DB_UPM_NZ: art("PETSURE_PRD_UPM_NZ", "Database", "TBC – UPM NZ repository not yet reviewed")
        },

        // ------------------------------------------------ view content
        // section → groups → blocks (one per technology service, stacked) → items
        // (nodes / system software, side by side) → components (stacked) → artifacts (stacked).
        // item.artifacts = artifacts placed directly on the instance (no component).
        // group.dbServes = application component served by the group's database system software.
        sections: [
            {
                name: "Global",
                groups: [
                    {
                        name: "VetHub Global", dbServes: "AC_VETHUB",
                        blocks: [
                            { service: "TS_APIM", items: [{ el: "N_APIM", components: [{ el: "AC_VETHUB", artifacts: ["ART_APIM"] }] }] },
                            {
                                service: "TS_APPSVC", items: [
                                    { el: "N_VHAPI", components: [{ el: "AC_VETHUB", artifacts: ["ART_VETHUB_API"] }] },
                                    { el: "N_VHREG", components: [{ el: "AC_VETHUB", artifacts: ["ART_VHREG"] }] },
                                    { el: "N_VHPORTAL", components: [{ el: "AC_VETHUB", artifacts: ["ART_VHPORTAL"] }] },
                                    { el: "N_VHUI", components: [{ el: "AC_VETHUB", artifacts: ["ART_VHUI"] }] }
                                ]
                            },
                            {
                                service: "TS_VM", items: [
                                    { el: "N_P31", components: [{ el: "AC_VETHUB", artifacts: ["ART_MSGFMT"] }] },
                                    { el: "N_P32", components: [{ el: "AC_VETHUB", artifacts: ["ART_MSGFMT"] }] },
                                    { el: "N_P33", components: [{ el: "AC_VETHUB", artifacts: ["ART_VHSVC", "ART_VHPC", "ART_VHSU", "ART_VHSTUCK"] }] }
                                ]
                            },
                            { service: "TS_SQL", items: [{ el: "SS_SQL_PSPROD", artifacts: ["ART_DB_VETHUB"] }] }
                        ]
                    },
                    {
                        name: "Claim Automation Global", dbServes: "AC_CA",
                        blocks: [
                            { service: "TS_LA", items: [{ el: "N_CALA", components: [{ el: "AC_CA", artifacts: ["ART_CA"] }] }] },
                            { service: "TS_SQL", items: [{ el: "SS_SQL_PSPROD", artifacts: ["ART_DB_CA"] }] }
                        ]
                    }
                ]
            },
            {
                name: "Australia",
                groups: [
                    {
                        name: "COS Australia + Trupanion", dbServes: "AC_COS",
                        blocks: [
                            {
                                service: "TS_VM", items: [
                                    { el: "N_P31", components: [{ el: "AC_COS", artifacts: ["ART_COS_API"] }] },
                                    { el: "N_P32", components: [{ el: "AC_COS", artifacts: ["ART_COS_API"] }] },
                                    { el: "N_P33", components: [{ el: "AC_COS", artifacts: ["ART_COSSVC", "ART_COSVH", "ART_COSPOLL", "ART_COSAAS", "ART_COSAACP", "ART_COSAACO", "ART_COSAASU"] }] }
                                ]
                            },
                            { service: "TS_SQL", items: [{ el: "SS_SQL_PSPROD", artifacts: ["ART_DB_COS"] }] }
                        ]
                    },
                    {
                        name: "Claims API Australia + Trupanion",
                        blocks: [
                            {
                                service: "TS_VM", items: [
                                    { el: "N_P31", components: [{ el: "AC_CLAPI", artifacts: ["ART_CLAPI"] }] },
                                    { el: "N_P32", components: [{ el: "AC_CLAPI", artifacts: ["ART_CLAPI"] }] }
                                ]
                            }
                        ]
                    },
                    {
                        name: "DAPI Australia",
                        blocks: [
                            { service: "TS_ONPREM", items: [{ el: "N_BCSAPI", components: [{ el: "AC_DAPI", artifacts: ["ART_DAPI"] }], artifacts: ["ART_SHARE_AU"] }] },
                            { service: "TS_VM", items: [{ el: "N_CSP1", components: [{ el: "AC_DAPI", artifacts: ["ART_DAPI"] }] }] }
                        ]
                    },
                    {
                        name: "Dynamic CLAPI Australia + Trupanion",
                        blocks: [
                            { service: "TS_APPSVC", items: [{ el: "N_DCLAPI", components: [{ el: "AC_DCLAPI", artifacts: ["ART_DCLAPI"] }] }] }
                        ]
                    },
                    {
                        name: "STP - Clawdia Australia", dbServes: "AC_CLAW",
                        blocks: [
                            { service: "TS_LA", items: [{ el: "N_CLAWLA", components: [{ el: "AC_CLAW", artifacts: ["ART_CLAW_LA"] }] }] },
                            {
                                service: "TS_FUNC", items: [
                                    { el: "N_FDBC", components: [{ el: "AC_CLAW", artifacts: ["ART_FDBC"] }] },
                                    { el: "N_FDBQ", components: [{ el: "AC_CLAW", artifacts: ["ART_FDBQ"] }] },
                                    { el: "N_FKV", components: [{ el: "AC_CLAW", artifacts: ["ART_FKV"] }] }
                                ]
                            },
                            { service: "TS_APPSVC", items: [{ el: "N_RODS", components: [{ el: "AC_CLAW", artifacts: ["ART_RODS"] }] }] },
                            { service: "TS_SQL", items: [{ el: "SS_SQL_PSPROD", artifacts: ["ART_DB_CA"] }] }
                        ]
                    },
                    {
                        name: "ML Environment Australia",
                        blocks: [
                            { service: "TS_ML", items: [{ el: "N_MLEP", components: [{ el: "AC_ML", artifacts: ["ART_ML"] }] }] }
                        ]
                    },
                    {
                        name: "UPM+ Australia", dbServes: "AC_UPM",
                        blocks: [
                            {
                                service: "TS_ONPREM", items: [
                                    { el: "N_BCS1", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_AU"] }, { el: "AC_UPMAPI", artifacts: ["ART_UPMAPI_AU"] }] },
                                    { el: "N_BCS2", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_AU"] }, { el: "AC_UPMAPI", artifacts: ["ART_UPMAPI_AU"] }] },
                                    { el: "N_BCS5", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_AU"] }, { el: "AC_UPMAPI", artifacts: ["ART_UPMAPI_AU"] }] },
                                    { el: "N_BCS6", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_AU"] }, { el: "AC_UPMAPI", artifacts: ["ART_UPMAPI_AU"] }] },
                                    { el: "N_BCS3", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_AU"] }] },
                                    { el: "N_BCS4", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_AU"] }] }
                                ]
                            },
                            { service: "TS_ONPREM_SQL", items: [{ el: "SS_UPM_AU", components: [{ el: "AC_UPMDB", artifacts: ["ART_DB_UPM_AU"] }] }] }
                        ]
                    }
                ]
            },
            {
                name: "Trupanion",
                groups: [
                    {
                        name: "DAPI Trupanion",
                        blocks: [
                            { service: "TS_ONPREM", items: [{ el: "N_BCSAPI", components: [{ el: "AC_DAPI", artifacts: ["ART_DAPI_TP"] }], artifacts: ["ART_SHARE_TP"] }] }
                        ]
                    },
                    {
                        name: "UPM+ Trupanion", dbServes: "AC_UPM",
                        blocks: [
                            {
                                service: "TS_ONPREM", items: [
                                    { el: "N_TP1", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_TP"] }, { el: "AC_UPMAPI", artifacts: ["ART_UPMAPI_TP"] }] },
                                    { el: "N_TP2", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_TP"] }, { el: "AC_UPMAPI", artifacts: ["ART_UPMAPI_TP"] }] }
                                ]
                            },
                            { service: "TS_ONPREM_SQL", items: [{ el: "SS_UPM_TP", components: [{ el: "AC_UPMDB", artifacts: ["ART_DB_UPM_TP"] }] }] }
                        ]
                    }
                ]
            },
            {
                name: "New Zealand",
                groups: [
                    {
                        name: "COS New Zealand", dbServes: "AC_COS",
                        blocks: [
                            {
                                service: "TS_VM", items: [
                                    { el: "N_NZWEB", components: [{ el: "AC_COS", artifacts: ["ART_COS_API"] }] },
                                    { el: "N_NZAPP", components: [{ el: "AC_COS", artifacts: ["ART_COSSVC", "ART_COSVH", "ART_COSPOLL", "ART_COSAAS", "ART_COSAACP", "ART_COSAACO", "ART_COSAASU"] }] }
                                ]
                            },
                            { service: "TS_SQL", items: [{ el: "SS_SQL_PSPROD", artifacts: ["ART_DB_COSNZ"] }] }
                        ]
                    },
                    {
                        name: "Claims API New Zealand",
                        blocks: [
                            { service: "TS_VM", items: [{ el: "N_NZWEB", components: [{ el: "AC_CLAPI", artifacts: ["ART_CLAPI"] }] }] }
                        ]
                    },
                    {
                        name: "DAPI New Zealand",
                        blocks: [
                            { service: "TS_VM", items: [{ el: "N_NZAPI", components: [{ el: "AC_DAPI", artifacts: ["ART_DAPI_NZ"] }] }] }
                        ]
                    },
                    {
                        name: "UPM+ New Zealand", dbServes: "AC_UPM",
                        blocks: [
                            {
                                service: "TS_VM", items: [
                                    { el: "N_NZBC3", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_NZ"] }, { el: "AC_UPMAPI", artifacts: ["ART_UPMAPI_NZ"] }] },
                                    { el: "N_NZBC4", components: [{ el: "AC_UPM", artifacts: ["ART_UPM_NZ"] }, { el: "AC_UPMAPI", artifacts: ["ART_UPMAPI_NZ"] }] }
                                ]
                            },
                            { service: "TS_VM", items: [{ el: "SS_UPM_NZ", components: [{ el: "AC_UPMDB", artifacts: ["ART_DB_UPM_NZ"] }] }] }
                        ]
                    }
                ]
            },
            {
                name: "Vet Partners",
                groups: [
                    {
                        name: "COS Vet Partners", dbServes: "AC_COS",
                        blocks: [
                            {
                                service: "TS_VM", items: [
                                    { el: "N_VPWEB", components: [{ el: "AC_COS", artifacts: ["ART_COS_API"] }] },
                                    { el: "N_VPAPP", components: [{ el: "AC_COS", artifacts: ["ART_COSSVC", "ART_COSVH", "ART_COSPOLL", "ART_COSAAS", "ART_COSAACP", "ART_COSAACO", "ART_COSAASU"] }] }
                                ]
                            },
                            { service: "TS_SQL", items: [{ el: "SS_SQL_PSPROD", artifacts: ["ART_DB_COSVP"] }] }
                        ]
                    },
                    {
                        name: "Claims API Vet Partners",
                        blocks: [
                            { service: "TS_VM", items: [{ el: "N_VPWEB", components: [{ el: "AC_CLAPI", artifacts: ["ART_CLAPI"] }] }] }
                        ]
                    }
                ]
            }
        ]
    };
})();
