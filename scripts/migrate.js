#!/usr/bin/env node

/**
 * Standalone migration runner CLI.
 *
 * Usage: node scripts/migrate.js
 *
 * Connects to MongoDB using the same connection logic as the bot,
 * runs all pending migrations, and exits.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

import { connectMongo } from '../src/database/mongo/connection.js';
import { runPendingMigrations } from '../src/database/mongo/migrationRunner.js';

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI environment variable is required.');
  process.exit(1);
}

try {
  await connectMongo(mongoUri, {
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || '10000', 10),
    runMigrations: false
  });

  const result = await runPendingMigrations();

  console.log(`Migrations complete: ${result.applied} applied, ${result.skipped} skipped.`);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
