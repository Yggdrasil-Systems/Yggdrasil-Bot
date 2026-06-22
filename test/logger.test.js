import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createLogger, logger } from '../src/utils/logger.js';

function createCaptureStream() {
  const entries = [];

  return {
    entries,
    stream: {
      write(chunk) {
        entries.push(JSON.parse(String(chunk)));
      }
    }
  };
}

describe('Logger', () => {
  it('exports the existing logger call shape', () => {
    assert.equal(typeof logger.info, 'function');
    assert.equal(typeof logger.warn, 'function');
    assert.equal(typeof logger.error, 'function');
    assert.equal(typeof logger.debug, 'function');
    assert.equal(typeof logger.child, 'function');
  });

  it('emits structured info logs through Pino', () => {
    const capture = createCaptureStream();
    const testLogger = createLogger({
      isProduction: true,
      stream: capture.stream
    });

    testLogger.info('Structured message', { guildId: '123' });

    assert.equal(capture.entries.length, 1);
    assert.equal(capture.entries[0].scope, 'World Tree');
    assert.equal(capture.entries[0].level, 'info');
    assert.equal(capture.entries[0].msg, 'Structured message');
    assert.deepEqual(capture.entries[0].details, { guildId: '123' });
  });

  it('formats error details safely', () => {
    const capture = createCaptureStream();
    const testLogger = createLogger({
      isProduction: true,
      stream: capture.stream
    });

    testLogger.error('Test error message', new Error('Test error'));

    assert.equal(capture.entries.length, 1);
    assert.equal(capture.entries[0].level, 'error');
    assert.equal(capture.entries[0].msg, 'Test error message');
    assert.equal(capture.entries[0].details.type, 'Error');
    assert.equal(capture.entries[0].details.message, 'Test error');
  });

  it('filters debug logs below the configured level', () => {
    const capture = createCaptureStream();
    const testLogger = createLogger({
      isProduction: true,
      level: 'info',
      stream: capture.stream
    });

    testLogger.debug('Hidden debug message');

    assert.equal(capture.entries.length, 0);
  });

  it('supports child logger bindings', () => {
    const capture = createCaptureStream();
    const testLogger = createLogger({
      isProduction: true,
      stream: capture.stream
    }).child({ component: 'activityRoleService', guildId: 'guild-1' });

    testLogger.info('Child message');

    assert.equal(capture.entries[0].component, 'activityRoleService');
    assert.equal(capture.entries[0].guildId, 'guild-1');
  });

  it('redacts auth-sensitive values from messages and details', () => {
    const capture = createCaptureStream();
    const testLogger = createLogger({
      isProduction: true,
      stream: capture.stream
    });

    testLogger.info(
      'Callback /v1/auth/callback?code=secret-code&state=secret-state',
      { accessToken: 'secret-token', nested: { client_secret: 'secret-client' } }
    );

    assert.equal(
      capture.entries[0].msg,
      'Callback /v1/auth/callback?code=[REDACTED]&state=[REDACTED]'
    );
    assert.equal(capture.entries[0].details.accessToken, '[REDACTED]');
    assert.equal(capture.entries[0].details.nested.client_secret, '[REDACTED]');
  });
});
