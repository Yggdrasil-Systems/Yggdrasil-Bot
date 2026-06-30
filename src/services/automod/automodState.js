export function createAutomodState() {
  const repeatedMessages = new Map();

  // Run a sweep every 60 seconds to prune keys that have no active messages.
  // We use .unref() so this background timer doesn't keep the process alive.
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    const maxAgeMs = 60_000;

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

  return {
    getRepeatedMessages(key) {
      return repeatedMessages.get(key) ?? [];
    },

    setRepeatedMessages(key, entries) {
      repeatedMessages.set(key, entries);
    },

    clear() {
      repeatedMessages.clear();
    }
  };
}

export const automodState = createAutomodState();
