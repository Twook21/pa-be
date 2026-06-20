import multer from 'multer';
import { createS3Uploader } from '@fintap/shared/dist/utils/s3-upload.js';

const UPLOAD_BUCKET = process.env.S3_BUCKET || 'uploads';
export const upload = createS3Uploader(
  UPLOAD_BUCKET, 
  'request', 
  5 * 1024 * 1024,
  (_req, file, cb) => {
    // Allow images and documents
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and document files are allowed'));
    }
  }
);
