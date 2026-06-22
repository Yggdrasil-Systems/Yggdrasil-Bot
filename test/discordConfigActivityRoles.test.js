import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GatewayIntentBits } from 'discord.js';

import { CLIENT_INTENTS } from '../src/config/discord.js';

test('client intents include privileged presence intent for activity roles', () => {
  assert.equal(CLIENT_INTENTS.includes(GatewayIntentBits.GuildPresences), true);
});
