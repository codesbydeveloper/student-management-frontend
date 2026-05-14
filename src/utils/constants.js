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
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://sms.raomtech.com').replace(/\/$/, '')

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  APP_DATA: 'app_data',
  CUSTOM_USERS: 'custom_users',
  NOTIFICATIONS: 'notifications_v1',
}
