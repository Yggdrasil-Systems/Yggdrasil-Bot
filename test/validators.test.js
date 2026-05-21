import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChannelType } from 'discord.js';

import {
  DISCORD_TIMEOUT_MAX_MS,
  validateChannel,
  validateMember,
  validateNumericLimit,
  validateReason,
  validateRole,
  validateTimeoutDuration
} from '../src/utils/validators.js';

describe('shared validators', () => {
  it('validateTimeoutDuration accepts 10m as 600000ms', () => {
    assert.deepEqual(validateTimeoutDuration('10m'), { valid: true, ms: 600000 });
  });

  it('validateTimeoutDuration accepts 28d at the Discord max boundary', () => {
    assert.deepEqual(validateTimeoutDuration('28d'), { valid: true, ms: DISCORD_TIMEOUT_MAX_MS });
  });

  it('validateTimeoutDuration rejects 29d above the Discord max', () => {
    assert.equal(validateTimeoutDuration('29d').valid, false);
  });

  it('validateTimeoutDuration rejects 0s below the minimum', () => {
    assert.equal(validateTimeoutDuration('0s').valid, false);
  });

  it('validateTimeoutDuration rejects abc as unrecognized format', () => {
    assert.equal(validateTimeoutDuration('abc').valid, false);
  });

  it('validateTimeoutDuration rejects empty input', () => {
    assert.equal(validateTimeoutDuration('').valid, false);
  });

  it('validateTimeoutDuration rejects compound 1h30m formats', () => {
    assert.equal(validateTimeoutDuration('1h30m').valid, false);
  });

  it('validateTimeoutDuration is case-sensitive and rejects 7D', () => {
    assert.equal(validateTimeoutDuration('7D').valid, false);
  });

  it('validateReason trims valid reasons', () => {
    assert.deepEqual(validateReason('  spam  '), { valid: true, value: 'spam' });
  });

  it('validateNumericLimit rejects values above max with the label', () => {
    assert.match(validateNumericLimit(11, 1, 10, 'Threshold').reason, /Threshold/);
  });

  it('validateChannel accepts text-based guild channels', () => {
    assert.equal(validateChannel({ guild: { id: 'g' }, type: ChannelType.GuildText }, { id: 'g' }).valid, true);
  });

  it('validateMember checks only the guild member cache', () => {
    assert.equal(validateMember('u', { members: { cache: new Map([['u', { id: 'u' }]]) } }).valid, true);
  });

  it('validateRole checks only the guild role cache', () => {
    assert.equal(validateRole('r', { roles: { cache: new Map([['r', { id: 'r' }]]) } }).valid, true);
  });
});
