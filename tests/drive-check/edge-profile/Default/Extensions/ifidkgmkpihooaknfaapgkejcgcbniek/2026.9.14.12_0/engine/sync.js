/*
 * sync.js — the sync driver (service worker). Local-first: identity is read from
 * chrome.storage.local (healed from the sync mirror) and POSTed as
 * syncuid/an/cid/sid/ads_blocked/extid/version/c=update; the server response is
 * blanket-stored to local (ACTION keys rules/proVersion aside), gated by a
 * data-version purge. Sync is driven by NAVIGATION, not just the daily alarm:
 * every top-frame commit calls run(), which is throttled by an in-memory single-
 * flight + cooldown AND a PERSISTED due-gate (lastUpdated + the server's syncnext
 * rotation window). install/update force an immediate sync; nav/alarm are due-
 * gated. No server code is ever executed — readers treat stored values as data.
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});
   const S = () => Pro.storage;
   const F = () => Pro.firewall;

   const API_URL = "https://ad-blocker-pro.org/adbpro-202609.php";
   const UNINSTALL_URL = "https://ad-blocker-pro.org/goodbye.php";
   const COOLDOWN_MS = 10000;
   const PRE_DELAY_MS = 5000;
   // Persisted floor between server ATTEMPTS (success OR failure). Survives worker
   // teardown, so a failing/challenged backend is retried at most this often per
   // user instead of once per navigation. The success cadence is the longer
   // syncnext window; this only bounds the failure/edge storms.
   const RETRY_FLOOR_MS = 15 * 60 * 1000;
   // Fallback rotation window when the server omits/zeroes syncnext, so a missing
   // field can never collapse the due-gate into "always due".
   const DEFAULT_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;

   let lastCallAt = 0;
   let inflight = false;

   // Awaits a step but never lets its failure abort the cycle — so a single bad
   // asset can't skip the remaining steps or the final proDataVersion stamp
   // (which would otherwise re-trigger the purge every cycle).
   async function guard(fn) {
      try { await fn(); } catch (e) {}
   }

   async function fetchJson(url) {
      try {
         const r = await fetch(url, { cache: "no-cache" });
         return r.ok ? await r.json() : null;
      } catch (e) {
         return null;
      }
   }

   async function fetchText(url) {
      try {
         const r = await fetch(url, { cache: "no-cache" });
         return r.ok ? await r.text() : null;
      } catch (e) {
         return null;
      }
   }

   // Identity/attribution are read from LOCAL (the source of truth) and healed
   // from the sync mirror if a key is missing, so an upgraded or locally-wiped
   // user still POSTs its existing syncuid — the server matches the existing row
   // and never mints a new user. Only the fields the backend reads are sent.
   async function buildPost() {
      const idKeys = ["syncuid", "an", "cid", "sid"];
      let data = await S().getLocal([...idKeys, "adsBlocked", "userallowlist", "userblocklist"]);
      data = await S().heal(data, [...idKeys, "userallowlist", "userblocklist"]);
      const params = new URLSearchParams();
      for (const k of idKeys) if (data[k] != null && data[k] !== "") params.set(k, data[k]);
      params.set("ads_blocked", data.adsBlocked || 0);
      // The user's own allow list — the server merges it into the whitelist and
      // bakes it into the durable allow band (paused stays client-only, not sent).
      params.set("allowedDomains", JSON.stringify(Array.isArray(data.userallowlist) ? data.userallowlist : []));
      // The user's own BLOCK list. Blocks stay enforced client-side (session rules, ~10ms)
      params.set("blockedDomains", JSON.stringify(Array.isArray(data.userblocklist) ? data.userblocklist : []));
      params.set("extid", chrome.runtime.id);
      params.set("version", chrome.runtime.getManifest().version.replaceAll(".", ""));
      params.set("c", "update");
      Pro.log("buildPost", "POST payload:", {
         syncuid: data.syncuid ? "present(" + String(data.syncuid).length + ")" : "MISSING(new user)",
         an: data.an || null, cid: data.cid || null, sid: data.sid || null,
         ads_blocked: data.adsBlocked || 0,
         allowedDomains: Array.isArray(data.userallowlist) ? data.userallowlist.length + " hosts" : 0,
         extid: chrome.runtime.id, version: params.get("version")
      });
      return params;
   }

   async function updateUninstallHook() {
      try {
         let d = await S().getLocal(["syncuid", "adsBlocked"]);
         d = await S().heal(d, ["syncuid"]);
         const params = new URLSearchParams({ syncuid: d.syncuid || "", ads_blocked: d.adsBlocked || 0 });
         chrome.runtime.setUninstallURL(`${UNINSTALL_URL}?${params}`);
      } catch (e) {}
   }

   // Wipe every cache the server re-supplies; keep identity, attribution, user
   // choices, the counter, and the packaged breakage list.
   // The server data-version purge: same blanket preserve-list rule as the
   // upgrade-time clean in settle(). No hardcoded key-delete list.
   const purge = () => S().purgeNonPreserved();

   // Apply the user's OWN allow + block choices as client-owned DNR rules (fixed
   // ids 1/2 persistent + 21/22 session, per firewall.js) — separate from the
   // server band. The allow set is the user's allowlist ∪
   // per-domain pauses ∪ the packaged breakage list; the block set is the user's
   // blocklist. Session rules make a fresh toggle live in ~10ms; the persistent
   // twins carry it across a restart. The system whitelist stays server-owned
   // (it arrives in json.rules and is applied verbatim into the [30,11000) band).
   async function refreshUserRules() {
      let local = await S().getLocal(["userallowlist", "pausedDomains", "proBreakageAllow", "userblocklist"]);
      local = await S().heal(local, ["userallowlist", "pausedDomains", "userblocklist"]);
      const allowHosts = [...Pro.bypass.build([local.userallowlist, local.pausedDomains, local.proBreakageAllow])];
      const blockHosts = [...Pro.bypass.build([local.userblocklist])];
      Pro.log("refreshUserRules", "applying user DNR rules —", {
         allow: allowHosts.length + " hosts (userallowlist∪paused∪breakage)",
         block: blockHosts.length + " hosts (userblocklist)",
         allowSample: allowHosts.slice(0, 8), blockSample: blockHosts.slice(0, 8)
      });
      await F().applyUserRules(allowHosts, blockHosts);
   }

   // The server-owned system whitelist (`allowlist` DATA key, blanket-stored by
   // handleResponse) rebuilt as the client's OWN persistent allow rule (id 3) —
   // the client-side twin the sibling brands call applyDefaultWhitelist. NOT a
   // replacement for the server band's whitelist pair: the band still covers the
   // list at high priority; this rule is the redundancy behind it, and the only
   // cover for hosts the band's builder drops (e.g. search.yahoo.com, ejected
   // there as a "protected" domain — the regional *.search.yahoo.com pass, which
   // is why only the US SERP ever showed ERR_BLOCKED_BY_CLIENT). Priority 200:
   // above every static/bulk block, below the server's own high band — the level
   // the siblings run their system allow at in production, injection included.
   // `allowlist` only ever changes via handleResponse (blanket-store; PRESERVED,
   // so the purge never clears it), so the call sites are handleResponse + the
   // install/update seed in sw.js — no storage.onChanged wiring needed.
   async function refreshSystemAllow() {
      const { allowlist } = await S().getLocal("allowlist");
      const hosts = Array.isArray(allowlist) ? allowlist : [];
      Pro.log("refreshSystemAllow", "rebuilding system allow rule (id 3) from the allowlist key:", { hosts: hosts.length });
      await F().applySystemAllow(hosts);
   }

   async function lazyBulk(json) {
      // An empty/absent version means the server hasn't generated this feed yet
      // (compiled_rules_version.txt missing) — do NOT attempt a doomed fetch
      // (compiled_rules.php would 404); keep whatever bulk rules we already have.
      if (!json.rulesUrl || !json.rulesVersion) { Pro.log("lazyBulk", "skip — server has no rules version yet (feed not generated); keeping last-good", { rulesVersion: json.rulesVersion }); return; }
      const { proBulkRulesRev } = await S().getLocal("proBulkRulesRev");
      if (String(proBulkRulesRev) === String(json.rulesVersion)) {
         Pro.log("lazyBulk", "SKIP refetch — version unchanged", { stored: proBulkRulesRev, server: json.rulesVersion });
         return;
      }
      // Append ?extid=<runtime id>: the server serves a bare
      // compiled_rules.php URL and substitutes __EXT_ID__ in the redirect targets
      // (chrome-extension://__EXT_ID__/close.html) from this param.
      const sep = json.rulesUrl.indexOf("?") === -1 ? "?" : "&";
      const url = json.rulesUrl + sep + "extid=" + encodeURIComponent(chrome.runtime.id);
      Pro.log("lazyBulk", "REFETCH — version changed", { stored: proBulkRulesRev, server: json.rulesVersion, url });
      const data = await fetchJson(url);
      if (!Array.isArray(data)) { Pro.log.warn("lazyBulk", "fetch failed / not an array — keeping last-good bulk"); return; }
      await F().applyBulk(data);
      await S().setLocal({ proBulkRulesRev: String(json.rulesVersion) });
      Pro.log("lazyBulk", "applied bulk blocklist", { rules: data.length, newRev: json.rulesVersion });
   }

   // Generic cosmetics: the server serves a RAW CSS stylesheet
   // (cosmetic_css_cache.css), not a JSON selector array. Fetch it as text and
   // store the CSS string verbatim; sw.js injects it top-frame via insertCSS.
   // It's CSS (declarative, non-executable) from our own origin, so it is
   // applied as-is.
   async function lazyCosmeticGeneric(json) {
      if (!json.cosmeticGenericUrl || !json.cosmeticGenericVersion) { Pro.log("lazyGeneric", "skip — server has no generic-CSS version yet (feed not generated); keeping last-good", { cosmeticGenericVersion: json.cosmeticGenericVersion }); return; }
      const { proCosmeticGenericRev } = await S().getLocal("proCosmeticGenericRev");
      if (String(proCosmeticGenericRev) === String(json.cosmeticGenericVersion)) {
         Pro.log("lazyGeneric", "SKIP refetch — version unchanged", { stored: proCosmeticGenericRev, server: json.cosmeticGenericVersion });
         return;
      }
      Pro.log("lazyGeneric", "REFETCH raw CSS — version changed", { stored: proCosmeticGenericRev, server: json.cosmeticGenericVersion, url: json.cosmeticGenericUrl });
      const css = await fetchText(json.cosmeticGenericUrl);
      if (typeof css !== "string" || css.length === 0) { Pro.log.warn("lazyGeneric", "fetch failed / empty — keeping last-good"); return; }
      await S().setLocal({ proCosmeticGeneric: css, proCosmeticGenericRev: String(json.cosmeticGenericVersion) });
      Pro.log("lazyGeneric", "stored raw generic CSS", { bytes: css.length, newRev: json.cosmeticGenericVersion });
   }

   async function lazyCosmeticSpecific(json) {
      if (!json.cosmeticSpecificUrl || !json.cosmeticSpecificVersion) { Pro.log("lazySpecific", "skip — server has no specific version yet (feed not generated); keeping last-good", { cosmeticSpecificVersion: json.cosmeticSpecificVersion }); return; }
      const { proCosmeticSpecificRev } = await S().getLocal("proCosmeticSpecificRev");
      if (String(proCosmeticSpecificRev) === String(json.cosmeticSpecificVersion)) {
         Pro.log("lazySpecific", "SKIP refetch — version unchanged", { stored: proCosmeticSpecificRev, server: json.cosmeticSpecificVersion });
         return;
      }
      Pro.log("lazySpecific", "REFETCH — version changed", { stored: proCosmeticSpecificRev, server: json.cosmeticSpecificVersion, url: json.cosmeticSpecificUrl });
      const data = await fetchJson(json.cosmeticSpecificUrl);
      if (!data || typeof data !== "object") { Pro.log.warn("lazySpecific", "fetch failed / not an object — keeping last-good"); return; }
      await S().setLocal({ proCosmeticSpecific: data, proCosmeticSpecificRev: String(json.cosmeticSpecificVersion) });
      Pro.log("lazySpecific", "stored specific map", { domains: Object.keys(data).length, newRev: json.cosmeticSpecificVersion });
   }

   async function lazyScriptletDb(json) {
      if (!json.scriptletDbUrl || !json.scriptletDbVersion) { Pro.log("lazyScriptlet", "skip — no scriptletDb version (packaged DB used); keeping last-good", { scriptletDbVersion: json.scriptletDbVersion }); return; }
      const { proScriptletDbRev } = await S().getLocal("proScriptletDbRev");
      if (String(proScriptletDbRev) === String(json.scriptletDbVersion)) {
         Pro.log("lazyScriptlet", "SKIP refetch — version unchanged", { stored: proScriptletDbRev, server: json.scriptletDbVersion });
         return;
      }
      Pro.log("lazyScriptlet", "REFETCH — version changed", { stored: proScriptletDbRev, server: json.scriptletDbVersion, url: json.scriptletDbUrl });
      const data = await fetchJson(json.scriptletDbUrl);
      if (!data || typeof data !== "object") { Pro.log.warn("lazyScriptlet", "fetch failed / not an object — keeping last-good"); return; }
      await S().setLocal({
         proScriptletDb: data,
         proScriptletIndex: Pro.scriptlets.compile(data),
         proScriptletDbRev: String(json.scriptletDbVersion)
      });
      Pro.log("lazyScriptlet", "stored scriptlet DB", { keys: Object.keys(data).length, newRev: json.scriptletDbVersion });
   }

   // Server keys handled by an ACTION rather than stored verbatim: `rules` is
   // applied to the DNR engine; `proVersion` drives the purge and is stamped as
   // `proDataVersion`. Everything else is DATA and is blanket-stored — the server
   // sends storage-aligned key names, so there is no rename map and no per-key
   // allowlist. This is safe because every reader treats stored values as DATA
   // (sanitized selectors / structured directives); nothing is ever executed
   // from a stored key, so an unrecognized server key is inert, never a payload.
   const ACTION_KEYS = new Set(["rules", "proVersion"]);

   async function handleResponse(json) {
      if (!json || typeof json !== "object") { Pro.log.warn("handleResponse", "empty/invalid response — nothing applied"); return; }
      Pro.log.group("handleResponse");
      Pro.log("handleResponse", "server response keys:", Object.keys(json));

      // 1. Data-version purge (server-driven), before repopulating: wipe every
      //    non-preserved local key. This is what clears the previous
      //    architecture's cache once the server sends a differing proVersion.
      const { proDataVersion } = await S().getLocal("proDataVersion");
      const incoming = json.proVersion;
      let purged = false;
      if (incoming != null && String(incoming) !== String(proDataVersion)) {
         Pro.log.warn("handleResponse", "proVersion CHANGED -> PURGING non-preserved storage", { stored: proDataVersion, server: incoming });
         await purge();
         purged = true;
      } else {
         Pro.log("handleResponse", "proVersion unchanged -> no purge", { stored: proDataVersion, server: incoming });
      }

      // 2. Server inline DNR rules are APPLIED to the engine VERBATIM (ids
      //    preserved) into the [30,11000) server band, not stored raw.
      let serverRuleCount = 0;
      if (json.rules !== undefined) {
         let rules = json.rules;
         if (typeof rules === "string") {
            try { rules = JSON.parse(rules); } catch (e) { Pro.log.warn("handleResponse", "rules was a string but failed to parse"); rules = []; }
         }
         serverRuleCount = Array.isArray(rules) ? rules.length : 0;
         Pro.log("handleResponse", "applying server inline rules:", serverRuleCount);
         await guard(() => F().applyServerRules(rules));
      } else {
         Pro.log("handleResponse", "no 'rules' key -> server DNR band left untouched (last-good kept)");
      }

      // 3. Blanket-store the rest of the payload verbatim to LOCAL. setLocal
      //    mirrors the recovery subset (syncuid, allowlist, syncnext, …) to sync.
      //    IDENTITY GUARD: the server never legitimately CLEARS identity — a
      //    degraded/partial response echoing syncuid:null must not overwrite a
      //    known-good value (it would poison local AND the sync mirror, and the
      //    next POST would go out identity-less -> duplicate/orphaned user row).
      const IDENTITY_KEYS = ["syncuid", "an", "cid", "sid"];
      const store = {};
      for (const k in json) {
         if (ACTION_KEYS.has(k)) continue;
         if (IDENTITY_KEYS.includes(k) && (json[k] == null || json[k] === "")) continue;
         store[k] = json[k];
      }
      if (Object.keys(store).length) { Pro.log("handleResponse", "blanket-storing DATA keys:", Object.keys(store)); await S().setLocal(store); }

      // 4. Version-gated lazy fetches for the big blobs (read *Url/*Version).
      await guard(() => lazyBulk(json));
      await guard(() => lazyCosmeticGeneric(json));
      await guard(() => lazyCosmeticSpecific(json));
      await guard(() => lazyScriptletDb(json));

      // 5. Rebuild the client-side system allow (id 3) from the just-stored
      //    allowlist key. Deliberately AFTER the blanket-store and guarded:
      //    idempotent, cheap (one updateDynamicRules), and it must run even when
      //    the stored value did not change (a storage.onChanged reaction would
      //    miss the value-unchanged case on an update wave).
      await guard(() => refreshSystemAllow());

      // 6. Stamp the data-version LAST, so a half-applied cycle re-purges and retries.
      if (incoming != null) await S().setLocal({ proDataVersion: String(incoming) });

      await S().setLocal({ lastUpdated: Date.now() });
      await S().flushMirror(); // push the deferred counter (adsBlocked) to the sync backup
      updateUninstallHook();
      // MINIMAL landmark: one line that says the whole cycle went fine and what
      // is now live. Feed revs are read back from storage (stamped by the lazy*
      // steps above), so a failed refetch shows as the previous rev, not a lie.
      const revs = await S().getLocal(["proBulkRulesRev", "proCosmeticGenericRev", "proCosmeticSpecificRev", "proScriptletDbRev"]);
      Pro.log.info("sync", "OK —", {
         proVersion: incoming != null ? String(incoming) : "(none)",
         purged, serverRules: serverRuleCount,
         feeds: {
            bulk: revs.proBulkRulesRev || null, generic: revs.proCosmeticGenericRev || null,
            specific: revs.proCosmeticSpecificRev || null, scriptlets: revs.proScriptletDbRev || null
         }
      });
      Pro.log.groupEnd();
   }

   // Persisted due-gate: hit the server only once the rotation window has elapsed
   // since the last SUCCESSFUL sync (lastUpdated, stamped in handleResponse). Uses
   // the server's syncnext when positive, else a safe default — a missing/zero
   // syncnext can never collapse this into "always due". Survives worker teardown.
   async function isDue() {
      const { lastUpdated, syncnext } = await S().getLocal(["lastUpdated", "syncnext"]);
      if (!lastUpdated) return true; // never synced
      const n = Number(syncnext);
      const interval = n > 0 ? n : DEFAULT_SYNC_INTERVAL_MS;
      return Date.now() - Number(lastUpdated) >= interval;
   }

   // opts.force  — skip the due-gate + pre-delay (install/update: get proVersion now)
   // opts.isInstall — poll sync for a reinstalling user's syncuid before the POST
   async function run(opts) {
      const { force = false, isInstall = false } = opts || {};
      if (inflight || Date.now() - lastCallAt < COOLDOWN_MS) {
         Pro.log("run", "gate: SKIP —", inflight ? "already in-flight" : "within " + COOLDOWN_MS + "ms cooldown");
         return;
      }
      inflight = true;
      try {
         Pro.log("run", "invoked", { force, isInstall });
         // Local-first migration runs before the identity payload is built, so
         // an upgrading/wiped user's syncuid is seeded into local first.
         await guard(() => S().settle());
         if (isInstall) {
            // Wait for a reinstalling user's syncuid to hydrate from sync so the
            // backend matches the existing user instead of minting a duplicate.
            await guard(() => S().ensureIdentitySeeded(2, PRE_DELAY_MS));
         }
         if (!force) {
            // Persisted retry floor first (bounds failure storms across SW sleep),
            // then the rotation-window due-gate.
            const { lastSyncAttempt } = await S().getLocal("lastSyncAttempt");
            if (lastSyncAttempt && Date.now() - Number(lastSyncAttempt) < RETRY_FLOOR_MS) {
               Pro.log("run", "gate: SKIP — within retry floor", { sinceLastAttemptMs: Date.now() - Number(lastSyncAttempt), floorMs: RETRY_FLOOR_MS });
               return;
            }
            const due = await isDue();
            const { lastUpdated, syncnext } = await S().getLocal(["lastUpdated", "syncnext"]);
            if (!due) {
               Pro.log("run", "gate: SKIP — not due yet (isDue=false)", { lastUpdated, syncnext, sinceLastSuccessMs: lastUpdated ? Date.now() - Number(lastUpdated) : "never" });
               return;
            }
            Pro.log("run", "gate: DUE — proceeding after pre-delay", { lastUpdated, syncnext, sinceLastSuccessMs: lastUpdated ? Date.now() - Number(lastUpdated) : "never(first sync)" });
            await new Promise((r) => setTimeout(r, PRE_DELAY_MS));
            if (Date.now() - lastCallAt < COOLDOWN_MS) { Pro.log("run", "gate: SKIP — another sync raced in during pre-delay"); return; }
         } else {
            Pro.log("run", "FORCED sync (install/update) — skipping due-gate");
         }
         lastCallAt = Date.now();
         // Stamp the ATTEMPT (persisted) BEFORE the POST, so a failed/challenged
         // response still advances the retry floor and can't be re-fired per nav.
         await S().setLocal({ lastSyncAttempt: Date.now() });
         Pro.log.info("sync", "POSTing to server (" + (force ? "forced install/update" : "due") + ")");
         const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: await buildPost()
         });
         if (!res.ok) { Pro.log.warn("run", "server responded non-OK — aborting (retry floor still advanced)", { status: res.status }); return; }
         let json;
         try { json = JSON.parse(await res.text()); } catch (e) { Pro.log.warn("run", "response was not valid JSON — aborting"); return; }
         Pro.log("run", "server OK — applying response");
         await handleResponse(json);
      } catch (e) {
         Pro.log.warn("run", "sync threw (ad-blocking unaffected):", e && e.message);
         // Ad-blocking never depends on a successful sync.
      } finally {
         inflight = false;
      }
   }

   Pro.sync = { run, isDue, handleResponse, refreshUserRules, refreshSystemAllow, updateUninstallHook, API_URL, UNINSTALL_URL };
})();
