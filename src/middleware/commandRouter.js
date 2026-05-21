import { buildErrorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { replyToInteraction } from '../utils/responses.js';
import { buildHelpCategoryEmbed, buildHelpComponents, parseHelpComponentId } from '../services/helpService.js';
import { handleInteractionError } from './errorHandler.js';
import { canUseAdminCommand } from './permissionGuard.js';

async function handleUnknownCommand(interaction, log) {
  log.warn(`No command handler found for /${interaction.commandName}.`);

  await replyToInteraction(
    interaction,
    {
      embeds: [
        buildErrorEmbed(
          'Command unavailable',
          'That command is not available right now. Try registering slash commands again.'
        )
      ]
    },
    { ephemeral: true }
  );
}

export async function handleComponentInteraction(interaction) {
  if (!interaction.isStringSelectMenu()) {
    return;
  }

  const helpComponent = parseHelpComponentId(interaction.customId);

  if (!helpComponent) {
    return;
  }

  if (interaction.user.id !== helpComponent.requesterId) {
    await replyToInteraction(
      interaction,
      {
        embeds: [
          buildErrorEmbed(
            'Help session locked',
            'This help menu belongs to the user who opened it.'
          )
        ]
      },
      { ephemeral: true }
    );
    return;
  }

  const category = interaction.values[0] ?? 'overview';
  await interaction.update({
    embeds: [buildHelpCategoryEmbed(category)],
    components: buildHelpComponents({
      requesterId: interaction.user.id,
      selectedCategory: category
    })
  });
}

export async function handleChatInputCommand(interaction, { log = logger } = {}) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    await handleUnknownCommand(interaction, log);
    return;
  }

  const settings = interaction.client.settingsService && interaction.guild?.id
    ? await interaction.client.settingsService.getEffectiveSettings(interaction.guild.id).catch(() => null)
    : null;

  if (command.adminOnly && !canUseAdminCommand({
    userId: interaction.user.id,
    guildOwnerId: interaction.guild?.ownerId ?? null,
    botOwnerId: interaction.client.runtimeConfig?.botOwnerId ?? null,
    member: interaction.member,
    trustedAdminRoleIds: [
      ...(interaction.client.runtimeConfig?.trustedAdminRoleIds ?? []),
      ...(settings?.trustedAdminRoleIds ?? [])
    ]
  })) {
    await replyToInteraction(
      interaction,
      {
        embeds: [
          buildErrorEmbed(
            'Permission required',
            'You do not have permission to use that command.'
          )
        ]
      },
      { ephemeral: true }
    );
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    await handleInteractionError(interaction, error);
  }
}
