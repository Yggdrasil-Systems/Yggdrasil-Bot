import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from './client.js';
import { getRuntimeEnv } from './config/env.js';
import { connectMongo } from './database/mongo/connection.js';
import { loadCommands } from './loaders/commandLoader.js';
import { loadEvents } from './loaders/eventLoader.js';
import { createNoPrefixService } from './services/noPrefixService.js';
import { settingsService } from './services/settingsService.js';
import { initializePlayer } from './services/musicService.js';
import { BOT } from './utils/constants.js';
import { logger } from './utils/logger.js';
import { createServer } from './api/server.js';

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
  client.settingsService = settingsService;
  client.noPrefixService = createNoPrefixService(undefined, { botOwnerId: env.botOwnerId });

  await connectDatabase(env.mongoUri, {
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs
  });

  client.commands = await loadCommandCollection(commandsPath);
  const eventCount = await loadEventHandlers(client, eventsPath);

  log.info(`Loaded ${client.commands.size} command(s) and ${eventCount} event handler(s).`);

  await initializePlayer(client);

  await client.login(env.discordToken);

  let apiServer = null;
  if (env.enableApi) {
    apiServer = await createServer(client, { env, rateLimit: env.rateLimit });
    await apiServer.listen({ port: env.apiPort, host: '0.0.0.0' });
    log.info(`API Server listening on port ${env.apiPort}`);
  }

  return {
    client,
    apiServer,
    commandCount: client.commands.size,
    eventCount
  };
}
