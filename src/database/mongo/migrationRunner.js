import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Migration } from './migrationModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Parses a migration filename like '001_baseline.js' into { version: 1, name: 'baseline' }.
 * Returns null if the filename doesn't match the expected pattern.
 */
function parseMigrationFilename(filename) {
  const match = filename.match(/^(\d+)_(.+)\.js$/);
  if (!match) return null;

  return {
    version: parseInt(match[1], 10),
    name: match[2]
  };
}

/**
 * Discovers migration files from the given directory, sorted by version.
 */
async function discoverMigrations(migrationsDir) {
  let files;

  try {
    files = await readdir(migrationsDir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const migrations = [];

  for (const file of files) {
    const parsed = parseMigrationFilename(file);
    if (parsed) {
      migrations.push({
        ...parsed,
        filePath: path.join(migrationsDir, file)
      });
    }
  }

  // Sort by version ascending
  migrations.sort((a, b) => a.version - b.version);

  // Guard against duplicate versions
  const versions = new Set();
  for (const migration of migrations) {
    if (versions.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }
    versions.add(migration.version);
  }

  return migrations;
}

/**
 * Runs all pending migrations in version order.
 *
 * @param {object} options
 * @param {string} [options.migrationsDir] - Directory containing migration files.
 * @param {object} [options.log] - Logger with .info() and .warn() methods.
 * @returns {{ applied: number, skipped: number }} Result summary.
 */
export async function runPendingMigrations({
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  log = console
} = {}) {
  const migrations = await discoverMigrations(migrationsDir);

  if (migrations.length === 0) {
    log.info('No migration files found.');
    return { applied: 0, skipped: 0 };
  }

  // Fetch already-applied versions from the database
  const appliedDocs = await Migration.find({}).lean();
  const appliedVersions = new Set(appliedDocs.map((doc) => doc.version));

  let applied = 0;
  let skipped = 0;

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      skipped += 1;
      continue;
    }

    log.info(`Running migration ${migration.version}: ${migration.name}...`);

    // Dynamically import the migration file
    const migrationModule = await import(pathToFileURL(migration.filePath).href);

    if (typeof migrationModule.up !== 'function') {
      throw new Error(
        `Migration ${migration.version}_${migration.name}.js does not export an up() function.`
      );
    }

    await migrationModule.up();

    // Record the migration as applied
    await Migration.create({
      version: migration.version,
      name: migration.name
    });

    log.info(`Migration ${migration.version}: ${migration.name} applied successfully.`);
    applied += 1;
  }

  return { applied, skipped };
}
