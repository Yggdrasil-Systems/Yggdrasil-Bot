import { getModerationPendingSummary } from '../../services/moderationService.js';
import { buildNeutralEmbed } from '../../utils/embeds.js';

export const name = 'kick';
export const adminOnly = true;

export async function executeMessage(context) {
  const summary = getModerationPendingSummary('Kick');

  await context.respond({
    embeds: [buildNeutralEmbed(summary.title, summary.description)]
  });
}
