import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  readCommandRegistrationEnv,
  readRuntimeEnv
} from '../src/config/env.js';

test('readRuntimeEnv returns trimmed runtime configuration values', () => {
  const env = readRuntimeEnv({
    DISCORD_TOKEN: ' token ',
    MONGO_URI: ' mongodb://localhost/world-tree ',
    NODE_ENV: 'test'
  });

  assert.deepEqual(env, {
    discordToken: 'token',
    mongoUri: 'mongodb://localhost/world-tree',
    clientId: null,
    guildId: null,
    botOwnerId: null,
    dashboardUrl: null,
    trustedAdminRoleIds: [],
    enableApi: false,
    apiPort: 3000,
    nodeEnv: 'test',
    isProduction: false,
    mongoServerSelectionTimeoutMs: 10000
  });
});

test('readRuntimeEnv does not require command registration-only values', () => {
  const env = readRuntimeEnv({
    DISCORD_TOKEN: 'token',
    MONGO_URI: 'mongodb://localhost/world-tree'
  });

  assert.equal(env.clientId, null);
  assert.equal(env.guildId, null);
});

test('readCommandRegistrationEnv does not require MongoDB configuration', () => {
  const env = readCommandRegistrationEnv({
    DISCORD_TOKEN: 'token',
    CLIENT_ID: 'client-id',
    GUILD_ID: 'guild-id'
  });

  assert.equal(env.discordToken, 'token');
  assert.equal(env.clientId, 'client-id');
  assert.equal(env.guildId, 'guild-id');
  assert.equal(env.mongoUri, null);
});

test('readRuntimeEnv reports runtime-specific missing environment variables', () => {
  assert.throws(
    () => readRuntimeEnv({ DISCORD_TOKEN: '', NODE_ENV: 'development' }),
    /Missing required environment variables: DISCORD_TOKEN, MONGO_URI/
  );
});

test('readCommandRegistrationEnv reports registration-specific missing environment variables', () => {
  assert.throws(
    () => readCommandRegistrationEnv({ DISCORD_TOKEN: 'token' }),
    /Missing required environment variables: CLIENT_ID, GUILD_ID/
  );
});

test('readRuntimeEnv rejects invalid MongoDB timeout values', () => {
  assert.throws(
    () => readRuntimeEnv({
      DISCORD_TOKEN: 'token',
      MONGO_URI: 'mongodb://localhost/world-tree',
      MONGO_SERVER_SELECTION_TIMEOUT_MS: 'slow'
    }),
    /MONGO_SERVER_SELECTION_TIMEOUT_MS must be a positive integer/
  );
});
