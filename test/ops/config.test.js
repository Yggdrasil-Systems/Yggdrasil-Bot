import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PROJECT_ROOT = path.resolve(process.cwd());

function runBash(script) {
  const tempFileName = `.temp-test-${Date.now()}-${Math.random().toString(36).substring(7)}.sh`;
  const tempFilePath = path.join(PROJECT_ROOT, tempFileName);
  try {
    fs.writeFileSync(tempFilePath, script, 'utf-8');
    return execSync(`bash "${tempFileName}"`, { cwd: PROJECT_ROOT, encoding: 'utf-8' });
  } finally {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

describe('Operations SDK - Config', () => {
  it('should expose OPS_PROVIDER from config.sh', () => {
    const output = runBash('source ops/lib/config.sh && echo $OPS_PROVIDER').trim();
    assert.ok(['systemd', 'pm2'].includes(output), `Expected systemd or pm2, got ${output}`);
  });

  it('should expose required constants from constants.sh', () => {
    const output = runBash(
      'source ops/lib/constants.sh && echo -e "$APP_NAME\\n$SERVICE_NAME\\n$EXPECTED_PROVIDER_API"'
    )
      .trim()
      .split('\n');

    assert.equal(output[0], 'world-tree');
    assert.equal(output[1], 'world-tree.service');
    assert.equal(output[2], '1');
  });
});
