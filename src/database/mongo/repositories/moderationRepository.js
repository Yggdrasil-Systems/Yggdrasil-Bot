import { ModerationCase } from '../models/ModerationCase.js';

export function createModerationRepository(model = ModerationCase) {
  return {
    async createCase(payload) {
      const caseId = await model.countDocuments({ guildId: payload.guildId }) + 1;
      const document = await model.create({
        status: 'active',
        ...payload,
        caseId
      });

      return typeof document.toObject === 'function' ? document.toObject() : document;
    },

    async listCases(guildId, targetUserId, limit = 10) {
      const query = model.find({ guildId, targetUserId })
        .sort({ createdAt: -1, caseId: -1 });

      if (typeof query.limit === 'function') {
        query.limit(limit);
      }

      return query.lean();
    },

    async listWarnings(guildId, targetUserId) {
      return model.find({
        guildId,
        targetUserId,
        actionType: 'warn'
      })
        .sort({ createdAt: -1, caseId: -1 })
        .lean();
    }
  };
}

export const moderationRepository = createModerationRepository();
