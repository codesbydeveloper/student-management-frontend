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
import { Button } from '../components/ui/Button'
import { LiveTripMap } from '../components/transport/LiveTripMap'
import { useDriverTripState } from '../modules/transport/useDriverTripState'
import { Select } from '../components/ui/Select'

function normalizeRouteType(routeType) {
  const t = String(routeType ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (t === 'drop') return 'drop'
  if (t === 'pickup' || t === 'pick_up') return 'pick_up'
  return t || 'pick_up'
}

/**
 * Driver-only map page focused on assigned routes + current bus location.
 */
export default function DriverMapPage() {
  const { user, token } = useAuth()
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
  const currentStop = tripProgress?.currentStop || null
  const nextStop = tripProgress?.nextStop || null

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
        return
      }
      setTripProgress(res.progress)
      setTripId(String(res.progress?.tripId || safeId))
    },
    [token, tripId],
  )

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
    setTripId(String(res.progress?.tripId || ''))
    toast.success('Trip route started. Move to current stop.')
  }, [activeRoute?.id, onStart, token, trip?.active])

  const onMarkStudent = useCallback(
    async (studentId, status) => {
      if (!tripId || !currentStop?.id) return
      const key = `student:${studentId}:${status}`
      setActionLoadingKey(key)
      const res = await markDriverTripStudentStatus(token, {
        tripId,
        stopId: currentStop.id,
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
    [token, tripId, currentStop?.id, loadTripProgress],
  )

  const onCompleteCurrentStop = useCallback(async () => {
    if (!tripId || !currentStop?.id) return
    setActionLoadingKey('complete-stop')
    const res = await completeDriverTripStop(token, { tripId, stopId: currentStop.id })
    setActionLoadingKey('')
    if (!res.ok) {
      toast.error(res.error || 'Could not mark stop complete.')
      return
    }
    if (res.progress) {
      setTripProgress(res.progress)
      setTripId(String(res.progress?.tripId || tripId))
    } else {
      await loadTripProgress(tripId)
    }
    toast.success('Stop marked done. Next stop loaded.')
  }, [token, tripId, currentStop?.id, loadTripProgress])

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
                <Button type="button" size="sm" variant="danger" onClick={onStop}>
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

          {tripId ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Current stop</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{currentStop?.location || '—'}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Students to handle: {Array.isArray(currentStop?.students) ? currentStop.students.length : 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next stop</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{nextStop?.location || 'No next stop'}</p>
                </div>
              </div>
              {tripProgressError ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {tripProgressError}
                </p>
              ) : null}
              {currentStop?.students?.length ? (
                <div className="mt-3 space-y-2">
                  {currentStop.students.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/80 bg-white px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500">Status: {s.status || 'pending'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={Boolean(actionLoadingKey)}
                          onClick={() => void onMarkStudent(s.id, 'picked_up')}
                        >
                          Picked up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={Boolean(actionLoadingKey)}
                          onClick={() => void onMarkStudent(s.id, 'absent')}
                        >
                          Absent
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={Boolean(actionLoadingKey)}
                          onClick={() => void onMarkStudent(s.id, 'dropped_off')}
                        >
                          Dropped
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void onCompleteCurrentStop()}
                  disabled={!currentStop?.id || actionLoadingKey === 'complete-stop'}
                >
                  {actionLoadingKey === 'complete-stop' ? 'Completing…' : 'Mark current stop done'}
                </Button>
              </div>
            </div>
          ) : null}

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
              <Button type="button" size="sm" variant="secondary" onClick={() => void loadRoutes()} disabled={routesLoading}>
                {routesLoading ? 'Refreshing…' : 'Refresh routes'}
              </Button>
            </div>

            {routesError ? (
              <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
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
                <div className="max-w-sm">
                  <Select
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
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
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
    </div>
  )
}
