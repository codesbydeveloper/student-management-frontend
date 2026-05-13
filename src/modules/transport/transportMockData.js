/**
 * Phase 5 transport — frontend-only mock data (replace with API later).
 *
 * **Why Mumbai on the map?** `MOCK_ROUTE_POINTS` below is a fixed demo loop; those numbers
 * happen to be near Mumbai so the map has a realistic path before real GPS/API data exists.
 *
 * **Make the default focus dynamic (quick):** set in `.env.local`:
 *   `VITE_TRANSPORT_MAP_CENTER=yourLat,yourLng` (e.g. school gate).
 * That only changes the fallback center when a bus has no mock polyline; demo routes still
 * use the arrays here until you load polylines from your backend per `busId`.
 */

/** Shown to parents for the assigned bus (demo — backend will join driver user later). */
export const MOCK_DRIVER_INFO_BY_BUS = {
  'bus-1': {
    fullName: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    license: 'MH-04-2019-0123456',
  },
  'bus-2': {
    fullName: 'Priya Sharma',
    phone: '+91 98765 49999',
    license: 'MH-04-2020-0543210',
  },
}

export const MOCK_BUSES = {
  'bus-1': {
    id: 'bus-1',
    number: 'GJ-05-AB-1234',
    routeName: 'North campus loop',
  },
  'bus-2': {
    id: 'bus-2',
    number: 'MH-12-CD-5678',
    routeName: 'South campus loop',
  },
}

/** Lat, lng polyline per bus — simulated GPS follows this path. */
export const MOCK_ROUTE_POINTS = {
  'bus-1': [
    [19.076, 72.8777],
    [19.0772, 72.8791],
    [19.0784, 72.8806],
    [19.0795, 72.882],
    [19.0802, 72.8834],
    [19.0794, 72.8848],
    [19.0782, 72.8835],
    [19.077, 72.882],
    [19.0758, 72.8805],
    [19.076, 72.8777],
  ],
  'bus-2': [
    [19.054, 72.84],
    [19.055, 72.8415],
    [19.0562, 72.843],
    [19.0574, 72.8445],
    [19.0565, 72.846],
    [19.0552, 72.8448],
    [19.054, 72.8432],
    [19.054, 72.84],
  ],
}


export const STATIC_DRIVER_BUS_BY_USER_ID = {
  '41': 'bus-1',
}

export const DEFAULT_DRIVER_BUS_ID = 'bus-1'


export const STATIC_PARENT_BUS_BY_USER_ID = {
  '7': 'bus-1',
}

export const DEFAULT_PARENT_BUS_ID = 'bus-1'

/** Mumbai-area demo fallback if `VITE_TRANSPORT_MAP_CENTER` is unset or invalid. */
const FALLBACK_MAP_CENTER = [19.076, 72.8777]

/**
 * Map default when no polyline exists for this bus — from env or Mumbai demo.
 * @returns {[number, number]}
 */
export function getDefaultMapCenter() {
  const raw = import.meta.env.VITE_TRANSPORT_MAP_CENTER
  if (raw == null || String(raw).trim() === '') return [...FALLBACK_MAP_CENTER]
  const parts = String(raw)
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
  if (parts.length >= 2) return [parts[0], parts[1]]
  return [...FALLBACK_MAP_CENTER]
}

export function getMockBus(busId) {
  return MOCK_BUSES[busId] || null
}

export function getRouteCenter(busId) {
  const pts = MOCK_ROUTE_POINTS[busId]
  if (!pts?.length) return getDefaultMapCenter()
  const i = Math.floor(pts.length / 2)
  return pts[i]
}
