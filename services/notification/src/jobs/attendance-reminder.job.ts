import cron from 'node-cron';
import { createLogger } from '@fintap/shared';
import { configClient } from '../clients/config-client.js';
import { activityClient } from '../clients/activity-client.js';
import { attendanceClient } from '../clients/attendance-client.js';
import { authClient } from '../clients/auth-client.js';
import { notificationService } from '../services/notification.service.js';

const logger = createLogger('notification-service');

export function startAttendanceReminderJob(): void {
  // Runs every 5 minutes
  const cronExpression = '*/5 * * * *';

  cron.schedule(cronExpression, async () => {
    logger.info('Attendance reminder job started');

    try {
      // 1. Get current date in WIB (UTC+7)
      const now = new Date();
      const wibOffset = 7 * 60 * 60 * 1000;
      const wibNow = new Date(now.getTime() + wibOffset);
      const todayStr = wibNow.toISOString().split('T')[0];

      // 2. Check if today is a holiday
      const holidayCheck = await configClient.checkHoliday(todayStr);
      if (holidayCheck.is_holiday) {
        logger.info(`Today (${todayStr}) is a holiday: ${holidayCheck.holiday_name}, skipping reminders`);
        return;
      }

      // 3. Fetch today's activity
      const activity = await activityClient.getByDate(todayStr);
      if (!activity) {
        logger.info(`No activity scheduled for today (${todayStr}), skipping reminders`);
        return;
      }

      // 4. Parse start and end times
      const currentHour = wibNow.getUTCHours();
      const currentMinute = wibNow.getUTCMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;

      const parseTimeToMinutes = (timeStr: string): number => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const checkInStartMin = parseTimeToMinutes(activity.checkInStart);
      const checkInEndMin = parseTimeToMinutes(activity.checkInEnd);

      // Check-in start reminder: 10 minutes before checkInStart
      // E.g. if start is 07:00 (420 mins) and current is 06:50 (410 mins)
      if (currentTotalMinutes >= checkInStartMin - 10 && currentTotalMinutes < checkInStartMin) {
        logger.info(`Sending upcoming activity check-in reminder for ${activity.name}`);
        await notificationService.sendToAllActiveUsers('activity.created', {
          message: `Pengingat: Waktu absen masuk untuk kegiatan "${activity.name}" akan dibuka dalam 10 menit (Pukul ${activity.checkInStart}). Bersiaplah!`,
          activity_id: activity.id,
          activity_name: activity.name,
        });
        return;
      }

      // Check-in closing warning: 15 minutes before checkInEnd
      // E.g. if end is 08:00 (480 mins) and current is 07:45 (465 mins)
      const isClosingTime = currentTotalMinutes >= checkInEndMin - 15 && currentTotalMinutes < checkInEndMin;
      // Also send a general reminder midway if they haven't clocked in (e.g. 30 minutes after start)
      const isMidwayTime = currentTotalMinutes >= checkInStartMin + 30 && currentTotalMinutes < checkInStartMin + 35;

      if (isClosingTime || isMidwayTime) {
        logger.info(`Checking users who haven't checked in yet for ${activity.name}`);

        // Fetch all active employees
        const activeUsers = await authClient.getAllActiveUsers();
        if (activeUsers.length === 0) return;

        // Fetch today's attendance logs
        const attendances = await attendanceClient.getAttendances({
          date_start: todayStr,
          date_end: todayStr,
        });

        // Set of user IDs who have already checked in or have statuses like cuti/sakit/dinas_luar
        const attendedUserIds = new Set<number>();
        for (const record of attendances) {
          if (record.status !== 'absent') {
            attendedUserIds.add(record.userId);
          }
        }

        // Find users who haven't checked in
        const pendingUsers = activeUsers.filter(user => !attendedUserIds.has(user.id));
        logger.info(`Found ${pendingUsers.length} users who have not checked in yet`);

        for (const user of pendingUsers) {
          try {
            const timePhrase = isClosingTime 
              ? `akan segera berakhir dalam 15 menit (Pukul ${activity.checkInEnd})` 
              : `telah dibuka sejak pukul ${activity.checkInStart}`;

            await notificationService.send({
              type: 'attendance.late',
              recipient_user_id: user.id,
              data: {
                message: `Peringatan: Anda belum melakukan absen masuk untuk kegiatan "${activity.name}". Batas waktu pengabsenan ${timePhrase}. Segera lakukan absen masuk!`,
                activity_id: activity.id,
                activity_name: activity.name,
              },
            });
          } catch (error) {
            logger.error(`Failed to send check-in reminder to user ${user.id}`, { error: (error as Error).message });
          }
        }
      }
    } catch (error) {
      logger.error('Attendance reminder job failed', { error: (error as Error).message });
    }
  }, {
    timezone: 'Asia/Jakarta',
  });

  logger.info('Attendance reminder job scheduled: every 5 minutes (Asia/Jakarta)');
}
