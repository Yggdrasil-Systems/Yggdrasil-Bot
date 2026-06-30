import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GatewayIntentBits } from 'discord.js';

import { createClient } from './client.js';
import { getRuntimeEnv } from './config/env.js';
import { createAppContext } from './context/appContext.js';
import { connectMongo } from './database/mongo/connection.js';
import { loadCommands } from './loaders/commandLoader.js';
import { loadEvents } from './loaders/eventLoader.js';
import { createNoPrefixService } from './services/noPrefixService.js';
import { createPlayerService } from './services/playerService.js';
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
  const playerService = createPlayerService();
  const appContext = createAppContext({
    client,
    config: env,
    settingsService,
    noPrefixService: createNoPrefixService(undefined, { botOwnerId: env.botOwnerId }),
    logger: log,
    commands: client.commands,
    playerService
  });

  client.appContext = appContext;

  await connectDatabase(env.mongoUri, {
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs
  });

  client.commands = await loadCommandCollection(commandsPath);
  client.appContext.commands = client.commands;
  const eventCount = await loadEventHandlers(client, eventsPath);

  log.info(`Loaded ${client.commands.size} command(s) and ${eventCount} event handler(s).`);

  if (!client.options?.intents?.has(GatewayIntentBits.GuildPresences)) {
    const logWarn = (msg) => {
      if (typeof log?.warn === 'function') {
        log.warn(msg);
      }
    };
    logWarn('╔════════════════════════════════════════════════════════════════╗');
    logWarn('║  Activity roles are disabled because Presence Intent is        ║');
    logWarn('║  not enabled on the Discord Client.                            ║');
    logWarn('║  To enable them:                                               ║');
    logWarn('║  1. Go to https://discord.com/developers/applications          ║');
    logWarn('║  2. Toggle "PRESENCE INTENT" to ON                             ║');
    logWarn('║  3. Add GatewayIntentBits.GuildPresences to CLIENT_INTENTS     ║');
    logWarn('║     in src/config/discord.js                                     ║');
    logWarn('╚════════════════════════════════════════════════════════════════╝');
  }

  await initializePlayer(client, playerService);

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
    appContext: client.appContext,
    commandCount: client.commands.size,
    eventCount
  };
}
