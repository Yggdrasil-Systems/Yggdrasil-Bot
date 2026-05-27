import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { logger } from '../src/utils/logger.js';

describe('Logger', () => {
  it('formats and outputs info logs', () => {
    const originalConsoleLog = console.log;
    const logSpy = mock.fn();
    console.log = logSpy;

    logger.info('Test info message');
    
    assert.strictEqual(logSpy.mock.calls.length, 1);
    assert.match(logSpy.mock.calls[0].arguments[0], /\[World Tree\] \[info\] Test info message/);

    console.log = originalConsoleLog;
  });

  it('formats and outputs error logs with error objects', () => {
    const originalConsoleError = console.error;
    const errorSpy = mock.fn();
    console.error = errorSpy;

    const errorObj = new Error('Test error');
    logger.error('Test error message', errorObj);
    
    assert.strictEqual(errorSpy.mock.calls.length, 2);
    assert.match(errorSpy.mock.calls[0].arguments[0], /\[World Tree\] \[error\] Test error message/);
    assert.strictEqual(errorSpy.mock.calls[1].arguments[0], errorObj);

    console.error = originalConsoleError;
  });

  it('formats and outputs debug logs in non-production', () => {
    const originalConsoleLog = console.log;
    const logSpy = mock.fn();
    console.log = logSpy;

    // By default tests run in non-production (unless NODE_ENV is explicitly production)
    logger.debug('Test debug message');
    
    // We expect it to log unless NODE_ENV=production
    if (process.env.NODE_ENV !== 'production') {
      assert.strictEqual(logSpy.mock.calls.length, 1);
      assert.match(logSpy.mock.calls[0].arguments[0], /\[World Tree\] \[debug\] Test debug message/);
    }

    console.log = originalConsoleLog;
  });
});
