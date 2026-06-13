import cron from 'node-cron';
import { createLogger } from '@fintap/shared';
import { configClient } from '../clients/config-client.js';
import { notificationService } from '../services/notification.service.js';

const logger = createLogger('notification-service');

/**
 * Holiday alert job.
 * Runs daily at 18:00 WIB (UTC+7) = 11:00 UTC.
 * Checks if tomorrow is a holiday, and if yes, sends notification to all active users.
 *
 * Cron expression: "0 11 * * *" (11:00 UTC = 18:00 WIB)
 */
export function startHolidayAlertJob(): void {
  // 18:00 WIB = 11:00 UTC
  const cronExpression = '0 11 * * *';

  cron.schedule(cronExpression, async () => {
    logger.info('Holiday alert job started');

    try {
      // Calculate tomorrow's date in WIB timezone
      const now = new Date();
      const wibOffset = 7 * 60 * 60 * 1000; // UTC+7
      const wibNow = new Date(now.getTime() + wibOffset);
      const tomorrow = new Date(wibNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if tomorrow is a holiday via Config Service
      const holidayCheck = await configClient.checkHoliday(tomorrowStr);

      if (holidayCheck.is_holiday) {
        logger.info(`Tomorrow (${tomorrowStr}) is a holiday: ${holidayCheck.holiday_name}`);

        // Send notification to all active users
        await notificationService.sendToAllActiveUsers('holiday.tomorrow', {
          message: `Besok (${tomorrowStr}) adalah hari libur: ${holidayCheck.holiday_name}. Selamat beristirahat!`,
          holiday_name: holidayCheck.holiday_name,
          date: tomorrowStr,
        });

        logger.info('Holiday alert notifications sent to all active users');
      } else {
        logger.info(`Tomorrow (${tomorrowStr}) is not a holiday, skipping alert`);
      }
    } catch (error) {
      logger.error('Holiday alert job failed', { error: (error as Error).message });
    }
  }, {
    timezone: 'Asia/Jakarta',
  });

  logger.info('Holiday alert job scheduled: daily at 18:00 WIB');
}
