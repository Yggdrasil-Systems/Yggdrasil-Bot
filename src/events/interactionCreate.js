import { Events } from 'discord.js';

import { handleInteractionError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`No command handler found for /${interaction.commandName}.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    await handleInteractionError(interaction, error);
  }
}
