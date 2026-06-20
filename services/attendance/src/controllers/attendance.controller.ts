import { Request, Response, NextFunction } from 'express';
import { formatSuccess, ValidationError } from '@fintap/shared';
import * as attendanceService from '../services/attendance.service.js';
import { extractUser } from '../middleware/internal-auth.js';
import { configClient } from '../clients/config-client.js';
import { activityClient } from '../clients/activity-client.js';
import { requestClient } from '../clients/request-client.js';
import { notificationClient } from '../clients/notification-client.js';
import { authClient } from '../clients/auth-client.js';

export async function checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const { latitude, longitude, photo, notes } = req.body;
    const requestId = req.headers['x-request-id'] as string | undefined;
    const deviceId = req.headers['x-device-id'] as string | undefined;

    // Basic validation
    if (latitude == null || longitude == null) {
      throw new ValidationError('Validation failed', [
        { field: 'location', message: 'Latitude and longitude are required' },
      ]);
    }

    if (!photo) {
      throw new ValidationError('Validation failed', [
        { field: 'photo', message: 'Photo is required' },
      ]);
    }

    // Device binding check: only the device used to login can submit attendance
    if (deviceId) {
      const deviceCheck = await authClient.validateDevice(userId, deviceId);
      if (!deviceCheck.valid) {
        throw new ValidationError('Device tidak dikenali', [
          { field: 'device', message: deviceCheck.reason || 'Absensi hanya bisa dilakukan dari perangkat yang terakhir digunakan untuk login.' },
        ]);
      }
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch office location and attendance settings from Config Service
    const [officeLocation, attendanceSettings, activity, externalDuty] = await Promise.all([
      configClient.getCurrentLocation(requestId),
      configClient.getActiveSettings(requestId),
      activityClient.getActivityByDate(today, requestId),
      requestClient.getExternalDuty(userId, today, requestId),
    ]);

    // Determine effective settings: if activity exists, override defaults
    let effectiveSettings = {
      checkInStart: attendanceSettings.checkInStart,
      checkInEnd: attendanceSettings.checkInEnd,
      checkOutStart: attendanceSettings.checkOutStart,
      checkOutEnd: attendanceSettings.checkOutEnd,
    };

    let effectiveLocation = {
      latitude: officeLocation.latitude,
      longitude: officeLocation.longitude,
      radius: officeLocation.radius,
    };

    if (activity) {
      // Activity overrides time settings
      effectiveSettings = {
        checkInStart: activity.checkInStart,
        checkInEnd: activity.checkInEnd,
        checkOutStart: activity.checkOutStart,
        checkOutEnd: activity.checkOutEnd,
      };

      // Activity overrides location if specified
      if (activity.checkInLatitude != null && activity.checkInLongitude != null) {
        effectiveLocation = {
          latitude: activity.checkInLatitude,
          longitude: activity.checkInLongitude,
          radius: officeLocation.radius, // Keep the same radius
        };
      }
    }

    // If external duty exists, skip GPS validation
    const skipGPS = externalDuty != null;

    const result = await attendanceService.checkIn({
      userId,
      data: { latitude, longitude, photo, notes },
      officeLocation: skipGPS ? undefined : effectiveLocation,
      attendanceSettings: effectiveSettings,
      activityId: activity?.id,
    });

    // Send notification if late
    if (result.status === 'late') {
      try {
        await notificationClient.sendNotification(
          'late_checkin',
          userId,
          {
            message: `Late check-in detected at ${result.checkInTime}`,
            date: today,
            attendanceId: result.id,
          },
          requestId
        );
      } catch {
        // Non-critical: log but don't fail the check-in
      }
    }

    res.status(201).json(formatSuccess('Check-in successful', result));
  } catch (error) {
    next(error);
  }
}

export async function checkOut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const { latitude, longitude, photo, notes } = req.body;
    const requestId = req.headers['x-request-id'] as string | undefined;
    const deviceId = req.headers['x-device-id'] as string | undefined;

    // Basic validation
    if (latitude == null || longitude == null) {
      throw new ValidationError('Validation failed', [
        { field: 'location', message: 'Latitude and longitude are required' },
      ]);
    }

    if (!photo) {
      throw new ValidationError('Validation failed', [
        { field: 'photo', message: 'Photo is required' },
      ]);
    }

    // Device binding check: only the device used to login can submit attendance
    if (deviceId) {
      const deviceCheck = await authClient.validateDevice(userId, deviceId);
      if (!deviceCheck.valid) {
        throw new ValidationError('Device tidak dikenali', [
          { field: 'device', message: deviceCheck.reason || 'Absensi hanya bisa dilakukan dari perangkat yang terakhir digunakan untuk login.' },
        ]);
      }
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch office location and attendance settings from Config Service
    const [officeLocation, attendanceSettings, activity, externalDuty] = await Promise.all([
      configClient.getCurrentLocation(requestId),
      configClient.getActiveSettings(requestId),
      activityClient.getActivityByDate(today, requestId),
      requestClient.getExternalDuty(userId, today, requestId),
    ]);

    // Determine effective settings: if activity exists, override defaults
    let effectiveSettings = {
      checkInStart: attendanceSettings.checkInStart,
      checkInEnd: attendanceSettings.checkInEnd,
      checkOutStart: attendanceSettings.checkOutStart,
      checkOutEnd: attendanceSettings.checkOutEnd,
    };

    let effectiveLocation = {
      latitude: officeLocation.latitude,
      longitude: officeLocation.longitude,
      radius: officeLocation.radius,
    };

    if (activity) {
      // Activity overrides time settings
      effectiveSettings = {
        checkInStart: activity.checkInStart,
        checkInEnd: activity.checkInEnd,
        checkOutStart: activity.checkOutStart,
        checkOutEnd: activity.checkOutEnd,
      };

      // Activity overrides location if specified
      if (activity.checkOutLatitude != null && activity.checkOutLongitude != null) {
        effectiveLocation = {
          latitude: activity.checkOutLatitude,
          longitude: activity.checkOutLongitude,
          radius: officeLocation.radius,
        };
      }
    }

    // If external duty exists, skip GPS validation
    const skipGPS = externalDuty != null;

    const result = await attendanceService.checkOut({
      userId,
      data: { latitude, longitude, photo, notes },
      officeLocation: skipGPS ? undefined : effectiveLocation,
      attendanceSettings: effectiveSettings,
    });

    res.status(200).json(formatSuccess('Check-out successful', result));
  } catch (error) {
    next(error);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();

    if (month < 1 || month > 12) {
      throw new ValidationError('Validation failed', [
        { field: 'month', message: 'Month must be between 1 and 12' },
      ]);
    }

    const stats = await attendanceService.getStats({ userId, month, year });
    res.status(200).json(formatSuccess('Attendance stats retrieved', stats));
  } catch (error) {
    next(error);
  }
}

export async function getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const requestId = req.headers['x-request-id'] as string | undefined;
    const today = new Date().toISOString().split('T')[0];

    // Fetch the attendance record
    const record = await attendanceService.getToday(userId);

    // Fetch settings and activity to determine time windows
    const [attendanceSettings, activity] = await Promise.all([
      configClient.getActiveSettings(requestId).catch(() => null),
      activityClient.getActivityByDate(today, requestId).catch(() => null),
    ]);

    let can_check_in = false;
    let can_check_out = false;
    let message = '';

    if (attendanceSettings) {
      let effectiveSettings = {
        checkInStart: attendanceSettings.checkInStart,
        checkInEnd: attendanceSettings.checkInEnd,
        checkOutStart: attendanceSettings.checkOutStart,
        checkOutEnd: attendanceSettings.checkOutEnd,
      };

      if (activity) {
        effectiveSettings = {
          checkInStart: activity.checkInStart || effectiveSettings.checkInStart,
          checkInEnd: activity.checkInEnd || effectiveSettings.checkInEnd,
          checkOutStart: activity.checkOutStart || effectiveSettings.checkOutStart,
          checkOutEnd: activity.checkOutEnd || effectiveSettings.checkOutEnd,
        };
      }

      const now = new Date();
      // Calculate current minutes (local server time matching the time window strings)
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [inStartH, inStartM] = effectiveSettings.checkInStart.split(':').map(Number);
      const [inEndH, inEndM] = effectiveSettings.checkInEnd.split(':').map(Number);
      const inStart = inStartH * 60 + inStartM;
      const inEnd = inEndH * 60 + inEndM;

      const [outStartH, outStartM] = effectiveSettings.checkOutStart.split(':').map(Number);
      const [outEndH, outEndM] = effectiveSettings.checkOutEnd.split(':').map(Number);
      const outStart = outStartH * 60 + outStartM;
      const outEnd = outEndH * 60 + outEndM;

      can_check_in = !record && currentMinutes >= inStart && currentMinutes <= inEnd;
      can_check_out = !!record && !record.checkOutTime && currentMinutes >= outStart && currentMinutes <= outEnd;
      
      if (!record) {
        if (currentMinutes < inStart) message = `Belum waktunya check-in (buka jam ${effectiveSettings.checkInStart})`;
        else if (currentMinutes > inEnd) message = `Waktu check-in sudah habis (tutup jam ${effectiveSettings.checkInEnd})`;
        else message = 'Silakan check-in';
      } else if (!record.checkOutTime) {
        if (currentMinutes < outStart) message = `Belum waktunya check-out (buka jam ${effectiveSettings.checkOutStart})`;
        else if (currentMinutes > outEnd) message = `Waktu check-out sudah habis (tutup jam ${effectiveSettings.checkOutEnd})`;
        else message = 'Silakan check-out';
      } else {
        message = 'Anda sudah selesai absen hari ini';
      }
    }

    const todayStatus = {
      can_check_in,
      can_check_out,
      message,
      attendance: record,
      activity: activity || null,
    };

    res.status(200).json(formatSuccess('Today attendance retrieved', todayStatus));
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;

    if (page < 1) {
      throw new ValidationError('Validation failed', [
        { field: 'page', message: 'Page must be at least 1' },
      ]);
    }

    if (limit < 1 || limit > 100) {
      throw new ValidationError('Validation failed', [
        { field: 'limit', message: 'Limit must be between 1 and 100' },
      ]);
    }

    const result = await attendanceService.getHistory({
      userId,
      page,
      limit,
      startDate,
      endDate,
    });

    res.status(200).json({
      status: 'success',
      message: 'Attendance history retrieved',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const { date } = req.params;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError('Validation failed', [
        { field: 'date', message: 'Date must be in YYYY-MM-DD format' },
      ]);
    }

    const record = await attendanceService.getDetail(userId, date);
    res.status(200).json(formatSuccess('Attendance detail retrieved', record));
  } catch (error) {
    next(error);
  }
}
