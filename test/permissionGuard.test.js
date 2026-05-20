import assert from 'node:assert/strict';
import { PermissionsBitField } from 'discord.js';
import { test } from 'node:test';

import {
  canUseNoPrefixShortcuts,
  hasPermission,
  hasTrustedAdminRole
} from '../src/middleware/permissionGuard.js';

test('canUseNoPrefixShortcuts allows server owner and bot owner', () => {
  assert.equal(
    canUseNoPrefixShortcuts({
      userId: 'owner',
      guildOwnerId: 'owner',
      botOwnerId: null,
      member: null,
      trustedAdminRoleIds: []
    }),
    true
  );

  assert.equal(
    canUseNoPrefixShortcuts({
      userId: 'bot-owner',
      guildOwnerId: 'server-owner',
      botOwnerId: 'bot-owner',
      member: null,
      trustedAdminRoleIds: []
    }),
    true
  );
});

test('canUseNoPrefixShortcuts allows administrators and trusted admin roles', () => {
  assert.equal(
    canUseNoPrefixShortcuts({
      userId: 'admin',
      guildOwnerId: 'owner',
      botOwnerId: null,
      member: {
        permissions: new PermissionsBitField(PermissionsBitField.Flags.Administrator),
        roles: { cache: new Map() }
      },
      trustedAdminRoleIds: []
    }),
    true
  );

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
        permissions: new PermissionsBitField([]),
        roles: { cache: new Map() }
      },
      trustedAdminRoleIds: []
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
