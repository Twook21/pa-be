import cron from 'node-cron';
import { createLogger } from '@fintap/shared';
import { calendarService } from '../services/calendar.service.js';

const logger = createLogger('config-service');

/**
 * Calendar sync job.
 * Runs daily at 00:05 WIB (UTC+7) = 17:05 UTC previous day.
 * Syncs Indonesian holiday data from the external API.
 *
 * Cron expression: "5 17 * * *" (17:05 UTC = 00:05 WIB)
 */
export function startCalendarSyncJob(): void {
  // 00:05 WIB = 17:05 UTC (previous day)
  const cronExpression = '5 17 * * *';

  cron.schedule(cronExpression, async () => {
    logger.info('Calendar sync job started');

    try {
      const now = new Date();
      // In WIB (UTC+7), get current year
      const wibDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const year = wibDate.getFullYear();

      const result = await calendarService.syncFromApi(year);
      logger.info(`Calendar sync completed: ${result.synced} entries synced for ${year}`);
    } catch (error) {
      logger.error('Calendar sync job failed', { error });
    }
  }, {
    timezone: 'Asia/Jakarta',
  });

  logger.info('Calendar sync job scheduled: daily at 00:05 WIB');
}
