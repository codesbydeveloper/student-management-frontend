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

/**
 * Where a header bell item should navigate (parent opens message detail on School messages).
 * @param {string | undefined} role
 * @param {string | undefined} itemId
 * @returns {{ pathname: string, state?: { openMessageId: string } }}
 */
export function getHeaderNotificationItemLink(role, itemId) {
  const pathname = getHeaderNotificationsViewAllPath(role)
  if (role === ROLES.PARENT && itemId) {
    return { pathname: '/parent-notifications', state: { openMessageId: String(itemId) } }
  }
  return { pathname }
}
