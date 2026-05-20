import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from './client.js';
import { getEnv } from './config/env.js';
import { connectMongo } from './database/mongo/connection.js';
import { loadCommands } from './loaders/commandLoader.js';
import { loadEvents } from './loaders/eventLoader.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');
const eventsPath = path.join(__dirname, 'events');

async function bootstrap() {
  const env = getEnv();
  const client = createClient();

  await connectMongo(env.mongoUri);

  client.commands = await loadCommands(commandsPath);
  const eventCount = await loadEvents(client, eventsPath);

  logger.info(`Loaded ${client.commands.size} command(s) and ${eventCount} event(s).`);

  await client.login(env.discordToken);
}

bootstrap().catch((error) => {
  logger.error('World Tree failed to start.', error);
  process.exit(1);
});
