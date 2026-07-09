import { logger } from '../utils/logger.js';
import { normalizeCommandName } from '../utils/commandNames.js';
import { replyToMessage } from '../utils/responses.js';

function getCommandAliases(command) {
  return [command.name, ...(command.aliases ?? [])].map(normalizeCommandName);
}

function findMessageCommand(commands, commandName) {
  const normalizedCommandName = normalizeCommandName(commandName);

  return (
    [...commands.values()].find((command) => {
      if (typeof command.executeMessage !== 'function') {
        return false;
      }

      return getCommandAliases(command).includes(normalizedCommandName);
    }) ?? null
  );
}

function scheduleMessageDeletion(message, delayMs = 1000) {
  setTimeout(() => message.delete().catch(() => null), delayMs);
}

export async function handleMusicChannelMessage(
  message,
  {
    commands = message.appContext?.commands ?? new Map(),
    settingsService = message.appContext?.settingsService ?? null,
    appContext = message.appContext ?? null,
    log = logger,
    deleteDelayMs = 1000,
    scheduleDeletion = scheduleMessageDeletion
  } = {}
) {
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

  const prefix = settings.prefix ?? 'tree';
  if (content.toLowerCase().startsWith(prefix.toLowerCase())) {
    return false;
  }

  const playCommand = findMessageCommand(commands, 'play');

  if (!playCommand) {
    return false;
  }

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
    // Delete the user's message AFTER the response has been sent,
    // otherwise message.reply() fails because the message no longer exists.
    scheduleDeletion(message, deleteDelayMs);
    return true;
  } catch (error) {
    log.error?.('Music channel play failed', error);
    return false;
  }
}
