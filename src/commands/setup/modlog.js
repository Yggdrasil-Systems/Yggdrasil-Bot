import { handleModlogMessage } from './settings.js';

export const name = 'modlog';
export const adminOnly = true;

export async function executeMessage(context) {
  const result = await handleModlogMessage(context);
  await context.respond({ embeds: [result.embed] });
}
