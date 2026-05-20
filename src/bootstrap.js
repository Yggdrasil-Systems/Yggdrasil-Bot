import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from './client.js';
import { getRuntimeEnv } from './config/env.js';
import { connectMongo } from './database/mongo/connection.js';
import { loadCommands } from './loaders/commandLoader.js';
import { loadEvents } from './loaders/eventLoader.js';
import { BOT } from './utils/constants.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultCommandsPath = path.join(__dirname, 'commands');
const defaultEventsPath = path.join(__dirname, 'events');

export async function bootstrap({
  env = getRuntimeEnv(),
  client = createClient(),
  commandsPath = defaultCommandsPath,
  eventsPath = defaultEventsPath,
  connectDatabase = connectMongo,
  loadCommandCollection = loadCommands,
  loadEventHandlers = loadEvents,
  log = logger
} = {}) {
  log.info(`Starting ${BOT.name} in ${env.nodeEnv} mode.`);
  client.runtimeConfig = env;

  await connectDatabase(env.mongoUri, {
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs
  });

  client.commands = await loadCommandCollection(commandsPath);
  const eventCount = await loadEventHandlers(client, eventsPath);

  log.info(`Loaded ${client.commands.size} command(s) and ${eventCount} event handler(s).`);

  await client.login(env.discordToken);

  return {
    client,
    commandCount: client.commands.size,
    eventCount
  };
}
