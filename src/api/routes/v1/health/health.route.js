import { z } from 'zod';
import mongoose from 'mongoose';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  uptime: z.number(),
  timestamp: z.string(),
  discord: z.object({
    status: z.enum(['ready', 'disconnected']),
    ping: z.number().nullable()
  }),
  database: z.object({
    status: z.enum(['connected', 'connecting', 'disconnected']),
    readyState: z.number()
  }),
  memory: z.object({
    rss: z.number(),
    heapUsed: z.number(),
    heapTotal: z.number()
  })
});

function getDatabaseStatus(readyState) {
  if (readyState === 1) {
    return 'connected';
  }

  if (readyState === 2) {
    return 'connecting';
  }

  return 'disconnected';
}

export async function healthRoutes(fastify, opts = {}) {
  fastify.get('/', {
    schema: {
      response: {
        200: healthResponseSchema,
        503: healthResponseSchema
      }
    }
  }, async (request, reply) => {
    const discordClient = fastify.services.discordClient;
    const dbConnection = opts.dbConnection ?? mongoose.connection;
    const dbState = dbConnection.readyState;
    const discordStatus = discordClient?.isReady() ? 'ready' : 'disconnected';
    const databaseStatus = getDatabaseStatus(dbState);
    const isHealthy = discordStatus === 'ready' && databaseStatus === 'connected';
    const memoryUsage = process.memoryUsage();

    const payload = {
      status: isHealthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      discord: {
        status: discordStatus,
        ping: discordClient?.ws?.ping ?? null
      },
      database: {
        status: databaseStatus,
        readyState: dbState
      },
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal
      }
    };

    return reply.code(isHealthy ? 200 : 503).send(payload);
  });
}
