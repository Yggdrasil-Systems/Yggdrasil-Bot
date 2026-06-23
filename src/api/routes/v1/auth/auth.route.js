import { z } from 'zod';

import {
  OAUTH_PKCE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME
} from '../../../plugins/discordOAuthPlugin.js';

const meResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  globalName: z.string().nullable(),
  avatar: z.string().nullable()
});

const logoutResponseSchema = z.object({
  ok: z.boolean()
});

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function invalidCallback(reply) {
  return reply.code(400).send({
    statusCode: 400,
    error: 'Bad Request',
    message: 'Invalid OAuth callback'
  });
}

function badGateway(reply) {
  return reply.code(502).send({
    statusCode: 502,
    error: 'Bad Gateway',
    message: 'Discord authentication failed'
  });
}

function invalidSession(reply) {
  return reply.code(401).send({
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Invalid session'
  });
}

function getAuthErrorCode(error) {
  return typeof error?.code === 'string' ? error.code : 'discord_auth_failed';
}

function getAuthErrorStatus(error) {
  return Number.isInteger(error?.statusCode) ? error.statusCode : 500;
}

function normalizeQueryValue(value) {
  return typeof value === 'string' ? value : '';
}

export async function authRoutes(fastify) {
  const authRouteConfig = {
    config: {
      rateLimit: fastify.authRateLimit
    }
  };

  fastify.get('/login', authRouteConfig, async (request, reply) => {
    const state = fastify.discordOAuth.generateOAuthState();
    const verifier = fastify.discordOAuth.generatePkceVerifier();
    const codeChallenge = fastify.discordOAuth.createPkceChallenge(verifier);
    const authorizeUrl = fastify.discordOAuth.buildAuthorizeUrl({
      state,
      codeChallenge
    });

    return reply
      .setOAuthStateCookie(state)
      .setPkceVerifierCookie(verifier)
      .redirect(authorizeUrl);
  });

  fastify.get('/callback', authRouteConfig, async (request, reply) => {
    const code = normalizeQueryValue(request.query?.code);
    const state = normalizeQueryValue(request.query?.state);

    const stateCookie = fastify.discordOAuth.readSignedCookie(request, OAUTH_STATE_COOKIE_NAME);
    const verifierCookie = fastify.discordOAuth.readSignedCookie(request, OAUTH_PKCE_COOKIE_NAME);

    reply.clearOAuthCookies();

    if (!code || !state || !stateCookie.ok || !verifierCookie.ok) {
      return invalidCallback(reply);
    }

    if (!fastify.discordOAuth.isTimingSafeEqual(state, stateCookie.value)) {
      return invalidCallback(reply);
    }

    try {
      const token = await fastify.discordOAuth.exchangeCode({
        code,
        codeVerifier: verifierCookie.value
      });

      const user = await fastify.discordOAuth.fetchDiscordUser({
        accessToken: token.accessToken
      });

      reply.setSessionCookie({
        discordUserId: user.id,
        accessToken: token.accessToken,
        expiresAt: nowSeconds() + token.expiresIn
      });

      request.log.info({ discordUserId: user.id }, 'OAuth login completed');

      return reply.redirect(fastify.discordOAuth.dashboardOrigin);
    } catch (error) {
      request.log.warn(
        { authError: getAuthErrorCode(error), statusCode: getAuthErrorStatus(error) },
        'OAuth callback failed'
      );
      return badGateway(reply);
    }
  });

  fastify.get('/me', {
    ...authRouteConfig,
    preHandler: fastify.sessionGuard,
    schema: {
      response: {
        200: meResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const user = await fastify.discordOAuth.fetchDiscordUser({
        accessToken: request.session.accessToken
      });

      return user;
    } catch (error) {
      request.log.warn(
        {
          authError: getAuthErrorCode(error),
          statusCode: getAuthErrorStatus(error),
          discordUserId: request.session.discordUserId
        },
        'Discord identity fetch failed'
      );

      if (error?.statusCode === 401 || error?.code === 'discord_identity_unauthorized') {
        reply.clearSessionCookie();
        return invalidSession(reply);
      }

      return badGateway(reply);
    }
  });

  fastify.post('/logout', {
    ...authRouteConfig,
    preHandler: fastify.sessionGuard,
    schema: {
      response: {
        200: logoutResponseSchema
      }
    }
  }, async (request, reply) => {
    reply.clearSessionCookie();
    return { ok: true };
  });
}
