import { buildErrorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export async function handleInteractionError(interaction, error) {
  logger.error(`Command failed: ${interaction.commandName}`, error);

  const payload = {
    embeds: [
      buildErrorEmbed(
        'Something went wrong',
        'The command could not be completed. Please try again later.'
      )
    ],
    ephemeral: true
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload);
    return;
  }

  await interaction.reply(payload);
}
