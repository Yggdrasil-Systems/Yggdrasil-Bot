import { matchRule, noMatch } from './ruleResult.js';

const LINK_PATTERN = /https?:\/\/[^\s<]+/gi;

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function evaluateLinkSpam({ content, rule }) {
  if (!rule?.enabled || !content) {
    return noMatch();
  }

  const links = [...content.matchAll(LINK_PATTERN)].map((match) => match[0]);

  if (links.length === 0) {
    return noMatch();
  }

  const allowList = new Set((rule.allowList ?? []).map((host) => host.toLowerCase().replace(/^www\./, '')));
  const blockedLink = links.find((link) => {
    const hostname = getHostname(link);
    return hostname && !allowList.has(hostname);
  });

  if (!blockedLink) {
    return noMatch();
  }

  return matchRule({
    ruleId: 'linkSpam',
    rule,
    reason: 'Unapproved link detected.',
    metadata: { blockedLink }
  });
}
