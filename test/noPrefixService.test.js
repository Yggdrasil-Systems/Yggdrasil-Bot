import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createNoPrefixService } from '../src/services/noPrefixService.js';

test('noPrefixService always allows the bot owner', async () => {
  const service = createNoPrefixService(
    {
      findActiveByUserId: async () => null
    },
    { botOwnerId: 'owner' }
  );

  assert.equal(await service.canUseNoPrefix('owner'), true);
});

test('noPrefixService persists add, remove, and list operations', async () => {
  const calls = [];
  const service = createNoPrefixService(
    {
      upsertUser: async (payload) => {
        calls.push(['upsert', payload]);
        return { userId: payload.userId, active: true };
      },
      deactivateUser: async (payload) => {
        calls.push(['deactivate', payload]);
        return { userId: payload.userId, active: false };
      },
      listActiveUsers: async () => [{ userId: 'user-1', active: true }],
      findActiveByUserId: async () => ({ userId: 'user-1', active: true })
    },
    { botOwnerId: 'owner' }
  );

  await service.addUser({ userId: 'user-1', addedBy: 'owner', reason: 'trusted' });
  await service.removeUser({ userId: 'user-1', removedBy: 'owner', reason: 'cleanup' });
  const users = await service.listUsers();

  assert.equal(await service.canUseNoPrefix('user-1'), true);
  assert.equal(users[0].userId, 'user-1');
  assert.equal(calls[0][0], 'upsert');
  assert.equal(calls[1][0], 'deactivate');
});

test('noPrefixService caches no-prefix lookups and invalidates on updates', async () => {
  let lookups = 0;
  const service = createNoPrefixService(
    {
      findActiveByUserId: async () => {
        lookups += 1;
        return null;
      },
      upsertUser: async (payload) => ({ userId: payload.userId, active: true }),
      deactivateUser: async () => null,
      listActiveUsers: async () => []
    },
    { cacheTtlMs: 10_000 }
  );

  assert.equal(await service.canUseNoPrefix('user-1'), false);
  assert.equal(await service.canUseNoPrefix('user-1'), false);
  assert.equal(lookups, 1);

  await service.addUser({ userId: 'user-1', addedBy: 'owner' });
  await service.canUseNoPrefix('user-1');
  assert.equal(lookups, 2);
});
