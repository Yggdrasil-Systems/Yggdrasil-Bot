import { GatewayIntentBits } from 'discord.js';

// Message content powers prefix commands and automod. Guild members supports
// moderation/userinfo member fetches and role-aware permission checks.
//
// GuildPresences is NOT included by default because it is a privileged intent.
// If you want activity roles (Spotify, streaming, gaming), you must:
//
//   1. Enable "Presence Intent" in the Discord Developer Portal
//   2. Add GatewayIntentBits.GuildPresences to this array
//
// Without this intent, the bot will start fine but activity roles will not work.
export const CLIENT_INTENTS = Object.freeze([
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates
]);

export const CLIENT_PARTIALS = Object.freeze([]);
