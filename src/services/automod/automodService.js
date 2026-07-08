import { logger } from '../../utils/logger.js';
import { settingsService as defaultSettingsService } from '../settingsService.js';
import { automodState } from './automodState.js';
import { punishmentExecutor as defaultPunishmentExecutor } from './punishmentExecutor.js';
import { evaluateBadWords } from './rules/badWordsRule.js';
import { evaluateCapsSpam } from './rules/capsSpamRule.js';
import { evaluateLinkSpam } from './rules/linkSpamRule.js';
import { evaluateMentionSpam } from './rules/mentionSpamRule.js';
import { evaluateRepeatSpam } from './rules/repeatSpamRule.js';

function hasIgnoredRole(member, ignoredRoleIds = []) {
  if (!member?.roles?.cache || ignoredRoleIds.length === 0) {
    return false;
  }

  return ignoredRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function getMentionCount(message) {
  return (message.mentions?.users?.size ?? 0) + (message.mentions?.roles?.size ?? 0);
}

function evaluateRules({ message, settings, state }) {
  const rules = settings.automod.rules;
  const context = {
    guildId: message.guild.id,
    userId: message.author.id,
    content: message.content,
    mentionCount: getMentionCount(message),
    state
  };

  return (
    [
      evaluateBadWords({ content: context.content, rule: rules.badWords }),
      evaluateMentionSpam({ mentionCount: context.mentionCount, rule: rules.mentionSpam }),
      evaluateRepeatSpam({ ...context, rule: rules.repeatSpam }),
      evaluateLinkSpam({ content: context.content, rule: rules.linkSpam }),
      evaluateCapsSpam({ content: context.content, rule: rules.capsSpam })
    ].find((result) => result.matched) ?? { matched: false }
  );
}

export function createAutomodService({
  settingsService = defaultSettingsService,
  punishmentExecutor = defaultPunishmentExecutor,
  state = automodState,
  log = logger
} = {}) {
  return {
    async handleMessage(message, { isCommand = false } = {}) {
      if (!message.guild || message.author?.bot || isCommand) {
        return { ok: true, skipped: true };
      }

      const settings = await settingsService.getEffectiveSettings(message.guild.id);

      if (!settings.automod.enabled) {
        return { ok: true, skipped: true };
      }

      if (settings.automod.ignoredChannelIds.includes(message.channel?.id)) {
        return { ok: true, skipped: true };
      }

      if (hasIgnoredRole(message.member, settings.automod.ignoredRoleIds)) {
        return { ok: true, skipped: true };
      }

      const result = evaluateRules({ message, settings, state });

      if (!result.matched) {
        return { ok: true, matched: false };
      }

      try {
        return await punishmentExecutor.execute({ message, settings, result });
      } catch (error) {
        log.error?.('Automod punishment failed.', error);
        return { ok: false, reason: 'Automod failed to apply a configured action.' };
      }
    }
  };
}

export const automodService = createAutomodService();
