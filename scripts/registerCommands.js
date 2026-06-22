import { REST, Routes } from 'discord.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandRegistrationEnv } from '../src/config/env.js';
import { loadCommands } from '../src/loaders/commandLoader.js';
import { logger } from '../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const commandsPath = path.join(projectRoot, 'src', 'commands');

async function registerCommands() {
  const env = getCommandRegistrationEnv();
  const commands = await loadCommands(commandsPath);
  const commandPayload = commands
    .filter((command) => command.data)
    .map((command) => command.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(env.discordToken);

  if (env.isProduction) {
    logger.info(`Registering ${commandPayload.length} global slash command(s).`);
    logger.info('This will make commands available in all servers. Propagation may take up to 1 hour.');

    await rest.put(
      Routes.applicationCommands(env.clientId),
      { body: commandPayload }
    );

    logger.info('Global slash commands registered successfully.');
  } else {
    const targetGuildId = env.devGuildId;

    logger.info(`Registering ${commandPayload.length} guild slash command(s) for development guild ${targetGuildId}.`);
    logger.info('Guild commands update instantly — no propagation delay.');

    await rest.put(
      Routes.applicationGuildCommands(env.clientId, targetGuildId),
      { body: commandPayload }
    );

    logger.info('Guild slash commands registered successfully.');
  }
}

registerCommands().catch((error) => {
  logger.error('Failed to register slash commands.', error);
  process.exit(1);
});
