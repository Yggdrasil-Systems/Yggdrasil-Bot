import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseMessageCommand } from '../src/utils/messageParser.js';

test('parseMessageCommand matches the tree prefix case-insensitively', () => {
  assert.deepEqual(parseMessageCommand('tree ping'), {
    mode: 'prefix',
    commandName: 'ping',
    args: []
  });

  assert.deepEqual(parseMessageCommand('TREE avatar @user'), {
    mode: 'prefix',
    commandName: 'avatar',
    args: ['@user']
  });
});

test('parseMessageCommand preserves quoted arguments', () => {
  assert.deepEqual(parseMessageCommand('Tree warn @user "too much spam"'), {
    mode: 'prefix',
    commandName: 'warn',
    args: ['@user', 'too much spam']
  });
});

test('parseMessageCommand ignores empty and brittle prefix matches', () => {
  assert.equal(parseMessageCommand(''), null);
  assert.equal(parseMessageCommand('tree'), null);
  assert.equal(parseMessageCommand('treeping'), null);
});

test('parseMessageCommand supports no-prefix candidates when enabled', () => {
  assert.deepEqual(
    parseMessageCommand('ping', {
      allowNoPrefix: true,
      noPrefixCommandNames: new Set(['ping'])
    }),
    {
      mode: 'no-prefix',
      commandName: 'ping',
      args: []
    }
  );

  assert.equal(
    parseMessageCommand('hello world', {
      allowNoPrefix: true,
      noPrefixCommandNames: new Set(['ping'])
    }),
    null
  );
});
