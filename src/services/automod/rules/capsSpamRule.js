import { matchRule, noMatch } from './ruleResult.js';

export function evaluateCapsSpam({ content, rule }) {
  const minLength = rule?.minLength ?? 16;
  const targetRatio = rule?.ratio ?? 0.75;

  if (!rule?.enabled || !content || content.length < minLength) {
    return noMatch();
  }

  const letters = [...content].filter((character) => /[a-z]/i.test(character));

  if (letters.length < minLength) {
    return noMatch();
  }

  const upperCount = letters.filter((character) => character === character.toUpperCase()).length;
  const ratio = upperCount / letters.length;

  if (ratio < targetRatio) {
    return noMatch();
  }

  return matchRule({
    ruleId: 'capsSpam',
    rule,
    reason: `Excessive caps detected (${Math.round(ratio * 100)}%).`,
    metadata: { ratio }
  });
}
