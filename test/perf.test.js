import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTimer } from '../src/utils/perf.js';

describe('performance timer utility', () => {
  it('createTimer returns an object with mark and finish', () => {
    const timer = createTimer('test');
    assert.deepEqual([typeof timer.mark, typeof timer.finish], ['function', 'function']);
  });

  it('finish returns an object with correct stage keys', () => {
    const timer = createTimer('test');
    timer.mark('parser_router');
    assert.deepEqual(Object.keys(timer.finish()), ['parser_router']);
  });

  it('all elapsed values are non-negative numbers', () => {
    const timer = createTimer('test');
    timer.mark('stage');
    assert.equal(Object.values(timer.finish()).every((value) => typeof value === 'number' && value >= 0), true);
  });

  it('finish without marks returns an empty object', () => {
    assert.deepEqual(createTimer('empty').finish(), {});
  });

  it('timer errors do not propagate when hrtime is unavailable', () => {
    const originalHrtime = process.hrtime;
    process.hrtime = null;
    try {
      assert.doesNotThrow(() => createTimer('fallback').finish());
    } finally {
      process.hrtime = originalHrtime;
    }
  });
});
