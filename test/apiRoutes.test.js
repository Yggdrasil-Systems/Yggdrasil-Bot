import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../src/api/server.js';
import { DEFAULT_AUTOMOD, DEFAULT_MODERATION_SETTINGS } from '../src/utils/constants.js';

describe('API Routes', () => {
  let app;
  
  const mockDiscordClient = {
    isReady: () => true,
    ws: { ping: 42 },
    guilds: {
      cache: {
        get: (id) => {
          if (id === '123') return { memberCount: 100 };
          return undefined;
        }
      }
    }
  };

  before(async () => {
    app = await createServer(mockDiscordClient);

    // Mock the services specifically for these route tests
    app.services.settingsService = {
      getSettings: async (guildId) => {
        if (guildId === 'error') throw new Error('DB error');
        return {
          guildId,
          _id: 'internal_mongo_id',
          __v: 0,
          automod: { ...DEFAULT_AUTOMOD, enabled: true },
          moderation: { ...DEFAULT_MODERATION_SETTINGS },
          trustedAdminRoleIds: ['role1'],
          featureToggles: { moderation: true, automod: true, utility: true }
        };
      }
    };

    app.services.moderationService = {
      listCases: async ({ guildId, targetUserId, limit, filters }) => {
        if (guildId === 'error') return { ok: false, reason: 'DB error' };
        
        const cases = [
          {
            caseId: 2,
            guildId,
            targetUserId: 'user1',
            moderatorId: 'mod1',
            actionType: 'warn',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            _id: 'some_mongo_id'
          }
        ];

        if (limit === 2) {
          cases.push({
            caseId: 1,
            guildId,
            targetUserId: 'user1',
            moderatorId: 'mod1',
            actionType: 'warn',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            _id: 'another_mongo_id'
          });
        }
        
        return { ok: true, cases };
      },
      getCaseStats: async ({ guildId }) => {
        return {
          ok: true,
          stats: {
            total: 5,
            byAction: { warn: 5 },
            byStatus: { active: 5 }
          }
        };
      }
    };
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /v1/guilds/:guildId/settings', () => {
    it('returns settings and strips MongoDB internal fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/guilds/123/settings'
      });

      assert.strictEqual(response.statusCode, 200);
      const payload = JSON.parse(response.payload);
      
      assert.strictEqual(payload.guildId, '123');
      assert.strictEqual(payload.trustedAdminRoleIds[0], 'role1');
      assert.strictEqual(payload.automod.enabled, true);
      
      // Zod validation should strip these automatically
      assert.strictEqual(payload._id, undefined);
      assert.strictEqual(payload.__v, undefined);
    });
  });

  describe('GET /v1/guilds/:guildId/cases', () => {
    it('returns paginated cases and nextCursor, stripping internal fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/guilds/123/cases?limit=2'
      });

      assert.strictEqual(response.statusCode, 200);
      const payload = JSON.parse(response.payload);
      
      assert.strictEqual(payload.data.length, 2);
      assert.strictEqual(payload.data[0].caseId, 2);
      assert.strictEqual(payload.data[1].caseId, 1);
      assert.strictEqual(payload.nextCursor, 1);
      assert.strictEqual(payload.data[0]._id, undefined);
    });

    it('handles query parameter validation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/guilds/123/cases?limit=1000'
      });

      // Limit should be constrained by max 50
      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('GET /v1/guilds/:guildId/stats', () => {
    it('combines moderation stats and discord stats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/guilds/123/stats'
      });

      assert.strictEqual(response.statusCode, 200);
      const payload = JSON.parse(response.payload);
      
      assert.strictEqual(payload.moderation.total, 5);
      assert.strictEqual(payload.moderation.byAction.warn, 5);
      assert.strictEqual(payload.server.memberCount, 100);
    });
  });
});
