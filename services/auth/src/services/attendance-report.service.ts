import { PrismaClient } from '../db.js';
import { attendanceClient } from '../clients/attendance-client.js';
import { configClient } from '../clients/config-client.js';

const prisma = new PrismaClient();

interface ReportOptions {
  signer_name?: string;
  signer_title?: string;
  use_custom_order?: boolean;
  custom_order?: number[] | null;
}

interface DayStatus {
  date: string;
  status: string | null; // 'present' | 'late' | 'absent' | 'sakit' | 'cuti' | 'dinas_luar' | null
  isHoliday: boolean;
  isWeekend: boolean;
}

interface UserReport {
  user: {
    id: number;
    name: string;
    email: string;
    division: string | null;
  };
  days: DayStatus[];
  summary: {
    present: number;
    late: number;
    absent: number;
    sakit: number;
    cuti: number;
    dinas_luar: number;
  };
}

/**
 * Generate attendance report matrix for a given month.
 * Returns: users × days grid with attendance status per day.
 */
export async function getAttendanceReport(month: string, requestId?: string, options?: ReportOptions) {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // 1. Get all active users
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, email: true, division: true },
    orderBy: { name: 'asc' },
  });

  // Apply custom order if specified
  let orderedUsers = users;
  if (options?.use_custom_order && options.custom_order && Array.isArray(options.custom_order)) {
    const orderMap = new Map(options.custom_order.map((id, idx) => [id, idx]));
    orderedUsers = [...users].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? 999;
      const bIdx = orderMap.get(b.id) ?? 999;
      return aIdx - bIdx;
    });
  }

  // 2. Get all attendance records for the month
  const attendanceRecords = await attendanceClient.getByMonth(year, monthNum, requestId);

  // 3. Build attendance map: userId → date → record
  const attendanceMap = new Map<number, Map<string, any>>();
  for (const record of attendanceRecords) {
    if (!attendanceMap.has(record.userId)) {
      attendanceMap.set(record.userId, new Map());
    }
    attendanceMap.get(record.userId)!.set(record.date, record);
  }

  // 4. Get holidays for the month from calendar
  const holidays = new Set<string>();
  const weekends = new Set<string>();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(Date.UTC(year, monthNum - 1, day));
    const dateStr = dateObj.toISOString().split('T')[0];
    const dayOfWeek = dateObj.getUTCDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends.add(dateStr);
    }
  }

  // Check holidays in one request
  try {
    const holidaysList = await configClient.getHolidays(month, requestId);
    holidaysList.forEach((holiday: any) => {
      holidays.add(holiday.date);
    });
  } catch {
    // If config service is down, we'll only have weekend info
  }

  // 5. Build report for each user
  const report: UserReport[] = orderedUsers.map(user => {
    const userAttendance = attendanceMap.get(user.id) || new Map();
    const days: DayStatus[] = [];
    const summary = { present: 0, late: 0, absent: 0, sakit: 0, cuti: 0, dinas_luar: 0 };

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
      const isWeekend = weekends.has(dateStr);
      const isHoliday = holidays.has(dateStr) || isWeekend;
      const record = userAttendance.get(dateStr);

      let status: string | null = null;

      if (record) {
        status = record.status;
        // Count for summary
        if (status && status in summary) {
          (summary as any)[status]++;
        }
      } else if (!isHoliday) {
        // Working day without attendance record = absent (only for past dates)
        const today = new Date();
        const dateObj = new Date(dateStr);
        if (dateObj <= today) {
          status = 'absent';
          summary.absent++;
        }
      }

      days.push({ date: dateStr, status, isHoliday, isWeekend });
    }

    return { user, days, summary };
  });

  // 6. Build response
  const response: any = {
    month,
    year,
    days_in_month: daysInMonth,
    total_users: orderedUsers.length,
    holidays: Array.from(holidays),
    weekends: Array.from(weekends),
    report,
  };

  // Add signer info if provided (for download)
  if (options?.signer_name) {
    response.signer_name = options.signer_name;
    response.signer_title = options.signer_title;
  }

  return response;
}
