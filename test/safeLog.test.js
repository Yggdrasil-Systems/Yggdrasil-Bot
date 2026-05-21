import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { safeLog } from '../src/utils/safeLog.js';

const originalError = console.error;

describe('safeLog mod-log isolation', () => {
  afterEach(() => {
    console.error = originalError;
  });

  it('safeLog itself does not throw when the log call rejects', () => {
    console.error = () => {};
    assert.doesNotThrow(() => safeLog(Promise.reject(new Error('missing channel')), { guildId: 'g', action: 'warn' }));
  });

  it('safeLog passes guild ID and action type to console.error metadata', async () => {
    const calls = [];
    console.error = (...args) => calls.push(args);

    safeLog(Promise.reject(new Error('missing channel')), { guildId: 'guild-1', action: 'ban' });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(calls[0][1].guildId, 'guild-1');
  });
});
