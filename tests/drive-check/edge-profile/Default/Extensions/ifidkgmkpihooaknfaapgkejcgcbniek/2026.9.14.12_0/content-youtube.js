"use strict";
/*
 * content-youtube.js — youtube.com / youtube-nocookie.com frames only (see
 * manifest). FAST-FORWARD fallback for video ads, gated on the proYtSkip flag
 * (absent = OFF).
 *
 * The filter layers stop most YouTube ads before they exist, but ads stitched
 * into the googlevideo.com stream server-side arrive on the same URLs as the
 * video itself — no URL filter can tell them apart. When the player enters ad
 * playback anyway, this script clicks the skip control if one is offered,
 * otherwise seeks the ad straight to its end. It never touches playbackRate
 * or volume, so there is no player state to restore afterwards.
 *
 * IMPORTANT: interact with the player through plain click() and a bare
 * currentTime seek ONLY. Dispatching synthetic pointer/mouse sequences at the
 * skip control trips YouTube's global drag/gesture tracking, which then
 * captures every event on the page and freezes the whole UI (observed live).
 *
 * The flag is read once at document_start AND watched via storage.onChanged,
 * so flipping it in the popup arms/disarms the script live — no tab reload,
 * which matters because the user is usually mid-video when they reach for it.
 */
(function () {
   // Forwarded to the SW console (CS_LOG), same convention as content.js:
   // warn() = failures, log() = traces (visible with 'Verbose' ticked there).
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

   const isTop = (function () { try { return window.top === window; } catch (e) { return true; } })();

   // Ad playback is signalled by the player root carrying "ad-showing". The
   // skip control's class name has churned across player builds — try newest
   // first, and only a control that is actually laid out counts (offsetParent
   // is null while the button exists in the DOM but is display:none).
   const PLAYER_SEL = "#movie_player";
   const SKIP_SELS = [
      ".ytp-skip-ad-button",
      ".ytp-ad-skip-button-modern",
      ".ytp-ad-skip-button",
      ".ytp-ad-skip-button-container button"
   ];

   const POLL_MS = 500;   // ad-state poll; also re-arms the observer after SPA navs
   const SWEEP_MS = 2500; // blocking-dialog sweep

   let pollTimer = null;
   let sweepTimer = null;
   let observer = null;
   let observedPlayer = null;
   let clickLogged = false;  // dedupe the once-per-ad click log, nothing more
   let hiddenWarned = false; // dedupe the once-per-ad hidden-skip tripwire

   // The player element does not exist yet at document_start and is replaced
   // on YouTube's soft navigations, so the observer is (re)attached from the
   // poll rather than once at init. The observer makes the reaction instant;
   // the poll alone would let up to POLL_MS of ad play first.
   function ensureObserver(player) {
      if (player === observedPlayer) return;
      if (observer) observer.disconnect();
      observer = new MutationObserver(fastForward);
      observer.observe(player, { attributes: true, attributeFilter: ["class"] });
      observedPlayer = player;
      log("player observer attached");
   }

   function fastForward() {
      try {
         const player = document.querySelector(PLAYER_SEL);
         if (!player) return;
         ensureObserver(player);
         if (!player.classList.contains("ad-showing")) { clickLogged = false; hiddenWarned = false; return; }

         let skipBtn = null, hiddenSkip = false;
         for (const sel of SKIP_SELS) {
            const btn = player.querySelector(sel);
            if (!btn) continue;
            if (btn.offsetParent !== null) { skipBtn = btn; break; }
            hiddenSkip = true;
         }
         if (skipBtn) {
            skipBtn.click();
            if (!clickLogged) {
               clickLogged = true;
               log("skip control clicked");
            }
            return;
         }
         // Tripwire for the CSS-hiding failure class: a skip control that
         // exists but is not laid out can never be clicked — some stylesheet
         // (generic/cosmetic filters) is hiding the player's ad UI.
         if (hiddenSkip && !hiddenWarned) {
            hiddenWarned = true;
            warn("skip control present but not laid out (CSS-hidden)");
         }

         // Unskippable ad — jump it to its end. duration is NaN before the
         // metadata arrives and Infinity on live streams; leave both alone.
         // The < guard only stops the poll from re-seeking a spot already
         // reached; in an ad pod the next ad swaps in with a fresh
         // currentTime, so it never blocks a follow-up jump.
         const video = player.querySelector("video");
         if (video && isFinite(video.duration) && video.duration > 0 &&
             video.currentTime < video.duration) {
            const jumped = Math.round(video.duration - video.currentTime);
            video.currentTime = video.duration;
            log("unskippable ad fast-forwarded to its end — jumped " + jumped + "s");
         }
      } catch (e) { warn("fastForward failed:", e && e.message); }
   }

   // With ads playing, YouTube may still raise a blocking survey/enforcement
   // dialog over the player; hide it so playback continues without a click.
   // Suppression only — hidden, never programmatically dismissed.
   function sweepDialogs() {
      try {
         for (const dialog of document.querySelectorAll("tp-yt-paper-dialog")) {
            if (dialog.querySelector("#dismiss-button") && dialog.style.display !== "none") {
               dialog.style.display = "none";
               log("blocking dialog hidden");
            }
         }
      } catch (e) {}
   }

   function arm() {
      if (pollTimer) return;
      pollTimer = setInterval(fastForward, POLL_MS);
      sweepTimer = setInterval(sweepDialogs, SWEEP_MS);
      fastForward();
      log("YouTube fast-forward armed in", isTop ? "top frame" : "subframe");
      if (isTop) {
         // Self-diagnostic: confirm the mode's DNR half is live (it is not if
         // the extension was updated without a reload indexing the ruleset).
         try {
            chrome.runtime.sendMessage({ action: "YT_STATUS" }, (r) => {
               if (chrome.runtime.lastError) return;
               log("network ad-blocking ruleset: " + (r && r.ruleset ? "ACTIVE" : "NOT ACTIVE — extension needs a reload"));
            });
         } catch (e) {}
      }
   }

   function disarm() {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      clearInterval(sweepTimer);
      pollTimer = sweepTimer = null;
      if (observer) observer.disconnect();
      observer = null;
      observedPlayer = null;
      clickLogged = false;
      hiddenWarned = false;
      log("YouTube fast-forward disarmed");
   }

   try {
      chrome.storage.local.get("proYtSkip", (r) => {
         if (chrome.runtime.lastError) { warn("flag read error:", chrome.runtime.lastError.message); return; }
         if (r && r.proYtSkip === true) arm();
      });
      chrome.storage.onChanged.addListener((changes, area) => {
         if (area !== "local" || !("proYtSkip" in changes)) return;
         if (changes.proYtSkip.newValue === true) arm(); else disarm();
      });
   } catch (e) { warn("init failed:", e && e.message); }
})();
