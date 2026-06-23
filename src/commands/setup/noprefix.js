import { noPrefixService as defaultNoPrefixService } from '../../services/noPrefixService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';
import { resolveUserFromMessage } from '../../utils/discordResolvers.js';

export const name = 'noprefix';
export const aliases = ['no-prefix'];
export const botOwnerOnly = true;

export function getService(context) {
  return context.appContext?.noPrefixService
    ?? defaultNoPrefixService;
}

function formatUserList(users) {
  if (users.length === 0) {
    return 'No users are currently allowlisted for no-prefix shortcuts.';
  }

  return users
    .slice(0, 20)
    .map((user) => `<@${user.userId}>`)
    .join('\n');
}

export async function executeMessage(context) {
  const [action, ...args] = context.args;
  const service = getService(context);

  if (action === 'list') {
    const users = await service.listUsers();
    await context.respond({
      embeds: [buildSuccessEmbed('No-prefix users', formatUserList(users))]
    });
    return;
  }

  if (!['add', 'remove'].includes(action)) {
    await context.respond({
      embeds: [buildErrorEmbed('Action required', 'Use `tree noprefix add @user`, `remove @user`, or `list`.')]
    });
    return;
  }

  const targetUser = await resolveUserFromMessage(context.message, args, { optional: false });

  if (!targetUser) {
    await context.respond({
      embeds: [buildErrorEmbed('User required', 'Mention a user or provide a user ID.')]
    });
    return;
  }

  if (action === 'add') {
    await service.addUser({
      userId: targetUser.id,
      addedBy: context.user.id,
      reason: args.slice(1).join(' ')
    });
    await context.respond({
      embeds: [buildSuccessEmbed('No-prefix access added', `<@${targetUser.id}> can now use approved no-prefix shortcuts.`)]
    });
    return;
  }

  await service.removeUser({
    userId: targetUser.id,
    removedBy: context.user.id,
    reason: args.slice(1).join(' ')
  });
  await context.respond({
    embeds: [buildSuccessEmbed('No-prefix access removed', `<@${targetUser.id}> can no longer use no-prefix shortcuts.`)]
  });
}
