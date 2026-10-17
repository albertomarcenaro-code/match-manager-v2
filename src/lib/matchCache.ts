// Match caches are recovery copies, never shared across account/guest boundaries.
export function getMatchCacheKey(matchId: string | undefined, userId: string | null, isGuest: boolean): string | null {
  const scope = isGuest ? 'guest' : userId ? `user:${userId}` : null;
  return scope ? `match-cache:v1:${scope}:${matchId || 'draft'}` : null;
}

export function clearMatchCaches(storage: Storage, legacyOnly = false): void {
  const legacyKeys = new Set(['match_manager_state', 'match-manager-state', 'match-timer-state', 'tournament-state']);
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) {
    if (!key) continue;
    if (legacyKeys.has(key) || key.startsWith('match_state_') || key.startsWith('match_config_') ||
        (!legacyOnly && key.startsWith('match-cache:v1:'))) {
      storage.removeItem(key);
    }
  }
}