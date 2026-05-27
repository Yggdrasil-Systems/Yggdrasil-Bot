import { z } from 'zod';

export const caseResponseSchema = z.object({
  caseId: z.number(),
  guildId: z.string(),
  targetUserId: z.string().nullable().optional(),
  moderatorId: z.string(),
  actionType: z.string(),
  reason: z.string().optional(),
  status: z.string(),
  duration: z.string().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  expiresAt: z.union([z.date(), z.string()]).nullable().optional(),
  resolvedAt: z.union([z.date(), z.string()]).nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
  resolutionReason: z.string().nullable().optional(),
  deletedMessageCount: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()])
});

export const casesResponseSchema = z.object({
  data: z.array(caseResponseSchema),
  nextCursor: z.number().nullable()
});

export const getCasesParamsSchema = z.object({
  guildId: z.string()
});

export const getCasesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.coerce.number().optional(),
  targetUserId: z.string().optional()
});

export async function casesRoutes(fastify, opts) {
  fastify.get('/', {
    schema: {
      params: getCasesParamsSchema,
      querystring: getCasesQuerySchema,
      response: {
        200: casesResponseSchema
      }
    }
  }, async (request, reply) => {
    const { guildId } = request.params;
    const { limit, cursor, targetUserId } = request.query;
    const { moderationService } = fastify.services;

    const result = await moderationService.listCases({
      guildId,
      targetUserId,
      limit,
      filters: { cursor }
    });

    if (!result.ok) {
      throw fastify.httpErrors.internalServerError(result.reason);
    }

    const cases = result.cases;
    let nextCursor = null;

    if (cases.length === limit) {
      nextCursor = cases[cases.length - 1].caseId;
    }

    return {
      data: cases,
      nextCursor
    };
  });
}
