import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PtmStatusBadge } from '../../components/phase6/PtmStatusBadge'
import { PTM_STATUS } from '../../data/phase6Constants'
import {
  fetchStaffPendingPtmRequests,
  staffApprovePtmRequest,
  staffRejectPtmRequest,
} from '../../api/ptmApi'

const PAGE_LIMIT = 10

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

function toIso(localDatetime) {
  if (!localDatetime) return null
  const d = new Date(localDatetime)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

/**
 * Admin / principal: pending list + staff approve (scheduledAt + optional meetingNote) / reject.
 */
export default function StaffPtmRequestsPage() {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const [apiRows, setApiRows] = useState(null)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [meetingLocal, setMeetingLocal] = useState({})
  const [meetingNote, setMeetingNote] = useState({})
  const [rejectNote, setRejectNote] = useState({})
  /** keyed by row id: 'approving' | 'rejecting' */
  const [busy, setBusy] = useState({})

  const load = useCallback(async () => {
    if (!token) {
      setApiRows([])
      return
    }
    setError('')
    const res = await fetchStaffPendingPtmRequests(token, { page, limit: PAGE_LIMIT })
    if (!res.ok) {
      setError(res.error || 'Could not load PTM requests.')
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
  }, [token, page])

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

  const clearBusyRow = (id) =>
    setBusy((m) => {
      const n = { ...m }
      delete n[id]
      return n
    })

  const onStaffApprove = async (row) => {
    if (!token || busy[row.id]) return
    const iso = toIso(meetingLocal[row.id])
    if (!iso) {
      toast.error('Pick a meeting date and time before approving.')
      return
    }
    setBusy((m) => ({ ...m, [row.id]: 'approving' }))
    try {
      const note = (meetingNote[row.id] || '').trim()
      const res = await staffApprovePtmRequest(token, row.id, {
        scheduledAt: iso,
        meetingNote: note || undefined,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Approved — meeting scheduled.')
      setMeetingLocal((m) => {
        const n = { ...m }
        delete n[row.id]
        return n
      })
      setMeetingNote((m) => {
        const n = { ...m }
        delete n[row.id]
        return n
      })
      await load()
    } finally {
      clearBusyRow(row.id)
    }
  }

  const onStaffReject = async (row) => {
    if (!token || busy[row.id]) return
    setBusy((m) => ({ ...m, [row.id]: 'rejecting' }))
    try {
      const rejectionNote = (rejectNote[row.id] || '').trim()
      const res = await staffRejectPtmRequest(token, row.id, { rejectionNote })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Request rejected.')
      setRejectNote((m) => {
        const n = { ...m }
        delete n[row.id]
        return n
      })
      await load()
    } finally {
      clearBusyRow(row.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        <Link to="/ptm-requests/admin/history">
          <Button type="button" size="sm" variant="secondary">
            PTM history
          </Button>
        </Link>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setApiRows(null)
            void load()
          }}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader title="PTM requests" />

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
          <ul className="mt-3 space-y-4">
            {sorted.map((r) => {
              const canAct =
                r.status === PTM_STATUS.REQUESTED || r.status === PTM_STATUS.PENDING_PRINCIPAL
              const isBusy = Boolean(busy[r.id])
              const isApproving = busy[r.id] === 'approving'
              const isRejecting = busy[r.id] === 'rejecting'
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 ring-1 ring-slate-100/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{r.studentName}</p>
                      <p className="text-xs text-slate-600">
                        Teacher: {r.teacherName} · Parent: {r.parentName} · Requested {fmt(r.createdAt)}
                      </p>
                    </div>
                    <PtmStatusBadge status={r.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-800">
                    <span className="font-semibold text-slate-600">Reason: </span>
                    {r.reason}
                  </p>
                  {r.meetingAt ? (
                    <p className="mt-1 text-xs text-slate-500">Meeting: {fmt(r.meetingAt)}</p>
                  ) : null}
                  {r.rejectionNote ? (
                    <p className="mt-1 text-xs text-rose-700">Note: {r.rejectionNote}</p>
                  ) : null}

                  {canAct ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3">
                        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Meeting time (required to approve)
                        </label>
                        <input
                          type="datetime-local"
                          value={meetingLocal[r.id] || ''}
                          onChange={(e) =>
                            setMeetingLocal((m) => ({ ...m, [r.id]: e.target.value }))
                          }
                          disabled={isBusy}
                          className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm disabled:opacity-60"
                        />
                        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Optional meeting note
                        </label>
                        <input
                          type="text"
                          value={meetingNote[r.id] || ''}
                          onChange={(e) =>
                            setMeetingNote((m) => ({ ...m, [r.id]: e.target.value }))
                          }
                          disabled={isBusy}
                          className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm disabled:opacity-60"
                          placeholder="e.g. Room 204"
                        />
                        <div className="mt-3">
                          <Button type="button" size="sm" onClick={() => void onStaffApprove(r)} disabled={isBusy}>
                            {isApproving ? 'Approving…' : 'Approve'}
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3">
                        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Optional rejection note
                        </label>
                        <input
                          type="text"
                          value={rejectNote[r.id] || ''}
                          onChange={(e) => setRejectNote((m) => ({ ...m, [r.id]: e.target.value }))}
                          disabled={isBusy}
                          className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm disabled:opacity-60"
                          placeholder="Reason for rejection"
                        />
                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => void onStaffReject(r)}
                            disabled={isBusy}
                          >
                            {isRejecting ? 'Rejecting…' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}

        {apiRows !== null && sorted.length === 0 && !error ? (
          <p className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            No pending requests right now.
          </p>
        ) : null}

        {apiRows !== null && meta.totalPages > 1 ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <span>
              Page {page} of {meta.totalPages}
              {meta.total ? ` · ${meta.total} total` : null}
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
