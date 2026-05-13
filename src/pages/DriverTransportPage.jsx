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
import { startLiveTrip, stopTrip } from '../modules/transport/transportMockStore'
import { isSocketTransportEnabled } from '../modules/transport/transportSocketConfig'
import { useDriverIdleMapGeolocation } from '../modules/transport/useDriverIdleMapGeolocation'
import { useDriverLiveTracking } from '../modules/transport/useDriverLiveTracking'
import { useTransportTrips } from '../modules/transport/useTransportTrips'
import { ROLES } from '../utils/constants'

export default function DriverTransportPage() {
  const { user, token } = useAuth()
  const trips = useTransportTrips()
  const assignRev = useTransportAssignmentRevision()

  const busId = useMemo(() => getDriverBusIdForUser(user), [user, assignRev])

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

  const vehicleLabel = myRouteAssignedBus || busId || ''
  const trip = trips[busId] && trips[busId].active ? trips[busId] : null
  const driverId = user?.id != null ? String(user.id) : ''

  const socketMode = isSocketTransportEnabled()
  const gpsTripActive = Boolean(trip?.active)

  const { livePosition, socketConnected, geoError } = useDriverLiveTracking({
    busId,
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
    const res = startLiveTrip(busId, driverId)
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
  }, [busId, driverId, socketMode])

  const onStop = useCallback(() => {
    const res = stopTrip(busId, driverId)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('Trip ended.')
  }, [busId, driverId])

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
              ? 'While moving, GPS is sent with emit(bus:location) when the socket is connected, otherwise POST /api/drivers/location (same body). End trip sends isRunning false the same way. Parents receive bus:location from the server. Socket host = VITE_API_URL unless VITE_SOCKET_TRANSPORT_URL is set. OpenStreetMap + Leaflet. Trip auto-ends after ~90s with no GPS updates if you leave this screen.'
              : 'Start trip sends POST /api/drivers/location with isRunning true (then ~every 15s). End trip sends one final POST with isRunning false. OpenStreetMap + Leaflet.'
          }
        />
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned vehicle</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{vehicleLabel || '—'}</p>
            {myRouteAssignedBus ? (
              <p className="mt-1 text-xs text-slate-500">Vehicle id from GET /api/drivers/my-route</p>
            ) : null}
          </div>

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
              <Button type="button" onClick={onStart}>
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
