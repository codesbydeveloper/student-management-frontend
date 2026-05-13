import { API_BASE_URL } from '../utils/constants'

function formatListError(data, status) {
  if (data == null) return `Could not load drivers (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load drivers (${status})`
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

/**
 * Map POST /api/drivers (or similar) response to DriversModule row shape.
 * @param {object} raw
 */
export function mapApiDriverToRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const nested = raw.driver && typeof raw.driver === 'object' ? raw.driver : null
  const r = nested || raw
  const id = r.id ?? r.userId ?? r.driverId ?? raw.id ?? raw.userId
  const assigned =
    r.assignedBus ??
    r.assigned_bus ??
    r.busId ??
    r.bus_id ??
    (r.bus && typeof r.bus === 'object' ? r.bus.number ?? r.bus.id : null) ??
    ''
  const assignedStr = String(assigned ?? '').trim()
  return {
    id: id != null ? String(id) : `d-${Date.now()}`,
    fullName: String(r.fullName ?? r.name ?? '').trim(),
    email: String(r.email ?? '').trim().toLowerCase(),
    phone: String(r.phone ?? '').trim(),
    licenseNumber: String(r.licenseNumber ?? r.license ?? '').trim(),
    /** Same as API `assignedBus` — shown verbatim in the table. */
    assignedBus: assignedStr,
    busId: assignedStr,
    active:
      typeof r.isActive === 'boolean'
        ? r.isActive
        : typeof r.active === 'boolean'
          ? r.active
          : true,
  }
}

/** Pull list + total from common paginated API shapes (GET /api/drivers?page=&limit=). */
export function extractPagedDriversResponse(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, limit: 50 }
  }
  if (Array.isArray(data)) {
    return { list: data, total: data.length, page: 1, limit: data.length || 50 }
  }
  let list = []
  if (Array.isArray(data.data)) list = data.data
  else if (Array.isArray(data.drivers)) list = data.drivers
  else if (Array.isArray(data.results)) list = data.results
  const meta = data.meta || data.pagination || {}
  const total = Number(
    data.total ?? data.totalCount ?? data.count ?? meta.total ?? meta.totalItems ?? list.length,
  )
  const page = Number(data.page ?? meta.page ?? 1) || 1
  const limit = Number(data.limit ?? meta.limit ?? meta.perPage ?? 50) || 50
  return {
    list,
    total: Number.isFinite(total) ? total : list.length,
    page,
    limit,
  }
}

function extractPickerDriversList(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.drivers)) return data.drivers
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data.picker)) return data.picker
  return []
}

/**
 * Vehicle id exactly as returned by GET /api/drivers/picker (assignedBus, vehicleId, etc.).
 * @returns {{ userId: string, vehicleId: string, fullName: string } | null}
 */
export function mapPickerDriverRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  /** Picker often returns `id` as login users.id (same as curl / transport), not only `userId`. */
  const userId = String(
    raw.userId ??
      raw.usersId ??
      raw.users_id ??
      raw.user_id ??
      raw.id ??
      raw.driverId ??
      raw.driver_id ??
      (raw.user && (raw.user.id != null ? raw.user.id : raw.user.userId)) ??
      '',
  ).trim()
  if (!userId) return null
  const vehicleId = String(
    raw.vehicleId ??
      raw.vehicle_id ??
      raw.assignedBus ??
      raw.assigned_bus ??
      raw.busId ??
      raw.bus_id ??
      (raw.bus && (raw.bus.id ?? raw.bus.number)) ??
      '',
  ).trim()
  if (!vehicleId) return null
  const fullName = String(raw.driverName ?? raw.fullName ?? raw.name ?? 'Driver').trim()
  return { userId, vehicleId, fullName, busId: vehicleId }
}

/**
 * GET /api/drivers/picker
 */
export async function fetchDriversPicker(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', drivers: [] }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/picker`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), drivers: [] }
    }
    const rawList = extractPickerDriversList(data)
    const drivers = rawList.map(mapPickerDriverRow).filter(Boolean)
    return { ok: true, drivers }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, drivers: [] }
  }
}

/**
 * POST /api/drivers/location — driver live GPS ping (Bearer). Body matches backend contract (no driver id in body; JWT identifies driver).
 * @param {string} token
 * @param {{ lat: number, lng: number, speed: number | null, busId: string, ts: number, isRunning?: boolean }} body
 */
export async function postDriverLocation(token, body) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const bid = String(body.busId ?? '').trim()
  if (!bid) {
    return { ok: false, error: 'Missing busId' }
  }
  const payload = {
    lat: Number(body.lat),
    lng: Number(body.lng),
    speed: body.speed == null || Number.isNaN(body.speed) ? null : Number(body.speed),
    busId: bid,
    ts: Number(body.ts) || Date.now(),
    isRunning: body.isRunning !== undefined ? Boolean(body.isRunning) : true,
  }
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
    return { ok: false, error: 'Invalid coordinates' }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/location`, {
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

function formatMyRouteError(data, status) {
  if (data == null) return `Could not load your route (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Could not load your route (${status})`
}

function vehicleIdFromMyRoutePayload(o) {
  if (!o || typeof o !== 'object') return ''
  return String(
    o.assignedBus ??
      o.vehicleId ??
      o.vehicle_id ??
      o.busId ??
      (o.bus && typeof o.bus === 'object' ? o.bus.id ?? o.bus.number : null) ??
      '',
  ).trim()
}

/**
 * One family row for the signed-in driver (parent + child on this bus).
 * @param {object} raw
 */
export function mapDriverMyRouteRow(raw) {
  if (!raw || typeof raw !== 'object') return null

  const parent =
    raw.parent && typeof raw.parent === 'object'
      ? raw.parent
      : raw.guardian && typeof raw.guardian === 'object'
        ? raw.guardian
        : null
  let student =
    raw.student && typeof raw.student === 'object'
      ? raw.student
      : raw.child && typeof raw.child === 'object'
        ? raw.child
        : null
  if (!student && (raw.id != null || raw.studentId != null) && (raw.fullName != null || raw.name != null)) {
    student = raw
  }

  const parentUserId = String(
    raw.parentId ??
      raw.parentUserId ??
      raw.parent_id ??
      parent?.id ??
      parent?.userId ??
      '',
  ).trim()
  const parentName = String(
    raw.parentName ?? parent?.fullName ?? parent?.name ?? '',
  ).trim()

  const studentId = String(
    raw.studentId ?? raw.student_id ?? student?.id ?? student?.studentId ?? '',
  ).trim()
  const studentName = String(
    raw.studentName ?? raw.student_name ?? student?.fullName ?? student?.name ?? '',
  ).trim()

  const className = String(
    raw.className ??
      raw.classDisplayName ??
      student?.classDisplayName ??
      student?.className ??
      '',
  ).trim()
  const section = String(
    raw.section ?? raw.classSection ?? student?.classSection ?? student?.section ?? '',
  ).trim()

  if (!parentUserId && !parentName && !studentId && !studentName) return null

  return {
    parentUserId,
    parentName: parentName || '—',
    studentId,
    studentName: studentName || '—',
    className,
    section,
  }
}

function extractDriverMyRouteList(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.families)) return data.families
  if (Array.isArray(data.assignments)) return data.assignments
  if (Array.isArray(data.parents)) return data.parents
  if (Array.isArray(data.students)) return data.students
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.rows)) return data.rows
  if (Array.isArray(data.data)) return data.data
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return extractDriverMyRouteList(data.data)
  }
  return []
}

/** One parent row with `students[]` → one raw per child for mapping. */
function flattenDriverMyRouteItems(list) {
  const out = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    if (Array.isArray(item.students) && item.students.length > 0) {
      for (const s of item.students) {
        out.push({ parent: item, student: s })
      }
      continue
    }
    out.push(item)
  }
  return out
}

/**
 * GET /api/drivers/my-route — parents / students assigned to this driver’s vehicle (Bearer driver JWT).
 * @returns {Promise<{ ok: true, assignedBus: string, rows: object[] } | { ok: false, error: string, assignedBus: string, rows: [] }>}
 */
export async function fetchDriverMyRoute(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in', assignedBus: '', rows: [] }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/my-route`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (res.status === 404) {
      return { ok: true, assignedBus: '', rows: [] }
    }
    if (!res.ok) {
      return {
        ok: false,
        error: formatMyRouteError(data, res.status),
        assignedBus: '',
        rows: [],
      }
    }

    const assignedBus = vehicleIdFromMyRoutePayload(data)
    const list = flattenDriverMyRouteItems(extractDriverMyRouteList(data))
    const rows = list.map(mapDriverMyRouteRow).filter(Boolean)

    if (rows.length === 0 && list.length === 0 && data && typeof data === 'object' && !Array.isArray(data)) {
      const single = mapDriverMyRouteRow(data)
      if (single) {
        return {
          ok: true,
          assignedBus: assignedBus || vehicleIdFromMyRoutePayload(data),
          rows: [single],
        }
      }
    }

    return {
      ok: true,
      assignedBus: assignedBus || '',
      rows,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, assignedBus: '', rows: [] }
  }
}

/** Pull list from GET /api/drivers/assignments response (flexible envelopes). */
export function extractDriverAssignmentsList(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.assignments)) return data.assignments
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data.rows)) return data.rows
  if (Array.isArray(data.items)) return data.items
  if (data.data && typeof data.data === 'object' && Array.isArray(data.data.assignments)) {
    return data.data.assignments
  }
  return []
}

function vehicleIdFromAssignmentRow(o) {
  if (!o || typeof o !== 'object') return ''
  return String(
    o.assignedBus ??
      o.vehicleId ??
      o.vehicle_id ??
      o.busId ??
      o.bus_id ??
      (o.bus && typeof o.bus === 'object' ? o.bus.id ?? o.bus.number ?? o.bus.vehicleId : null) ??
      '',
  ).trim()
}

/**
 * Flatten API assignment groups into table rows: Driver + Parent per users.id.
 * @param {object[]} list
 * @returns {{ role: 'Driver'|'Parent', userId: string, busId: string, sourceLabel: string }[]}
 */
export function normalizeDriverAssignmentsToTableRows(list) {
  const rows = []
  const seen = new Set()

  function add(role, userId, busId) {
    const uid = userId != null ? String(userId).trim() : ''
    const bid = String(busId ?? '').trim()
    if (!uid || !bid) return
    const key = `${role}:${uid}:${bid}`
    if (seen.has(key)) return
    seen.add(key)
    rows.push({
      role,
      userId: uid,
      busId: bid,
      sourceLabel: 'Server',
      fromServer: true,
    })
  }

  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue

    const driverNested = raw.driver && typeof raw.driver === 'object' ? raw.driver : null
    const bus =
      vehicleIdFromAssignmentRow(raw) ||
      (driverNested ? vehicleIdFromAssignmentRow(driverNested) : '')

    const driverId =
      raw.driverId ??
      raw.driverUserId ??
      raw.driver_id ??
      raw.userId ??
      raw.usersId ??
      raw.id ??
      (driverNested ? driverNested.id ?? driverNested.userId : null)

    if (driverId != null && bus) {
      add('Driver', driverId, bus)
    }

    let parents = raw.parentIds ?? raw.parentUserIds ?? raw.parents
    if (parents == null && Array.isArray(raw.parentUsers)) {
      parents = raw.parentUsers
    }
    if (Array.isArray(parents)) {
      for (const p of parents) {
        const pid =
          typeof p === 'object' && p != null
            ? p.userId ?? p.usersId ?? p.id ?? p.parentId ?? p.parentUserId
            : p
        if (pid != null && bus) add('Parent', pid, bus)
      }
    }

    const roleRaw = raw.role ?? raw.userRole
    if (roleRaw != null && (raw.userId != null || raw.usersId != null)) {
      const r = String(roleRaw).toLowerCase()
      const role = r === 'driver' ? 'Driver' : 'Parent'
      const uid = raw.userId ?? raw.usersId
      const vbus = bus || vehicleIdFromAssignmentRow(raw)
      if (uid != null && vbus) add(role, uid, vbus)
    }
  }

  return rows.sort((a, b) => {
    if (a.busId !== b.busId) return String(a.busId).localeCompare(String(b.busId))
    if (a.role !== b.role) return a.role === 'Driver' ? -1 : 1
    return String(a.userId).localeCompare(String(b.userId), undefined, { numeric: true })
  })
}

/**
 * GET /api/drivers/assignments — list driver + parent assignments (admin/principal Bearer).
 * @param {string} token
 * @param {{ onlyWithParents?: number|boolean, page?: number, limit?: number }} params
 */
export async function fetchDriverAssignments(token, params = {}) {
  const onlyWithParents =
    params.onlyWithParents === false || params.onlyWithParents === 0 ? 0 : 1
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.max(1, Math.min(200, Number(params.limit) || 50))
  if (!token) {
    return { ok: false, error: 'Not signed in', rows: [], total: 0, page, limit }
  }
  const qs = new URLSearchParams({
    onlyWithParents: String(onlyWithParents),
    page: String(page),
    limit: String(limit),
  })
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/assignments?${qs}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), rows: [], total: 0, page, limit }
    }
    const rawList = extractDriverAssignmentsList(data)
    const rows = normalizeDriverAssignmentsToTableRows(rawList)
    const total = Number(
      data?.total ?? data?.totalCount ?? data?.count ?? data?.meta?.total ?? rows.length,
    )
    return {
      ok: true,
      rows,
      total: Number.isFinite(total) ? total : rows.length,
      page,
      limit,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, rows: [], total: 0, page, limit }
  }
}

/**
 * GET /api/drivers?page=&limit= — list drivers (Bearer).
 * @returns {Promise<{ ok: true, rows: object[], total: number, page: number, limit: number } | { ok: false, error: string, rows: [] }>}
 */
export async function fetchDriversList(token, params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 50))
  if (!token) {
    return { ok: false, error: 'Not signed in', rows: [], total: 0, page: 1, limit }
  }
  try {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await fetch(`${API_BASE_URL}/api/drivers?${qs}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), rows: [], total: 0, page, limit }
    }
    const { list: rawList, total, page: resPage, limit: resLimit } = extractPagedDriversResponse(data)
    const rows = rawList.map((raw) => mapApiDriverToRow(raw)).filter(Boolean)
    return {
      ok: true,
      rows,
      total,
      page: resPage || page,
      limit: resLimit || limit,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, rows: [], total: 0, page, limit }
  }
}

/**
 * POST /api/drivers — admin/principal creates a driver user (matches backend curl).
 * @param {string} token
 * @param {object} body — { fullName, email, phone, licenseNumber, assignedBus, isActive, password }
 * @returns {Promise<{ ok: true, data: object } | { ok: false, error: string }>}
 */
export async function createDriver(token, body) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  try {
    const payload = {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone ?? '',
      licenseNumber: body.licenseNumber,
      assignedBus: (body.assignedBus ?? '').trim(),
      isActive: body.isActive !== false,
      password: body.password,
    }
    const res = await fetch(`${API_BASE_URL}/api/drivers`, {
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

/** Coerce pasted parent ids for POST body (numeric login ids as numbers, else strings). */
function parentIdsForAssignApi(ids) {
  const out = []
  if (!Array.isArray(ids)) return out
  for (const id of ids) {
    const s = String(id).trim()
    if (s === '') continue
    if (/^-?\d+$/.test(s)) out.push(Number(s))
    else out.push(s)
  }
  return out
}

/**
 * POST /api/drivers/:id/assign — set driver display name, vehicle id, and parent user ids (admin/principal JWT).
 * @param {string} token
 * @param {string|number} driverId — path param (users.id / driver id as returned by API)
 * @param {{ driverName: string, assignedBus: string, parentIds: string[] }} payload
 */
export async function assignDriverTransport(token, driverId, payload) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const id = encodeURIComponent(String(driverId).trim())
  if (!id) {
    return { ok: false, error: 'Missing driver id' }
  }
  const body = {
    driverName: String(payload.driverName ?? '').trim(),
    assignedBus: String(payload.assignedBus ?? '').trim(),
    parentIds: parentIdsForAssignApi(payload.parentIds),
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/${id}/assign`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
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
 * PATCH /api/drivers/:id — update driver (e.g. isActive). Body uses API field names.
 * @param {string} token
 * @param {string|number} driverId
 * @param {object} body — e.g. { fullName, email, phone, licenseNumber, assignedBus, isActive }
 */
export async function updateDriver(token, driverId, body) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const id = encodeURIComponent(String(driverId))
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/${id}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
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
 * DELETE /api/drivers/:id — remove driver (Bearer).
 */
export async function deleteDriver(token, driverId) {
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const id = encodeURIComponent(String(driverId))
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/${id}`, {
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
    return { ok: true }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}
