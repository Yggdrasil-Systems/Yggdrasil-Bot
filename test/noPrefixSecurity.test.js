import assert from 'node:assert/strict';
import { Collection, PermissionsBitField } from 'discord.js';
import { describe, it } from 'node:test';

import { handleMessageCommand } from '../src/middleware/messageCommandRouter.js';
import { createModerationService } from '../src/services/moderationService.js';

function member({ id, permissions = [], position = 1 }) {
  return {
    id,
    user: { id, username: id },
    permissions: new PermissionsBitField(permissions),
    roles: { cache: new Map(), highest: { position } },
    manageable: true,
    moderatable: true,
    kickable: true,
    bannable: true
  };
}

function createRouterMessage({ trustedRoles = ['trusted-role'], memberRoles = [['trusted-role', {}]], noPrefixAllowed = true, command }) {
  const replies = [];
  const commands = new Collection([['purge', command]]);
  return {
    replies,
    message: {
      content: 'purge 10',
      author: { id: 'trusted-user', bot: false },
      member: {
        ...member({ id: 'trusted-user', permissions: [] }),
        roles: { cache: new Map(memberRoles), highest: { position: 1 } }
      },
      guild: { id: 'guild-1', ownerId: 'owner' },
      client: {
        commands,
        noPrefixService: { canUseNoPrefix: async () => noPrefixAllowed },
        settingsService: { getEffectiveSettings: async () => ({ trustedAdminRoleIds: trustedRoles }) }
      },
      reply: async (payload) => replies.push(payload)
    }
  };
}

describe('no-prefix security middleware', () => {
  it('trusted admin invoking moderation still fails without Discord permission', async () => {
    const service = createModerationService({
      moderationRepository: { createCase: async (payload) => payload },
      settingsRepository: { getOrCreate: async () => ({}) },
      loggingService: { sendModerationLog: async () => true }
    });

    const result = await service.warn({
      guild: { id: 'guild-1', ownerId: 'owner' },
      moderatorMember: member({ id: 'trusted-user', permissions: [] }),
      targetMember: member({ id: 'target', position: 0 }),
      reason: 'spam'
    });

    assert.equal(result.ok, false);
  });

  it('trusted admin cannot action a member above them in role hierarchy', async () => {
    const service = createModerationService({
      moderationRepository: { createCase: async (payload) => payload },
      settingsRepository: { getOrCreate: async () => ({}) },
      loggingService: { sendModerationLog: async () => true }
    });

    const result = await service.kick({
      guild: { id: 'guild-1', ownerId: 'owner' },
      moderatorMember: member({ id: 'trusted-user', permissions: [PermissionsBitField.Flags.KickMembers], position: 1 }),
      targetMember: member({ id: 'target', position: 5 }),
      reason: 'spam'
    });

    assert.equal(result.ok, false);
  });

  it('non-trusted no-prefix user is silently ignored', async () => {
    const { message, replies } = createRouterMessage({
      noPrefixAllowed: false,
      command: { name: 'purge', allowNoPrefix: true, executeMessage: async () => replies.push('executed') }
    });

    const handled = await handleMessageCommand(message);

    assert.deepEqual([handled, replies.length], [false, 0]);
  });

  it('isNoPrefixInvocation flag is present but does not affect permission outcome', async () => {
    let context;
    const { message } = createRouterMessage({
      command: { name: 'purge', allowNoPrefix: true, executeMessage: async (ctx) => { context = ctx; } }
    });

    await handleMessageCommand(message);

    assert.equal(context.isNoPrefixInvocation, true);
  });

  it('removing a trusted role from config revokes no-prefix admin access immediately', async () => {
    let executed = false;
    const { message } = createRouterMessage({
      trustedRoles: [],
      command: { name: 'purge', allowNoPrefix: true, adminOnly: true, executeMessage: async () => { executed = true; } }
    });

    await handleMessageCommand(message);

    assert.equal(executed, false);
  });
});
