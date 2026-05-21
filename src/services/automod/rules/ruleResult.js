export function noMatch() {
  return { matched: false };
}

export function matchRule({ ruleId, reason, rule, metadata = {} }) {
  const punishment = rule?.punishment ?? {};

  return {
    matched: true,
    ruleId,
    reason,
    action: punishment.action ?? 'delete',
    timeoutDuration: punishment.timeoutDuration ?? '10m',
    metadata
  };
}
