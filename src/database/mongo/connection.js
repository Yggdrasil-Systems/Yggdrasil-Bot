import mongoose from 'mongoose';

import { logger } from '../../utils/logger.js';

export async function connectMongo(mongoUri) {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error.', error);
  });

  await mongoose.connect(mongoUri);
  logger.info('MongoDB connected.');

  return mongoose.connection;
}
