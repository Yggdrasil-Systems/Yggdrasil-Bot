export function createAutomodState({ maxEntries = 50_000 } = {}) {
  const repeatedMessages = new Map();

  // Run a sweep every 60 seconds to prune keys that have no active messages.
  // We use .unref() so this background timer doesn't keep the process alive.
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    const maxAgeMs = 65_000;

    for (const [key, entries] of repeatedMessages.entries()) {
      const activeEntries = entries.filter((entry) => now - entry.createdAt <= maxAgeMs);
      if (activeEntries.length === 0) {
        repeatedMessages.delete(key);
      } else if (activeEntries.length !== entries.length) {
        repeatedMessages.set(key, activeEntries);
      }
    }
  }, 60_000);

  if (typeof sweepInterval.unref === 'function') {
    sweepInterval.unref();
  }

  /**
   * Batch-evicts the oldest 10% of entries when the Map exceeds maxEntries.
   * Uses Map iteration order (insertion order) so the first keys are the oldest.
   *
   * Why 10%? One-at-a-time eviction on every set() adds per-message overhead.
   * Batch eviction amortizes the cost and prevents immediately re-hitting the cap.
   */
  function enforceMaxEntries() {
    if (repeatedMessages.size <= maxEntries) {
      return;
    }

    const evictCount = Math.max(1, Math.ceil(maxEntries * 0.1));
    const iterator = repeatedMessages.keys();

    for (let i = 0; i < evictCount; i++) {
      const next = iterator.next();
      if (next.done) break;
      repeatedMessages.delete(next.value);
    }
  }

  let disposed = false;

  return {
    getRepeatedMessages(key) {
      return repeatedMessages.get(key) ?? [];
    },

    setRepeatedMessages(key, entries) {
      repeatedMessages.set(key, entries);
      enforceMaxEntries();
    },

    clear() {
      repeatedMessages.clear();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      clearInterval(sweepInterval);
      repeatedMessages.clear();
    },

    /** Exposed for monitoring/testing only. */
    get size() {
      return repeatedMessages.size;
    }
  };
}

export const automodState = createAutomodState();
