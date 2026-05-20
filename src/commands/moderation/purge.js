import { PermissionsBitField } from 'discord.js';

import { purgeMessages } from '../../services/moderationService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';
import { parsePositiveInteger } from '../../utils/discordResolvers.js';
import { canRunModerationAction } from '../../middleware/permissionGuard.js';

export const name = 'purge';
export const adminOnly = true;
export const allowNoPrefix = true;

export async function executeMessage(context) {
  if (!canRunModerationAction(context.member, PermissionsBitField.Flags.ManageMessages)) {
    await context.respond({
      embeds: [buildErrorEmbed('Permission required', 'You need Manage Messages permission to purge messages.')]
    });
    return;
  }

  const amount = parsePositiveInteger(context.args[0]);
  const result = await purgeMessages({ message: context.message, amount });

  if (!result.ok) {
    await context.respond({
      embeds: [buildErrorEmbed('Purge failed', result.reason)]
    });
    return;
  }

  await context.respond({
    embeds: [buildSuccessEmbed('Messages purged', `Removed ${result.deletedCount} message(s).`)]
  });
}
