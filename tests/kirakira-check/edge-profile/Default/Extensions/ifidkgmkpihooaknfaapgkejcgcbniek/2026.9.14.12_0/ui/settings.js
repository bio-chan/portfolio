"use strict";
/*
 * settings.js — settings page. Pure storage-driven like the popup: list writes
 * go through Pro.storage.setLocal (sync mirror + SW reaction via
 * storage.onChanged). Tabs are pure CSS (hidden radios); JS only syncs the
 * URL hash and the popup's deep-link handoff (storage.session proUiSettingsTab).
 *
 * Mutual exclusion: the user allow band outranks the user block rule in DNR,
 * so a domain that is both blocked and allowed/paused would silently not be
 * blocked. add() refuses conflicting adds IN BOTH DIRECTIONS — when the other
 * list already covers the new domain, and when the new domain would cover
 * more-specific entries of the other list — and names the conflict instead of
 * silently editing anything.
 */
(function () {
   const UI = self.ProUI;
   const Pro = self.Pro;
   const hasStorage = typeof chrome !== "undefined" && !!(chrome.storage && chrome.storage.local);

   const msg = (key, fallback) => UI.t(key) || fallback;

   // Kind names double as the *-suffix of the element ids in settings.html
   // (form-allowed, list-blocked, …); stateKeyOf maps them onto readState().
   const KINDS = {
      allowed: { storageKey: UI.KEYS.allow },
      blocked: { storageKey: UI.KEYS.block },
      paused: { storageKey: UI.KEYS.paused }
   };
   const stateKeyOf = { allowed: "allow", blocked: "block", paused: "paused" };
   for (const kind of Object.keys(KINDS)) {
      const k = KINDS[kind];
      k.form = document.getElementById("form-" + kind);
      k.input = document.getElementById("input-" + kind);
      k.error = document.getElementById("error-" + kind);
      k.list = document.getElementById("list-" + kind);
      k.empty = document.getElementById("empty-" + kind);
      for (const part of ["form", "input", "error", "list", "empty"]) {
         if (!k[part]) console.log(`[ABP][settings][WARN] missing element #${part}-${kind} — check settings.html ids`);
      }
   }

   let state = { allow: [], block: [], paused: [], ytSkip: false, adsBlocked: 0 };
   let mutating = false;
   let statAnimated = false;

   // Demo state so a file:// design preview renders something real-looking.
   const demo = { allow: ["news.example.com", "bank.example"], block: ["annoying-ads.example"], paused: ["shop.example.com"], ytSkip: false, adsBlocked: 12847 };

   async function load() {
      state = hasStorage ? await UI.readState() : demo;
   }

   function showError(kind, text) {
      const k = KINDS[kind];
      k.error.textContent = text;
      k.error.classList.remove("hidden");
      k.input.setAttribute("aria-invalid", "true");
   }
   function clearError(kind) {
      const k = KINDS[kind];
      k.error.classList.add("hidden");
      k.input.removeAttribute("aria-invalid");
   }

   function render(kind) {
      const k = KINDS[kind];
      const entries = state[stateKeyOf[kind]];
      k.list.textContent = "";
      for (const entry of entries) {
         const li = document.createElement("li");
         li.className = "domain-row";
         const dot = document.createElement("span");
         dot.className = "row-dot";
         dot.setAttribute("aria-hidden", "true");
         const name = document.createElement("span");
         name.className = "row-domain";
         name.textContent = entry; // textContent only — entries are data
         const rm = document.createElement("button");
         rm.className = "row-remove";
         rm.title = msg("uiRemove", "Remove");
         rm.setAttribute("aria-label", msg("uiRemove", "Remove") + " " + entry);
         rm.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
         rm.addEventListener("click", () => remove(kind, entry));
         li.append(dot, name, rm);
         k.list.appendChild(li);
      }
      k.empty.classList.toggle("hidden", entries.length > 0);
   }
   function renderAll() {
      render("allowed");
      render("blocked");
      render("paused");
      ytSkipToggle.checked = state.ytSkip;
      ytSkipToggle.setAttribute("aria-checked", state.ytSkip ? "true" : "false");
      const el = document.getElementById("aboutStatValue");
      if (!statAnimated) {
         statAnimated = true;
         UI.animateCount(el, state.adsBlocked);
      } else {
         UI.setCount(el, state.adsBlocked);
      }
   }

   // Clear the mutating flag once our own storage echo has passed, then
   // reconcile against real storage (another window may have written during
   // the blackout — never leave this page's state stale, it would clobber
   // foreign entries on the next write).
   function endMutation() {
      setTimeout(async () => {
         mutating = false;
         if (hasStorage) {
            await load();
            renderAll();
         }
      }, 400);
   }

   async function write(kind, entries) {
      state[stateKeyOf[kind]] = entries;
      render(kind);
      if (!hasStorage) return;
      mutating = true;
      try {
         state[stateKeyOf[kind]] = await UI.writeList(KINDS[kind].storageKey, entries);
         render(kind);
      } finally {
         endMutation();
      }
   }

   function add(kind) {
      const k = KINDS[kind];
      const domain = UI.parseDomain(k.input.value);
      if (!domain) {
         showError(kind, msg("uiErrInvalid", "That doesn't look like a website address."));
         return;
      }
      const mine = state[stateKeyOf[kind]];
      if (UI.covers(mine, domain)) {
         showError(kind, msg("uiErrDup", "This site is already covered by the list."));
         return;
      }
      // Refuse silent conflicts across lists, both directions (allow/pause
      // outrank block in DNR, and domain rules match subdomains).
      const opposing = kind === "blocked" ? [
         { list: state.allow, err: ["uiErrConflictAllowed", "This site is on your Allowed list — remove it there first."] },
         { list: state.paused, err: ["uiErrConflictPaused", "This site is currently paused — remove it from Paused sites first."] }
      ] : [
         { list: state.block, err: ["uiErrConflictBlocked", "This site is on your Blocked list — remove it there first."] }
      ];
      for (const o of opposing) {
         // The other list covers the new domain (entry at or above it)…
         if (UI.covers(o.list, domain)) {
            showError(kind, msg(o.err[0], o.err[1]));
            return;
         }
         // …or the new domain would cover more-specific entries of the other
         // list (its rule matches their subdomains and silently wins/loses).
         if (o.list.some((e) => UI.covers([domain], e))) {
            showError(kind, msg("uiErrChildConflict", "This would override more specific sites on another list — remove those entries first."));
            return;
         }
      }
      clearError(kind);
      k.input.value = "";
      write(kind, mine.concat(domain));
   }

   function remove(kind, entry) {
      clearError(kind);
      write(kind, state[stateKeyOf[kind]].filter((e) => e !== entry));
   }

   // ---- reset ----
   const resetIdle = document.getElementById("resetIdle");
   const resetConfirm = document.getElementById("resetConfirm");
   document.getElementById("resetBtn").addEventListener("click", () => {
      resetIdle.classList.add("hidden");
      resetConfirm.classList.remove("hidden");
   });
   document.getElementById("resetNoBtn").addEventListener("click", () => {
      resetConfirm.classList.add("hidden");
      resetIdle.classList.remove("hidden");
   });
   document.getElementById("resetYesBtn").addEventListener("click", async () => {
      resetConfirm.classList.add("hidden");
      resetIdle.classList.remove("hidden");
      if (hasStorage) {
         mutating = true;
         try {
            // Storage write FIRST — a render hiccup must never abort the reset.
            // [] (never key removal) so heal() can't resurrect the old lists.
            await Pro.storage.setLocal({
               [UI.KEYS.allow]: [], [UI.KEYS.block]: [], [UI.KEYS.paused]: []
            });
         } finally {
            endMutation();
         }
      }
      state.allow = []; state.block = []; state.paused = [];
      renderAll();
   });

   // ---- feature flags ----
   // Same pure-storage shape as the lists. content-youtube.js reacts to the
   // write via storage.onChanged, so no open tab needs reloading. The flag is
   // deliberately NOT part of the Restore-defaults flow — that copy promises
   // to clear the three site lists, nothing else.
   const ytSkipToggle = document.getElementById("ytSkipToggle");
   ytSkipToggle.addEventListener("change", async () => {
      const wantOn = ytSkipToggle.checked;
      state.ytSkip = wantOn;
      ytSkipToggle.setAttribute("aria-checked", wantOn ? "true" : "false");
      if (!hasStorage) return;
      mutating = true;
      try {
         await UI.writeFlag(UI.KEYS.ytSkip, wantOn);
      } finally {
         endMutation();
      }
   });

   // ---- tabs: hash + popup deep-link ----
   const TAB_IDS = ["allowed", "blocked", "paused", "features", "about"];
   function selectTab(name) {
      if (!TAB_IDS.includes(name)) return;
      const radio = document.getElementById("tab-" + name);
      if (radio && !radio.checked) {
         radio.checked = true;
         try { history.replaceState(null, "", "#" + name); } catch (e) {}
      }
   }
   for (const name of TAB_IDS) {
      document.getElementById("tab-" + name).addEventListener("change", () => {
         try { history.replaceState(null, "", "#" + name); } catch (e) {}
      });
   }
   window.addEventListener("hashchange", () => selectTab((location.hash || "").replace("#", "")));

   function consumeDeepLink(value) {
      selectTab(value);
      try { chrome.storage.session.remove("proUiSettingsTab"); } catch (e) {}
   }

   async function init() {
      UI.applyI18n();

      let version = "";
      try { version = chrome.runtime.getManifest().version; } catch (e) {}
      if (version) {
         document.getElementById("versionPill").textContent = "v" + version;
         document.getElementById("versionPillAbout").textContent = "v" + version;
      }

      // Deep link: popup handoff first, then the URL hash.
      let target = (location.hash || "").replace("#", "");
      if (hasStorage && chrome.storage.session) {
         try {
            const s = await chrome.storage.session.get("proUiSettingsTab");
            if (s && s.proUiSettingsTab) {
               target = s.proUiSettingsTab;
               chrome.storage.session.remove("proUiSettingsTab");
            }
         } catch (e) {}
      }
      selectTab(target);

      await load();
      renderAll();

      for (const kind of Object.keys(KINDS)) {
         KINDS[kind].form.addEventListener("submit", (ev) => {
            ev.preventDefault();
            add(kind);
         });
         KINDS[kind].input.addEventListener("input", () => clearError(kind));
      }

      if (hasStorage) {
         chrome.storage.onChanged.addListener(async (changes, area) => {
            // The popup's deep-link handoff also fires while this page is
            // already open (openOptionsPage only focuses an existing tab).
            if (area === "session" && changes.proUiSettingsTab && changes.proUiSettingsTab.newValue) {
               consumeDeepLink(changes.proUiSettingsTab.newValue);
               return;
            }
            if (area !== "local" || mutating) return;
            const watched = [UI.KEYS.allow, UI.KEYS.block, UI.KEYS.paused, UI.KEYS.ytSkip, "adsBlocked"];
            if (watched.some((w) => w in changes)) {
               await load();
               renderAll();
            }
         });
      }
   }

   init().catch((e) => {
      console.log("[ABP][settings][WARN] init failed:", e);
   });
})();
