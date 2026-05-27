import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../src/api/server.js';
import { z } from 'zod';

describe('API Server', () => {
  let app;
  
  // Create a mock discord client
  const mockDiscordClient = {
    isReady: () => true,
    ws: { ping: 42 }
  };

  before(async () => {
    app = await createServer(mockDiscordClient);
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
    
    assert.strictEqual(typeof payload.database, 'string');
  });

  it('formats zod validation errors cleanly via errorHandler', async () => {
    const validationApp = await createServer(mockDiscordClient);
    
    // Add a dummy route to test validation
    validationApp.post('/v1/test-validation', {
      schema: {
        body: z.object({
          name: z.string()
        })
      }
    }, async (request, reply) => {
      return { success: true };
    });

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
});
