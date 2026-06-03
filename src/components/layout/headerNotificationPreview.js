import { ROLES } from '../../utils/constants'
import {
  getParentTransportTrackingLink,
  getTransportBellStudentId,
  isParentTransportSafetyNotification,
} from '../../utils/parentTransportSafety'

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   message: string,
 *   timeAgo?: string,
 *   unread?: boolean,
 *   kind?: string,
 *   type?: string,
 *   category?: string,
 *   entityType?: string,
 *   entityId?: string,
 *   ptmRequestId?: string,
 *   leadId?: string,
 *   link?: string,
 * }} HeaderNotificationItem
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

function routingBlob(item) {
  return [
    item?.kind,
    item?.type,
    item?.notificationType,
    item?.category,
    item?.entityType,
    item?.resourceType,
    item?.title,
  ]
    .map((v) => String(v || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ')
}

function resolveBellKind(item) {
  if (isParentTransportSafetyNotification(item)) return 'transport'
  const text = routingBlob(item)
  if (/\bptm\b|parent.?teacher\s+meeting/.test(text)) return 'ptm'
  if (/\blead\b|\bcrm\b/.test(text)) return 'lead'
  if (/\bvisitor\b/.test(text)) return 'visitor'
  if (/\bapprov/.test(text)) return 'approval'
  return 'notice'
}

function pickExplicitPath(item) {
  const candidates = [
    item?.link,
    item?.path,
    item?.route,
    item?.url,
    item?.targetUrl,
    item?.href,
    item?.deepLink,
    item?.deep_link,
  ]
  for (const v of candidates) {
    if (typeof v !== 'string' || !v.trim()) continue
    const s = v.trim()
    if (s.startsWith('/')) return s
    if (s.startsWith('http')) {
      try {
        return new URL(s).pathname
      } catch {
        continue
      }
    }
  }
  return null
}

function ptmRequestIdFromItem(item) {
  const meta = item?.meta && typeof item.meta === 'object' ? item.meta : null
  return (
    item?.ptmRequestId ??
    item?.requestId ??
    meta?.ptmRequestId ??
    meta?.requestId ??
    (String(item?.entityType || '')
      .toLowerCase()
      .includes('ptm')
      ? item?.entityId
      : null) ??
    null
  )
}

/**
 * Where a header bell item should navigate based on API type/link fields.
 * @param {string | undefined} role
 * @param {HeaderNotificationItem | null | undefined} item
 * @returns {string | { pathname: string, state?: Record<string, string> }}
 */
export function getHeaderNotificationItemLink(role, item) {
  if (!item) return { pathname: getHeaderNotificationsViewAllPath(role) }

  const explicit = pickExplicitPath(item)
  const kind = resolveBellKind(item)
  const ptmId = ptmRequestIdFromItem(item)
  const state = ptmId ? { openPtmRequestId: String(ptmId) } : undefined

  if (explicit) {
    return state ? { pathname: explicit.split('?')[0], state } : explicit
  }

  if (kind === 'transport' && role === ROLES.PARENT) {
    return getParentTransportTrackingLink(getTransportBellStudentId(item))
  }

  if (kind === 'ptm') {
    if (role === ROLES.PARENT) return { pathname: '/parent/ptm/history', state }
    if (role === ROLES.TEACHER) return { pathname: '/ptm-requests', state }
    if (role === ROLES.ADMIN || role === ROLES.PRINCIPAL) {
      return { pathname: '/ptm-requests/staff', state }
    }
  }

  if (kind === 'lead') {
    const leadId = item.leadId ?? item.entityId
    if (leadId && role !== ROLES.PARENT) return `/leads/${leadId}`
  }

  if (kind === 'visitor') {
    if (role === ROLES.ADMIN || role === ROLES.PRINCIPAL || role === ROLES.TEACHER) {
      return '/visitor-logs'
    }
  }

  if (kind === 'approval') {
    if (role === ROLES.ADMIN || role === ROLES.PRINCIPAL) return '/notifications/history'
  }

  const pathname = getHeaderNotificationsViewAllPath(role)
  if (role === ROLES.PARENT && item.id) {
    return { pathname: '/parent-notifications', state: { openMessageId: String(item.id) } }
  }
  return { pathname }
}
