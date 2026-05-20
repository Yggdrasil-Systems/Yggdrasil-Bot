import { Client, Collection } from 'discord.js';

import { CLIENT_INTENTS, CLIENT_PARTIALS } from './config/discord.js';

export function createClient({ intents = CLIENT_INTENTS, partials = CLIENT_PARTIALS } = {}) {
  const client = new Client({
    intents,
    partials
  });

  client.commands = new Collection();

  return client;
}
