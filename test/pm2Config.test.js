import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ecosystemConfig = require('../ecosystem.config.cjs');

test('PM2 config includes production restart and log controls', () => {
  const [app] = ecosystemConfig.apps;

  assert.equal(app.name, 'world-tree');
  assert.equal(app.exec_mode, 'fork');
  assert.equal(app.instances, 1);
  assert.equal(app.max_memory_restart, '500M');
  assert.equal(app.kill_timeout, 10_000);
  assert.equal(app.wait_ready, false);
  assert.equal(app.max_restarts, 10);
  assert.equal(app.restart_delay, 5_000);
  assert.equal(app.exp_backoff_restart_delay, 1_000);
  assert.equal(app.out_file, './logs/world-tree.out.log');
  assert.equal(app.error_file, './logs/world-tree.err.log');
  assert.equal(app.merge_logs, true);
});
