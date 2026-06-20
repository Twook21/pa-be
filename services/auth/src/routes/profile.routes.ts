import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import { formatSuccess } from '@fintap/shared';
import { createS3Uploader } from '@fintap/shared/dist/utils/s3-upload.js';
import { internalAuth, extractUser } from '../middleware/internal-auth.js';
import * as userService from '../services/user.service.js';

const router = Router();

const UPLOAD_BUCKET = process.env.S3_BUCKET || 'uploads';
const upload = createS3Uploader(UPLOAD_BUCKET, 'profile', 2 * 1024 * 1024); // 2MB limit

// All profile routes require authentication
router.use(internalAuth);

/**
 * GET /profile - Get current user's profile
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = extractUser(req);
    const user = await userService.getUserById(userId);
    res.status(200).json(formatSuccess('Profile retrieved', user));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /profile - Update current user's profile (FE uses POST with multipart)
 * Also handles PATCH /profile for compatibility
 * Body (multipart/form-data or JSON): name, email, phone, bio, division, photo
 */
router.post('/', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = extractUser(req);
    const file = (req as any).file as Express.Multer.File | undefined;

    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.phone !== undefined) updateData.phoneNumber = req.body.phone;
    if (req.body.phone_number !== undefined) updateData.phoneNumber = req.body.phone_number;
    if (req.body.phoneNumber !== undefined) updateData.phoneNumber = req.body.phoneNumber;
    if (req.body.bio !== undefined) updateData.bio = req.body.bio;
    if (req.body.division !== undefined) updateData.division = req.body.division;
    if (file) {
      updateData.photo = (file as any).location || file.filename;
    }

    const user = await userService.updateUser(userId, updateData);
    res.status(200).json(formatSuccess('Profile updated', user));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /profile - Alternative update method
 */
router.patch('/', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = extractUser(req);
    const file = (req as any).file as Express.Multer.File | undefined;

    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.phone !== undefined) updateData.phoneNumber = req.body.phone;
    if (req.body.phone_number !== undefined) updateData.phoneNumber = req.body.phone_number;
    if (req.body.phoneNumber !== undefined) updateData.phoneNumber = req.body.phoneNumber;
    if (req.body.bio !== undefined) updateData.bio = req.body.bio;
    if (req.body.division !== undefined) updateData.division = req.body.division;
    if (file) {
      updateData.photo = (file as any).location || file.filename;
    }

    const user = await userService.updateUser(userId, updateData);
    res.status(200).json(formatSuccess('Profile updated', user));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /profile/change-password - Change password
 * Body (JSON): { current_password, new_password, new_password_confirmation }
 */
router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = extractUser(req);
    const { current_password, new_password, new_password_confirmation } = req.body;

    await userService.changePassword(userId, {
      currentPassword: current_password,
      newPassword: new_password,
      newPasswordConfirmation: new_password_confirmation,
    });

    res.status(200).json(formatSuccess('Password changed successfully', null));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /profile - Delete own account
 */
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = extractUser(req);
    const user = await userService.deleteUser(userId);
    res.status(200).json(formatSuccess('Account deactivated', user));
  } catch (error) {
    next(error);
  }
});

export default router;
