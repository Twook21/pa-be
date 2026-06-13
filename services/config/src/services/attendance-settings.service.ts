import { PrismaClient } from '../db.js';
import { NotFoundError, ValidationError } from '@fintap/shared';

const prisma = new PrismaClient();

export interface UpdateAttendanceSettingDTO {
  checkInStart?: string;
  checkInEnd?: string;
  checkOutStart?: string;
  checkOutEnd?: string;
  isActive?: boolean;
}

export class AttendanceSettingsService {
  /**
   * Get all attendance settings.
   */
  async list() {
    const settings = await prisma.attendanceSetting.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return settings.map(this.formatSetting);
  }

  /**
   * Update attendance settings (admin only).
   * Updates the active setting or creates one if none exists.
   */
  async update(data: UpdateAttendanceSettingDTO) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const errors: Array<{ field: string; message: string }> = [];

    if (data.checkInStart !== undefined && !timeRegex.test(data.checkInStart)) {
      errors.push({ field: 'checkInStart', message: 'checkInStart must be in HH:MM format' });
    }
    if (data.checkInEnd !== undefined && !timeRegex.test(data.checkInEnd)) {
      errors.push({ field: 'checkInEnd', message: 'checkInEnd must be in HH:MM format' });
    }
    if (data.checkOutStart !== undefined && !timeRegex.test(data.checkOutStart)) {
      errors.push({ field: 'checkOutStart', message: 'checkOutStart must be in HH:MM format' });
    }
    if (data.checkOutEnd !== undefined && !timeRegex.test(data.checkOutEnd)) {
      errors.push({ field: 'checkOutEnd', message: 'checkOutEnd must be in HH:MM format' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid attendance settings', errors);
    }

    // Find the active setting
    let setting = await prisma.attendanceSetting.findFirst({
      where: { isActive: true },
    });

    if (setting) {
      // Update existing setting
      const updateData: Record<string, unknown> = {};
      if (data.checkInStart !== undefined) updateData.checkInStart = data.checkInStart;
      if (data.checkInEnd !== undefined) updateData.checkInEnd = data.checkInEnd;
      if (data.checkOutStart !== undefined) updateData.checkOutStart = data.checkOutStart;
      if (data.checkOutEnd !== undefined) updateData.checkOutEnd = data.checkOutEnd;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      setting = await prisma.attendanceSetting.update({
        where: { id: setting.id },
        data: updateData,
      });
    } else {
      // Create a new setting if none exists
      if (!data.checkInStart || !data.checkInEnd || !data.checkOutStart || !data.checkOutEnd) {
        throw new ValidationError('All time fields are required when creating initial settings', [
          { field: 'checkInStart', message: 'Required' },
          { field: 'checkInEnd', message: 'Required' },
          { field: 'checkOutStart', message: 'Required' },
          { field: 'checkOutEnd', message: 'Required' },
        ]);
      }

      setting = await prisma.attendanceSetting.create({
        data: {
          checkInStart: data.checkInStart,
          checkInEnd: data.checkInEnd,
          checkOutStart: data.checkOutStart,
          checkOutEnd: data.checkOutEnd,
          isActive: data.isActive ?? true,
        },
      });
    }

    return this.formatSetting(setting);
  }

  /**
   * Get the active attendance settings (internal endpoint).
   */
  async getActiveSettings() {
    const setting = await prisma.attendanceSetting.findFirst({
      where: { isActive: true },
    });

    if (!setting) {
      throw new NotFoundError('No active attendance settings found');
    }

    return this.formatSetting(setting);
  }

  /**
   * Format a Prisma AttendanceSetting model.
   */
  private formatSetting(setting: any) {
    return {
      id: setting.id,
      checkInStart: setting.checkInStart,
      checkInEnd: setting.checkInEnd,
      checkOutStart: setting.checkOutStart,
      checkOutEnd: setting.checkOutEnd,
      isActive: setting.isActive,
      createdAt: setting.createdAt instanceof Date
        ? setting.createdAt.toISOString()
        : setting.createdAt,
      updatedAt: setting.updatedAt instanceof Date
        ? setting.updatedAt.toISOString()
        : setting.updatedAt,
    };
  }
}

export const attendanceSettingsService = new AttendanceSettingsService();
