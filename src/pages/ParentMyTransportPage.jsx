import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchParentMyTransport } from '../api/parentsApi'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ROLES } from '../utils/constants'

export default function ParentMyTransportPage() {
  const { user, token } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTransport = useCallback(async () => {
    if (!token || user?.role !== ROLES.PARENT) {
      setRows([])
      setError('')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetchParentMyTransport(token)
    setLoading(false)
    if (!res.ok) {
      setRows([])
      setError(res.error || 'Could not load transport details.')
      return
    }
    setRows(res.rows)
  }, [token, user?.role])

  useEffect(() => {
    void loadTransport()
  }, [loadTransport])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        <Link to="/parent-bus">
          <Button type="button" size="sm" variant="secondary">
            Bus tracking
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Routes"
          subtitle="Driver, bus, route, pick-up location, and scheduled time for each of your children."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading || !token}
              onClick={() => void loadTransport()}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          }
        />
        <div className="border-t border-slate-100 px-4 py-6 sm:px-6">
          {loading && rows.length === 0 && !error ? (
            <p className="text-sm text-slate-600">Loading transport details…</p>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <p>{error}</p>
              <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => void loadTransport()}>
                Retry
              </Button>
            </div>
          ) : null}

          {!loading && !error && rows.length === 0 ? (
            <p className="text-sm text-slate-600">
              No transport routes are linked to your children yet. Contact the school if you expected details here.
            </p>
          ) : null}

          <div className="space-y-4">
            {rows.map((row) => (
              <section
                key={row.rowKey || row.studentId}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-indigo-50/30 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{row.studentName}</h3>
                      {row.routeName !== '—' ? (
                        <p className="mt-1 text-sm font-medium text-indigo-800">{row.routeName}</p>
                      ) : null}
                    </div>
                    {row.routeTypeLabel && row.routeTypeLabel !== '—' ? (
                      <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                        {row.routeTypeLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Driver</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">{row.driverName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Bus plate</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">{row.busNumberPlate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Location</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">{row.location}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Scheduled time</dt>
                    <dd className="mt-1 text-sm font-medium text-indigo-900">{row.scheduledTime}</dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
