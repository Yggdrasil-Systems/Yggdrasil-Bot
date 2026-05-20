import { buildErrorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { replyToInteraction } from '../utils/responses.js';

export async function handleInteractionError(interaction, error) {
  logger.error(`Command failed: ${interaction.commandName}`, error);

  const payload = {
    embeds: [
      buildErrorEmbed(
        'Something went wrong',
        'The command could not be completed. Please try again later.'
      )
    ]
  };

  try {
    await replyToInteraction(interaction, payload, { ephemeral: true });
  } catch (responseError) {
    logger.error('Failed to send command error response.', responseError);
  }
}

export async function handleMessageCommandError(message, error) {
  logger.error('Message command failed.', error);

  await message.reply({
    embeds: [
      buildErrorEmbed(
        'Something went wrong',
        'The command could not be completed. Please try again later.'
      )
    ]
  }).catch((responseError) => {
    logger.error('Failed to send message command error response.', responseError);
  });
}
