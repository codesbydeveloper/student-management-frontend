import { API_BASE_URL } from '../utils/constants'

function formatListError(data, status) {
  if (data == null) return `Request failed (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return `Request failed (${status})`
}

function pickText(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object' && !Array.isArray(value)) {
    const o = value
    return String(
      o.fullName ?? o.name ?? o.studentName ?? o.student_name ?? o.label ?? '',
    ).trim()
  }
  return ''
}

/** HH:mm for time inputs from API values like "07:30" or "07:30:00". */
function parseCoordinate(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function normalizeTimeForInput(value) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return s
  const h = String(Number(m[1])).padStart(2, '0')
  return `${h}:${m[2]}`
}

/** POST/PATCH body uses pickupTime / dropTime (HH:mm). */
function timeForApi(value) {
  const t = normalizeTimeForInput(value)
  return t || undefined
}

function extractPickupPointsList(data) {
  if (!data) return { list: [], total: 0, page: 1, limit: 10, hasNextPage: false, hasPrevPage: false }
  if (Array.isArray(data)) {
    return {
      list: data,
      total: data.length,
      page: 1,
      limit: data.length || 10,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
  if (typeof data !== 'object') {
    return { list: [], total: 0, page: 1, limit: 10, hasNextPage: false, hasPrevPage: false }
  }

  let list = []
  if (Array.isArray(data.pickupPoints)) list = data.pickupPoints
  else if (Array.isArray(data.items)) list = data.items
  else if (Array.isArray(data.results)) list = data.results
  else if (Array.isArray(data.data)) list = data.data
  else if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.pickupPoints)
  ) {
    list = data.data.pickupPoints
  }

  const meta = data.pagination || data.meta || {}
  const total = Number(
    data.total ?? data.totalCount ?? data.count ?? meta.total ?? meta.totalItems ?? list.length,
  )
  const page = Number(data.page ?? meta.page ?? 1) || 1
  const limit = Number(data.limit ?? meta.perPage ?? meta.limit ?? 10) || 10
  const totalPages = Number(
    data.totalPages ?? meta.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 1),
  )
  const hasNextPage = Boolean(
    data.hasNextPage ??
      meta.hasNextPage ??
      (Number.isFinite(totalPages) ? page < totalPages : false),
  )
  const hasPrevPage = Boolean(data.hasPrevPage ?? meta.hasPrevPage ?? page > 1)

  return {
    list,
    total: Number.isFinite(total) ? total : list.length,
    page,
    limit,
    hasNextPage,
    hasPrevPage,
  }
}

export function mapPickupPointRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw._id ?? raw.pickupPointId
  if (id == null) return null

  const studentRaw = raw.student ?? raw.studentDetails ?? raw.studentInfo
  const studentsRaw = Array.isArray(raw.students)
    ? raw.students
    : Array.isArray(raw.studentDetails)
      ? raw.studentDetails
      : Array.isArray(raw.studentIds)
        ? raw.studentIds
        : []
  const studentId =
    raw.studentId ??
    raw.student_id ??
    (studentRaw && typeof studentRaw === 'object' ? studentRaw.id ?? studentRaw.studentId : null)

  const studentLabel =
    pickText(raw.studentName ?? raw.student_name) ||
    pickText(studentRaw) ||
    (studentId != null ? `Student #${studentId}` : '—')

  const studentCount = studentsRaw.length
    ? studentsRaw.length
    : studentId != null && String(studentId).trim() !== ''
      ? 1
      : 0
  const studentIds = studentsRaw.length
    ? studentsRaw
        .map((s) => {
          if (s && typeof s === 'object') return s.id ?? s.studentId ?? null
          return s
        })
        .filter((v) => v != null && String(v).trim() !== '')
        .map((v) => String(v))
    : studentId != null && String(studentId).trim() !== ''
      ? [String(studentId)]
      : []

  const name = String(raw.name ?? raw.pickupPointName ?? raw.pointName ?? '').trim()
  const location = String(
    raw.location ?? raw.address ?? raw.locationName ?? (name ? '' : raw.name) ?? '',
  ).trim()

  return {
    id: String(id),
    name: name || '—',
    location: location || name || '—',
    city: String(raw.city ?? '').trim(),
    state: String(raw.state ?? raw.region ?? raw.province ?? '').trim(),
    pickupTime: normalizeTimeForInput(raw.pickupTime ?? raw.pick_up_time ?? raw.pickUpTime),
    dropTime: normalizeTimeForInput(raw.dropTime ?? raw.drop_time ?? raw.dropTime),
    studentId: studentId != null ? String(studentId) : '',
    studentIds,
    studentLabel,
    studentCount,
    latitude: parseCoordinate(raw.latitude ?? raw.lat),
    longitude: parseCoordinate(raw.longitude ?? raw.lng ?? raw.lon),
  }
}

/**
 * POST/PATCH body — pick up point name is `location`; plus lat/lng and times.
 */
function pickupPointPayloadFields(body) {
  const out = {
    location: String(body.location ?? body.name ?? body.pointName ?? '').trim(),
    latitude: parseCoordinate(body.latitude ?? body.lat),
    longitude: parseCoordinate(body.longitude ?? body.lng ?? body.lon),
    pickupTime: timeForApi(body.pickupTime),
    dropTime: timeForApi(body.dropTime),
  }
  const studentId = body.studentId != null ? Number(body.studentId) : NaN
  if (Number.isFinite(studentId)) out.studentId = studentId
  return out
}

function validatePickupPointPayload(payload) {
  if (!payload.location) return 'Enter a pick up point name.'
  if (payload.latitude == null || payload.longitude == null) {
    return 'Place the stop on the map (click the map or use Find on map).'
  }
  if (!payload.pickupTime) return 'Select a pick-up time.'
  if (!payload.dropTime) return 'Select a drop time.'
  return null
}

function mapDetailPayload(data) {
  if (!data || typeof data !== 'object') return null
  const row = data.pickupPoint ?? data.data ?? data
  if (Array.isArray(row)) return mapPickupPointRow(row[0])
  return mapPickupPointRow(row)
}

function extractPickupPointsPickerList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data !== 'object') return []
  if (Array.isArray(data.pickupPoints)) return data.pickupPoints
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data.data)) return data.data
  if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.pickupPoints)
  ) {
    return data.data.pickupPoints
  }
  return []
}

/** Primary display name for a pick up point (location is the stored name in API). */
export function pickupPointDisplayNameFromRaw(raw) {
  if (!raw || typeof raw !== 'object') return ''
  const row = mapPickupPointRow(raw)
  const location = String(raw.location ?? raw.locationName ?? raw.address ?? '').trim()
  if (location) return location
  if (row?.location && row.location !== '—') return row.location
  if (row?.name && row.name !== '—') return row.name
  const apiLabel = String(raw.label ?? '').trim()
  if (apiLabel && !/^Pick up point #\d+$/i.test(apiLabel)) return apiLabel
  return ''
}

/** Option shape for route pickers — label is the pick up point location/name. */
export function mapPickupPointToPickerOption(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw._id ?? raw.pickupPointId
  if (id == null) return null

  const row = mapPickupPointRow(raw)
  const pointName = pickupPointDisplayNameFromRaw(raw)
  const apiLabel = String(raw.label ?? '').trim()
  const primaryName = pointName || (apiLabel && !/^Pick up point #\d+$/i.test(apiLabel) ? apiLabel : '')

  if (primaryName) {
    return {
      value: String(id),
      label: primaryName,
      locationName: primaryName,
      pickupTime: row?.pickupTime,
      dropTime: row?.dropTime,
      subtext:
        row?.pickupTime || row?.dropTime
          ? [
              row.pickupTime ? `Pick ${row.pickupTime}` : '',
              row.dropTime ? `Drop ${row.dropTime}` : '',
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined,
    }
  }

  if (!row) return null
  const name = String(raw.name ?? raw.location ?? raw.locationName ?? '').trim()
  const displayLabel =
    [name, row.studentLabel !== '—' ? row.studentLabel : ''].filter(Boolean).join(' - ') ||
    row.location
  const timeParts = []
  if (row.pickupTime) timeParts.push(`Pick ${row.pickupTime}`)
  if (row.dropTime) timeParts.push(`Drop ${row.dropTime}`)
  const subtext = timeParts.length ? timeParts.join(' · ') : undefined
  const fallbackLabel = displayLabel !== '—' ? displayLabel : row.studentLabel
  const locationName =
    row.location && row.location !== '—'
      ? row.location
      : name || (fallbackLabel !== '—' ? String(fallbackLabel).split(' - ')[0].trim() : '')
  return {
    value: row.id,
    label: locationName || fallbackLabel,
    locationName: locationName || undefined,
    subtext,
    pickupTime: row.pickupTime,
    dropTime: row.dropTime,
  }
}

/**
 * GET /api/transport/pickup-points/picker — all points, or search with ?q=
 * @returns {Promise<{ ok: true, options: { value: string, label: string, subtext?: string }[] } | { ok: false, error: string, options: [] }>}
 */
export async function fetchPickupPointsPicker(token, { q } = {}) {
  if (!token) {
    return { ok: false, error: 'Not signed in', options: [] }
  }
  try {
    const params = new URLSearchParams()
    const search = String(q ?? '').trim()
    if (search) params.set('q', search)
    const qs = params.toString()
    const url = `${API_BASE_URL}/api/transport/pickup-points/picker${qs ? `?${qs}` : ''}`
    const res = await fetch(url, {
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
    const rawList = extractPickupPointsPickerList(data)
    const options = rawList.map(mapPickupPointToPickerOption).filter(Boolean)
    return { ok: true, options }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, options: [] }
  }
}

/**
 * GET /api/transport/pickup-points?page=&limit=
 */
export async function fetchPickupPointsList(token, { page = 1, limit = 10 } = {}) {
  if (!token) {
    return { ok: false, error: 'Not signed in', points: [], total: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }
  try {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await fetch(`${API_BASE_URL}/api/transport/pickup-points?${qs}`, {
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
        points: [],
        total: 0,
        page,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
    const paged = extractPickupPointsList(data)
    const points = paged.list.map(mapPickupPointRow).filter(Boolean)
    return {
      ok: true,
      points,
      total: paged.total,
      page: paged.page,
      limit: paged.limit,
      hasNextPage: paged.hasNextPage,
      hasPrevPage: paged.hasPrevPage,
    }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return {
      ok: false,
      error: msg,
      points: [],
      total: 0,
      page: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

/**
 * GET /api/transport/pickup-points/:id
 */
export async function fetchPickupPointById(token, id) {
  if (!token) return { ok: false, error: 'Not signed in', point: null }
  const idSeg = encodeURIComponent(String(id))
  try {
    const res = await fetch(`${API_BASE_URL}/api/transport/pickup-points/${idSeg}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), point: null }
    }
    const point = mapDetailPayload(data)
    if (!point) return { ok: false, error: 'Invalid response from server.', point: null }
    return { ok: true, point }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, point: null }
  }
}

/**
 * POST /api/transport/pickup-points
 * Body: location (name), latitude, longitude, pickupTime, dropTime, studentId
 */
export async function createPickupPoint(token, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const studentId = Number(body.studentId)
  if (!Number.isFinite(studentId)) return { ok: false, error: 'Select a valid student.' }
  const fields = pickupPointPayloadFields(body)
  const validationError = validatePickupPointPayload(fields)
  if (validationError) return { ok: false, error: validationError }
  const payload = { ...fields, studentId }
  try {
    const res = await fetch(`${API_BASE_URL}/api/transport/pickup-points`, {
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
      return { ok: false, error: formatListError(data, res.status) }
    }
    const point = mapDetailPayload(data) ?? mapPickupPointRow(data)
    return { ok: true, point }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * PATCH /api/transport/pickup-points/:id
 */
export async function updatePickupPoint(token, id, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const idSeg = encodeURIComponent(String(id))
  const payload = pickupPointPayloadFields(body)
  const validationError = validatePickupPointPayload(payload)
  if (validationError) return { ok: false, error: validationError }
  try {
    const res = await fetch(`${API_BASE_URL}/api/transport/pickup-points/${idSeg}`, {
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
      return { ok: false, error: formatListError(data, res.status) }
    }
    const point = mapDetailPayload(data) ?? mapPickupPointRow(data)
    return { ok: true, point }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * DELETE /api/transport/pickup-points/:id
 */
export async function deletePickupPoint(token, id) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const idSeg = encodeURIComponent(String(id))
  try {
    const res = await fetch(`${API_BASE_URL}/api/transport/pickup-points/${idSeg}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    if (res.ok) return { ok: true }
    const data = await res.json().catch(() => null)
    return { ok: false, error: formatListError(data, res.status) }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}
