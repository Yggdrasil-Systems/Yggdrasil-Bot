import { GuildSettings } from '../models/GuildSettings.js';

function buildNestedSet(prefix, values) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [`${prefix}.${key}`, value])
  );
}

function updateOptions() {
  return {
    returnDocument: 'after',
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true
  };
}

export function createSettingsRepository(model = GuildSettings) {
  return {
    async getOrCreate(guildId) {
      return model.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        {
          returnDocument: 'after',
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true
        }
      ).lean();
    },

    async setModLogChannel(guildId, channelId) {
      return model.findOneAndUpdate(
        { guildId },
        { $set: { modLogChannelId: channelId } },
        {
          returnDocument: 'after',
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true
        }
      ).lean();
    },

    async setTrustedAdminRoles(guildId, roleIds) {
      return model.findOneAndUpdate(
        { guildId },
        { $set: { trustedAdminRoleIds: roleIds } },
        updateOptions()
      ).lean();
    },

    async addTrustedAdminRole(guildId, roleId) {
      return model.findOneAndUpdate(
        { guildId },
        { $addToSet: { trustedAdminRoleIds: roleId } },
        updateOptions()
      ).lean();
    },

    async removeTrustedAdminRole(guildId, roleId) {
      return model.findOneAndUpdate(
        { guildId },
        { $pull: { trustedAdminRoleIds: roleId } },
        updateOptions()
      ).lean();
    },

    async setAutomodEnabled(guildId, enabled) {
      return model.findOneAndUpdate(
        { guildId },
        { $set: { automodEnabled: enabled, 'automod.enabled': enabled, 'featureToggles.automod': enabled } },
        updateOptions()
      ).lean();
    },

    async updateAutomodRule(guildId, ruleName, values) {
      return model.findOneAndUpdate(
        { guildId },
        { $set: buildNestedSet(`automod.rules.${ruleName}`, values) },
        updateOptions()
      ).lean();
    },

    async updateAutomodPunishment(guildId, ruleName, punishment) {
      return model.findOneAndUpdate(
        { guildId },
        { $set: buildNestedSet(`automod.rules.${ruleName}.punishment`, punishment) },
        updateOptions()
      ).lean();
    },

    async addBadWord(guildId, word) {
      return model.findOneAndUpdate(
        { guildId },
        { $addToSet: { 'automod.rules.badWords.words': word.toLowerCase() } },
        updateOptions()
      ).lean();
    },

    async removeBadWord(guildId, word) {
      return model.findOneAndUpdate(
        { guildId },
        { $pull: { 'automod.rules.badWords.words': word.toLowerCase() } },
        updateOptions()
      ).lean();
    }
  };
}

export const settingsRepository = createSettingsRepository();
