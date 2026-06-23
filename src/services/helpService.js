import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

import { buildBaseEmbed } from '../utils/embeds.js';

const HELP_CATEGORIES = Object.freeze({
  overview: {
    label: '📋 Overview',
    title: '🌳 World Tree Help',
    description: 'A premium utility, moderation, settings, automod, music, and admin-shortcut bot.',
    fields: [
      { name: 'Input modes', value: 'Use slash commands, `tree` prefix commands, or bot-owner managed no-prefix shortcuts.' },
      { name: 'Start here', value: '`/help`, `tree help`, `tree dashboard`, `tree ping`, `tree settings view`, `tree activityrole list`, `tree noprefix list`' }
    ]
  },
  utility: {
    label: '🔧 Utility',
    title: '🔧 Utility Commands',
    description: 'Quick server and user context without clutter.',
    fields: [
      { name: 'Commands', value: '`ping`, `avatar`, `banner`, `userinfo`, `serverinfo`, `roleinfo`, `botinfo`, `dashboard`, `help`, `uptime`, `membercount`, `stats`, `ownerinfo`' },
      { name: 'Examples', value: '`tree avatar @user`\n`tree botinfo`\n`tree dashboard`\n`tree help`\n`/serverinfo`' }
    ]
  },
  moderation: {
    label: '⚔️ Moderation',
    title: '⚔️ Moderation Commands',
    description: 'Persistent cases, clear logs, and guarded staff workflows.',
    fields: [
      { name: 'Actions', value: '`warn`, `warnings`, `timeout`, `untimeout`, `kick`, `ban`, `purge`, `case`' },
      { name: 'Cases', value: '`/case view`, `/case list`, `/case resolve`, `/case delete`, `/case stats`' }
    ]
  },
  settings: {
    label: '⚙️ Settings',
    title: '⚙️ Settings Commands',
    description: 'Configure World Tree per server through persistent guild settings.',
    fields: [
      { name: 'Slash', value: '`/settings view`, `/settings modlog set`, `/settings trusted-role add/remove/list`, `/settings automod view/toggle/threshold/punishment/badword`' },
      { name: 'Prefix', value: '`tree settings view`, `tree setmodlog #logs`, `tree modlog #logs`, `tree trustedrole add @Staff`, `tree automod view`, `tree noprefix list`' },
      { name: 'Activity roles', value: '`tree activityrole list`, `tree activityrole set spotify @role`, `tree activityrole set streaming @role`, `tree activityrole set gaming @role`, `tree activityrole set voice @role`' },
      { name: 'Music setup', value: '`tree setup-music` creates a dedicated music request channel.' }
    ]
  },
  automod: {
    label: '🛡️ Automod',
    title: '🛡️ Automod Commands',
    description: 'Settings-driven moderation for repeat spam, mentions, links, caps, and configured blocked words.',
    fields: [
      { name: 'Configure', value: '`/settings automod view`, `/settings automod toggle`, `/settings automod threshold`, `/settings automod punishment`' },
      { name: 'Bad words', value: '`/settings automod badword add`, `remove`, or `list`' }
    ]
  },
  admin: {
    label: '👑 Admin Shortcuts',
    title: '👑 Admin Shortcuts',
    description: 'Explicitly allowlisted users can use approved no-prefix shortcuts without exposing them to normal chat.',
    fields: [
      { name: 'Examples', value: '`ping`, `userinfo @user`, `purge 10`, `case list`, `activityrole list`' },
      { name: 'Protection', value: 'Shortcuts require bot owner access or a persisted global no-prefix allowlist grant.' }
    ]
  },
  music: {
    label: '🎵 Music',
    title: '🎵 Music Commands',
    description: 'High-quality music streaming with Spotify, YouTube, Apple Music, and SoundCloud.',
    fields: [
      { name: 'Playback', value: '`play`, `nowplaying`, `skip`, `stop`, `resume`, `volume`, `queue`, `shuffle`, `loop`, `autoplay`, `247`, `join`' },
      { name: 'Discovery', value: '`search` picks from top results and `autoplay` can queue related tracks.' },
      { name: 'Customization', value: '`filter` handles audio effects like bass boost, nightcore, and more.' },
      { name: 'Examples', value: '`tree play ishq wala love`\n`tree search Night Changes`\n`tree skip`\n`tree queue`\n`tree filter bassboost`\n`tree loop track`\n`tree volume 80`' }
    ]
  }
});

export function buildHelpCategoryEmbed(category = 'overview') {
  const selected = HELP_CATEGORIES[category] ?? HELP_CATEGORIES.overview;

  return buildBaseEmbed({
    title: selected.title,
    description: selected.description
  }).addFields(...selected.fields);
}

export function buildHelpEmbed() {
  return buildHelpCategoryEmbed('overview');
}

export function buildHelpComponents({ requesterId, selectedCategory = 'overview' }) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help:category:${requesterId}`)
    .setPlaceholder('Choose a help category')
    .addOptions(
      Object.entries(HELP_CATEGORIES).map(([value, category]) => ({
        label: category.label,
        value,
        default: value === selectedCategory
      }))
    );

  return [new ActionRowBuilder().addComponents(menu)];
}

export function parseHelpComponentId(customId) {
  const [scope, action, requesterId] = String(customId ?? '').split(':');

  if (scope !== 'help' || action !== 'category' || !requesterId) {
    return null;
  }

  return { requesterId };
}
