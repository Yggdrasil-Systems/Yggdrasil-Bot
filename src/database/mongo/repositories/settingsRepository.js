import { GuildSettings } from '../models/GuildSettings.js';

export function createSettingsRepository(model = GuildSettings) {
  return {
    async getOrCreate(guildId) {
      return model.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        {
          new: true,
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
          new: true,
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
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true
        }
      ).lean();
    }
  };
}

export const settingsRepository = createSettingsRepository();
