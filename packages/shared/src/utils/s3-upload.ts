import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';

// Define the S3 client instance using Supabase credentials
// Environment variables will be injected by Vercel
export const s3Client = new S3Client({
  forcePathStyle: true,
  region: process.env.S3_REGION || 'ap-southeast-2',
  endpoint: process.env.S3_ENDPOINT || 'https://fgvvhouhncseurbipbbt.storage.supabase.co/storage/v1/s3',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  }
});

/**
 * Creates a Multer upload instance configured for Supabase S3 storage.
 * @param bucketName The name of the Supabase storage bucket
 * @param prefix Prefix for the uploaded file (e.g., 'user', 'profile', 'attachment')
 * @param maxFileSize Maximum file size in bytes
 */
export const createS3Uploader = (
  bucketName: string, 
  prefix: string, 
  maxFileSize: number = 5 * 1024 * 1024 // Default 5MB
) => {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: bucketName,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      // acl is often 'public-read' but Supabase handles ACL via policies on the bucket
      key: function (req: Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, `${prefix}-${uniqueSuffix}.${ext}`);
      }
    }),
    limits: { fileSize: maxFileSize },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // By default, only allow images and standard documents. 
      // Individual routes can override fileFilter or use standard multer mechanisms if needed.
      cb(null, true); 
    },
  });
};
