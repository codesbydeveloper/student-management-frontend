import { ROLES } from '../../utils/constants'

/**
 * @typedef {{ id: string, title: string, message: string, timeAgo: string, unread?: boolean }} HeaderNotificationItem
 */

/**
 * @param {string | undefined} role
 * @returns {string}
 */
export function getHeaderNotificationsViewAllPath(role) {
  if (role === ROLES.PARENT) return '/parent-notifications'
  if (role === ROLES.TEACHER) return '/notifications'
  if (role === ROLES.ADMIN || role === ROLES.PRINCIPAL) return '/notifications/history'
  return '/notifications'
}
