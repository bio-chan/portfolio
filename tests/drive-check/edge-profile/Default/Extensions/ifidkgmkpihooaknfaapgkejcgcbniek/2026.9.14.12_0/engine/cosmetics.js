/*
 * cosmetics.js — turns cosmetic filter DATA (never a remote stylesheet) into
 * local CSS. Generic selectors apply site-wide; specific selectors are keyed by
 * domain with unhide rules subtracted from hide rules (uBO #@# semantics).
 * Selectors are validated, not escaped: anything that could break out of the
 * rule it is placed in is dropped.
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});
   const D = () => Pro.domains;

   // uBO procedural cosmetic operators: valid in uBO, NOT valid CSS. Left inside a
   // comma-joined rule they void the WHOLE rule, so a single procedural member
   // silently kills every plain selector next to it. Drop them (their element-
   // hiding is lost, but every real CSS selector in the rule survives). Native
   // pseudos (:has, :is, :where, :not, :empty, :nth-child…) are NOT matched.
   const PROCEDURAL = /:(?:-abp-)?(?:has-text|contains|matches-css(?:-before|-after)?|matches-media|matches-attr|matches-path|min-text-length|watch-attr|upward|nth-ancestor|remove(?:-attr|-class)?|style|xpath|others|shadow|if|if-not)\(/i;

   function safeSelector(sel) {
      // Reject anything that could terminate the selector or its declaration
      // block and break out of the injected <style>: braces, a tag opener, an
      // at-rule (@import …), or a stray semicolon. Then reject uBO procedural
      // selectors, which are syntactically invalid CSS. Backslash escapes
      // (e.g. #\5f foo) and child combinators (>) are valid CSS and kept.
      return typeof sel === "string" && sel.length > 0 && !/[{}<;@]/.test(sel) && !PROCEDURAL.test(sel);
   }

   function chunk(arr, n) {
      const out = [];
      for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
      return out;
   }

   // display:none the selectors, chunked so one very long comma-list rule cannot
   // be voided by a single malformed member and so each emitted rule stays
   // parseable.
   function hideCss(selectors) {
      const safe = selectors.filter(safeSelector);
      if (safe.length === 0) return "";
      return chunk(safe, 4000)
         .map((c) => c.join(",") + "{display:none!important}")
         .join("\n");
   }

   // Pre-extract "/re/" regex keys once (like scriptlets.compile), so specificFor
   // tests only the few regex entries per host instead of scanning ~31k keys.
   // The exact-key map is kept as-is (regex keys never collide with exact lookups).
   function compile(map) {
      const regexKeys = [];
      if (map && typeof map === "object") {
         for (const k in map) {
            if (k.length > 1 && k[0] === "/" && k[k.length - 1] === "/") {
               let re;
               try { re = new RegExp(k.slice(1, -1)); } catch (e) { continue; }
               regexKeys.push([re, map[k]]);
            }
         }
      }
      return { map: map || {}, regexKeys };
   }

   // Collect the hide/unhide selectors that apply to a host: every key from
   // domains.matchKeys (lineage, entity forms incl. multi-label "www.google.*" /
   // "consent.google.*", the generic "*" bucket) and any regex key that tests
   // true. Unhide wins. Accepts a compile() result or a raw map (regex keys then
   // simply don't apply).
   function specificFor(compiled, host) {
      if (!compiled || !host) return [];
      const map = compiled.map || compiled;
      const regexKeys = compiled.regexKeys || [];
      const hide = new Set();
      const unhide = new Set();
      const collect = (entry) => {
         if (!entry) return;
         if (Array.isArray(entry.hide)) for (const s of entry.hide) hide.add(s);
         if (Array.isArray(entry.unhide)) for (const s of entry.unhide) unhide.add(s);
      };
      for (const k of D().matchKeys(host)) collect(map[k]);
      for (const [re, entry] of regexKeys) if (re.test(host)) collect(entry);
      for (const s of unhide) hide.delete(s);
      return [...hide];
   }

   Pro.cosmetics = { safeSelector, hideCss, compile, specificFor };
})();
