import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const REQUIRED_ENV_KEYS = ['DISCORD_TOKEN', 'MONGO_URI', 'CLIENT_ID', 'GUILD_ID'];

function cleanValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function readEnv(source = process.env) {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !cleanValue(source[key]));

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  const nodeEnv = cleanValue(source.NODE_ENV) || 'development';

  return {
    discordToken: cleanValue(source.DISCORD_TOKEN),
    mongoUri: cleanValue(source.MONGO_URI),
    clientId: cleanValue(source.CLIENT_ID),
    guildId: cleanValue(source.GUILD_ID),
    nodeEnv,
    isProduction: nodeEnv === 'production'
  };
}

export function getEnv() {
  return readEnv();
}
