export const COLORS = Object.freeze({
  brand: 0x2f7d5c,
  success: 0x3f9f6b,
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
