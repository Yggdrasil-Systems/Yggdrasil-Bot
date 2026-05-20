import { buildBaseEmbed } from '../utils/embeds.js';

export function buildHelpEmbed() {
  return buildBaseEmbed({
    title: 'World Tree Help',
    description: 'A clean utility and moderation bot for daily server management.'
  }).addFields(
    {
      name: 'Slash commands',
      value: '`/ping`, `/avatar`, `/userinfo`, `/serverinfo`, `/banner`, `/botinfo`, `/roleinfo`, `/help`'
    },
    {
      name: 'Prefix commands',
      value: 'Use `tree` before a command. Examples: `tree ping`, `tree avatar @user`, `tree warn @user "reason"`.'
    },
    {
      name: 'No-prefix admin shortcuts',
      value: 'Trusted admins can use approved shortcuts like `ping`, `userinfo @user`, and `purge 10`. Normal chat is ignored.'
    },
    {
      name: 'Moderation',
      value: '`warn`, `warnings`, `timeout`, `untimeout`, `kick`, `ban`, and `purge` create persistent moderation cases where applicable.'
    },
    {
      name: 'Setup',
      value: 'Use `tree setmodlog #channel` or `/setmodlog` to enable moderation logs.'
    }
  );
}
