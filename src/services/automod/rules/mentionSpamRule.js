import { matchRule, noMatch } from './ruleResult.js';

export function evaluateMentionSpam({ mentionCount, rule }) {
  if (!rule?.enabled || !Number.isInteger(mentionCount) || mentionCount < rule.threshold) {
    return noMatch();
  }

  return matchRule({
    ruleId: 'mentionSpam',
    rule,
    reason: `Mention spam detected (${mentionCount} mentions).`,
    metadata: { mentionCount }
  });
}
