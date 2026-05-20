import mongoose from 'mongoose';

import { logger } from '../../utils/logger.js';

let hasRegisteredConnectionLogger = false;

export async function connectMongo(mongoUri, options = {}) {
  mongoose.set('strictQuery', true);

  if (!hasRegisteredConnectionLogger) {
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error.', error);
    });
    hasRegisteredConnectionLogger = true;
  }

  if (mongoose.connection.readyState === 1) {
    logger.info('MongoDB already connected.');
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS
  });
  logger.info('MongoDB connected.');

  return mongoose.connection;
}
