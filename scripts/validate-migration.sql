-- =============================================================================
-- FinTap v2 — Schema Migration Validation
-- =============================================================================
-- Validates the schema separation migration by checking record counts in both
-- the source (public) and target schemas. Run this BEFORE and AFTER the
-- migration to compare results.
--
-- Usage:
--   1. Run BEFORE migration → save output as "pre-migration counts"
--   2. Run scripts/migrate-schemas.sql
--   3. Run AFTER migration → compare counts match pre-migration
--
-- Expected result after successful migration:
--   - All "public.*" counts should be 0 (or table not found)
--   - All "<schema>.*" counts should match the pre-migration public counts
--
-- Requirements: 3.1, 3.5, 3.6, 3.7, 17.1, 17.2, 17.3, 17.4, 17.6
-- =============================================================================

-- =============================================================================
-- Check: auth_schema.users
-- =============================================================================
SELECT 'auth_schema.users' AS table_location,
       COUNT(*) AS record_count
FROM auth_schema.users;

SELECT 'public.users' AS table_location,
       COUNT(*) AS record_count
FROM public.users;

-- =============================================================================
-- Check: attendance_schema.attendances
-- =============================================================================
SELECT 'attendance_schema.attendances' AS table_location,
       COUNT(*) AS record_count
FROM attendance_schema.attendances;

SELECT 'public.attendances' AS table_location,
       COUNT(*) AS record_count
FROM public.attendances;

-- =============================================================================
-- Check: activity_schema.activities
-- =============================================================================
SELECT 'activity_schema.activities' AS table_location,
       COUNT(*) AS record_count
FROM activity_schema.activities;

SELECT 'public.activities' AS table_location,
       COUNT(*) AS record_count
FROM public.activities;

-- =============================================================================
-- Check: request_schema.leave_requests
-- =============================================================================
SELECT 'request_schema.leave_requests' AS table_location,
       COUNT(*) AS record_count
FROM request_schema.leave_requests;

SELECT 'public.leave_requests' AS table_location,
       COUNT(*) AS record_count
FROM public.leave_requests;

-- =============================================================================
-- Check: request_schema.external_duties
-- =============================================================================
SELECT 'request_schema.external_duties' AS table_location,
       COUNT(*) AS record_count
FROM request_schema.external_duties;

SELECT 'public.external_duties' AS table_location,
       COUNT(*) AS record_count
FROM public.external_duties;

-- =============================================================================
-- Check: config_schema.locations
-- =============================================================================
SELECT 'config_schema.locations' AS table_location,
       COUNT(*) AS record_count
FROM config_schema.locations;

SELECT 'public.locations' AS table_location,
       COUNT(*) AS record_count
FROM public.locations;

-- =============================================================================
-- Check: config_schema.attendance_settings
-- =============================================================================
SELECT 'config_schema.attendance_settings' AS table_location,
       COUNT(*) AS record_count
FROM config_schema.attendance_settings;

SELECT 'public.attendance_settings' AS table_location,
       COUNT(*) AS record_count
FROM public.attendance_settings;

-- =============================================================================
-- Check: config_schema.calendars
-- =============================================================================
SELECT 'config_schema.calendars' AS table_location,
       COUNT(*) AS record_count
FROM config_schema.calendars;

SELECT 'public.calendars' AS table_location,
       COUNT(*) AS record_count
FROM public.calendars;

-- =============================================================================
-- Check: notification_schema.notifications
-- =============================================================================
SELECT 'notification_schema.notifications' AS table_location,
       COUNT(*) AS record_count
FROM notification_schema.notifications;

SELECT 'public.notifications' AS table_location,
       COUNT(*) AS record_count
FROM public.notifications;

-- =============================================================================
-- Check: notification_schema.user_locations
-- =============================================================================
SELECT 'notification_schema.user_locations' AS table_location,
       COUNT(*) AS record_count
FROM notification_schema.user_locations;

SELECT 'public.user_locations' AS table_location,
       COUNT(*) AS record_count
FROM public.user_locations;

-- =============================================================================
-- Summary: Verify schemas exist and contain expected tables
-- =============================================================================
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  pg_stat_get_live_tuples(c.oid) AS row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN (
  'auth_schema',
  'attendance_schema',
  'activity_schema',
  'request_schema',
  'config_schema',
  'notification_schema'
)
AND c.relkind = 'r'
ORDER BY n.nspname, c.relname;

-- =============================================================================
-- Verify indexes are preserved after migration
-- =============================================================================
SELECT
  n.nspname AS schema_name,
  t.relname AS table_name,
  i.relname AS index_name,
  pg_get_indexdef(ix.indexrelid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN (
  'auth_schema',
  'attendance_schema',
  'activity_schema',
  'request_schema',
  'config_schema',
  'notification_schema'
)
ORDER BY n.nspname, t.relname, i.relname;

-- =============================================================================
-- Verify no FK constraints remain that cross schema boundaries
-- =============================================================================
SELECT
  tc.constraint_name,
  tc.table_schema AS source_schema,
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS target_schema,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema != ccu.table_schema
  AND tc.table_schema IN (
    'auth_schema',
    'attendance_schema',
    'activity_schema',
    'request_schema',
    'config_schema',
    'notification_schema'
  );

-- Expected: 0 rows (no cross-schema FK constraints should exist)
