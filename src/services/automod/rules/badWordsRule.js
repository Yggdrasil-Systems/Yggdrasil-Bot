import { matchRule, noMatch } from './ruleResult.js';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function evaluateBadWords({ content, rule }) {
  if (!rule?.enabled || !content || rule.words?.length === 0) {
    return noMatch();
  }

  const matchedWord = rule.words.find((word) => {
    const pattern = new RegExp(`\\b${escapeRegExp(String(word))}\\b`, 'i');
    return pattern.test(content);
  });

  if (!matchedWord) {
    return noMatch();
  }

  return matchRule({
    ruleId: 'badWords',
    rule,
    reason: 'Blocked language detected.',
    metadata: { matchedWord }
  });
}
