import assert from 'node:assert/strict';
import { PermissionsBitField } from 'discord.js';
import { test } from 'node:test';

import {
  canUseAdminCommand,
  canUseNoPrefixShortcuts,
  hasPermission,
  hasTrustedAdminRole
} from '../src/middleware/permissionGuard.js';

test('canUseNoPrefixShortcuts allows only bot owner or explicit no-prefix grants', () => {
  assert.equal(
    canUseNoPrefixShortcuts({
      userId: 'owner',
      guildOwnerId: 'owner',
      botOwnerId: null,
      member: null,
      trustedAdminRoleIds: [],
      noPrefixAllowed: false
    }),
    false
  );

  assert.equal(
    canUseNoPrefixShortcuts({
      userId: 'bot-owner',
      guildOwnerId: 'server-owner',
      botOwnerId: 'bot-owner',
      member: null,
      trustedAdminRoleIds: [],
      noPrefixAllowed: false
    }),
    true
  );

  assert.equal(
    canUseNoPrefixShortcuts({
      userId: 'trusted',
      guildOwnerId: 'owner',
      botOwnerId: null,
      member: null,
      trustedAdminRoleIds: [],
      noPrefixAllowed: true
    }),
    true
  );
});

test('hasTrustedAdminRole checks guild-level trusted admin roles', () => {
  assert.equal(
    hasTrustedAdminRole(
      { roles: { cache: new Map([['role-a', {}]]) } },
      ['role-a']
    ),
    true
  );
});

test('canUseNoPrefixShortcuts rejects normal members', () => {
  assert.equal(
    canUseNoPrefixShortcuts({
      userId: 'member',
      guildOwnerId: 'owner',
      botOwnerId: null,
      member: {
        permissions: new PermissionsBitField(PermissionsBitField.Flags.Administrator),
        roles: { cache: new Map() }
      },
      trustedAdminRoleIds: [],
      noPrefixAllowed: false
    }),
    false
  );
});

test('hasPermission checks member permissions safely', () => {
  assert.equal(
    hasPermission(
      { permissions: new PermissionsBitField(PermissionsBitField.Flags.ManageMessages) },
      PermissionsBitField.Flags.ManageMessages
    ),
    true
  );

  assert.equal(hasPermission(null, PermissionsBitField.Flags.ManageMessages), false);
});

test('canUseAdminCommand grants access to members with MANAGE_GUILD permission', () => {
  const member = {
    permissions: new PermissionsBitField(PermissionsBitField.Flags.ManageGuild),
    roles: { cache: new Map() }
  };

  assert.equal(
    canUseAdminCommand({
      userId: 'user',
      guildOwnerId: 'owner',
      botOwnerId: 'bot-owner',
      member,
      trustedAdminRoleIds: []
    }),
    true
  );
});

test('canUseAdminCommand denies access to members without admin or manage guild permissions', () => {
  const member = {
    permissions: new PermissionsBitField(PermissionsBitField.Flags.SendMessages),
    roles: { cache: new Map() }
  };

  assert.equal(
    canUseAdminCommand({
      userId: 'user',
      guildOwnerId: 'owner',
      botOwnerId: 'bot-owner',
      member,
      trustedAdminRoleIds: []
    }),
    false
  );
});
