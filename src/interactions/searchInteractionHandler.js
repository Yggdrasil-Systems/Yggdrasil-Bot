import { buildErrorEmbed } from '../utils/embeds.js';
import { handleSearchSelect } from '../commands/music/search.js';

export const prefix = 'search_select_';

function getOwnerId(customId) {
  const [ownerId, selectionId] = customId.slice(prefix.length).split(':');
  return ownerId && selectionId ? ownerId : null;
}

export async function handle(interaction, { onSelect = handleSearchSelect } = {}) {
  if (!interaction.customId?.startsWith(prefix)) {
    return false;
  }

  if (!interaction?.isStringSelectMenu?.()) {
    return false;
  }

  const ownerId = getOwnerId(interaction.customId);

  if (!ownerId || interaction.user.id !== ownerId) {
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

export const handleSearchSelectInteraction = handle;
