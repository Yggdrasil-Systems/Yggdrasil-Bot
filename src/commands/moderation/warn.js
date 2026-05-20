import { getModerationPendingSummary } from '../../services/moderationService.js';
import { buildNeutralEmbed } from '../../utils/embeds.js';

export const name = 'warn';
export const adminOnly = true;

export async function executeMessage(context) {
  const summary = getModerationPendingSummary('Warn');

  await context.respond({
    embeds: [buildNeutralEmbed(summary.title, summary.description)]
  });
}
