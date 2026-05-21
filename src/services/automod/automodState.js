export function createAutomodState() {
  const repeatedMessages = new Map();

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
