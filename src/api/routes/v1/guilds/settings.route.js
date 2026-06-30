import { z } from 'zod';

export const settingsResponseSchema = z.object({
  guildId: z.string(),
  modLogChannelId: z.string().nullable().optional(),
  musicPanel: z.object({
    channelId: z.string(),
    messageId: z.string()
  }).nullable().optional(),
  trustedAdminRoleIds: z.array(z.string()).default([]),
  moderation: z.object({
    requireReason: z.boolean(),
    caseLogEnabled: z.boolean()
  }),
  automod: z.object({
    enabled: z.boolean(),
    logActions: z.boolean(),
    ignoredChannelIds: z.array(z.string()).default([]),
    ignoredRoleIds: z.array(z.string()).default([]),
    rules: z.record(z.object({
      enabled: z.boolean(),
      words: z.array(z.string()).optional(),
      threshold: z.number().optional(),
      windowSeconds: z.number().optional(),
      allowList: z.array(z.string()).optional(),
      minLength: z.number().optional(),
      ratio: z.number().optional(),
      punishment: z.object({
        action: z.string(),
        timeoutDuration: z.string().optional()
      }).optional()
    }))
  }),
  featureToggles: z.object({
    moderation: z.boolean(),
    automod: z.boolean(),
    utility: z.boolean()
  }),
  activityRoles: z.object({
    spotify: z.object({ enabled: z.boolean(), roleId: z.string().nullable() }),
    streaming: z.object({ enabled: z.boolean(), roleId: z.string().nullable() }),
    gaming: z.object({ enabled: z.boolean(), roleId: z.string().nullable() }),
    voice: z.object({ enabled: z.boolean(), roleId: z.string().nullable() })
  }).optional()
});

export const getSettingsParamsSchema = z.object({
  guildId: z.string()
});

export async function settingsRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: fastify.guildAdminGuard,
    schema: {
      params: getSettingsParamsSchema,
      response: {
        200: settingsResponseSchema
      }
    }
  }, async (request, reply) => {
    const { guildId } = request.params;
    const { settingsService } = fastify.services;

    const settings = await settingsService.getSettings(guildId);
    return settings;
  });
}
