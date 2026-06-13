import app from './app.js';
import { createLogger } from '@fintap/shared';

const logger = createLogger('gateway');
const PORT = process.env.PORT || 3000;

async function bootstrap(): Promise<void> {
  const server = app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      logger.info('Gateway stopped');
      process.exit(0);
    });

    // Force close after 30s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    shutdown('unhandledRejection');
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    shutdown('uncaughtException');
  });
}

bootstrap();
