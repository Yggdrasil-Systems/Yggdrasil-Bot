import { GatewayIntentBits } from 'discord.js';

// Message content powers prefix commands and automod. Guild members supports
// moderation/userinfo member fetches and role-aware permission checks.
//
// GuildPresences powers activity roles (Spotify, streaming, gaming). It must
// also be enabled in the Discord Developer Portal under Privileged Gateway
// Intents or Discord will not send presence updates.
export const CLIENT_INTENTS = Object.freeze([
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences
]);

export const CLIENT_PARTIALS = Object.freeze([]);
