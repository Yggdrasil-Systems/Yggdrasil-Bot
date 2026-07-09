import { Collection } from 'discord.js';
import { pathToFileURL } from 'node:url';

import { collectJavaScriptFiles } from '../utils/fileDiscovery.js';
import { normalizeCommandName } from '../utils/commandNames.js';

function getCommandModule(module) {
  return module.default ?? module;
}

function assertCommandContract(command, filePath) {
  const hasSlashData =
    command?.data && typeof command.data.name === 'string' && typeof command.data.toJSON === 'function';
  const hasSlashExecute = typeof command?.execute === 'function';
  const hasMessageExecute = typeof command?.executeMessage === 'function';
  const hasExplicitName = typeof command?.name === 'string' && command.name.length > 0;

  if ((!hasSlashData || !hasSlashExecute) && (!hasExplicitName || !hasMessageExecute)) {
    throw new Error(`Invalid command module: ${filePath}`);
  }
}

function getCommandName(command) {
  return command.name ?? command.data.name;
}

function normalizeRegistrationName(name, filePath) {
  const normalizedName = normalizeCommandName(name);

  if (!normalizedName) {
    throw new Error(`Invalid command name or alias: ${filePath}`);
  }

  return normalizedName;
}

function normalizeCommand(command) {
  return {
    ...command,
    name: getCommandName(command)
  };
}

export async function loadCommands(commandsPath) {
  const commands = new Collection();
  const commandFiles = await collectJavaScriptFiles(commandsPath);
  const registeredNamesAndAliases = new Set();

  for (const filePath of commandFiles) {
    const module = await import(pathToFileURL(filePath).href);
    const command = normalizeCommand(getCommandModule(module));

    assertCommandContract(command, filePath);

    const commandKey = normalizeRegistrationName(command.name, filePath);

    if (commands.has(commandKey)) {
      throw new Error(`Duplicate command name: ${command.name}`);
    }

    if (registeredNamesAndAliases.has(commandKey)) {
      throw new Error(`Duplicate command name or alias: ${commandKey}`);
    }
    registeredNamesAndAliases.add(commandKey);

    if (Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        const aliasKey = normalizeRegistrationName(alias, filePath);

        if (registeredNamesAndAliases.has(aliasKey)) {
          throw new Error(`Duplicate command name or alias: ${aliasKey}`);
        }
        registeredNamesAndAliases.add(aliasKey);
      }
    }

    commands.set(commandKey, { ...command, name: commandKey });
  }

  return commands;
}
