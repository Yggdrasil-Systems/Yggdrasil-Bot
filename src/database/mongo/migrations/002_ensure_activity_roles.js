import mongoose from 'mongoose';

/**
 * Migration 002 — Ensure Activity Roles
 *
 * Backfills the `activityRoles` field on all GuildSettings documents that
 * were created before Phase 0 (Activity Roles) was implemented.
 *
 * Mongoose applies schema defaults on read, but:
 * - Aggregation pipelines bypass Mongoose defaults
 * - Raw MongoDB queries won't see the field
 * - This creates inconsistency between Mongoose reads and direct DB queries
 *
 * This migration ensures every document explicitly has the field.
 */
export async function up() {
  const defaults = {
    spotify: { enabled: false, roleId: null },
    streaming: { enabled: false, roleId: null },
    gaming: { enabled: false, roleId: null },
    voice: { enabled: false, roleId: null }
  };

  const collection = mongoose.connection.collection('guild_settings');

  // Only update documents that lack the activityRoles field
  await collection.updateMany({ activityRoles: { $exists: false } }, { $set: { activityRoles: defaults } });
}
