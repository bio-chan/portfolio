/*
 * firewall.js — DNR (declarativeNetRequest) manager built on a PARTITIONED
 * rule-id contract, so nothing is ever renumbered and each concern owns a
 * disjoint id space that the others never touch.
 *
 *   USER rules (client-owned, the user's own choices):
 *     1  USER_ALLOW      persistent allowAllRequests over the user's allow + pause set
 *     2  USER_BLOCK      persistent block over the user's blocklist
 *     3  SYSTEM_ALLOW    persistent allowAllRequests over the server's `allowlist`
 *                        key — the client-side twin of the server band's whitelist
 *                        pair (the sibling brands' applyDefaultWhitelist), so the
 *                        allow-listed sites keep network cover even when the
 *                        band's builder drops a host or a sync fails
 *    21  SESSION_ALLOW   session-scoped twin of 1  — applied via updateSessionRules
 *    22  SESSION_BLOCK   session-scoped twin of 2  — (~10ms, instant UI feedback,
 *                        auto-cleared on restart; the persistent 1/2 survive it)
 *
 *   SERVER rules (server-owned):   [30, 11000)   applied VERBATIM (ids preserved).
 *     The backend emits the seed allow, the inline block floor (rule 2002), the
 *     system-whitelist allow band and its other server rules here, all inside
 *     this range. A server sync only ever replaces this band.
 *
 *   COMPILED bulk blocklist:       [11000, 61000)   the lazy-fetched all-in-one list.
 *
 * Invariants:
 *  - The three writable bands (USER ids, SERVER, BULK) are disjoint, so a user
 *    toggle (USER ids) never disturbs the server band, and a server sync never
 *    disturbs the user's rules.
 *  - An allow must beat every block: ALLOW_PRIORITY (200) sits just above the
 *    static/bulk block+redirect range (packaged blocks ≤178, redirects ≤199,
 *    bulk ≤3), so a user pause/allow clears them. BLOCK_PRIORITY (100) still
 *    blocks anything the lists don't, but loses to any allow — whitelist overrides
 *    blocklist. The server's own high-priority band (its system-whitelist allows
 *    and its search-surface rules) sits ABOVE the user rules on purpose, so a user
 *    toggle can never disturb it and critical surfaces (auth, payments, and other
 *    server-allow-listed hosts) stay protected.
 *  - The 30k dynamic+session budget is shared across ALL rules (server + bulk +
 *    the 3 user dynamic + 2 session); the per-band caps below reserve headroom.
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});
   const L = Pro.log || function () {}; if (!L.warn) L.warn = function () {};

   // Fixed user-rule ids (persistent dynamic + volatile session twins).
   const RULE = { USER_ALLOW: 1, USER_BLOCK: 2, SYSTEM_ALLOW: 3, SESSION_ALLOW: 21, SESSION_BLOCK: 22 };
   // Server-owned dynamic band [lo, hi) and the compiled bulk band [lo, hi).
   const SERVER = [30, 11000];
   const BULK = [11000, 61000];
   // Per-band count caps. The combined dynamic+session limit is 30000; the user
   // rules (3 dynamic ids 1/2/3 + 2 session ids 21/22) and a small margin are
   // reserved, so SERVER + BULK stay well under it: 4700 + 25000 + 5 = 29705.
   const CAP = { SERVER: 4700, BULK: 25000 };
   // User-rule priorities. Kept LOW and just above the static/bulk block range
   // (blocks ≤178, redirects ≤199, bulk ≤3) rather than an arbitrarily huge
   // number: ALLOW at 200 outranks every static/bulk block+redirect so a
   // pause/allow truly clears them; BLOCK at 100 still blocks anything the lists
   // don't, but loses to any allow (whitelist overrides blocklist). The server's
   // own high-priority band (its system-whitelist allows and its search-surface
   // rules) deliberately sits ABOVE these, so a user toggle can't disturb it.
   const ALLOW_PRIORITY = 200;
   const BLOCK_PRIORITY = 100;

   const BLOCK_RESOURCES = [
      "main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object",
      "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"
   ];

   // One user rule from a host list: an allow is allowAllRequests over the page
   // frames; a block is a block over every resource type (incl. main_frame, so a
   // blocked host can't even be navigated to). Empty list -> null (no rule).
   function userRule(id, domains, isAllow) {
      const list = (Array.isArray(domains) ? domains : []).filter(Boolean);
      if (list.length === 0) return null;
      return isAllow
         ? { id, priority: ALLOW_PRIORITY, action: { type: "allowAllRequests" }, condition: { requestDomains: list, resourceTypes: ["main_frame", "sub_frame"] } }
         : { id, priority: BLOCK_PRIORITY, action: { type: "block" }, condition: { requestDomains: list, resourceTypes: BLOCK_RESOURCES } };
   }

   async function replaceDynamicBand([lo, hi], addRules) {
      const current = await chrome.declarativeNetRequest.getDynamicRules();
      const removeRuleIds = current.filter((r) => r.id >= lo && r.id < hi).map((r) => r.id);
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: addRules || [] });
   }

   // A DNR domain-list field must be canonical lowercase hostnames or Chrome
   // rejects the WHOLE updateDynamicRules batch. The server allow band is built
   // from a community whitelist that isn't syntax-checked, so normalize the four
   // domain-list fields (leave urlFilter/regexFilter/action untouched) and drop
   // anything that still isn't a bare hostname.
   const HOSTNAME = /^[a-z0-9.-]+$/;
   const DOMAIN_FIELDS = ["requestDomains", "excludedRequestDomains", "initiatorDomains", "excludedInitiatorDomains"];
   function sanitizeDomains(rule) {
      const cond = rule && rule.condition;
      if (!cond || typeof cond !== "object") return rule;
      const out = { ...rule, condition: { ...cond } };
      for (const f of DOMAIN_FIELDS) {
         const list = cond[f];
         if (!Array.isArray(list)) continue;
         const clean = [];
         for (const d of list) {
            const h = String(d || "").trim().toLowerCase().replace(/^\*?\.?/, "").replace(/^www\./, "");
            if (h && HOSTNAME.test(h)) clean.push(h);
         }
         out.condition[f] = clean;
      }
      return out;
   }

   // Server inline rules, applied VERBATIM (ids preserved). Only rules whose id
   // falls in the server band are kept, so a stray id can never collide with the
   // user rules (<30) or the bulk band (>=11000); duplicates are dropped (Chrome
   // rejects a batch with duplicate ids). The band is fully replaced each sync.
   //
   // updateDynamicRules is atomic — one malformed rule would reject the entire
   // batch, taking down the block floor and the rest of the server rules with it. So:
   // sanitize domain lists up front, try the batch, and on failure fall back to
   // applying rules one at a time, skipping only the offender(s). A single bad
   // server/whitelist entry can then degrade at most itself, never the band.
   async function applyServerRules(rules) {
      const incoming = Array.isArray(rules) ? rules.length : 0;
      const seen = new Set();
      const valid = [];
      let droppedBand = 0, droppedDup = 0, capped = 0;
      for (const r of Array.isArray(rules) ? rules : []) {
         if (!r || typeof r.id !== "number" || r.id < SERVER[0] || r.id >= SERVER[1]) { droppedBand++; continue; }
         if (seen.has(r.id)) { droppedDup++; continue; }
         seen.add(r.id);
         valid.push(sanitizeDomains(r));
         if (valid.length >= CAP.SERVER) { capped = 1; break; }
      }
      L("applyServerRules", "server DNR band [30,11000):", {
         incoming, applied: valid.length, droppedOutOfBand: droppedBand, droppedDuplicate: droppedDup, cappedAtLimit: !!capped,
         byAction: valid.reduce((m, r) => { const t = r.action && r.action.type; m[t] = (m[t] || 0) + 1; return m; }, {})
      });
      try {
         await replaceDynamicBand(SERVER, valid);
      } catch (e) {
         // Fault-isolate: clear the band, then add rules individually so one bad
         // rule can't suppress the rest of the server rules.
         L.warn("applyServerRules", "atomic batch REJECTED — falling back to per-rule apply:", e && e.message);
         await replaceDynamicBand(SERVER, []);
         let ok = 0, bad = [];
         for (const r of valid) {
            try { await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [r] }); ok++; }
            catch (_) { bad.push(r.id); }
         }
         L.warn("applyServerRules", "per-rule fallback done:", { applied: ok, rejectedIds: bad });
      }
   }

   // The lazy-fetched bulk blocklist, renumbered into the BULK band and capped so
   // the bands together stay within the dynamic budget. (Renumbered, not verbatim:
   // the compiled feed is a raw rule list with no id discipline, and the band is
   // disjoint from every other, so sequential ids here are collision-free.)
   async function applyBulk(bulkRules) {
      const [lo] = BULK;
      const incoming = Array.isArray(bulkRules) ? bulkRules.length : 0;
      const src = (Array.isArray(bulkRules) ? bulkRules : []).slice(0, CAP.BULK);
      L("applyBulk", "bulk band [11000,61000):", { incoming, applied: src.length, cappedAtLimit: incoming > CAP.BULK });
      await replaceDynamicBand(BULK, src.map((r, i) => ({ ...r, id: lo + i })));
   }

   // User allow + block as SESSION rules (ids 21/22): a separate index from the
   // thousands of dynamic rules, so updateSessionRules returns in ~10ms — the
   // instant path on every user toggle. Volatile (cleared on restart); the
   // persistent dynamic twins (rebuildUserDynamic) carry the state across restarts.
   async function applyUserSession(allowHosts, blockHosts) {
      const add = [];
      const a = userRule(RULE.SESSION_ALLOW, allowHosts, true);
      const b = userRule(RULE.SESSION_BLOCK, blockHosts, false);
      if (a) add.push(a);
      if (b) add.push(b);
      await chrome.declarativeNetRequest.updateSessionRules({
         removeRuleIds: [RULE.SESSION_ALLOW, RULE.SESSION_BLOCK],
         addRules: add
      });
   }

   // User allow + block as PERSISTENT dynamic rules (ids 1/2): survive a browser
   // restart. Slower to update than session rules, but user lists are small.
   async function rebuildUserDynamic(allowHosts, blockHosts) {
      const add = [];
      const a = userRule(RULE.USER_ALLOW, allowHosts, true);
      const b = userRule(RULE.USER_BLOCK, blockHosts, false);
      if (a) add.push(a);
      if (b) add.push(b);
      await chrome.declarativeNetRequest.updateDynamicRules({
         removeRuleIds: [RULE.USER_ALLOW, RULE.USER_BLOCK],
         addRules: add
      });
   }

   // The full user-rule apply: session first (instant), then the persistent twin.
   async function applyUserRules(allowHosts, blockHosts) {
      const na = (allowHosts || []).filter(Boolean).length, nb = (blockHosts || []).filter(Boolean).length;
      L("applyUserRules", "user rules — session(21/22, instant) + dynamic(1/2, persistent):", {
         allowHosts: na, blockHosts: nb,
         allowRule: na ? "id 1/21 allowAllRequests @ " + ALLOW_PRIORITY : "none (empty)",
         blockRule: nb ? "id 2/22 block @ " + BLOCK_PRIORITY : "none (empty)"
      });
      await applyUserSession(allowHosts, blockHosts);
      await rebuildUserDynamic(allowHosts, blockHosts);
   }

   // The server's system whitelist (the `allowlist` DATA key) as ONE persistent
   // dynamic rule — the client-side twin of the server band's whitelist pair,
   // kept on its own id (server-owned list, own lifecycle, never disturbed by a
   // user toggle). Hosts are normalized like sanitizeDomains up front: a single
   // malformed entry would reject the whole updateDynamicRules batch. Empty
   // list -> the rule is removed.
   async function applySystemAllow(hosts) {
      const seen = new Set();
      const clean = [];
      for (const d of Array.isArray(hosts) ? hosts : []) {
         const h = String(d || "").trim().toLowerCase().replace(/^\*?\.?/, "").replace(/^www\./, "");
         if (h && HOSTNAME.test(h) && !seen.has(h)) { seen.add(h); clean.push(h); }
      }
      const rule = userRule(RULE.SYSTEM_ALLOW, clean, true);
      L("applySystemAllow", "system whitelist rule (id " + RULE.SYSTEM_ALLOW + ", persistent):", {
         hosts: clean.length,
         dropped: (Array.isArray(hosts) ? hosts.length : 0) - clean.length,
         rule: rule ? "allowAllRequests @ " + ALLOW_PRIORITY : "none (empty list -> removed)"
      });
      try {
         await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE.SYSTEM_ALLOW],
            addRules: rule ? [rule] : []
         });
      } catch (e) {
         // Non-fatal by contract: the server band's whitelist pair still covers
         // the list — this rule is the redundancy behind it, never worth
         // aborting a caller (seedDefaults sits on the onInstalled critical
         // path, BEFORE the forced install/update sync).
         L.warn("applySystemAllow", "updateDynamicRules rejected — rule kept as-was:", e && e.message);
      }
   }

   async function toggleStatic(enableIds, disableIds) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
         enableRulesetIds: enableIds || [],
         disableRulesetIds: disableIds || []
      });
   }

   Pro.firewall = {
      RULE, SERVER, BULK, CAP, ALLOW_PRIORITY, BLOCK_PRIORITY,
      applyServerRules, applyBulk, applyUserSession, rebuildUserDynamic, applyUserRules, applySystemAllow, toggleStatic
   };
})();
