import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MessageFlags } from 'discord.js';

import { replyToInteraction, withSafeAllowedMentions } from '../src/utils/reply.js';

describe('reply allowed mention enforcement', () => {
  it('reply.js always produces empty allowedMentions parse regardless of caller input', () => {
    assert.deepEqual(
      withSafeAllowedMentions({ allowedMentions: { parse: ['everyone'] } }).allowedMentions,
      { parse: [] }
    );
  });

  it('reply.js merges caller-provided content embeds and ephemeral correctly', async () => {
    const calls = [];
    const interaction = {
      replied: false,
      deferred: false,
      reply: async (payload) => calls.push(payload)
    };

    await replyToInteraction(interaction, { content: 'x', embeds: [{ title: 'T' }] }, { ephemeral: true });

    assert.deepEqual(calls[0], {
      content: 'x',
      embeds: [{ title: 'T' }],
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  });
});
