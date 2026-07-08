import { SlashCommandBuilder } from 'discord.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'autoplay';
export const aliases = ['ap'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('autoplay')
  .setDescription('Toggle autoplay mode — automatically queue related songs.');

async function executeAutoplay(guildId, playerService, respond) {
  const queue = playerService?.getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  const wasAutoplay = queue.repeatMode === 3;

  if (wasAutoplay) {
    queue.setRepeatMode(0);
    return respond({
      embeds: [
        buildSuccessEmbed(
          '📻 Autoplay Disabled',
          'Autoplay has been turned off. The queue will stop after the last track.'
        )
      ]
    });
  }

  queue.setRepeatMode(3);
  return respond({
    embeds: [
      buildSuccessEmbed(
        '📻 Autoplay Enabled',
        'Autoplay is now on! Related songs will be automatically queued when the queue ends.'
      )
    ]
  });
}

export async function execute(interaction) {
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;
  await executeAutoplay(interaction.guild.id, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const playerService = context.appContext?.playerService ?? null;
  await executeAutoplay(context.guild.id, playerService, async (payload) => {
    await context.respond(payload);
  });
}
