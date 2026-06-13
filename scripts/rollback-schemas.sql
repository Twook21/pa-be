-- =============================================================================
-- FinTap v2 — Schema Separation Rollback
-- =============================================================================
-- Reverses the schema separation migration by moving all tables back to the
-- 'public' schema and restoring cross-schema foreign key constraints.
--
-- IMPORTANT: Run this script in a transaction. If any step fails, the entire
-- rollback will be reverted.
--
-- Requirements: 3.1, 3.5, 3.6, 3.7, 17.1, 17.2, 17.3, 17.4, 17.6
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Move tables back to public schema
-- =============================================================================

-- auth_schema → public
ALTER TABLE IF EXISTS auth_schema.users SET SCHEMA public;

-- attendance_schema → public
ALTER TABLE IF EXISTS attendance_schema.attendances SET SCHEMA public;

-- activity_schema → public
ALTER TABLE IF EXISTS activity_schema.activities SET SCHEMA public;

-- request_schema → public
ALTER TABLE IF EXISTS request_schema.leave_requests SET SCHEMA public;
ALTER TABLE IF EXISTS request_schema.external_duties SET SCHEMA public;

-- config_schema → public
ALTER TABLE IF EXISTS config_schema.locations SET SCHEMA public;
ALTER TABLE IF EXISTS config_schema.attendance_settings SET SCHEMA public;
ALTER TABLE IF EXISTS config_schema.calendars SET SCHEMA public;

-- notification_schema → public
ALTER TABLE IF EXISTS notification_schema.notifications SET SCHEMA public;
ALTER TABLE IF EXISTS notification_schema.user_locations SET SCHEMA public;

-- =============================================================================
-- STEP 2: Move enum types back to public schema
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth_schema')) THEN
    ALTER TYPE auth_schema."UserRole" SET SCHEMA public;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth_schema')) THEN
    ALTER TYPE auth_schema."UserStatus" SET SCHEMA public;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'attendance_schema')) THEN
    ALTER TYPE attendance_schema."AttendanceStatus" SET SCHEMA public;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'request_schema')) THEN
    ALTER TYPE request_schema."RequestStatus" SET SCHEMA public;
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Restore cross-schema foreign key constraints
-- =============================================================================
-- Re-establish FK constraints that were removed during schema separation.
-- All tables are back in public schema, so these are now intra-schema FKs.
-- =============================================================================

-- attendances.user_id → users.id
ALTER TABLE public.attendances
  ADD CONSTRAINT attendances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id)
  ON DELETE CASCADE;

-- attendances.activity_id → activities.id
ALTER TABLE public.attendances
  ADD CONSTRAINT attendances_activity_id_fkey
  FOREIGN KEY (activity_id) REFERENCES public.activities(id)
  ON DELETE SET NULL;

-- leave_requests.user_id → users.id
ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id)
  ON DELETE CASCADE;

-- external_duties.user_id → users.id
ALTER TABLE public.external_duties
  ADD CONSTRAINT external_duties_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id)
  ON DELETE CASCADE;

-- external_duties.approved_by → users.id
ALTER TABLE public.external_duties
  ADD CONSTRAINT external_duties_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.users(id)
  ON DELETE SET NULL;

-- user_locations.user_id → users.id
ALTER TABLE public.user_locations
  ADD CONSTRAINT user_locations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id)
  ON DELETE CASCADE;

-- =============================================================================
-- STEP 4: Remove column comments (cleanup)
-- =============================================================================

COMMENT ON COLUMN public.attendances.user_id IS NULL;
COMMENT ON COLUMN public.attendances.activity_id IS NULL;
COMMENT ON COLUMN public.leave_requests.user_id IS NULL;
COMMENT ON COLUMN public.external_duties.user_id IS NULL;
COMMENT ON COLUMN public.external_duties.approved_by IS NULL;
COMMENT ON COLUMN public.notifications.notifiable_id IS NULL;
COMMENT ON COLUMN public.user_locations.user_id IS NULL;

-- =============================================================================
-- STEP 5: Drop empty schemas
-- =============================================================================

DROP SCHEMA IF EXISTS auth_schema;
DROP SCHEMA IF EXISTS attendance_schema;
DROP SCHEMA IF EXISTS activity_schema;
DROP SCHEMA IF EXISTS request_schema;
DROP SCHEMA IF EXISTS config_schema;
DROP SCHEMA IF EXISTS notification_schema;

COMMIT;

-- =============================================================================
-- Rollback complete. All tables are back in public schema with FK constraints.
-- =============================================================================
