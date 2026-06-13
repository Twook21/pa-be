import { PrismaClient } from './db.js';
import app from './app.js';
import { createLogger } from '@fintap/shared';
import { startCalendarSyncJob } from './jobs/calendar-sync.job.js';
import { z } from 'zod';

const logger = createLogger('config-service');

// Environment validation
const envSchema = z.object({
  PORT: z.string().default('3005'),
  DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required' }),
  CALENDAR_API_URL: z.string({ required_error: 'CALENDAR_API_URL is required' }),
  CALENDAR_API_TIMEOUT: z.string().default('60000'),
});

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  const missing = envResult.error.issues.map((i) => i.path.join('.')).join(', ');
  logger.error(`Missing required environment variables: ${missing}`);
  process.exit(1);
}

const env = envResult.data;
const prisma = new PrismaClient();
const PORT = parseInt(env.PORT, 10);

async function bootstrap(): Promise<void> {
  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Database connection failed', { error });
    process.exit(1);
  }

  // Start scheduled jobs
  startCalendarSyncJob();

  const server = app.listen(PORT, () => {
    logger.info(`Config service running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Service stopped');
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

export { prisma };
