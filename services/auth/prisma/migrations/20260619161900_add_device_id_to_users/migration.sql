-- AlterTable: Add device_id column to users table for device binding (anti proxy attendance)
ALTER TABLE "auth_schema"."users" ADD COLUMN "device_id" VARCHAR(512);
