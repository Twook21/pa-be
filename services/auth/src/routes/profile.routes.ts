import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import { formatSuccess } from '@fintap/shared';
import { internalAuth, extractUser } from '../middleware/internal-auth.js';
import * as userService from '../services/user.service.js';

const router = Router();

// Ensure uploads directory exists
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `profile-${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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
    if (file) updateData.photo = file.filename;

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
    if (file) updateData.photo = file.filename;

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
