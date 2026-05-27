import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LiveTripMap } from '../components/transport/LiveTripMap'
import { useDriverTripState } from '../modules/transport/useDriverTripState'

/**
 * Driver-only: full-screen live map (GPS + bus marker).
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
        <CardHeader title="Map" />
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned vehicle</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{vehicleLabel || '—'}</p>
            {gpsTripActive ? (
              <p className="mt-2 text-xs font-medium text-emerald-700">Trip in progress — sharing live location</p>
            ) : (
              <p className="mt-2 text-xs text-slate-600">Start a trip on My trip to broadcast GPS to parents.</p>
            )}
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
            <Link to="/driver-transport">
              <Button type="button" variant="secondary">
                Open My trip
              </Button>
            </Link>
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
              label={vehicleLabel ? `Bus ${vehicleLabel}` : 'Bus'}
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
