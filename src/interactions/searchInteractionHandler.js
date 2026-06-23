import { buildErrorEmbed } from '../utils/embeds.js';
import { handleSearchSelect } from '../commands/music/search.js';

export async function handleSearchSelectInteraction(interaction, { onSelect = handleSearchSelect } = {}) {
  if (!interaction?.isStringSelectMenu?.() || !interaction.customId.startsWith('search_select_')) {
    return false;
  }

  const ownerId = interaction.customId.replace('search_select_', '');

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      embeds: [buildErrorEmbed('Not Your Search', 'Only the person who searched can pick a result.')],
      flags: 64
    });
    return true;
  }

  await interaction.deferUpdate();
  await onSelect(interaction);
  return true;
}
