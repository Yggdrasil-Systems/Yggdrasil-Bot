import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ActivityType } from 'discord.js';

import { createActivityRoleService } from '../src/services/activityRoleService.js';

function createMockPresence({ activities = [], guildId = 'guild-1' } = {}) {
  return {
    guild: {
      id: guildId,
      name: 'Test Server',
      roles: {
        cache: new Map(),
        fetch: async () => null
      },
      members: {
        me: null
      }
    },
    member: null,
    activities
  };
}

function createMockMember({ id = 'user-1', roles = [], bot = false } = {}) {
  const roleCache = new Map(roles.map((r) => [r.id, r]));
  return {
    id,
    user: { id, tag: `${id}#0001`, bot },
    roles: {
      cache: roleCache,
      highest: { position: 5 },
      add: async () => {},
      remove: async () => {}
    },
    guild: {
      ownerId: 'owner-1',
      roles: {
        cache: new Map(),
        fetch: async (id) => roleCache.get(id) ?? null
      },
      members: {
        me: {
          id: 'bot-1',
          permissions: { has: () => true },
          roles: {
            highest: { position: 10 }
          }
        }
      }
    }
  };
}

function createMockRole({ id = 'role-1', position = 2 } = {}) {
  return { id, position };
}

function createMockActivity({ name, type }) {
  return { name, type };
}

function createMockSettingsService(activityRoles = {}) {
  return {
    getEffectiveSettings: async () => ({
      activityRoles
    })
  };
}

const log = { debug: () => {}, info: () => {}, error: () => {}, warn: () => {} };

// ─── Tests ─────────────────────────────────────────────────────────────────

test('activityRoleService skips when no guild or member', async () => {
  const service = createActivityRoleService({ settingsService: createMockSettingsService(), log });
  const result = await service.handlePresenceUpdate(null, null);

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
});

test('activityRoleService grants Spotify role when user starts listening', async () => {
  let roleAdded = false;
  const role = createMockRole({ id: 'spotify-role', position: 1 });
  const member = createMockMember({ id: 'user-1', roles: [] });
  member.roles.add = async (roleId) => {
    roleAdded = true;
  };

  const oldPresence = createMockPresence({ activities: [] });
  oldPresence.member = member;
  oldPresence.guild.members.me = member.guild.members.me;
  oldPresence.guild.roles.cache.set(role.id, role);

  const newPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  newPresence.member = member;
  newPresence.guild.members.me = member.guild.members.me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      spotify: { enabled: true, roleId: 'spotify-role' }
    }),
    log
  });

  const result = await service.handlePresenceUpdate(oldPresence, newPresence);

  assert.equal(roleAdded, true);
  assert.equal(result.results[0].action, 'granted');
  assert.equal(result.results[0].activityType, 'spotify');
});

test('activityRoleService grants Spotify role when old presence is unavailable', async () => {
  let roleAdded = false;
  const role = createMockRole({ id: 'spotify-role', position: 1 });
  const member = createMockMember({ id: 'user-1', roles: [] });
  member.roles.add = async () => {
    roleAdded = true;
  };

  const newPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  newPresence.member = member;
  newPresence.guild.members.me = member.guild.members.me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      spotify: { enabled: true, roleId: 'spotify-role' }
    }),
    log
  });

  const result = await service.handlePresenceUpdate(null, newPresence);

  assert.equal(roleAdded, true);
  assert.equal(result.results[0].action, 'granted');
  assert.equal(result.results[0].activityType, 'spotify');
});

test('activityRoleService removes Spotify role when user stops listening', async () => {
  let roleRemoved = false;
  const role = createMockRole({ id: 'spotify-role', position: 1 });
  const member = createMockMember({ id: 'user-1', roles: [role] });
  member.roles.cache.set(role.id, role);
  member.roles.remove = async (roleId) => {
    roleRemoved = true;
  };

  const oldPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  oldPresence.member = member;
  oldPresence.guild.members.me = member.guild.members.me;
  oldPresence.guild.roles.cache.set(role.id, role);

  const newPresence = createMockPresence({ activities: [] });
  newPresence.member = member;
  newPresence.guild.members.me = member.guild.members.me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      spotify: { enabled: true, roleId: 'spotify-role' }
    }),
    log
  });

  const result = await service.handlePresenceUpdate(oldPresence, newPresence);

  assert.equal(roleRemoved, true);
  assert.equal(result.results[0].action, 'removed');
});

test('activityRoleService skips when role is not configured', async () => {
  const member = createMockMember();
  const oldPresence = createMockPresence({ activities: [] });
  oldPresence.member = member;
  oldPresence.guild.members.me = member.guild.members.me;

  const newPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  newPresence.member = member;
  newPresence.guild.members.me = member.guild.members.me;

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({}),
    log
  });

  const result = await service.handlePresenceUpdate(oldPresence, newPresence);

  assert.equal(result.results.length, 0);
});

test('activityRoleService skips when bot lacks ManageRoles permission', async () => {
  const role = createMockRole({ id: 'spotify-role', position: 1 });
  const member = createMockMember();
  const me = {
    id: 'bot-1',
    permissions: { has: (perm) => false },
    roles: { highest: { position: 10 } }
  };

  const oldPresence = createMockPresence({ activities: [] });
  oldPresence.member = member;
  oldPresence.guild.members.me = me;
  oldPresence.guild.roles.cache.set(role.id, role);

  const newPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  newPresence.member = member;
  newPresence.guild.members.me = me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      spotify: { enabled: true, roleId: 'spotify-role' }
    }),
    log
  });

  const result = await service.handlePresenceUpdate(oldPresence, newPresence);

  assert.equal(result.results.length, 0);
});

test('activityRoleService skips when role is higher than bot highest role', async () => {
  const role = createMockRole({ id: 'spotify-role', position: 15 });
  const member = createMockMember();
  const me = {
    id: 'bot-1',
    permissions: { has: (perm) => true },
    roles: { highest: { position: 10 } }
  };

  const oldPresence = createMockPresence({ activities: [] });
  oldPresence.member = member;
  oldPresence.guild.members.me = me;
  oldPresence.guild.roles.cache.set(role.id, role);

  const newPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  newPresence.member = member;
  newPresence.guild.members.me = me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      spotify: { enabled: true, roleId: 'spotify-role' }
    }),
    log
  });

  const result = await service.handlePresenceUpdate(oldPresence, newPresence);

  assert.equal(result.results.length, 0);
});

test('activityRoleService skips bots but allows guild owners', async () => {
  const role = createMockRole({ id: 'spotify-role', position: 1 });
  const ownerMember = createMockMember({ id: 'owner-1' });
  ownerMember.guild.ownerId = 'owner-1';
  const botUserMember = createMockMember({ id: 'bot-user', bot: true });

  const oldPresence = createMockPresence({ activities: [] });
  oldPresence.member = ownerMember;
  oldPresence.guild.members.me = ownerMember.guild.members.me;
  oldPresence.guild.roles.cache.set(role.id, role);

  const newPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  newPresence.member = ownerMember;
  newPresence.guild.members.me = ownerMember.guild.members.me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      spotify: { enabled: true, roleId: 'spotify-role' }
    }),
    log
  });

  const result = await service.handlePresenceUpdate(oldPresence, newPresence);
  assert.equal(result.results[0].action, 'granted');

  oldPresence.member = botUserMember;
  newPresence.member = botUserMember;
  const botResult = await service.handlePresenceUpdate(oldPresence, newPresence);
  assert.equal(botResult.results.length, 0);
});

test('activityRoleService handles streaming activity', async () => {
  let roleAdded = false;
  const role = createMockRole({ id: 'streaming-role', position: 1 });
  const member = createMockMember({ id: 'user-1', roles: [] });
  member.roles.add = async () => {
    roleAdded = true;
  };

  const oldPresence = createMockPresence({ activities: [] });
  oldPresence.member = member;
  oldPresence.guild.members.me = member.guild.members.me;
  oldPresence.guild.roles.cache.set(role.id, role);

  const newPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Twitch', type: ActivityType.Streaming })]
  });
  newPresence.member = member;
  newPresence.guild.members.me = member.guild.members.me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      streaming: { enabled: true, roleId: 'streaming-role' }
    }),
    log
  });

  const result = await service.handlePresenceUpdate(oldPresence, newPresence);

  assert.equal(roleAdded, true);
  assert.equal(result.results[0].action, 'granted');
  assert.equal(result.results[0].activityType, 'streaming');
});

test('activityRoleService does not re-add role if user already has it', async () => {
  let addCalls = 0;
  const role = createMockRole({ id: 'spotify-role', position: 1 });
  const member = createMockMember({ id: 'user-1', roles: [role] });
  member.roles.cache.set(role.id, role);
  member.roles.add = async () => {
    addCalls += 1;
  };

  const oldPresence = createMockPresence({ activities: [] });
  oldPresence.member = member;
  oldPresence.guild.members.me = member.guild.members.me;
  oldPresence.guild.roles.cache.set(role.id, role);

  const newPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  newPresence.member = member;
  newPresence.guild.members.me = member.guild.members.me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      spotify: { enabled: true, roleId: 'spotify-role' }
    }),
    log
  });

  await service.handlePresenceUpdate(oldPresence, newPresence);

  assert.equal(addCalls, 0);
});

test('activityRoleService does not remove role if user does not have it', async () => {
  let removeCalls = 0;
  const role = createMockRole({ id: 'spotify-role', position: 1 });
  const member = createMockMember({ id: 'user-1', roles: [] });
  member.roles.remove = async () => {
    removeCalls += 1;
  };

  const oldPresence = createMockPresence({
    activities: [createMockActivity({ name: 'Spotify', type: ActivityType.Listening })]
  });
  oldPresence.member = member;
  oldPresence.guild.members.me = member.guild.members.me;
  oldPresence.guild.roles.cache.set(role.id, role);

  const newPresence = createMockPresence({ activities: [] });
  newPresence.member = member;
  newPresence.guild.members.me = member.guild.members.me;
  newPresence.guild.roles.cache.set(role.id, role);

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      spotify: { enabled: true, roleId: 'spotify-role' }
    }),
    log
  });

  await service.handlePresenceUpdate(oldPresence, newPresence);

  assert.equal(removeCalls, 0);
});

test('activityRoleService grants voice role when user joins voice', async () => {
  let roleAdded = false;
  const role = createMockRole({ id: 'voice-role', position: 1 });
  const member = createMockMember({ id: 'user-1', roles: [] });
  member.roles.add = async (roleId) => {
    if (roleId === role.id) roleAdded = true;
  };

  const guild = {
    id: 'guild-1',
    name: 'Test Server',
    ownerId: 'owner-1',
    roles: {
      cache: new Map([[role.id, role]]),
      fetch: async (id) => (role.id === id ? role : null)
    },
    members: member.guild.members
  };
  member.guild = guild;

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      voice: { enabled: true, roleId: 'voice-role' }
    }),
    log
  });

  const result = await service.handleVoiceStateUpdate(
    { guild, member, channelId: null },
    { guild, member, channelId: 'voice-channel' }
  );

  assert.equal(roleAdded, true);
  assert.equal(result.results[0].action, 'granted');
  assert.equal(result.results[0].activityType, 'voice');
});

test('activityRoleService removes voice role when user leaves voice', async () => {
  let roleRemoved = false;
  const role = createMockRole({ id: 'voice-role', position: 1 });
  const member = createMockMember({ id: 'user-1', roles: [role] });
  member.roles.cache.set(role.id, role);
  member.roles.remove = async (roleId) => {
    if (roleId === role.id) roleRemoved = true;
  };

  const guild = {
    id: 'guild-1',
    name: 'Test Server',
    ownerId: 'owner-1',
    roles: {
      cache: new Map([[role.id, role]]),
      fetch: async (id) => (role.id === id ? role : null)
    },
    members: member.guild.members
  };
  member.guild = guild;

  const service = createActivityRoleService({
    settingsService: createMockSettingsService({
      voice: { enabled: true, roleId: 'voice-role' }
    }),
    log
  });

  const result = await service.handleVoiceStateUpdate(
    { guild, member, channelId: 'voice-channel' },
    { guild, member, channelId: null }
  );

  assert.equal(roleRemoved, true);
  assert.equal(result.results[0].action, 'removed');
  assert.equal(result.results[0].activityType, 'voice');
});
