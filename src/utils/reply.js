import { MessageFlags } from 'discord.js';

const LOCKED_ALLOWED_MENTIONS = Object.freeze({ parse: [] });

export function withSafeAllowedMentions(payload = {}) {
  return {
    ...payload,
    allowedMentions: { ...LOCKED_ALLOWED_MENTIONS }
  };
}

function applyEphemeralFlag(payload) {
  return {
    ...payload,
    flags: payload.flags ?? MessageFlags.Ephemeral
  };
}

export async function replyToInteraction(interaction, payload, options = {}) {
  const safePayload = withSafeAllowedMentions(payload);
  const responsePayload = options.ephemeral && !interaction.deferred
    ? applyEphemeralFlag(safePayload)
    : safePayload;

  if (interaction.deferred && !interaction.replied) {
    return interaction.editReply(safePayload);
  }

  if (interaction.replied) {
    return interaction.followUp(responsePayload);
  }

  return interaction.reply(responsePayload);
}

export async function replyToMessage(message, payload) {
  const safePayload = withSafeAllowedMentions(payload);

  try {
    return await message.reply(safePayload);
  } catch (error) {
    if (message.channel?.send) {
      return message.channel.send(safePayload);
    }

    throw error;
  }
}

export async function sendToChannel(channel, payload) {
  return channel.send(withSafeAllowedMentions(payload));
}
