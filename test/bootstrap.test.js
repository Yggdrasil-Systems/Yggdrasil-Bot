import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Collection } from 'discord.js';

import { bootstrap } from '../src/bootstrap.js';

test('bootstrap initializes database, commands, events, then logs in', async () => {
  const calls = [];
  const client = {
    commands: new Collection(),
    login: async (token) => calls.push(['login', token]),
    incrementMaxListeners: () => {},
    on: () => {},
    options: {},
    guilds: { resolveId: (id) => id }
  };

  const result = await bootstrap({
    env: {
      discordToken: 'token',
      mongoUri: 'mongodb://localhost/world-tree',
      nodeEnv: 'test',
      mongoServerSelectionTimeoutMs: 5000
    },
    client,
    commandsPath: 'commands',
    eventsPath: 'events',
    connectDatabase: async (mongoUri, options) => calls.push(['database', mongoUri, options]),
    loadCommandCollection: async () => {
      calls.push(['commands']);
      return new Collection([['ping', { data: { name: 'ping' } }]]);
    },
    loadEventHandlers: async () => {
      calls.push(['events']);
      return 2;
    },
    log: { info() {}, error() {} }
  });

  assert.deepEqual(calls, [
    ['database', 'mongodb://localhost/world-tree', { serverSelectionTimeoutMS: 5000 }],
    ['commands'],
    ['events'],
    ['login', 'token']
  ]);
  assert.equal(result.commandCount, 1);
  assert.equal(result.eventCount, 2);
});
