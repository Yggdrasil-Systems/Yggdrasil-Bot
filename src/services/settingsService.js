import { settingsRepository } from '../database/mongo/repositories/settingsRepository.js';

export function createSettingsService(repository = settingsRepository) {
  return {
    getSettings(guildId) {
      return repository.getOrCreate(guildId);
    },

    setModLogChannel(guildId, channelId) {
      return repository.setModLogChannel(guildId, channelId);
    }
  };
}

export const settingsService = createSettingsService();
