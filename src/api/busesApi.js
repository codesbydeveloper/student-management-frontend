import { API_BASE_URL } from '../utils/constants'
import { mapApiStudentToRow } from './studentsApi'

function formatListError(data, status) {
  if (data == null) return `Could not load buses (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load buses (${status})`
}

function formatMutationError(data, status) {
  if (data == null) return `Request failed (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Request failed (${status})`
}

/** Normalize one bus row from POST/GET responses. */
export function mapBusRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw._id ?? raw.busId
  if (id == null) return null
  const name = String(raw.name ?? raw.routeName ?? raw.title ?? '').trim()
  const plate = String(raw.plate ?? raw.number ?? raw.numberPlate ?? raw.registration ?? '').trim()
  const driverUserId =
    raw.driverUserId ??
    raw.driver_user_id ??
    raw.driverId ??
    raw.driver_id ??
    (raw.driver && typeof raw.driver === 'object' ? raw.driver.id ?? raw.driver.userId : null)
  return {
    id: String(id),
    name: name || '—',
    plate: plate || '—',
    driverUserId:
      driverUserId != null && String(driverUserId).trim() !== ''
        ? String(driverUserId).trim()
        : null,
  }
}

function extractPagedBuses(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, limit: 10 }
  }
  if (Array.isArray(data)) {
    return { list: data, total: data.length, page: 1, limit: data.length || 10 }
  }
  let list = []
  if (Array.isArray(data.buses)) list = data.buses
  else if (Array.isArray(data.data)) list = data.data
  else if (Array.isArray(data.items)) list = data.items
  else if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.buses)
  ) {
    list = data.data.buses
  }
  const meta = data.pagination || data.meta || {}
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

/** Normalize GET /api/buses/all (and similar “full list”) response shapes to a raw bus array. */
function extractAllBusesList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data !== 'object') return []
  if (Array.isArray(data.buses)) return data.buses
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.results)) return data.results
  if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.buses)
  ) {
    return data.data.buses
  }
  const { list } = extractPagedBuses(data)
  return list
}

function extractSingleBus(data) {
  return (
    mapBusRow(data?.bus) ||
    mapBusRow(data?.data?.bus) ||
    mapBusRow(typeof data?.data === 'object' && !Array.isArray(data.data) ? data.data : null) ||
    mapBusRow(data)
  )
}

/**
 * GET /api/buses/all — full bus list (no pagination).
 * @param {string} token
 */
export async function fetchAllBuses(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', buses: [] }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/buses/all`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), buses: [] }
    }
    const rawList = extractAllBusesList(data)
    const buses = rawList.map(mapBusRow).filter(Boolean)
    return { ok: true, buses }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, buses: [] }
  }
}

/**
 * GET /api/buses/:id
 * @param {string} token
 * @param {string | number} id
 */
export async function fetchBus(token, id) {
  if (!token) return { ok: false, error: 'Not signed in', bus: null }
  const idSeg = encodeURIComponent(String(id ?? '').trim())
  if (!idSeg) return { ok: false, error: 'Missing bus id.', bus: null }
  try {
    const res = await fetch(`${API_BASE_URL}/api/buses/${idSeg}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), bus: null }
    }
    const bus = extractSingleBus(data)
    if (!bus) return { ok: false, error: 'Unexpected response shape.', bus: null }
    return { ok: true, bus }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, bus: null }
  }
}

/** For JSON body: numeric id when plain digits, else string; `null` unassigns driver. */
function serializeDriverUserIdForJson(value) {
  if (value === null) return null
  if (value === undefined) return undefined
  const s = String(value).trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) && String(n) === s ? n : s
}

/**
 * PATCH /api/buses/:id — send only keys you include. Use `driverUserId: null` to unassign.
 * @param {string} token
 * @param {string | number} id
 * @param {{ name?: string, plate?: string, driverUserId?: string | number | null }} patch
 */
export async function updateBus(token, id, patch) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const idSeg = encodeURIComponent(String(id ?? '').trim())
  if (!idSeg) return { ok: false, error: 'Missing bus id.' }

  const payload = {}
  if (patch && typeof patch === 'object') {
    if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
      payload.name = String(patch.name ?? '').trim()
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'plate')) {
      payload.plate = String(patch.plate ?? '').trim()
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'driverUserId')) {
      const v = patch.driverUserId
      if (v === null) payload.driverUserId = null
      else {
        const coerced = serializeDriverUserIdForJson(v)
        if (coerced !== undefined) payload.driverUserId = coerced
      }
    }
  }
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: 'Nothing to update.' }
  }

  try {
    const url = `${API_BASE_URL}/api/buses/${idSeg}`
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
    const body = JSON.stringify(payload)
    let res = await fetch(url, { method: 'PATCH', headers, body })
    let data = await res.json().catch(() => null)
    if (res.status === 405) {
      res = await fetch(url, { method: 'PUT', headers, body })
      data = await res.json().catch(() => null)
    }
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status), status: res.status }
    }
    const bus = extractSingleBus(data)
    return { ok: true, bus: bus || null, raw: data }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * DELETE /api/buses/:id
 * @param {string} token
 * @param {string | number} id
 */
export async function deleteBus(token, id) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const idSeg = encodeURIComponent(String(id ?? '').trim())
  if (!idSeg) return { ok: false, error: 'Missing bus id.' }
  try {
    const res = await fetch(`${API_BASE_URL}/api/buses/${idSeg}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const ct = res.headers.get('content-type') || ''
    const data =
      res.status === 204 || !ct.includes('application/json')
        ? null
        : await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status), status: res.status }
    }
    return { ok: true, raw: data }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * POST /api/buses — create bus (admin / principal). `driverUserId` optional.
 *
 * @param {string} token
 * @param {{ name: string, plate: string, driverUserId?: string | number | null }} body
 */
export async function createBus(token, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const name = String(body?.name ?? '').trim()
  const plate = String(body?.plate ?? '').trim()
  if (!name) return { ok: false, error: 'Enter a bus name.' }
  if (!plate) return { ok: false, error: 'Enter a number plate.' }

  const payload = { name, plate }
  const did = body?.driverUserId
  if (did != null && String(did).trim() !== '') {
    const s = String(did).trim()
    const n = Number(s)
    payload.driverUserId = Number.isFinite(n) && String(n) === s ? n : s
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/buses`, {
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
      return { ok: false, error: formatMutationError(data, res.status), status: res.status }
    }
    const bus =
      mapBusRow(data?.bus) ||
      mapBusRow(data?.data?.bus) ||
      mapBusRow(typeof data?.data === 'object' && !Array.isArray(data.data) ? data.data : null) ||
      mapBusRow(data)
    return { ok: true, bus, raw: data }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * GET /api/buses?page=&limit=
 *
 * @param {string} token
 * @param {{ page?: number, limit?: number }} [params]
 */
export async function fetchBuses(token, { page = 1, limit = 10 } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const lim = Math.min(100, Math.max(1, Number(limit) || 10))
  if (!token) {
    return {
      ok: false,
      error: 'Not signed in',
      buses: [],
      total: 0,
      page: p,
      limit: lim,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
  try {
    const qs = new URLSearchParams({ page: String(p), limit: String(lim) })
    const res = await fetch(`${API_BASE_URL}/api/buses?${qs}`, {
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
        buses: [],
        total: 0,
        page: p,
        limit: lim,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedBuses(data)
    const buses = rawList.map(mapBusRow).filter(Boolean)
    const totalSafe = Number.isFinite(total) ? total : buses.length
    const limitSafe = resLimit || lim
    const pageSafe = resPage || p
    const totalPages = totalSafe > 0 ? Math.ceil(totalSafe / Math.max(1, limitSafe)) : 0
    return {
      ok: true,
      buses,
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
    return {
      ok: false,
      error: msg,
      buses: [],
      total: 0,
      page: p,
      limit: lim,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

/**
 * GET /api/buses/student-assignments — paged summary per bus (name, driver, student count).
 */
function extractPagedStudentAssignments(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, limit: 10 }
  }
  if (Array.isArray(data)) {
    return { list: data, total: data.length, page: 1, limit: data.length || 10 }
  }
  let list = []
  if (Array.isArray(data.assignments)) list = data.assignments
  else if (Array.isArray(data.studentAssignments)) list = data.studentAssignments
  else if (Array.isArray(data.rows)) list = data.rows
  else if (Array.isArray(data.data) && data.data.every((x) => x && typeof x === 'object')) {
    list = data.data
  } else if (Array.isArray(data.items)) list = data.items
  else if (Array.isArray(data.buses)) list = data.buses
  else if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.rows)
  ) {
    list = data.data.rows
  } else if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.assignments)
  ) {
    list = data.data.assignments
  }
  const meta = data.pagination || data.meta || {}
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

/**
 * @param {object} raw
 * @returns {{ busName: string, driverName: string, studentCount: number, busId: string | null } | null}
 */
export function mapBusStudentAssignmentRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const bus =
    raw.bus && typeof raw.bus === 'object'
      ? raw.bus
      : raw.busInfo && typeof raw.busInfo === 'object'
        ? raw.busInfo
        : null
  const driver =
    raw.driver && typeof raw.driver === 'object'
      ? raw.driver
      : raw.driverUser && typeof raw.driverUser === 'object'
        ? raw.driverUser
        : null
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : null
  const summary = raw.summary && typeof raw.summary === 'object' ? raw.summary : null

  const busName = String(
    raw.busName ?? raw.name ?? bus?.name ?? bus?.routeName ?? raw.bus_name ?? '',
  ).trim()
  const driverName = String(
    raw.driverName ??
      raw.driver_name ??
      driver?.fullName ??
      driver?.name ??
      raw.driverFullName ??
      '',
  ).trim()

  const countCandidates = [
    raw.studentCount,
    raw.studentsCount,
    raw.assignedStudentCount,
    raw.student_count,
    raw.totalStudents,
    raw.total_students,
    raw.numStudents,
    raw.num_students,
    raw.assignmentCount,
    raw.assignment_count,
    raw.assignedCount,
    raw.assigned_count,
    raw.childrenCount,
    raw.children_count,
    raw.enrollmentCount,
    raw.enrollment_count,
    raw.pupilCount,
    stats?.studentCount,
    stats?.studentsCount,
    stats?.totalStudents,
    summary?.studentCount,
    summary?.studentsCount,
    summary?.assignedCount,
  ]
  let studentCount = NaN
  for (const c of countCandidates) {
    if (c == null || c === '') continue
    const n = Number(c)
    if (Number.isFinite(n) && n >= 0) {
      studentCount = n
      break
    }
  }
  if (!Number.isFinite(studentCount)) {
    if (Array.isArray(raw.students)) studentCount = raw.students.length
    else if (Array.isArray(raw.studentIds)) studentCount = raw.studentIds.length
    else if (Array.isArray(raw.assignedStudents)) studentCount = raw.assignedStudents.length
    else if (Array.isArray(bus?.students)) studentCount = bus.students.length
    else studentCount = 0
  }
  if (!Number.isFinite(studentCount) || studentCount < 0) studentCount = 0

  const busId =
    raw.busId != null
      ? String(raw.busId)
      : bus?.id != null
        ? String(bus.id)
        : null

  if (!busName && !driverName && studentCount === 0 && !busId) return null

  return {
    busName: busName || '—',
    driverName: driverName || '—',
    studentCount,
    busId,
  }
}

/**
 * GET /api/buses/student-assignments?page=&limit=
 *
 * **Suggested response for backend (one row per bus):** each list item should include either
 * a numeric **`studentCount`** (preferred) or **`studentsCount`**, **`assignedStudentCount`**, or
 * **`totalStudents`**, or arrays **`students`** / **`studentIds`** / **`assignedStudents`** whose
 * length we can count. Optional nested objects **`bus`**, **`driver`** with `name` / `fullName`.
 * Pagination envelope: **`data`** array and **`total`**, **`page`**, **`limit`** (or **`meta`** / **`pagination`** with the same keys).
 *
 * @param {string} token
 * @param {{ page?: number, limit?: number }} [params]
 */
export async function fetchBusesStudentAssignments(token, { page = 1, limit = 10 } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const lim = Math.min(100, Math.max(1, Number(limit) || 10))
  if (!token) {
    return {
      ok: false,
      error: 'Not signed in',
      rows: [],
      total: 0,
      page: p,
      limit: lim,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
  try {
    const qs = new URLSearchParams({ page: String(p), limit: String(lim) })
    const res = await fetch(`${API_BASE_URL}/api/buses/student-assignments?${qs}`, {
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
        rows: [],
        total: 0,
        page: p,
        limit: lim,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedStudentAssignments(data)
    const rows = rawList.map(mapBusStudentAssignmentRow).filter(Boolean)
    const totalSafe = Number.isFinite(total) ? total : rows.length
    const limitSafe = resLimit || lim
    const pageSafe = resPage || p
    const totalPages = totalSafe > 0 ? Math.ceil(totalSafe / Math.max(1, limitSafe)) : 0
    return {
      ok: true,
      rows,
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
    return {
      ok: false,
      error: msg,
      rows: [],
      total: 0,
      page: p,
      limit: lim,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

function extractBusStudentsListFromResponse(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data !== 'object') return []
  if (Array.isArray(data.students)) return data.students
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.results)) return data.results
  if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.students)
  ) {
    return data.data.students
  }
  return []
}

/**
 * GET /api/buses/:busId/students — students assigned to this bus (admin/principal Bearer).
 * Response: JSON array or `{ students: [...] }` / `{ data: [...] }`; each item mapped with {@link mapApiStudentToRow}.
 * If your server uses another path (e.g. `GET /api/students?busId=`), change this function to match.
 *
 * @param {string} token
 * @param {string | number} busId
 */
export async function fetchBusStudents(token, busId) {
  if (!token) {
    return { ok: false, error: 'Not signed in', students: [] }
  }
  const idSeg = encodeURIComponent(String(busId ?? '').trim())
  if (!idSeg) {
    return { ok: false, error: 'Missing bus id.', students: [] }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/buses/${idSeg}/students`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), students: [] }
    }
    const rawList = extractBusStudentsListFromResponse(data)
    const students = rawList.map((row) => mapApiStudentToRow(row)).filter(Boolean)
    return { ok: true, students }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, students: [] }
  }
}

/** JSON-friendly id: plain integers as numbers, else string. */
function coerceJsonId(v) {
  if (v == null || v === '') return null
  const s = String(v).trim()
  if (s === '') return null
  if (/^-?\d+$/.test(s)) return Number(s)
  return s
}

/**
 * POST /api/buses/assign-students — assign students to a bus.
 * Body: `{ busId, studentIds }` (ids coerced to numbers when all digits).
 *
 * @param {string} token
 * @param {{ busId: string | number, studentIds: (string | number)[] }} body
 */
export async function assignStudentsToBus(token, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const busId = coerceJsonId(body?.busId)
  if (busId == null && body?.busId !== 0) return { ok: false, error: 'Choose a bus.' }
  const raw = Array.isArray(body?.studentIds) ? body.studentIds : []
  if (raw.length === 0) return { ok: false, error: 'Select at least one student.' }
  const studentIds = []
  for (const id of raw) {
    const c = coerceJsonId(id)
    if (c == null) {
      return { ok: false, error: 'Each student id must be set.' }
    }
    studentIds.push(c)
  }

  const payload = { busId, studentIds }

  try {
    const res = await fetch(`${API_BASE_URL}/api/buses/assign-students`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const ct = res.headers.get('content-type') || ''
    const data =
      res.status === 204 || !ct.includes('application/json')
        ? null
        : await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatMutationError(data, res.status), status: res.status }
    }
    return { ok: true, raw: data }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}
