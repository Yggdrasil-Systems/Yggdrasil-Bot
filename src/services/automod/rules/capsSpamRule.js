import { matchRule, noMatch } from './ruleResult.js';

export function evaluateCapsSpam({ content, rule }) {
  if (!rule?.enabled || !content || content.length < rule.minLength) {
    return noMatch();
  }

  const letters = [...content].filter((character) => /[a-z]/i.test(character));

  if (letters.length < rule.minLength) {
    return noMatch();
  }

  const upperCount = letters.filter((character) => character === character.toUpperCase()).length;
  const ratio = upperCount / letters.length;

  if (ratio < rule.ratio) {
    return noMatch();
  }

  return matchRule({
    ruleId: 'capsSpam',
    rule,
    reason: `Excessive caps detected (${Math.round(ratio * 100)}%).`,
    metadata: { ratio }
  });
}
