import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getGuildQueue, getPlayer, setPlayer } from '../src/services/playerService.js';

test('playerService stores and returns the active player instance', () => {
  const mockPlayer = {
    nodes: {
      get: (guildId) => ({ guildId })
    }
  };

  setPlayer(mockPlayer);

  assert.equal(getPlayer(), mockPlayer);
  assert.deepEqual(getGuildQueue('guild-1'), { guildId: 'guild-1' });

  setPlayer(null);
  assert.equal(getPlayer(), null);
  assert.equal(getGuildQueue('guild-1'), null);
});
