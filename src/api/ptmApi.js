import { API_BASE_URL } from '../utils/constants'

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

function formatListError(data, status) {
  if (data == null) return `Could not load PTM requests (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load PTM requests (${status})`
}

/** Coerce ids to numeric when API expects integers (backend uses users.id / students.id). */
function toApiId(value) {
  const s = String(value ?? '').trim()
  if (s === '') return null
  if (/^-?\d+$/.test(s)) return Number(s)
  return s
}

/** Statuses accepted from GET /api/ptm-requests/* — unknown snake_case values pass through for badges. */
function normalizePtmStatus(raw) {
  const s = String(raw ?? 'requested').toLowerCase().trim()
  if (!s) return 'requested'
  if (s === 'pending') return 'requested'
  const core = ['requested', 'approved', 'rejected', 'completed', 'pending_principal', 'principal_rejected']
  if (core.includes(s)) return s
  if (/^[a-z][a-z0-9_]*$/.test(s)) return s
  return 'requested'
}

function pickIso(...candidates) {
  for (const v of candidates) {
    if (v == null || v === '') continue
    if (typeof v === 'number' && Number.isFinite(v)) {
      const ms = v < 1e12 ? v * 1000 : v
      return new Date(ms).toISOString()
    }
    if (typeof v === 'string') {
      const t = Date.parse(v)
      if (Number.isFinite(t)) return new Date(t).toISOString()
    }
    if (v instanceof Date && Number.isFinite(v.getTime())) return v.toISOString()
  }
  return null
}

/**
 * Map one row from GET /api/ptm-requests/mine into the shape `ParentPtmHistoryPage`
 * already renders (matches the Phase 6 local-store fields).
 */
export function mapApiPtmRequestRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id =
    raw.id ?? raw._id ?? raw.requestId ?? raw.ptmRequestId
  if (id == null) return null

  /** Possible nested user / student blocks the backend may include. */
  const teacherBlock =
    (raw.teacher && typeof raw.teacher === 'object' && raw.teacher) ||
    (raw.teacherUser && typeof raw.teacherUser === 'object' && raw.teacherUser) ||
    null
  const parentBlock =
    (raw.parent && typeof raw.parent === 'object' && raw.parent) ||
    (raw.parentUser && typeof raw.parentUser === 'object' && raw.parentUser) ||
    null
  const studentBlock =
    (raw.student && typeof raw.student === 'object' && raw.student) ||
    null

  const teacherUserId =
    raw.teacherUserId ??
    raw.teacherId ??
    teacherBlock?.id ??
    teacherBlock?.userId ??
    null
  const studentId = raw.studentId ?? studentBlock?.id ?? null
  const parentUserId =
    raw.parentUserId ??
    raw.parentId ??
    parentBlock?.id ??
    parentBlock?.userId ??
    null

  const teacherName = String(
    raw.teacherName ?? teacherBlock?.fullName ?? teacherBlock?.name ?? '',
  ).trim()
  const studentName = String(
    raw.studentName ?? studentBlock?.fullName ?? studentBlock?.name ?? '',
  ).trim()
  const parentName = String(
    raw.parentName ?? parentBlock?.fullName ?? parentBlock?.name ?? '',
  ).trim()

  const staffReviewNote = String(
    raw.staffReviewNote ??
      raw.staff_review_note ??
      raw.staffNote ??
      raw.staff_note ??
      raw.staffMessage ??
      '',
  ).trim()
  const principalRejectionNote = String(
    raw.principalRejectionNote ?? raw.principal_rejection_note ?? raw.principalNote ?? '',
  ).trim()

  return {
    id: String(id),
    parentUserId: parentUserId != null ? String(parentUserId) : '',
    parentName: parentName || 'Parent',
    studentId: studentId != null ? String(studentId) : '',
    studentName: studentName || 'Student',
    teacherUserId: teacherUserId != null ? String(teacherUserId) : '',
    teacherName: teacherName || 'Teacher',
    reason: String(raw.reason ?? raw.message ?? '').trim(),
    status: normalizePtmStatus(raw.status),
    meetingAt: pickIso(raw.meetingAt, raw.meeting_time, raw.meetingTime, raw.scheduledAt, raw.scheduled_for),
    rejectionNote:
      raw.rejectionNote != null
        ? String(raw.rejectionNote).trim() || null
        : raw.rejection_reason != null
          ? String(raw.rejection_reason).trim() || null
          : null,
    staffReviewNote: staffReviewNote || null,
    principalRejectionNote: principalRejectionNote || null,
    meetingNote: String(raw.meetingNote ?? raw.meeting_note ?? '').trim() || null,
    createdAt: pickIso(raw.createdAt, raw.created_at, raw.requestedAt) || new Date().toISOString(),
    updatedAt:
      pickIso(raw.updatedAt, raw.updated_at) ||
      pickIso(raw.createdAt, raw.created_at, raw.requestedAt) ||
      new Date().toISOString(),
  }
}

/** Pull list + pagination from common envelope shapes. */
function extractPagedPtmResponse(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, limit: 20 }
  }
  if (Array.isArray(data)) {
    return { list: data, total: data.length, page: 1, limit: data.length || 20 }
  }
  let list = []
  if (Array.isArray(data.requests)) list = data.requests
  else if (Array.isArray(data.data)) list = data.data
  else if (Array.isArray(data.items)) list = data.items
  else if (Array.isArray(data.results)) list = data.results
  else if (Array.isArray(data.ptmRequests)) list = data.ptmRequests
  else if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.requests)
  ) {
    list = data.data.requests
  }
  const meta = data.pagination || data.meta || {}
  const total = Number(
    data.total ?? data.totalCount ?? data.count ?? meta.total ?? meta.totalItems ?? list.length,
  )
  const page = Number(data.page ?? meta.page ?? 1) || 1
  const limit = Number(data.limit ?? meta.limit ?? meta.perPage ?? 20) || 20
  return {
    list,
    total: Number.isFinite(total) ? total : list.length,
    page,
    limit,
  }
}

/**
 * GET /api/ptm-requests/mine?page=&limit= — parent's own PTM requests (Bearer parent JWT).
 *
 * @param {string} token
 * @param {{ page?: number, limit?: number }} [params]
 * @returns {Promise<
 *   | {
 *       ok: true
 *       requests: ReturnType<typeof mapApiPtmRequestRow>[]
 *       total: number
 *       page: number
 *       limit: number
 *       totalPages: number
 *       hasNextPage: boolean
 *       hasPrevPage: boolean
 *     }
 *   | { ok: false, error: string, requests: [], total: 0, page: number, limit: number }
 * >}
 */
export async function fetchMyPtmRequests(token, { page = 1, limit = 20 } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const lim = Math.min(100, Math.max(1, Number(limit) || 20))
  if (!token) {
    return {
      ok: false,
      error: 'Not signed in',
      requests: [],
      total: 0,
      page: p,
      limit: lim,
    }
  }
  try {
    const qs = new URLSearchParams({ page: String(p), limit: String(lim) })
    const res = await fetch(`${API_BASE_URL}/api/ptm-requests/mine?${qs}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        ok: false,
        error: formatListError(data, res.status),
        requests: [],
        total: 0,
        page: p,
        limit: lim,
      }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedPtmResponse(data)
    const requests = rawList.map(mapApiPtmRequestRow).filter(Boolean)
    const totalSafe = Number.isFinite(total) ? total : requests.length
    const limitSafe = resLimit || lim
    const pageSafe = resPage || p
    const totalPages = totalSafe > 0 ? Math.ceil(totalSafe / Math.max(1, limitSafe)) : 0
    return {
      ok: true,
      requests,
      total: totalSafe,
      page: pageSafe,
      limit: limitSafe,
      totalPages,
      hasNextPage: pageSafe * limitSafe < totalSafe,
      hasPrevPage: pageSafe > 1,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, requests: [], total: 0, page: p, limit: lim }
  }
}

/**
 * GET /api/ptm-requests/teacher?page=&limit= — PTM rows for the signed-in teacher (Bearer teacher JWT).
 *
 * @param {string} token
 * @param {{ page?: number, limit?: number }} [params]  Defaults: page 1, limit 10.
 * @returns {Promise<
 *   | {
 *       ok: true
 *       requests: ReturnType<typeof mapApiPtmRequestRow>[]
 *       total: number
 *       page: number
 *       limit: number
 *       totalPages: number
 *       hasNextPage: boolean
 *       hasPrevPage: boolean
 *     }
 *   | {
 *       ok: false
 *       error: string
 *       requests: []
 *       total: number
 *       page: number
 *       limit: number
 *       totalPages: number
 *       hasNextPage: boolean
 *       hasPrevPage: boolean
 *     }
 * >}
 */
export async function fetchTeacherPtmRequests(token, { page = 1, limit = 10 } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const lim = Math.min(100, Math.max(1, Number(limit) || 10))
  const emptyMeta = {
    requests: [],
    total: 0,
    page: p,
    limit: lim,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  }
  if (!token) {
    return { ok: false, error: 'Not signed in', ...emptyMeta }
  }
  try {
    const qs = new URLSearchParams({ page: String(p), limit: String(lim) })
    const url = `${API_BASE_URL}/api/ptm-requests/teacher?${qs}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        ok: false,
        error: formatListError(data, res.status),
        ...emptyMeta,
      }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedPtmResponse(data)
    const requests = rawList.map(mapApiPtmRequestRow).filter(Boolean)
    const totalSafe = Number.isFinite(total) ? total : requests.length
    const limitSafe = resLimit || lim
    const pageSafe = resPage || p
    const totalPages = totalSafe > 0 ? Math.ceil(totalSafe / Math.max(1, limitSafe)) : 0
    return {
      ok: true,
      requests,
      total: totalSafe,
      page: pageSafe,
      limit: limitSafe,
      totalPages,
      hasNextPage: pageSafe * limitSafe < totalSafe,
      hasPrevPage: pageSafe > 1,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, ...emptyMeta }
  }
}

/**
 * GET /api/ptm-requests/staff/pending?page=&limit= — admin / principal pending PTM queue (Bearer).
 *
 * @param {string} token
 * @param {{ page?: number, limit?: number }} [params]
 * @returns {Promise<
 *   | {
 *       ok: true
 *       requests: ReturnType<typeof mapApiPtmRequestRow>[]
 *       total: number
 *       page: number
 *       limit: number
 *       totalPages: number
 *       hasNextPage: boolean
 *       hasPrevPage: boolean
 *     }
 *   | { ok: false, error: string, requests: [], total: 0, page: number, limit: number }
 * >}
 */
export async function fetchStaffPendingPtmRequests(token, { page = 1, limit = 20 } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const lim = Math.min(100, Math.max(1, Number(limit) || 20))
  if (!token) {
    return {
      ok: false,
      error: 'Not signed in',
      requests: [],
      total: 0,
      page: p,
      limit: lim,
    }
  }
  try {
    const qs = new URLSearchParams({ page: String(p), limit: String(lim) })
    const res = await fetch(`${API_BASE_URL}/api/ptm-requests/staff/pending?${qs}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        ok: false,
        error: formatListError(data, res.status),
        requests: [],
        total: 0,
        page: p,
        limit: lim,
      }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedPtmResponse(data)
    const requests = rawList.map(mapApiPtmRequestRow).filter(Boolean)
    const totalSafe = Number.isFinite(total) ? total : requests.length
    const limitSafe = resLimit || lim
    const pageSafe = resPage || p
    const totalPages = totalSafe > 0 ? Math.ceil(totalSafe / Math.max(1, limitSafe)) : 0
    return {
      ok: true,
      requests,
      total: totalSafe,
      page: pageSafe,
      limit: limitSafe,
      totalPages,
      hasNextPage: pageSafe * limitSafe < totalSafe,
      hasPrevPage: pageSafe > 1,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, requests: [], total: 0, page: p, limit: lim }
  }
}

/**
 * GET /api/ptm-requests/admin/all?page=&limit= — full PTM list for admin / principal (Bearer).
 *
 * @param {string} token
 * @param {{ page?: number, limit?: number }} [params]
 * @returns {Promise<
 *   | {
 *       ok: true
 *       requests: ReturnType<typeof mapApiPtmRequestRow>[]
 *       total: number
 *       page: number
 *       limit: number
 *       totalPages: number
 *       hasNextPage: boolean
 *       hasPrevPage: boolean
 *     }
 *   | { ok: false, error: string, requests: [], total: 0, page: number, limit: number }
 * >}
 */
export async function fetchAdminAllPtmRequests(token, { page = 1, limit = 10 } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const lim = Math.min(100, Math.max(1, Number(limit) || 10))
  if (!token) {
    return {
      ok: false,
      error: 'Not signed in',
      requests: [],
      total: 0,
      page: p,
      limit: lim,
    }
  }
  try {
    const qs = new URLSearchParams({ page: String(p), limit: String(lim) })
    const res = await fetch(`${API_BASE_URL}/api/ptm-requests/admin/all?${qs}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        ok: false,
        error: formatListError(data, res.status),
        requests: [],
        total: 0,
        page: p,
        limit: lim,
      }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedPtmResponse(data)
    const requests = rawList.map(mapApiPtmRequestRow).filter(Boolean)
    const totalSafe = Number.isFinite(total) ? total : requests.length
    const limitSafe = resLimit || lim
    const pageSafe = resPage || p
    const totalPages = totalSafe > 0 ? Math.ceil(totalSafe / Math.max(1, limitSafe)) : 0
    return {
      ok: true,
      requests,
      total: totalSafe,
      page: pageSafe,
      limit: limitSafe,
      totalPages,
      hasNextPage: pageSafe * limitSafe < totalSafe,
      hasPrevPage: pageSafe > 1,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, requests: [], total: 0, page: p, limit: lim }
  }
}

/** Pull a single mapped row out of various success-envelope shapes the backend may use. */
function extractSinglePtmRow(data) {
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    const first = data[0]
    return first ? mapApiPtmRequestRow(first) : null
  }
  const candidates = [
    data.request,
    data.ptmRequest,
    data.data,
    data.data?.request,
    data.data?.ptmRequest,
    data,
  ]
  for (const c of candidates) {
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      const mapped = mapApiPtmRequestRow(c)
      if (mapped) return mapped
    }
  }
  return null
}

/**
 * Shared PATCH helper for the three teacher actions: approve / reject / complete.
 * Returns the freshly-mapped row when the server echoes one back so callers can
 * splice it straight into local state without a full refetch.
 *
 * @param {string} token
 * @param {string | number} id  PTM request id from the API row.
 * @param {string} action  'approve' | 'reject' | 'complete'
 * @param {object | null} body  JSON body (or null when none is needed).
 */
async function patchPtmRequest(token, id, action, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const numericId = toApiId(id)
  if (numericId == null) return { ok: false, error: 'Missing PTM request id.' }
  const idSeg = encodeURIComponent(String(numericId))
  try {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    }
    const init = { method: 'PATCH', headers }
    if (body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    const res = await fetch(`${API_BASE_URL}/api/ptm-requests/${idSeg}/${action}`, init)
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status), status: res.status }
    }
    return { ok: true, request: extractSinglePtmRow(data), data: data && typeof data === 'object' ? data : null }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * PATCH /api/ptm-requests/:id/approve — teacher sets meeting time (Bearer teacher JWT).
 *
 * Body matches server: `{ "scheduledAt": "<ISO8601>", "meetingNote": "..." }`.
 * `scheduledAt` is required (UTC ISO string). `meetingNote` is optional and omitted when empty.
 *
 * @param {string} token
 * @param {string | number} id
 * @param {{ scheduledAt: string, meetingNote?: string }} body
 */
export async function approvePtmRequest(token, id, body) {
  const scheduledAt = String(body?.scheduledAt ?? '').trim()
  if (!scheduledAt) return { ok: false, error: 'Pick a meeting date and time.' }
  const payload = { scheduledAt }
  const note = String(body?.meetingNote ?? '').trim()
  if (note) payload.meetingNote = note
  return patchPtmRequest(token, id, 'approve', payload)
}

/**
 * PATCH /api/ptm-requests/:id/reject — teacher declines with an optional note.
 *
 * @param {string} token
 * @param {string | number} id
 * @param {{ rejectionNote?: string }} [body]
 */
export async function rejectPtmRequest(token, id, body) {
  const payload = {}
  const note = String(body?.rejectionNote ?? '').trim()
  if (note) payload.rejectionNote = note
  return patchPtmRequest(token, id, 'reject', Object.keys(payload).length ? payload : null)
}

/**
 * PATCH /api/ptm-requests/:id/complete — teacher marks an approved meeting completed.
 *
 * @param {string} token
 * @param {string | number} id
 */
export async function completePtmRequest(token, id) {
  return patchPtmRequest(token, id, 'complete', null)
}

/**
 * PATCH /api/ptm-requests/staff/:id/approve — admin or principal approves and sets meeting time.
 * Body: `{ scheduledAt: "<ISO8601>", meetingNote?: "..." }` (same shape as teacher approve).
 */
async function patchStaffPtmRequest(token, id, action, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const numericId = toApiId(id)
  if (numericId == null) return { ok: false, error: 'Missing PTM request id.' }
  const idSeg = encodeURIComponent(String(numericId))
  try {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    }
    const init = { method: 'PATCH', headers }
    if (body != null && typeof body === 'object') {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    const res = await fetch(`${API_BASE_URL}/api/ptm-requests/staff/${idSeg}/${action}`, init)
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status), status: res.status }
    }
    return { ok: true, request: extractSinglePtmRow(data), data: data && typeof data === 'object' ? data : null }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * @param {string} token
 * @param {string | number} id
 * @param {{ scheduledAt: string, meetingNote?: string }} opts
 */
export async function staffApprovePtmRequest(token, id, opts) {
  const scheduledAt = String(opts?.scheduledAt ?? '').trim()
  if (!scheduledAt) return { ok: false, error: 'Pick a meeting date and time.' }
  const payload = { scheduledAt }
  const meetingNote = String(opts?.meetingNote ?? '').trim()
  if (meetingNote) payload.meetingNote = meetingNote
  return patchStaffPtmRequest(token, id, 'approve', payload)
}

/**
 * @param {string} token
 * @param {string | number} id
 * @param {{ rejectionNote?: string }} [opts]
 */
export async function staffRejectPtmRequest(token, id, opts = {}) {
  const rejectionNote = String(opts?.rejectionNote ?? '').trim()
  const payload = rejectionNote ? { rejectionNote } : {}
  return patchStaffPtmRequest(token, id, 'reject', payload)
}

/**
 * POST /api/ptm-requests — parent creates a meeting request (Bearer parent JWT).
 *
 * Body matches the backend curl: { studentId, teacherId, reason }
 * `studentId` and `teacherId` are coerced to numbers when they are all digits
 * so the server's strict relational lookup (users.id / students.id) succeeds.
 *
 * @param {string} token
 * @param {{ studentId: string | number, teacherId: string | number, reason: string }} body
 * @returns {Promise<{ ok: true, data: object | null } | { ok: false, error: string, status?: number }>}
 */
export async function createPtmRequest(token, body) {
  if (!token) return { ok: false, error: 'Not signed in' }

  const studentId = toApiId(body.studentId)
  const teacherId = toApiId(body.teacherId)
  const reason = String(body.reason ?? '').trim()
  if (studentId == null || teacherId == null || !reason) {
    return { ok: false, error: 'Choose a child, teacher, and enter a reason.' }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/ptm-requests`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId, teacherId, reason }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status), status: res.status }
    }
    return { ok: true, data: data && typeof data === 'object' ? data : null }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}
