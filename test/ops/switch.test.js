import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PROJECT_ROOT = path.resolve(process.cwd());
const CONFIG_PATH = path.join(PROJECT_ROOT, 'ops', 'lib', 'config.sh');

function runBash(script) {
  return execSync(`bash -c "${script}"`, { cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: 'pipe' });
}

function runBashCatch(script) {
  try {
    runBash(script);
    return { success: true, output: '' };
  } catch (error) {
    return { success: false, output: error.stderr || error.stdout || error.message };
  }
}

describe('Operations SDK - Switch Logic', () => {
  let originalConfig = '';

  beforeEach(() => {
    // Backup the real config
    if (fs.existsSync(CONFIG_PATH)) {
      originalConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
    }
  });

  afterEach(() => {
    // Restore the real config
    if (originalConfig) {
      fs.writeFileSync(CONFIG_PATH, originalConfig, 'utf-8');
    }
  });

  it('should switch provider successfully to pm2', () => {
    // Force a known state
    fs.writeFileSync(CONFIG_PATH, 'OPS_PROVIDER=systemd\n', 'utf-8');

    const result = runBashCatch(`bash ops/switch.sh pm2`);
    assert.equal(result.success, true);
    
    const newConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
    assert.ok(newConfig.includes('OPS_PROVIDER=pm2'), 'Should have replaced with pm2');
  });

  it('should fail elegantly if provider does not exist', () => {
    const result = runBashCatch(`bash ops/switch.sh imaginary-provider`);
    assert.equal(result.success, false);
    assert.ok(result.output.includes('does not exist'), 'Should log does not exist error');
  });
});
