import { Events } from 'discord.js';

import { handleMessageCommand } from '../middleware/messageCommandRouter.js';

export const name = Events.MessageCreate;

export async function execute(message) {
  await handleMessageCommand(message);
}
