import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import {
  completeDriverTripStop,
  fetchDriverMyTransportRoutes,
  fetchDriverTripProgress,
  markDriverTripStudentStatus,
  startDriverTrip,
} from '../api/driversApi'
import { Card, CardHeader } from '../components/ui/Card'
import { Modal } from '../components/Modal'
import { Button } from '../components/ui/Button'
import { LiveTripMap } from '../components/transport/LiveTripMap'
import { useDriverTripState } from '../modules/transport/useDriverTripState'
import {
  clearDriverBackendTrip,
  loadDriverBackendTrip,
  saveDriverBackendTrip,
} from '../modules/transport/driverBackendTripStore'
import { Select } from '../components/ui/Select'

function normalizeRouteType(routeType) {
  const t = String(routeType ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (t === 'drop') return 'drop'
  if (t === 'pickup' || t === 'pick_up') return 'pick_up'
  return t || 'pick_up'
}

const STUDENT_STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  picked_up: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  dropped_off: 'bg-sky-100 text-sky-800 ring-sky-200',
  absent: 'bg-red-100 text-red-800 ring-red-200',
}

function studentStatusKey(status) {
  const s = String(status ?? 'pending')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  return STUDENT_STATUS_BADGE[s] ? s : 'pending'
}

function studentStatusLabel(status) {
  const labels = {
    pending: 'Pending',
    picked_up: 'Picked up',
    dropped_off: 'Dropped off',
    absent: 'Absent',
  }
  return labels[studentStatusKey(status)] || 'Pending'
}

function routeStopToTripStop(routeStop, order) {
  const studentNames = Array.isArray(routeStop.studentNames)
    ? routeStop.studentNames.filter(Boolean)
    : routeStop.studentName && routeStop.studentName !== '—'
      ? [routeStop.studentName]
      : []
  return {
    id: String(routeStop.id ?? `route-stop-${order}`),
    location: routeStop.location || '—',
    order,
    done: false,
    students: studentNames.map((name, idx) => ({
      id: `${routeStop.id ?? order}-s${idx}`,
      name,
      status: 'pending',
    })),
  }
}

function enrichTripProgressWithRouteStops(progress, routeStops) {
  if (!progress || !Array.isArray(routeStops) || routeStops.length === 0) return progress

  const routeTripStops = routeStops.map((s, idx) => routeStopToTripStop(s, idx + 1))
  const stops = progress.stops?.length ? progress.stops : routeTripStops
  let { currentStop, nextStop } = progress

  if (currentStop && !nextStop) {
    const matchIdx = stops.findIndex(
      (s) =>
        String(s.id) === String(currentStop.id) ||
        (s.location && currentStop.location && s.location === currentStop.location),
    )
    if (matchIdx >= 0 && matchIdx < stops.length - 1) {
      nextStop = stops[matchIdx + 1]
    } else {
      const routeIdx = routeTripStops.findIndex(
        (s) =>
          String(s.id) === String(currentStop.id) ||
          (s.location && currentStop.location && s.location === currentStop.location),
      )
      if (routeIdx >= 0 && routeIdx < routeTripStops.length - 1) {
        nextStop = routeTripStops[routeIdx + 1]
      }
    }
  }

  return { ...progress, currentStop, nextStop, stops }
}

function studentsAtStop(targetStop, routeStops) {
  if (!targetStop) return []
  if (Array.isArray(targetStop.students) && targetStop.students.length) return targetStop.students
  const routeStop = (routeStops || []).find(
    (s) =>
      String(s.id) === String(targetStop.id) ||
      (s.location && targetStop.location && s.location === targetStop.location),
  )
  if (routeStop?.students?.length) return routeStop.students
  const names = routeStop?.studentNames?.length ? routeStop.studentNames : []
  return names.map((name, idx) => ({
    id: `route-${routeStop?.id ?? idx}-s${idx}`,
    name,
    status: 'pending',
  }))
}

/**
 * Driver-only map page focused on assigned routes + current bus location.
 */
export default function DriverMapPage() {
  const { user, token } = useAuth()
  const driverUserId = user?.id != null ? String(user.id) : ''
  const {
    vehicleLabel,
    trip,
    plateContractIssue,
    gpsTripActive,
    geoError,
    idleGeoError,
    mapPos,
    onStart,
    onStop,
  } = useDriverTripState(user, token)
  const [routes, setRoutes] = useState([])
  const [routesLoading, setRoutesLoading] = useState(false)
  const [routesError, setRoutesError] = useState('')
  const [activeType, setActiveType] = useState('pick_up')
  const [activeRouteId, setActiveRouteId] = useState('')
  const [tripProgress, setTripProgress] = useState(null)
  const [tripProgressLoading, setTripProgressLoading] = useState(false)
  const [tripProgressError, setTripProgressError] = useState('')
  const [tripId, setTripId] = useState('')
  const [actionLoadingKey, setActionLoadingKey] = useState('')
  const [viewStudentsOpen, setViewStudentsOpen] = useState(false)

  const loadRoutes = useCallback(async () => {
    if (!token) {
      setRoutes([])
      setRoutesError('')
      return
    }
    setRoutesLoading(true)
    setRoutesError('')
    const res = await fetchDriverMyTransportRoutes(token)
    setRoutesLoading(false)
    if (!res.ok) {
      setRoutes([])
      setRoutesError(res.error || 'Could not load routes.')
      return
    }
    setRoutes(res.routes)
  }, [token])

  useEffect(() => {
    void loadRoutes()
  }, [loadRoutes])

  const pickupRoutes = useMemo(
    () => routes.filter((r) => normalizeRouteType(r.routeType) === 'pick_up'),
    [routes],
  )
  const dropRoutes = useMemo(
    () => routes.filter((r) => normalizeRouteType(r.routeType) === 'drop'),
    [routes],
  )
  const visibleRoutes = activeType === 'drop' ? dropRoutes : pickupRoutes

  useEffect(() => {
    if (!visibleRoutes.length) {
      setActiveRouteId('')
      return
    }
    if (!visibleRoutes.some((r) => String(r.id) === String(activeRouteId))) {
      setActiveRouteId(String(visibleRoutes[0].id))
    }
  }, [visibleRoutes, activeRouteId])

  const activeRoute = visibleRoutes.find((r) => String(r.id) === String(activeRouteId)) || null
  const stops = activeRoute?.stops || []
  const displayProgress = useMemo(
    () => enrichTripProgressWithRouteStops(tripProgress, stops),
    [tripProgress, stops],
  )
  const currentStop = displayProgress?.currentStop || null
  const nextStop = displayProgress?.nextStop || null
  const activeTargetStop = currentStop || nextStop
  const activeStopStudents = useMemo(
    () => studentsAtStop(activeTargetStop, stops),
    [activeTargetStop, stops],
  )

  const persistBackendTrip = useCallback(
    (id, routeId) => {
      const tid = String(id ?? '').trim()
      if (!driverUserId || !tid) return
      saveDriverBackendTrip(driverUserId, {
        tripId: tid,
        routeId: routeId || activeRouteId,
      })
    },
    [driverUserId, activeRouteId],
  )

  const loadTripProgress = useCallback(
    async (id) => {
      const safeId = String(id ?? tripId).trim()
      if (!token || !safeId) return
      setTripProgressLoading(true)
      setTripProgressError('')
      const res = await fetchDriverTripProgress(token, safeId)
      setTripProgressLoading(false)
      if (!res.ok) {
        setTripProgressError(res.error || 'Could not load trip progress.')
        if (driverUserId) clearDriverBackendTrip(driverUserId)
        setTripId('')
        setTripProgress(null)
        return
      }
      setTripProgress(res.progress)
      const resolvedId = String(res.progress?.tripId || safeId)
      setTripId(resolvedId)
      persistBackendTrip(resolvedId, res.progress?.routeId || activeRouteId)
    },
    [token, tripId, driverUserId, activeRouteId, persistBackendTrip],
  )

  useEffect(() => {
    if (!token || !driverUserId) return
    const saved = loadDriverBackendTrip(driverUserId)
    if (!saved?.tripId) return
    setTripId((prev) => prev || saved.tripId)
    if (saved.routeId) {
      setActiveRouteId((prev) => prev || saved.routeId)
    }
    void loadTripProgress(saved.tripId)
  }, [token, driverUserId]) // eslint-disable-line react-hooks/exhaustive-deps -- restore once per login

  const onStartTripFlow = useCallback(async () => {
    if (!activeRoute?.id) {
      toast.error('Please select a route first.')
      return
    }
    if (!trip?.active) {
      onStart()
    }
    setTripProgressLoading(true)
    setTripProgressError('')
    const res = await startDriverTrip(token, { routeId: activeRoute.id })
    setTripProgressLoading(false)
    if (!res.ok) {
      setTripProgressError(res.error || 'Could not start trip.')
      toast.error(res.error || 'Could not start trip.')
      return
    }
    setTripProgress(res.progress)
    const resolvedId = String(res.progress?.tripId || '')
    setTripId(resolvedId)
    persistBackendTrip(resolvedId, activeRoute.id)
    toast.success('Trip route started. Move to current stop.')
  }, [activeRoute?.id, onStart, token, trip?.active, persistBackendTrip])

  const onEndTrip = useCallback(() => {
    onStop()
    if (driverUserId) clearDriverBackendTrip(driverUserId)
    setTripId('')
    setTripProgress(null)
    setTripProgressError('')
  }, [onStop, driverUserId])

  const onMarkStudent = useCallback(
    async (studentId, status) => {
      if (!tripId || !activeTargetStop?.id) return
      const key = `student:${activeTargetStop.id}:${studentId}:${status}`
      setActionLoadingKey(key)
      const res = await markDriverTripStudentStatus(token, {
        tripId,
        stopId: activeTargetStop.id,
        studentId,
        status,
      })
      setActionLoadingKey('')
      if (!res.ok) {
        toast.error(res.error || 'Could not update student status.')
        return
      }
      if (res.progress) setTripProgress(res.progress)
      else await loadTripProgress(tripId)
    },
    [token, tripId, activeTargetStop?.id, loadTripProgress],
  )

  const onCompleteCurrentStop = useCallback(async () => {
    if (!tripId || !activeTargetStop?.id) return
    setActionLoadingKey('complete-stop')
    const res = await completeDriverTripStop(token, { tripId, stopId: activeTargetStop.id })
    setActionLoadingKey('')
    if (!res.ok) {
      toast.error(res.error || 'Could not mark stop complete.')
      return
    }
      if (res.progress) {
        setTripProgress(res.progress)
        const resolvedId = String(res.progress?.tripId || tripId)
        setTripId(resolvedId)
        persistBackendTrip(resolvedId, res.progress?.routeId || activeRouteId)
      } else {
        await loadTripProgress(tripId)
      }
    toast.success('Stop marked done. Next stop loaded.')
  }, [token, tripId, activeTargetStop?.id, loadTripProgress, persistBackendTrip, activeRouteId])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/driver-transport">
          <Button type="button" size="sm" variant="secondary">
            My trip
          </Button>
        </Link>
        <Link to="/driver/routes">
          <Button type="button" size="sm" variant="secondary">
            Routes
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader title="Map" subtitle="Live bus location with your assigned route details." />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned vehicle</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{vehicleLabel || '—'}</p>
              {gpsTripActive ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">Trip in progress — sharing live location</p>
              ) : (
                <p className="mt-2 text-xs text-slate-600">Start a trip on My trip to broadcast GPS to parents.</p>
              )}
              {plateContractIssue ? (
                <p className="mt-2 text-xs text-amber-800">{plateContractIssue}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {!trip?.active ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void onStartTripFlow()}
                    disabled={Boolean(plateContractIssue) || !activeRoute?.id || tripProgressLoading}
                  >
                    Start trip
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="danger" onClick={onEndTrip}>
                    End trip
                  </Button>
                )}
                <Link to="/driver-transport">
                  <Button type="button" size="sm" variant="secondary">
                    Open My trip
                  </Button>
                </Link>
                {tripId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void loadTripProgress(tripId)}
                    disabled={tripProgressLoading}
                  >
                    {tripProgressLoading ? 'Refreshing…' : 'Refresh progress'}
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex h-full flex-col rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-4">
              {tripProgressLoading && !tripProgress ? (
                <p className="text-sm text-slate-600">Loading trip progress…</p>
              ) : null}
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Next stop</p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {tripId || tripProgressLoading
                    ? activeTargetStop?.location || 'No next stop'
                    : 'Start trip to see next stop'}
                </p>
                {tripId || tripProgressLoading ? (
                  <p className="mt-2 text-sm font-medium text-indigo-800">
                    Students at this stop: {activeStopStudents.length}
                  </p>
                ) : null}
              </div>
              {tripProgressError ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {tripProgressError}
                </p>
              ) : null}
              {tripId || tripProgressLoading ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void onCompleteCurrentStop()}
                    disabled={!activeTargetStop?.id || actionLoadingKey === 'complete-stop'}
                  >
                    {actionLoadingKey === 'complete-stop' ? 'Completing…' : 'Mark as done'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setViewStudentsOpen(true)}
                    disabled={!activeTargetStop?.id || activeStopStudents.length === 0}
                  >
                    View
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeType === 'pick_up' ? 'primary' : 'secondary'}
                onClick={() => setActiveType('pick_up')}
              >
                Pick up ({pickupRoutes.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeType === 'drop' ? 'primary' : 'secondary'}
                onClick={() => setActiveType('drop')}
              >
                Drop ({dropRoutes.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void loadRoutes()}
                disabled={routesLoading}
              >
                {routesLoading ? 'Refreshing…' : 'Refresh routes'}
              </Button>
              {visibleRoutes.length > 0 ? (
                <Select
                  className="ml-auto w-auto min-w-[10rem] max-w-[14rem]"
                  value={activeRouteId}
                  onChange={(e) => setActiveRouteId(e.target.value)}
                  aria-label="Select route"
                >
                  {visibleRoutes.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.routeName}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>

            {routesError ? (
              <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
                {routesError}
              </p>
            ) : null}

            {!routesError && visibleRoutes.length === 0 ? (
              <p className="text-sm text-slate-600">
                No {activeType === 'pick_up' ? 'pick up' : 'drop'} route assigned.
              </p>
            ) : null}

            {visibleRoutes.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70">
                  <div className="overflow-x-auto">
                    <table className="app-data-table">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Location</th>
                          <th className="px-3 py-2">Student</th>
                          <th className="px-3 py-2">{activeType === 'pick_up' ? 'Pick up' : 'Drop'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stops.map((s, idx) => (
                          <tr key={`${s.id}-${idx}`}>
                            <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-900">{s.location}</td>
                            <td className="px-3 py-2 text-slate-700">
                              <p>{s.studentName}</p>
                              {Array.isArray(s.studentNames) && s.studentNames.length > 1 ? (
                                <p className="text-xs text-slate-500">{s.studentNames.join(', ')}</p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{s.timeForType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {trip?.active && geoError ? (
            <p className="text-xs text-amber-800">Geolocation: {geoError}</p>
          ) : null}
          {!trip?.active && idleGeoError ? (
            <p className="text-xs text-amber-800">Location: {idleGeoError}</p>
          ) : null}

          {mapPos ? (
            <LiveTripMap
              position={mapPos}
              label={
                activeRoute?.routeName
                  ? `${activeRoute.routeName} · ${vehicleLabel ? `Bus ${vehicleLabel}` : 'Bus'}`
                  : vehicleLabel
                    ? `Bus ${vehicleLabel}`
                    : 'Bus'
              }
              className="[&>div]:min-h-[min(70vh,32rem)] [&>div]:rounded-2xl"
            />
          ) : (
            <div
              className="flex min-h-[min(70vh,32rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-6 py-10 text-center"
              role="status"
            >
              <p className="text-sm font-medium text-slate-600">Waiting for GPS…</p>
              <p className="mt-1 text-xs text-slate-500">Allow location access in your browser.</p>
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={viewStudentsOpen}
        onClose={() => setViewStudentsOpen(false)}
        title={activeTargetStop?.location ? `Students — ${activeTargetStop.location}` : 'Students'}
        size="lg"
        hideCloseButton
        closeOnBackdrop={false}
        footer={
          <Button type="button" size="sm" onClick={() => setViewStudentsOpen(false)}>
            Done
          </Button>
        }
      >
        {activeStopStudents.length === 0 ? (
          <p className="text-sm text-slate-600">No students at this stop.</p>
        ) : (
          <div className="space-y-2">
            {activeStopStudents.map((student) => (
              <div
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>Status:</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STUDENT_STATUS_BADGE[studentStatusKey(student.status)]}`}
                    >
                      {studentStatusLabel(student.status)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={Boolean(actionLoadingKey)}
                    onClick={() => void onMarkStudent(student.id, 'picked_up')}
                  >
                    Pick up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={Boolean(actionLoadingKey)}
                    onClick={() => void onMarkStudent(student.id, 'dropped_off')}
                  >
                    Drop
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={Boolean(actionLoadingKey)}
                    onClick={() => void onMarkStudent(student.id, 'absent')}
                  >
                    Absent
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
