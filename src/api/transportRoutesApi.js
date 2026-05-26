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
    return String(o.label ?? o.name ?? o.fullName ?? o.location ?? '').trim()
  }
  return ''
}

function extractRoutesList(data) {
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
  if (Array.isArray(data.routes)) list = data.routes
  else if (Array.isArray(data.items)) list = data.items
  else if (Array.isArray(data.results)) list = data.results
  else if (Array.isArray(data.data)) list = data.data
  else if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    Array.isArray(data.data.routes)
  ) {
    list = data.data.routes
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
    data.hasNextPage ?? meta.hasNextPage ?? (Number.isFinite(totalPages) ? page < totalPages : false),
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

function extractPickupPointIds(raw) {
  if (!raw || typeof raw !== 'object') return []
  if (Array.isArray(raw.pickupPointIds)) return raw.pickupPointIds.map((id) => String(id))
  if (Array.isArray(raw.pickup_point_ids)) return raw.pickup_point_ids.map((id) => String(id))
  if (Array.isArray(raw.pickupPoints)) {
    return raw.pickupPoints
      .map((p) => (p && typeof p === 'object' ? p.id ?? p.pickupPointId : p))
      .filter((id) => id != null)
      .map((id) => String(id))
  }
  return []
}

function extractPickupPointLabels(raw) {
  if (!raw || typeof raw !== 'object') return []
  if (Array.isArray(raw.pickupPointLabels)) {
    return raw.pickupPointLabels.map((l) => String(l).trim()).filter(Boolean)
  }
  if (Array.isArray(raw.pickupPoints)) {
    return raw.pickupPoints
      .map((p) => {
        if (!p || typeof p !== 'object') return ''
        return pickText(p.label) || pickText(p.name) || pickText(p.location) || ''
      })
      .filter(Boolean)
  }
  return []
}

export const ROUTE_TYPE_LABELS = {
  pick_up: 'Pick up',
  drop: 'Drop',
}

export function mapTransportRouteRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw._id ?? raw.routeId
  if (id == null) return null

  const bus = raw.bus && typeof raw.bus === 'object' ? raw.bus : null
  const driver = raw.driver && typeof raw.driver === 'object' ? raw.driver : null

  const busId = raw.busId ?? raw.bus_id ?? bus?.id
  const driverUserId =
    raw.driverUserId ?? raw.driver_user_id ?? driver?.userId ?? driver?.id ?? driver?.user_id

  const vehicleLabel =
    pickText(raw.busPlate ?? raw.bus_plate ?? raw.vehicleNumber ?? raw.vehicle_number) ||
    pickText(bus?.plate ?? bus?.number) ||
    pickText(bus?.name ?? bus?.routeName) ||
    (busId != null ? `Bus #${busId}` : '—')

  const driverLabel =
    pickText(raw.driverName ?? raw.driver_name) ||
    pickText(driver) ||
    (driverUserId != null ? `Driver #${driverUserId}` : '—')

  const routeType = String(raw.routeType ?? raw.route_type ?? 'pick_up').trim() || 'pick_up'
  const pickupPointIds = extractPickupPointIds(raw)
  const pickupPointLabels = extractPickupPointLabels(raw)

  return {
    id: String(id),
    routeName: String(raw.routeName ?? raw.route_name ?? raw.name ?? '').trim() || '—',
    busId: busId != null ? String(busId) : '',
    driverUserId: driverUserId != null ? String(driverUserId) : '',
    routeType,
    routeTypeLabel: ROUTE_TYPE_LABELS[routeType] || routeType,
    pickupPointIds,
    vehicleLabel,
    driverLabel,
    pickupPointLabels,
  }
}

function mapDetailPayload(data) {
  if (!data || typeof data !== 'object') return null
  const row = data.route ?? data.data ?? data
  if (Array.isArray(row)) return mapTransportRouteRow(row[0])
  return mapTransportRouteRow(row)
}

function buildRouteBody(body) {
  const busId = Number(body.busId)
  const driverUserId = Number(body.driverUserId)
  const pickupPointIds = (body.pickupPointIds || []).map(Number).filter(Number.isFinite)
  return {
    routeName: String(body.routeName || '').trim(),
    busId,
    driverUserId,
    routeType: String(body.routeType || 'pick_up').trim(),
    pickupPointIds,
  }
}

function validateRouteBody(payload) {
  if (!payload.routeName) return 'Enter a route name.'
  if (!Number.isFinite(payload.busId)) return 'Select a valid vehicle.'
  if (!Number.isFinite(payload.driverUserId)) return 'Select a valid driver.'
  if (!payload.routeType) return 'Select a route type.'
  if (!payload.pickupPointIds.length) return 'Select at least one pick up point.'
  return null
}

/**
 * GET /api/transport/routes?page=&limit=
 */
export async function fetchTransportRoutesList(token, { page = 1, limit = 10 } = {}) {
  if (!token) {
    return {
      ok: false,
      error: 'Not signed in',
      routes: [],
      total: 0,
      page: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
  try {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await fetch(`${API_BASE_URL}/api/transport/routes?${qs}`, {
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
        routes: [],
        total: 0,
        page,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
    const paged = extractRoutesList(data)
    const routes = paged.list.map(mapTransportRouteRow).filter(Boolean)
    return {
      ok: true,
      routes,
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
      routes: [],
      total: 0,
      page: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

/**
 * GET /api/transport/routes/:id
 */
export async function fetchTransportRouteById(token, id) {
  if (!token) return { ok: false, error: 'Not signed in', route: null }
  const idSeg = encodeURIComponent(String(id))
  try {
    const res = await fetch(`${API_BASE_URL}/api/transport/routes/${idSeg}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatListError(data, res.status), route: null }
    }
    const route = mapDetailPayload(data)
    if (!route) return { ok: false, error: 'Invalid response from server.', route: null }
    return { ok: true, route }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, route: null }
  }
}

/**
 * POST /api/transport/routes
 */
export async function createTransportRoute(token, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const payload = buildRouteBody(body)
  const validationError = validateRouteBody(payload)
  if (validationError) return { ok: false, error: validationError }
  try {
    const res = await fetch(`${API_BASE_URL}/api/transport/routes`, {
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
    const route = mapDetailPayload(data) ?? mapTransportRouteRow(data)
    return { ok: true, route }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * PATCH /api/transport/routes/:id
 */
export async function updateTransportRoute(token, id, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const idSeg = encodeURIComponent(String(id))
  const payload = buildRouteBody(body)
  const validationError = validateRouteBody(payload)
  if (validationError) return { ok: false, error: validationError }
  try {
    const res = await fetch(`${API_BASE_URL}/api/transport/routes/${idSeg}`, {
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
    const route = mapDetailPayload(data) ?? mapTransportRouteRow(data)
    return { ok: true, route }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/**
 * DELETE /api/transport/routes/:id
 */
export async function deleteTransportRoute(token, id) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const idSeg = encodeURIComponent(String(id))
  try {
    const res = await fetch(`${API_BASE_URL}/api/transport/routes/${idSeg}`, {
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
