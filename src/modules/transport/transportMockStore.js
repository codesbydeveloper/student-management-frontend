import { MOCK_ROUTE_POINTS, getRouteCenter } from './transportMockData'

export const TRANSPORT_STORAGE_KEY = 'scs_transport_mock_v1'

/** Simulated GPS interval (SOW: 10–15s). */
export const MOCK_GPS_INTERVAL_MS = 15_000

/** Demo auto-end when no position updates (driver closed app / lost connection). */
export const MOCK_INACTIVITY_AUTO_END_MS = 90_000

const EVENT = 'scs-transport-mock'

export function notifyTransportMockListeners() {
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function loadTrips() {
  try {
    const raw = localStorage.getItem(TRANSPORT_STORAGE_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw)
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {}
  } catch {
    return {}
  }
}

export function saveTrips(trips) {
  localStorage.setItem(TRANSPORT_STORAGE_KEY, JSON.stringify(trips))
  notifyTransportMockListeners()
}

/**
 * @param {string} busId
 * @returns {{ active: boolean, driverUserId: string, busId: string, routeIndex: number, lastLat: number, lastLng: number, lastUpdateTs: number, startedAt: number } | null}
 */
export function getTripForBus(busId) {
  const all = loadTrips()
  const t = all[busId]
  if (!t || !t.active) return null
  return t
}

export function pruneStaleTrips() {
  const now = Date.now()
  const trips = loadTrips()
  let changed = false
  for (const busId of Object.keys(trips)) {
    const t = trips[busId]
    if (t?.active && now - (t.lastUpdateTs || 0) > MOCK_INACTIVITY_AUTO_END_MS) {
      delete trips[busId]
      changed = true
    }
  }
  if (changed) {
    saveTrips(trips)
  }
}

/**
 * @param {string} busId
 * @param {string} driverUserId
 */
export function startTrip(busId, driverUserId) {
  const trips = loadTrips()
  const existing = trips[busId]
  if (existing?.active && String(existing.driverUserId) !== String(driverUserId)) {
    return { ok: false, error: 'This bus already has an active trip by another driver.' }
  }
  const pts = MOCK_ROUTE_POINTS[busId]
  const hasRoute = Boolean(pts?.length)
  const [lat, lng] = hasRoute ? pts[0] : getRouteCenter(busId)
  const now = Date.now()
  trips[busId] = {
    active: true,
    busId,
    driverUserId: String(driverUserId),
    routeIndex: 0,
    lastLat: lat,
    lastLng: lng,
    lastUpdateTs: now,
    startedAt: now,
    /** When true, demo advances along `MOCK_ROUTE_POINTS` on an interval. */
    mockAdvance: hasRoute,
  }
  saveTrips(trips)
  return { ok: true }
}

/**
 * Start trip for Socket.IO + real GPS: no mock polyline stepping (positions come from geolocation).
 * @param {string} busId
 * @param {string} driverUserId
 */
export function startLiveTrip(busId, driverUserId) {
  const trips = loadTrips()
  const existing = trips[busId]
  if (existing?.active && String(existing.driverUserId) !== String(driverUserId)) {
    return { ok: false, error: 'This bus already has an active trip by another driver.' }
  }
  const now = Date.now()
  const [lat, lng] = getRouteCenter(busId)
  trips[busId] = {
    active: true,
    busId,
    driverUserId: String(driverUserId),
    routeIndex: 0,
    lastLat: lat,
    lastLng: lng,
    lastUpdateTs: now,
    startedAt: now,
    mockAdvance: false,
  }
  saveTrips(trips)
  return { ok: true }
}

/**
 * Update last position from browser geolocation (same-tab parents read via `useTransportTrips`).
 * @param {string} busId
 * @param {string} driverUserId
 * @param {number} lat
 * @param {number} lng
 */
export function ingestLiveDriverPosition(busId, driverUserId, lat, lng) {
  const trips = loadTrips()
  const t = trips[busId]
  if (!t?.active || String(t.driverUserId) !== String(driverUserId)) {
    return { ok: false }
  }
  const nlat = Number(lat)
  const nlng = Number(lng)
  if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) {
    return { ok: false }
  }
  trips[busId] = {
    ...t,
    lastLat: nlat,
    lastLng: nlng,
    lastUpdateTs: Date.now(),
  }
  saveTrips(trips)
  return { ok: true }
}

/**
 * @param {string} busId
 * @param {string} driverUserId
 */
export function stopTrip(busId, driverUserId) {
  const trips = loadTrips()
  const t = trips[busId]
  if (!t?.active) {
    return { ok: false, error: 'No active trip for this bus.' }
  }
  if (String(t.driverUserId) !== String(driverUserId)) {
    return { ok: false, error: 'Only the driver who started this trip can end it.' }
  }
  delete trips[busId]
  saveTrips(trips)
  return { ok: true }
}

/**
 * Advance one step along mock route (simulates GPS ping).
 * @param {string} busId
 */
export function advanceTripPosition(busId) {
  const trips = loadTrips()
  const t = trips[busId]
  if (!t?.active) return { ok: false }
  if (t.mockAdvance === false) return { ok: false }
  const pts = MOCK_ROUTE_POINTS[busId]
  if (!pts?.length) return { ok: false }
  const nextIdx = (t.routeIndex + 1) % pts.length
  const [lat, lng] = pts[nextIdx]
  const now = Date.now()
  trips[busId] = {
    ...t,
    routeIndex: nextIdx,
    lastLat: lat,
    lastLng: lng,
    lastUpdateTs: now,
  }
  saveTrips(trips)
  return { ok: true, lat, lng }
}

export function subscribeTransportMock(callback) {
  const onEvt = () => callback()
  const onStorage = (e) => {
    if (e.key === TRANSPORT_STORAGE_KEY || e.key === null) callback()
  }
  window.addEventListener(EVENT, onEvt)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onEvt)
    window.removeEventListener('storage', onStorage)
  }
}
