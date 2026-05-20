import mongoose from 'mongoose';

const guildSettingsSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    modLogChannelId: {
      type: String,
      default: null
    },
    automodEnabled: {
      type: Boolean,
      default: false
    },
    trustedAdminRoleIds: {
      type: [String],
      default: []
    },
    featureToggles: {
      moderation: { type: Boolean, default: true },
      automod: { type: Boolean, default: false },
      utility: { type: Boolean, default: true }
    },
    prefix: {
      type: String,
      default: 'tree'
    }
  },
  { timestamps: true }
);

export const GuildSettings = mongoose.models.GuildSettings
  ?? mongoose.model('GuildSettings', guildSettingsSchema, 'guild_settings');
