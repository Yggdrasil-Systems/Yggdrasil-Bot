import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const contractPaths = [
  'dashboard/contracts/guild-settings.schema.json',
  'dashboard/contracts/automod-settings.schema.json',
  'dashboard/contracts/moderation-case.schema.json'
];

test('dashboard contract files contain valid JSON schema documents', async () => {
  for (const contractPath of contractPaths) {
    const raw = await readFile(path.resolve(contractPath), 'utf8');
    const parsed = JSON.parse(raw);

    assert.equal(parsed.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(parsed.type, 'object');
  }
});
