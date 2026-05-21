import { Events } from 'discord.js';

import { handleMessageCommand } from '../middleware/messageCommandRouter.js';
import { automodService } from '../services/automod/automodService.js';

export const name = Events.MessageCreate;

export async function execute(message) {
  const handledCommand = await handleMessageCommand(message);
  await automodService.handleMessage(message, { isCommand: handledCommand });
}
