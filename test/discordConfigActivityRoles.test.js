import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GatewayIntentBits } from 'discord.js';

import { CLIENT_INTENTS } from '../src/config/discord.js';

test('client intents do NOT include privileged presence intent by default', () => {
  assert.equal(CLIENT_INTENTS.includes(GatewayIntentBits.GuildPresences), false);
});

test('client intents include all non-privileged gateway intents', () => {
  assert.equal(CLIENT_INTENTS.includes(GatewayIntentBits.Guilds), true);
  assert.equal(CLIENT_INTENTS.includes(GatewayIntentBits.GuildMembers), true);
  assert.equal(CLIENT_INTENTS.includes(GatewayIntentBits.GuildMessages), true);
  assert.equal(CLIENT_INTENTS.includes(GatewayIntentBits.MessageContent), true);
  assert.equal(CLIENT_INTENTS.includes(GatewayIntentBits.GuildVoiceStates), true);
});
