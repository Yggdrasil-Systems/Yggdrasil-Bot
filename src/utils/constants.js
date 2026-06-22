export const COLORS = Object.freeze({
  brand: 0x00ffff,
  tree: 0x2bce5c,
  success: 0x2bce5c,
  warning: 0xd6a84f,
  error: 0xc75c5c,
  neutral: 0x58636f
});

export const BOT = Object.freeze({
  name: 'World Tree',
  prefix: 'tree',
  activity: 'over the server'
});

export const COMMANDS_PATH = 'src/commands';
export const EVENTS_PATH = 'src/events';

export const LIMITS = Object.freeze({
  maxPurgeAmount: 100
});

export const AUTOMOD_RULES = Object.freeze({
  badWords: 'badWords',
  mentionSpam: 'mentionSpam',
  repeatSpam: 'repeatSpam',
  linkSpam: 'linkSpam',
  capsSpam: 'capsSpam'
});

export const AUTOMOD_ACTIONS = Object.freeze({
  delete: 'delete',
  warn: 'warn',
  timeout: 'timeout'
});

export const DEFAULT_AUTOMOD = Object.freeze({
  enabled: false,
  logActions: true,
  ignoredChannelIds: [],
  ignoredRoleIds: [],
  rules: {
    badWords: {
      enabled: false,
      words: [],
      punishment: { action: AUTOMOD_ACTIONS.warn, timeoutDuration: '10m' }
    },
    mentionSpam: {
      enabled: true,
      threshold: 5,
      windowSeconds: 10,
      punishment: { action: AUTOMOD_ACTIONS.warn, timeoutDuration: '10m' }
    },
    repeatSpam: {
      enabled: true,
      threshold: 4,
      windowSeconds: 12,
      punishment: { action: AUTOMOD_ACTIONS.delete, timeoutDuration: '10m' }
    },
    linkSpam: {
      enabled: false,
      allowList: [],
      punishment: { action: AUTOMOD_ACTIONS.delete, timeoutDuration: '10m' }
    },
    capsSpam: {
      enabled: true,
      minLength: 16,
      ratio: 0.75,
      punishment: { action: AUTOMOD_ACTIONS.delete, timeoutDuration: '10m' }
    }
  }
});

export const DEFAULT_MODERATION_SETTINGS = Object.freeze({
  requireReason: true,
  caseLogEnabled: true
});

export const ACTIVITY_TYPES = Object.freeze({
  spotify: 'spotify',
  streaming: 'streaming',
  gaming: 'gaming',
  voice: 'voice'
});

export const DEFAULT_ACTIVITY_ROLES = Object.freeze({
  spotify: { enabled: false, roleId: null },
  streaming: { enabled: false, roleId: null },
  gaming: { enabled: false, roleId: null },
  voice: { enabled: false, roleId: null }
});

export const ACTIVITY_TYPE_LABELS = Object.freeze({
  spotify: '🟢 Spotify',
  streaming: '🔴 Streaming',
  gaming: '🎮 Gaming',
  voice: '🔊 Voice Channel'
});

export const ACTIVITY_TYPE_DESCRIPTIONS = Object.freeze({
  spotify: 'Granted when listening to Spotify',
  streaming: 'Granted when streaming (Twitch, YouTube)',
  gaming: 'Granted when playing a game',
  voice: 'Granted when connected to a voice channel'
});
