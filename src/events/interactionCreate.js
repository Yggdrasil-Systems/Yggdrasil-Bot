import { Events } from 'discord.js';

import { handleChatInputCommand, handleComponentInteraction } from '../middleware/commandRouter.js';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  if (!interaction.isChatInputCommand()) {
    await handleComponentInteraction(interaction);
    return;
  }

  await handleChatInputCommand(interaction);
}
