import { Client, Collection, GatewayIntentBits } from 'discord.js';

export function createClient() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.commands = new Collection();

  return client;
}
