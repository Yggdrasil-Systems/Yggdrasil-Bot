import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAppContext, getAppContext } from '../src/context/appContext.js';

test('createAppContext stores shared runtime dependencies', () => {
  const client = {};
  const context = createAppContext({
    client,
    config: { botOwnerId: 'owner' },
    settingsService: { name: 'settings' },
    noPrefixService: { name: 'no-prefix' },
    commands: new Map([['ping', { name: 'ping' }]])
  });

  assert.equal(context.client, client);
  assert.equal(context.runtimeConfig.botOwnerId, 'owner');
  assert.deepEqual(context.settingsService, { name: 'settings' });
  assert.deepEqual(context.noPrefixService, { name: 'no-prefix' });
  assert.equal(context.commands.get('ping').name, 'ping');
  assert.equal(getAppContext({ appContext: context }), context);
});
