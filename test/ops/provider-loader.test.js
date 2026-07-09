import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(process.cwd());

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

const isWindows = process.platform === 'win32';
const describeOrSkip = isWindows ? describe.skip : describe;

describeOrSkip('Operations SDK - Provider Loader', () => {
  it('should load template.sh correctly and expose PROVIDER_API=1', () => {
    const output = runBash('source ops/lib/providers/template.sh && echo -e "$PROVIDER_API\\n$(provider_name)"')
      .trim()
      .split('\n');

    assert.equal(output[0], '1');
    assert.equal(output[1], 'template');
  });

  it('should fail elegantly if provider is completely missing', () => {
    // We mock config.sh by explicitly overriding OPS_PROVIDER before calling common.sh
    const result = runBashCatch('export OPS_PROVIDER=doesnotexist && source ops/lib/common.sh');

    assert.equal(result.success, false);
    assert.ok(result.output.includes('not found'), 'Should log a not found error');
  });

  it('should fail elegantly if PROVIDER_API is incorrect', () => {
    // Create a temporary bad provider
    runBash("echo -e '#!/usr/bin/env bash\\nexport PROVIDER_API=999' > ops/lib/providers/badapi.sh");

    const result = runBashCatch('export OPS_PROVIDER=badapi && source ops/lib/common.sh');

    // Clean up
    runBash('rm ops/lib/providers/badapi.sh');

    assert.equal(result.success, false);
    assert.ok(result.output.includes('requires API version'), 'Should log API version error');
    assert.ok(result.output.includes('expected 1'), 'Should mention expected API version');
  });
});
