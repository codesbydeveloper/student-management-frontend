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
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://aliceblue-frog-823531.hostingersite.com').replace(/\/$/, '')

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
  /** Browser push Allow/Block was already shown on this device. */
  PUSH_PERMISSION_ASKED: 'scs_push_permission_asked',
  /** Webpushr service worker registration was attempted (prevents reload loop). */
  PUSH_SW_SETUP_DONE: 'scs_push_sw_setup_done',
}
