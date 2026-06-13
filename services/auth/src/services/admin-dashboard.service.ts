import { PrismaClient } from '../db.js';
import { attendanceClient } from '../clients/attendance-client.js';
import { configClient } from '../clients/config-client.js';
import { activityClient } from '../clients/activity-client.js';

const prisma = new PrismaClient();

export interface DashboardFilters {
  date: string;
  division?: string;
  status?: string;
  search?: string;
  activity_id?: number;
  page: number;
  per_page: number;
}

export interface DashboardResponse {
  total_employees: number;
  present_today: number;
  late_today: number;
  absent_today: number;
  is_holiday: boolean;
  holiday_name: string | null;
  divisions: string[];
  activities: any[];
  attendances: {
    data: any[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

/**
 * Get admin dashboard data - aggregates from multiple services.
 */
export async function getDashboard(filters: DashboardFilters, requestId?: string): Promise<DashboardResponse> {
  const { date, division, status, search, activity_id, page, per_page } = filters;

  // 1. Get all active users
  const userWhere: any = { status: 'active' };
  if (division) {
    userWhere.division = division;
  }
  if (search) {
    userWhere.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [allActiveUsers, totalEmployees, divisions] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, email: true, division: true, photo: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.user.findMany({
      where: { status: 'active', division: { not: null } },
      select: { division: true },
      distinct: ['division'],
    }),
  ]);

  // 2. Check if the date is a holiday
  const holidayCheck = await configClient.checkHoliday(date, requestId);

  // 3. Get activities for the date
  const activities = await activityClient.getByDate(date, requestId);

  // 4. Get attendance records for the date
  const attendanceRecords = await attendanceClient.getByDate(date, requestId);

  // 5. Create a map of userId → attendance record
  const attendanceMap = new Map<number, any>();
  for (const record of attendanceRecords) {
    attendanceMap.set(record.userId, record);
  }

  // 6. Calculate stats
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;

  for (const record of attendanceRecords) {
    switch (record.status) {
      case 'present':
        presentCount++;
        break;
      case 'late':
        lateCount++;
        break;
      case 'absent':
        absentCount++;
        break;
    }
  }

  // 7. Build combined attendance data (users + their attendance for the day)
  let filteredUsers = allActiveUsers;

  // Filter by activity_id if provided
  if (activity_id) {
    const usersWithActivity = new Set(
      attendanceRecords
        .filter((r: any) => r.activityId === activity_id)
        .map((r: any) => r.userId)
    );
    filteredUsers = filteredUsers.filter(u => usersWithActivity.has(u.id));
  }

  // Filter by attendance status if provided
  if (status) {
    if (status === 'absent') {
      // Users who don't have attendance record or have absent status
      const usersWithAttendance = new Set(
        attendanceRecords
          .filter((r: any) => r.status !== 'absent')
          .map((r: any) => r.userId)
      );
      filteredUsers = filteredUsers.filter(u => !usersWithAttendance.has(u.id));
    } else {
      const usersWithStatus = new Set(
        attendanceRecords
          .filter((r: any) => r.status === status)
          .map((r: any) => r.userId)
      );
      filteredUsers = filteredUsers.filter(u => usersWithStatus.has(u.id));
    }
  }

  // 8. Paginate
  const total = filteredUsers.length;
  const lastPage = Math.ceil(total / per_page) || 1;
  const offset = (page - 1) * per_page;
  const paginatedUsers = filteredUsers.slice(offset, offset + per_page);

  // 9. Combine user + attendance data
  const attendancesData = paginatedUsers.map(user => {
    const attendance = attendanceMap.get(user.id);
    return {
      id: attendance?.id || null,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        division: user.division,
        photo: user.photo,
      },
      date,
      checkInTime: attendance?.checkInTime || null,
      checkOutTime: attendance?.checkOutTime || null,
      checkInPhoto: attendance?.checkInPhoto || null,
      checkOutPhoto: attendance?.checkOutPhoto || null,
      status: attendance?.status || 'absent',
      notes: attendance?.notes || null,
      activityId: attendance?.activityId || null,
    };
  });

  return {
    total_employees: totalEmployees,
    present_today: presentCount,
    late_today: lateCount,
    absent_today: absentCount,
    is_holiday: holidayCheck.is_holiday,
    holiday_name: holidayCheck.holiday_name,
    divisions: divisions.map(d => d.division!).filter(Boolean).sort(),
    activities,
    attendances: {
      data: attendancesData,
      meta: {
        current_page: page,
        last_page: lastPage,
        per_page,
        total,
      },
    },
  };
}

/**
 * Get single attendance detail with user info.
 */
export async function getAttendanceDetail(id: number, requestId?: string) {
  const attendanceRecords = await attendanceClient.getById(id, requestId);
  if (!attendanceRecords) {
    const { NotFoundError } = await import('@fintap/shared');
    throw new NotFoundError('Attendance record not found');
  }

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: attendanceRecords.userId },
    select: { id: true, name: true, email: true, division: true, photo: true },
  });

  return {
    ...attendanceRecords,
    user,
  };
}

/**
 * Update attendance status (admin).
 */
export async function updateAttendanceStatus(id: number, status: string, requestId?: string) {
  return attendanceClient.updateStatus(id, status, requestId);
}
