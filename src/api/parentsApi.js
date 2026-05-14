import { API_BASE_URL } from '../utils/constants'
import { NOTIFICATION_CATEGORIES } from '../utils/notificationConstants'
import { extractPagedStudentsResponse, mapApiStudentToRow } from './studentsApi'

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

function formatMyStudentsListError(data, status) {
  if (data == null) return `Could not load your students (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load your students (${status})`
}

function formatMyDriverError(data, status) {
  if (data == null) return `Could not load your driver (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load your driver (${status})`
}

function formatParentMessagesError(data, status) {
  if (data == null) return `Could not load school messages (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load school messages (${status})`
}

function formatListError(data, status) {
  if (data == null) return `Could not load parents (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load parents (${status})`
}

/** Pull list + total from common paginated API shapes. */
export function extractPagedParentsResponse(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, limit: 10 }
  }
  if (Array.isArray(data)) {
    return { list: data, total: data.length, page: 1, limit: data.length || 10 }
  }
  let list = []
  if (Array.isArray(data.data)) list = data.data
  else if (Array.isArray(data.parents)) list = data.parents
  else if (Array.isArray(data.results)) list = data.results
  else if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.parents)
  ) {
    list = data.data.parents
  }
  const meta = data.meta || data.pagination || {}
  const total = Number(
    data.total ?? data.totalCount ?? data.count ?? meta.total ?? meta.totalItems ?? list.length,
  )
  const page = Number(data.page ?? meta.page ?? 1) || 1
  const limit = Number(data.limit ?? meta.limit ?? meta.perPage ?? 10) || 10
  return {
    list,
    total: Number.isFinite(total) ? total : list.length,
    page,
    limit,
  }
}

/** Pick the object that actually holds parent fields (avoids empty `data` shadowing `parent`). */
function pickParentPayload(raw) {
  if (!raw || typeof raw !== 'object') return null
  const looksLikeEntity = (obj) =>
    obj &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    (obj.id != null ||
      obj._id != null ||
      obj.userId != null ||
      (typeof obj.fullName === 'string' && obj.fullName.trim() !== '') ||
      (typeof obj.email === 'string' && obj.email.trim() !== ''))

  const candidates = []
  if (Array.isArray(raw.data) && raw.data.length === 1 && typeof raw.data[0] === 'object') {
    candidates.push(raw.data[0])
  }
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) candidates.push(raw.data)
  if (raw.parent && typeof raw.parent === 'object' && !Array.isArray(raw.parent)) candidates.push(raw.parent)
  if (raw.Parent && typeof raw.Parent === 'object' && !Array.isArray(raw.Parent)) candidates.push(raw.Parent)
  if (raw.guardian && typeof raw.guardian === 'object' && !Array.isArray(raw.guardian)) candidates.push(raw.guardian)
  if (raw.user && typeof raw.user === 'object' && !Array.isArray(raw.user)) candidates.push(raw.user)
  candidates.push(raw)
  for (const c of candidates) {
    if (looksLikeEntity(c)) return c
  }
  let o = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : raw
  if (o.parent && typeof o.parent === 'object' && !Array.isArray(o.parent)) o = o.parent
  else if (o.Parent && typeof o.Parent === 'object' && !Array.isArray(o.Parent)) o = o.Parent
  else if (o.guardian && typeof o.guardian === 'object' && !Array.isArray(o.guardian)) o = o.guardian
  else if (o.user && typeof o.user === 'object' && !Array.isArray(o.user)) o = o.user
  return o
}

/** Coerce student ids for PATCH/POST bodies (numeric when all digits). */
function studentIdsForApi(ids) {
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

/** Map API parent payload to the shape used by ParentsModule / AppData. */
export function mapApiParentToRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = pickParentPayload(raw)
  if (!o || typeof o !== 'object') return null
  const id = o.id ?? o._id ?? o.userId
  if (id == null) return null
  let studentIds = []
  if (Array.isArray(o.studentIds)) {
    studentIds = o.studentIds.map(String)
  } else if (Array.isArray(o.linkedStudentIds)) {
    studentIds = o.linkedStudentIds.map(String)
  } else if (Array.isArray(o.students)) {
    studentIds = o.students
      .map((s) => (s && typeof s === 'object' ? s.id ?? s.studentId : s))
      .filter((x) => x != null)
      .map(String)
  }
  const active =
    typeof o.active === 'boolean'
      ? o.active
      : typeof o.isActive === 'boolean'
        ? o.isActive
        : true
  return {
    id: String(id),
    fullName: String(o.fullName ?? o.name ?? '').trim(),
    email: String(o.email ?? '').trim().toLowerCase(),
    phone: String(o.phone ?? '').trim(),
    password: o.password != null ? String(o.password) : '',
    studentIds,
    active,
  }
}

/** Normalize GET /api/parents/picker response to a raw parent row array. */
function extractPickerParentsList(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.parents)) return data.parents
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.picker)) return data.picker
  if (Array.isArray(data.results)) return data.results
  const { list } = extractPagedParentsResponse(data)
  return list.length ? list : []
}

/** Option shape for SearchableSingleSelect (student form parent picker). */
export function mapPickerParentToOption(raw) {
  const row = mapApiParentToRow(raw)
  if (!row) return null
  return {
    value: row.id,
    label: row.fullName,
    subtext: row.email || undefined,
  }
}

/**
 * GET /api/parents/picker — Bearer + Accept; lightweight list for guardian pickers.
 * @returns {Promise<{ ok: true, options: { value: string, label: string, subtext?: string }[] } | { ok: false, error: string, options: [] }>}
 */
export async function fetchParentsPicker(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', options: [] }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents/picker`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), options: [] }
    }
    const rawList = extractPickerParentsList(data)
    const options = rawList.map(mapPickerParentToOption).filter(Boolean)
    return { ok: true, options }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, options: [] }
  }
}

/**
 * GET /api/parents?page=&limit= — Bearer + Accept application/json.
 * @param {{ page?: number, limit?: number }} [params]
 */
export async function fetchParentsList(token, params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 10))
  if (!token) {
    return { ok: false, error: 'Not signed in', parents: [], total: 0, page: 1, limit }
  }
  try {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await fetch(`${API_BASE_URL}/api/parents?${qs}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), parents: [], total: 0, page, limit }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedParentsResponse(data)
    const parents = rawList.map((row) => mapApiParentToRow(row)).filter(Boolean)
    return {
      ok: true,
      parents,
      total,
      page: resPage || page,
      limit: resLimit || limit,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, parents: [], total: 0, page, limit }
  }
}

/**
 * POST /api/parents — Bearer + JSON (fullName, email, phone, password, studentIds).
 * @param {string} token
 * @param {{ fullName: string, email: string, phone: string, password: string, studentIds?: (string|number)[] }} body
 */
export async function createParent(token, body) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: body.fullName,
        email: body.email,
        phone: String(body.phone ?? '').trim(),
        password: body.password,
        studentIds: studentIdsForApi(body.studentIds ?? []),
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status) }
    }
    return { ok: true, data }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * PATCH /api/parents/:id — fullName, email, phone, isActive, studentIds; optional password.
 */
export async function updateParent(token, parentId, body) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const id = encodeURIComponent(String(parentId))
  const payload = {
    fullName: body.fullName,
    email: body.email,
    phone: String(body.phone ?? '').trim(),
    isActive: Boolean(body.active),
    studentIds: studentIdsForApi(body.studentIds),
  }
  const pwd = body.password != null ? String(body.password).trim() : ''
  if (pwd) payload.password = pwd
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents/${id}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status) }
    }
    return { ok: true, data }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * DELETE /api/parents/:id — Bearer + Accept application/json.
 */
export async function deleteParent(token, parentId) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const id = encodeURIComponent(String(parentId))
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status) }
    }
    return { ok: true, data }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * POST /api/parents/import/csv — multipart upload (`file` field), Bearer auth (same pattern as students/classes).
 * @param {string} token
 * @param {File} file
 * @returns {Promise<{ ok: true, data: object | null } | { ok: false, error: string, useClient?: boolean }>}
 */
export async function importParentsCsv(token, file) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  const form = new FormData()
  form.append('file', file, file.name)
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents/import/csv`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
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

/**
 * GET /api/parents/export/csv — Bearer. rows=page | everyone; page/limit for paged rows;
 * status=all|active|inactive for page exports; for everyone omit status when no filter, else active|inactive.
 * Falls back to GET /api/parents/export?… if the /export/csv path returns 404.
 * @param {string} token
 * @param {{ rows: string, page?: number, limit?: number, status?: 'all' | 'active' | 'inactive' }} opts
 * @returns {Promise<{ ok: true, blob: Blob, filename: string } | { ok: false, error: string, useClient?: boolean }>}
 */
export async function exportParentsCsv(token, { rows, page, limit, status } = {}) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  const params = new URLSearchParams()
  if (rows) params.set('rows', rows)
  if (rows === 'everyone') {
    if (status === 'active' || status === 'inactive') params.set('status', status)
  } else if (rows) {
    if (page != null && limit != null) {
      params.set('page', String(page))
      params.set('limit', String(limit))
    }
    const st = status === 'active' || status === 'inactive' || status === 'all' ? status : 'all'
    params.set('status', st)
  }
  const qs = params.toString()
  const suffix = qs ? `?${qs}` : ''
  const primary = `${API_BASE_URL}/api/parents/export/csv${suffix}`
  const alternate = `${API_BASE_URL}/api/parents/export${suffix}`
  try {
    let res = await fetch(primary, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/csv,*/*',
      },
    })
    if (res.status === 404) {
      res = await fetch(alternate, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/csv,*/*',
        },
      })
    }
    const ctype = (res.headers.get('Content-Type') || '').toLowerCase()
    if (!res.ok) {
      const useClient = [404, 405, 501].includes(res.status)
      const data = await res.json().catch(() => null)
      return {
        ok: false,
        error: formatMutationError(data, res.status),
        useClient,
      }
    }
    if (ctype.includes('application/json')) {
      const data = await res.json().catch(() => null)
      return {
        ok: false,
        error: formatMutationError(data, res.status) || 'Unexpected response',
        useClient: true,
      }
    }
    const blob = await res.blob()
    let filename = 'parents.csv'
    const cd = res.headers.get('Content-Disposition')
    if (cd) {
      const star = cd.match(/filename\*=UTF-8''([^;\s]+)/i)
      const quoted = cd.match(/filename="([^"]+)"/i) || cd.match(/filename=([^;\s]+)/i)
      if (star) {
        try {
          filename = decodeURIComponent(star[1])
        } catch {
          filename = star[1]
        }
      } else if (quoted) {
        filename = quoted[1].replace(/["']/g, '')
      }
    }
    return { ok: true, blob, filename }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, useClient: true }
  }
}

/**
 * Fetches every parent page from GET /api/parents (limit capped at 100 per request).
 * @returns {Promise<{ ok: true, parents: object[] } | { ok: false, error: string, parents: [] }>}
 */
export async function fetchAllParentsList(token) {
  const first = await fetchParentsList(token, { page: 1, limit: 100 })
  if (!first.ok) {
    return { ok: false, error: first.error, parents: [] }
  }
  const limit = first.limit || 100
  const totalPages = Math.max(1, Math.ceil(first.total / limit))
  const merged = [...first.parents]
  for (let p = 2; p <= totalPages; p++) {
    const res = await fetchParentsList(token, { page: p, limit })
    if (!res.ok) {
      return { ok: false, error: res.error, parents: merged }
    }
    merged.push(...res.parents)
  }
  const seen = new Set()
  const parents = merged.filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
  return { ok: true, parents }
}

function extractPagedParentMessages(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, limit: 20 }
  }
  if (Array.isArray(data)) {
    return { list: data, total: data.length, page: 1, limit: data.length || 20 }
  }
  let list = []
  if (Array.isArray(data.messages)) list = data.messages
  else if (Array.isArray(data.notifications)) list = data.notifications
  else if (Array.isArray(data.items)) list = data.items
  else if (Array.isArray(data.results)) list = data.results
  else if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.messages)
  ) {
    list = data.data.messages
  } else if (Array.isArray(data.data)) {
    list = data.data
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

function childNamesAndIdsFromMessageRaw(raw) {
  const ids = []
  const names = []
  const pushId = (v) => {
    if (v == null || v === '') return
    ids.push(String(v))
  }
  const pushName = (v) => {
    const s = String(v ?? '').trim()
    if (s) names.push(s)
  }
  if (Array.isArray(raw.studentIds)) raw.studentIds.forEach(pushId)
  if (Array.isArray(raw.targetStudentIds)) raw.targetStudentIds.forEach(pushId)
  if (Array.isArray(raw.childStudentIds)) raw.childStudentIds.forEach(pushId)
  if (Array.isArray(raw.students)) {
    for (const s of raw.students) {
      if (s && typeof s === 'object') {
        pushId(s.id ?? s.studentId)
        pushName(s.fullName ?? s.name)
      }
    }
  }
  if (Array.isArray(raw.childNames)) raw.childNames.forEach((n) => pushName(n))
  if (typeof raw.studentName === 'string') pushName(raw.studentName)
  if (!names.length && typeof raw.target === 'string' && raw.target.trim()) pushName(raw.target)
  return { ids: [...new Set(ids)], names: [...new Set(names)] }
}

function normalizeParentMessageCategory(raw) {
  const s = String(raw ?? 'administrative').toLowerCase()
  if (s === NOTIFICATION_CATEGORIES.ACADEMIC || s.includes('academic')) {
    return NOTIFICATION_CATEGORIES.ACADEMIC
  }
  return NOTIFICATION_CATEGORIES.ADMINISTRATIVE
}

/**
 * Map one GET /api/parents/messages row into the shape expected by {@link NotificationCard}.
 * @param {object} raw
 */
export function mapApiParentMessageToFeedItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const title = String(raw.title ?? raw.subject ?? 'School message').trim()
  const stamp = raw.submittedAt ?? raw.createdAt ?? raw.sentAt ?? raw.approvedAt ?? ''
  const id =
    String(raw.id ?? raw.notificationId ?? raw.messageId ?? '').trim() ||
    `m-${String(stamp)}-${title.slice(0, 48)}`
  const message = String(raw.message ?? raw.body ?? raw.content ?? '').trim()
  const category = normalizeParentMessageCategory(raw.category)
  const { ids, names } = childNamesAndIdsFromMessageRaw(raw)
  const displayNames = names.length ? names : ['Your children']
  return {
    id,
    title,
    message,
    category,
    status: 'approved',
    _feedMatchingStudentIds: ids,
    _feedChildNames: displayNames,
    _feedChildNamesLabel: displayNames.join(', '),
  }
}

/**
 * GET /api/parents/messages?page=&limit= — school messages for the signed-in parent (Bearer).
 * @returns {Promise<
 *   | {
 *       ok: true
 *       messages: object[]
 *       total: number
 *       page: number
 *       limit: number
 *       totalPages: number
 *       hasNextPage: boolean
 *       hasPrevPage: boolean
 *     }
 *   | { ok: false, error: string, messages: [], total: 0, page: 1, limit: 20 }
 * >}
 */
export async function fetchParentMessages(token, { page = 1, limit = 20 } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const lim = Math.min(100, Math.max(1, Number(limit) || 20))
  if (!token) {
    return {
      ok: false,
      error: 'Not signed in',
      messages: [],
      total: 0,
      page: 1,
      limit: lim,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
  try {
    const qs = new URLSearchParams({ page: String(p), limit: String(lim) })
    const res = await fetch(`${API_BASE_URL}/api/parents/messages?${qs}`, {
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
        error: formatParentMessagesError(data, res.status),
        messages: [],
        total: 0,
        page: p,
        limit: lim,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedParentMessages(data)
    const messages = rawList.map((row) => mapApiParentMessageToFeedItem(row)).filter(Boolean)
    const meta = (data && typeof data === 'object' && data.pagination) || {}
    const totalSafe = Number.isFinite(total) ? total : messages.length
    const limitSafe = resLimit || lim
    const pageSafe = resPage || p
    const computedTotalPages =
      totalSafe > 0 ? Math.ceil(totalSafe / Math.max(1, limitSafe)) : 0
    const totalPages =
      Number(meta.totalPages) ||
      computedTotalPages ||
      (messages.length ? 1 : 0)
    const hasNextPage =
      typeof meta.hasNextPage === 'boolean'
        ? meta.hasNextPage
        : pageSafe * limitSafe < totalSafe
    const hasPrevPage =
      typeof meta.hasPrevPage === 'boolean' ? meta.hasPrevPage : pageSafe > 1
    return {
      ok: true,
      messages,
      total: totalSafe,
      page: pageSafe,
      limit: limitSafe,
      totalPages,
      hasNextPage,
      hasPrevPage,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return {
      ok: false,
      error: msg,
      messages: [],
      total: 0,
      page: p,
      limit: lim,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

function extractParentMessageDetailPayload(data) {
  if (!data || typeof data !== 'object') return null
  if (data.message && typeof data.message === 'object' && !Array.isArray(data.message)) {
    return data.message
  }
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data
  }
  return data
}

/**
 * GET /api/parents/messages/:id — one school message for the signed-in parent (Bearer).
 * @returns {Promise<{ ok: true, message: object } | { ok: false, error: string, message: null }>}
 */
export async function fetchParentMessageById(token, messageId) {
  if (!token) {
    return { ok: false, error: 'Not signed in', message: null }
  }
  const id = encodeURIComponent(String(messageId ?? '').trim())
  if (!id) {
    return { ok: false, error: 'Invalid message id', message: null }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents/messages/${id}`, {
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
        error: formatParentMessagesError(data, res.status),
        message: null,
      }
    }
    const raw = extractParentMessageDetailPayload(data)
    const message = mapApiParentMessageToFeedItem(raw)
    if (!message) {
      return { ok: false, error: 'Invalid message response', message: null }
    }
    return { ok: true, message }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, message: null }
  }
}

/** Raw rows from GET /api/parents/my-students (array or common envelope keys). */
function extractParentMyStudentsList(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.students)) return data.students
  if (Array.isArray(data.myStudents)) return data.myStudents
  if (Array.isArray(data.children)) return data.children
  if (Array.isArray(data.items)) return data.items
  const { list } = extractPagedStudentsResponse(data)
  return list.length ? list : []
}

/** `{ parent, students }` — guardian on envelope, not on each student row. */
function pickEnvelopeParent(data) {
  if (!data || typeof data !== 'object') return null
  const p = data.parent ?? data.Parent ?? data.guardian
  if (p && typeof p === 'object' && !Array.isArray(p)) return p
  return null
}

/**
 * GET /api/parents/my-students — linked students for the signed-in parent (Bearer).
 * @returns {Promise<{ ok: true, students: object[] } | { ok: false, error: string, students: [] }>}
 */
export async function fetchParentMyStudents(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', students: [] }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents/my-students`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMyStudentsListError(data, res.status), students: [] }
    }
    const rawList = extractParentMyStudentsList(data)
    const guardian = pickEnvelopeParent(data)
    const guardianName = guardian
      ? String(guardian.fullName ?? guardian.name ?? '').trim()
      : ''
    const guardianId =
      guardian != null && (guardian.id != null || guardian.userId != null)
        ? String(guardian.id ?? guardian.userId)
        : ''

    const students = rawList
      .map((row) => {
        const s = mapApiStudentToRow(row)
        if (!s) return null
        if (!guardianName && !guardianId) return s
        const next = { ...s }
        if (guardianName) next.parentDisplayName = guardianName
        if (guardianId) next.parentId = guardianId
        return next
      })
      .filter(Boolean)
    return { ok: true, students }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, students: [] }
  }
}

/** Normalize one block from GET /api/parents/my-driver into a display row. */
function mapParentMyDriverRow(block) {
  if (!block || typeof block !== 'object') return null
  const d =
    block.driver && typeof block.driver === 'object'
      ? block.driver
      : block.driverUser && typeof block.driverUser === 'object'
        ? block.driverUser
        : block.user && typeof block.user === 'object'
          ? block.user
          : null

  const driverName = String(
    block.driverName ?? d?.fullName ?? d?.name ?? d?.driverName ?? '',
  ).trim()
  const driverUserId = String(
    d?.id ?? d?.userId ?? block.driverId ?? block.driverUserId ?? block.driver_id ?? '',
  ).trim()
  const bus = block.bus && typeof block.bus === 'object' ? block.bus : null
  const assignedBus = String(
    block.plate ??
      block.busPlate ??
      block.bus_label ??
      block.busLabel ??
      block.assignedBus ??
      block.vehicleId ??
      block.vehicle_id ??
      block.busId ??
      block.bus_id ??
      bus?.plate ??
      bus?.number ??
      (d && (d.plate ?? d.assignedBus ?? d.assigned_bus ?? d.vehicleId ?? d.vehicle_id)) ??
      '',
  ).trim()
  const phone = String(d?.phone ?? block.phone ?? '').trim()
  const licenseNumber = String(
    d?.licenseNumber ?? d?.license ?? d?.licenseNo ?? block.licenseNumber ?? '',
  ).trim()

  const st = block.student && typeof block.student === 'object' ? block.student : null
  const studentName = String(
    block.studentName ?? st?.fullName ?? st?.name ?? block.childName ?? '',
  ).trim()
  const studentId =
    block.studentId != null
      ? String(block.studentId)
      : st?.id != null
        ? String(st.id)
        : ''

  if (!driverName && !driverUserId && !assignedBus) return null

  return {
    driverName: driverName || '—',
    driverUserId,
    assignedBus: assignedBus || '—',
    phone,
    licenseNumber,
    studentName,
    studentId,
  }
}

function extractParentMyDriverBlocks(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.assignments)) return data.assignments
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.rows)) return data.rows
  if (Array.isArray(data.drivers)) return data.drivers
  if (Array.isArray(data.data) && data.data.every((x) => x && typeof x === 'object')) {
    return data.data
  }
  if (data.driver && typeof data.driver === 'object') {
    return [{ ...data, driver: data.driver }]
  }
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return extractParentMyDriverBlocks(data.data)
  }
  return [data]
}

/**
 * GET /api/parents/my-driver — driver / vehicle linked to this parent’s children (Bearer).
 * @returns {Promise<{ ok: true, rows: object[] } | { ok: false, error: string, rows: [] }>}
 */
export async function fetchParentMyDriver(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', rows: [] }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents/my-driver`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (res.status === 404) {
      return { ok: true, rows: [] }
    }
    if (!res.ok) {
      return { ok: false, error: formatMyDriverError(data, res.status), rows: [] }
    }
    const blocks = extractParentMyDriverBlocks(data)
    const rows = blocks.map(mapParentMyDriverRow).filter(Boolean)
    return { ok: true, rows }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, rows: [] }
  }
}

/** Treat common API shapes as boolean (avoids `"false"` string truthiness bugs). */
function coerceLocationBoolean(raw) {
  if (raw == null) return false
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw !== 0
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase()
    if (s === 'true' || s === '1' || s === 'yes') return true
    if (s === 'false' || s === '0' || s === 'no' || s === '') return false
  }
  return Boolean(raw)
}

/** Normalize API timestamp to ms (number, ISO string, or seconds). */
function normalizeLocationTimestampMs(raw) {
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw < 1e12 ? Math.round(raw * 1000) : Math.round(raw)
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Date.parse(raw)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Map GET /api/parents/my-driver/location JSON to a normalized point + flags.
 * @param {unknown} data
 * @returns {{ lat: number, lng: number, ts: number, busId: string | null, busNumericId: number | null, tripActive: boolean, isRunning: boolean } | null}
 */
export function mapParentMyDriverLocationPayload(data) {
  if (!data || typeof data !== 'object') return null
  const root = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data
  const loc =
    root.location && typeof root.location === 'object'
      ? root.location
      : root.lastLocation && typeof root.lastLocation === 'object'
        ? root.lastLocation
        : root.position && typeof root.position === 'object'
          ? root.position
          : root.lat != null && root.lng != null
            ? root
            : null
  if (!loc || typeof loc !== 'object') return null
  const lat = Number(loc.lat ?? loc.latitude ?? root.lat)
  const lng = Number(loc.lng ?? loc.longitude ?? loc.lon ?? root.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const tsRaw =
    loc.ts ?? loc.timestamp ?? loc.updatedAt ?? loc.time ?? root.ts ?? root.updatedAt ?? root.lastUpdated
  const tsMs = normalizeLocationTimestampMs(tsRaw) ?? Date.now()
  const busId = String(loc.busId ?? loc.vehicleId ?? root.busId ?? root.assignedBus ?? '').trim()
  const tripActive = coerceLocationBoolean(
    root.tripActive ??
      root.isTripActive ??
      root.trip_in_progress ??
      loc.tripActive ??
      loc.isTripActive ??
      false,
  )
  const isRunning = coerceLocationBoolean(
    root.isRunning ??
      root.is_running ??
      root.running ??
      loc.isRunning ??
      loc.is_running ??
      loc.running ??
      tripActive,
  )
  const busNumericRaw =
    root.busNumericId ?? root.busIdNumeric ?? loc.busNumericId ?? loc.bus_id ?? root.location?.busNumericId
  const busNumericIdN = Number(busNumericRaw)
  const busNumericId = Number.isFinite(busNumericIdN) && busNumericIdN > 0 ? busNumericIdN : null

  return {
    lat,
    lng,
    ts: tsMs,
    busId: busId || null,
    busNumericId,
    tripActive,
    isRunning,
  }
}

/**
 * GET /api/parents/my-driver/location — last known driver/bus position for this parent (Bearer).
 * @returns {Promise<{ ok: true, location: object | null } | { ok: false, error: string, location: null }>}
 */
export async function fetchParentMyDriverLocation(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', location: null }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/parents/my-driver/location`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    if (res.status === 404) {
      return { ok: true, location: null }
    }
    if (!res.ok) {
      return { ok: false, error: formatMyDriverError(data, res.status), location: null }
    }
    const location = mapParentMyDriverLocationPayload(data)
    return { ok: true, location }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, location: null }
  }
}
