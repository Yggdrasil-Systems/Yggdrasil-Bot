import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer, sanitizeRequestUrl } from '../src/api/server.js';
import { z } from 'zod';

describe('API Server', () => {
  let app;

  // Create a mock discord client
  const mockDiscordClient = {
    isReady: () => true,
    ws: { ping: 42 }
  };

  before(async () => {
    app = await createServer(mockDiscordClient, {
      dbConnection: { readyState: 1 }
    });
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it('responds with 200 on /v1/health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health'
    });

    assert.strictEqual(response.statusCode, 200);

    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.status, 'ok');
    assert.strictEqual(typeof payload.uptime, 'number');

    assert.strictEqual(payload.discord.status, 'ready');
    assert.strictEqual(payload.discord.ping, 42);

    assert.strictEqual(payload.database.status, 'connected');
    assert.strictEqual(payload.database.readyState, 1);
    assert.strictEqual(typeof payload.memory.heapUsed, 'number');
  });

  it('returns 503 from /v1/health when Discord is disconnected', async () => {
    const unhealthyApp = await createServer(
      {
        isReady: () => false,
        ws: { ping: null }
      },
      {
        dbConnection: { readyState: 1 }
      }
    );

    const response = await unhealthyApp.inject({
      method: 'GET',
      url: '/v1/health'
    });

    await unhealthyApp.close();

    assert.strictEqual(response.statusCode, 503);

    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.status, 'degraded');
    assert.strictEqual(payload.discord.status, 'disconnected');
    assert.strictEqual(payload.database.status, 'connected');
    assert.strictEqual(typeof payload.memory.rss, 'number');
  });

  it('returns 503 from /v1/health when MongoDB is disconnected', async () => {
    const unhealthyApp = await createServer(mockDiscordClient, {
      dbConnection: { readyState: 0 }
    });

    const response = await unhealthyApp.inject({
      method: 'GET',
      url: '/v1/health'
    });

    await unhealthyApp.close();

    assert.strictEqual(response.statusCode, 503);

    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.status, 'degraded');
    assert.strictEqual(payload.discord.status, 'ready');
    assert.strictEqual(payload.database.status, 'disconnected');
  });

  it('rate limits repeated API requests', async () => {
    const limitedApp = await createServer(mockDiscordClient, {
      rateLimit: {
        globalMax: 1,
        authMax: 1,
        timeWindow: '1 minute'
      }
    });

    limitedApp.get('/v1/rate-limit-test', async () => ({ ok: true }));

    const first = await limitedApp.inject({
      method: 'GET',
      url: '/v1/rate-limit-test',
      remoteAddress: '203.0.113.1'
    });

    const second = await limitedApp.inject({
      method: 'GET',
      url: '/v1/rate-limit-test',
      remoteAddress: '203.0.113.1'
    });

    await limitedApp.close();

    assert.strictEqual(first.statusCode, 200);
    assert.strictEqual(second.statusCode, 429);
  });

  it('applies stricter rate limits to auth endpoints', async () => {
    const authApp = await createServer(mockDiscordClient, {
      env: {
        clientId: 'client-id',
        discordClientSecret: 'client-secret',
        dashboardOrigin: 'http://localhost:5173',
        apiOrigin: 'http://localhost:3000',
        sessionSecret: '12345678901234567890123456789012',
        isProduction: false
      },
      rateLimit: {
        globalMax: 100,
        authMax: 1,
        timeWindow: '1 minute'
      }
    });

    const first = await authApp.inject({
      method: 'GET',
      url: '/v1/auth/login',
      remoteAddress: '203.0.113.2'
    });

    const second = await authApp.inject({
      method: 'GET',
      url: '/v1/auth/login',
      remoteAddress: '203.0.113.2'
    });

    await authApp.close();

    assert.strictEqual(first.statusCode, 302);
    assert.strictEqual(second.statusCode, 429);
  });

  it('formats zod validation errors cleanly via errorHandler', async () => {
    const validationApp = await createServer(mockDiscordClient);

    // Add a dummy route to test validation
    validationApp.post(
      '/v1/test-validation',
      {
        schema: {
          body: z.object({
            name: z.string()
          })
        }
      },
      async (_request, _reply) => {
        return { success: true };
      }
    );

    const response = await validationApp.inject({
      method: 'POST',
      url: '/v1/test-validation',
      payload: { wrongField: 'hello' }
    });

    await validationApp.close();

    assert.strictEqual(response.statusCode, 400);

    const payload = JSON.parse(response.payload);
    // Standard fastify error format for validation unless overriden, but our errorHandler catches `error.validation`.
    // Wait, our errorHandler only kicks in for zod validation if it has `error.validation`. Fastify's default compiler sets `error.validation`.
    assert.strictEqual(payload.error, 'Bad Request');
  });

  it('registers dashboard cookie/session infrastructure when auth env is provided', async () => {
    const authApp = await createServer(mockDiscordClient, {
      env: {
        dashboardOrigin: 'http://localhost:5173',
        sessionSecret: '12345678901234567890123456789012',
        isProduction: false
      }
    });

    authApp.get('/v1/test-session', { preHandler: authApp.sessionDecorator }, async (request) => ({
      session: request.session
    }));

    const response = await authApp.inject({
      method: 'GET',
      url: '/v1/test-session',
      headers: {
        origin: 'http://localhost:5173'
      }
    });

    await authApp.close();

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.deepStrictEqual(JSON.parse(response.payload), { session: null });
  });

  it('redacts OAuth callback query parameters from request logs', () => {
    assert.strictEqual(
      sanitizeRequestUrl('/v1/auth/callback?code=authorization-code&state=oauth-state'),
      '/v1/auth/callback'
    );

    assert.strictEqual(sanitizeRequestUrl('/v1/guilds/123/cases?limit=2'), '/v1/guilds/123/cases?limit=2');
  });
});
