import { matchRule, noMatch } from './ruleResult.js';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function evaluateBadWords({ content, rule }) {
  if (!rule?.enabled || !content || rule.words?.length === 0) {
    return noMatch();
  }

  if (!rule._compiledPatterns) {
    rule._compiledPatterns = rule.words
      .map((word) => {
        try {
          return new RegExp(`\\b${escapeRegExp(String(word))}\\b`, 'i');
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  const matchedIndex = rule._compiledPatterns.findIndex((pattern) => pattern.test(content));

  if (matchedIndex === -1) {
    return noMatch();
  }

  const matchedWord = rule.words[matchedIndex];

  return matchRule({
    ruleId: 'badWords',
    rule,
    reason: 'Blocked language detected.',
    metadata: { matchedWord }
  });
}
