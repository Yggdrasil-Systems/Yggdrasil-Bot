/**
 * Shared Mongoose query options for upsert operations.
 * Used across all repositories to ensure consistent findOneAndUpdate behavior.
 */
export function upsertOptions() {
  return {
    returnDocument: 'after',
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true
  };
}
