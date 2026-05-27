import mongoose from 'mongoose';

import { bootstrap } from './bootstrap.js';
import { logger } from './utils/logger.js';

// ─── Process Lifecycle ──────────────────────────────────────────────────────
// On a PM2-managed antiX Linux host, unhandled errors crash the process and
// trigger restart loops. These handlers ensure we log the problem and exit
// cleanly so connections are released and PM2 can restart from a sane state.

let client = null;

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection — shutting down.', reason instanceof Error ? reason : new Error(String(reason)));
  shutdown(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception — shutting down.', error);
  shutdown(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logger.info(`Received ${signal} — shutting down gracefully.`);
    shutdown(0);
  });
}

async function shutdown(code) {
  try {
    if (client) {
      client.destroy();
      logger.info('Discord client destroyed.');
    }
  } catch { /* best effort */ }

  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed.');
    }
  } catch { /* best effort */ }

  process.exit(code);
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────

bootstrap()
  .then((result) => {
    client = result.client;
  })
  .catch((error) => {
    logger.error('World Tree failed to start.', error);
    process.exit(1);
  });
