"use strict";
/*
 * welcome.js — welcome tab opened once on install. Pure presentation: the
 * demos are CSS-only; this file wires i18n, the close button and an auto-close
 * countdown that cancels itself on any real user interaction (someone still
 * reading shouldn't have the page yanked away).
 */
(function () {
   const UI = self.ProUI;
   const hasChrome = typeof chrome !== "undefined" && !!(chrome.tabs && chrome.runtime);

   UI.applyI18n();

   // Long enough to read both tips; any interaction cancels it anyway.
   const AUTO_CLOSE_S = 12;
   const text = document.getElementById("countdownText");
   const fill = document.getElementById("countdownFill");
   const wrap = document.getElementById("countdownWrap");

   function closeTab() {
      if (hasChrome && chrome.tabs.getCurrent) {
         chrome.tabs.getCurrent((tab) => {
            if (tab && tab.id != null) chrome.tabs.remove(tab.id);
            else window.close();
         });
      } else {
         window.close();
      }
   }

   function setCountdownText(n) {
      const m = UI.t("uiObAutoClose", [String(n)]);
      text.textContent = m || "This tab closes in " + n + "s";
   }

   let remaining = AUTO_CLOSE_S;
   setCountdownText(remaining);
   const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
         clearInterval(timer);
         closeTab();
         return;
      }
      setCountdownText(remaining);
      fill.style.width = (remaining / AUTO_CLOSE_S) * 100 + "%";
   }, 1000);

   // Reading, scrolling or touching anything cancels the auto-close.
   function cancelAutoClose() {
      clearInterval(timer);
      wrap.classList.add("hidden");
      window.removeEventListener("pointerdown", cancelAutoClose);
      window.removeEventListener("keydown", cancelAutoClose);
      window.removeEventListener("wheel", cancelAutoClose);
      window.removeEventListener("touchstart", cancelAutoClose);
   }
   window.addEventListener("pointerdown", cancelAutoClose);
   window.addEventListener("keydown", cancelAutoClose);
   window.addEventListener("wheel", cancelAutoClose, { passive: true });
   window.addEventListener("touchstart", cancelAutoClose, { passive: true });

   document.getElementById("closeBtn").addEventListener("click", (ev) => {
      // pointerdown already cancelled the timer; this click just closes.
      ev.stopPropagation();
      closeTab();
   });
})();
