import { buildErrorEmbed } from '../utils/embeds.js';
import { BOT } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { parseMessageCommand } from '../utils/messageParser.js';
import { canUseAdminCommand, canUseNoPrefixShortcuts } from './permissionGuard.js';
import { handleMessageCommandError } from './errorHandler.js';
import { replyToMessage } from '../utils/responses.js';
import { createTimer } from '../utils/perf.js';

function getCommandAliases(command) {
  return [command.name, ...(command.aliases ?? [])].map((alias) => alias.toLowerCase());
}

function getNoPrefixCommandNames(commands) {
  return new Set(
    [...commands.values()]
      .filter((command) => command.allowNoPrefix && typeof command.executeMessage === 'function')
      .map((command) => command.name.toLowerCase())
  );
}

function findMessageCommand(commands, commandName) {
  const normalizedCommandName = commandName.toLowerCase();

  return [...commands.values()].find((command) => {
    if (typeof command.executeMessage !== 'function') {
      return false;
    }

    return getCommandAliases(command).includes(normalizedCommandName);
  }) ?? null;
}

async function getPrivilegeContext(message, timer) {
  const runtimeConfig = message.client.runtimeConfig ?? {};
  const settings = message.client.settingsService && message.guild?.id
    ? await message.client.settingsService.getEffectiveSettings(message.guild.id).catch(() => null)
    : null;

  timer?.mark?.('settings_lookup');
  message.guildSettings = settings;

  return {
    userId: message.author.id,
    guildOwnerId: message.guild?.ownerId ?? null,
    botOwnerId: runtimeConfig.botOwnerId ?? null,
    member: message.member ?? null,
    trustedAdminRoleIds: [
      ...(runtimeConfig.trustedAdminRoleIds ?? []),
      ...(settings?.trustedAdminRoleIds ?? [])
    ],
    settings
  };
}

async function replyWithPermissionError(message) {
  await replyToMessage(message, {
    embeds: [
      buildErrorEmbed(
        'Permission required',
        'You do not have permission to use that command.'
      )
    ]
  });
}

async function canUseNoPrefix(message, privilegeContext) {
  const noPrefixAllowed = message.client.noPrefixService
    ? await message.client.noPrefixService.canUseNoPrefix(message.author.id).catch(() => false)
    : false;

  return canUseNoPrefixShortcuts({
    ...privilegeContext,
    noPrefixAllowed
  });
}

function isBotOwner(message) {
  const botOwnerId = message.client.runtimeConfig?.botOwnerId;
  return Boolean(botOwnerId && message.author.id === botOwnerId);
}

export async function handleMessageCommand(message, { log = logger } = {}) {
  if (!message.guild || message.author.bot) {
    return false;
  }

  const timer = createTimer('message_command');
  message.perfTimer = timer;

  const prefixedCommand = parseMessageCommand(message.content, {
    prefix: BOT.prefix,
    allowNoPrefix: false
  });
  const noPrefixCommandNames = getNoPrefixCommandNames(message.client.commands);
  let parsedCommand = prefixedCommand;
  let privilegeContext = null;

  if (!parsedCommand) {
    if (noPrefixCommandNames.size === 0) {
      return false;
    }

    parsedCommand = parseMessageCommand(message.content, {
      prefix: BOT.prefix,
      allowNoPrefix: true,
      noPrefixCommandNames
    });

    if (!parsedCommand) {
      return false;
    }
  }

  const command = findMessageCommand(message.client.commands, parsedCommand.commandName);

  if (!command) {
    if (parsedCommand.mode === 'prefix') {
      await replyToMessage(message, {
        embeds: [
          buildErrorEmbed(
            'Command unavailable',
            'That command is not available right now.'
          )
        ]
      });
    }

    return false;
  }

  timer.mark('parser_router');

  if (!privilegeContext) {
    privilegeContext = await getPrivilegeContext(message, timer);
  }

  if (parsedCommand.mode === 'no-prefix' && !await canUseNoPrefix(message, privilegeContext)) {
    return false;
  }

  timer.mark('middleware');

  // PERF AUDIT: settings fetch is single per message command request and is passed via context.settings.
  if (command.botOwnerOnly && !isBotOwner(message)) {
    timer.mark('permission_checks');
    await replyWithPermissionError(message);
    timer.finish();
    return true;
  }

  if (command.adminOnly && !canUseAdminCommand(privilegeContext)) {
    timer.mark('permission_checks');
    await replyWithPermissionError(message);
    timer.finish();
    return true;
  }

  timer.mark('permission_checks');

  try {
    await command.executeMessage({
      mode: parsedCommand.mode,
      isNoPrefixInvocation: parsedCommand.mode === 'no-prefix',
      commandName: command.name,
      args: parsedCommand.args,
      message,
      client: message.client,
      guild: message.guild,
      user: message.author,
      member: message.member,
      settings: privilegeContext.settings,
      respond: async (payload) => {
        const response = await replyToMessage(message, payload);
        timer.mark('reply_send');
        return response;
      }
    });
    timer.mark('command_execution');
    timer.finish();
    return true;
  } catch (error) {
    log.error?.(`Message command failed: ${command.name}`, error);
    await handleMessageCommandError(message, error);
    timer.mark('command_execution');
    timer.finish();
    return true;
  }
}
