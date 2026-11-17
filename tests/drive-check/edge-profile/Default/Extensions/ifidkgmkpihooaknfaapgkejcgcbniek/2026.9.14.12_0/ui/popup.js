"use strict";
/*
 * popup.js — toolbar popup. The pause toggle is pure storage: writing
 * pausedDomains (via Pro.storage.setLocal) wakes the service worker, whose
 * storage.onChanged listener applies session DNR rules in ~10ms — no
 * messaging. The tab is reloaded right after so cosmetics re-evaluate.
 *
 * The YouTube fast-forward flag (proYtSkip, global — its card shows on every
 * tab) is the same pure-storage shape. The active tab is reloaded on toggle
 * only when it IS a YouTube tab (its MAIN-world scriptlet hooks survive soft
 * navs and must go); other open YouTube tabs arm/disarm live via
 * storage.onChanged in content-youtube.js.
 *
 * State precedence: restricted > blocked > allowed > paused > active.
 * "Allowed"/"Blocked" (userallowlist/userblocklist) are managed in settings
 * and shown read-only here — the pause toggle never silently edits them, and
 * in particular pausing a user-blocked site is refused by construction (the
 * toggle is hidden), because a pause entry joins the DNR allow band, which
 * outranks the user block rule.
 */
(function () {
   const UI = self.ProUI;
   const Pro = self.Pro;
   const hasTabs = typeof chrome !== "undefined" && !!(chrome.tabs && chrome.runtime);

   const els = {
      site: document.getElementById("siteName"),
      title: document.getElementById("statusTitle"),
      hint: document.getElementById("statusHint"),
      toggle: document.getElementById("pauseToggle"),
      toggleLabel: document.getElementById("toggleLabel"),
      ytCard: document.getElementById("ytCard"),
      ytToggle: document.getElementById("ytToggle"),
      manage: document.getElementById("manageAllowedBtn"),
      stat: document.getElementById("statValue"),
      gear: document.getElementById("gearBtn"),
      settings: document.getElementById("settingsBtn")
   };

   // English fallbacks keep file:// design previews and missing keys readable;
   // chrome.i18n falls back to default_locale "en" in real installs.
   const STR = {
      active: { title: ["uiPopupStatusActive", "Protection active"], hint: ["uiPopupHintActive", "Ads and trackers are being blocked on this site."] },
      paused: { title: ["uiPopupStatusPaused", "Paused on this site"], hint: ["uiPopupHintPaused", "Blocking is paused here, so ads may appear. Flip the switch to resume."] },
      allowed: { title: ["uiPopupStatusAllowed", "Always allowed"], hint: ["uiPopupHintAllowed", "This site is on your allowed list, so Ad Blocker Pro stands down here."] },
      blocked: { title: ["uiPopupStatusBlocked", "Blocked by you"], hint: ["uiPopupHintBlocked", "You've blocked this site entirely — it won't load at all. Manage it in settings."] },
      restricted: { title: ["uiPopupStatusRestricted", "Nothing to block here"], hint: ["uiPopupHintRestricted", "Browser pages and the Web Store can't be filtered."] },
      on: ["uiPopupToggleOn", "Blocking on"],
      off: ["uiPopupToggleOff", "Blocking off"],
      manageAllowed: ["uiPopupManageAllowed", "Manage allowed sites"],
      manageBlocked: ["uiPopupManageBlocked", "Manage blocked sites"],
      browserPage: ["uiPopupBrowserPage", "Browser page"]
   };
   const msg = (pair) => UI.t(pair[0]) || pair[1];

   let tab = null;
   let host = null;
   let toggleable = false;
   let onYt = false;
   let mutating = false;
   let firstStatRender = true;
   let state = "active";

   function setState(s) {
      state = s;
      document.body.className = "state-" + s;
      els.title.textContent = msg(STR[s].title);
      els.hint.textContent = msg(STR[s].hint);
      const on = s === "active";
      els.toggle.checked = on;
      els.toggle.setAttribute("aria-checked", on ? "true" : "false");
      els.toggle.disabled = !toggleable || mutating;
      els.toggleLabel.textContent = msg(on ? STR.on : STR.off);
      const managed = s === "allowed" || s === "blocked";
      els.manage.classList.toggle("hidden", !managed);
      if (managed) els.manage.textContent = msg(s === "allowed" ? STR.manageAllowed : STR.manageBlocked);
   }

   function renderStat(n) {
      if (firstStatRender) {
         firstStatRender = false;
         UI.animateCount(els.stat, n);
      } else {
         UI.setCount(els.stat, n);
      }
   }

   async function refresh() {
      const st = await UI.readState();
      renderStat(st.adsBlocked);
      if (!toggleable) setState("restricted");
      else if (UI.covers(st.block, host)) setState("blocked");
      else if (UI.covers(st.allow, host)) setState("allowed");
      else if (UI.covers(st.paused, host)) setState("paused");
      else setState("active");
      els.ytToggle.checked = st.ytSkip;
      els.ytToggle.setAttribute("aria-checked", st.ytSkip ? "true" : "false");
   }

   async function onToggle() {
      // Capture the user's intent synchronously — the live checkbox can be
      // flipped again while we're awaiting.
      const wantOn = els.toggle.checked;
      if (!toggleable || mutating || state === "blocked" || state === "allowed") return;
      mutating = true;
      // Freeze BOTH switches — a click on the other one during the write
      // window would be swallowed by the mutating guard while its checkbox
      // stayed visually flipped.
      els.toggle.disabled = true;
      els.ytToggle.disabled = true;
      try {
         const st = await UI.readState();
         let next;
         if (wantOn) {
            // Resume: remove every entry whose scope covers this host, so the
            // toggle can undo a pause placed on a parent domain too.
            const rm = new Set(UI.coveringEntries(st.paused, host));
            next = st.paused.filter((e) => !rm.has(e));
         } else {
            next = st.paused.concat(host);
         }
         await UI.writeList(UI.KEYS.paused, next);
         setState(wantOn ? "active" : "paused");
         // Session DNR rules land ~10ms after the write; reload immediately so
         // cosmetics/scriptlets re-evaluate (a delayed timer would die with the
         // popup document if the user clicks away).
         const id = tab && tab.id;
         if (id != null) { try { chrome.tabs.reload(id); } catch (e) {} }
      } finally {
         // Let the echo of our own storage write pass, then reconcile with
         // whatever storage actually holds.
         setTimeout(() => {
            mutating = false;
            els.toggle.disabled = !toggleable;
            els.ytToggle.disabled = false;
            refresh();
         }, 400);
      }
   }

   async function onYtToggle() {
      // Capture intent synchronously, same as onToggle.
      const wantOn = els.ytToggle.checked;
      if (mutating) return;
      mutating = true;
      // Freeze BOTH switches — see onToggle.
      els.ytToggle.disabled = true;
      els.toggle.disabled = true;
      els.ytToggle.setAttribute("aria-checked", wantOn ? "true" : "false");
      try {
         await UI.writeFlag(UI.KEYS.ytSkip, wantOn);
         // Reload the current YouTube tab: the MAIN-world scriptlet hooks
         // already injected in it survive soft navigations, so only a reload
         // gives the mode the clean player it needs (other tabs arm/disarm
         // live via storage.onChanged in content-youtube.js).
         const id = tab && tab.id;
         if (onYt && id != null) { try { chrome.tabs.reload(id); } catch (e) {} }
      } finally {
         setTimeout(() => {
            mutating = false;
            els.ytToggle.disabled = false;
            els.toggle.disabled = !toggleable;
            refresh();
         }, 400);
      }
   }

   async function init() {
      UI.applyI18n();
      els.gear.addEventListener("click", () => UI.openOptions());
      els.settings.addEventListener("click", () => UI.openOptions());
      els.manage.addEventListener("click", () => UI.openOptions(state === "blocked" ? "blocked" : "allowed"));
      els.toggle.addEventListener("change", onToggle);
      els.ytToggle.addEventListener("change", onYtToggle);

      if (!hasTabs) {
         // file:// design preview
         els.site.textContent = "example.com";
         toggleable = true;
         renderStat(12847);
         setState("active");
         return;
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs && tabs[0];
      // Prefer the committed URL, but an uncommitted tab reports about:blank
      // with the real target still in pendingUrl.
      let url = (tab && tab.url) || "";
      if ((!url || url === "about:blank") && tab && tab.pendingUrl) url = tab.pendingUrl;
      host = Pro.domains.hostOf(url);
      const isHttp = /^https?:\/\//i.test(url);
      const isStore = host === "chromewebstore.google.com" || host === "microsoftedge.microsoft.com";
      toggleable = !!host && isHttp && !isStore;
      // Same lineage semantics as the site lists, so m./music. etc. count.
      onYt = toggleable && UI.covers(["youtube.com"], host);
      // chrome:// URLs parse to a bare path-y "host" (settings, extensions…) —
      // only show a hostname when it is actually a website's.
      els.site.textContent = (isHttp && host) ? host : msg(STR.browserPage);

      await refresh();

      chrome.storage.onChanged.addListener((changes, area) => {
         if (area !== "local" || mutating) return;
         if (UI.KEYS.allow in changes || UI.KEYS.block in changes || UI.KEYS.paused in changes || UI.KEYS.ytSkip in changes || "adsBlocked" in changes) refresh();
      });
   }

   init().catch((e) => {
      // Never leave a dead popup: fall back to the read-only restricted view.
      try {
         console.log("[ABP][popup][WARN] init failed:", e);
         toggleable = false;
         setState("restricted");
      } catch (_) {}
   });
})();
