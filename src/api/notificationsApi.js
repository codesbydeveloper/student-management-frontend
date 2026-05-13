import { API_BASE_URL } from '../utils/constants'
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TARGET_TYPES,
} from '../utils/notificationConstants'

function formatListError(data, status) {
  if (data == null) return `Could not load notifications (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load notifications (${status})`
}

function formatMutationError(data, status) {
  if (data == null) return `Request failed (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
    if (Array.isArray(data.errors)) {
      const parts = data.errors
        .map((e) => (typeof e === 'string' ? e : e?.msg || e?.message))
        .filter(Boolean)
      if (parts.length) return parts.join(' ')
    }
  }
  return `Request failed (${status})`
}

/** Coerce ids to numbers when numeric strings, else keep string (matches other list APIs). */
function coerceIds(ids) {
  if (!Array.isArray(ids)) return []
  const out = []
  for (const id of ids) {
    const s = String(id).trim()
    if (s === '') continue
    if (/^-?\d+$/.test(s)) out.push(Number(s))
    else out.push(s)
  }
  return out
}

/**
 * Build JSON body for POST /api/notifications (teacher).
 * @param {{
 *   title: string,
 *   message: string,
 *   category: string,
 *   targetType: string,
 *   targetIds: (string|number)[],
 *   webpushrSegmentIds?: number[],
 *   targetUrl?: string,
 * }} p
 */
export function buildTeacherNotificationBody(p) {
  const body = {
    title: String(p.title || '').trim(),
    message: String(p.message || '').trim(),
    category: p.category,
    targetType: p.targetType,
  }

  if (p.targetType === NOTIFICATION_TARGET_TYPES.CLASS) {
    body.targetClassIds = coerceIds(p.targetIds)
  } else if (p.targetType === NOTIFICATION_TARGET_TYPES.STUDENT) {
    body.targetStudentIds = coerceIds(p.targetIds)
  } else if (p.targetType === NOTIFICATION_TARGET_TYPES.SECTION) {
    body.targetSections = (p.targetIds || []).map((raw) => {
      const s = String(raw)
      const i = s.indexOf('|')
      const classIdRaw = i >= 0 ? s.slice(0, i) : s
      const section = i >= 0 ? s.slice(i + 1) : ''
      const n = Number(classIdRaw)
      return Number.isFinite(n) ? { classId: n, section } : { classId: classIdRaw, section }
    })
  }

  if (p.targetUrl && String(p.targetUrl).trim()) {
    body.targetUrl = String(p.targetUrl).trim()
  }
  if (Array.isArray(p.webpushrSegmentIds) && p.webpushrSegmentIds.length) {
    body.webpushrSegmentIds = p.webpushrSegmentIds.map((n) => Number(n)).filter((x) => !Number.isNaN(x))
  }

  return body
}

/**
 * POST /api/notifications — Bearer JSON (teacher sends school / Webpushr notification).
 * @returns {Promise<{ ok: true, data: object | null } | { ok: false, error: string, useClient?: boolean }>}
 */
export async function postTeacherNotification(token, body) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const useClient = [404, 405, 501].includes(res.status)
      return {
        ok: false,
        error: formatMutationError(data, res.status),
        useClient,
      }
    }
    return { ok: true, data: data && typeof data === 'object' ? data : null }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, useClient: true }
  }
}

/** Map API status strings to values used by StatusBadge and local context. */
function normalizeApiNotificationStatus(rawStatus, category) {
  const s = String(rawStatus || '').trim().toLowerCase()
  const cat = String(category || '').trim().toLowerCase()
  if (s === NOTIFICATION_STATUSES.PENDING_ADMIN || s === 'pending_admin') {
    return NOTIFICATION_STATUSES.PENDING_ADMIN
  }
  if (s === NOTIFICATION_STATUSES.PENDING_PRINCIPAL || s === 'pending_principal') {
    return NOTIFICATION_STATUSES.PENDING_PRINCIPAL
  }
  if (s === 'pending' || s === 'awaiting_approval' || s === 'awaiting') {
    if (cat === NOTIFICATION_CATEGORIES.ACADEMIC) return NOTIFICATION_STATUSES.PENDING_PRINCIPAL
    return NOTIFICATION_STATUSES.PENDING_ADMIN
  }
  if (s === NOTIFICATION_STATUSES.APPROVED || s === 'approved' || s === 'approve') {
    return NOTIFICATION_STATUSES.APPROVED
  }
  if (s === NOTIFICATION_STATUSES.REJECTED || s === 'rejected' || s === 'reject') {
    return NOTIFICATION_STATUSES.REJECTED
  }
  return rawStatus
}

function extractPagedTotal(data, listLength) {
  if (!data || typeof data !== 'object') return listLength
  const t = data.total ?? data.meta?.total ?? data.pagination?.total ?? data.count
  if (typeof t === 'number' && Number.isFinite(t)) return t
  if (typeof t === 'string' && /^-?\d+$/.test(t.trim())) return Number(t.trim())
  return listLength
}

/** Pull array from common API envelopes. */
function extractNotificationList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.notifications)) return data.notifications
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data.items)) return data.items
  if (data.data && typeof data.data === 'object' && Array.isArray(data.data.notifications)) {
    return data.data.notifications
  }
  return []
}

/**
 * Map one pending-admin row from the API into the shape used by ApprovalTable / notificationFormat.
 * @param {object} raw
 */
export function mapPendingAdminNotificationFromApi(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? raw._id ?? raw.notificationId ?? '').trim()
  if (!id) return null
  const title = String(raw.title ?? '').trim()
  const message = String(raw.message ?? raw.body ?? '').trim()
  const category = String(raw.category ?? 'administrative').toLowerCase()
  let targetType = String(raw.targetType ?? 'class').toLowerCase()

  let targetIds = []
  if (Array.isArray(raw.targetIds) && raw.targetIds.length) {
    targetIds = [...raw.targetIds]
  } else if (Array.isArray(raw.targetClassIds) && raw.targetClassIds.length) {
    targetType = NOTIFICATION_TARGET_TYPES.CLASS
    targetIds = [...raw.targetClassIds]
  } else if (Array.isArray(raw.targetStudentIds) && raw.targetStudentIds.length) {
    targetType = NOTIFICATION_TARGET_TYPES.STUDENT
    targetIds = [...raw.targetStudentIds]
  } else if (Array.isArray(raw.targetSections) && raw.targetSections.length) {
    targetType = NOTIFICATION_TARGET_TYPES.SECTION
    targetIds = raw.targetSections.map((s) => {
      if (s && typeof s === 'object') {
        const cid = s.classId ?? s.class_id
        const sec = s.section ?? s.sectionName ?? ''
        return `${cid}|${sec}`
      }
      return String(s)
    })
  }

  let targetSummary = ''
  const audienceText =
    (typeof raw.target === 'string' && raw.target.trim()) ||
    (typeof raw.targets === 'string' && raw.targets.trim()) ||
    ''
  if (!targetIds.length && audienceText) {
    targetSummary = audienceText
    targetType = NOTIFICATION_TARGET_TYPES.AUDIENCE
  }

  const from = String(raw.from ?? '').trim()
  const subEm = String(raw.submitterEmail ?? '').trim()
  let createdByName = String(
    raw.createdByName ??
      raw.authorName ??
      raw.teacherName ??
      raw.createdBy?.fullName ??
      raw.user?.fullName ??
      '',
  ).trim()
  if (!createdByName) {
    if (from && subEm) createdByName = `${from} · ${subEm}`
    else createdByName = from || subEm
  }

  let createdAt = Date.now()
  const ts = raw.createdAt ?? raw.submittedAt ?? raw.created_at ?? raw.updatedAt
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    createdAt = ts < 1e12 ? ts * 1000 : ts
  } else if (typeof ts === 'string' && ts) {
    const parsed = Date.parse(ts)
    if (!Number.isNaN(parsed)) createdAt = parsed
  }

  const row = {
    id,
    title,
    message,
    category,
    targetType,
    targetIds,
    createdByName: createdByName || '—',
    createdAt,
    _fromServer: true,
  }
  if (targetSummary) row.targetSummary = targetSummary
  if (raw.status != null && String(raw.status).trim()) {
    row.status = normalizeApiNotificationStatus(String(raw.status).trim(), category)
  }
  return row
}

async function fetchPendingNotificationList(token, path) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const useClient = [404, 405, 501].includes(res.status)
      return {
        ok: false,
        error: formatListError(data, res.status),
        useClient,
      }
    }
    const list = extractNotificationList(data)
    const notifications = list.map(mapPendingAdminNotificationFromApi).filter(Boolean)
    return { ok: true, notifications }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, useClient: true }
  }
}

/**
 * GET /api/notifications/pending/admin — Bearer; administrative queue.
 */
export async function fetchPendingAdminNotifications(token) {
  return fetchPendingNotificationList(token, '/api/notifications/pending/admin')
}

/**
 * GET /api/notifications/pending/principal — Bearer; academic queue (principal token).
 */
export async function fetchPendingPrincipalNotifications(token) {
  return fetchPendingNotificationList(token, '/api/notifications/pending/principal')
}

async function parsePatchMutationResponse(res) {
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      error: formatMutationError(data, res.status),
      useClient: [404, 405, 501].includes(res.status),
    }
  }
  if (data && typeof data === 'object') {
    return { ok: true, data }
  }
  return { ok: true, data: null }
}

/**
 * PATCH /api/notifications/:id/approve — Bearer (admin for administrative items; principal for academic).
 */
export async function patchNotificationApprove(token, notificationId) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  const id = encodeURIComponent(String(notificationId))
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/approve`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    return await parsePatchMutationResponse(res)
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, useClient: true }
  }
}

/**
 * PATCH /api/notifications/:id/reject — Bearer + JSON body (optional `reason`).
 */
export async function patchNotificationReject(token, notificationId, opts = {}) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  const id = encodeURIComponent(String(notificationId))
  const reason = typeof opts.reason === 'string' ? opts.reason.trim() : ''
  const body = reason ? { reason } : {}
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    return await parsePatchMutationResponse(res)
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, useClient: true }
  }
}

const TEACHER_NOTIFICATIONS_MINE_DEFAULT_LIMIT = 20

/**
 * GET /api/notifications/mine?page=&limit= — teacher’s submitted notifications (Bearer).
 * @returns {Promise<
 *   | { ok: true, notifications: object[], total: number, page: number, limit: number }
 *   | { ok: false, error: string, useClient?: boolean, notifications: [], total: 0 }
 * >}
 */
export async function fetchTeacherNotificationsMine(token, { page = 1, limit = TEACHER_NOTIFICATIONS_MINE_DEFAULT_LIMIT } = {}) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true, notifications: [], total: 0 }
  }
  const p = Math.max(1, Number(page) || 1)
  const lim = Math.min(100, Math.max(1, Number(limit) || TEACHER_NOTIFICATIONS_MINE_DEFAULT_LIMIT))
  const params = new URLSearchParams({ page: String(p), limit: String(lim) })
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/mine?${params}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const useClient = [404, 405, 501].includes(res.status)
      return {
        ok: false,
        error: formatListError(data, res.status),
        useClient,
        notifications: [],
        total: 0,
      }
    }
    const list = extractNotificationList(data)
    const notifications = list.map(mapPendingAdminNotificationFromApi).filter(Boolean)
    const total = extractPagedTotal(data, notifications.length)
    return { ok: true, notifications, total, page: p, limit: lim }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, useClient: true, notifications: [], total: 0 }
  }
}

function extractNotificationPreferenceEnabled(data) {
  if (!data || typeof data !== 'object') return null
  const root = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data
  const v = root.enabled ?? root.notificationEnabled ?? root.webpushEnabled ?? root.webPushEnabled
  if (typeof v === 'boolean') return v
  if (v === 1 || v === '1') return true
  if (v === 0 || v === '0') return false
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'true' || s === 'yes') return true
    if (s === 'false' || s === 'no') return false
  }
  return null
}

/**
 * GET /api/notifications/preference — current Webpushr / push opt-in (Bearer). Optional; falls back if 404.
 * @returns {Promise<{ ok: true, enabled: boolean } | { ok: false, error: string, enabled: null }>}
 */
export async function fetchNotificationPreference(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', enabled: null }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/preference`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    if (res.status === 404 || res.status === 405) {
      return { ok: true, enabled: true }
    }
    if (!res.ok) {
      return {
        ok: false,
        error: formatListError(data, res.status),
        enabled: null,
      }
    }
    const parsed = extractNotificationPreferenceEnabled(data)
    return { ok: true, enabled: parsed ?? true }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, enabled: null }
  }
}

/**
 * PATCH /api/notifications/preference — set Webpushr / push opt-in (Bearer), body `{ enabled: boolean }`.
 * @returns {Promise<{ ok: true, data: object | null } | { ok: false, error: string, useClient?: boolean }>}
 */
export async function patchNotificationPreference(token, enabled) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/preference`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enabled: Boolean(enabled) }),
    })
    return await parsePatchMutationResponse(res)
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, useClient: true }
  }
}
