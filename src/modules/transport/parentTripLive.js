/** Driver has started today's trip (from server — same as POST /api/drivers/my-trips/start). */
const STARTED_TRIP_STATUSES = new Set(['running', 'in_progress', 'started'])

const ENDED_TRIP_STATUSES = new Set([
  'completed',
  'finished',
  'ended',
  'cancelled',
  'stopped',
  'inactive',
  'not_started',
  'pending',
  'scheduled',
  'idle',
  'closed',
  'done',
  'complete',
])

const ENDED_LIVE_ENVELOPE = new Set([
  'trip_ended',
  'trip_completed',
  'trip_finished',
  'no_trip',
  'not_running',
  'idle',
  'empty',
])

/**
 * True when the driver has ended or completed the trip (or GPS stream stopped).
 */
export function isParentBusTripEnded(trip, live, liveEnvelopeStatus, studentTripActive) {
  const status = String(trip?.status ?? '').trim().toLowerCase()
  const envelope = String(liveEnvelopeStatus ?? '').trim().toLowerCase()

  if (studentTripActive === false) return true
  if (ENDED_TRIP_STATUSES.has(status)) return true
  if (ENDED_LIVE_ENVELOPE.has(envelope)) return true

  if (trip?.endedAt || trip?.completedAt) return true
  if (trip?.isActive === false) return true

  if (live?.tripActive === false) return true
  if (live?.isRunning === false && (live.isRunningExplicit || trip?.id != null)) return true

  return false
}

/**
 * True when the driver has started the trip and it is still running.
 * Does not use `startedAt` alone — that stays set after end on some APIs.
 */
export function isParentBusTripStarted(trip, liveEnvelopeStatus, live, studentTripActive) {
  if (isParentBusTripEnded(trip, live, liveEnvelopeStatus, studentTripActive)) return false

  const status = String(trip?.status ?? '').trim().toLowerCase()
  const envelope = String(liveEnvelopeStatus ?? '').trim().toLowerCase()

  if (STARTED_TRIP_STATUSES.has(status)) return true

  if (envelope === 'trip_running' || envelope === 'running' || envelope === 'trip_active') {
    if (live?.isRunning === true) return true
    if (STARTED_TRIP_STATUSES.has(status)) return true
    return false
  }

  if (live?.isRunning === true && STARTED_TRIP_STATUSES.has(status)) return true

  // "active" on some APIs means route assigned, not trip started.
  if (status === 'active') return false

  return false
}

const TERMINAL_STUDENT_STATUSES = new Set(['picked_up', 'absent', 'dropped_off'])

/**
 * picked_up / absent / dropped_off from API can linger after the driver starts a new trip.
 * Only show those messages when the trip is not live, or this stop is completed on the current run.
 *
 * @param {string | undefined} studentStatus
 * @param {string | undefined} yourStopStatus
 * @param {boolean} [tripLive]
 * @returns {'picked_up' | 'absent' | 'dropped_off' | null}
 */
export function parentTerminalStudentStatusForUi(studentStatus, yourStopStatus, tripLive = false) {
  const student = String(studentStatus ?? '').trim().toLowerCase()
  if (!TERMINAL_STUDENT_STATUSES.has(student)) return null
  const stop = String(yourStopStatus ?? '').trim().toLowerCase()
  if (tripLive && stop !== 'completed') return null
  return student
}

/** Trust unread bell safety alert for main status (arrives before my-bus-live may update). */
export function parentBellTerminalStudentStatus(studentStatus) {
  const student = String(studentStatus ?? '').trim().toLowerCase()
  if (!TERMINAL_STUDENT_STATUSES.has(student)) return null
  return student
}

/** Parent has at least one child on a bus route with pick-up configured. */
export function parentHasTransportAssignment({
  pickupAssigned,
  pickupStudents,
  liveStudents,
  selectedLive,
} = {}) {
  if (pickupAssigned) return true
  if (Array.isArray(pickupStudents) && pickupStudents.length > 0) return true
  if (Array.isArray(liveStudents) && liveStudents.length > 0) {
    return liveStudents.some(
      (s) => s?.bus || s?.pickupPoint || s?.trip?.id != null || s?.trip?.routeId != null,
    )
  }
  if (selectedLive?.pickupPoint || selectedLive?.bus) return true
  return false
}
