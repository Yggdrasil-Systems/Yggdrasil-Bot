import { ModerationCase } from '../models/ModerationCase.js';
import { Counter } from '../models/Counter.js';
import { upsertOptions } from '../queryOptions.js';

const DUPLICATE_KEY_CODE = 11000;

function counterIdForGuild(guildId) {
  return `moderationCase:${guildId}`;
}

async function nextCaseId(model, counterModel, guildId) {
  const counter = await counterModel
    .findOneAndUpdate({ _id: counterIdForGuild(guildId) }, { $inc: { seq: 1 } }, upsertOptions())
    .lean();

  return counter.seq;
}

async function alignCounterToExistingCases(model, counterModel, guildId) {
  if (typeof model.findOne !== 'function') {
    return;
  }

  const latestCase = await model.findOne({ guildId }).sort({ caseId: -1 }).lean();

  if (!latestCase?.caseId) {
    return;
  }

  await counterModel
    .findOneAndUpdate({ _id: counterIdForGuild(guildId) }, { $max: { seq: latestCase.caseId } }, upsertOptions())
    .lean();
}

export function createModerationRepository(model = ModerationCase, counterModel = Counter) {
  return {
    async createCase(payload) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const caseId = await nextCaseId(model, counterModel, payload.guildId);

        try {
          const document = await model.create({
            status: 'active',
            ...payload,
            caseId
          });

          return typeof document.toObject === 'function' ? document.toObject() : document;
        } catch (error) {
          if (error?.code !== DUPLICATE_KEY_CODE || attempt > 0) {
            throw error;
          }

          await alignCounterToExistingCases(model, counterModel, payload.guildId);
        }
      }

      throw new Error('Unable to allocate moderation case ID.');
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

      if (filters.cursor !== undefined && filters.cursor !== null) {
        queryFilter.caseId = { $lt: filters.cursor };
      }

      const query = model.find(queryFilter).sort({ caseId: -1 });

      if (typeof query.limit === 'function') {
        query.limit(limit);
      }

      return query.lean();
    },

    async listWarnings(guildId, targetUserId) {
      return model
        .find({
          guildId,
          targetUserId,
          actionType: { $in: ['warn', 'automod_warn'] },
          status: { $ne: 'deleted' }
        })
        .sort({ createdAt: -1, caseId: -1 })
        .lean();
    },

    async resolveCase({ guildId, caseId, resolvedBy, resolutionReason }) {
      return model
        .findOneAndUpdate(
          { guildId, caseId, status: { $ne: 'deleted' } },
          {
            $set: {
              status: 'resolved',
              resolvedAt: new Date(),
              resolvedBy,
              resolutionReason
            }
          },
          { returnDocument: 'after', runValidators: true }
        )
        .lean();
    },

    async softDeleteCase({ guildId, caseId, resolvedBy, resolutionReason }) {
      return model
        .findOneAndUpdate(
          { guildId, caseId },
          {
            $set: {
              status: 'deleted',
              resolvedAt: new Date(),
              resolvedBy,
              resolutionReason
            }
          },
          { returnDocument: 'after', runValidators: true }
        )
        .lean();
    },

    async getCaseStats(guildId) {
      if (typeof model.aggregate === 'function') {
        const rows = await model.aggregate([
          { $match: { guildId, status: { $ne: 'deleted' } } },
          {
            $group: {
              _id: { actionType: '$actionType', status: '$status' },
              count: { $sum: 1 }
            }
          }
        ]);

        return rows.reduce(
          (stats, row) => {
            stats.total += row.count;
            stats.byAction[row._id.actionType] = (stats.byAction[row._id.actionType] ?? 0) + row.count;
            stats.byStatus[row._id.status] = (stats.byStatus[row._id.status] ?? 0) + row.count;
            return stats;
          },
          { total: 0, byAction: {}, byStatus: {} }
        );
      }

      const cases = await model.find({ guildId, status: { $ne: 'deleted' } }).lean();

      return cases.reduce(
        (stats, moderationCase) => {
          stats.total += 1;
          stats.byAction[moderationCase.actionType] = (stats.byAction[moderationCase.actionType] ?? 0) + 1;
          stats.byStatus[moderationCase.status] = (stats.byStatus[moderationCase.status] ?? 0) + 1;
          return stats;
        },
        { total: 0, byAction: {}, byStatus: {} }
      );
    }
  };
}

export const moderationRepository = createModerationRepository();
