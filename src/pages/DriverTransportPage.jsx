import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { fetchDriverMyRoute } from '../api/driversApi'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LiveTripMap } from '../components/transport/LiveTripMap'
import { getDriverBusIdForUser } from '../modules/transport/transportAssignmentStore'
import { useTransportAssignmentRevision } from '../modules/transport/useTransportAssignmentRevision'
import { startLiveTrip, stopTrip, loadTrips, saveTrips } from '../modules/transport/transportMockStore'
import { isSocketTransportEnabled } from '../modules/transport/transportSocketConfig'
import { isDemoTransportBusKey } from '../modules/transport/transportMapConstants'
import { useDriverIdleMapGeolocation } from '../modules/transport/useDriverIdleMapGeolocation'
import { useDriverLiveTracking } from '../modules/transport/useDriverLiveTracking'
import { useTransportTrips } from '../modules/transport/useTransportTrips'
import { ROLES } from '../utils/constants'

export default function DriverTransportPage() {
  const { user, token } = useAuth()
  const trips = useTransportTrips()
  const assignRev = useTransportAssignmentRevision()

  const localBusId = useMemo(() => getDriverBusIdForUser(user), [user, assignRev])

  const [myRouteRows, setMyRouteRows] = useState([])
  const [myRouteAssignedBus, setMyRouteAssignedBus] = useState('')
  const [myRouteLoading, setMyRouteLoading] = useState(false)
  const [myRouteError, setMyRouteError] = useState('')

  useEffect(() => {
    if (!token || user?.role !== ROLES.DRIVER) {
      setMyRouteRows([])
      setMyRouteAssignedBus('')
      setMyRouteLoading(false)
      setMyRouteError('')
      return
    }
    let cancelled = false
    setMyRouteLoading(true)
    setMyRouteError('')
    void (async () => {
      const res = await fetchDriverMyRoute(token)
      if (cancelled) return
      setMyRouteLoading(false)
      if (res.ok) {
        setMyRouteRows(res.rows)
        setMyRouteAssignedBus(res.assignedBus)
      } else {
        setMyRouteRows([])
        setMyRouteAssignedBus('')
        setMyRouteError(res.error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, user?.role])

  const driverId = user?.id != null ? String(user.id) : ''

  const apiAssignedBus = String(myRouteAssignedBus ?? '').trim()
  const liveBusId = apiAssignedBus || localBusId

  /** If my-route loads after a trip started on the mock id, move the active trip to the real vehicle key so GPS uses the same busId the server resolves to `buses.plate`. */
  useEffect(() => {
    if (myRouteLoading) return
    if (!driverId) return
    const all = loadTrips()
    let changed = false
    for (const key of Object.keys(all)) {
      const t = all[key]
      if (!t?.active || String(t.driverUserId) !== String(driverId)) continue
      if (key !== liveBusId) {
        delete all[key]
        all[liveBusId] = { ...t, busId: liveBusId }
        changed = true
      }
    }
    if (changed) saveTrips(all)
  }, [myRouteLoading, liveBusId, driverId])

  const vehicleLabel = liveBusId || ''
  const trip = trips[liveBusId] && trips[liveBusId].active ? trips[liveBusId] : null

  const plateContractIssue = useMemo(() => {
    if (!token || myRouteLoading || myRouteError) return null
    if (!apiAssignedBus && isDemoTransportBusKey(localBusId)) return 'fallback-demo'
    if (apiAssignedBus && isDemoTransportBusKey(apiAssignedBus)) return 'api-demo-plate'
    return null
  }, [token, myRouteLoading, myRouteError, apiAssignedBus, localBusId])

  const socketMode = isSocketTransportEnabled()
  const gpsTripActive = Boolean(trip?.active)

  const { livePosition, socketConnected, geoError } = useDriverLiveTracking({
    busId: liveBusId,
    driverUserId: driverId,
    tripActive: gpsTripActive,
    token,
  })

  const { position: idleMapPosition, error: idleGeoError } = useDriverIdleMapGeolocation(gpsTripActive)

  /**
   * Real positions only — `null` when GPS has not produced a reading yet.
   * The page renders a placeholder instead of falling back to demo coords.
   */
  const mapPos = useMemo(() => {
    if (gpsTripActive && livePosition) return livePosition
    if (idleMapPosition) return idleMapPosition
    return null
  }, [gpsTripActive, livePosition, idleMapPosition])

  const onStart = useCallback(() => {
    if (plateContractIssue) {
      toast.error(
        plateContractIssue === 'api-demo-plate'
          ? 'Your school returned a demo vehicle id (e.g. bus-1) instead of the real registration plate. Parents join live rooms using the exact plate in buses.plate — update driver_profiles.assigned_bus / my-route to that plate.'
          : 'No vehicle from GET /api/drivers/my-route while this browser is still on a demo bus id. Parents and the server match live GPS using the exact plate in buses.plate — fix the driver assignment first, then refresh.',
      )
      return
    }
    const res = startLiveTrip(liveBusId, driverId)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    // No initial fake-coord POST. The real first ping is sent by
    // `useDriverLiveTracking` as soon as `navigator.geolocation` returns.
    toast.success(
      socketMode
        ? 'Trip started. Map follows your real GPS. Parents get bus:location over Socket.IO once your device returns a position.'
        : 'Trip started. Map follows your real GPS. Set VITE_API_URL so Socket.IO matches your backend.',
    )
  }, [liveBusId, driverId, socketMode, plateContractIssue])

  const onStop = useCallback(() => {
    const res = stopTrip(liveBusId, driverId)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('Trip ended.')
  }, [liveBusId, driverId])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="My trip"
          subtitle={
            socketMode
              ? 'While moving, GPS is sent with emit(bus:location) or POST /api/drivers/location using busId = the vehicle registration string that matches buses.plate on the server (same value as driver_profiles.assigned_bus / bus_parents.bus_label). Socket rooms are bus-<numericId> from that plate — demo ids like bus-1 will not reach parents. OpenStreetMap + Leaflet. Trip auto-ends after ~90s with no GPS updates if you leave this screen.'
              : 'Start trip sends POST /api/drivers/location with isRunning true (then ~every 15s). End trip sends one final POST with isRunning false. OpenStreetMap + Leaflet.'
          }
        />
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned vehicle</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{vehicleLabel || '—'}</p>
            {myRouteAssignedBus ? (
              <p className="mt-1 text-xs text-slate-500">
                Vehicle string from GET /api/drivers/my-route (should match buses.plate for live parents)
              </p>
            ) : null}
          </div>

          {plateContractIssue ? (
            <div
              className="rounded-2xl border border-amber-300/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              <p className="font-semibold">Live parents need the real number plate</p>
              <p className="mt-1 text-xs leading-relaxed">
                The server puts parents in Socket.IO room <span className="font-mono">bus-&lt;id&gt;</span> only
                when it can match the same plate string in <span className="font-mono">buses.plate</span>. If the
                driver GPS uses a different label (for example <span className="font-mono">bus-1</span> or a nickname),
                parents will see no live map even though you are connected.
              </p>
            </div>
          ) : null}
          <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/35 px-4 py-4 sm:px-5">
            <h3 className="text-sm font-bold text-slate-900">Families on your route</h3>
            <p className="mt-1 text-xs text-slate-600">
              From your school (GET /api/drivers/my-route). Parent login ids (users.id) and children assigned to your
              bus.
            </p>
            {myRouteLoading ? (
              <p className="mt-3 text-sm text-slate-600">Loading roster…</p>
            ) : null}
            {!myRouteLoading && myRouteError ? (
              <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
                {myRouteError}
              </p>
            ) : null}
            {!myRouteLoading && !myRouteError && myRouteRows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                No families listed yet, or your school has not linked parents to this route.
              </p>
            ) : null}
            {!myRouteLoading && myRouteRows.length > 0 ? (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200/80 bg-white/90">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Parent (users.id)</th>
                      <th className="px-3 py-2">Parent name</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myRouteRows.map((row, idx) => (
                      <tr key={`${row.parentUserId || 'p'}-${row.studentId || idx}`}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-800">
                          {row.parentUserId || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-900">{row.parentName}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-900">{row.studentName}</span>
                          {row.studentId ? (
                            <span className="ml-1 font-mono text-xs text-slate-500">· {row.studentId}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-700">
                          {[row.className, row.section].filter(Boolean).join(row.className && row.section ? ' · ' : '') ||
                            '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {!trip?.active ? (
              <Button type="button" onClick={onStart} disabled={Boolean(plateContractIssue)}>
                Start trip
              </Button>
            ) : (
              <Button type="button" variant="danger" onClick={onStop}>
                End trip
              </Button>
            )}
          </div>

          {trip?.active ? (
            <div className="space-y-1 text-xs text-slate-500">
              <p>
                Live GPS (your device) ·{' '}
                {socketMode ? (
                  <>socket {socketConnected ? 'connected' : 'connecting…'} · </>
                ) : (
                  <>no relay URL (parents on other devices need Socket.IO server) · </>
                )}
                last update{' '}
                {new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(trip.lastUpdateTs)}
              </p>
              {geoError ? <p className="text-amber-800">Geolocation: {geoError}</p> : null}
            </div>
          ) : (
            <div className="space-y-1 text-xs text-slate-500">
              <p>
                No active trip yet. The map shows your device location when you allow it. If GPS is not
                available, the map stays empty — no fake position is shown.
              </p>
              {idleGeoError ? <p className="text-amber-800">Location for map: {idleGeoError}</p> : null}
            </div>
          )}

          {mapPos ? (
            <LiveTripMap position={mapPos} label={vehicleLabel ? `Bus ${vehicleLabel}` : 'Bus'} />
          ) : (
            <div
              className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-6 py-10 text-center"
              role="status"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">Waiting for GPS</p>
                <p className="mt-1 text-xs text-slate-500">
                  Allow location access on this device to see the map. The first real GPS reading will
                  appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
