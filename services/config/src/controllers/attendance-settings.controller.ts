import { Request, Response, NextFunction } from 'express';
import { formatSuccess } from '@fintap/shared';
import { attendanceSettingsService } from '../services/attendance-settings.service.js';

export class AttendanceSettingsController {
  /**
   * GET / - List attendance settings.
   */
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await attendanceSettingsService.list();
      res.status(200).json(formatSuccess('Attendance settings retrieved successfully', settings));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT / - Update attendance settings (admin only).
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const setting = await attendanceSettingsService.update(req.body);
      res.status(200).json(formatSuccess('Attendance settings updated successfully', setting));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /internal/attendance-settings/active - Get active settings (internal).
   */
  async getActive(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const setting = await attendanceSettingsService.getActiveSettings();
      res.status(200).json(formatSuccess('Active attendance settings retrieved', setting));
    } catch (error) {
      next(error);
    }
  }
}

export const attendanceSettingsController = new AttendanceSettingsController();
