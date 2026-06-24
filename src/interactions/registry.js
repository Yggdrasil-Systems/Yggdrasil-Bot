/**
 * @file Phase 2 prefix-keyed interaction handler registry.
 *
 * Interaction handlers export `{prefix, handle}` where:
 *   - `prefix` is a non-empty string used to match against `interaction.customId`.
 *   - `handle(interaction)` is the async function invoked by `dispatch`.
 *
 * The registry stores handlers in a `Map` keyed by `prefix`. `dispatch` walks
 * the registered handlers in insertion order and returns `true` as soon as a
 * handler reports it handled the interaction, or `false` if none match.
 *
 * Handler errors are intentionally NOT swallowed: callers (e.g. the command
 * router / interaction dispatcher) apply their own error policy around
 * `dispatch`.
 *
 * @module interactions/registry
 */

import assert from 'node:assert/strict';

const handlers = new Map();

/**
 * Register an interaction handler.
 *
 * @param {{prefix: string, handle: (interaction: import('discord.js').Interaction) => (boolean | Promise<boolean>)}} entry
 *   Handler entry. `prefix` must be a non-empty string; `handle` must be a function.
 * @returns {{prefix: string, handle: Function}} The stored entry.
 * @throws {TypeError} If `prefix` is not a non-empty string or `handle` is not a function.
 */
export function registerHandler({ prefix, handle } = {}) {
  assert.equal(typeof prefix, 'string', 'registerHandler: prefix must be a string');
  assert.ok(prefix.length > 0, 'registerHandler: prefix must be a non-empty string');
  assert.equal(typeof handle, 'function', 'registerHandler: handle must be a function');

  const entry = { prefix, handle };
  handlers.set(prefix, entry);
  return entry;
}

/**
 * Dispatch an interaction to registered handlers.
 *
 * Iterates handlers in insertion order, invoking each `handle(interaction)`.
 * Returns `true` as soon as a handler returns a truthy value. Returns `false`
 * if no handler reports a match. Errors raised by handlers are propagated to
 * the caller; they are not caught here.
 *
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>} `true` if a handler reported handling the interaction, otherwise `false`.
 */
export function dispatch(interaction) {
  return (async () => {
    for (const { handle } of handlers.values()) {
      const result = await handle(interaction);
      if (result) {
        return true;
      }
    }
    return false;
  })();
}

/**
 * Remove a handler by its prefix.
 *
 * @param {string} prefix
 * @returns {boolean} `true` if a handler was removed, `false` otherwise.
 */
export function unregisterHandler(prefix) {
  return handlers.delete(prefix);
}

/**
 * @returns {string[]} Snapshot of currently registered prefixes (in insertion order).
 */
export function getRegisteredPrefixes() {
  return [...handlers.keys()];
}

/**
 * @param {string} customId
 * @returns {boolean} `true` if any registered `prefix` is a prefix of `customId`.
 */
export function hasHandlerFor(customId) {
  if (typeof customId !== 'string' || customId.length === 0) {
    return false;
  }
  for (const prefix of handlers.keys()) {
    if (customId.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Clear every registered handler. Intended for tests only.
 *
 * @returns {void}
 */
export function _resetRegistryForTesting() {
  handlers.clear();
}
