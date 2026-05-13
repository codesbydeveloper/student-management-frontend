import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchParentMyDriver } from '../api/parentsApi'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ParentBusLiveMap } from '../components/transport/ParentBusLiveMap'
import { getParentAssignedBusId } from '../modules/transport/transportAssignmentStore'
import { useTransportAssignmentRevision } from '../modules/transport/useTransportAssignmentRevision'
import { isSocketTransportEnabled } from '../modules/transport/transportSocketConfig'
import { useParentBusLiveMap } from '../modules/transport/useParentBusLiveMap'
import { ROLES } from '../utils/constants'

export default function ParentBusTrackingPage() {
  const { user, token } = useAuth()
  const assignRev = useTransportAssignmentRevision()

  const busId = useMemo(() => getParentAssignedBusId(user), [user, assignRev])
  const socketMode = isSocketTransportEnabled()

  const {
    position: mapPos,
    routeLine,
    sourceLabel,
    isDriverLive,
    socketPoint,
    joinedInfo,
    joinedRoomMissing,
    connError,
    hasFreshPoint,
  } = useParentBusLiveMap(busId, token)

  const [apiDriverRows, setApiDriverRows] = useState([])

  useEffect(() => {
    if (!token || user?.role !== ROLES.PARENT) {
      setApiDriverRows([])
      return
    }
    let cancelled = false
    void (async () => {
      const res = await fetchParentMyDriver(token)
      if (cancelled) return
      if (res.ok) setApiDriverRows(res.rows)
      else setApiDriverRows([])
    })()
    return () => {
      cancelled = true
    }
  }, [token, user?.role])

  const apiDriverRow = useMemo(() => {
    if (!apiDriverRows.length) return null
    const match = apiDriverRows.find((r) => String(r.assignedBus) === String(busId))
    return match ?? apiDriverRows[0]
  }, [apiDriverRows, busId])

  /** Vehicle label comes only from the real /my-driver row; falls back to the assignment id. */
  const vehicleLabel = apiDriverRow?.assignedBus || busId || '—'

  const driver = apiDriverRow
    ? {
        fullName: apiDriverRow.driverName,
        phone: apiDriverRow.phone,
        license: apiDriverRow.licenseNumber,
      }
    : null

  const lastUpdatedMs = useMemo(() => {
    if (socketPoint?.receivedAt) return socketPoint.receivedAt
    if (socketPoint?.ts && Number.isFinite(Number(socketPoint.ts))) return Number(socketPoint.ts)
    return null
  }, [socketPoint])

  const tripLooksLive = Boolean(isDriverLive)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/parent-dashboard">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-teal-200/80 bg-white !text-teal-900 hover:border-teal-300 hover:bg-teal-50"
          >
            Family dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Bus tracking"
          subtitle={
            socketMode
              ? 'Live map driven entirely by Socket.IO bus:location. The last point you see is real GPS — either a live update or the position the driver was at when the previous trip ended.'
              : 'Same-browser demo. Set VITE_API_URL so Socket.IO matches your backend.'
          }
        />

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bus</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{vehicleLabel}</p>
              {apiDriverRow ? (
                <p className="mt-1 text-xs text-slate-500">Vehicle id from your school</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Driver</p>
              <p className="mt-1 font-semibold text-slate-900">{driver?.fullName ?? '—'}</p>
              <p className="mt-1 text-sm text-slate-600">{driver?.phone ?? ''}</p>
              {driver?.license ? (
                <p className="mt-1 text-xs text-slate-500">License {driver.license}</p>
              ) : null}
            </div>
          </div>

          {tripLooksLive ? (
            <div
              className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 to-teal-50/80 px-4 py-3.5 shadow-sm ring-1 ring-emerald-600/10"
              role="status"
            >
              <p className="text-sm font-bold tracking-tight text-emerald-950">Bus is on the way</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-900/90">
                Your driver is sharing live location. The map updates as new positions arrive over the
                live channel.
              </p>
            </div>
          ) : socketPoint && !hasFreshPoint ? (
            <div
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              role="status"
            >
              Showing where the driver ended the last trip
            </div>
          ) : (
            <div
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600 ring-1 ring-slate-200"
              role="status"
            >
              No live trip right now
            </div>
          )}

          {socketMode && connError ? (
            <p className="text-xs text-amber-800" role="status">
              Live channel unavailable: {connError}. We&apos;ll keep retrying.
            </p>
          ) : null}

          {socketMode && joinedRoomMissing ? (
            <p className="text-xs text-slate-500" role="status">
              The school server hasn&apos;t opened a live room for your bus yet (the driver may not have
              started the trip). The map will switch to live updates automatically once the driver pings
              their location.
            </p>
          ) : null}

          {socketMode && joinedInfo?.room ? (
            <p className="text-[11px] text-slate-400">
              Joined live room <span className="font-semibold text-slate-500">{joinedInfo.room}</span>
              {joinedInfo.busId != null ? <> · bus id {String(joinedInfo.busId)}</> : null}
            </p>
          ) : null}

          <p className="text-xs text-slate-500">
            {sourceLabel}
            {lastUpdatedMs != null ? (
              <>
                {' '}
                · last update{' '}
                {new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(lastUpdatedMs)}
              </>
            ) : null}
          </p>

          {mapPos ? (
            <ParentBusLiveMap
              position={mapPos}
              routeLine={routeLine}
              label={vehicleLabel ? `Bus ${vehicleLabel}` : 'Assigned route'}
            />
          ) : (
            <div
              className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-6 py-10 text-center"
              role="status"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">No location to show yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  The map will appear here as soon as your driver shares their first GPS reading. After
                  the next trip ends we&apos;ll remember the last position so you always see where the bus
                  finished.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
