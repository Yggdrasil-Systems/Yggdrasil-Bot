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

  logger.info(`Registering ${commandPayload.length} guild slash command(s).`);

  await rest.put(
    Routes.applicationGuildCommands(env.clientId, env.guildId),
    { body: commandPayload }
  );

  logger.info('Slash commands registered.');
}

registerCommands().catch((error) => {
  logger.error('Failed to register slash commands.', error);
  process.exit(1);
});
