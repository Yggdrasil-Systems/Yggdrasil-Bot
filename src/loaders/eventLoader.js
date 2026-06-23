import { pathToFileURL } from 'node:url';

import { collectJavaScriptFiles } from '../utils/fileDiscovery.js';

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
  const appContext = client.appContext ?? null;

  for (const filePath of eventFiles) {
    const module = await import(pathToFileURL(filePath).href);
    const event = getEventModule(module);

    assertEventContract(event, filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client, appContext));
      continue;
    }

    client.on(event.name, (...args) => event.execute(...args, client, appContext));
  }

  return eventFiles.length;
}
