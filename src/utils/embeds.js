import { EmbedBuilder } from 'discord.js';

import { BOT, COLORS } from './constants.js';

export function buildBaseEmbed({ title, description, color = COLORS.brand }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: BOT.name })
    .setTimestamp();

  if (title) {
    embed.setTitle(title);
  }

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

export function buildSuccessEmbed(title, description) {
  return buildBaseEmbed({
    title,
    description,
    color: COLORS.success
  });
}

export function buildErrorEmbed(title, description) {
  return buildBaseEmbed({
    title,
    description,
    color: COLORS.error
  });
}

export function buildNeutralEmbed(title, description) {
  return buildBaseEmbed({
    title,
    description,
    color: COLORS.neutral
  });
}
