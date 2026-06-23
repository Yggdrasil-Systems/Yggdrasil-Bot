import { logger } from '../utils/logger.js';
import { replyToMessage } from '../utils/responses.js';

function getCommandAliases(command) {
  return [command.name, ...(command.aliases ?? [])].map((alias) => alias.toLowerCase());
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

function scheduleMessageDeletion(message, delayMs = 1000) {
  setTimeout(() => message.delete().catch(() => null), delayMs);
}

export async function handleMusicChannelMessage(message, {
  commands = message.client?.commands,
  settingsService = message.appContext?.settingsService ?? message.client?.settingsService ?? null,
  appContext = message.appContext ?? message.client?.appContext ?? null,
  log = logger,
  deleteDelayMs = 1000,
  scheduleDeletion = scheduleMessageDeletion
} = {}) {
  if (!message?.guild || !settingsService || !commands) {
    return false;
  }

  const settings = await settingsService.getEffectiveSettings(message.guild.id).catch(() => null);

  if (!settings?.musicChannelId || message.channel.id !== settings.musicChannelId) {
    return false;
  }

  const content = message.content.trim();

  if (!content) {
    return false;
  }

  const playCommand = findMessageCommand(commands, 'play');

  if (!playCommand) {
    return false;
  }

  scheduleDeletion(message, deleteDelayMs);

  try {
    await playCommand.executeMessage({
      mode: 'no-prefix',
      commandName: 'play',
      args: content.split(/\s+/),
      message,
      client: message.client,
      appContext,
      guild: message.guild,
      user: message.author,
      member: message.member,
      respond: (payload) => replyToMessage(message, payload)
    });
    return true;
  } catch (error) {
    log.error?.('Music channel play failed', error);
    return false;
  }
}
