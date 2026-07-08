import { MessageFlags } from 'discord.js';

function applyEphemeralFlag(payload) {
  return {
    ...payload,
    flags: payload.flags ?? MessageFlags.Ephemeral
  };
}

export async function replyToInteraction(interaction, payload, options = {}) {
  const responsePayload = options.ephemeral && !interaction.deferred ? applyEphemeralFlag(payload) : payload;

  if (interaction.deferred && !interaction.replied) {
    return interaction.editReply(payload);
  }

  if (interaction.replied) {
    return interaction.followUp(responsePayload);
  }

  return interaction.reply(responsePayload);
}

export async function replyToMessage(message, payload) {
  try {
    return await message.reply(payload);
  } catch (error) {
    if (message.channel?.send) {
      return message.channel.send(payload);
    }

    throw error;
  }
}
