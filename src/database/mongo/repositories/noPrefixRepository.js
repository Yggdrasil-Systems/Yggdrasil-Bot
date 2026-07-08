import { NoPrefixPrivilege } from '../models/NoPrefixPrivilege.js';
import { upsertOptions } from '../queryOptions.js';

export function createNoPrefixRepository(model = NoPrefixPrivilege) {
  return {
    async findActiveByUserId(userId) {
      return model.findOne({ userId, active: true }).lean();
    },

    async listActiveUsers() {
      return model.find({ active: true }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    },

    async upsertUser({ userId, addedBy, reason = null }) {
      return model
        .findOneAndUpdate(
          { userId },
          {
            $set: {
              userId,
              active: true,
              addedBy,
              reason,
              removedBy: null,
              removedReason: null,
              removedAt: null
            }
          },
          upsertOptions()
        )
        .lean();
    },

    async deactivateUser({ userId, removedBy, reason = null }) {
      return model
        .findOneAndUpdate(
          { userId },
          {
            $set: {
              active: false,
              removedBy,
              removedReason: reason,
              removedAt: new Date()
            }
          },
          { returnDocument: 'after', runValidators: true }
        )
        .lean();
    }
  };
}

export const noPrefixRepository = createNoPrefixRepository();
