import mongoose from 'mongoose';

import { logger } from '../utils/logger.js';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to backend/.env');
  }

  try {
    await mongoose.connect(uri);

    logger.info('MongoDB connected', {
      host: mongoose.connection.host,
    });
  } catch (error) {
    logger.error('MongoDB connection failed', {
      errorName: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
}