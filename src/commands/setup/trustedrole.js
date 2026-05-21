import { handleTrustedRoleMessage } from './settings.js';

export const name = 'trustedrole';
export const aliases = ['trusted-role'];
export const adminOnly = true;

export async function executeMessage(context) {
  const result = await handleTrustedRoleMessage(context);
  await context.respond({ embeds: [result.embed] });
}
