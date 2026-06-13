import { PrismaClient } from './db.js';
import app from './app.js';
import { createLogger } from '@fintap/shared';
import { startHolidayAlertJob } from './jobs/holiday-alert.job.js';
import { startAttendanceReminderJob } from './jobs/attendance-reminder.job.js';

const logger = createLogger('notification-service');
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3006;

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
  startHolidayAlertJob();
  startAttendanceReminderJob();

  const server = app.listen(PORT, () => {
    logger.info(`Notification service running on port ${PORT}`);
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
