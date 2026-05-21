import mongoose from 'mongoose';

const moderationCaseSchema = new mongoose.Schema(
  {
    caseId: {
      type: Number,
      required: true
    },
    guildId: {
      type: String,
      required: true,
      index: true
    },
    targetUserId: {
      type: String,
      required: true,
      index: true
    },
    moderatorId: {
      type: String,
      required: true
    },
    actionType: {
      type: String,
      required: true,
      enum: [
        'warn',
        'timeout',
        'untimeout',
        'kick',
        'ban',
        'purge',
        'automod_delete',
        'automod_warn',
        'automod_timeout'
      ]
    },
    reason: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      default: null
    },
    durationMs: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'deleted'],
      default: 'active'
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: String,
      default: null
    },
    resolutionReason: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    deletedMessageCount: {
      type: Number,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

moderationCaseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
moderationCaseSchema.index({ guildId: 1, targetUserId: 1, actionType: 1 });

export const ModerationCase = mongoose.models.ModerationCase
  ?? mongoose.model('ModerationCase', moderationCaseSchema, 'moderation_cases');
