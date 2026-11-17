/*
 * bypass.js — the single "is this host paused/allow-listed?" matcher. One
 * normalized set is built from every source that can suppress blocking (server
 * breakage whitelist, the user's allowlist, per-domain pauses, and the packaged
 * breakage list) and one predicate gates the DNR, cosmetic and scriptlet layers
 * together, so a site is never half-paused.
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});
   const D = () => Pro.domains;

   function norm(entry) {
      return String(entry || "").toLowerCase().replace(/^\*?\.?/, "").replace(/^www\./, "").trim();
   }

   // sources: array of string arrays (any may be undefined). Order does not
   // matter — membership is a union.
   function build(sources) {
      const set = new Set();
      for (const list of sources) {
         if (!Array.isArray(list)) continue;
         for (const raw of list) {
            const h = norm(raw);
            if (h) set.add(h);
         }
      }
      return set;
   }

   function isBypassed(set, host) {
      if (!set || set.size === 0 || !host) return false;
      for (const cand of D().lineage(host)) {
         if (set.has(cand)) return true;
      }
      return false;
   }

   Pro.bypass = { build, isBypassed, norm };
})();
