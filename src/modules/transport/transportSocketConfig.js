import { API_BASE_URL } from '../../utils/constants'

/**
 * Live transport — Socket.IO on the **same host** as the REST API by default.
 *
 * **Backend (Express + Socket.IO):**
 * - URL: same as `VITE_API_URL` / `API_BASE_URL` (e.g. `http://localhost:8000`).
 * - Path: `/socket.io` (default; set explicitly for clarity).
 * - Auth: `io(url, { auth: { token: jwt } })` — same Bearer as REST.
 * - Parent: server may auto-join `bus-<numericId>`; optional `socket.emit('subscribe:bus', { busId: <number> })`.
 * - Listen: `bus:location` — `{ lat, lng, speed, busId, driverUserId, ts, isRunning, recordedAt?, busNumericId? }`.
 * - Driver: may **`emit('bus:location', { lat, lng, speed, busId, ts, isRunning })`** with optional ack; server uses the same save path as REST. This app **emits when the socket is connected** and **POSTs as fallback** if offline, ack `ok: false`, or no ack in time.
 *
 * **Override:** set `VITE_SOCKET_TRANSPORT_URL` if the socket is on another origin (e.g. old relay on :3001).
 */

/** Emit interval aligned with SOW (10–15s). */
export const DRIVER_LOCATION_EMIT_MS = 15_000

/** Canonical names for the school backend; `bus-location` kept for optional local relay. */
export const SOCKET_EVENTS = {
  /** Server → clients in bus room (primary). */
  BUS_LOCATION: 'bus:location',
  /** Legacy relay / older servers. */
  BUS_LOCATION_LEGACY: 'bus-location',
  /** Client → server: join or refresh subscription (`busId` numeric from `buses.id`, or string plate if server allows). */
  SUBSCRIBE_BUS: 'subscribe:bus',
  /** Server ack after join (optional UI / logging). */
  JOINED: 'joined',
}

const SOCKET_IO_PATH = '/socket.io'

/**
 * Base URL for Socket.IO (no trailing slash).
 * Defaults to API host so `io(API_BASE_URL, { path: '/socket.io' })` matches the bundled Express server.
 */
export function getSocketTransportUrl() {
  const raw = import.meta.env.VITE_SOCKET_TRANSPORT_URL
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  return API_BASE_URL
}

/** Options passed to `io(url, opts)` for the school backend. */
export function getSocketIOClientOptions(token) {
  return {
    path: SOCKET_IO_PATH,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    auth: token ? { token } : {},
  }
}

export function isSocketTransportEnabled() {
  return Boolean(getSocketTransportUrl())
}
