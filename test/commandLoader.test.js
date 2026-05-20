import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { loadCommands } from '../src/loaders/commandLoader.js';

test('loadCommands recursively loads command modules with data and execute exports', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'world-tree-commands-'));

  try {
    const utilityDir = path.join(root, 'utility');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(utilityDir, { recursive: true }));

    await writeFile(
      path.join(utilityDir, 'sample.js'),
      [
        "export const data = { name: 'sample', toJSON() { return { name: 'sample' }; } };",
        'export async function execute() { return true; }'
      ].join('\n')
    );

    const commands = await loadCommands(root);

    assert.equal(commands.size, 1);
    assert.equal(commands.get('sample').data.name, 'sample');
    assert.equal(typeof commands.get('sample').execute, 'function');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadCommands rejects modules without the expected command contract', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'world-tree-invalid-'));

  try {
    await writeFile(path.join(root, 'broken.js'), 'export const data = { name: "broken" };');

    await assert.rejects(
      () => loadCommands(root),
      /Invalid command module/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadCommands rejects duplicate command names', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'world-tree-duplicates-'));

  try {
    await writeFile(
      path.join(root, 'first.js'),
      "export const data = { name: 'duplicate', toJSON() { return { name: 'duplicate' }; } }; export async function execute() {}"
    );
    await writeFile(
      path.join(root, 'second.js'),
      "export const data = { name: 'duplicate', toJSON() { return { name: 'duplicate' }; } }; export async function execute() {}"
    );

    await assert.rejects(
      () => loadCommands(root),
      /Duplicate command name: duplicate/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadCommands loads prefix-only command modules', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'world-tree-prefix-only-'));

  try {
    await writeFile(
      path.join(root, 'purge.js'),
      "export const name = 'purge'; export async function executeMessage() {}"
    );

    const commands = await loadCommands(root);

    assert.equal(commands.size, 1);
    assert.equal(commands.get('purge').name, 'purge');
    assert.equal(typeof commands.get('purge').executeMessage, 'function');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
