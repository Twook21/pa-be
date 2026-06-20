import { PrismaClient } from '../db.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@fintap/shared/dist/utils/s3-upload.js';
import {
  haversineDistance,
  ValidationError,
  NotFoundError,
  type AttendanceDTO,
  type CheckInDTO,
  type CheckOutDTO,
  type AttendanceStatus,
} from '@fintap/shared';

const prisma = new PrismaClient();

// Removed local UPLOAD_DIR initialization

/**
 * Convert a Prisma Attendance record to the shared AttendanceDTO format.
 */
function toAttendanceDTO(record: any): AttendanceDTO {
  return {
    id: record.id,
    userId: record.userId,
    date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : String(record.date),
    checkInTime: record.checkInTime ? formatTime(record.checkInTime) : null,
    checkOutTime: record.checkOutTime ? formatTime(record.checkOutTime) : null,
    checkInPhoto: record.checkInPhoto,
    checkOutPhoto: record.checkOutPhoto,
    checkInLatitude: record.checkInLatitude ? Number(record.checkInLatitude) : null,
    checkInLongitude: record.checkInLongitude ? Number(record.checkInLongitude) : null,
    checkOutLatitude: record.checkOutLatitude ? Number(record.checkOutLatitude) : null,
    checkOutLongitude: record.checkOutLongitude ? Number(record.checkOutLongitude) : null,
    status: record.status as AttendanceStatus,
    notes: record.notes,
    activityId: record.activityId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Format a time value (Date or string) to HH:mm:ss format.
 */
function formatTime(time: Date | string): string {
  if (time instanceof Date) {
    return time.toISOString().split('T')[1].split('.')[0];
  }
  return String(time);
}

/**
 * Upload a base64-encoded photo to Supabase S3.
 * Returns the S3 file URL.
 */
async function savePhoto(base64Data: string, userId: number, type: 'checkin' | 'checkout'): Promise<string> {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  const timestamp = Date.now();
  const filename = `attendance-${userId}-${type}-${timestamp}.jpg`;
  const bucketName = process.env.S3_BUCKET || 'uploads';
  const endpoint = process.env.S3_ENDPOINT || 'https://fgvvhouhncseurbipbbt.storage.supabase.co/storage/v1/s3';

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: 'image/jpeg',
  });

  await s3Client.send(command);

  // Construct the public URL (Supabase S3 typical format or standard S3 format)
  // Vercel apps typically need the full URL to serve it to the frontend.
  // Note: If using forcePathStyle, the bucket is in the path.
  return `${endpoint}/${bucketName}/${filename}`;
}

/**
 * Determine attendance status based on check-in time and configured checkInEnd.
 * - If check-in time is before checkInEnd → "present"
 * - If check-in time is after checkInEnd → "late"
 */
function determineStatus(checkInTime: Date, checkInEnd: string): AttendanceStatus {
  const [endHour, endMinute] = checkInEnd.split(':').map(Number);
  const endMinutes = endHour * 60 + endMinute;

  const currentMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();

  if (currentMinutes <= endMinutes) {
    return 'present';
  }
  return 'late';
}

/**
 * Validate GPS coordinates against multiple office locations using haversine distance.
 * Throws ValidationError if distance exceeds the allowed radius for all locations.
 */
function validateGPS(
  userLat: number,
  userLon: number,
  officeLocations: Array<{ latitude: number; longitude: number; radius: number }>
): void {
  let minDistance = Infinity;
  let allowedRadius = 0;

  for (const office of officeLocations) {
    const distance = haversineDistance(userLat, userLon, office.latitude, office.longitude);
    if (distance <= office.radius) {
      return; // Validation passed!
    }
    if (distance < minDistance) {
      minDistance = distance;
      allowedRadius = office.radius;
    }
  }

  throw new ValidationError('GPS validation failed', [
    {
      field: 'location',
      message: `You are ${Math.round(minDistance)}m from the nearest office. Maximum allowed distance is ${allowedRadius}m.`,
    },
  ]);
}

/**
 * Get today's date string in YYYY-MM-DD format (WIB timezone).
 */
function getTodayDateString(): string {
  const now = new Date();
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wibTime.toISOString().split('T')[0];
}

// ============================================================
// Service Methods
// ============================================================

export interface CheckInParams {
  userId: number;
  data: CheckInDTO;
  officeLocations?: Array<{ latitude: number; longitude: number; radius: number }>;
  attendanceSettings?: { checkInStart: string; checkInEnd: string; checkOutStart: string; checkOutEnd: string };
  activityId?: number;
}

export async function checkIn(params: CheckInParams): Promise<AttendanceDTO> {
  const { userId, data, officeLocations, attendanceSettings, activityId } = params;
  const today = getTodayDateString();
  const now = new Date();

  // Check if already checked in today
  const existing = await prisma.attendance.findFirst({
    where: {
      userId,
      date: new Date(today),
    },
  });

  if (existing && existing.checkInTime) {
    throw new ValidationError('Already checked in today', [
      { field: 'checkIn', message: 'You have already checked in today' },
    ]);
  }

  // Validate GPS if office locations are provided
  if (officeLocations && officeLocations.length > 0) {
    validateGPS(
      data.latitude,
      data.longitude,
      officeLocations
    );
  }

  // Validate time window if attendance settings are provided
  if (attendanceSettings) {
    const [startHour, startMinute] = attendanceSettings.checkInStart.split(':').map(Number);
    const [endHour, endMinute] = attendanceSettings.checkInEnd.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentMinutes = wibTime.getUTCHours() * 60 + wibTime.getUTCMinutes();

    // Allow check-in only between start and a reasonable window after end (e.g., 2 hours)
    if (currentMinutes < startMinutes) {
      throw new ValidationError('Check-in not yet open', [
        { field: 'time', message: `Check-in opens at ${attendanceSettings.checkInStart}` },
      ]);
    }
  }

  // Determine status
  let status: AttendanceStatus = 'present';
  if (attendanceSettings) {
    status = determineStatus(now, attendanceSettings.checkInEnd);
  }

  // Save photo to S3
  const photoPath = await savePhoto(data.photo, userId, 'checkin');

  // Create or update attendance record
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const checkInTime = new Date(`1970-01-01T${wibTime.toISOString().split('T')[1].split('.')[0]}`);

  let attendance;
  if (existing) {
    // Update existing record (created by leave/external duty approval or absent marking)
    attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkInTime,
        checkInPhoto: photoPath,
        checkInLatitude: data.latitude,
        checkInLongitude: data.longitude,
        status,
        notes: data.notes || existing.notes,
        activityId: activityId || existing.activityId,
      },
    });
  } else {
    attendance = await prisma.attendance.create({
      data: {
        userId,
        date: new Date(today),
        checkInTime,
        checkInPhoto: photoPath,
        checkInLatitude: data.latitude,
        checkInLongitude: data.longitude,
        status,
        notes: data.notes || null,
        activityId: activityId || null,
      },
    });
  }

  return toAttendanceDTO(attendance);
}

export interface CheckOutParams {
  userId: number;
  data: CheckOutDTO;
  officeLocations?: Array<{ latitude: number; longitude: number; radius: number }>;
  attendanceSettings?: { checkInStart: string; checkInEnd: string; checkOutStart: string; checkOutEnd: string };
}

export async function checkOut(params: CheckOutParams): Promise<AttendanceDTO> {
  const { userId, data, officeLocations, attendanceSettings } = params;
  const today = getTodayDateString();
  const now = new Date();

  // Check if checked in today
  const existing = await prisma.attendance.findFirst({
    where: {
      userId,
      date: new Date(today),
    },
  });

  if (!existing || !existing.checkInTime) {
    throw new ValidationError('Not checked in', [
      { field: 'checkOut', message: 'You must check in before checking out' },
    ]);
  }

  if (existing.checkOutTime) {
    throw new ValidationError('Already checked out today', [
      { field: 'checkOut', message: 'You have already checked out today' },
    ]);
  }

  // Validate GPS if office locations are provided
  if (officeLocations && officeLocations.length > 0) {
    validateGPS(
      data.latitude,
      data.longitude,
      officeLocations
    );
  }

    // Validate time window for check-out
    if (attendanceSettings) {
      const [startHour, startMinute] = attendanceSettings.checkOutStart.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      const currentMinutes = wibTime.getUTCHours() * 60 + wibTime.getUTCMinutes();

      if (currentMinutes < startMinutes) {
      throw new ValidationError('Check-out not yet open', [
        { field: 'time', message: `Check-out opens at ${attendanceSettings.checkOutStart}` },
      ]);
    }
  }

  // Save photo to S3
  const photoPath = await savePhoto(data.photo, userId, 'checkout');

  const checkOutTime = new Date(`1970-01-01T${new Date(now.getTime() + (7 * 60 * 60 * 1000)).toISOString().split('T')[1].split('.')[0]}`);

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOutTime,
      checkOutPhoto: photoPath,
      checkOutLatitude: data.latitude,
      checkOutLongitude: data.longitude,
      notes: data.notes || existing.notes,
    },
  });

  return toAttendanceDTO(attendance);
}

export interface StatsParams {
  userId: number;
  month: number; // 1-12
  year: number;
}

export async function getStats(params: StatsParams): Promise<{
  present: number;
  late: number;
  absent: number;
  sakit: number;
  cuti: number;
  dinas_luar: number;
  total: number;
}> {
  const { userId, month, year } = params;

  // Build date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  const records = await prisma.attendance.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const stats = {
    present: 0,
    late: 0,
    absent: 0,
    sakit: 0,
    cuti: 0,
    dinas_luar: 0,
    total: records.length,
  };

  for (const record of records) {
    const status = record.status as AttendanceStatus;
    if (status in stats) {
      stats[status]++;
    }
  }

  return stats;
}

export async function getToday(userId: number): Promise<AttendanceDTO | null> {
  const today = getTodayDateString();

  const record = await prisma.attendance.findFirst({
    where: {
      userId,
      date: new Date(today),
    },
  });

  if (!record) {
    return null;
  }

  return toAttendanceDTO(record);
}

export interface HistoryParams {
  userId: number;
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}

export async function getHistory(params: HistoryParams): Promise<{
  data: AttendanceDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { userId, page, limit, startDate, endDate } = params;
  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    data: records.map(toAttendanceDTO),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDetail(userId: number, date: string): Promise<AttendanceDTO> {
  const record = await prisma.attendance.findFirst({
    where: {
      userId,
      date: new Date(date),
    },
  });

  if (!record) {
    throw new NotFoundError(`Attendance record not found for date ${date}`);
  }

  return toAttendanceDTO(record);
}
