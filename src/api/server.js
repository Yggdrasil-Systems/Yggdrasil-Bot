import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod';

import { logger } from '../utils/logger.js';
import { errorHandler } from './plugins/errorHandler.js';
import { servicesPlugin } from './plugins/servicesPlugin.js';
import { healthRoutes } from './routes/v1/health/health.route.js';
import { settingsRoutes } from './routes/v1/guilds/settings.route.js';
import { casesRoutes } from './routes/v1/guilds/cases.route.js';
import { statsRoutes } from './routes/v1/guilds/stats.route.js';

/**
 * Creates and configures the Fastify server instance.
 */
export async function createServer(discordClient) {
  // We use Fastify's native Pino logger, but we adapt it so it doesn't
  // clash too heavily with the bot's console output.
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
            remoteAddress: request.ip,
          };
        }
      }
    },
    disableRequestLogging: true // We'll handle request logging cleanly
  });

  // Setup Zod compiler for validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Global Error Handler
  app.register(errorHandler);

  // Clean request logging
  app.addHook('onRequest', async (request, reply) => {
    app.log.debug({ req: request }, 'Incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    app.log.info(
      { req: request, res: { statusCode: reply.statusCode }, responseTime: reply.getResponseTime() },
      `${request.method} ${request.url} - ${reply.statusCode} [${Math.round(reply.getResponseTime())}ms]`
    );
  });

  // Inject shared services
  app.register(servicesPlugin, { client: discordClient });

  // Register Routes
  app.register(healthRoutes, { prefix: '/v1/health' });
  app.register(settingsRoutes, { prefix: '/v1/guilds/:guildId/settings' });
  app.register(casesRoutes, { prefix: '/v1/guilds/:guildId/cases' });
  app.register(statsRoutes, { prefix: '/v1/guilds/:guildId/stats' });

  return app;
}
