import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { createPlayerService } from '../src/services/playerService.js';

let playerService;

beforeEach(() => {
  playerService = createPlayerService();
});

test('playerService stores and returns the active player instance', () => {
  const mockPlayer = {
    nodes: {
      get: (guildId) => ({ guildId })
    }
  };

  playerService.setPlayer(mockPlayer);

  assert.equal(playerService.getPlayer(), mockPlayer);
  assert.deepEqual(playerService.getGuildQueue('guild-1'), { guildId: 'guild-1' });

  playerService.setPlayer(null);
  assert.equal(playerService.getPlayer(), null);
  assert.equal(playerService.getGuildQueue('guild-1'), null);
});
