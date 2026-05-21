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

    async getCaseById(guildId, caseId) {
      return model.findOne({ guildId, caseId, status: { $ne: 'deleted' } }).lean();
    },

    async listCases(guildId, targetUserId = null, limit = 10, filters = {}) {
      const queryFilter = {
        guildId,
        status: filters.includeDeleted ? { $in: ['active', 'resolved', 'deleted'] } : { $ne: 'deleted' }
      };

      if (targetUserId) {
        queryFilter.targetUserId = targetUserId;
      }

      if (filters.actionType) {
        queryFilter.actionType = filters.actionType;
      }

      if (filters.status) {
        queryFilter.status = filters.status;
      }

      const query = model.find(queryFilter)
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
        actionType: { $in: ['warn', 'automod_warn'] },
        status: { $ne: 'deleted' }
      })
        .sort({ createdAt: -1, caseId: -1 })
        .lean();
    },

    async resolveCase({ guildId, caseId, resolvedBy, resolutionReason }) {
      return model.findOneAndUpdate(
        { guildId, caseId, status: { $ne: 'deleted' } },
        {
          $set: {
            status: 'resolved',
            resolvedAt: new Date(),
            resolvedBy,
            resolutionReason
          }
        },
        { new: true, runValidators: true }
      ).lean();
    },

    async softDeleteCase({ guildId, caseId, resolvedBy, resolutionReason }) {
      return model.findOneAndUpdate(
        { guildId, caseId },
        {
          $set: {
            status: 'deleted',
            resolvedAt: new Date(),
            resolvedBy,
            resolutionReason
          }
        },
        { new: true, runValidators: true }
      ).lean();
    },

    async getCaseStats(guildId) {
      const cases = await model.find({ guildId, status: { $ne: 'deleted' } }).lean();

      return cases.reduce((stats, moderationCase) => {
        stats.total += 1;
        stats.byAction[moderationCase.actionType] = (stats.byAction[moderationCase.actionType] ?? 0) + 1;
        stats.byStatus[moderationCase.status] = (stats.byStatus[moderationCase.status] ?? 0) + 1;
        return stats;
      }, { total: 0, byAction: {}, byStatus: {} });
    }
  };
}

export const moderationRepository = createModerationRepository();
