import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import fp from 'fastify-plugin';

export const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
export const DISCORD_TOKEN_URL = 'https://discord.com/api/v10/oauth2/token';
export const DISCORD_USER_URL = 'https://discord.com/api/v10/users/@me';
export const DISCORD_USER_GUILDS_URL = 'https://discord.com/api/v10/users/@me/guilds';

export const OAUTH_STATE_COOKIE_NAME = 'wt_oauth_state';
export const OAUTH_PKCE_COOKIE_NAME = 'wt_pkce_verifier';

const OAUTH_COOKIE_PATH = '/v1/auth/callback';
const OAUTH_COOKIE_MAX_AGE_SECONDS = 300;
const OAUTH_SCOPE = 'identify guilds';
const DISCORD_REQUEST_TIMEOUT_MS = 10000;

export class DiscordOAuthError extends Error {
  constructor(code, statusCode = 500) {
    super(code);
    this.name = 'DiscordOAuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
}

function buildRedirectUri(apiOrigin) {
  return `${apiOrigin}/v1/auth/callback`;
}

function buildOAuthCookieOptions(isProduction) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(isProduction),
    path: OAUTH_COOKIE_PATH,
    signed: true,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
  };
}

function buildClearOAuthCookieOptions(isProduction) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(isProduction),
    path: OAUTH_COOKIE_PATH
  };
}

function readSignedCookie(request, cookieName) {
  const hasCookie = Object.hasOwn(request.cookies ?? {}, cookieName);
  const signedCookie = request.cookies?.[cookieName];

  if (!hasCookie) {
    return { ok: false, reason: 'missing' };
  }

  if (typeof signedCookie !== 'string' || signedCookie.length === 0) {
    return { ok: false, reason: 'malformed' };
  }

  const unsignedCookie = request.unsignCookie(signedCookie);

  if (!unsignedCookie.valid || !unsignedCookie.value) {
    return { ok: false, reason: 'signature' };
  }

  return { ok: true, value: unsignedCookie.value };
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new DiscordOAuthError('discord_request_timeout', 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJsonResponse(response, errorCode) {
  try {
    return await response.json();
  } catch {
    throw new DiscordOAuthError(errorCode, 502);
  }
}

function normalizeDiscordUser(payload) {
  if (!payload || typeof payload.id !== 'string' || typeof payload.username !== 'string') {
    throw new DiscordOAuthError('discord_identity_invalid', 502);
  }

  return {
    id: payload.id,
    username: payload.username,
    globalName: typeof payload.global_name === 'string' ? payload.global_name : null,
    avatar: typeof payload.avatar === 'string' ? payload.avatar : null
  };
}

function normalizeDiscordGuild(payload) {
  if (!payload || typeof payload.id !== 'string' || typeof payload.name !== 'string') {
    throw new DiscordOAuthError('discord_guilds_invalid', 502);
  }

  return {
    id: payload.id,
    name: payload.name,
    icon: typeof payload.icon === 'string' ? payload.icon : null,
    owner: Boolean(payload.owner),
    permissions: typeof payload.permissions === 'string' ? payload.permissions : '0'
  };
}

export function generatePkceVerifier() {
  return randomBytes(48).toString('base64url');
}

export function createPkceChallenge(verifier) {
  assertNonEmptyString(verifier, 'verifier');
  return createHash('sha256').update(verifier).digest('base64url');
}

export function generateOAuthState() {
  return randomBytes(32).toString('base64url');
}

export function isTimingSafeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge }) {
  const authorizeUrl = new URL(DISCORD_AUTHORIZE_URL);

  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', OAUTH_SCOPE);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  return authorizeUrl.toString();
}

export async function exchangeDiscordCode({
  code,
  codeVerifier,
  clientId,
  clientSecret,
  redirectUri,
  fetchImpl = globalThis.fetch,
  timeoutMs = DISCORD_REQUEST_TIMEOUT_MS
}) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier
  });

  const response = await fetchWithTimeout(
    fetchImpl,
    DISCORD_TOKEN_URL,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new DiscordOAuthError('token_exchange_failed', response.status);
  }

  const payload = await parseJsonResponse(response, 'token_exchange_invalid');

  if (
    !payload ||
    typeof payload.access_token !== 'string' ||
    payload.access_token.length === 0 ||
    !Number.isInteger(payload.expires_in) ||
    payload.expires_in <= 0
  ) {
    throw new DiscordOAuthError('token_exchange_invalid', 502);
  }

  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in
  };
}

export async function fetchDiscordUser({
  accessToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = DISCORD_REQUEST_TIMEOUT_MS
}) {
  const response = await fetchWithTimeout(
    fetchImpl,
    DISCORD_USER_URL,
    {
      method: 'GET',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    },
    timeoutMs
  );

  if (response.status === 401) {
    throw new DiscordOAuthError('discord_identity_unauthorized', 401);
  }

  if (!response.ok) {
    throw new DiscordOAuthError('discord_identity_failed', response.status);
  }

  const payload = await parseJsonResponse(response, 'discord_identity_invalid');

  return normalizeDiscordUser(payload);
}

export async function fetchDiscordUserGuilds({
  accessToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = DISCORD_REQUEST_TIMEOUT_MS
}) {
  const response = await fetchWithTimeout(
    fetchImpl,
    DISCORD_USER_GUILDS_URL,
    {
      method: 'GET',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    },
    timeoutMs
  );

  if (response.status === 401) {
    throw new DiscordOAuthError('discord_guilds_unauthorized', 401);
  }

  if (!response.ok) {
    throw new DiscordOAuthError('discord_guilds_failed', response.status);
  }

  const payload = await parseJsonResponse(response, 'discord_guilds_invalid');

  if (!Array.isArray(payload)) {
    throw new DiscordOAuthError('discord_guilds_invalid', 502);
  }

  return payload.reduce((guilds, entry) => {
    try {
      guilds.push(normalizeDiscordGuild(entry));
    } catch {
      // Skip malformed guild entries from Discord's response
    }
    return guilds;
  }, []);
}

export const discordOAuthPlugin = fp(
  async (fastify, opts) => {
    const {
      clientId,
      clientSecret,
      dashboardOrigin,
      apiOrigin,
      isProduction = false,
      fetchImpl = globalThis.fetch
    } = opts;

    assertNonEmptyString(clientId, 'CLIENT_ID');
    assertNonEmptyString(clientSecret, 'DISCORD_CLIENT_SECRET');
    assertNonEmptyString(dashboardOrigin, 'DASHBOARD_ORIGIN');
    assertNonEmptyString(apiOrigin, 'API_ORIGIN');

    const redirectUri = buildRedirectUri(apiOrigin);

    fastify.decorateReply('setOAuthStateCookie', function setOAuthStateCookie(state) {
      return this.setCookie(OAUTH_STATE_COOKIE_NAME, state, buildOAuthCookieOptions(isProduction));
    });

    fastify.decorateReply('setPkceVerifierCookie', function setPkceVerifierCookie(verifier) {
      return this.setCookie(OAUTH_PKCE_COOKIE_NAME, verifier, buildOAuthCookieOptions(isProduction));
    });

    fastify.decorateReply('clearOAuthCookies', function clearOAuthCookies() {
      this.clearCookie(OAUTH_STATE_COOKIE_NAME, buildClearOAuthCookieOptions(isProduction));
      return this.clearCookie(OAUTH_PKCE_COOKIE_NAME, buildClearOAuthCookieOptions(isProduction));
    });

    fastify.decorate('discordOAuth', {
      clientId,
      dashboardOrigin,
      redirectUri,
      buildAuthorizeUrl({ state, codeChallenge }) {
        return buildAuthorizeUrl({
          clientId,
          redirectUri,
          state,
          codeChallenge
        });
      },
      generateOAuthState,
      generatePkceVerifier,
      createPkceChallenge,
      isTimingSafeEqual,
      readSignedCookie,
      exchangeCode({ code, codeVerifier }) {
        return exchangeDiscordCode({
          code,
          codeVerifier,
          clientId,
          clientSecret,
          redirectUri,
          fetchImpl
        });
      },
      fetchDiscordUser({ accessToken }) {
        return fetchDiscordUser({
          accessToken,
          fetchImpl
        });
      },
      fetchDiscordUserGuilds({ accessToken }) {
        return fetchDiscordUserGuilds({
          accessToken,
          fetchImpl
        });
      }
    });
  },
  {
    name: 'discordOAuthPlugin',
    dependencies: ['cookiePlugin', 'sessionPlugin']
  }
);
