import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearMatchCaches, getMatchCacheKey } from './matchCache';

function memoryStorage(entries: Record<string, string>): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: index => [...map.keys()][index] ?? null,
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: key => { map.delete(key); },
    clear: () => map.clear(),
  };
}

test('the same match is isolated between two accounts and guests', () => {
  const first = getMatchCacheKey('match-1', 'account-a', false);
  const second = getMatchCacheKey('match-1', 'account-b', false);
  const guest = getMatchCacheKey('match-1', 'account-a', true);
  assert.equal(first, 'match-cache:v1:user:account-a:match-1');
  assert.equal(second, 'match-cache:v1:user:account-b:match-1');
  assert.equal(guest, 'match-cache:v1:guest:match-1');
  assert.equal(getMatchCacheKey('match-1', null, false), null);
  const storage = memoryStorage({ [String(first)]: 'private roster' });
  assert.equal(storage.getItem(String(second)), null);
  assert.equal(storage.getItem(String(guest)), null);
});

test('logout and guest transitions erase all match copies but preserve unrelated settings', () => {
  const storage = memoryStorage({
    'match_state_123': 'old private match', 'match_manager_state': 'legacy',
    'match-manager-state': 'legacy', 'match_config_123': 'config',
    'match-timer-state': 'timer', 'tournament-state': 'tournament',
    'match-cache:v1:user:account-a:123': 'private', 'match-cache:v1:guest:123': 'guest',
    'theme': 'dark', 'sb-auth-token': 'session',
  });
  clearMatchCaches(storage);
  assert.equal(storage.length, 2);
  assert.equal(storage.getItem('theme'), 'dark');
  assert.equal(storage.getItem('sb-auth-token'), 'session');
});

test('startup discards unowned legacy data but preserves same-account recovery', () => {
  const storage = memoryStorage({ 'match_state_123': 'unowned', 'match-cache:v1:user:account-a:123': 'owned' });
  clearMatchCaches(storage, true);
  assert.equal(storage.getItem('match_state_123'), null);
  assert.equal(storage.getItem('match-cache:v1:user:account-a:123'), 'owned');
});