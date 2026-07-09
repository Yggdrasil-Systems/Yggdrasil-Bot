import { pathToFileURL } from 'node:url';

import { collectJavaScriptFiles } from '../utils/fileDiscovery.js';
import { logger } from '../utils/logger.js';

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

    const listener = async (...args) => {
      try {
        await event.execute(...args, client, appContext);
      } catch (error) {
        logger.error(`Event handler failed: ${event.name}`, error);
      }
    };

    if (event.once) {
      client.once(event.name, listener);
      continue;
    }

    client.on(event.name, listener);
  }

  return eventFiles.length;
}
