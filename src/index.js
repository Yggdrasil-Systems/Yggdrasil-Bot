import { bootstrap } from './bootstrap.js';
import { logger } from './utils/logger.js';

bootstrap().catch((error) => {
  logger.error('World Tree failed to start.', error);
  process.exit(1);
});
