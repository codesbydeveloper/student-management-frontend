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
 export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://aliceblue-frog-823531.hostingersite.com').replace(/\/$/, '')
//export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  APP_DATA: 'app_data',
  CUSTOM_USERS: 'custom_users',
  NOTIFICATIONS: 'notifications_v1',

  PWA_MOBILE_INSTALL_DONE: 'pwa_mobile_install_done',
 
  PWA_INSTALL_DISMISSED_DATE: 'pwa_install_dismissed_date',
  /** @deprecated Legacy session dismiss key */
  PWA_INSTALL_SESSION_DISMISSED: 'pwa_install_session_dismissed',
  /** Browser push Allow/Block was already shown on this device. */
  PUSH_PERMISSION_ASKED: 'scs_push_permission_asked',
  /** Local date (YYYY-MM-DD) when user tapped “Not yet” on push banner. */
  PUSH_PERMISSION_DISMISSED_DATE: 'scs_push_permission_dismissed_date',
  /** Webpushr service worker registration was attempted (prevents reload loop). */
  PUSH_SW_SETUP_DONE: 'scs_push_sw_setup_done',
}
