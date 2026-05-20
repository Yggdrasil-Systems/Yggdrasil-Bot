import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readEnv } from '../src/config/env.js';

test('readEnv returns trimmed required configuration values', () => {
  const env = readEnv({
    DISCORD_TOKEN: ' token ',
    MONGO_URI: ' mongodb://localhost/world-tree ',
    CLIENT_ID: ' client-id ',
    GUILD_ID: ' guild-id ',
    NODE_ENV: 'test'
  });

  assert.deepEqual(env, {
    discordToken: 'token',
    mongoUri: 'mongodb://localhost/world-tree',
    clientId: 'client-id',
    guildId: 'guild-id',
    nodeEnv: 'test',
    isProduction: false
  });
});

test('readEnv reports all missing required environment variables', () => {
  assert.throws(
    () => readEnv({ DISCORD_TOKEN: '', NODE_ENV: 'development' }),
    /Missing required environment variables: DISCORD_TOKEN, MONGO_URI, CLIENT_ID, GUILD_ID/
  );
});
