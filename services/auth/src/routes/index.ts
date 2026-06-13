import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import profileRoutes from './profile.routes.js';
import adminRoutes from './admin.routes.js';
import internalRoutes from './internal.routes.js';

const router = Router();

// Auth routes: /register, /login, /logout, /forgot-password, /reset-password, /me
router.use('/', authRoutes);

// Profile routes: /profile
router.use('/profile', profileRoutes);

// User CRUD routes: /users
router.use('/users', userRoutes);

// Admin routes: /admin/dashboard, /admin/attendance/:id
router.use('/admin', adminRoutes);

// Internal routes: /internal/users/:id
router.use('/internal', internalRoutes);

export default router;
