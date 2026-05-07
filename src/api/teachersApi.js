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
  if (data == null) return `Could not load teachers (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load teachers (${status})`
}

/** Coerce class ids to numbers when numeric (matches server), else keep as string. */
function classIdsForApi(ids) {
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

/** Map API teacher object to the shape used by TeachersModule / DataTable. */
export function mapApiTeacherToRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  let classIds = []
  if (Array.isArray(raw.assignedClasses)) {
    classIds = raw.assignedClasses
      .map((c) => (c && typeof c === 'object' ? c.id ?? c.classId : c))
      .filter((x) => x != null)
      .map(String)
  } else if (Array.isArray(raw.classIds)) {
    classIds = raw.classIds.map(String)
  } else if (Array.isArray(raw.classes)) {
    classIds = raw.classes
      .map((c) => (c && typeof c === 'object' ? c.id : c))
      .filter(Boolean)
      .map(String)
  } else if (Array.isArray(raw.class_id)) {
    classIds = raw.class_id.map(String)
  }

  /** Embedded class rows from GET /api/teachers/:id — used for display names in overview chips. */
  let classesDetail = []
  if (Array.isArray(raw.classes)) {
    for (const c of raw.classes) {
      if (!c || typeof c !== 'object') continue
      const cid = c.id ?? c.classId
      if (cid == null) continue
      const displayName = String(c.displayName ?? c.name ?? '').trim()
      classesDetail.push({
        id: String(cid),
        displayName: displayName || `Class #${cid}`,
      })
    }
  }

  const id = raw.id ?? raw._id ?? raw.userId
  return {
    id: id != null ? String(id) : `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fullName: String(raw.fullName ?? raw.name ?? '').trim(),
    email: String(raw.email ?? '').trim().toLowerCase(),
    phone: String(raw.phone ?? '').trim(),
    password: raw.password != null ? String(raw.password) : '',
    subject: String(raw.subject ?? raw.subjectFocus ?? '').trim(),
    active:
      typeof raw.active === 'boolean'
        ? raw.active
        : typeof raw.isActive === 'boolean'
          ? raw.isActive
          : true,
    classIds,
    classesDetail,
  }
}

/** Pull list + total from common paginated API shapes. */
export function extractPagedTeachersResponse(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, limit: 10 }
  }
  if (Array.isArray(data)) {
    return { list: data, total: data.length, page: 1, limit: data.length || 10 }
  }
  let list = []
  if (Array.isArray(data.data)) list = data.data
  else if (Array.isArray(data.teachers)) list = data.teachers
  else if (Array.isArray(data.results)) list = data.results
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

/** Normalize GET /api/teachers/picker response to a raw teacher row array. */
function extractPickerTeachersList(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.teachers)) return data.teachers
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.picker)) return data.picker
  if (Array.isArray(data.results)) return data.results
  const { list } = extractPagedTeachersResponse(data)
  return list.length ? list : []
}

/** Option shape for SearchableMultiSelect from a picker row. */
export function mapPickerTeacherToOption(raw) {
  const row = mapApiTeacherToRow(raw)
  if (!row) return null
  return {
    value: row.id,
    label: row.fullName,
    subtext: [row.email, row.subject].filter(Boolean).join(' · '),
  }
}

/**
 * GET /api/teachers/picker — Bearer + Accept; lightweight list for assign-teacher pickers.
 * @returns {Promise<{ ok: true, options: { value: string, label: string, subtext: string }[] } | { ok: false, error: string, options: [] }>}
 */
export async function fetchTeachersPicker(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', options: [] }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/picker`, {
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
    const rawList = extractPickerTeachersList(data)
    const options = rawList.map(mapPickerTeacherToOption).filter(Boolean)
    return { ok: true, options }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, options: [] }
  }
}

/**
 * POST /api/teachers — admin creates a teacher (body matches server curl).
 * @param {object} body — { fullName, email, phone, password, subjectFocus, isActive, classIds? } — `classIds` from the app is sent as `assignedClasses` on the wire.
 */
export async function createTeacher(token, body) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  try {
    const payload = {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone ?? '',
      password: body.password,
      subjectFocus: body.subjectFocus,
      isActive: body.isActive,
      assignedClasses: classIdsForApi(body.classIds ?? body.assignedClasses),
    }
    const res = await fetch(`${API_BASE_URL}/api/teachers`, {
      method: 'POST',
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


export async function updateTeacher(token, teacherId, body) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const id = encodeURIComponent(String(teacherId))
  const payload = { ...body }
  if ('classIds' in body) {
    delete payload.classIds
    payload.assignedClasses = classIdsForApi(body.classIds)
  } else if ('assignedClasses' in body) {
    payload.assignedClasses = classIdsForApi(body.assignedClasses)
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${id}`, {
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
 * DELETE /api/teachers/:id — remove teacher (Bearer + Accept per server curl).
 */
export async function deleteTeacher(token, teacherId) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const id = encodeURIComponent(String(teacherId))
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${id}`, {
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


export async function exportTeachersCsv(token, { rows, status, page, limit }) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  const params = new URLSearchParams({ rows, status })
  if (rows !== 'everyone' && page != null && limit != null) {
    params.set('page', String(page))
    params.set('limit', String(limit))
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/export/csv?${params}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/csv,*/*',
      },
    })
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
    let filename = 'teachers.csv'
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
 * POST /api/teachers/import/csv — multipart upload (`file` field), Bearer auth (same as curl).
 * @param {File} file
 * @returns {Promise<{ ok: true, data: object | null } | { ok: false, error: string, useClient?: boolean }>}
 */
export async function importTeachersCsv(token, file) {
  if (!token) {
    return { ok: false, error: 'Not signed in', useClient: true }
  }
  const form = new FormData()
  form.append('file', file, file.name)
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/import/csv`, {
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
 * GET /api/teachers?page=&limit= with Bearer token.
 * @param {{ page?: number, limit?: number }} [params]
 * @returns {Promise<{ ok: true, teachers: object[], total: number, page: number, limit: number } | { ok: false, error: string, teachers: [], total: 0, page: 1, limit: 10 }>}
 */
export async function fetchTeachersList(token, params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 10))
  if (!token) {
    return { ok: false, error: 'Not signed in', teachers: [], total: 0, page: 1, limit }
  }
  try {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await fetch(`${API_BASE_URL}/api/teachers?${qs}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), teachers: [], total: 0, page, limit }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedTeachersResponse(data)
    const teachers = rawList.map(mapApiTeacherToRow).filter(Boolean)
    return {
      ok: true,
      teachers,
      total,
      page: resPage || page,
      limit: resLimit || limit,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, teachers: [], total: 0, page, limit }
  }
}

/** Detail responses may nest the row and put `assignedClasses` on the envelope. */
function copyTeacherDetailEnvelope(envelope, inner) {
  if (!inner || typeof inner !== 'object') return null
  if (!envelope || typeof envelope !== 'object') return { ...inner }
  const out = { ...inner }
  for (const k of ['assignedClasses', 'classes', 'classIds']) {
    if (Object.prototype.hasOwnProperty.call(envelope, k) && envelope[k] != null) {
      out[k] = envelope[k]
    }
  }
  return out
}

function unwrapTeacherDetailPayload(data) {
  if (!data || typeof data !== 'object') return null
  if (data.teacher && typeof data.teacher === 'object' && !Array.isArray(data.teacher)) {
    return copyTeacherDetailEnvelope(data, data.teacher)
  }
  if (data.data && typeof data.data === 'object') {
    const d = data.data
    if (d.teacher && typeof d.teacher === 'object' && !Array.isArray(d.teacher)) {
      return copyTeacherDetailEnvelope(d, d.teacher)
    }
    if (d.id != null || d.email != null || d.fullName != null) return d
  }
  if (data.id != null || data.email != null || data.fullName != null) return data
  return null
}

/**
 * GET /api/teachers/:id — single teacher for read-only view (and detail refresh).
 * @returns {Promise<{ ok: true, teacher: object } | { ok: false, error: string, teacher: null }>}
 */
export async function fetchTeacherById(token, teacherId) {
  if (!token) {
    return { ok: false, error: 'Not signed in', teacher: null }
  }
  const id = encodeURIComponent(String(teacherId))
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${id}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), teacher: null }
    }
    const raw = unwrapTeacherDetailPayload(data)
    const teacher = mapApiTeacherToRow(raw)
    if (!teacher) {
      return { ok: false, error: 'Unexpected server response.', teacher: null }
    }
    return { ok: true, teacher }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, teacher: null }
  }
}

/**
 * Fetches every teacher page from GET /api/teachers (limit capped at 100 per request).
 * @returns {Promise<{ ok: true, teachers: object[] } | { ok: false, error: string, teachers: [] }>}
 */
export async function fetchAllTeachersList(token) {
  const first = await fetchTeachersList(token, { page: 1, limit: 100 })
  if (!first.ok) {
    return { ok: false, error: first.error, teachers: [] }
  }
  const limit = first.limit || 100
  const totalPages = Math.max(1, Math.ceil(first.total / limit))
  const merged = [...first.teachers]
  for (let p = 2; p <= totalPages; p++) {
    const res = await fetchTeachersList(token, { page: p, limit })
    if (!res.ok) {
      return { ok: false, error: res.error, teachers: merged }
    }
    merged.push(...res.teachers)
  }
  const seen = new Set()
  const teachers = merged.filter((t) => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
  return { ok: true, teachers }
}
