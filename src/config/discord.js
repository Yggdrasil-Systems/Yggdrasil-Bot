import { GatewayIntentBits } from 'discord.js';

// Message content powers prefix commands and automod. Guild members supports
// moderation/userinfo member fetches and role-aware permission checks.
//
// GuildPresences is a privileged intent required for activity roles
// (Spotify, streaming, gaming detection). It must also be enabled in
// the Discord Developer Portal under Bot → Privileged Gateway Intents.
export const CLIENT_INTENTS = Object.freeze([
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences
]);

export const CLIENT_PARTIALS = Object.freeze([]);
