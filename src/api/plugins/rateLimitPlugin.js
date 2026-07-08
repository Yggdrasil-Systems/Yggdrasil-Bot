import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

const DEFAULT_GLOBAL_MAX = 120;
const DEFAULT_AUTH_MAX = 20;
const DEFAULT_TIME_WINDOW = '1 minute';

function readPositiveNumber(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const rateLimitPlugin = fp(
  async function rateLimitPlugin(fastify, options = {}) {
    const globalMax = readPositiveNumber(options.globalMax, DEFAULT_GLOBAL_MAX);
    const authMax = readPositiveNumber(options.authMax, DEFAULT_AUTH_MAX);
    const timeWindow = options.timeWindow ?? DEFAULT_TIME_WINDOW;

    fastify.decorate(
      'authRateLimit',
      Object.freeze({
        max: authMax,
        timeWindow
      })
    );

    await fastify.register(rateLimit, {
      global: true,
      max: globalMax,
      timeWindow,
      allowList(request) {
        return request.url === '/v1/health' || request.url.startsWith('/v1/health?');
      },
      errorResponseBuilder(request, context) {
        return {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: context.after
        };
      }
    });
  },
  {
    name: 'world-tree-rate-limit'
  }
);
