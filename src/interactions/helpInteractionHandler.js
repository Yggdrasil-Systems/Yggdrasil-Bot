import { buildErrorEmbed } from '../utils/embeds.js';
import { replyToInteraction } from '../utils/responses.js';
import { buildHelpCategoryEmbed, buildHelpComponents, parseHelpComponentId } from '../services/helpService.js';

export const prefix = 'help:';

export async function handle(interaction) {
  if (!interaction.customId?.startsWith(prefix)) {
    return false;
  }

  if (!interaction?.isStringSelectMenu?.()) {
    return false;
  }

  const helpComponent = parseHelpComponentId(interaction.customId);

  if (!helpComponent) {
    return false;
  }

  if (interaction.user.id !== helpComponent.requesterId) {
    await replyToInteraction(
      interaction,
      { embeds: [buildErrorEmbed('Help session locked', 'This help menu belongs to the user who opened it.')] },
      { ephemeral: true }
    );
    return true;
  }

  const category = interaction.values[0] ?? 'overview';

  await interaction.update({
    embeds: [buildHelpCategoryEmbed(category)],
    components: buildHelpComponents({ requesterId: interaction.user.id, selectedCategory: category })
  });

  return true;
}

export const handleHelpSelectInteraction = handle;
