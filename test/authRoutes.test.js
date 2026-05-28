import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createServer } from '../src/api/server.js';
import { SESSION_COOKIE_NAME } from '../src/api/plugins/sessionPlugin.js';
import {
  OAUTH_PKCE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME
} from '../src/api/plugins/discordOAuthPlugin.js';

const AUTH_ENV = Object.freeze({
  clientId: 'discord-client-id',
  discordClientSecret: 'discord-client-secret',
  sessionSecret: '12345678901234567890123456789012',
  dashboardOrigin: 'https://dashboard.worldtree.example',
  apiOrigin: 'https://api.worldtree.example',
  isProduction: false
});

const mockDiscordClient = {
  isReady: () => true,
  ws: { ping: 42 }
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function getSetCookies(response) {
  const setCookie = response.headers['set-cookie'];
  if (!setCookie) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

function getCookiePair(setCookie) {
  return setCookie.split(';')[0];
}

function getCookieName(setCookie) {
  return getCookiePair(setCookie).split('=')[0];
}

function findSetCookie(response, name) {
  return getSetCookies(response).find((cookie) => getCookieName(cookie) === name);
}

function buildCookieHeaderFromResponse(response) {
  return getSetCookies(response).map(getCookiePair).join('; ');
}

function buildCookieHeaderFromSetCookies(setCookies) {
  return setCookies.map(getCookiePair).join('; ');
}

function getAuthorizeParams(response) {
  return new URL(response.headers.location).searchParams;
}

function tamperCookieHeader(cookieHeader, cookieName) {
  return cookieHeader
    .split('; ')
    .map((cookie) => {
      if (!cookie.startsWith(`${cookieName}=`)) {
        return cookie;
      }
      return `${cookie.slice(0, -1)}${cookie.endsWith('a') ? 'b' : 'a'}`;
    })
    .join('; ');
}

function createFetchStub({
  tokenStatus = 200,
  userStatus = 200,
  userStatuses = null,
  token = 'discord-access-token',
  userId = '123456789'
} = {}) {
  const calls = [];
  let userCallCount = 0;

  const fetchImpl = async (url, options) => {
    calls.push({ url, options });

    if (url === 'https://discord.com/api/v10/oauth2/token') {
      return jsonResponse(
        tokenStatus === 200
          ? { access_token: token, token_type: 'Bearer', expires_in: 3600 }
          : { error: 'invalid_grant' },
        tokenStatus
      );
    }

    if (url === 'https://discord.com/api/v10/users/@me') {
      const currentUserStatus = Array.isArray(userStatuses)
        ? userStatuses[Math.min(userCallCount++, userStatuses.length - 1)]
        : userStatus;

      return jsonResponse(
        currentUserStatus === 200
          ? {
              id: userId,
              username: 'worldtree',
              global_name: 'World Tree',
              avatar: 'avatar-hash',
              email: 'hidden@example.com'
            }
          : { message: 'Unauthorized' },
        currentUserStatus
      );
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  return { fetchImpl, calls };
}

async function buildAuthApp(fetchImpl = createFetchStub().fetchImpl) {
  return createServer(mockDiscordClient, {
    env: AUTH_ENV,
    fetchImpl
  });
}

async function startLogin(app) {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/auth/login'
  });

  return {
    response,
    state: getAuthorizeParams(response).get('state'),
    cookieHeader: buildCookieHeaderFromResponse(response)
  };
}

async function completeCallback(app, { state, cookieHeader, code = 'authorization-code' }) {
  return app.inject({
    method: 'GET',
    url: `/v1/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    headers: { cookie: cookieHeader }
  });
}

describe('auth routes', () => {
  it('redirects login to Discord with state and PKCE cookies', async () => {
    const app = await buildAuthApp();

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/login'
    });

    await app.close();

    const params = getAuthorizeParams(response);
    const stateCookie = findSetCookie(response, OAUTH_STATE_COOKIE_NAME);
    const pkceCookie = findSetCookie(response, OAUTH_PKCE_COOKIE_NAME);

    assert.equal(response.statusCode, 302);
    assert.equal(new URL(response.headers.location).origin, 'https://discord.com');
    assert.equal(params.get('response_type'), 'code');
    assert.equal(params.get('client_id'), 'discord-client-id');
    assert.equal(params.get('redirect_uri'), 'https://api.worldtree.example/v1/auth/callback');
    assert.equal(params.get('scope'), 'identify');
    assert.equal(params.get('code_challenge_method'), 'S256');
    assert.ok(params.get('code_challenge'));
    assert.ok(params.get('state'));
    assert.equal(params.has('prompt'), false);

    for (const cookie of [stateCookie, pkceCookie]) {
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /SameSite=Lax/);
      assert.match(cookie, /Path=\/v1\/auth\/callback/);
      assert.match(cookie, /Max-Age=300/);
      assert.doesNotMatch(cookie, /Secure/);
    }
  });

  it('sets Secure OAuth cookies in production', async () => {
    const app = await createServer(mockDiscordClient, {
      env: { ...AUTH_ENV, isProduction: true },
      fetchImpl: createFetchStub().fetchImpl
    });

    const response = await app.inject({ method: 'GET', url: '/v1/auth/login' });

    await app.close();

    assert.match(findSetCookie(response, OAUTH_STATE_COOKIE_NAME), /Secure/);
    assert.match(findSetCookie(response, OAUTH_PKCE_COOKIE_NAME), /Secure/);
  });

  it('completes callback, clears OAuth cookies, issues session, and redirects to dashboard origin', async () => {
    const { fetchImpl, calls } = createFetchStub();
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);

    const response = await completeCallback(app, login);

    await app.close();

    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, AUTH_ENV.dashboardOrigin);
    assert.match(findSetCookie(response, OAUTH_STATE_COOKIE_NAME), /Max-Age=0/);
    assert.match(findSetCookie(response, OAUTH_PKCE_COOKIE_NAME), /Max-Age=0/);

    const sessionCookie = findSetCookie(response, SESSION_COOKIE_NAME);
    assert.ok(sessionCookie);
    assert.equal(sessionCookie.includes('discord-access-token'), false);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://discord.com/api/v10/oauth2/token');
    assert.equal(calls[1].url, 'https://discord.com/api/v10/users/@me');
  });

  it('rejects malformed callback requests and clears OAuth cookies', async () => {
    const { fetchImpl, calls } = createFetchStub();
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/callback?code=authorization-code',
      headers: { cookie: login.cookieHeader }
    });

    await app.close();

    assert.equal(response.statusCode, 400);
    assert.match(findSetCookie(response, OAUTH_STATE_COOKIE_NAME), /Max-Age=0/);
    assert.match(findSetCookie(response, OAUTH_PKCE_COOKIE_NAME), /Max-Age=0/);
    assert.equal(calls.length, 0);
  });

  it('rejects missing state cookies', async () => {
    const { fetchImpl, calls } = createFetchStub();
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);
    const cookiesWithoutState = getSetCookies(login.response).filter(
      (cookie) => getCookieName(cookie) !== OAUTH_STATE_COOKIE_NAME
    );

    const response = await completeCallback(app, {
      state: login.state,
      cookieHeader: buildCookieHeaderFromSetCookies(cookiesWithoutState)
    });

    await app.close();

    assert.equal(response.statusCode, 400);
    assert.equal(calls.length, 0);
  });

  it('rejects tampered PKCE verifier cookies', async () => {
    const { fetchImpl, calls } = createFetchStub();
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);

    const response = await completeCallback(app, {
      state: login.state,
      cookieHeader: tamperCookieHeader(login.cookieHeader, OAUTH_PKCE_COOKIE_NAME)
    });

    await app.close();

    assert.equal(response.statusCode, 400);
    assert.equal(calls.length, 0);
  });

  it('rejects malformed state values without calling Discord', async () => {
    const { fetchImpl, calls } = createFetchStub();
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);

    const response = await completeCallback(app, {
      state: `${login.state}tampered`,
      cookieHeader: login.cookieHeader
    });

    await app.close();

    assert.equal(response.statusCode, 400);
    assert.equal(calls.length, 0);
  });

  it('clears OAuth cookies so normal browser replay is rejected before Discord calls', async () => {
    const { fetchImpl, calls } = createFetchStub();
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);
    const firstCallback = await completeCallback(app, login);
    const clearedCookieHeader = buildCookieHeaderFromResponse(firstCallback);

    const replay = await completeCallback(app, {
      state: login.state,
      cookieHeader: clearedCookieHeader
    });

    await app.close();

    assert.equal(firstCallback.statusCode, 302);
    assert.equal(replay.statusCode, 400);
    assert.equal(calls.length, 2);
  });

  it('rejects token exchange failures and does not issue a session cookie', async () => {
    const { fetchImpl } = createFetchStub({ tokenStatus: 400 });
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);

    const response = await completeCallback(app, login);

    await app.close();

    assert.equal(response.statusCode, 502);
    assert.equal(findSetCookie(response, SESSION_COOKIE_NAME), undefined);
    assert.match(findSetCookie(response, OAUTH_STATE_COOKIE_NAME), /Max-Age=0/);
    assert.match(findSetCookie(response, OAUTH_PKCE_COOKIE_NAME), /Max-Age=0/);
  });

  it('rejects identity fetch failures and does not issue a session cookie', async () => {
    const { fetchImpl } = createFetchStub({ userStatus: 500 });
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);

    const response = await completeCallback(app, login);

    await app.close();

    assert.equal(response.statusCode, 502);
    assert.equal(findSetCookie(response, SESSION_COOKIE_NAME), undefined);
  });

  it('does not allow dynamic redirect targets', async () => {
    const app = await buildAuthApp(createFetchStub().fetchImpl);
    const login = await startLogin(app);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/auth/callback?code=authorization-code&state=${encodeURIComponent(login.state)}&redirect=https://evil.example`,
      headers: { cookie: login.cookieHeader }
    });

    await app.close();

    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, AUTH_ENV.dashboardOrigin);
  });

  it('returns live Discord identity from /auth/me for valid sessions', async () => {
    const { fetchImpl, calls } = createFetchStub();
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);
    const callback = await completeCallback(app, login);
    const sessionCookie = getCookiePair(findSetCookie(callback, SESSION_COOKIE_NAME));

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { cookie: sessionCookie }
    });

    await app.close();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.payload), {
      id: '123456789',
      username: 'worldtree',
      globalName: 'World Tree',
      avatar: 'avatar-hash'
    });
    assert.equal(calls.length, 3);
  });

  it('rejects /auth/me without a session', async () => {
    const app = await buildAuthApp(createFetchStub().fetchImpl);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/me'
    });

    await app.close();

    assert.equal(response.statusCode, 401);
  });

  it('clears session when Discord rejects /auth/me token', async () => {
    const { fetchImpl } = createFetchStub({ userStatuses: [200, 401] });
    const app = await buildAuthApp(fetchImpl);
    const login = await startLogin(app);
    const callback = await completeCallback(app, login);
    const sessionCookie = getCookiePair(findSetCookie(callback, SESSION_COOKIE_NAME));

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { cookie: sessionCookie }
    });

    await app.close();

    assert.equal(response.statusCode, 401);
    assert.match(findSetCookie(response, SESSION_COOKIE_NAME), /Max-Age=0/);
  });

  it('logs out valid sessions by clearing the session cookie', async () => {
    const app = await buildAuthApp(createFetchStub().fetchImpl);
    const login = await startLogin(app);
    const callback = await completeCallback(app, login);
    const sessionCookie = getCookiePair(findSetCookie(callback, SESSION_COOKIE_NAME));

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: { cookie: sessionCookie }
    });

    await app.close();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.payload), { ok: true });
    assert.match(findSetCookie(response, SESSION_COOKIE_NAME), /Max-Age=0/);
  });

  it('rejects logout without a session', async () => {
    const app = await buildAuthApp(createFetchStub().fetchImpl);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout'
    });

    await app.close();

    assert.equal(response.statusCode, 401);
  });
});
