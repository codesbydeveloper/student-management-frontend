export const ROLES = {
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  TEACHER: 'teacher',
  PARENT: 'parent',
  DRIVER: 'driver',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.PRINCIPAL]: 'Principal',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.PARENT]: 'Parent',
  [ROLES.DRIVER]: 'Driver',
}


export const LOGIN_ROLE_OPTIONS = [
  ROLES.ADMIN,
  ROLES.TEACHER,
  ROLES.PARENT,
  ROLES.DRIVER,
  ROLES.PRINCIPAL,
]

/** Live backend; override for local dev with `VITE_API_URL` in `.env` / `.env.local` (no trailing slash). */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  APP_DATA: 'app_data',
  CUSTOM_USERS: 'custom_users',
  NOTIFICATIONS: 'notifications_v1',
  /** User chose “Not now” on the mobile PWA install banner; value is snooze-until timestamp (ms). */
  PWA_MOBILE_INSTALL_SNOOZE_UNTIL: 'pwa_mobile_install_snooze_until',
  /** Setthis device. */
PWA_MOBILE_INSTALL_DONE: 'pwa_mobile_install_done',
}
