import { buildErrorEmbed } from './embeds.js';
import { parsePositiveInteger, resolveMember, resolveUserFromMessage } from './discordResolvers.js';

export function getReasonFromArgs(args, startIndex = 1, fallback = '') {
  return args.slice(startIndex).join(' ').trim() || fallback;
}

export async function getMessageTarget(context) {
  const targetUser = await resolveUserFromMessage(context.message, context.args, { optional: false });

  if (!targetUser) {
    await context.respond({
      embeds: [buildErrorEmbed('User required', 'Mention a user or provide a user ID.')]
    });
    return null;
  }

  const targetMember = await resolveMember(context.guild, targetUser.id);

  return { targetUser, targetMember };
}

export function getMessageAmount(context) {
  return parsePositiveInteger(context.args[0]);
}

export async function getInteractionTarget(interaction) {
  const targetUser = interaction.options.getUser('user', true);
  const targetMember = await resolveMember(interaction.guild, targetUser.id);

  return { targetUser, targetMember };
}

export async function getInteractionModerator(interaction) {
  return resolveMember(interaction.guild, interaction.user.id);
}
