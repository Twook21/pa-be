import { Request, Response, NextFunction } from 'express';
import { formatSuccess, ValidationError } from '@fintap/shared';
import { notificationService } from '../services/notification.service.js';

export class NotificationController {
  /**
   * GET /notifications - List notifications for the authenticated user (paginated).
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new ValidationError('User ID required', [
          { field: 'x-user-id', message: 'User ID header is missing' },
        ]);
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await notificationService.list(userId, page, limit);

      res.status(200).json({
        status: 'success',
        message: 'Notifications retrieved successfully',
        data: result.notifications,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/:id/read - Mark a notification as read.
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new ValidationError('User ID required', [
          { field: 'x-user-id', message: 'User ID header is missing' },
        ]);
      }

      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, userId);

      res.status(200).json(formatSuccess('Notification marked as read', notification));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/read-all - Mark all notifications as read.
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new ValidationError('User ID required', [
          { field: 'x-user-id', message: 'User ID header is missing' },
        ]);
      }

      const result = await notificationService.markAllAsRead(userId);
      res.status(200).json(formatSuccess('All notifications marked as read', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /internal/notifications/send - Internal endpoint to send notification.
   */
  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, recipient_user_id, data } = req.body;

      if (!type || !data) {
        throw new ValidationError('Invalid payload', [
          ...(!type ? [{ field: 'type', message: 'Type is required' }] : []),
          ...(!data ? [{ field: 'data', message: 'Data is required' }] : []),
        ]);
      }

      if (recipient_user_id === 'admin') {
        await notificationService.sendToAllAdmins(type, data);
      } else if (recipient_user_id === null || recipient_user_id === undefined) {
        await notificationService.sendToAllActiveUsers(type, data);
      } else {
        await notificationService.send({ type, recipient_user_id: Number(recipient_user_id), data });
      }

      res.status(201).json(formatSuccess('Notification sent successfully'));
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
