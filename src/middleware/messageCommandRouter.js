import { buildErrorEmbed } from '../utils/embeds.js';
import { BOT } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { parseMessageCommand } from '../utils/messageParser.js';
import { canUseAdminCommand, canUseNoPrefixShortcuts } from './permissionGuard.js';
import { handleMessageCommandError } from './errorHandler.js';

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

function getPrivilegeContext(message) {
  const runtimeConfig = message.client.runtimeConfig ?? {};

  return {
    userId: message.author.id,
    guildOwnerId: message.guild?.ownerId ?? null,
    botOwnerId: runtimeConfig.botOwnerId ?? null,
    member: message.member ?? null,
    trustedAdminRoleIds: runtimeConfig.trustedAdminRoleIds ?? []
  };
}

async function replyWithPermissionError(message) {
  await message.reply({
    embeds: [
      buildErrorEmbed(
        'Permission required',
        'You do not have permission to use that command.'
      )
    ]
  });
}

export async function handleMessageCommand(message, { log = logger } = {}) {
  if (!message.guild || message.author.bot) {
    return;
  }

  const noPrefixCommandNames = getNoPrefixCommandNames(message.client.commands);
  const parsedCommand = parseMessageCommand(message.content, {
    prefix: BOT.prefix,
    allowNoPrefix: noPrefixCommandNames.size > 0,
    noPrefixCommandNames
  });

  if (!parsedCommand) {
    return;
  }

  const command = findMessageCommand(message.client.commands, parsedCommand.commandName);

  if (!command) {
    if (parsedCommand.mode === 'prefix') {
      await message.reply({
        embeds: [
          buildErrorEmbed(
            'Command unavailable',
            'That command is not available right now.'
          )
        ]
      });
    }

    return;
  }

  const privilegeContext = getPrivilegeContext(message);

  if (parsedCommand.mode === 'no-prefix' && !canUseNoPrefixShortcuts(privilegeContext)) {
    return;
  }

  if (command.adminOnly && !canUseAdminCommand(privilegeContext)) {
    await replyWithPermissionError(message);
    return;
  }

  try {
    await command.executeMessage({
      mode: parsedCommand.mode,
      commandName: command.name,
      args: parsedCommand.args,
      message,
      client: message.client,
      guild: message.guild,
      user: message.author,
      member: message.member,
      respond: (payload) => message.reply(payload)
    });
  } catch (error) {
    log.error?.(`Message command failed: ${command.name}`, error);
    await handleMessageCommandError(message, error);
  }
}
