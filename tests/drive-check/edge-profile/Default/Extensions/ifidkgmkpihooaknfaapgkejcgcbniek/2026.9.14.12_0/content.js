"use strict";
/*
 * content.js — document_start, all frames. TWO layers for zero-flicker:
 *
 *  LAYER 1 (fast, pre-paint) — earlyFlicker(): reads the flicker directive and
 *    specific cosmetics DIRECTLY from chrome.storage.local and injects a <style>
 *    at document_start. NO service-worker round-trip. This is what actually kills
 *    the flash: a chrome.storage.local read resolves in ~1-5ms (before first
 *    paint), whereas a sendMessage to the SW must first SPIN THE WORKER UP
 *    (importScripts + compile, 50-300ms when asleep) — slower than the network
 *    fetch of the page itself, so the results would paint before the hide landed.
 *    The grammar (Pro.flicker/Pro.cosmetics/Pro.domains/Pro.bypass) is loaded as
 *    packaged content scripts ahead of this file; it evaluates NO server code —
 *    the stored directive is allowlisted structured data, CSS is built locally.
 *
 *  LAYER 2 (SW) — GET_PLAN: still asks the worker for the full plan (specific
 *    cosmetics incl. regex keys for every frame, MAIN-world scriptlets, the
 *    engagement counter). No longer the pre-paint critical path — a slow SW wake
 *    can't flash now because Layer 1 already hid the ads. The SW ALSO re-injects
 *    the flicker CSS USER-origin via webNavigation.onCommitted (sw.js) as
 *    CSP-immune reinforcement the page can't strip.
 */
(function () {
   // Forwarded to the SW console (CS_LOG). warn() = failures -> console.log
   // there (visible at default levels, [WARN]-tagged); log() = traces ->
   // console.debug there (visible only with 'Verbose' ticked in the SW
   // console's level filter). Toggle everything off: self.__PRO_DEBUG = false.
   const DEBUG = self.__PRO_DEBUG !== false;
   const send = (level, a) => {
      try {
         chrome.runtime.sendMessage(
            { action: "CS_LOG", level, args: a.map((v) => (v instanceof Error ? String(v.message || v) : v)) },
            () => { void chrome.runtime.lastError; }
         );
      } catch (e) {}
   };
   const log = (...a) => { if (DEBUG) send("debug", a); };
   const warn = (...a) => { if (DEBUG) send("warn", a); };

   const href = location.href;
   if (!href || href.startsWith("about:") || href.startsWith("chrome")) return;

   const Pro = self.Pro || {};
   const host = (Pro.domains && Pro.domains.hostOf) ? Pro.domains.hostOf(href) : location.hostname;
   const isTop = (function () { try { return window.top === window; } catch (e) { return true; } })();

   // documentElement (<html>) exists at document_start even before <head>; a
   // <style> appended here is applied immediately. Tagged for DevTools
   // identification and so we can tell the two layers apart.
   function injectStyle(tag, css) {
      if (!css) return;
      try {
         const style = document.createElement("style");
         style.setAttribute("data-abp", tag);
         style.textContent = css;
         (document.documentElement || document.head).appendChild(style);
      } catch (e) { warn("injectStyle failed:", e && e.message); }
   }

   // ── LAYER 1: fast pre-paint CSS straight from storage (no SW) ─────────────
   // Top frame only — top-document masking and ad slots are the flash the
   // user sees; subframes rely on Layer 2, so this returns for subframes.
   (function earlyFlicker() {
      if (!isTop || !host) return;
      if (!Pro.flicker || !Pro.domains || !Pro.bypass || !Pro.cosmetics) {
         warn("engine grammar not present in content world — Layer 1 skipped (Layer 2 will still run)");
         return;
      }
      try {
         chrome.storage.local.get(
            ["proFlicker", "proCosmeticSpecific", "allowlist", "userallowlist", "pausedDomains", "proBreakageAllow"],
            (r) => {
               if (chrome.runtime.lastError) { warn("Layer 1 storage error:", chrome.runtime.lastError.message); return; }
               try {
                  let css = "";
                  // FLICKER is UNCONDITIONAL. The server only populates proFlicker
                  // for the hosts/markets it targets, and pick() only matches its
                  // explicit host patterns (google.*), so the server directive IS
                  // the gate — the client must not re-gate it behind the ad-block
                  // bypass (some of those hosts are also in `allowlist`, so gating
                  // it there would wrongly suppress the mask). The 4s self-heal
                  // still bounds it.
                  if (r.proFlicker) {
                     const f = Pro.flicker.buildCss(Pro.flicker.pick(r.proFlicker, host));
                     if (f) css += f;
                  }
                  // Specific AD-BLOCK cosmetics DO respect the full bypass (server
                  // allowlist ∪ breakage list ∪ user pause/allow).
                  const adblockOff = Pro.bypass.isBypassed(
                     Pro.bypass.build([r.allowlist, r.userallowlist, r.pausedDomains, r.proBreakageAllow]), host);
                  if (r.proCosmeticSpecific && !adblockOff) {
                     const sel = Pro.cosmetics.specificFor(Pro.cosmetics.compile(r.proCosmeticSpecific), host);
                     const sc = Pro.cosmetics.hideCss(sel);
                     if (sc) css += (css ? "\n" : "") + sc;
                  }
                  if (!css) { log("Layer 1: no pre-paint CSS for", host, "| adblockOff:", adblockOff); return; }
                  injectStyle("prepaint", css);
                  log("Layer 1: injected", css.length, "bytes at document_start for", host, "(no SW round-trip)");
               } catch (e) { warn("Layer 1 build error:", e && e.message); }
            }
         );
      } catch (e) { warn("Layer 1 dispatch error:", e && e.message); }
   })();

   // ── LAYER 2: full plan from the SW (all frames) ───────────────────────────
   // NOTE: no `details` here — that identifier only exists in sw.js's
   // webNavigation.onCommitted handler. In this file the URL is the string
   // `href` and its host is the outer `host` const (computed at the top),
   // both in scope inside this callback.
   chrome.runtime.sendMessage({ action: "GET_PLAN", url: href }, (plan) => {
      if (chrome.runtime.lastError) { warn("GET_PLAN error:", chrome.runtime.lastError.message); return; }
      if (!plan || !plan.css) { log("SW: no cosmetics for", host, "(bypassed or empty)"); return; }
      injectStyle("sw", plan.css);
      log("Layer 2: SW plan injected", plan.css.length, "bytes for", host);
   });
})();
