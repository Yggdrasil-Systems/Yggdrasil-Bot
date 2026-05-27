import { z } from 'zod';
import mongoose from 'mongoose';

export const healthResponseSchema = z.object({
  status: z.string(),
  uptime: z.number(),
  discord: z.object({
    status: z.string(),
    ping: z.number().nullable()
  }),
  database: z.string()
});

export async function healthRoutes(fastify, opts) {
  fastify.get('/', {
    schema: {
      response: {
        200: healthResponseSchema
      }
    }
  }, async (request, reply) => {
    const discordClient = fastify.services.discordClient;
    
    // 0 = Ready, 1 = Connecting, 2 = Reconnecting, 3 = Idle, 4 = Nearly, 5 = Disconnected
    const discordStatusText = discordClient?.isReady() ? 'ready' : 'disconnected';
    
    const dbState = mongoose.connection.readyState;
    const dbStatusText = dbState === 1 ? 'connected' : (dbState === 2 ? 'connecting' : 'disconnected');

    return {
      status: 'ok',
      uptime: process.uptime(),
      discord: {
        status: discordStatusText,
        ping: discordClient?.ws?.ping ?? null
      },
      database: dbStatusText
    };
  });
}
