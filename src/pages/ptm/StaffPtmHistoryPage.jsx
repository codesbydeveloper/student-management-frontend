import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PtmStatusBadge } from '../../components/phase6/PtmStatusBadge'
import { fetchAdminAllPtmRequests } from '../../api/ptmApi'
import { ROLES } from '../../utils/constants'
import { PTM_STATUS } from '../../data/phase6Constants'

const PAGE_LIMIT = 10

function fmt(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * Admin / principal: full school PTM list (approved, rejected, in progress, etc.).
 */
export default function StaffPtmHistoryPage() {
  const { user, token } = useAuth()
  const [apiRows, setApiRows] = useState(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const allowed = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL

  const load = useCallback(async () => {
    if (!token || !allowed) {
      setApiRows([])
      setMeta({ total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false })
      return
    }
    setError('')
    const res = await fetchAdminAllPtmRequests(token, { page, limit: PAGE_LIMIT })
    if (!res.ok) {
      setError(res.error || 'Could not load PTM history.')
      setApiRows([])
      toast.error(res.error)
      setMeta({ total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false })
      return
    }
    setApiRows(res.requests)
    setMeta({
      total: res.total,
      totalPages: res.totalPages,
      hasNextPage: res.hasNextPage,
      hasPrevPage: res.hasPrevPage,
    })
  }, [token, allowed, page])

  useEffect(() => {
    setApiRows(null)
    void load()
  }, [load])

  const sorted = useMemo(() => {
    const api = Array.isArray(apiRows) ? apiRows : []
    return [...api].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
    )
  }, [apiRows])

  const onRefresh = () => {
    setApiRows(null)
    void load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        <Link to="/ptm-requests/staff">
          <Button type="button" size="sm" variant="secondary">
            Pending requests
          </Button>
        </Link>
        <Button type="button" size="sm" variant="secondary" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader title="PTM history" />

        {apiRows === null ? (
          <p className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Loading…
          </p>
        ) : null}

        {error ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            {error}
          </p>
        ) : null}

        {sorted.length > 0 ? (
          <ul className="space-y-3">
            {sorted.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {r.studentName} · {r.teacherName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Parent: {r.parentName} · Requested {fmt(r.createdAt)} · Updated {fmt(r.updatedAt)}
                    </p>
                  </div>
                  <PtmStatusBadge status={r.status} />
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-600">Reason: </span>
                  {r.reason}
                </p>
                {r.status === PTM_STATUS.APPROVED || r.status === PTM_STATUS.COMPLETED ? (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-semibold">Meeting: </span>
                    {fmt(r.meetingAt)}
                  </p>
                ) : null}
                {r.meetingNote ? (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-semibold">Meeting note: </span>
                    {r.meetingNote}
                  </p>
                ) : null}
                {r.staffReviewNote ? (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-semibold">School note: </span>
                    {r.staffReviewNote}
                  </p>
                ) : null}
                {r.status === PTM_STATUS.PRINCIPAL_REJECTED &&
                (r.principalRejectionNote || r.rejectionNote) ? (
                  <p className="mt-1 text-sm text-orange-900/90">
                    <span className="font-semibold">Principal: </span>
                    {r.principalRejectionNote || r.rejectionNote}
                  </p>
                ) : null}
                {r.status === PTM_STATUS.REJECTED && r.rejectionNote ? (
                  <p className="mt-1 text-sm text-red-800/90">
                    <span className="font-semibold">Rejection note: </span>
                    {r.rejectionNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {apiRows !== null && sorted.length === 0 && !error ? (
          <p className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            No PTM requests yet.
          </p>
        ) : null}

        {apiRows !== null && meta.total > PAGE_LIMIT ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Page {page} of {Math.max(1, meta.totalPages)} · {meta.total} total
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
