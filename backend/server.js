import 'dotenv/config';
import mongoose from 'mongoose';

const SHUTDOWN_TIMEOUT_MS = 10 * 1000;

async function startServer() {
  try {
    const { config } = await import('./config/env.js');
    const { logger } = await import('./utils/logger.js');
    const { connectDB } = await import('./config/db.js');
    const { startSafetyTimerWorker } = await import(
      './services/safetyTimer.service.js'
    );
    const { default: app } = await import('./app.js');

    await connectDB();

    const timerWorker = await startSafetyTimerWorker();

    const server = app.listen(config.port, () => {
      logger.info('server started', {
        port: config.port,
        nodeEnv: config.nodeEnv,
        trustProxy: config.trustProxy,
        logLevel: config.logLevel,
      });
    });

    let shuttingDown = false;

    function shutdown(signal) {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      logger.info('shutdown started', { signal });

      clearInterval(timerWorker);

      const forceExitTimer = setTimeout(() => {
        logger.error('graceful shutdown timed out', {
          signal,
          timeoutMs: SHUTDOWN_TIMEOUT_MS,
        });
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);

      forceExitTimer.unref();

      server.close(async (error) => {
        try {
          if (error) {
            throw error;
          }

          await mongoose.connection.close();
          logger.info('shutdown complete', { signal });
          process.exit(0);
        } catch (shutdownError) {
          logger.error('shutdown failed', {
            signal,
            errorName: shutdownError.name,
            errorMessage: shutdownError.message,
          });
          process.exit(1);
        }
      });
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    try {
      const { logger } = await import('./utils/logger.js');

      logger.error('server failed to start', {
        errorName: error.name,
        errorMessage: error.message,
      });
    } catch {
      console.error('Failed to start server:', error.message);
    }

    process.exit(1);
  }
}

startServer();