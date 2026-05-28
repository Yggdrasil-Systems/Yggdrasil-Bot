import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS = 10000;
const MIN_SESSION_SECRET_LENGTH = 32;

const ENV_PROFILES = Object.freeze({
  core: ['DISCORD_TOKEN'],
  runtime: ['DISCORD_TOKEN', 'MONGO_URI'],
  commandRegistration: ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID']
});

function cleanValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readPositiveInteger(source, key, defaultValue) {
  const rawValue = cleanValue(source[key]);

  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsedValue;
}

function readCsv(source, key) {
  return cleanValue(source[key])
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function requireWhenApiEnabled(source, enableApi) {
  if (!enableApi) {
    return;
  }

  const requiredKeys = ['SESSION_SECRET', 'DISCORD_CLIENT_SECRET', 'DASHBOARD_ORIGIN'];
  const missingKeys = requiredKeys.filter((key) => !cleanValue(source[key]));

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }
}

function readSessionSecret(source) {
  const sessionSecret = cleanValue(source.SESSION_SECRET);

  if (sessionSecret && sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters.`);
  }

  return sessionSecret || null;
}

export function readEnv(source = process.env, profile = 'runtime') {
  const requiredKeys = ENV_PROFILES[profile];

  if (!requiredKeys) {
    throw new Error(`Unknown environment profile: ${profile}`);
  }

  const missingKeys = requiredKeys.filter((key) => !cleanValue(source[key]));

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  const enableApi = cleanValue(source.ENABLE_API) === 'true';

  requireWhenApiEnabled(source, enableApi);

  const nodeEnv = cleanValue(source.NODE_ENV) || 'development';

  return {
    discordToken: cleanValue(source.DISCORD_TOKEN),
    mongoUri: cleanValue(source.MONGO_URI) || null,
    clientId: cleanValue(source.CLIENT_ID) || null,
    guildId: cleanValue(source.GUILD_ID) || null,
    botOwnerId: cleanValue(source.BOT_OWNER_ID) || null,
    dashboardUrl: cleanValue(source.DASHBOARD_URL) || null,
    dashboardOrigin: cleanValue(source.DASHBOARD_ORIGIN) || null,
    discordClientSecret: cleanValue(source.DISCORD_CLIENT_SECRET) || null,
    sessionSecret: readSessionSecret(source),
    trustedAdminRoleIds: readCsv(source, 'TRUSTED_ADMIN_ROLE_IDS'),
    enableApi,
    apiPort: readPositiveInteger(source, 'API_PORT', 3000),
    nodeEnv,
    isProduction: nodeEnv === 'production',
    mongoServerSelectionTimeoutMs: readPositiveInteger(
      source,
      'MONGO_SERVER_SELECTION_TIMEOUT_MS',
      DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS
    )
  };
}

export function readCoreEnv(source = process.env) {
  return readEnv(source, 'core');
}

export function readRuntimeEnv(source = process.env) {
  return readEnv(source, 'runtime');
}

export function readCommandRegistrationEnv(source = process.env) {
  return readEnv(source, 'commandRegistration');
}

export function getRuntimeEnv() {
  return readRuntimeEnv();
}

export function getCommandRegistrationEnv() {
  return readCommandRegistrationEnv();
}

export function getEnv() {
  return getRuntimeEnv();
}
