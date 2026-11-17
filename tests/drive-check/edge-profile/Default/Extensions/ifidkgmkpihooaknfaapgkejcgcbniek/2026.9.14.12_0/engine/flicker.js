/*
 * flicker.js — zero-flicker from a STRUCTURED directive, not a server CSS blob.
 *
 *   { hostPatterns: [ { match: "<host>|<entity>.*|*",
 *                       hide:  ["<selector>", ...],   // -> display:none!important (PERMANENT)
 *                       cloak: ["<selector>", ...],   // -> conceal pre-paint, reveal after fade.delay
 *                       fade:  { delay: <ms>, duration: <ms>,
 *                                base:      { <prop>: "<value>", ... },   // optional
 *                                timing:    "<timing-function>",          // optional
 *                                keyframes: { "0%"|"50%"|from|to: { <prop>: "<value>" } } } } ] }
 *
 * Two DISTINCT jobs (a permanent hide list + an animated conceal/reveal):
 *  - `hide`  → display:none!important, permanent, no animation. Targeted ad
 *              selectors that are meant to stay GONE (same as a cosmetic filter).
 *  - `cloak` → concealed before first paint (default opacity:0; `base` may use any
 *              allowlisted declaration) then revealed by a pure-CSS animation after
 *              `fade.delay`. This is the container mask (e.g. the whole results
 *              area) that MUST come back — so it keeps the self-heal guarantee: a
 *              second, client-owned animation restores every touched property no
 *              later than MAX_FADE_MS, so a mis-scoped/stale/hostile cloak ends
 *              visible, never blanks the page forever.
 *
 * The grammar lives HERE in packaged code — the server only supplies selectors,
 * allowlisted prop:value pairs and numbers (MV3 remote-code safe).
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});
   const D = () => Pro.domains;
   const C = () => Pro.cosmetics;

   function pick(directive, host) {
      if (!directive || !Array.isArray(directive.hostPatterns) || !host) return null;
      // matchKeys includes lineage, entity forms ("domain.*" covers every ccTLD),
      // the "www." twins of the exact host, and the "*" bucket, so a single
      // directive entry can cover an entity.
      const keys = new Set(D().matchKeys(host));
      for (const p of directive.hostPatterns) {
         if (!p || !p.match) continue;
         if (keys.has(String(p.match).toLowerCase())) return p;
      }
      return null;
   }

   // Ceiling on the pre-paint conceal: even a stale/hostile directive can only
   // hold content back this long before the self-heal forces it visible.
   const MAX_FADE_MS = 4000;

   // Declarations the conceal state and keyframes may set, each with the
   // "revealed" value the self-heal frame restores it to. `display` is
   // deliberately absent: it cannot be reliably animated back, so a
   // display:none base could defeat the reveal guarantee. Allowlisting it —
   // combined with an unclamped timing — would be a permanent-hide vector, so
   // it is excluded on purpose.
   const PROPS = {
      "opacity": "1", "visibility": "visible", "transform": "none", "filter": "none",
      "top": "auto", "left": "auto", "right": "auto", "bottom": "auto",
      "height": "auto", "width": "auto", "max-height": "none", "max-width": "none"
   };

   // Reject url()/@-rules/statement breakers so a value can only parameterize
   // the fixed animation model — never fetch, never escape its declaration.
   // "/*" would open a comment that swallows the rest of the rule, and "\"
   // escapes could respell "url(" — none of the allowlisted properties ever
   // needs either, so both are banned outright.
   const TAINT = /url\(|@|[{}<>;]|\/\*|\\/i;

   // The timing function lands inside the `animation` shorthand, so it must be
   // valid beyond doubt, not just taint-screened: whitespace could smuggle
   // extra shorthand components, and any INVALID value — an unknown keyword, steps(0),
   // a cubic-bezier x outside [0..1] — voids the WHOLE animation declaration,
   // reveal and self-heal included: the conceal state would stick forever.
   // Hence full semantic validation, falling back to "ease".
   function safeTiming(raw) {
      if (/^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/.test(raw)) return raw;
      let m = /^cubic-bezier\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\)$/.exec(raw);
      if (m) {
         const n = m.slice(1).map(Number);
         if (n.every(Number.isFinite) && n[0] >= 0 && n[0] <= 1 && n[2] >= 0 && n[2] <= 1) return raw;
      }
      m = /^steps\((\d{1,3})(?:,(start|end|jump-start|jump-end|jump-none|jump-both))?\)$/.exec(raw);
      if (m && +m[1] >= (m[2] === "jump-none" ? 2 : 1)) return raw;
      return "ease";
   }

   // { prop: value } -> "prop:val;prop:val", allowlisted + screened; touched
   // props are recorded so the self-heal frame can restore exactly those.
   function decls(obj, touched) {
      if (!obj || typeof obj !== "object") return "";
      const out = [];
      for (const k in obj) {
         const key = String(k).trim().toLowerCase();
         const val = String(obj[k]).trim();
         if (!Object.prototype.hasOwnProperty.call(PROPS, key)) continue;
         if (!val || val.length > 120 || TAINT.test(val)) continue;
         out.push(key + ":" + val);
         touched.add(key);
      }
      return out.join(";");
   }

   // { "0%"|from|to: {...} } -> "to{...}0%{...}" keyframe stops ("" if none valid).
   function frames(kf, touched) {
      if (!kf || typeof kf !== "object") return "";
      const stops = [];
      for (const s in kf) {
         const stop = String(s).trim().toLowerCase();
         if (!/^(from|to|\d{1,3}%)$/.test(stop)) continue;
         const body = decls(kf[stop], touched);
         if (body) stops.push(stop + "{" + body + "}");
      }
      return stops.join("");
   }

   function chunkRule(selectors, decl) {
      const rules = [];
      for (let i = 0; i < selectors.length; i += 4000) rules.push(selectors.slice(i, i + 4000).join(",") + decl);
      return rules.join("\n");
   }

   // `hide` -> permanent display:none!important. Targeted ad selectors, removed
   // for good, no animation, no self-heal — identical to a cosmetic filter.
   // Chunked so one bad selector can't void the whole rule.
   function buildHide(selectors) {
      const safe = (Array.isArray(selectors) ? selectors : []).filter(C().safeSelector);
      return safe.length ? chunkRule(safe, "{display:none!important}") : "";
   }

   // `cloak` -> conceal (default opacity:0 / `base`) then reveal after `fade.delay`
   // via the animation, WITH the self-heal guarantee. The container mask that must
   // reappear (e.g. the results block on #gevUs,#res). `fade.duration` 0 gives an
   // instant snap-in at `delay` (an immediate reveal, no fade).
   function buildCloak(selectors, fade) {
      const safe = (Array.isArray(selectors) ? selectors : []).filter(C().safeSelector);
      if (safe.length === 0) return "";
      fade = fade || {};
      const clamp = (v, d) => (Number.isFinite(v) ? Math.min(MAX_FADE_MS, Math.max(0, v)) : d);
      const delay = clamp(fade.delay, 0);
      // Bound delay+duration together so the ceiling is a true worst case: the
      // page is fully revealed no later than MAX_FADE_MS after first paint.
      const duration = Math.min(clamp(fade.duration, 250), MAX_FADE_MS - delay);
      const timing = safeTiming(String(fade.timing == null ? "" : fade.timing).trim());

      const touched = new Set();
      // Invalid/empty base or keyframes fall back to the opacity fade rather
      // than emitting a rule that could never reveal (an animation whose
      // keyframes are missing simply doesn't run, leaving the base applied).
      const base = decls(fade.base, touched) || (touched.add("opacity"), "opacity:0");
      const kfBody = frames(fade.keyframes, touched) || (touched.add("opacity"), "to{opacity:1}");

      // Client-owned guarantee, appended LAST in the animation list (the later
      // animation wins conflicting properties while both fill forwards): no
      // matter what the server keyframes end on, every touched property is
      // restored to its revealed value at MAX_FADE_MS. Fixed names so page
      // @keyframes can never collide with ours.
      const heal = [...touched].map((p) => p + ":" + PROPS[p]).join(";");
      const anim = "animation:__proReveal " + duration + "ms " + timing + " " + delay + "ms forwards" +
         ",__proSelfHeal 1ms linear " + MAX_FADE_MS + "ms forwards";
      const decl = "{" + base + ";" + anim + "}";
      return "@keyframes __proReveal{" + kfBody + "}\n" +
         "@keyframes __proSelfHeal{to{" + heal + "}}\n" +
         chunkRule(safe, decl);
   }

   function buildCss(entry) {
      if (!entry) return "";
      const hideCss = buildHide(entry.hide);
      const cloakCss = buildCloak(entry.cloak, entry.fade);
      return [hideCss, cloakCss].filter(Boolean).join("\n");
   }

   Pro.flicker = { pick, buildCss };
})();
