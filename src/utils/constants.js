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
// export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://studioagashe.com').replace(/\/$/, '')
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://studioagashe.com').replace(/\/$/, '')

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  APP_DATA: 'app_data',
  CUSTOM_USERS: 'custom_users',
  NOTIFICATIONS: 'notifications_v1',
  /** User completed install on this device. */
  PWA_MOBILE_INSTALL_DONE: 'pwa_mobile_install_done',
  /** Local date (YYYY-MM-DD) when user last tapped “Not yet” on install prompt. */
  PWA_INSTALL_DISMISSED_DATE: 'pwa_install_dismissed_date',
  /** @deprecated Legacy session dismiss key */
  PWA_INSTALL_SESSION_DISMISSED: 'pwa_install_session_dismissed',
}
