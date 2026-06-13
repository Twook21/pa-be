-- =============================================================================
-- FinTap v2 — Schema Separation Migration
-- =============================================================================
-- Migrates all tables from 'public' schema to their respective service schemas.
-- This enables logical isolation per microservice within a single PostgreSQL
-- instance (Supabase free tier).
--
-- IMPORTANT: Run this script in a transaction. If any step fails, the entire
-- migration will be rolled back.
--
-- Requirements: 3.1, 3.5, 3.6, 3.7, 17.1, 17.2, 17.3, 17.4, 17.6
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Create all schemas
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS attendance_schema;
CREATE SCHEMA IF NOT EXISTS activity_schema;
CREATE SCHEMA IF NOT EXISTS request_schema;
CREATE SCHEMA IF NOT EXISTS config_schema;
CREATE SCHEMA IF NOT EXISTS notification_schema;

-- =============================================================================
-- STEP 2: Drop cross-schema foreign key constraints
-- =============================================================================
-- These FK constraints reference tables that will live in different schemas.
-- After migration, referential integrity is enforced at the application level
-- via inter-service HTTP calls (see design.md — "FK removal" decision).
-- =============================================================================

-- attendances.user_id → users.id
ALTER TABLE IF EXISTS public.attendances
  DROP CONSTRAINT IF EXISTS attendances_user_id_fkey;

-- attendances.activity_id → activities.id (cross-schema: attendance → activity)
ALTER TABLE IF EXISTS public.attendances
  DROP CONSTRAINT IF EXISTS attendances_activity_id_fkey;

-- leave_requests.user_id → users.id
ALTER TABLE IF EXISTS public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;

-- external_duties.user_id → users.id
ALTER TABLE IF EXISTS public.external_duties
  DROP CONSTRAINT IF EXISTS external_duties_user_id_fkey;

-- external_duties.approved_by → users.id
ALTER TABLE IF EXISTS public.external_duties
  DROP CONSTRAINT IF EXISTS external_duties_approved_by_fkey;

-- notifications.notifiable_id → users.id (polymorphic — may not exist as FK)
ALTER TABLE IF EXISTS public.notifications
  DROP CONSTRAINT IF EXISTS notifications_notifiable_id_fkey;

-- user_locations.user_id → users.id
ALTER TABLE IF EXISTS public.user_locations
  DROP CONSTRAINT IF EXISTS user_locations_user_id_fkey;

-- =============================================================================
-- STEP 3: Move enum types to respective schemas (if they exist in public)
-- =============================================================================
-- Note: PostgreSQL enums are schema-independent objects. When tables move to
-- new schemas, enum types remain accessible. We create new enum types in the
-- target schemas and alter columns to use them only if necessary.
-- For Prisma-managed schemas, enums will be recreated by prisma migrate.
-- This step is a no-op if enums don't exist yet in public schema.
-- =============================================================================

-- Move UserRole enum if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER TYPE public."UserRole" SET SCHEMA auth_schema;
  END IF;
END $$;

-- Move UserStatus enum if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER TYPE public."UserStatus" SET SCHEMA auth_schema;
  END IF;
END $$;

-- Move AttendanceStatus enum if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER TYPE public."AttendanceStatus" SET SCHEMA attendance_schema;
  END IF;
END $$;

-- Move RequestStatus enum if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER TYPE public."RequestStatus" SET SCHEMA request_schema;
  END IF;
END $$;

-- =============================================================================
-- STEP 4: Move tables from public to their respective schemas
-- =============================================================================

-- auth_schema: users
ALTER TABLE IF EXISTS public.users SET SCHEMA auth_schema;

-- attendance_schema: attendances
ALTER TABLE IF EXISTS public.attendances SET SCHEMA attendance_schema;

-- activity_schema: activities
ALTER TABLE IF EXISTS public.activities SET SCHEMA activity_schema;

-- request_schema: leave_requests, external_duties
ALTER TABLE IF EXISTS public.leave_requests SET SCHEMA request_schema;
ALTER TABLE IF EXISTS public.external_duties SET SCHEMA request_schema;

-- config_schema: locations, attendance_settings, calendars
ALTER TABLE IF EXISTS public.locations SET SCHEMA config_schema;
ALTER TABLE IF EXISTS public.attendance_settings SET SCHEMA config_schema;
ALTER TABLE IF EXISTS public.calendars SET SCHEMA config_schema;

-- notification_schema: notifications, user_locations
ALTER TABLE IF EXISTS public.notifications SET SCHEMA notification_schema;
ALTER TABLE IF EXISTS public.user_locations SET SCHEMA notification_schema;

-- =============================================================================
-- STEP 5: Add comments documenting application-level referential integrity
-- =============================================================================
-- After schema separation, cross-schema FK constraints are removed.
-- Referential integrity is now enforced by inter-service HTTP calls:
--   - Attendance Service calls Auth Service to validate user_id
--   - Request Service calls Auth Service to validate user_id and approved_by
--   - Notification Service calls Auth Service to validate notifiable_id
--   - Attendance Service calls Activity Service to validate activity_id
-- =============================================================================

COMMENT ON COLUMN attendance_schema.attendances.user_id IS
  'References auth_schema.users.id — validated via Auth Service HTTP call (no FK constraint)';

COMMENT ON COLUMN attendance_schema.attendances.activity_id IS
  'References activity_schema.activities.id — validated via Activity Service HTTP call (no FK constraint)';

COMMENT ON COLUMN request_schema.leave_requests.user_id IS
  'References auth_schema.users.id — validated via Auth Service HTTP call (no FK constraint)';

COMMENT ON COLUMN request_schema.external_duties.user_id IS
  'References auth_schema.users.id — validated via Auth Service HTTP call (no FK constraint)';

COMMENT ON COLUMN request_schema.external_duties.approved_by IS
  'References auth_schema.users.id (admin) — validated via Auth Service HTTP call (no FK constraint)';

COMMENT ON COLUMN notification_schema.notifications.notifiable_id IS
  'References auth_schema.users.id (polymorphic) — validated via Auth Service HTTP call (no FK constraint)';

COMMENT ON COLUMN notification_schema.user_locations.user_id IS
  'References auth_schema.users.id — validated via Auth Service HTTP call (no FK constraint)';

COMMIT;

-- =============================================================================
-- Migration complete. Verify with scripts/validate-migration.sql
-- =============================================================================
