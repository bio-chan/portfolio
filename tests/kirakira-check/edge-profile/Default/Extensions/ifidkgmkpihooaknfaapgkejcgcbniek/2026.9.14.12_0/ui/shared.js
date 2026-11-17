"use strict";
/*
 * shared.js — helpers shared by the popup / settings / welcome pages.
 * Loads AFTER the engine IIFEs (log.js, domains.js, bypass.js, storage.js),
 * which are page-safe classic scripts attaching to self.Pro. All list writes
 * go through Pro.storage.setLocal so the chrome.storage.sync recovery mirror
 * stays consistent, and lists are always written as arrays ([] to clear —
 * removing a key would let heal() resurrect the old value from the mirror).
 */
(function () {
   const UI = (self.ProUI = self.ProUI || {});
   const Pro = self.Pro;
   const hasChrome = typeof chrome !== "undefined" && !!chrome.runtime;

   // The three user-owned site lists plus the user-owned feature flags. The
   // bare "allowlist" key is the SERVER-owned community whitelist — never
   // surface or edit it here.
   UI.KEYS = {
      allow: "userallowlist",
      block: "userblocklist",
      paused: "pausedDomains",
      ytSkip: "proYtSkip" // boolean flag, not a site list
   };

   // ---- i18n ------------------------------------------------------------
   // Pages ship English text in the markup; applyI18n overwrites it when the
   // locale provides the key (Chrome falls back to default_locale "en", so in
   // practice a key is only missing during file:// design previews).
   function t(key, subs) {
      if (!hasChrome || !chrome.i18n) return "";
      return chrome.i18n.getMessage(key, subs) || "";
   }

   function applyI18n(root) {
      const scope = root || document;
      if (!root && hasChrome && chrome.i18n) {
         // Correct pronunciation/hyphenation for the 8 non-English locales.
         try { document.documentElement.lang = chrome.i18n.getMessage("@@ui_locale").replace("_", "-"); } catch (e) {}
      }
      for (const el of scope.querySelectorAll("[data-i18n]")) {
         const m = t(el.getAttribute("data-i18n"));
         if (m) el.textContent = m; // textContent only — locale strings are data, not markup
      }
      for (const el of scope.querySelectorAll("[data-i18n-placeholder]")) {
         const m = t(el.getAttribute("data-i18n-placeholder"));
         if (m) el.setAttribute("placeholder", m);
      }
      for (const el of scope.querySelectorAll("[data-i18n-title]")) {
         const m = t(el.getAttribute("data-i18n-title"));
         if (m) el.setAttribute("title", m);
      }
      for (const el of scope.querySelectorAll("[data-i18n-aria]")) {
         const m = t(el.getAttribute("data-i18n-aria"));
         if (m) el.setAttribute("aria-label", m);
      }
   }

   // ---- domain input parsing -------------------------------------------
   // Turn arbitrary user input (domain, URL, URL fragment, IDN) into one
   // normalized bare hostname, or null if it can't be a real site. URL()
   // punycodes IDNs; the final regex mirrors firewall.sanitizeDomains so
   // nothing we store is later dropped by the DNR layer.
   const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
   function parseDomain(raw) {
      let s = String(raw || "").trim();
      if (!s) return null;
      try {
         s = new URL(s.includes("://") ? s : "http://" + s).hostname;
      } catch (e) {
         return null;
      }
      s = s.replace(/\.$/, ""); // trailing-dot FQDN form
      s = Pro.bypass.norm(s);
      if (!s || s.length > 253 || !HOST_RE.test(s)) return null;
      // A bare public suffix (co.uk, com.au…) would DNR-match the entire TLD
      // while lineage()/covers() never report it — reject instead of storing a
      // rule the UI can neither explain nor undo per-site.
      if (Pro.domains.MULTI_SUFFIX && Pro.domains.MULTI_SUFFIX.has(s)) return null;
      return s;
   }

   // ---- list helpers ----------------------------------------------------
   const asList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

   // Does `list` cover `host`? Same lineage semantics as the engine's bypass
   // (a pause on example.com covers sub.example.com).
   function covers(list, host) {
      return Pro.bypass.isBypassed(Pro.bypass.build([list]), host);
   }

   // Entries of `list` that cover `host` — what must be removed so the host
   // stops matching (e.g. un-pausing sub.example.com removes an "example.com"
   // entry that was doing the pausing).
   function coveringEntries(list, host) {
      const lin = new Set(Pro.domains.lineage(host));
      return asList(list).filter((e) => lin.has(Pro.bypass.norm(e)));
   }

   async function readState() {
      const keys = [UI.KEYS.allow, UI.KEYS.block, UI.KEYS.paused, UI.KEYS.ytSkip, "adsBlocked"];
      let res = await Pro.storage.getLocal(keys);
      res = await Pro.storage.heal(res, keys);
      return {
         allow: asList(res[UI.KEYS.allow]),
         block: asList(res[UI.KEYS.block]),
         paused: asList(res[UI.KEYS.paused]),
         ytSkip: res[UI.KEYS.ytSkip] === true,
         adsBlocked: parseInt(res.adsBlocked, 10) || 0
      };
   }

   // Write one list. ALWAYS an array value ([] clears), via setLocal so the
   // sync mirror follows. Dedupes + normalizes on the way out.
   async function writeList(storageKey, entries) {
      const clean = [...new Set(asList(entries).map((e) => Pro.bypass.norm(e)).filter(Boolean))];
      await Pro.storage.setLocal({ [storageKey]: clean });
      return clean;
   }

   // Write one boolean feature flag. Always an explicit true/false (never key
   // removal — heal() would resurrect the old value from the sync mirror).
   async function writeFlag(storageKey, value) {
      await Pro.storage.setLocal({ [storageKey]: value === true });
   }

   // ---- misc ------------------------------------------------------------
   function animateCount(el, to, ms) {
      // Token cancels a still-running animation when a fresher value arrives
      // (or when a later plain textContent write must win).
      const token = (el._proCountToken = (el._proCountToken || 0) + 1);
      if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
         el.textContent = to.toLocaleString();
         return;
      }
      const dur = ms || 500;
      const start = performance.now();
      function frame(now) {
         if (el._proCountToken !== token) return;
         const p = Math.min(1, (now - start) / dur);
         const eased = 1 - Math.pow(1 - p, 3);
         el.textContent = Math.round(to * eased).toLocaleString();
         if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
   }

   function openOptions(hash) {
      if (!hasChrome || !chrome.runtime.openOptionsPage) return;
      // openOptionsPage can't carry a hash; stash the target tab for settings.js.
      if (hash) {
         try { chrome.storage.session.set({ proUiSettingsTab: hash }); } catch (e) {}
      }
      chrome.runtime.openOptionsPage();
   }

   UI.t = t;
   UI.applyI18n = applyI18n;
   UI.parseDomain = parseDomain;
   UI.asList = asList;
   UI.covers = covers;
   UI.coveringEntries = coveringEntries;
   UI.readState = readState;
   UI.writeList = writeList;
   UI.writeFlag = writeFlag;
   UI.animateCount = animateCount;
   UI.setCount = function (el, n) {
      el._proCountToken = (el._proCountToken || 0) + 1; // cancel any running animation
      el.textContent = n.toLocaleString();
   };
   UI.openOptions = openOptions;
})();
