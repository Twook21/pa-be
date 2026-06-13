import { Request, Response, NextFunction } from 'express';
import { formatSuccess, paginationSchema } from '@fintap/shared';
import { activityService } from '../services/activity.service.js';

export class ActivityController {
  /**
   * GET / - List activities with pagination.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = paginationSchema.parse(req.query);
      const result = await activityService.list(pagination);

      res.status(200).json({
        status: 'success',
        message: 'Activities retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST / - Create a new activity (admin only).
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string | undefined;
      const activity = await activityService.create(req.body, requestId);

      res.status(201).json(formatSuccess('Activity created successfully', activity));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id - Get activity by ID.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid activity ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const activity = await activityService.getById(id);
      res.status(200).json(formatSuccess('Activity retrieved successfully', activity));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /:id - Update an activity (admin only).
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid activity ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const activity = await activityService.update(id, req.body);
      res.status(200).json(formatSuccess('Activity updated successfully', activity));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /:id - Delete an activity (admin only).
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid activity ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const requestId = req.headers['x-request-id'] as string | undefined;
      await activityService.delete(id, requestId);
      res.status(200).json(formatSuccess('Activity deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /internal/activities/by-date/:date - Get activity by date (internal endpoint).
   */
  async getByDate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.params;
      const activity = await activityService.getByDate(date);

      res.status(200).json(formatSuccess(
        activity ? 'Activity found' : 'No activity on this date',
        activity
      ));
    } catch (error) {
      next(error);
    }
  }
}

export const activityController = new ActivityController();
