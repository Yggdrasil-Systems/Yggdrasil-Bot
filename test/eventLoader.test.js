import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { loadEvents } from '../src/loaders/eventLoader.js';

test('loadEvents contains rejected event handlers', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'world-tree-events-'));
  const listeners = new Map();
  const client = {
    appContext: {},
    on: (name, listener) => listeners.set(name, listener),
    once: (name, listener) => listeners.set(name, listener)
  };

  try {
    await writeFile(
      path.join(root, 'broken.js'),
      "export const name = 'broken'; export async function execute() { throw new Error('boom'); }"
    );

    await loadEvents(client, root);
    await assert.doesNotReject(listeners.get('broken')());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
