/*
 * log.js — two-tier logging for the whole SW-side engine. Logs land in the
 * SERVICE WORKER console (chrome://extensions -> Ad Block Pro -> "Inspect
 * views: service worker").
 *
 * ONLY two console methods are ever used, mapping onto DevTools' level filter:
 *   console.log   — visible at "Default levels": lifecycle landmarks
 *     (Pro.log.info: boot/install/sync-OK) and failures (Pro.log.warn, tagged
 *     [WARN] in the text — deliberately NOT console.warn, per project policy).
 *   console.debug — hidden by default, shown when you tick "Verbose" in this
 *     console's level dropdown: every Pro.log(...) trace (per-frame GET_PLAN,
 *     gate decisions, feed refetches, ...). The filter is display-only, so
 *     flipping it reveals traces already emitted — nothing to re-run.
 * ON-DEMAND dumps (manual console calls, print via console.log):
 *   await Pro.log.snapshot("label")  -> versioning/state keys
 *   await Pro.log.storage("label")   -> FULL chrome.storage.local (blobs summarized)
 *   await Pro.log.dnr("label")       -> live dynamic + session DNR rules
 * Kill switch: self.__PRO_DEBUG = false BEFORE load silences everything.
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});
   const DEBUG = (self.__PRO_DEBUG = self.__PRO_DEBUG !== false); // default ON; set self.__PRO_DEBUG=false BEFORE load to silence

   function stamp() {
      // HH:MM:SS.mmm without Date-in-worker concerns (performance.now is fine here)
      const t = Math.floor(performance.now());
      return "+" + (t / 1000).toFixed(3) + "s";
   }

   // TRACE tier -> console.debug: hidden at "Default levels", shown when the
   // DevTools console level filter has "Verbose" ticked. Always emitted, so the
   // filter reveals PAST traces too.
   function log(scope, ...args) {
      if (!DEBUG) return;
      try { console.debug("[ABP][" + scope + "] " + stamp(), ...args); } catch (e) {}
   }
   // LANDMARK tier -> console.log: visible at default levels.
   log.info = function (scope, ...args) {
      if (!DEBUG) return;
      try { console.log("[ABP][" + scope + "] " + stamp(), ...args); } catch (e) {}
   };
   // Failures -> console.log too (project policy: only log/debug methods, no
   // console.warn); the [WARN] text tag keeps them grep-able and scannable.
   log.warn = function (scope, ...args) {
      if (!DEBUG) return;
      try { console.log("[ABP][" + scope + "][WARN] " + stamp(), ...args); } catch (e) {}
   };
   // Grouping/table methods are banned by the same policy — group() degrades to
   // a trace line, groupEnd() to nothing, table() to a plain debug dump.
   log.group = function (scope, ...args) { log(scope, "▼", ...args); };
   log.groupEnd = function () {};
   log.table = function (data) { if (DEBUG) try { console.debug(data); } catch (e) {} };

   // The "state" keys worth watching across an update / sync cycle: data-version
   // stamps, per-feed revisions, schedule, migration flags, and the sizes of the
   // user-owned lists (not their contents). Read from LOCAL (source of truth).
   const STATE_KEYS = [
      "proDataVersion", "syncnext", "lastUpdated", "lastSyncAttempt",
      "proBulkRulesRev", "proCosmeticSpecificRev", "proCosmeticGenericRev", "proScriptletDbRev",
      "proLocalMigrated", "proDnrRepartitioned",
      "syncuid", "an", "cid", "sid",
      "userallowlist", "userblocklist", "pausedDomains", "proBreakageAllow", "allowlist",
      "proFlicker", "proScriptletExcludes"
   ];

   // Dump the versioning/state snapshot. Sizes for lists/objects, presence for
   // identity, raw value for versions/timestamps — so an update diff is readable
   // without spilling the whole allowlist into the console.
   // The three dumpers below are ON-DEMAND console tools only — nothing calls
   // them automatically; they always run when invoked and print via console.log.
   log.snapshot = async function (label) {
      if (!Pro.storage) return;
      try {
         const s = await Pro.storage.getLocal(STATE_KEYS);
         const out = {};
         for (const k of STATE_KEYS) {
            const v = s[k];
            if (v == null) out[k] = null;
            else if (Array.isArray(v)) out[k] = "[" + v.length + " items]";
            else if (k === "syncuid" || k === "an" || k === "cid" || k === "sid") out[k] = v ? "present(" + String(v).length + ")" : v;
            else if (typeof v === "object") out[k] = "{obj:" + Object.keys(v).length + " keys}";
            else out[k] = v;
         }
         console.log("[ABP][snapshot] " + stamp() + " " + (label || ""), out);
      } catch (e) {}
   };

   // Dump the FULL chrome.storage.local contents. Keys ≤16KB print verbatim
   // (live, inspectable objects in the console); the big blobs (compiled feeds,
   // generic CSS, scriptlet DB, cosmetic maps) print as type+size summaries so
   // one dump doesn't flood the console with megabytes.
   log.storage = async function (label) {
      try {
         const all = await chrome.storage.local.get(null);
         const SMALL = 16 * 1024;
         const values = {}, blobs = {};
         let total = 0;
         for (const k of Object.keys(all).sort()) {
            const v = all[k];
            let bytes = 0;
            try { const j = JSON.stringify(v); bytes = j === undefined ? 0 : j.length; } catch (e) { bytes = -1; }
            if (bytes > 0) total += bytes;
            if (bytes >= 0 && bytes <= SMALL) { values[k] = v; continue; }
            const kb = bytes < 0 ? "(unserializable)" : "~" + (bytes / 1024).toFixed(1) + " KB";
            blobs[k] =
               Array.isArray(v) ? "array(" + v.length + " items) " + kb :
               typeof v === "string" ? "string " + kb :
               v && typeof v === "object" ? "object(" + Object.keys(v).length + " keys) " + kb :
               typeof v + " " + kb;
         }
         console.log("[ABP][storage] " + stamp() + " " + (label || "") + " — " + Object.keys(all).length + " local keys, ~" + Math.round(total / 1024) + " KB total");
         console.log("values:", values);
         if (Object.keys(blobs).length) console.log("large blobs (summarized):", blobs);
      } catch (e) {}
   };

   // Dump the live DNR state (dynamic + session), grouped by band, so you can see
   // exactly which rules were applied after a sync / user toggle.
   log.dnr = async function (label) {
      try {
         const dyn = await chrome.declarativeNetRequest.getDynamicRules();
         let sess = [];
         try { sess = await chrome.declarativeNetRequest.getSessionRules(); } catch (e) {}
         const band = (id) =>
            id === 1 || id === 2 ? "USER(dyn)" :
            id >= 30 && id < 11000 ? "SERVER[30,11000)" :
            id >= 11000 ? "BULK[11000+)" : "other(" + id + ")";
         const rows = dyn.map((r) => ({
            id: r.id, band: band(r.id), priority: r.priority, action: r.action.type,
            domains: (r.condition && (r.condition.requestDomains || r.condition.initiatorDomains) || []).length || (r.condition && (r.condition.urlFilter || r.condition.regexFilter)) || ""
         }));
         const srows = sess.map((r) => ({ id: r.id, band: "SESSION(" + r.id + ")", priority: r.priority, action: r.action.type,
            domains: (r.condition && (r.condition.requestDomains || r.condition.initiatorDomains) || []).length }));
         console.log("[ABP][dnr] " + stamp() + " " + (label || "") + " — dynamic:" + dyn.length + " session:" + sess.length, rows.concat(srows));
      } catch (e) {}
   };

   log.DEBUG = DEBUG;
   Pro.log = log;
})();
