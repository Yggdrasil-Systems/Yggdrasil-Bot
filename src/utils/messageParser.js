import { BOT } from './constants.js';

function tokenize(input) {
  const tokens = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match;

  while ((match = pattern.exec(input)) !== null) {
    tokens.push((match[1] ?? match[2] ?? match[3]).replaceAll('\\"', '"').replaceAll("\\'", "'"));
  }

  return tokens;
}

function parsePrefixedCommand(content, prefix) {
  const trimmed = content.trim();
  const lowerPrefix = prefix.toLowerCase();

  if (!trimmed.toLowerCase().startsWith(lowerPrefix)) {
    return null;
  }

  const nextCharacter = trimmed.at(prefix.length);

  if (nextCharacter && !/\s/.test(nextCharacter)) {
    return null;
  }

  const commandText = trimmed.slice(prefix.length).trim();

  if (!commandText) {
    return null;
  }

  const [commandName, ...args] = tokenize(commandText);

  if (!commandName) {
    return null;
  }

  return {
    mode: 'prefix',
    commandName: commandName.toLowerCase(),
    args
  };
}

function parseNoPrefixCommand(content, noPrefixCommandNames) {
  const tokens = tokenize(content.trim());
  const [commandName, ...args] = tokens;

  if (!commandName) {
    return null;
  }

  const normalizedCommandName = commandName.toLowerCase();

  if (!noPrefixCommandNames.has(normalizedCommandName)) {
    return null;
  }

  return {
    mode: 'no-prefix',
    commandName: normalizedCommandName,
    args
  };
}

export function parseMessageCommand(content, {
  prefix = BOT.prefix,
  allowNoPrefix = false,
  noPrefixCommandNames = new Set()
} = {}) {
  if (!content || !content.trim()) {
    return null;
  }

  const prefixedCommand = parsePrefixedCommand(content, prefix);

  if (prefixedCommand) {
    return prefixedCommand;
  }

  if (!allowNoPrefix) {
    return null;
  }

  return parseNoPrefixCommand(content, noPrefixCommandNames);
}
