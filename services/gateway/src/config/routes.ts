export interface RouteConfig {
  prefix: string;
  target: string; // env var name for service URL
  /**
   * What to strip from the incoming path before forwarding.
   * - '/api' strips only the /api prefix, keeping the rest intact.
   *   e.g. /api/leave-requests/1 → /leave-requests/1 (for multi-mount services)
   * - 'full' strips the entire prefix.
   *   e.g. /api/attendances/check-in → /check-in (for services mounted at root)
   */
  strip: '/api' | 'full';
}

export const ROUTE_MAP: RouteConfig[] = [
  // Auth service — auth routes mounted at root /, user routes at /users
  { prefix: '/api/auth',                target: 'SERVICE_AUTH_URL',         strip: 'full' },
  { prefix: '/api/users',               target: 'SERVICE_AUTH_URL',         strip: '/api' },
  { prefix: '/api/profile',             target: 'SERVICE_AUTH_URL',         strip: '/api' },
  // Admin holidays sync → Config service (legacy compat: POST /api/admin/holidays → /admin/holidays)
  { prefix: '/api/admin/external-duties', target: 'SERVICE_REQUEST_URL',     strip: '/api' },
  { prefix: '/api/admin/holidays',      target: 'SERVICE_CONFIG_URL',       strip: '/api' },
  { prefix: '/api/admin',               target: 'SERVICE_AUTH_URL',         strip: '/api' },
  // Attendance service — routes mounted at root /
  { prefix: '/api/attendances',         target: 'SERVICE_ATTENDANCE_URL',   strip: 'full' },
  // Activity service — routes mounted at root /
  { prefix: '/api/activities',          target: 'SERVICE_ACTIVITY_URL',     strip: 'full' },
  // Request service — routes mounted at /leave-requests, /external-duties
  { prefix: '/api/leave-requests',      target: 'SERVICE_REQUEST_URL',      strip: '/api' },
  { prefix: '/api/external-duties',     target: 'SERVICE_REQUEST_URL',      strip: '/api' },
  // Config service — routes mounted at /locations, /attendance-settings, /calendars
  { prefix: '/api/locations',           target: 'SERVICE_CONFIG_URL',       strip: '/api' },
  { prefix: '/api/attendance-settings', target: 'SERVICE_CONFIG_URL',       strip: '/api' },
  { prefix: '/api/calendars',           target: 'SERVICE_CONFIG_URL',       strip: '/api' },
  // Notification service — routes mounted at /notifications, /user-locations
  { prefix: '/api/notifications',       target: 'SERVICE_NOTIFICATION_URL', strip: '/api' },
  { prefix: '/api/user-locations',      target: 'SERVICE_NOTIFICATION_URL', strip: '/api' },
];

export const PUBLIC_ENDPOINTS = [
  'POST /api/auth/login',
  'POST /api/auth/register',
  'POST /api/auth/forgot-password',
  'POST /api/auth/reset-password',
  'GET /api-docs',
];
