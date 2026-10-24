# Architecture rules

- Use `src/lib/matchCache.ts` for all match recovery cache keys and cleanup; account-scoped and guest-scoped keys prevent cross-session disclosure, and unowned legacy copies must never be migrated.
- Remount authenticated application children and clear application caches on account/guest identity transitions so in-memory match data cannot survive a privacy boundary.
- Restore owned matches from the cloud before enabling edits, cache writes, or autosave; use local recovery only for guests or drafts absent from the cloud, because unversioned caches cannot establish freshness across devices.- Player playtime (`totalSecondsPlayed`, `secondsPlayedPerPeriod`) is derived from the match timer (`elapsedTime` per period), never from wall-clock `Date.now()` deltas, so pauses never count as minutes played. `currentEntryTime` stores match-timer seconds at entry.
