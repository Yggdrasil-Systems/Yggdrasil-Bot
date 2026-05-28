import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes
} from 'node:crypto';

import fp from 'fastify-plugin';

export const SESSION_COOKIE_NAME = 'wt_session';

const ENCRYPTION_VERSION = 'v1';
const AES_ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const SESSION_SECRET_MIN_LENGTH = 32;
const KEY_INFO = Buffer.from('world-tree:dashboard-session:access-token:v1');
const EMPTY_SALT = Buffer.alloc(0);

function assertSessionSecret(sessionSecret) {
  if (typeof sessionSecret !== 'string' || sessionSecret.length < SESSION_SECRET_MIN_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${SESSION_SECRET_MIN_LENGTH} characters.`);
  }
}

function deriveEncryptionKey(sessionSecret) {
  assertSessionSecret(sessionSecret);
  return Buffer.from(hkdfSync('sha256', Buffer.from(sessionSecret), EMPTY_SALT, KEY_INFO, 32));
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url');
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasValidEncryptedPayload(payload) {
  return (
    isObject(payload) &&
    typeof payload.discordUserId === 'string' &&
    payload.discordUserId.length > 0 &&
    typeof payload.accessToken === 'string' &&
    payload.accessToken.length > 0 &&
    Number.isInteger(payload.expiresAt)
  );
}

function buildCookieOptions({ expiresAt, isProduction }) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(isProduction),
    path: '/',
    signed: true,
    maxAge: Math.max(0, expiresAt - nowSeconds())
  };
}

function unauthorized(reply) {
  return reply.code(401).send({
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Invalid session'
  });
}

function readSessionFromCookie(request, sessionSecret) {
  const hasSessionCookie = Object.hasOwn(request.cookies ?? {}, SESSION_COOKIE_NAME);
  const signedCookie = request.cookies?.[SESSION_COOKIE_NAME];

  if (!hasSessionCookie) {
    return { ok: false, reason: 'missing' };
  }

  if (typeof signedCookie !== 'string' || signedCookie.length === 0) {
    return { ok: false, reason: 'malformed' };
  }

  const unsignedCookie = request.unsignCookie(signedCookie);

  if (!unsignedCookie.valid || !unsignedCookie.value) {
    return { ok: false, reason: 'signature' };
  }

  const session = deserializeSession(unsignedCookie.value, sessionSecret);

  if (!session) {
    return { ok: false, reason: 'payload' };
  }

  return { ok: true, session };
}

export function encryptAccessToken(accessToken, sessionSecret) {
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Access token must be a non-empty string.');
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(AES_ALGORITHM, deriveEncryptionKey(sessionSecret), iv, {
    authTagLength: AUTH_TAG_BYTES
  });

  const ciphertext = Buffer.concat([
    cipher.update(accessToken, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url')
  ].join('.');
}

export function decryptAccessToken(encryptedAccessToken, sessionSecret) {
  if (typeof encryptedAccessToken !== 'string') {
    throw new Error('Encrypted access token must be a string.');
  }

  const [version, encodedIv, encodedAuthTag, encodedCiphertext] = encryptedAccessToken.split('.');

  if (version !== ENCRYPTION_VERSION || !encodedIv || !encodedAuthTag || !encodedCiphertext) {
    throw new Error('Invalid encrypted access token.');
  }

  const iv = decodeBase64Url(encodedIv);
  const authTag = decodeBase64Url(encodedAuthTag);
  const ciphertext = decodeBase64Url(encodedCiphertext);

  if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES || ciphertext.length === 0) {
    throw new Error('Invalid encrypted access token.');
  }

  const decipher = createDecipheriv(AES_ALGORITHM, deriveEncryptionKey(sessionSecret), iv, {
    authTagLength: AUTH_TAG_BYTES
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString('utf8');
}

export function serializeSession(session, sessionSecret) {
  if (!isObject(session)) {
    throw new Error('Session must be an object.');
  }

  const { discordUserId, accessToken, expiresAt } = session;

  if (typeof discordUserId !== 'string' || discordUserId.length === 0) {
    throw new Error('Session discordUserId must be a non-empty string.');
  }

  if (!Number.isInteger(expiresAt)) {
    throw new Error('Session expiresAt must be an integer Unix timestamp.');
  }

  const payload = {
    discordUserId,
    accessToken: encryptAccessToken(accessToken, sessionSecret),
    expiresAt
  };

  return encodeBase64Url(JSON.stringify(payload));
}

export function deserializeSession(serializedSession, sessionSecret) {
  try {
    if (typeof serializedSession !== 'string' || serializedSession.length === 0) {
      return null;
    }

    const payload = JSON.parse(decodeBase64Url(serializedSession).toString('utf8'));

    if (!hasValidEncryptedPayload(payload) || payload.expiresAt <= nowSeconds()) {
      return null;
    }

    return {
      discordUserId: payload.discordUserId,
      accessToken: decryptAccessToken(payload.accessToken, sessionSecret),
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}

export const sessionPlugin = fp(async (fastify, opts) => {
  const { sessionSecret, isProduction = false } = opts;

  assertSessionSecret(sessionSecret);

  fastify.decorateRequest('session', null);

  fastify.decorateReply('setSessionCookie', function setSessionCookie(session) {
    const serializedSession = serializeSession(session, sessionSecret);

    return this.setCookie(
      SESSION_COOKIE_NAME,
      serializedSession,
      buildCookieOptions({ expiresAt: session.expiresAt, isProduction })
    );
  });

  fastify.decorateReply('clearSessionCookie', function clearSessionCookie() {
    return this.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(isProduction),
      path: '/'
    });
  });

  fastify.decorate('sessionDecorator', async function sessionDecorator(request, reply) {
    request.session = null;

    const result = readSessionFromCookie(request, sessionSecret);

    if (!result.ok) {
      if (result.reason !== 'missing') {
        reply.clearSessionCookie();
      }
      return;
    }

    request.session = result.session;
  });

  fastify.decorate('sessionGuard', async function sessionGuard(request, reply) {
    request.session = null;

    const result = readSessionFromCookie(request, sessionSecret);

    if (!result.ok) {
      if (result.reason !== 'missing') {
        reply.clearSessionCookie();
      }
      return unauthorized(reply);
    }

    request.session = result.session;
  });
}, {
  name: 'sessionPlugin',
  dependencies: ['cookiePlugin']
});
