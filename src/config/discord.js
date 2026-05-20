import { GatewayIntentBits } from 'discord.js';

// Keep Phase 1 minimal. Message and member intents should be added only when
// automod or member lifecycle features are implemented.
export const CLIENT_INTENTS = Object.freeze([
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
]);

export const CLIENT_PARTIALS = Object.freeze([]);
