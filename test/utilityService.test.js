import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getAvatarSummary,
  getBotInfoSummary,
  getRoleInfoSummary,
  getServerInfoSummary,
  getUserInfoSummary
} from '../src/services/utilityService.js';

test('getAvatarSummary returns display name and image URL', () => {
  const user = {
    id: 'user-1',
    username: 'leaf',
    displayName: 'Leaf',
    displayAvatarURL: () => 'https://cdn.example/avatar.png'
  };

  assert.deepEqual(getAvatarSummary({ user }), {
    displayName: 'Leaf',
    imageUrl: 'https://cdn.example/avatar.png',
    userId: 'user-1'
  });
});

test('getUserInfoSummary includes account and guild member data', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const joinedAt = new Date('2026-02-01T00:00:00.000Z');
  const summary = getUserInfoSummary({
    user: {
      id: 'user-1',
      tag: 'leaf#0001',
      username: 'leaf',
      bot: false,
      createdAt,
      displayAvatarURL: () => 'avatar'
    },
    member: {
      joinedAt,
      roles: {
        cache: new Map([
          ['guild-id', { id: 'guild-id', name: '@everyone' }],
          ['role-1', { id: 'role-1', name: 'Admin' }]
        ])
      }
    },
    guildId: 'guild-id'
  });

  assert.equal(summary.userId, 'user-1');
  assert.equal(summary.joinedAt, joinedAt);
  assert.deepEqual(summary.roles, ['Admin']);
});

test('getServerInfoSummary includes stable guild counts', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const summary = getServerInfoSummary({
    guild: {
      id: 'guild-1',
      name: 'World',
      memberCount: 42,
      createdAt,
      iconURL: () => 'icon',
      channels: { cache: new Map([['a', {}], ['b', {}]]) },
      roles: { cache: new Map([['everyone', {}], ['admin', {}]]) }
    }
  });

  assert.equal(summary.channelCount, 2);
  assert.equal(summary.roleCount, 2);
});

test('getBotInfoSummary returns runtime details without process coupling', () => {
  const summary = getBotInfoSummary({
    client: {
      user: {
        tag: 'World Tree#0001',
        id: 'bot-id',
        displayAvatarURL: () => 'avatar'
      },
      guilds: { cache: new Map([['guild', {}]]) },
      ws: { ping: 21 }
    },
    uptimeMs: 60_000
  });

  assert.equal(summary.guildCount, 1);
  assert.equal(summary.websocketLatency, 21);
});

test('getRoleInfoSummary returns role metadata', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const summary = getRoleInfoSummary({
    role: {
      id: 'role-1',
      name: 'Admin',
      color: 0x2f7d5c,
      hoist: true,
      mentionable: false,
      managed: false,
      members: { size: 3 },
      createdAt
    }
  });

  assert.equal(summary.memberCount, 3);
  assert.equal(summary.hexColor, '#2f7d5c');
});
