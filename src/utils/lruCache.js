/**
 * A simple, zero-dependency LRU (Least Recently Used) cache backed by a Map.
 *
 * JavaScript Maps preserve insertion order, so by deleting and re-inserting a
 * key on every `get`, the accessed key moves to the "end" (most recent).
 * `Map.keys().next().value` gives us the "start" (least recently used).
 *
 * This is the same pattern used by Node.js core and major libraries.
 *
 * @example
 * const cache = new LruCache(100);
 * cache.set('guild-123', { settings: { ... }, expiresAt: Date.now() + 30000 });
 * cache.get('guild-123'); // promotes to most-recently-used
 */
export class LruCache {
  #map;
  #maxSize;

  /**
   * @param {number} maxSize - Maximum number of entries. Must be a positive integer.
   */
  constructor(maxSize) {
    if (!Number.isInteger(maxSize) || maxSize <= 0) {
      throw new Error('LruCache maxSize must be a positive integer.');
    }

    this.#map = new Map();
    this.#maxSize = maxSize;
  }

  /**
   * Returns the value for `key` and promotes it to most-recently-used.
   * Returns `undefined` if the key is not present.
   */
  get(key) {
    if (!this.#map.has(key)) {
      return undefined;
    }

    const value = this.#map.get(key);

    // Delete and re-insert to move this key to the end (most recent)
    this.#map.delete(key);
    this.#map.set(key, value);

    return value;
  }

  /**
   * Sets `key` to `value`. If the cache exceeds `maxSize`, the least recently
   * used entry is evicted.
   */
  set(key, value) {
    // If the key already exists, delete it first so re-insert refreshes
    // its position without increasing the size.
    if (this.#map.has(key)) {
      this.#map.delete(key);
    }

    this.#map.set(key, value);

    // Evict the oldest entry if we exceeded capacity
    if (this.#map.size > this.#maxSize) {
      const oldest = this.#map.keys().next().value;
      this.#map.delete(oldest);
    }
  }

  /**
   * Removes `key` from the cache.
   * @returns {boolean} `true` if the key was present and removed.
   */
  delete(key) {
    return this.#map.delete(key);
  }

  /**
   * Returns the current number of entries in the cache.
   */
  get size() {
    return this.#map.size;
  }

  /**
   * Removes all entries from the cache.
   */
  clear() {
    this.#map.clear();
  }

  /**
   * Returns `true` if the cache contains `key`.
   * Does NOT promote the key (peek behavior).
   */
  has(key) {
    return this.#map.has(key);
  }
}
