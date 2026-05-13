import {
  DEFAULT_DRIVER_BUS_ID,
  DEFAULT_PARENT_BUS_ID,
  STATIC_DRIVER_BUS_BY_USER_ID,
  STATIC_PARENT_BUS_BY_USER_ID,
} from './transportMockData'

const STORAGE_KEY = 'scs_transport_assignments_v1'
const EVENT = 'scs-transport-assignments'

export function notifyTransportAssignmentListeners() {
  window.dispatchEvent(new CustomEvent(EVENT))
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { parentBus: {}, driverBus: {} }
    const p = JSON.parse(raw)
    return {
      parentBus: typeof p.parentBus === 'object' && p.parentBus ? p.parentBus : {},
      driverBus: typeof p.driverBus === 'object' && p.driverBus ? p.driverBus : {},
    }
  } catch {
    return { parentBus: {}, driverBus: {} }
  }
}

export function loadAssignmentOverrides() {
  return loadRaw()
}

function saveRaw(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  notifyTransportAssignmentListeners()
}

/** Effective bus for a signed-in parent (`users.id` from JWT). */
export function getParentAssignedBusId(user) {
  const key = user?.id != null ? String(user.id) : ''
  if (!key) return DEFAULT_PARENT_BUS_ID
  const overrides = loadRaw().parentBus
  if (overrides[key]) return overrides[key]
  return STATIC_PARENT_BUS_BY_USER_ID[key] || DEFAULT_PARENT_BUS_ID
}

/** Effective bus for a signed-in driver (`users.id` from JWT). */
export function getDriverBusIdForUser(user) {
  const key = user?.id != null ? String(user.id) : ''
  if (!key) return DEFAULT_DRIVER_BUS_ID
  const overrides = loadRaw().driverBus
  if (overrides[key]) return overrides[key]
  return STATIC_DRIVER_BUS_BY_USER_ID[key] || DEFAULT_DRIVER_BUS_ID
}

export function setParentBusForUser(parentUserId, busId) {
  const uid = String(parentUserId ?? '').trim()
  const bid = String(busId ?? '').trim()
  if (!uid || !bid) {
    return { ok: false, error: 'Choose a valid parent user id and bus.' }
  }
  const data = loadRaw()
  data.parentBus[uid] = bid
  saveRaw(data)
  return { ok: true }
}

export function setDriverBusForUser(driverUserId, busId) {
  const uid = String(driverUserId ?? '').trim()
  const bid = String(busId ?? '').trim()
  if (!uid || !bid) {
    return { ok: false, error: 'Choose a valid driver user id and bus.' }
  }
  const data = loadRaw()
  data.driverBus[uid] = bid
  saveRaw(data)
  return { ok: true }
}

export function clearParentBusOverride(parentUserId) {
  const uid = String(parentUserId ?? '').trim()
  if (!uid) return
  const data = loadRaw()
  delete data.parentBus[uid]
  saveRaw(data)
}

export function clearDriverBusOverride(driverUserId) {
  const uid = String(driverUserId ?? '').trim()
  if (!uid) return
  const data = loadRaw()
  delete data.driverBus[uid]
  saveRaw(data)
}

export function resetAllTransportAssignmentOverrides() {
  localStorage.removeItem(STORAGE_KEY)
  notifyTransportAssignmentListeners()
}

export function subscribeTransportAssignments(callback) {
  const fn = () => callback()
  window.addEventListener(EVENT, fn)
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY || e.key === null) callback()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener('storage', onStorage)
  }
}
