import { Request, Response, NextFunction } from 'express';
import { formatSuccess } from '@fintap/shared';
import { calendarService } from '../services/calendar.service.js';

export class CalendarController {
  /**
   * GET / - List calendar entries with optional year/month query params.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;

      const calendars = await calendarService.list(year, month);
      res.status(200).json(formatSuccess('Calendar entries retrieved successfully', calendars));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /internal/calendars/is-holiday/:date - Check if a date is a holiday (internal).
   */
  async checkHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.params;
      const result = await calendarService.checkHoliday(date);
      res.status(200).json(formatSuccess('Holiday check result', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /internal/calendars/holidays - Get holidays list (internal).
   */
  async getHolidays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const start_date = req.query.start_date as string | undefined;
      const end_date = req.query.end_date as string | undefined;

      const holidays = await calendarService.getHolidays({ year, month, start_date, end_date });
      res.status(200).json(formatSuccess('Holidays retrieved successfully', holidays));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /calendars/sync - Manually trigger calendar sync from external API (admin only).
   * Query params: ?year=2026 (optional, defaults to current year)
   */
  async sync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const result = await calendarService.syncFromApi(year);
      res.status(200).json(formatSuccess('Calendar synced successfully from external API', result));
    } catch (error: any) {
      // Provide meaningful error message for API connectivity issues
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        res.status(502).json({
          status: 'error',
          message: `Failed to connect to calendar API: ${error.message}`,
          code: 'CALENDAR_API_UNREACHABLE',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /admin/holidays - Create a custom holiday (admin only).
   * Body: { date: "2026-06-15", holiday_name: "Libur Khusus", holiday_type?: "khusus" }
   */
  async createHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const holiday = await calendarService.createHoliday(req.body);
      res.status(201).json(formatSuccess('Holiday created successfully', holiday));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/holidays - List all holidays (admin).
   * Query params: ?year=2026&month=6
   */
  async listHolidays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const start_date = req.query.start_date as string | undefined;
      const end_date = req.query.end_date as string | undefined;

      const holidays = await calendarService.getHolidays({ year, month, start_date, end_date });
      res.status(200).json(formatSuccess('Holidays retrieved successfully', holidays));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/holidays/:id - Get a single holiday by ID (admin).
   */
  async getHolidayById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ status: 'error', message: 'Invalid holiday ID', code: 'VALIDATION_ERROR' });
        return;
      }
      const holiday = await calendarService.getHolidayById(id);
      res.status(200).json(formatSuccess('Holiday retrieved successfully', holiday));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/holidays/:id - Update a holiday (admin only).
   * Body: { date?: "2026-06-15", holiday_name?: "Updated Name", holiday_type?: "khusus" }
   */
  async updateHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ status: 'error', message: 'Invalid holiday ID', code: 'VALIDATION_ERROR' });
        return;
      }
      const holiday = await calendarService.updateHoliday(id, req.body);
      res.status(200).json(formatSuccess('Holiday updated successfully', holiday));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /admin/holidays/:id - Delete a holiday (admin only).
   */
  async deleteHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ status: 'error', message: 'Invalid holiday ID', code: 'VALIDATION_ERROR' });
        return;
      }
      const result = await calendarService.deleteHoliday(id);
      res.status(200).json(formatSuccess('Holiday deleted successfully', result));
    } catch (error) {
      next(error);
    }
  }
}

export const calendarController = new CalendarController();
