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

function getEventModule(module) {
  return module.default ?? module;
}

function assertEventContract(event, filePath) {
  if (typeof event?.name !== 'string' || typeof event?.execute !== 'function') {
    throw new Error(`Invalid event module: ${filePath}`);
  }
}

export async function loadEvents(client, eventsPath) {
  const eventFiles = await collectJavaScriptFiles(eventsPath);

  for (const filePath of eventFiles) {
    const module = await import(pathToFileURL(filePath).href);
    const event = getEventModule(module);

    assertEventContract(event, filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
      continue;
    }

    client.on(event.name, (...args) => event.execute(...args, client));
  }

  return eventFiles.length;
}
