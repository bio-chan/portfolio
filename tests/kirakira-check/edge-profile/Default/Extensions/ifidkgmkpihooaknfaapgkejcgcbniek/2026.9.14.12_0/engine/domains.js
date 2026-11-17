/*
 * domains.js — host normalization shared by the cosmetic, scriptlet, bypass and
 * firewall layers. Loaded first in both the content-script list and the service
 * worker (importScripts), so every layer keys on the same host vocabulary.
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});

   // Compact public-suffix set. This is NOT the full Public Suffix List: it is a
   // curated set of the common multi-label suffixes plus a last-two-labels
   // fallback. Replace with a generated PSL table if a ccTLD ever mis-scopes a
   // cosmetic or scriptlet rule (over-broad root -> hides on an unrelated site
   // under the same suffix).
   const MULTI_SUFFIX = new Set([
      "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk", "ltd.uk", "plc.uk",
      "com.au", "net.au", "org.au", "edu.au", "gov.au", "id.au",
      "co.nz", "net.nz", "org.nz",
      "co.jp", "or.jp", "ne.jp", "go.jp", "ac.jp",
      "co.kr", "or.kr", "go.kr",
      "co.in", "net.in", "org.in", "gen.in", "firm.in", "ind.in",
      "com.br", "net.br", "org.br", "gov.br",
      "com.mx", "com.ar", "com.co", "com.tr", "com.cn", "net.cn", "org.cn",
      "com.hk", "com.sg", "com.tw", "com.ua", "com.pl", "com.ph", "com.my",
      "com.vn", "com.sa", "com.eg", "co.za", "co.il", "co.th", "co.id", "co.ke",
      // ccTLD second levels where the major entity-scoped sites (google.*,
      // amazon.*, ...) live — without these, rootOf("google.com.pk") would be
      // "com.pk" and the "google.*" entity form would never be derived.
      "com.af", "com.ag", "com.bd", "com.bh", "com.bn", "com.bo", "com.bz",
      "com.cu", "com.cy", "com.do", "com.ec", "com.et", "com.fj", "com.gh",
      "com.gi", "com.gt", "com.jm", "com.kh", "com.kw", "com.lb", "com.ly",
      "com.mm", "com.mt", "com.na", "com.ng", "com.ni", "com.np", "com.om",
      "com.pa", "com.pe", "com.pg", "com.pk", "com.pr", "com.py", "com.qa",
      "com.sb", "com.sl", "com.sv", "com.uy", "com.vc", "com.ve",
      "co.ao", "co.bw", "co.ck", "co.cr", "co.ls", "co.ma", "co.mz", "co.tz",
      "co.ug", "co.uz", "co.ve", "co.vi", "co.zm", "co.zw"
   ]);

   function hostOf(url) {
      try {
         let h = new URL(url).hostname.toLowerCase();
         if (h.endsWith(".")) h = h.slice(0, -1); // canonicalize the FQDN trailing dot
         return h.startsWith("www.") ? h.slice(4) : h;
      } catch (e) {
         return "";
      }
   }

   // Registrable domain (eTLD+1). Falls back to the last two labels when the
   // suffix is unknown.
   function rootOf(host) {
      if (!host) return "";
      const parts = host.split(".");
      if (parts.length <= 2) return host;
      const lastTwo = parts.slice(-2).join(".");
      if (MULTI_SUFFIX.has(lastTwo)) return parts.slice(-3).join(".");
      return lastTwo;
   }

   // The host and every parent domain down to (and including) the registrable
   // root, most specific first. This is the match order a domain-scoped rule is
   // tested against: a rule on example.com also applies to a.b.example.com.
   function lineage(host) {
      const out = [];
      if (!host) return out;
      const root = rootOf(host);
      let h = host;
      out.push(h);
      while (h !== root && h.indexOf(".") !== -1) {
         h = h.slice(h.indexOf(".") + 1);
         out.push(h);
         if (h === root) break;
      }
      if (root && out[out.length - 1] !== root) out.push(root);
      return out;
   }

   // uBO "entity": the label directly below the effective TLD (google.com ->
   // "google"), used for entity-scoped ("google.*") rules.
   function entityOf(host) {
      const root = rootOf(host);
      const i = root.indexOf(".");
      return i === -1 ? root : root.slice(0, i);
   }

   // Every data-map key that can address this host, most specific first:
   //  - the exact lineage (host ... registrable root),
   //  - the uBO entity form of each lineage member (public suffix -> "*",
   //    so consent.google.de matches both "consent.google.*" and "google.*"),
   //  - the "www." twins of the full host only (hostOf strips a leading www.,
   //    but filter lists also scope rules as www.<site> / "www.<site>.*" —
   //    the twin does not extend to parents: "www.google.*" must not match
   //    news.google.de),
   //  - the generic "*" bucket.
   // Shared by the cosmetic, scriptlet and flicker matchers so all three agree
   // on which keys reach a host.
   // Entity forms whose sole label is a generic second-level word are never a
   // real entity — they arise only when rootOf mis-parses an uncurated ccTLD
   // suffix (google.com.xy -> root "com.xy" -> "com.*"), and such a key in a
   // server-replaced data map would apply to every *.com.xy-style site at once.
   const GENERIC_ENTITY = new Set(["com", "co", "net", "org", "gov", "edu", "ac", "mil"]);
   const IP_HOST = /^\d{1,3}(\.\d{1,3}){3}$|:/;

   function matchKeys(host) {
      const keys = [];
      if (!host) return keys;
      if (IP_HOST.test(host)) { keys.push(host, "*"); return keys; } // no www/entity forms for IPs
      const lin = lineage(host);
      const root = lin[lin.length - 1];
      const dot = root.indexOf(".");
      const suffix = dot === -1 ? null : root.slice(dot + 1);
      keys.push(host, "www." + host);
      for (let i = 1; i < lin.length; i++) keys.push(lin[i]);
      if (suffix) {
         const ent = (l) => l.slice(0, l.length - suffix.length) + "*";
         const ok = (k) => {
            const prefix = k.slice(0, -2);
            return prefix.indexOf(".") !== -1 || (!GENERIC_ENTITY.has(prefix) && /[a-z]/.test(prefix));
         };
         const e = ent(host);
         if (ok(e)) keys.push(e, "www." + e);
         for (let i = 1; i < lin.length; i++) {
            const p = ent(lin[i]);
            if (ok(p)) keys.push(p);
         }
      }
      keys.push("*");
      return keys;
   }

   Pro.domains = { hostOf, rootOf, lineage, entityOf, matchKeys, MULTI_SUFFIX };
})();
