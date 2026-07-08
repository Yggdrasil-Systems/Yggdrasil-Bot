import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';

import { logger } from '../utils/logger.js';
import { cookiePlugin } from './plugins/cookiePlugin.js';
import { discordOAuthPlugin } from './plugins/discordOAuthPlugin.js';
import { errorHandler } from './plugins/errorHandler.js';
import { rateLimitPlugin } from './plugins/rateLimitPlugin.js';
import { sessionPlugin } from './plugins/sessionPlugin.js';
import { servicesPlugin } from './plugins/servicesPlugin.js';
import { authRoutes } from './routes/v1/auth/auth.route.js';
import { healthRoutes } from './routes/v1/health/health.route.js';
import { settingsRoutes } from './routes/v1/guilds/settings.route.js';
import { casesRoutes } from './routes/v1/guilds/cases.route.js';
import { statsRoutes } from './routes/v1/guilds/stats.route.js';
import swaggerPlugin from '@fastify/swagger';
import swaggerUiPlugin from '@fastify/swagger-ui';

const AUTH_CALLBACK_PATH = '/v1/auth/callback';

export function sanitizeRequestUrl(url) {
  if (typeof url !== 'string') {
    return url;
  }

  try {
    const parsedUrl = new URL(url, 'http://world-tree.local');
    if (parsedUrl.pathname === AUTH_CALLBACK_PATH) {
      return AUTH_CALLBACK_PATH;
    }
  } catch {
    return url;
  }

  return url;
}

/**
 * Creates and configures the Fastify server instance.
 */
export async function createServer(
  discordClient,
  {
    env = discordClient?.appContext?.config ?? discordClient?.appContext?.runtimeConfig ?? {},
    fetchImpl = globalThis.fetch,
    rateLimit = {},
    dbConnection
  } = {}
) {
  // We use Fastify's native Pino logger, but we adapt it so it doesn't
  // clash too heavily with the bot's console output.
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: sanitizeRequestUrl(request.url),
            hostname: request.hostname,
            remoteAddress: request.ip
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

  app.register(rateLimitPlugin, rateLimit);

  if (env.dashboardOrigin) {
    app.register(cors, {
      origin: env.dashboardOrigin,
      credentials: true
    });
  }

  // Clean request logging
  app.addHook('onRequest', async (request, reply) => {
    app.log.debug({ req: request }, 'Incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    const sanitizedUrl = sanitizeRequestUrl(request.url);

    app.log.info(
      { req: request, res: { statusCode: reply.statusCode }, responseTime: reply.getResponseTime() },
      `${request.method} ${sanitizedUrl} - ${reply.statusCode} [${Math.round(reply.getResponseTime())}ms]`
    );
  });

  // Inject shared services
  app.register(servicesPlugin, { client: discordClient });

  if (env.sessionSecret) {
    app.register(cookiePlugin, { sessionSecret: env.sessionSecret });
    app.register(sessionPlugin, {
      sessionSecret: env.sessionSecret,
      isProduction: env.isProduction
    });
  }

  if (env.sessionSecret && env.clientId && env.discordClientSecret && env.dashboardOrigin && env.apiOrigin) {
    app.register(discordOAuthPlugin, {
      clientId: env.clientId,
      clientSecret: env.discordClientSecret,
      dashboardOrigin: env.dashboardOrigin,
      apiOrigin: env.apiOrigin,
      isProduction: env.isProduction,
      fetchImpl
    });

    app.register(authRoutes, { prefix: '/v1/auth' });
  }

  // Register Swagger
  app.register(swaggerPlugin, {
    openapi: {
      info: {
        title: 'World Tree API',
        description: 'Internal API for World Tree Discord Bot dashboard and services',
        version: '1.0.0'
      }
    },
    transform: jsonSchemaTransform
  });

  app.register(swaggerUiPlugin, {
    routePrefix: '/docs'
  });

  // Register Routes
  app.register(healthRoutes, { prefix: '/v1/health', dbConnection });
  app.register(settingsRoutes, { prefix: '/v1/guilds/:guildId/settings' });
  app.register(casesRoutes, { prefix: '/v1/guilds/:guildId/cases' });
  app.register(statsRoutes, { prefix: '/v1/guilds/:guildId/stats' });

  return app;
}
