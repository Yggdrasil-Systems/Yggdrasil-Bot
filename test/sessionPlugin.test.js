import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fastify from 'fastify';

import { cookiePlugin } from '../src/api/plugins/cookiePlugin.js';
import {
  SESSION_COOKIE_NAME,
  decryptAccessToken,
  deserializeSession,
  encryptAccessToken,
  serializeSession,
  sessionPlugin
} from '../src/api/plugins/sessionPlugin.js';

const SESSION_SECRET = '12345678901234567890123456789012';

async function buildSessionApp({ isProduction = false } = {}) {
  const app = fastify({ logger: false });

  await app.register(cookiePlugin, {
    sessionSecret: SESSION_SECRET
  });

  await app.register(sessionPlugin, {
    sessionSecret: SESSION_SECRET,
    isProduction
  });

  app.get('/issue', async (request, reply) => {
    reply.setSessionCookie({
      discordUserId: '123456789',
      accessToken: 'discord-access-token',
      expiresAt: Math.floor(Date.now() / 1000) + 60
    });

    return { ok: true };
  });

  app.get('/issue-expired', async (request, reply) => {
    reply.setSessionCookie({
      discordUserId: '123456789',
      accessToken: 'discord-access-token',
      expiresAt: Math.floor(Date.now() / 1000) - 1
    });

    return { ok: true };
  });

  app.get('/issue-corrupted', async (request, reply) => {
    reply.setCookie(SESSION_COOKIE_NAME, 'not-json', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      signed: true
    });

    return { ok: true };
  });

  app.get('/decorated-session', { preHandler: app.sessionDecorator }, async (request) => ({
    session: request.session
  }));

  app.get('/guarded-session', { preHandler: app.sessionGuard }, async (request) => ({
    session: request.session
  }));

  return app;
}

function extractCookie(setCookieHeader) {
  return setCookieHeader.split(';')[0];
}

function tamperCookie(cookieHeader) {
  return `${cookieHeader.slice(0, -1)}${cookieHeader.endsWith('a') ? 'b' : 'a'}`;
}

describe('sessionPlugin', () => {
  it('encrypts and decrypts Discord access tokens without plaintext leakage', () => {
    const encrypted = encryptAccessToken('discord-access-token', SESSION_SECRET);

    assert.notEqual(encrypted, 'discord-access-token');
    assert.equal(encrypted.includes('discord-access-token'), false);
    assert.equal(decryptAccessToken(encrypted, SESSION_SECRET), 'discord-access-token');
  });

  it('serializes and deserializes valid sessions', () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const serialized = serializeSession(
      {
        discordUserId: '123456789',
        accessToken: 'discord-access-token',
        expiresAt
      },
      SESSION_SECRET
    );

    assert.equal(serialized.includes('discord-access-token'), false);

    assert.deepEqual(deserializeSession(serialized, SESSION_SECRET), {
      discordUserId: '123456789',
      accessToken: 'discord-access-token',
      expiresAt
    });
  });

  it('sessionDecorator attaches request.session for valid signed session cookies', async () => {
    const app = await buildSessionApp();

    const issueResponse = await app.inject({ method: 'GET', url: '/issue' });
    const cookieHeader = extractCookie(issueResponse.headers['set-cookie']);
    const sessionResponse = await app.inject({
      method: 'GET',
      url: '/decorated-session',
      headers: { cookie: cookieHeader }
    });

    await app.close();

    assert.equal(sessionResponse.statusCode, 200);
    const payload = JSON.parse(sessionResponse.payload);
    assert.deepEqual(payload.session, {
      discordUserId: '123456789',
      accessToken: 'discord-access-token',
      expiresAt: payload.session.expiresAt
    });
    assert.equal(Number.isInteger(payload.session.expiresAt), true);
  });

  it('sets HttpOnly Lax path cookies with max-age and hides plaintext tokens', async () => {
    const app = await buildSessionApp();

    const response = await app.inject({ method: 'GET', url: '/issue' });
    const setCookie = response.headers['set-cookie'];

    await app.close();

    assert.match(setCookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Path=\//);
    assert.match(setCookie, /Max-Age=/);
    assert.doesNotMatch(setCookie, /Secure/);
    assert.equal(setCookie.includes('discord-access-token'), false);
  });

  it('sets Secure cookies in production', async () => {
    const app = await buildSessionApp({ isProduction: true });

    const response = await app.inject({ method: 'GET', url: '/issue' });

    await app.close();

    assert.match(response.headers['set-cookie'], /Secure/);
  });

  it('sessionDecorator leaves request.session null for invalid signatures', async () => {
    const app = await buildSessionApp();

    const response = await app.inject({
      method: 'GET',
      url: '/decorated-session',
      headers: { cookie: `${SESSION_COOKIE_NAME}=unsigned-value` }
    });

    await app.close();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.payload), { session: null });
  });

  it('sessionGuard rejects invalid signatures', async () => {
    const app = await buildSessionApp();

    const response = await app.inject({
      method: 'GET',
      url: '/guarded-session',
      headers: { cookie: `${SESSION_COOKIE_NAME}=unsigned-value` }
    });

    await app.close();

    assert.equal(response.statusCode, 401);
    assert.deepEqual(JSON.parse(response.payload), {
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid session'
    });
  });

  it('sessionGuard rejects tampered cookies', async () => {
    const app = await buildSessionApp();

    const issueResponse = await app.inject({ method: 'GET', url: '/issue' });
    const cookieHeader = tamperCookie(extractCookie(issueResponse.headers['set-cookie']));
    const response = await app.inject({
      method: 'GET',
      url: '/guarded-session',
      headers: { cookie: cookieHeader }
    });

    await app.close();

    assert.equal(response.statusCode, 401);
  });

  it('sessionGuard rejects expired sessions', async () => {
    const app = await buildSessionApp();

    const issueResponse = await app.inject({ method: 'GET', url: '/issue-expired' });
    const cookieHeader = extractCookie(issueResponse.headers['set-cookie']);
    const response = await app.inject({
      method: 'GET',
      url: '/guarded-session',
      headers: { cookie: cookieHeader }
    });

    await app.close();

    assert.equal(response.statusCode, 401);
  });

  it('sessionGuard rejects corrupted payloads', async () => {
    const app = await buildSessionApp();

    const issueResponse = await app.inject({ method: 'GET', url: '/issue-corrupted' });
    const cookieHeader = extractCookie(issueResponse.headers['set-cookie']);
    const response = await app.inject({
      method: 'GET',
      url: '/guarded-session',
      headers: { cookie: cookieHeader }
    });

    await app.close();

    assert.equal(response.statusCode, 401);
  });

  it('sessionGuard handles malformed cookie values without throwing', async () => {
    const app = await buildSessionApp();

    const response = await app.inject({
      method: 'GET',
      url: '/guarded-session',
      headers: { cookie: `${SESSION_COOKIE_NAME}=` }
    });

    await app.close();

    assert.equal(response.statusCode, 401);
  });

  it('sessionDecorator leaves request.session null when no session cookie is present', async () => {
    const app = await buildSessionApp();

    const response = await app.inject({ method: 'GET', url: '/decorated-session' });

    await app.close();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.payload), { session: null });
  });

  it('sessionGuard rejects missing session cookies', async () => {
    const app = await buildSessionApp();

    const response = await app.inject({ method: 'GET', url: '/guarded-session' });

    await app.close();

    assert.equal(response.statusCode, 401);
    assert.deepEqual(JSON.parse(response.payload), {
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid session'
    });
  });

  it('sessionGuard attaches request.session for valid signed session cookies', async () => {
    const app = await buildSessionApp();

    const issueResponse = await app.inject({ method: 'GET', url: '/issue' });
    const cookieHeader = extractCookie(issueResponse.headers['set-cookie']);
    const response = await app.inject({
      method: 'GET',
      url: '/guarded-session',
      headers: { cookie: cookieHeader }
    });

    await app.close();

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.payload).session.accessToken, 'discord-access-token');
  });
});
