import { buildErrorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { replyToInteraction } from '../utils/responses.js';
import { handleHelpSelectInteraction } from '../interactions/helpInteractionHandler.js';
import { handlePingRefreshInteraction } from '../interactions/pingInteractionHandler.js';
import { handleSearchSelectInteraction } from '../interactions/searchInteractionHandler.js';
import { handleQueueClearInteraction } from '../interactions/queueInteractionHandler.js';
import { handleMusicSettingsInteraction } from '../interactions/musicSettingsInteractionHandler.js';
import { handleMusicPlaybackInteraction } from '../interactions/musicPlaybackInteractionHandler.js';
import { handleMusicFilterInteraction } from '../interactions/musicFilterInteractionHandler.js';
import { getAppContext } from '../context/appContext.js';
import { handleInteractionError } from './errorHandler.js';
import { canUseAdminCommand } from './permissionGuard.js';

async function handleUnknownCommand(interaction, log) {
  log.warn(`No command handler found for /${interaction.commandName}.`);
  await replyToInteraction(
    interaction,
    { embeds: [buildErrorEmbed('Command unavailable', 'That command is not available right now.')] },
    { ephemeral: true }
  );
}

// ─── Component Interaction Handler ──────────────────────────────────────────

export async function handleComponentInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) {
    return;
  }

  const id = interaction.customId;

  try {
    // ─── Ping Refresh Button ──────────────────────────────────────────────
    if (await handlePingRefreshInteraction(interaction)) {
      return;
    }

    // ─── Queue + Search Select Menus ────────────────────────────────────
    if (await handleQueueClearInteraction(interaction)) {
      return;
    }

    if (await handleMusicSettingsInteraction(interaction)) {
      return;
    }

    if (await handleMusicPlaybackInteraction(interaction)) {
      return;
    }

    if (await handleMusicFilterInteraction(interaction)) {
      return;
    }

    if (await handleSearchSelectInteraction(interaction)) {
      return;
    }

    // ─── Help Select Menu ───────────────────────────────────────────────
    if (await handleHelpSelectInteraction(interaction)) {
      return;
    }
  } catch (error) {
    logger.error('Component interaction error:', error.message);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [buildErrorEmbed('Error', 'Something went wrong. Please try again.')], flags: 64 });
      }
    } catch { /* interaction expired */ }
  }
}

// ─── Slash Command Handler ──────────────────────────────────────────────────

export async function handleChatInputCommand(interaction, { log = logger } = {}) {
  const appContext = getAppContext(interaction) ?? {};
  const commands = appContext.commands ?? interaction.client.commands;
  const runtimeConfig = appContext.runtimeConfig ?? interaction.client.runtimeConfig ?? {};
  const settingsService = appContext.settingsService ?? interaction.client.settingsService ?? null;
  const command = commands.get(interaction.commandName);

  if (!command) {
    await handleUnknownCommand(interaction, log);
    return;
  }

  const settings = settingsService && interaction.guild?.id
    ? await settingsService.getEffectiveSettings(interaction.guild.id).catch(() => null)
    : null;

  if (command.botOwnerOnly && interaction.user.id !== runtimeConfig.botOwnerId) {
    await replyToInteraction(
      interaction,
      { embeds: [buildErrorEmbed('Permission required', 'Only the configured bot owner can use that command.')] },
      { ephemeral: true }
    );
    return;
  }

  if (command.adminOnly && !canUseAdminCommand({
    userId: interaction.user.id,
    guildOwnerId: interaction.guild?.ownerId ?? null,
    botOwnerId: runtimeConfig.botOwnerId ?? null,
    member: interaction.member,
    trustedAdminRoleIds: [
      ...(runtimeConfig.trustedAdminRoleIds ?? []),
      ...(settings?.trustedAdminRoleIds ?? [])
    ]
  })) {
    await replyToInteraction(
      interaction,
      { embeds: [buildErrorEmbed('Permission required', 'You do not have permission to use that command.')] },
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
