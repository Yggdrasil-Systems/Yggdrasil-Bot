import { noPrefixRepository } from '../database/mongo/repositories/noPrefixRepository.js';

const DEFAULT_CACHE_TTL_MS = 30_000;

function normalizeReason(reason) {
  return String(reason ?? '').trim() || null;
}

export function createNoPrefixService(repository = noPrefixRepository, {
  botOwnerId = null,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
} = {}) {
  const cache = new Map();

  function clearCache(userId) {
    cache.delete(userId);
  }

  return {
    async canUseNoPrefix(userId) {
      if (!userId) {
        return false;
      }

      if (botOwnerId && userId === botOwnerId) {
        return true;
      }

      const cached = cache.get(userId);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.allowed;
      }

      const allowed = Boolean(await repository.findActiveByUserId(userId));
      cache.set(userId, {
        allowed,
        expiresAt: Date.now() + cacheTtlMs
      });

      return allowed;
    },

    clearCache,

    async addUser({ userId, addedBy, reason }) {
      const user = await repository.upsertUser({
        userId,
        addedBy,
        reason: normalizeReason(reason)
      });
      clearCache(userId);
      return user;
    },

    async removeUser({ userId, removedBy, reason }) {
      const user = await repository.deactivateUser({
        userId,
        removedBy,
        reason: normalizeReason(reason)
      });
      clearCache(userId);
      return user;
    },

    listUsers() {
      return repository.listActiveUsers();
    }
  };
}

export const noPrefixService = createNoPrefixService();
