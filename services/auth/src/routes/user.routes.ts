import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import * as userController from '../controllers/user.controller.js';
import { createS3Uploader } from '@fintap/shared/dist/utils/s3-upload.js';
import { internalAuth, requireAdmin } from '../middleware/internal-auth.js';

const router = Router();

const UPLOAD_BUCKET = process.env.S3_BUCKET || 'uploads';
const upload = createS3Uploader(UPLOAD_BUCKET, 'user', 5 * 1024 * 1024); // 5MB limit

// All user CRUD routes require authentication and admin role
router.get('/', internalAuth, requireAdmin, userController.listUsers);
router.post('/', internalAuth, requireAdmin, upload.single('photo'), userController.createUser);
router.get('/:id', internalAuth, requireAdmin, userController.getUserById);
router.put('/:id', internalAuth, requireAdmin, upload.single('photo'), userController.updateUser);
router.delete('/:id', internalAuth, requireAdmin, userController.deleteUser);

export default router;
