# Architecture rules

- Use `src/lib/matchCache.ts` for all match recovery cache keys and cleanup; account-scoped and guest-scoped keys prevent cross-session disclosure, and unowned legacy copies must never be migrated.
- Remount authenticated application children and clear application caches on account/guest identity transitions so in-memory match data cannot survive a privacy boundary.