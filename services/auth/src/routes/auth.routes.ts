import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { internalAuth } from '../middleware/internal-auth.js';

const router = Router();

// Public routes (gateway skips JWT for these)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (gateway has already validated JWT and injected headers)
router.post('/logout', internalAuth, authController.logout);
router.get('/me', internalAuth, authController.getMe);

// Biometric endpoints (protected, mapped via gateway)
router.get('/biometric', internalAuth, authController.getBiometricStatus);
router.post('/biometric/register', internalAuth, authController.registerBiometric);
router.delete('/biometric', internalAuth, authController.deleteBiometric);

export default router;
