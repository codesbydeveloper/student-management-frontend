import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LiveTripMap } from '../components/transport/LiveTripMap'
import { DRIVER_MY_ROUTE_PAGE_SIZE, useDriverTripState } from '../modules/transport/useDriverTripState'

export default function DriverTransportPage() {
  const { user, token } = useAuth()
  const {
    myRouteRows,
    myRouteLoading,
    myRouteError,
    myRouteTotal,
    myRouteTotalPages,
    myRouteSafePage,
    goMyRoutePrev,
    goMyRouteNext,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        <Link to="/driver/map">
          <Button type="button" size="sm" variant="secondary">
            Map
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader title="My trip" />
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned vehicle</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{vehicleLabel || '—'}</p>
          </div>

          <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/35 px-4 py-4 sm:px-5">
            <h3 className="text-sm font-bold text-slate-900">Families on your route</h3>
            {myRouteLoading ? (
              <p className="mt-3 text-sm text-slate-600">Loading roster…</p>
            ) : null}
            {!myRouteLoading && myRouteError ? (
              <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
                {myRouteError}
              </p>
            ) : null}
            {!myRouteLoading && !myRouteError && myRouteTotal === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                No families listed yet, or your school has not linked parents to this route.
              </p>
            ) : null}
            {!myRouteLoading && !myRouteError && myRouteTotal > 0 ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Sr No</th>
                        <th className="px-3 py-2">Parent name</th>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myRouteRows.map((row, idx) => (
                        <tr key={`${row.parentUserId || 'p'}-${row.studentId || idx}-${(myRouteSafePage - 1) * DRIVER_MY_ROUTE_PAGE_SIZE + idx}`}>
                          <td className="px-3 py-2 tabular-nums text-slate-800">
                            {(myRouteSafePage - 1) * DRIVER_MY_ROUTE_PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-3 py-2 text-slate-900">{row.parentName}</td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-900">{row.studentName}</span>
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
                <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-gradient-to-r from-slate-50/90 to-indigo-50/20 px-4 py-3.5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">
                    Showing{' '}
                    <span className="text-slate-900">
                      {myRouteTotal === 0
                        ? '0'
                        : `${(myRouteSafePage - 1) * DRIVER_MY_ROUTE_PAGE_SIZE + 1}–${Math.min(myRouteSafePage * DRIVER_MY_ROUTE_PAGE_SIZE, myRouteTotal)}`}
                    </span>{' '}
                    of <span className="text-slate-900">{myRouteTotal}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" disabled={myRouteSafePage <= 1} onClick={goMyRoutePrev}>
                      Previous
                    </Button>
                    <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
                      {myRouteSafePage} / {myRouteTotalPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={myRouteSafePage >= myRouteTotalPages}
                      onClick={goMyRouteNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
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

          {trip?.active && geoError ? (
            <p className="text-xs text-amber-800">Geolocation: {geoError}</p>
          ) : null}
          {!trip?.active && idleGeoError ? (
            <p className="text-xs text-amber-800">Location: {idleGeoError}</p>
          ) : null}

          {mapPos ? (
            <LiveTripMap position={mapPos} label={vehicleLabel ? `Bus ${vehicleLabel}` : 'Bus'} />
          ) : (
            <div
              className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-6 py-10 text-center"
              role="status"
            >
              <p className="text-sm font-medium text-slate-600">Waiting for GPS…</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
