import { GatewayIntentBits } from 'discord.js';

// Message content powers prefix commands and automod. Guild members supports
// moderation/userinfo member fetches and role-aware permission checks.
export const CLIENT_INTENTS = Object.freeze([
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
]);

export const CLIENT_PARTIALS = Object.freeze([]);
