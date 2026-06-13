import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import * as userController from '../controllers/user.controller.js';
import { internalAuth, requireAdmin } from '../middleware/internal-auth.js';

const router = Router();

// Ensure uploads directory exists
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer config for photo upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `user-${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// All user CRUD routes require authentication and admin role
router.get('/', internalAuth, requireAdmin, userController.listUsers);
router.post('/', internalAuth, requireAdmin, upload.single('photo'), userController.createUser);
router.get('/:id', internalAuth, requireAdmin, userController.getUserById);
router.put('/:id', internalAuth, requireAdmin, upload.single('photo'), userController.updateUser);
router.delete('/:id', internalAuth, requireAdmin, userController.deleteUser);

export default router;
