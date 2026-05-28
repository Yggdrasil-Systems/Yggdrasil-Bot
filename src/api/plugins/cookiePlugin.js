import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';

export const cookiePlugin = fp(async (fastify, opts) => {
  const { sessionSecret } = opts;

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is required for signed cookies.');
  }

  await fastify.register(cookie, {
    secret: sessionSecret,
    algorithm: 'sha256',
    hook: 'onRequest'
  });
}, {
  name: 'cookiePlugin'
});
