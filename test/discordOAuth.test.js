import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  DISCORD_AUTHORIZE_URL,
  DISCORD_TOKEN_URL,
  DISCORD_USER_URL,
  buildAuthorizeUrl,
  createPkceChallenge,
  exchangeDiscordCode,
  fetchDiscordUser,
  generateOAuthState,
  generatePkceVerifier,
  isTimingSafeEqual
} from '../src/api/plugins/discordOAuthPlugin.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('discordOAuthPlugin helpers', () => {
  it('generates PKCE verifiers from 48 random bytes', () => {
    const verifier = generatePkceVerifier();

    assert.equal(verifier.length, 64);
    assert.match(verifier, /^[A-Za-z0-9_-]+$/);
  });

  it('generates random PKCE verifiers and OAuth states', () => {
    assert.notEqual(generatePkceVerifier(), generatePkceVerifier());
    assert.notEqual(generateOAuthState(), generateOAuthState());
    assert.equal(generateOAuthState().length, 43);
  });

  it('creates S256 PKCE challenges', () => {
    const verifier = 'test-verifier';
    const expectedChallenge = createHash('sha256').update(verifier).digest('base64url');

    assert.equal(createPkceChallenge(verifier), expectedChallenge);
  });

  it('builds Discord authorize URLs with PKCE and no prompt consent', () => {
    const authorizeUrl = buildAuthorizeUrl({
      clientId: 'client-id',
      redirectUri: 'https://api.worldtree.example/v1/auth/callback',
      state: 'state-value',
      codeChallenge: 'challenge-value'
    });

    const parsedUrl = new URL(authorizeUrl);

    assert.equal(`${parsedUrl.origin}${parsedUrl.pathname}`, DISCORD_AUTHORIZE_URL);
    assert.equal(parsedUrl.searchParams.get('response_type'), 'code');
    assert.strictEqual(parsedUrl.searchParams.get('client_id'), 'client-id');
    assert.strictEqual(parsedUrl.searchParams.get('redirect_uri'), 'https://api.worldtree.example/v1/auth/callback');
    assert.strictEqual(parsedUrl.searchParams.get('scope'), 'identify guilds');
    assert.strictEqual(parsedUrl.searchParams.get('state'), 'state-value');
    assert.strictEqual(parsedUrl.searchParams.get('code_challenge'), 'challenge-value');
    assert.equal(parsedUrl.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(parsedUrl.searchParams.has('prompt'), false);
  });

  it('compares OAuth state values with timing-safe equality', () => {
    assert.equal(isTimingSafeEqual('same-state', 'same-state'), true);
    assert.equal(isTimingSafeEqual('same-state', 'other-state'), false);
    assert.equal(isTimingSafeEqual('same-state', 'same-state-longer'), false);
  });

  it('exchanges authorization codes using form encoding and PKCE verifier', async () => {
    let capturedRequest;
    const fetchImpl = async (url, options) => {
      capturedRequest = { url, options, body: new URLSearchParams(options.body.toString()) };
      return jsonResponse({
        access_token: 'discord-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });
    };

    const token = await exchangeDiscordCode({
      code: 'authorization-code',
      codeVerifier: 'pkce-verifier',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://api.worldtree.example/v1/auth/callback',
      fetchImpl
    });

    assert.equal(capturedRequest.url, DISCORD_TOKEN_URL);
    assert.equal(capturedRequest.options.method, 'POST');
    assert.equal(capturedRequest.options.headers['content-type'], 'application/x-www-form-urlencoded');
    assert.equal(capturedRequest.body.get('grant_type'), 'authorization_code');
    assert.equal(capturedRequest.body.get('code'), 'authorization-code');
    assert.equal(capturedRequest.body.get('redirect_uri'), 'https://api.worldtree.example/v1/auth/callback');
    assert.equal(capturedRequest.body.get('client_id'), 'client-id');
    assert.equal(capturedRequest.body.get('client_secret'), 'client-secret');
    assert.equal(capturedRequest.body.get('code_verifier'), 'pkce-verifier');
    assert.equal(capturedRequest.options.signal instanceof AbortSignal, true);
    assert.deepEqual(token, {
      accessToken: 'discord-access-token',
      expiresIn: 3600
    });
  });

  it('rejects failed token exchanges without exposing token details', async () => {
    await assert.rejects(
      () => exchangeDiscordCode({
        code: 'authorization-code',
        codeVerifier: 'pkce-verifier',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://api.worldtree.example/v1/auth/callback',
        fetchImpl: async () => jsonResponse({ error: 'invalid_grant' }, 400)
      }),
      /token_exchange_failed/
    );
  });

  it('fetches Discord user identity with bearer auth and exposes safe fields', async () => {
    let capturedRequest;
    const user = await fetchDiscordUser({
      accessToken: 'discord-access-token',
      fetchImpl: async (url, options) => {
        capturedRequest = { url, options };
        return jsonResponse({
          id: '123456789',
          username: 'worldtree',
          global_name: 'World Tree',
          avatar: 'avatar-hash',
          email: 'hidden@example.com'
        });
      }
    });

    assert.equal(capturedRequest.url, DISCORD_USER_URL);
    assert.equal(capturedRequest.options.method, 'GET');
    assert.equal(capturedRequest.options.headers.authorization, 'Bearer discord-access-token');
    assert.deepEqual(user, {
      id: '123456789',
      username: 'worldtree',
      globalName: 'World Tree',
      avatar: 'avatar-hash'
    });
  });
});
