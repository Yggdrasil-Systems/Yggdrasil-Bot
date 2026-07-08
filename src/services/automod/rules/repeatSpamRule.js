import { matchRule, noMatch } from './ruleResult.js';

function normalizeContent(content) {
  return String(content ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function evaluateRepeatSpam({ guildId, userId, content, now = Date.now(), rule, state }) {
  const normalizedContent = normalizeContent(content);

  if (!rule?.enabled || normalizedContent.length < 4 || !state) {
    return noMatch();
  }

  const key = `${guildId}:${userId}`;
  const windowMs = Math.max(rule.windowSeconds ?? 12, 1) * 1000;
  const previousEntries = state.getRepeatedMessages(key).filter((entry) => now - entry.createdAt <= windowMs);
  const entries = [...previousEntries, { content: normalizedContent, createdAt: now }];
  state.setRepeatedMessages(key, entries);

  const repeatedCount = entries.filter((entry) => entry.content === normalizedContent).length;
  const threshold = rule.threshold ?? 4;

  if (repeatedCount < threshold) {
    return noMatch();
  }

  return matchRule({
    ruleId: 'repeatSpam',
    rule,
    reason: `Repeated message spam detected (${repeatedCount} repeats).`,
    metadata: { repeatedCount }
  });
}
