import { z } from 'zod';

export const statsResponseSchema = z.object({
  moderation: z.object({
    total: z.number(),
    byAction: z.record(z.number()),
    byStatus: z.record(z.number())
  }),
  server: z.object({
    memberCount: z.number().nullable()
  })
});

export const getStatsParamsSchema = z.object({
  guildId: z.string()
});

export async function statsRoutes(fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.guildAdminGuard,
      schema: {
        params: getStatsParamsSchema,
        response: {
          200: statsResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { guildId } = request.params;
      const { moderationService, discordClient } = fastify.services;

      const statsResult = await moderationService.getCaseStats({ guildId });
      if (!statsResult.ok) {
        throw fastify.httpErrors.internalServerError('Failed to fetch case stats.');
      }

      const guild = discordClient?.guilds?.cache?.get(guildId);

      return {
        moderation: statsResult.stats,
        server: {
          memberCount: guild?.memberCount ?? null
        }
      };
    }
  );
}
