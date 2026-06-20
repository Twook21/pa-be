import { Request, Response, NextFunction } from 'express';
import { formatSuccess, paginationSchema } from '@fintap/shared';
import * as userService from '../services/user.service.js';

/**
 * Normalize request body from snake_case (FE) to camelCase (backend).
 * Handles both JSON and multipart/form-data body.
 */
function normalizeBody(body: any, file?: Express.Multer.File) {
  return {
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role,
    division: body.division,
    phoneNumber: body.phone_number || body.phoneNumber,
    status: body.status,
    resignDate: body.resign_date || body.resignDate,
    photo: file ? ((file as any).location || file.filename) : body.photo,
    fcmToken: body.fcm_token || body.fcmToken,
  };
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = paginationSchema.parse(req.query);
    const { users, total } = await userService.listUsers(pagination);

    const totalPages = Math.ceil(total / pagination.limit);

    res.status(200).json({
      status: 'success',
      message: 'Users retrieved',
      data: users,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid user ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const user = await userService.getUserById(id);
    res.status(200).json(formatSuccess('User retrieved', user));
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    const data = normalizeBody(req.body, file);

    const user = await userService.createUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      division: data.division,
      phoneNumber: data.phoneNumber,
      status: data.status,
      resignDate: data.resignDate,
      photo: data.photo,
    });
    res.status(201).json(formatSuccess('User created', user));
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid user ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    const data = normalizeBody(req.body, file);

    // Only pass defined fields to updateUser
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password) updateData.password = data.password;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.division !== undefined) updateData.division = data.division;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.resignDate !== undefined) updateData.resignDate = data.resignDate;
    if (file) {
      updateData.photo = (file as any).location || file.filename;
    }
    if (data.fcmToken !== undefined) updateData.fcmToken = data.fcmToken;

    const user = await userService.updateUser(id, updateData);
    res.status(200).json(formatSuccess('User updated', user));
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid user ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const user = await userService.deleteUser(id);
    res.status(200).json(formatSuccess('User deactivated', user));
  } catch (error) {
    next(error);
  }
}
