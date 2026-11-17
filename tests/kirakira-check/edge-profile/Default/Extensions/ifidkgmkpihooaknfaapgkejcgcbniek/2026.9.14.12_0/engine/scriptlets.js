/*
 * scriptlets.js — the scriptlet MATCHER. It compiles the ##+js() database
 * ({ "<domain>"|"*"|"/re/": [[name, ...args], ...] }) into fast lookup buckets
 * and returns the calls that apply to a host. It does NOT run code — execution
 * is the service worker's MAIN-world job (scriptlets/library.js). Only names the
 * library actually implements are dispatched, so an unknown name is a no-op.
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});
   const D = () => Pro.domains;

   function compile(db) {
      const byHost = {};
      const generic = [];
      const regexKeys = [];
      if (db && typeof db === "object") {
         for (const key in db) {
            const calls = db[key];
            if (!Array.isArray(calls)) continue;
            if (key === "*") {
               for (const c of calls) generic.push(c);
            } else if (key.length > 1 && key[0] === "/" && key[key.length - 1] === "/") {
               regexKeys.push([key.slice(1, -1), calls]);
            } else {
               byHost[key] = calls;
            }
         }
      }
      return { byHost, generic, regexKeys };
   }

   // The set of scriptlet NAMES excluded for a host: any name listed under a
   // key from domains.matchKeys (lineage, entity forms, "*") in the
   // server-supplied exclusion map ({ "<domain>"|"<entity>.*"|"*": [names] }).
   function excludeSet(excludes, host) {
      if (!excludes || typeof excludes !== "object") return null;
      const set = new Set();
      for (const k of D().matchKeys(host)) {
         const names = excludes[k];
         if (Array.isArray(names)) for (const n of names) set.add(n);
      }
      return set.size ? set : null;
   }

   // Every [name, ...args] call that applies to host: the generic "*" bucket,
   // any matchKeys key (lineage + entity forms — "google.*" and multi-label
   // "www.google.*" DB keys resolve here), and any regex key that tests true —
   // minus any name excluded for this host by the optional exclusion map
   // (uBO #@#+js). compile() routes "*" to the generic bucket, so the "*"
   // member of matchKeys never double-counts.
   function matchCalls(index, host, excludes) {
      if (!index || !host) return [];
      const out = [];
      for (const c of index.generic || []) out.push(c);
      const byHost = index.byHost || {};
      for (const dom of D().matchKeys(host)) {
         const calls = byHost[dom];
         if (calls) for (const c of calls) out.push(c);
      }
      for (const [src, calls] of index.regexKeys || []) {
         let re;
         try { re = new RegExp(src); } catch (e) { continue; }
         if (re.test(host)) for (const c of calls) out.push(c);
      }
      const ex = excludeSet(excludes, host);
      return ex ? out.filter((c) => !ex.has(c[0])) : out;
   }

   Pro.scriptlets = { compile, matchCalls, excludeSet };
})();
