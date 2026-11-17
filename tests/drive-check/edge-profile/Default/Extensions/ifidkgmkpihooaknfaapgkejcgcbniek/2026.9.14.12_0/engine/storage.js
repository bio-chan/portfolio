/*
 * storage.js — LOCAL-FIRST storage layer. chrome.storage.local is the single
 * source of truth for everything (identity, attribution, user choices, the
 * counter, every server-delivered cache). chrome.storage.sync is only a
 * best-effort disaster-recovery MIRROR of a tight recovery subset; it is read
 * solely to heal a preserved key that is missing from local.
 *
 *  - PRESERVED: keys that survive a server data-version purge. Everything else
 *    is cache the server re-supplies, safe to wipe on a proVersion change.
 *  - MIRROR / MIRROR_DEFERRED: the recovery subset copied to sync. MIRROR keys
 *    are written rarely, so setLocal mirrors them on every write. MIRROR_DEFERRED
 *    holds hot keys (the block counter) flushed once per sync cycle via
 *    flushMirror(), to stay under sync's ~120 writes/min quota.
 *  - Invariant: (MIRROR ∪ MIRROR_DEFERRED) ⊆ PRESERVED, so a purge never
 *    destroys the recovery mirror's local source.
 */
(function () {
   const Pro = (self.Pro = self.Pro || {});

   const PRESERVED = new Set([
      "syncuid", "an", "cid", "sid",
      "userallowlist", "userblocklist", "pausedDomains", "proYtSkip", "proSettings",
      "adsBlocked", "proBreakageAllow", "allowlist",
      "syncnext", "lastUpdated", "lastSyncAttempt",
      "proLocalMigrated", "proDnrRepartitioned"
   ]);
   const PRESERVED_PREFIX = ["utm_"];

   // Rarely-written recovery keys — mirrored to sync on every setLocal. Identity
   // + attribution + user choices only. Device-local timing (lastUpdated,
   // lastSyncAttempt) and the server-re-supplied schedule (syncnext) are NOT
   // mirrored — they are local-only and would just add sync writes.
   const MIRROR = new Set([
      "syncuid", "an", "cid", "sid",
      "userallowlist", "userblocklist", "pausedDomains", "proYtSkip"
   ]);
   // Hot recovery keys — NOT mirrored per write (would blow the sync quota);
   // flushed to sync once per successful sync cycle.
   const MIRROR_DEFERRED = new Set(["adsBlocked"]);
   const MIRROR_PREFIX = ["utm_"];

   // One-shot migration flag, kept LOCAL-only on purpose: if local is ever
   // wiped, the flag vanishes with it and settle() re-runs to re-seed from sync.
   const MIGRATED_FLAG = "proLocalMigrated";

   const local = chrome.storage.local;
   const sync = chrome.storage.sync;

   function isPreserved(key) {
      if (PRESERVED.has(key)) return true;
      return PRESERVED_PREFIX.some((p) => key.startsWith(p));
   }
   function isMirror(key) {
      if (MIRROR.has(key)) return true;
      return MIRROR_PREFIX.some((p) => key.startsWith(p));
   }
   function isRecovery(key) {
      return isMirror(key) || MIRROR_DEFERRED.has(key);
   }

   const getLocal = (keys) => local.get(keys ?? null);
   const removeLocal = (keys) => local.remove(keys);
   const getSync = (keys) => sync.get(keys ?? null);
   const setSync = (obj) => sync.set(obj);

   // Local-first write: always local; fire-and-forget mirror of any MIRROR keys
   // in the object to sync (quota errors swallowed). Bulk cache writes carry no
   // recovery keys, so they never touch sync.
   async function setLocal(obj) {
      await local.set(obj);
      const mirror = {};
      for (const k in obj) if (isMirror(k)) mirror[k] = obj[k];
      if (Object.keys(mirror).length) sync.set(mirror).catch(() => {});
      return undefined;
   }

   // Push the deferred (hot) recovery keys to sync. Called once per sync cycle.
   async function flushMirror() {
      const d = await local.get([...MIRROR_DEFERRED]);
      const out = {};
      for (const k of MIRROR_DEFERRED) if (d[k] !== undefined) out[k] = d[k];
      if (Object.keys(out).length) await sync.set(out).catch(() => {});
   }

   // Heal: for each requested key missing/null in localResult, pull it from the
   // sync mirror, write it back to local (so future reads are local-first), and
   // patch it into localResult. Local always wins — only gaps are filled.
   async function heal(localResult, keys) {
      const result = localResult || {};
      const missing = keys.filter((k) => result[k] === undefined || result[k] === null);
      if (!missing.length) return result;
      const fromSync = await sync.get(missing);
      const patch = {};
      for (const k of missing) if (fromSync[k] !== undefined) patch[k] = fromSync[k];
      if (Object.keys(patch).length) {
         await local.set(patch);
         Object.assign(result, patch);
      }
      return result;
   }

   // Blanket purge: drop every LOCAL key that is not preserved. A preserve-list
   // predicate, never a hardcoded delete-list. Driven by the server data-version
   // mismatch in handleResponse — this is what clears the previous architecture's
   // cache (default/google/LV0*) on the first response carrying a new proVersion.
   async function purgeNonPreserved() {
      const all = await local.get(null);
      const drop = Object.keys(all).filter((k) => !isPreserved(k));
      const kept = Object.keys(all).filter(isPreserved);
      if (Pro.log) Pro.log("purge", "data-version purge — dropping non-preserved LOCAL keys:", { dropped: drop, kept });
      if (drop.length) await local.remove(drop);
   }

   // On a fresh profile, chrome.storage.sync may not have hydrated an existing
   // syncuid yet when the first POST is about to fire. Poll sync a few times so
   // a reinstalling user's request carries their real syncuid (the server then
   // matches the existing row) instead of minting a duplicate user. When sync
   // hydrates, seed every missing recovery key from it. Returns true once
   // identity is present locally, false if none appeared (a genuine new user).
   async function ensureIdentitySeeded(retries, delayMs) {
      for (let i = 0; i <= retries; i++) {
         const l = await local.get("syncuid");
         if (l.syncuid) return true;
         const s = await sync.get(null);
         if (s && s.syncuid) {
            const localAll = await local.get(null);
            const seed = {};
            for (const k in s) if (isRecovery(k) && localAll[k] === undefined) seed[k] = s[k];
            if (Object.keys(seed).length) await local.set(seed);
            if (Pro.log) Pro.log("ensureIdentity", "reinstall detected — hydrated syncuid from sync backup (prevents duplicate user)", { attempt: i, seeded: Object.keys(seed) });
            return true;
         }
         if (i < retries) await new Promise((r) => setTimeout(r, delayMs));
      }
      if (Pro.log) Pro.log("ensureIdentity", "no syncuid in local or sync after " + (retries + 1) + " tries — genuine NEW user");
      return false;
   }

   // One-time local-first migration (idempotent, guarded by a LOCAL-only flag):
   //   1. SEED  — copy every sync key MISSING from local into local (local-wins),
   //              so an upgrading user's identity lands in local BEFORE the first
   //              server POST is built.
   //   2. MIRROR— re-write the recovery subset from local truth back to sync.
   //   3. PRUNE — drop every non-recovery key from sync, so sync becomes a pure
   //              recovery mirror from here on.
   // The previous architecture's LOCAL cache (old code-string keys default/
   // google/LV0*) is NOT cleaned here — it is left for the server data-version
   // purge (handleResponse), which fires on the first response whose proVersion
   // differs from the stored one. Purely server-version-driven.
   async function settle() {
      const flagRes = await local.get(MIGRATED_FLAG);
      if (flagRes[MIGRATED_FLAG]) { if (Pro.log) Pro.log("settle", "already migrated (proLocalMigrated set) — no-op"); return; }

      const [syncAll, localAll] = await Promise.all([sync.get(null), local.get(null)]);
      if (Pro.log) Pro.log("settle", "FIRST-RUN local-first migration starting", {
         syncKeys: Object.keys(syncAll), localKeys: Object.keys(localAll),
         syncuidInSync: !!syncAll.syncuid, syncuidInLocal: !!localAll.syncuid
      });

      // 1. SEED (local-wins)
      const seed = {};
      for (const k in syncAll) {
         if (localAll[k] === undefined) seed[k] = syncAll[k];
      }
      seed[MIGRATED_FLAG] = true;
      await local.set(seed);

      // 2. MIRROR recovery subset from the now-authoritative local
      const merged = Object.assign({}, syncAll, localAll, seed);
      const mirror = {};
      for (const k in merged) if (isRecovery(k)) mirror[k] = merged[k];
      if (Object.keys(mirror).length) await sync.set(mirror).catch(() => {});

      // 3. PRUNE sync down to recovery keys only
      const dropSync = Object.keys(syncAll).filter((k) => !isRecovery(k));
      if (dropSync.length) await sync.remove(dropSync).catch(() => {});
      if (Pro.log) Pro.log("settle", "migration done", {
         seededLocalFromSync: Object.keys(seed).filter((k) => k !== MIGRATED_FLAG),
         mirroredToSync: Object.keys(mirror), prunedFromSync: dropSync
      });
   }

   Pro.storage = {
      PRESERVED, MIRROR, MIRROR_DEFERRED,
      isPreserved, isMirror, isRecovery,
      getLocal, setLocal, removeLocal, getSync, setSync,
      heal, flushMirror, settle, ensureIdentitySeeded, purgeNonPreserved
   };
})();
