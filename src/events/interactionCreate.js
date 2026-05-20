import { Events } from 'discord.js';

import { handleChatInputCommand } from '../middleware/commandRouter.js';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  await handleChatInputCommand(interaction);
}
