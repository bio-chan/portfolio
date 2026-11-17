"use strict";
/*
 * sw.js — service worker orchestrator (classic worker; importScripts loads the
 * shared engine). Responsibilities:
 *
 *  - Holds the compiled cosmetic/scriptlet/flicker data in memory (parsed once
 *    per wake, never per frame) and answers each frame's GET_PLAN with only its
 *    host's slice of specific cosmetics + zero-flicker CSS.
 *  - Runs matching scriptlets in the page's MAIN world (bypasses page CSP).
 *  - Registers the generic-cosmetics content script, excluding paused/allow-
 *    listed sites, so a paused site truly shows ads.
 *  - Zero-flicker top-frame pre-paint via webNavigation.onCommitted.
 *  - Install-time seeding, legacy-cache migration, and the sync schedule.
 *
 * The old remote-code path (executeScript of server-delivered JS strings) is gone.
 */
importScripts(
   "engine/log.js",
   "engine/domains.js",
   "engine/bypass.js",
   "engine/cosmetics.js",
   "engine/flicker.js",
   "engine/scriptlets.js",
   "engine/storage.js",
   "engine/firewall.js",
   "engine/sync.js"
);

const Pro = self.Pro;
const GENERIC_ID = "pro-generic";
Pro.log("sw", "service worker woke — engine loaded (" + chrome.runtime.getManifest().version + ")");

// Compiled data, loaded once per worker lifetime. Invalidated on any storage
// change so the next GET_PLAN reloads.
const mem = { loaded: false, specific: {}, genericCss: "", scriptIndex: null, scriptExcludes: null, flicker: null, bypass: new Set(), bypassSig: null, ytSkip: false };
let loadGen = 0;          // bumped whenever compiled-data storage changes
let loadingPromise = null; // single-flight: concurrent frames share one load

// Only these keys affect the compiled data / bypass set. The counter and
// bookkeeping writes (adsBlocked, lastUpdated, lastSyncAttempt, syncnext,
// proDataVersion, *Rev…) must NOT invalidate mem, or every pageview would
// force a full reload.
const RELEVANT = new Set([
   "proCosmeticSpecific", "proCosmeticGeneric", "proScriptletIndex", "proScriptletDb",
   "proScriptletExcludes", "proFlicker", "pausedDomains",
   "proBreakageAllow", "allowlist", "userallowlist", "proYtSkip"
]);

// A change to any of these re-applies the client's user DNR rules (allow ids
// 1/21, block ids 2/22) so a fresh pause/allow/block takes effect immediately
// (session rules land in ~10ms; the next sync also bakes allows into the server
// band). The allow inputs are ALSO in RELEVANT, so cosmetics re-evaluate; the
// blocklist is NOT (blocking a host doesn't change its cosmetics/bypass).
const USER_DNR_INPUTS = new Set(["userallowlist", "pausedDomains", "proBreakageAllow", "userblocklist"]);

chrome.storage.onChanged.addListener((changes, area) => {
   // Local is the single source of truth — the sync-area echo of setLocal's
   // recovery mirror (and any session-area write) must not double the DNR
   // refresh / cosmetics invalidation.
   if (area !== "local") return;
   let invalidate = false, reUser = false;
   for (const k in changes) {
      if (RELEVANT.has(k)) invalidate = true;
      if (USER_DNR_INPUTS.has(k)) reUser = true;
   }
   if (invalidate || reUser) {
      Pro.log("onChanged", "storage changed:", { keys: Object.keys(changes), invalidatesMem: invalidate, reAppliesUserDNR: reUser });
   }
   if (invalidate) { loadGen++; mem.loaded = false; }
   if (reUser) Pro.sync.refreshUserRules();
   // proYtSkip is in RELEVANT (mem just invalidated above) — reload eagerly so
   // the generic.css re-registration lands before the popup's tab reload
   // reaches document_start, and flip the DNR ruleset.
   if ("proYtSkip" in changes) { reconcileYtRuleset(); ensureLoaded(); }
});

// ---- YouTube fast-forward: the DNR half of the toggle -------------------
// proYtSkip drives BOTH halves of the YouTube mode: content-youtube.js (the
// skip/seek fallback, which reads the flag itself) and the packaged "youtube"
// static ruleset blocking YouTube's ad endpoints, so most ads never load and
// the fallback only mops up server-stitched leftovers. Chrome persists
// updateEnabledRulesets across restarts but resets it to the manifest default
// (disabled) on an extension update, so the stored flag is re-asserted on
// every worker wake — cheaply, only writing on an actual mismatch.
const YT_RULESET = "youtube";
// Scope of the mode's scriptlet exemption — same lineage semantics as the
// bypass, so m./music./www. subdomains are covered.
const YT_HOSTS = Pro.bypass.build([["youtube.com", "youtube-nocookie.com"]]);
async function reconcileYtRuleset() {
   try {
      const { proYtSkip } = await Pro.storage.getLocal("proYtSkip");
      const want = proYtSkip === true;
      const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
      if (want === enabled.includes(YT_RULESET)) return;
      await Pro.firewall.toggleStatic(want ? [YT_RULESET] : [], want ? [] : [YT_RULESET]);
      Pro.log("ytRuleset", "youtube ad ruleset " + (want ? "ENABLED" : "disabled") + " (proYtSkip=" + want + ")");
   } catch (e) { Pro.log.warn("ytRuleset", "reconcile failed:", e && e.message); }
}
reconcileYtRuleset();

async function loadAsset(path) {
   try {
      const r = await fetch(chrome.runtime.getURL(path));
      return r.ok ? await r.json() : null;
   } catch (e) {
      return null;
   }
}

async function ensureLoaded() {
   if (mem.loaded) return;
   if (loadingPromise) return loadingPromise;
   loadingPromise = (async () => {
      let gen;
      let local; // hoisted so the post-loop log can read the final iteration's data
      do {
         gen = loadGen; // if a relevant write lands mid-load, redo with fresh data
         local = await Pro.storage.getLocal([
            "proCosmeticSpecific", "proCosmeticGeneric", "proScriptletIndex", "proScriptletDb",
            "proScriptletExcludes", "proFlicker", "pausedDomains",
            "proBreakageAllow", "allowlist", "userallowlist", "proYtSkip"
         ]);
         // userallowlist/pausedDomains are user-owned local-first keys; heal them
         // from the sync backup if a race (a GET_PLAN before settle()) finds them
         // only in sync, so a user's paused site is never briefly un-paused.
         local = await Pro.storage.heal(local, ["userallowlist", "pausedDomains"]);
         // Prefer the server-updated cache; fall back to the packaged seed.
         // compile() pre-extracts regex keys so specificFor can match them.
         const specific = Pro.cosmetics.compile(local.proCosmeticSpecific || (await loadAsset("assets/cosmetic-specific.json")) || {});
         const scriptIndex = local.proScriptletIndex
            || Pro.scriptlets.compile(local.proScriptletDb || (await loadAsset("assets/scriptlet-db.json")) || {});
         const flicker = local.proFlicker || (await loadAsset("assets/zero-flicker.json")) || null;
         // One bypass set gates ALL layers (cosmetics/scriptlets, and — via the
         // generic content-script excludeMatches — generic CSS): server allowlist
         // (merged whitelist) ∪ user allow ∪ paused ∪ packaged breakage list.
         const bypass = Pro.bypass.build([local.allowlist, local.userallowlist, local.pausedDomains, local.proBreakageAllow]);
         mem.specific = specific;
         // Server-pushed generic cosmetics — a RAW CSS stylesheet, stored
         // verbatim by lazyCosmeticGeneric and injected top-frame via
         // insertCSS. Added on top of the packaged generic.css baseline (registered
         // content script). Absent / legacy-array -> "" (packaged baseline only,
         // until the next sync stores the CSS string).
         mem.genericCss = typeof local.proCosmeticGeneric === "string" ? local.proCosmeticGeneric : "";
         mem.scriptIndex = scriptIndex;
         mem.scriptExcludes = local.proScriptletExcludes || null; // server per-host scriptlet exclusions
         mem.flicker = flicker;
         mem.bypass = bypass;
         mem.ytSkip = local.proYtSkip === true;
      } while (gen !== loadGen);
      mem.loaded = true;
      Pro.log("ensureLoaded", "compiled data loaded into memory:", {
         specificSource: local.proCosmeticSpecific ? "server" : "packaged",
         specificKeys: mem.specific && mem.specific.map ? Object.keys(mem.specific.map).length : 0,
         scriptletSource: local.proScriptletIndex ? "server-index" : (local.proScriptletDb ? "server-db" : "packaged"),
         genericCss: mem.genericCss ? mem.genericCss.length + " bytes (server)" : "none (packaged content-script baseline only)",
         flicker: mem.flicker && mem.flicker.hostPatterns ? mem.flicker.hostPatterns.length + " patterns" : "none",
         scriptExcludes: mem.scriptExcludes ? "present" : "none",
         bypassHosts: mem.bypass ? mem.bypass.size : 0
      });
      await reconcileGeneric();
   })().finally(() => { loadingPromise = null; });
   return loadingPromise;
}

// ---- generic cosmetics: a registered content script that excludes paused sites
function bypassPatterns(set) {
   const pats = [];
   for (const h of set) pats.push(`*://${h}/*`, `*://*.${h}/*`);
   return pats;
}

async function reconcileGeneric() {
   // The YouTube mode needs youtube free of generic.css too: that sheet hides
   // `.video-ads` — the player's ad-UI container, SKIP BUTTON included — so
   // with it applied content-youtube.js has nothing visible to click and every
   // skippable ad degrades to the slow seek path. (The cosmetic-specific
   // unhide entries can't help: unhide only SUBTRACTS from the specific hide
   // list, it emits no counter-CSS against this sheet.)
   const excl = new Set(mem.bypass);
   if (mem.ytSkip) { excl.add("youtube.com"); excl.add("youtube-nocookie.com"); }
   const sig = [...excl].sort().join("|");
   if (sig === mem.bypassSig) return; // exclusion set unchanged -> skip the scripting API churn
   const desired = {
      id: GENERIC_ID,
      css: ["assets/generic.css"],
      matches: ["<all_urls>"],
      excludeMatches: bypassPatterns(excl),
      allFrames: true,
      runAt: "document_start"
   };
   try {
      const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [GENERIC_ID] });
      if (existing && existing.length) await chrome.scripting.updateContentScripts([desired]);
      else await chrome.scripting.registerContentScripts([desired]);
      mem.bypassSig = sig;
      Pro.log("reconcileGeneric", "generic.css content script " + (existing && existing.length ? "updated" : "registered"), { excludedHostPatterns: desired.excludeMatches.length });
   } catch (e) {
      // Generic-cosmetics registration failed; DNR blocking + specific cosmetics still work.
      Pro.log.warn("reconcileGeneric", "content-script registration failed:", e && e.message);
   }
}

// ---- per-host plan + scriptlet dispatch ---------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
   if (msg && msg.action === "GET_PLAN") {
      handlePlan(msg.url, sender, sendResponse);
      return true; // async sendResponse
   }
   if (msg && msg.action === "YT_STATUS") {
      // content-youtube.js self-diagnostic: is the mode's DNR half live?
      (async () => {
         let ruleset = false;
         try { ruleset = (await chrome.declarativeNetRequest.getEnabledRulesets()).includes(YT_RULESET); } catch (e) {}
         try { sendResponse({ ruleset }); } catch (_) {}
      })();
      return true; // async sendResponse
   }
   if (msg && msg.action === "CS_LOG") {
      // Log line forwarded from content.js so the PAGE console stays clean;
      // prefix with tab/frame since this console has no page context.
      // level "warn" (content-side failures) prints at MINIMAL; plain traces
      // only at verbose — matching the two-tier policy in engine/log.js.
      const tab = sender.tab && sender.tab.id != null ? sender.tab.id : "?";
      const frame = sender.frameId != null ? sender.frameId : "?";
      const emit = msg.level === "warn" ? Pro.log.warn : Pro.log;
      emit("content", "tab " + tab + " frame " + frame + " |", ...(Array.isArray(msg.args) ? msg.args : []));
      // no sendResponse: the sender's callback only exists to swallow lastError
   }
});

async function handlePlan(url, sender, sendResponse) {
   try {
      await ensureLoaded();
      const host = Pro.domains.hostOf(url);
      const frameId0 = sender.frameId != null ? sender.frameId : 0;
      if (!host) { sendResponse({ css: "" }); return; }

      // FLICKER is UNCONDITIONAL: the server only populates proFlicker for the
      // hosts/markets it targets, and pick() only matches its explicit host
      // patterns, so the server directive IS the gate — the client
      // must not re-gate it behind the ad-block bypass (that was the
      // whitelist-collapse bug). The 4s self-heal still guarantees nothing stays
      // hidden forever.
      const flickerCss = Pro.flicker.buildCss(Pro.flicker.pick(mem.flicker, host));

      // AD-BLOCK cosmetics/scriptlets DO respect the full bypass (server
      // allowlist ∪ breakage list ∪ user pause/allow), so they stay off the
      // server-allow-listed hosts and paused sites.
      const adblockOff = Pro.bypass.isBypassed(mem.bypass, host);
      const selectors = adblockOff ? [] : Pro.cosmetics.specificFor(mem.specific, host).filter(Pro.cosmetics.safeSelector);
      const specificCss = Pro.cosmetics.hideCss(selectors);
      sendResponse({ css: [specificCss, flickerCss].filter(Boolean).join("\n") });

      const tabId = sender.tab && sender.tab.id;
      const frameId = frameId0;
      // YouTube fast-forward mode: with proYtSkip ON, do NOT tamper with the
      // player response on YouTube. The ad-stripping scriptlets half-break the
      // ad player against current builds (mangled ad metadata -> stuck
      // transitions, lingering ad state), which is worse than the ads
      // themselves; the mode's DNR ruleset + content-youtube.js handle ads
      // against a CLEAN player instead. Feed cosmetics stay on — they only
      // hide thumbnails, never the player.
      const ytExempt = mem.ytSkip && Pro.bypass.isBypassed(YT_HOSTS, host);
      const calls = (adblockOff || ytExempt) ? [] : Pro.scriptlets.matchCalls(mem.scriptIndex, host, mem.scriptExcludes);
      Pro.log("GET_PLAN", host + " (frame " + frameId + "):", {
         adblockOff, ytExempt, specificCssBytes: specificCss.length, scriptlets: calls.length,
         hideSelectors: selectors,          // exact selector list injected on this frame
         flickerCss: "yes" || "no",    // exact pre-hide/reveal CSS (small)
         scriptletCalls: calls              // [name, ...args] dispatched to MAIN world
      });
      if (calls.length) runScriptlets(tabId, frameId, calls);
      if (frameId === 0 && !adblockOff) bumpCounter();
   } catch (e) {
      Pro.log.warn("GET_PLAN", "handlePlan threw:", e && e.message);
      try { sendResponse({ css: "" }); } catch (_) {}
   }
}

// Runs in the page's MAIN world after the library registers self.__proScriptlets.
function dispatchScriptlets(calls) {
   const reg = self.__proScriptlets;
   if (!reg) return;
   for (const call of calls) {
      try { if (typeof reg[call[0]] === "function") reg[call[0]](call.slice(1)); } catch (e) {}
   }
}

async function runScriptlets(tabId, frameId, calls) {
   if (tabId == null) return;
   const target = { tabId, frameIds: [frameId] };
   try {
      await chrome.scripting.executeScript({ target, world: "MAIN", files: ["scriptlets/library.js"], injectImmediately: true });
      await chrome.scripting.executeScript({ target, world: "MAIN", func: dispatchScriptlets, args: [calls], injectImmediately: true });
      Pro.log("scriptlets", "dispatched " + calls.length + " scriptlet(s) into MAIN world", { tab: tabId, frame: frameId, names: calls.map((c) => c[0]) });
   } catch (e) { Pro.log.warn("scriptlets", "MAIN-world inject failed:", e && e.message); }
}

// ---- zero-flicker + nav-triggered sync: earliest top-frame hook ---------
chrome.webNavigation.onCommitted.addListener(async (details) => {
   if (details.frameId !== 0) return;
   const host = Pro.domains.hostOf(details.url);
   Pro.log("onCommitted", "top-frame nav -> " + host + " (triggers sync.run + flicker)");
   // Drive the server sync from navigation. run() is
   // internally throttled by an in-memory single-flight + cooldown AND a persisted
   // due-gate, so this fires at most once per rotation window. Fire-and-forget.
   Pro.sync.run({});
   // Only http(s) documents can receive CSS — on chrome://newtab, webstore etc.
   // insertCSS rejects, which would emit one warn per internal-page navigation
   // at the minimal log level. (sync.run above still fires for every commit.)
   if (!/^https?:/i.test(details.url) || !host) return;
   try {
      await ensureLoaded();
      const adblockOff = Pro.bypass.isBypassed(mem.bypass, host);
      const target = { tabId: details.tabId, frameIds: [0] };
      // Zero-flicker first (smallest, pre-paint). UNCONDITIONAL: proFlicker is
      // only populated by the server for the hosts it targets and pick() only
      // matches its explicit patterns, so the server directive is the gate.
      // Server-generic cosmetics below DO respect the full bypass.
      const flickerCss = Pro.flicker.buildCss(Pro.flicker.pick(mem.flicker, host));
      if (flickerCss) await chrome.scripting.insertCSS({ target, css: flickerCss, origin: "USER" });
      // Server-pushed generic selectors, injected top-frame only, USER-origin
      // (CSP-immune, harder for anti-adblock to strip than a page <style>), once
      // per navigation. Subframes keep the packaged generic.css baseline. Absent
      // -> "". Keep the server list a bounded supplement, not the full baseline.
      const ytExempt = mem.ytSkip && Pro.bypass.isBypassed(YT_HOSTS, host);
      const genericCss = (adblockOff || ytExempt) ? "" : mem.genericCss;
      if (genericCss) await chrome.scripting.insertCSS({ target, css: genericCss, origin: "USER" });
      if (flickerCss || genericCss) Pro.log("onCommitted", "injected top-frame USER-origin CSS on " + host, {
         adblockOff,
         flickerCss: "yes" || "no",  // exact CSS (small); generic is bytes-only (~whole stylesheet)
         genericBytes: genericCss ? genericCss.length : 0
      });
   } catch (e) { Pro.log.warn("onCommitted", "CSS insert failed on " + host + ":", e && e.message); }
});

// ---- engagement counter -------------------------------------------------
let counterPending = 0;
async function bumpCounter() {
   try {
      const { adsBlocked } = await Pro.storage.getLocal("adsBlocked");
      await Pro.storage.setLocal({ adsBlocked: (parseInt(adsBlocked, 10) || 0) + 1 });
      if (++counterPending >= 10) { counterPending = 0; Pro.sync.updateUninstallHook(); }
   } catch (e) {}
}

// ---- lifecycle ----------------------------------------------------------
chrome.runtime.onInstalled.addListener(async (details) => {
   Pro.log.group("onInstalled");
   Pro.log.info("onInstalled", "reason=" + details.reason + " previousVersion=" + (details.previousVersion || "n/a") + " -> version=" + chrome.runtime.getManifest().version);
   // Sync is driven entirely by navigation (webNavigation.onCommitted -> sync.run,
   // gated by isDue), so no periodic alarm is needed — every page load in any tab
   // re-checks the due deadline. This keeps the "alarms" permission off the manifest.
   // settle() migrates sync->local and makes local authoritative. It does NOT
   // purge the old cache — the server data-version purge handles that on the
   // first response carrying a new proVersion.
   await Pro.storage.settle();
   if (details.reason === "install") {
      await captureInstallAttribution();
      // Onboarding tab AFTER the attribution scrape (tabs.create doesn't close
      // the store tab, but ordering avoids any race on the tab snapshot).
      // Fire-and-forget: install must never block on UI (.catch, not try/catch —
      // tabs.create rejects async, e.g. installed with no browser window open).
      chrome.tabs.create({ url: chrome.runtime.getURL("ui/welcome.html") }).catch(() => {});
   }
   await seedDefaults();
   // Force an immediate sync on BOTH install and update (get proVersion now, so
   // the version purge clears the old architecture's cache). isInstall polls for
   // a reinstalling user's syncuid before the first POST.
   Pro.log("onInstalled", "forcing immediate sync (isInstall=" + (details.reason === "install") + ") — watch handleResponse next");
   Pro.sync.run({ force: true, isInstall: details.reason === "install" });
   Pro.sync.updateUninstallHook();
   Pro.log.groupEnd();
});

// Capture the install-referral attribution (an/cid/sid + utm_*) from the Chrome
// Web Store / Edge Add-ons tab that opened this install, into local storage
// (setLocal mirrors an/cid/sid + utm_* to the sync backup). Runs once, on a fresh
// install only, BEFORE the first server POST so the new user row is created WITH
// its attribution. Needs the "tabs" permission to read the store tab's URL — the
// store domains are excluded from host-permission access.
async function captureInstallAttribution() {
   try {
      const tabs = await chrome.tabs.query({});
      const params = {};
      for (const tab of tabs) {
         const url = tab && tab.url;
         if (!url || !/chromewebstore\.google\.com|microsoftedge\.microsoft\.com/.test(url)) continue;
         let sp;
         try { sp = new URL(url).searchParams; } catch (e) { continue; }
         if (!sp.has("an")) continue; // only the referral tab carries the attribution params
         for (const [k, v] of sp.entries()) params[k] = v;
      }
      if (Object.keys(params).length) await Pro.storage.setLocal(params);
   } catch (e) {
      // Capture is best-effort; a new user simply gets null attribution if the
      // store tab is gone. Never block install on it.
   }
}

async function seedDefaults() {
   const have = await Pro.storage.getLocal(["proBreakageAllow", "proFlicker"]);
   const local = {};
   if (have.proBreakageAllow == null) {
      const b = await loadAsset("assets/breakage-allow.json");
      if (Array.isArray(b)) local.proBreakageAllow = b;
   }
   if (have.proFlicker == null) {
      const f = await loadAsset("assets/zero-flicker.json");
      if (f && typeof f === "object") local.proFlicker = f;
   }
   await Pro.storage.setLocal(local);

   // One-time repartition migration: a user upgrading from the pre-25/26 DNR model
   // has stale dynamic rules in the OLD bands — server rules at [300,999] and the
   // old instant-allow at [5000,8999]. The forced sync below replaces the new
   // server band [30,11000) (which covers both) on success, but if that first sync
   // is offline the old instant-allow  would keep allowing a
   // host the user has since removed. Clear the old bands once here, before the
   // new rules are written, so the stale allows can't outlive the upgrade. Runs
   // pre-first-sync, so it only ever sees OLD-model rules (new 8400+ server rules
   // don't exist yet); guarded by a preserved flag so it never re-runs.
   try {
      const { proDnrRepartitioned } = await Pro.storage.getLocal("proDnrRepartitioned");
      if (!proDnrRepartitioned) {
         const cur = await chrome.declarativeNetRequest.getDynamicRules();
         const oldIds = cur.filter((r) => (r.id >= 300 && r.id <= 999) || (r.id >= 5000 && r.id <= 8999)).map((r) => r.id);
         if (oldIds.length) await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldIds });
         await Pro.storage.setLocal({ proDnrRepartitioned: true });
         Pro.log("seedDefaults", "one-time DNR repartition cleanup (old bands [300,999]∪[5000,8999]):", { removed: oldIds.length, ids: oldIds });
      } else {
         Pro.log("seedDefaults", "DNR repartition already done — skipping cleanup");
      }
   } catch (e) { Pro.log.warn("seedDefaults", "repartition cleanup failed:", e && e.message); }

   Pro.log("seedDefaults", "seeded packaged defaults where missing:", { proBreakageAllow: local.proBreakageAllow ? "seeded" : "kept", proFlicker: local.proFlicker ? "seeded" : "kept" });
   mem.loaded = false;
   await ensureLoaded();            // parses packaged data, registers generic, builds bypass
   await Pro.sync.refreshUserRules(); // client user allow/block DNR rules (ids 1/2 + session 21/22)
   await Pro.sync.refreshSystemAllow(); // client twin of the server whitelist (id 3) from the stored allowlist key
}

