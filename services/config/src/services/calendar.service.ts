import { PrismaClient } from '../db.js';
import { ValidationError, NotFoundError } from '@fintap/shared';
import type { HolidayCheckResponse } from '@fintap/shared';

const prisma = new PrismaClient();

export class CalendarService {
  /**
   * Get calendar entries by year and month.
   */
  async list(year?: number, month?: number) {
    const where: Record<string, unknown> = {};

    if (year !== undefined) {
      where.year = year;
    }
    if (month !== undefined) {
      if (month < 1 || month > 12) {
        throw new ValidationError('Invalid month', [
          { field: 'month', message: 'Month must be between 1 and 12' },
        ]);
      }
      where.month = month;
    }

    const calendars = await prisma.calendar.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return calendars.map(this.formatCalendar);
  }

  /**
   * Check if a given date is a holiday.
   * Returns is_holiday: true for weekends (Saturday/Sunday) regardless of DB record.
   */
  async checkHoliday(dateStr: string): Promise<HolidayCheckResponse> {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid date format', [
        { field: 'date', message: 'Date must be in YYYY-MM-DD format' },
      ]);
    }

    // Check if weekend (Saturday = 6, Sunday = 0)
    const dayOfWeek = dateObj.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Check if there's also a named holiday in DB
      const calendarRecord = await prisma.calendar.findFirst({
        where: { date: dateObj, isHoliday: true },
      });

      return {
        is_holiday: true,
        holiday_name: calendarRecord?.holidayName || (dayOfWeek === 0 ? 'Minggu' : 'Sabtu'),
      };
    }

    // Check DB for holiday record
    const calendarRecord = await prisma.calendar.findFirst({
      where: { date: dateObj, isHoliday: true },
    });

    if (calendarRecord) {
      return {
        is_holiday: true,
        holiday_name: calendarRecord.holidayName,
      };
    }

    return {
      is_holiday: false,
      holiday_name: null,
    };
  }

  /**
   * Get holidays list within a date range or by year/month.
   */
  async getHolidays(query: { year?: number; month?: number; start_date?: string; end_date?: string }) {
    const where: any = { isHoliday: true };

    if (query.year !== undefined) {
      where.year = query.year;
    }
    if (query.month !== undefined) {
      where.month = query.month;
    }
    if (query.start_date || query.end_date) {
      where.date = {};
      if (query.start_date) {
        where.date.gte = new Date(query.start_date);
      }
      if (query.end_date) {
        where.date.lte = new Date(query.end_date);
      }
    }

    const holidays = await prisma.calendar.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return holidays.map(this.formatCalendar);
  }

  /**
   * Create a custom holiday entry (admin manual input).
   * If the date already exists in calendar, update it to be a holiday.
   * If not, create a new entry.
   */
  async createHoliday(data: { date: string; holiday_name: string; holiday_type?: string }) {
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid date format', [
        { field: 'date', message: 'Date must be in YYYY-MM-DD format' },
      ]);
    }

    if (!data.holiday_name || data.holiday_name.trim() === '') {
      throw new ValidationError('Holiday name is required', [
        { field: 'holiday_name', message: 'Holiday name cannot be empty' },
      ]);
    }

    const dayOfWeek = dateObj.getUTCDay();
    const holidayType = data.holiday_type || 'khusus';

    const calendar = await prisma.calendar.upsert({
      where: { date: dateObj },
      update: {
        isHoliday: true,
        holidayName: data.holiday_name.trim(),
        holidayType: holidayType,
      },
      create: {
        date: dateObj,
        year: dateObj.getUTCFullYear(),
        month: dateObj.getUTCMonth() + 1,
        day: dateObj.getUTCDate(),
        dayOfWeek,
        isHoliday: true,
        holidayName: data.holiday_name.trim(),
        holidayType: holidayType,
      },
    });

    return this.formatCalendar(calendar);
  }

  /**
   * Update a holiday entry by ID (admin).
   */
  async updateHoliday(id: number, data: { date?: string; holiday_name?: string; holiday_type?: string }) {
    const existing = await prisma.calendar.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Holiday not found');
    }

    const updateData: any = {};

    if (data.date) {
      const dateObj = new Date(data.date);
      if (isNaN(dateObj.getTime())) {
        throw new ValidationError('Invalid date format', [
          { field: 'date', message: 'Date must be in YYYY-MM-DD format' },
        ]);
      }
      updateData.date = dateObj;
      updateData.year = dateObj.getUTCFullYear();
      updateData.month = dateObj.getUTCMonth() + 1;
      updateData.day = dateObj.getUTCDate();
      updateData.dayOfWeek = dateObj.getUTCDay();
    }

    if (data.holiday_name !== undefined) {
      updateData.holidayName = data.holiday_name.trim();
    }

    if (data.holiday_type !== undefined) {
      updateData.holidayType = data.holiday_type;
    }

    const calendar = await prisma.calendar.update({
      where: { id },
      data: updateData,
    });

    return this.formatCalendar(calendar);
  }

  /**
   * Delete a holiday entry by ID (admin).
   * If it's a weekend, just remove the holiday name but keep the record.
   * If it's a weekday, set isHoliday to false and clear holiday info.
   */
  async deleteHoliday(id: number) {
    const existing = await prisma.calendar.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Holiday not found');
    }

    const dayOfWeek = existing.dayOfWeek;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // If weekend, keep record but clear custom holiday name
    // If weekday, set back to non-holiday
    const calendar = await prisma.calendar.update({
      where: { id },
      data: {
        isHoliday: isWeekend, // weekends stay as holiday, weekdays become non-holiday
        holidayName: null,
        holidayType: null,
      },
    });

    return this.formatCalendar(calendar);
  }

  /**
   * Get a single holiday by ID.
   */
  async getHolidayById(id: number) {
    const calendar = await prisma.calendar.findUnique({ where: { id } });
    if (!calendar) {
      throw new NotFoundError('Holiday not found');
    }
    return this.formatCalendar(calendar);
  }

  /**
   * Sync calendar data from the external Indonesian holiday API (libur.deno.dev).
   * API format: GET https://libur.deno.dev/api?year={year}
   * Response: [ { date: "2026-01-01", name: "...", is_national_holiday: true } ]
   * 
   * Can also sync per month: GET https://libur.deno.dev/api?year={year}&month={month}
   */
  async syncFromApi(year?: number, month?: number) {
    const calendarApiUrl = process.env.CALENDAR_API_URL;
    const timeout = parseInt(process.env.CALENDAR_API_TIMEOUT || '60000', 10);

    if (!calendarApiUrl) {
      throw new Error('CALENDAR_API_URL is not configured');
    }

    const targetYear = year || new Date().getFullYear();

    // Dynamic import of axios to avoid circular dependency issues
    const { default: axios } = await import('axios');

    // Build URL with query params
    let url = `${calendarApiUrl}?year=${targetYear}`;
    if (month) {
      url += `&month=${month}`;
    }

    const response = await axios.get(url, { timeout });
    const holidays = response.data;

    if (!Array.isArray(holidays)) {
      return { synced: 0 };
    }

    // If syncing full year, generate all days of the year
    // Otherwise just upsert the holidays received
    if (!month) {
      // Delete existing calendar data for this year before syncing
      await prisma.calendar.deleteMany({
        where: { year: targetYear },
      });

      // Create a set of holiday dates for quick lookup
      const holidayMap = new Map<string, { name: string; isNational: boolean }>();
      for (const h of holidays) {
        holidayMap.set(h.date, {
          name: h.name,
          isNational: h.is_national_holiday,
        });
      }

      // Generate all days of the year as batch
      const calendarData = [];
      const startDate = new Date(Date.UTC(targetYear, 0, 1));
      const endDate = new Date(Date.UTC(targetYear + 1, 0, 1));

      for (let d = new Date(startDate); d < endDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateObj = new Date(d);
        const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayOfWeek = dateObj.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const holiday = holidayMap.get(dateStr);

        calendarData.push({
          date: dateObj,
          year: dateObj.getUTCFullYear(),
          month: dateObj.getUTCMonth() + 1,
          day: dateObj.getUTCDate(),
          dayOfWeek,
          isHoliday: isWeekend || !!holiday,
          holidayName: holiday?.name || null,
          holidayType: holiday ? (holiday.isNational ? 'nasional' : 'cuti_bersama') : null,
        });
      }

      // Batch insert for performance
      const result = await prisma.calendar.createMany({
        data: calendarData,
        skipDuplicates: true,
      });

      return { synced: result.count, year: targetYear };
    } else {
      // Sync only specific month - upsert holiday entries
      let synced = 0;

      for (const h of holidays) {
        const dateObj = new Date(h.date);
        if (isNaN(dateObj.getTime())) continue;

        const dayOfWeek = dateObj.getUTCDay();

        await prisma.calendar.upsert({
          where: { date: dateObj },
          update: {
            isHoliday: true,
            holidayName: h.name,
            holidayType: h.is_national_holiday ? 'nasional' : 'cuti_bersama',
          },
          create: {
            date: dateObj,
            year: dateObj.getUTCFullYear(),
            month: dateObj.getUTCMonth() + 1,
            day: dateObj.getUTCDate(),
            dayOfWeek,
            isHoliday: true,
            holidayName: h.name,
            holidayType: h.is_national_holiday ? 'nasional' : 'cuti_bersama',
          },
        });
        synced++;
      }

      return { synced, year: targetYear, month };
    }
  }

  /**
   * Format a Prisma Calendar model to the CalendarDTO response format.
   */
  private formatCalendar(calendar: any) {
    // Determine source based on holidayType
    // nasional/cuti_bersama = from external API, khusus = admin manual input
    let source: 'api' | 'manual' | null = null;
    if (calendar.holidayName) {
      source = calendar.holidayType === 'khusus' ? 'manual' : 'api';
    }

    return {
      id: calendar.id,
      date: calendar.date instanceof Date
        ? calendar.date.toISOString().split('T')[0]
        : calendar.date,
      year: calendar.year,
      month: calendar.month,
      day: calendar.day,
      dayOfWeek: calendar.dayOfWeek,
      isHoliday: calendar.isHoliday,
      holidayName: calendar.holidayName,
      holidayType: calendar.holidayType,
      source, // 'api' | 'manual' | null — helps FE distinguish origin
      isEditable: calendar.holidayType === 'khusus', // FE can use this to show edit/delete buttons
      createdAt: calendar.createdAt instanceof Date
        ? calendar.createdAt.toISOString()
        : calendar.createdAt,
      updatedAt: calendar.updatedAt instanceof Date
        ? calendar.updatedAt.toISOString()
        : calendar.updatedAt,
    };
  }
}

export const calendarService = new CalendarService();
