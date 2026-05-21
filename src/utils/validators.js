import { ChannelType } from 'discord.js';

export const DISCORD_TIMEOUT_MAX_MS = 28 * 24 * 60 * 60 * 1000;

const DURATION_UNITS = Object.freeze({
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
});

/**
 * Validates a timeout duration string (e.g. "10m", "2h", "7d").
 * Returns { valid: true, ms: number } or { valid: false, reason: string }.
 * Discord timeout max is 28 days.
 */
export function validateTimeoutDuration(input) {
  const value = String(input ?? '').trim();
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    return { valid: false, reason: 'Use a duration like 10m, 2h, or 7d.' };
  }

  const amount = Number(match[1]);
  const ms = amount * DURATION_UNITS[match[2]];

  if (ms < 1000) {
    return { valid: false, reason: 'Timeout duration must be at least 1 second.' };
  }

  if (ms > DISCORD_TIMEOUT_MAX_MS) {
    return { valid: false, reason: 'Timeout duration cannot exceed 28 days.' };
  }

  return { valid: true, ms };
}

export function validateDuration(input) {
  const result = validateTimeoutDuration(input);
  return result.valid ? { valid: true, value: result.ms } : result;
}

export function validateChannel(channel, guild) {
  if (!channel || channel.guild?.id !== guild?.id) {
    return { valid: false, reason: 'Channel must belong to this server.' };
  }

  const textTypes = new Set([
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.PublicThread,
    ChannelType.PrivateThread,
    ChannelType.AnnouncementThread
  ]);

  if (typeof channel.isTextBased === 'function' && channel.isTextBased()) {
    return { valid: true, value: channel };
  }

  if (textTypes.has(channel.type)) {
    return { valid: true, value: channel };
  }

  return { valid: false, reason: 'Channel must be text-based.' };
}

export function validateMember(userId, guild) {
  const member = guild?.members?.cache?.get?.(userId) ?? null;
  return member
    ? { valid: true, value: member }
    : { valid: false, reason: 'Member was not found in this server.' };
}

export function validateRole(roleId, guild) {
  const role = guild?.roles?.cache?.get?.(roleId) ?? null;
  return role
    ? { valid: true, value: role }
    : { valid: false, reason: 'Role was not found in this server.' };
}

export function validateReason(input) {
  const value = String(input ?? '').trim();

  if (!value) {
    return { valid: false, reason: 'Reason is required.' };
  }

  if (value.length > 512) {
    return { valid: false, reason: 'Reason cannot exceed 512 characters.' };
  }

  return { valid: true, value };
}

export function validateNumericLimit(value, min, max, label = 'Value') {
  if (!Number.isInteger(value)) {
    return { valid: false, reason: `${label} must be an integer.` };
  }

  if (value < min) {
    return { valid: false, reason: `${label} must be at least ${min}.` };
  }

  if (value > max) {
    return { valid: false, reason: `${label} cannot exceed ${max}.` };
  }

  return { valid: true, value };
}
