import { Events } from 'discord.js';

import { handleMessageCommand } from '../middleware/messageCommandRouter.js';
import { automodService } from '../services/automod/automodService.js';
import { logger } from '../utils/logger.js';

export const name = Events.MessageCreate;

export async function execute(message, client, appContext = null) {
  message.appContext = appContext;

  const handledCommand = await handleMessageCommand(message);

  try {
    await automodService.handleMessage(message, { isCommand: handledCommand });
  } catch (err) {
    logger.error('Automod message handling failed.', err);
  }
}
