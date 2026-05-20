import { Collection } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function getCommandModule(module) {
  return module.default ?? module;
}

function assertCommandContract(command, filePath) {
  const hasData = command?.data && typeof command.data.name === 'string' && typeof command.data.toJSON === 'function';
  const hasExecute = typeof command?.execute === 'function';

  if (!hasData || !hasExecute) {
    throw new Error(`Invalid command module: ${filePath}`);
  }
}

export async function loadCommands(commandsPath) {
  const commands = new Collection();
  const commandFiles = await collectJavaScriptFiles(commandsPath);

  for (const filePath of commandFiles) {
    const module = await import(pathToFileURL(filePath).href);
    const command = getCommandModule(module);

    assertCommandContract(command, filePath);
    commands.set(command.data.name, command);
  }

  return commands;
}
