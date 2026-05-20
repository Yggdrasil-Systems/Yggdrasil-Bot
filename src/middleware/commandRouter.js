import { buildErrorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { replyToInteraction } from '../utils/responses.js';
import { handleInteractionError } from './errorHandler.js';

async function handleUnknownCommand(interaction, log) {
  log.warn(`No command handler found for /${interaction.commandName}.`);

  await replyToInteraction(
    interaction,
    {
      embeds: [
        buildErrorEmbed(
          'Command unavailable',
          'That command is not available right now. Try registering slash commands again.'
        )
      ]
    },
    { ephemeral: true }
  );
}

export async function handleChatInputCommand(interaction, { log = logger } = {}) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    await handleUnknownCommand(interaction, log);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    await handleInteractionError(interaction, error);
  }
}
