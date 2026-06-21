import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { internalAuth } from '../middleware/internal-auth.js';
import { createS3Uploader } from '@fintap/shared/dist/utils/s3-upload.js';

const router = Router();

const UPLOAD_BUCKET = process.env.S3_BUCKET || 'uploads';
const upload = createS3Uploader(UPLOAD_BUCKET, 'user', 5 * 1024 * 1024);

// Public routes (gateway skips JWT for these)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (gateway has already validated JWT and injected headers)
router.post('/logout', internalAuth, authController.logout);
router.get('/me', internalAuth, authController.getMe);
router.post('/profile', internalAuth, upload.single('photo'), authController.updateProfile);
router.post('/fcm-token', internalAuth, authController.updateFcmToken);

// Biometric endpoints (protected, mapped via gateway)
router.get('/biometric', internalAuth, authController.getBiometricStatus);
router.post('/biometric/register', internalAuth, authController.registerBiometric);
router.delete('/biometric', internalAuth, authController.deleteBiometric);

export default router;
