import { executeMessage as executeSettingsMessage } from './settings.js';

export const name = 'automod';
export const adminOnly = true;

export async function executeMessage(context) {
  await executeSettingsMessage({
    ...context,
    args: ['automod', ...context.args]
  });
}
