import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  registerHandler,
  dispatch,
  unregisterHandler,
  getRegisteredPrefixes,
  hasHandlerFor,
  _resetRegistryForTesting
} from '../src/interactions/registry.js';

beforeEach(() => {
  _resetRegistryForTesting();
});

// ---------------------------------------------------------------------------
// (1) registerHandler adds to the registry
// ---------------------------------------------------------------------------

test('registerHandler adds the prefix to the registry', () => {
  registerHandler({ prefix: 'foo_', handle: () => true });

  const prefixes = getRegisteredPrefixes();
  assert.equal(prefixes.length, 1);
  assert.equal(prefixes[0], 'foo_');
  assert.equal(hasHandlerFor('foo_button1'), true);
});

test('registerHandler returns the stored entry', () => {
  const handle = () => true;
  const entry = registerHandler({ prefix: 'bar_', handle });

  assert.equal(typeof entry, 'object');
  assert.equal(entry.prefix, 'bar_');
  assert.equal(entry.handle, handle);
});

test('registerHandler records multiple prefixes in insertion order', () => {
  registerHandler({ prefix: 'a_', handle: () => true });
  registerHandler({ prefix: 'b_', handle: () => false });
  registerHandler({ prefix: 'c_', handle: () => true });

  assert.deepEqual(getRegisteredPrefixes(), ['a_', 'b_', 'c_']);
});

// ---------------------------------------------------------------------------
// (2) dispatch calls the matching handler
// ---------------------------------------------------------------------------

test('dispatch invokes the handler whose prefix matches customId', async () => {
  let received = null;
  registerHandler({
    prefix: 'foo_',
    handle: (interaction) => {
      received = interaction;
      return true;
    }
  });

  const interaction = { customId: 'foo_button1' };
  await dispatch(interaction);

  assert.ok(received, 'expected the registered handler to be invoked');
  assert.equal(received.customId, 'foo_button1');
});

test('dispatch forwards the interaction object verbatim to the handler', async () => {
  let captured = null;
  const interaction = { customId: 'foo_x', extra: { payload: 42 } };

  registerHandler({
    prefix: 'foo_',
    handle: (i) => {
      captured = i;
      return true;
    }
  });

  await dispatch(interaction);

  assert.equal(captured, interaction);
});

// ---------------------------------------------------------------------------
// (3) dispatch returns the boolean the handler returned
// ---------------------------------------------------------------------------

test('dispatch returns true when the only handler returns true', async () => {
  registerHandler({ prefix: 'foo_', handle: () => true });

  const result = await dispatch({ customId: 'foo_x' });
  assert.equal(result, true);
});

test('dispatch returns false when the only handler returns false', async () => {
  registerHandler({ prefix: 'foo_', handle: () => false });

  const result = await dispatch({ customId: 'foo_x' });
  assert.equal(result, false);
});

test('dispatch returns true when at least one handler returns true', async () => {
  registerHandler({
    prefix: 'foo_',
    handle: (interaction) => {
      if (!interaction.customId.startsWith('foo_')) return false;
      return false;
    }
  });
  registerHandler({
    prefix: 'foo2_',
    handle: (interaction) => {
      if (!interaction.customId.startsWith('foo2_')) return false;
      return true;
    }
  });

  // customId matches 'foo_' (returns false) and then walks to next; 'foo2_' does not match.
  const result = await dispatch({ customId: 'foo_bar' });
  assert.equal(result, false);

  const result2 = await dispatch({ customId: 'foo2_bar' });
  assert.equal(result2, true);
});

// ---------------------------------------------------------------------------
// (4) dispatch returns false when no handler matches
// ---------------------------------------------------------------------------

test('dispatch returns false when no handler is registered', async () => {
  const result = await dispatch({ customId: 'whatever' });
  assert.equal(result, false);
});

test('dispatch returns false when customId does not match any prefix', async () => {
  registerHandler({
    prefix: 'foo_',
    handle: (interaction) => {
      if (!interaction.customId.startsWith('foo_')) return false;
      return true;
    }
  });
  registerHandler({
    prefix: 'bar_',
    handle: (interaction) => {
      if (!interaction.customId.startsWith('bar_')) return false;
      return true;
    }
  });

  const result = await dispatch({ customId: 'baz_qux' });
  assert.equal(result, false);
});

// ---------------------------------------------------------------------------
// Additional coverage: unregisterHandler
// ---------------------------------------------------------------------------

test('unregisterHandler removes the prefix from the registry', () => {
  registerHandler({ prefix: 'foo_', handle: () => true });

  assert.equal(unregisterHandler('foo_'), true);
  assert.deepEqual(getRegisteredPrefixes(), []);
  assert.equal(hasHandlerFor('foo_x'), false);
});

test('unregisterHandler returns false when prefix is not registered', () => {
  registerHandler({ prefix: 'foo_', handle: () => true });

  assert.equal(unregisterHandler('not_registered'), false);
  assert.deepEqual(getRegisteredPrefixes(), ['foo_']);
});

test('after unregister, dispatch no longer invokes the handler', async () => {
  let calls = 0;
  registerHandler({
    prefix: 'foo_',
    handle: () => {
      calls += 1;
      return true;
    }
  });

  await dispatch({ customId: 'foo_1' });
  assert.equal(calls, 1);

  unregisterHandler('foo_');

  const result = await dispatch({ customId: 'foo_2' });
  assert.equal(result, false);
  assert.equal(calls, 1, 'handler should not be called after unregister');
});

// ---------------------------------------------------------------------------
// Additional coverage: hasHandlerFor edge cases
// ---------------------------------------------------------------------------

test('hasHandlerFor returns false for empty customId', () => {
  registerHandler({ prefix: 'foo_', handle: () => true });

  assert.equal(hasHandlerFor(''), false);
});

test('hasHandlerFor returns false for non-string customId', () => {
  registerHandler({ prefix: 'foo_', handle: () => true });

  assert.equal(hasHandlerFor(undefined), false);
  assert.equal(hasHandlerFor(null), false);
  assert.equal(hasHandlerFor(42), false);
  assert.equal(hasHandlerFor({}), false);
});

test('hasHandlerFor returns false for a string that does not start with any prefix', () => {
  registerHandler({ prefix: 'foo_', handle: () => true });
  registerHandler({ prefix: 'bar_', handle: () => true });

  assert.equal(hasHandlerFor('baz_qux'), false);
  assert.equal(hasHandlerFor('fo'), false, 'partial-prefix match must not count');
});

test('hasHandlerFor returns true for customId that starts with a registered prefix', () => {
  registerHandler({ prefix: 'foo_', handle: () => true });

  assert.equal(hasHandlerFor('foo_'), true, 'exact-prefix string is a valid match');
  assert.equal(hasHandlerFor('foo_long_custom_id'), true);
});

// ---------------------------------------------------------------------------
// Additional coverage: registerHandler input validation
// ---------------------------------------------------------------------------

test('registerHandler throws when prefix is an empty string', () => {
  assert.throws(() => registerHandler({ prefix: '', handle: () => true }), /prefix must be a non-empty string/);
});

test('registerHandler throws when prefix is not a string', () => {
  assert.throws(() => registerHandler({ prefix: 123, handle: () => true }), /prefix must be a string/);

  assert.throws(() => registerHandler({ prefix: null, handle: () => true }), /prefix must be a string/);

  assert.throws(() => registerHandler({ prefix: undefined, handle: () => true }), /prefix must be a string/);
});

test('registerHandler throws when handle is not a function', () => {
  assert.throws(() => registerHandler({ prefix: 'foo_', handle: 'not a function' }), /handle must be a function/);

  assert.throws(() => registerHandler({ prefix: 'foo_', handle: null }), /handle must be a function/);

  assert.throws(() => registerHandler({ prefix: 'foo_', handle: 42 }), /handle must be a function/);
});

test('registerHandler throws when called with no argument', () => {
  assert.throws(() => registerHandler(), /prefix must be a string/);
});

// ---------------------------------------------------------------------------
// Additional coverage: dispatch insertion-order short-circuit
// ---------------------------------------------------------------------------

test('dispatch returns true on the FIRST matching handler and skips later matches', async () => {
  const calls = [];
  registerHandler({
    prefix: 'foo_',
    handle: (interaction) => {
      calls.push('first');
      return true;
    }
  });
  registerHandler({
    prefix: 'foo2_',
    handle: (interaction) => {
      calls.push('second');
      return true;
    }
  });

  // 'foo_bar' matches 'foo_' (first handler). Second handler would also match
  // 'foo_bar' if checked, but it must not be invoked because the first returned true.
  const result = await dispatch({ customId: 'foo_bar' });
  assert.equal(result, true);
  assert.deepEqual(calls, ['first']);
});

test('dispatch walks every registered handler in insertion order until one returns true', async () => {
  const calls = [];
  registerHandler({
    prefix: 'a_',
    handle: () => {
      calls.push('a');
      return false;
    }
  });
  registerHandler({
    prefix: 'b_',
    handle: () => {
      calls.push('b');
      return false;
    }
  });
  registerHandler({
    prefix: 'c_',
    handle: () => {
      calls.push('c');
      return true;
    }
  });

  const result = await dispatch({ customId: 'c_button' });
  assert.equal(result, true);
  assert.deepEqual(calls, ['a', 'b', 'c']);
});

test('dispatch returns false when all registered handlers return false', async () => {
  const calls = [];
  registerHandler({
    prefix: 'a_',
    handle: () => {
      calls.push('a');
      return false;
    }
  });
  registerHandler({
    prefix: 'b_',
    handle: () => {
      calls.push('b');
      return false;
    }
  });

  const result = await dispatch({ customId: 'b_button' });
  assert.equal(result, false);
  assert.deepEqual(calls, ['a', 'b']);
});

// ---------------------------------------------------------------------------
// Additional coverage: async handlers
// ---------------------------------------------------------------------------

test('dispatch awaits async handlers and propagates their boolean result', async () => {
  registerHandler({
    prefix: 'foo_',
    handle: async (interaction) => {
      // Simulate an async operation (e.g. network call to Discord API).
      await Promise.resolve();
      await new Promise((resolve) => setImmediate(resolve));
      return true;
    }
  });

  const result = await dispatch({ customId: 'foo_button' });
  assert.equal(result, true);
});

test('dispatch awaits async handlers that return false', async () => {
  registerHandler({
    prefix: 'foo_',
    handle: async () => {
      await new Promise((resolve) => setImmediate(resolve));
      return false;
    }
  });

  const result = await dispatch({ customId: 'foo_button' });
  assert.equal(result, false);
});

// ---------------------------------------------------------------------------
// Additional coverage: _resetRegistryForTesting
// ---------------------------------------------------------------------------

test('_resetRegistryForTesting empties the registry', () => {
  registerHandler({ prefix: 'a_', handle: () => true });
  registerHandler({ prefix: 'b_', handle: () => true });

  assert.equal(getRegisteredPrefixes().length, 2);

  _resetRegistryForTesting();

  assert.deepEqual(getRegisteredPrefixes(), []);
  assert.equal(hasHandlerFor('a_x'), false);
  assert.equal(hasHandlerFor('b_x'), false);
});
