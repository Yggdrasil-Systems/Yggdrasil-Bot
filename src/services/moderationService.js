import { PermissionsBitField } from 'discord.js';

import { LIMITS } from '../utils/constants.js';

export function validatePurgeAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    return 'Amount must be a positive number.';
  }

  if (amount > LIMITS.maxPurgeAmount) {
    return `Amount cannot exceed ${LIMITS.maxPurgeAmount} messages.`;
  }

  return null;
}

export function canBotManageMessages(message) {
  return Boolean(
    message.guild?.members?.me
      ?.permissionsIn(message.channel)
      ?.has(PermissionsBitField.Flags.ManageMessages)
  );
}

export async function purgeMessages({ message, amount }) {
  const validationError = validatePurgeAmount(amount);

  if (validationError) {
    return {
      ok: false,
      reason: validationError
    };
  }

  if (!canBotManageMessages(message)) {
    return {
      ok: false,
      reason: 'World Tree needs Manage Messages permission in this channel.'
    };
  }

  const deletedMessages = await message.channel.bulkDelete(amount, true);

  return {
    ok: true,
    deletedCount: deletedMessages.size
  };
}

export function getModerationPendingSummary(commandName) {
  return {
    title: `${commandName} is not active yet`,
    description: 'This moderation workflow needs the moderation case database, hierarchy checks, and logging system before it can safely take action.'
  };
}
