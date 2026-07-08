import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LruCache } from '../src/utils/lruCache.js';

test('LruCache evicts the oldest entry when maxSize is exceeded', () => {
  const cache = new LruCache(3);

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.size, 3);

  cache.set('d', 4);
  assert.equal(cache.size, 3);
  assert.equal(cache.get('a'), undefined); // evicted
  assert.equal(cache.get('d'), 4);
});

test('LruCache.get promotes the entry so it is not evicted next', () => {
  const cache = new LruCache(3);

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  // Access 'a' — promotes it to most-recently-used
  cache.get('a');

  // Insert a 4th entry — 'b' is now the oldest (least recently used)
  cache.set('d', 4);

  assert.equal(cache.get('a'), 1); // still present — was promoted
  assert.equal(cache.get('b'), undefined); // evicted — was the oldest
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.get('d'), 4);
});

test('LruCache.set on existing key updates value without growing size', () => {
  const cache = new LruCache(3);

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  cache.set('a', 100);

  assert.equal(cache.size, 3);
  assert.equal(cache.get('a'), 100);
});

test('LruCache.delete removes a specific entry', () => {
  const cache = new LruCache(5);

  cache.set('a', 1);
  cache.set('b', 2);

  assert.equal(cache.delete('a'), true);
  assert.equal(cache.delete('nonexistent'), false);
  assert.equal(cache.size, 1);
  assert.equal(cache.get('a'), undefined);
});

test('LruCache.clear empties the entire cache', () => {
  const cache = new LruCache(5);

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  cache.clear();

  assert.equal(cache.size, 0);
  assert.equal(cache.get('a'), undefined);
});

test('LruCache.has returns presence without promoting', () => {
  const cache = new LruCache(3);

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  // 'has' should not promote 'a'
  assert.equal(cache.has('a'), true);
  assert.equal(cache.has('nonexistent'), false);

  // Insert d — if 'has' promoted 'a', then 'b' would be evicted.
  // If 'has' did NOT promote, 'a' is still the oldest and gets evicted.
  cache.set('d', 4);
  assert.equal(cache.get('a'), undefined); // proves 'has' didn't promote
  assert.equal(cache.get('b'), 2);
});

test('LruCache size never exceeds maxSize under rapid sequential inserts', () => {
  const cache = new LruCache(10);

  for (let i = 0; i < 1000; i++) {
    cache.set(`key-${i}`, i);
    assert.ok(cache.size <= 10, `Size ${cache.size} exceeded maxSize 10 at iteration ${i}`);
  }

  assert.equal(cache.size, 10);
  // Only the last 10 keys should remain
  assert.equal(cache.get('key-990'), 990);
  assert.equal(cache.get('key-999'), 999);
  assert.equal(cache.get('key-0'), undefined);
});

test('LruCache.get returns undefined for missing keys without side effects', () => {
  const cache = new LruCache(3);

  assert.equal(cache.get('nonexistent'), undefined);
  assert.equal(cache.size, 0);
});

test('LruCache rejects invalid maxSize values', () => {
  assert.throws(() => new LruCache(0), /positive integer/);
  assert.throws(() => new LruCache(-1), /positive integer/);
  assert.throws(() => new LruCache(1.5), /positive integer/);
  assert.throws(() => new LruCache('10'), /positive integer/);
});
