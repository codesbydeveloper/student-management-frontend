import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PtmStatusBadge } from '../../components/phase6/PtmStatusBadge'
import { fetchMyPtmRequests } from '../../api/ptmApi'
import { ROLES } from '../../utils/constants'
import { PTM_STATUS } from '../../data/phase6Constants'

const PAGE_LIMIT = 20

function fmt(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function ParentPtmHistoryPage() {
  const { user, token } = useAuth()
  /** `null` = loading, [] = loaded empty, array = loaded rows. */
  const [apiRows, setApiRows] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  const load = useCallback(
    async (nextPage) => {
      if (!token || user?.role !== ROLES.PARENT) {
        setApiRows([])
        setTotal(0)
        return
      }
      setError('')
      const res = await fetchMyPtmRequests(token, { page: nextPage, limit: PAGE_LIMIT })
      if (!res.ok) {
        setError(res.error || 'Could not load PTM history.')
        setApiRows([])
        setTotal(0)
        toast.error(res.error)
        return
      }
      setApiRows(res.requests)
      setTotal(res.total)
      setPage(res.page || nextPage)
    },
    [token, user?.role],
  )

  useEffect(() => {
    setApiRows(null)
    void load(1)
  }, [load])

  const merged = useMemo(() => {
    const api = Array.isArray(apiRows) ? apiRows : []
    return [...api].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
    )
  }, [apiRows])

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_LIMIT)) : 1
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const onRefresh = () => {
    setApiRows(null)
    void load(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        <Link to="/parent/ptm/request">
          <Button type="button" size="sm" variant="secondary">
            New request
          </Button>
        </Link>
        <Button type="button" size="sm" variant="secondary" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader
          title="PTM history"
          />

        {apiRows === null ? (
          <p className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Loading your meetings…
          </p>
        ) : null}

        {error ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            {error}
          </p>
        ) : null}

        {apiRows !== null && merged.length === 0 && !error ? (
          <p className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            No meetings yet.{' '}
            <Link to="/parent/ptm/request" className="font-semibold text-indigo-700 underline">
              Send your first request
            </Link>
            .
          </p>
        ) : null}

        {merged.length > 0 ? (
          <ul className="space-y-3">
            {merged.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {r.studentName} · {r.teacherName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Updated {fmt(r.updatedAt)}</p>
                  </div>
                  <PtmStatusBadge status={r.status} />
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-600">Reason: </span>
                  {r.reason}
                </p>
                {r.status === PTM_STATUS.APPROVED || r.status === PTM_STATUS.COMPLETED ? (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-semibold">Meeting time: </span>
                    {fmt(r.meetingAt)}
                  </p>
                ) : null}
                {r.staffReviewNote ? (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-semibold">School note: </span>
                    {r.staffReviewNote}
                  </p>
                ) : null}
                {r.status === PTM_STATUS.PRINCIPAL_REJECTED &&
                (r.principalRejectionNote || r.rejectionNote) ? (
                  <p className="mt-2 text-sm text-orange-900/90">
                    <span className="font-semibold">Principal: </span>
                    {r.principalRejectionNote || r.rejectionNote}
                  </p>
                ) : null}
                {r.status === PTM_STATUS.REJECTED && r.rejectionNote ? (
                  <p className="mt-2 text-sm text-red-800/90">
                    <span className="font-semibold">Note: </span>
                    {r.rejectionNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {total > PAGE_LIMIT ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!hasPrev}
                onClick={() => {
                  if (!hasPrev) return
                  setApiRows(null)
                  void load(page - 1)
                }}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!hasNext}
                onClick={() => {
                  if (!hasNext) return
                  setApiRows(null)
                  void load(page + 1)
                }}
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
