/*
 * h1-view-helpers.js
 * ---------------------------------------------------------------------------
 * Purpose     : Small reusable helpers for H1 view-building scripts: name
 *               normalisation, collection handling, top-level folder lookup,
 *               view lookup by property and container styling.
 * Authored    : 2026-10-26
 * Kind        : Helper module. Nothing in this file changes the model.
 * Used by     : dev/2026-10-26-create-h1-servers-by-service-view.ajs
 *               (the same logic is inlined in
 *               dev/2026-10-26-create-h1-prod-deployment-view.ajs, which has
 *               already been run and is left unchanged).
 * Requires    : jArchi (Archi scripting plug-in) with a selected model.
 * Australian English is used throughout.
 */

var H1V = (function () {
    "use strict";

    var TOP_FOLDER_NAMES = {
        technology: ["Technology & Physical", "Technology and Physical", "Technology"],
        relations: ["Relations"],
        views: ["Views", "Diagrams"]
    };

    function norm(s) { return (s === null || s === undefined ? "" : String(s)).trim().replace(/\s+/g, " ").toLowerCase(); }

    function toArray(coll) {
        var out = [];
        if (!coll) { return out; }
        if (typeof coll.each === "function") { coll.each(function (x) { out.push(x); }); return out; }
        for (var i = 0; i < coll.length; i++) { out.push(coll[i]); }
        return out;
    }

    function byName(a, b) {
        // natural sort, so that "APP2" comes before "APP10"
        return String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: "base" });
    }

    function findTopFolder(kind) {
        var names = TOP_FOLDER_NAMES[kind].map(norm);
        var hits = toArray($(model).children("folder")).filter(function (f) { return names.indexOf(norm(f.name)) >= 0; });
        return hits.length ? hits[0] : null;
    }

    /** Views carrying property key=value, or (when no view carries it) views with the same name. */
    function findViews(propKey, propValue, name) {
        var all = toArray($("view"));
        var byProp = all.filter(function (v) { return v.prop(propKey) === propValue; });
        if (byProp.length) { return byProp; }
        return all.filter(function (v) { return norm(v.name) === norm(name); });
    }

    function styleContainer(obj, fill) {
        try { obj.textPosition = TEXT_POSITION.TOP; } catch (e) { /* older jArchi */ }
        try { obj.textAlignment = TEXT_ALIGNMENT.LEFT; } catch (e) { /* older jArchi */ }
        if (fill) { try { obj.fillColor = fill; } catch (e) { /* ignore */ } }
    }

    return {
        norm: norm, toArray: toArray, byName: byName,
        findTopFolder: findTopFolder, findViews: findViews, styleContainer: styleContainer
    };
})();
