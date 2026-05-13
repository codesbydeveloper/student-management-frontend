import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PtmStatusBadge } from '../../components/phase6/PtmStatusBadge'
import { PTM_STATUS } from '../../data/phase6Constants'
import {
  approvePtmRequest,
  completePtmRequest,
  fetchTeacherPtmRequests,
  rejectPtmRequest,
} from '../../api/ptmApi'
import { ROLES } from '../../utils/constants'

const PAGE_LIMIT = 10

function fmt(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function toIso(localDatetime) {
  if (!localDatetime) return null
  const d = new Date(localDatetime)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

export default function TeacherPtmRequestsPage() {
  const { user, token } = useAuth()

  /** Server rows for this teacher. null = loading, [] = loaded empty, array = loaded. */
  const [apiRows, setApiRows] = useState(null)
  const [meetingLocal, setMeetingLocal] = useState({})
  const [meetingNote, setMeetingNote] = useState({})
  const [rejectText, setRejectText] = useState({})
  /** Per-row mutation state — keyed by row id. Values: 'approving' | 'rejecting' | 'completing'. */
  const [busyAction, setBusyAction] = useState({})
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const load = useCallback(async () => {
    if (!token || user?.role !== ROLES.TEACHER) {
      setApiRows([])
      setMeta({ total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false })
      return
    }
    setError('')
    const res = await fetchTeacherPtmRequests(token, { page, limit: PAGE_LIMIT })
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
  }, [token, user?.role, page])

  useEffect(() => {
    setApiRows(null)
    void load()
  }, [load])

  const displayList = useMemo(() => {
    const api = Array.isArray(apiRows) ? apiRows : []
    const byDateDesc = (a, b) =>
      new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    const requested = api.filter((r) => r.status === PTM_STATUS.REQUESTED).sort(byDateDesc)
    const rest = api.filter((r) => r.status !== PTM_STATUS.REQUESTED).sort(byDateDesc)
    return [...requested, ...rest]
  }, [apiRows])

  /**
   * Replace the matching row in `apiRows` with a freshly mapped server row when
   * the API returns one. Falls back to a local patch when the server omits the
   * row body, so the UI still reflects the action.
   */
  const applyRowUpdate = useCallback((rowId, mappedRow, fallbackPatch) => {
    setApiRows((prev) => {
      const list = Array.isArray(prev) ? prev : []
      const idx = list.findIndex((r) => r.id === rowId)
      if (idx === -1) return list
      const next = list.slice()
      const merged = mappedRow ? { ...list[idx], ...mappedRow } : { ...list[idx], ...fallbackPatch }
      next[idx] = merged
      return next
    })
  }, [])

  const setBusy = (id, action) => setBusyAction((m) => ({ ...m, [id]: action }))
  const clearBusy = (id) =>
    setBusyAction((m) => {
      const n = { ...m }
      delete n[id]
      return n
    })

  const onApprove = async (row) => {
    if (busyAction[row.id]) return
    const iso = toIso(meetingLocal[row.id])
    if (!iso) {
      toast.error('Pick a meeting date and time before approving.')
      return
    }
    setBusy(row.id, 'approving')
    try {
      const note = (meetingNote[row.id] || '').trim()
      const res = await approvePtmRequest(token, row.id, {
        scheduledAt: iso,
        meetingNote: note || undefined,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      applyRowUpdate(row.id, res.request, {
        status: PTM_STATUS.APPROVED,
        meetingAt: iso,
        updatedAt: new Date().toISOString(),
      })
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
      toast.success('Approved.')
    } finally {
      clearBusy(row.id)
    }
  }

  const onReject = async (row) => {
    if (busyAction[row.id]) return
    const note = (rejectText[row.id] || '').trim()
    setBusy(row.id, 'rejecting')
    try {
      const res = await rejectPtmRequest(token, row.id, {
        rejectionNote: note || undefined,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      applyRowUpdate(row.id, res.request, {
        status: PTM_STATUS.REJECTED,
        rejectionNote: note || null,
        updatedAt: new Date().toISOString(),
      })
      setRejectText((m) => {
        const n = { ...m }
        delete n[row.id]
        return n
      })
      toast.success('Rejected.')
    } finally {
      clearBusy(row.id)
    }
  }

  const onComplete = async (row) => {
    if (busyAction[row.id]) return
    setBusy(row.id, 'completing')
    try {
      const res = await completePtmRequest(token, row.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      applyRowUpdate(row.id, res.request, {
        status: PTM_STATUS.COMPLETED,
        updatedAt: new Date().toISOString(),
      })
      toast.success('Marked completed.')
    } finally {
      clearBusy(row.id)
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
            Loading your requests…
          </p>
        ) : null}

        {error ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            {error}
          </p>
        ) : null}

        {apiRows !== null && displayList.length > 0 ? (
          <ul className="mt-1 space-y-4">
            {displayList.map((r) => {
              if (r.status === PTM_STATUS.REQUESTED) {
                const isBusy = Boolean(busyAction[r.id])
                const isApproving = busyAction[r.id] === 'approving'
                const isRejecting = busyAction[r.id] === 'rejecting'
                return (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-amber-200/70 bg-amber-50/40 px-4 py-4 ring-1 ring-amber-100/80"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{r.studentName}</p>
                        <p className="text-xs text-slate-600">
                          Parent: {r.parentName} · Requested {fmt(r.createdAt)}
                        </p>
                      </div>
                      <PtmStatusBadge status={r.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-800">
                      <span className="font-semibold text-slate-600">Reason: </span>
                      {r.reason}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3">
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
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onApprove(r)}
                            disabled={isBusy}
                          >
                            {isApproving ? 'Approving…' : 'Approve'}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3">
                        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Optional note if rejecting
                        </label>
                        <input
                          type="text"
                          value={rejectText[r.id] || ''}
                          onChange={(e) =>
                            setRejectText((m) => ({ ...m, [r.id]: e.target.value }))
                          }
                          disabled={isBusy}
                          className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm disabled:opacity-60"
                          placeholder="Reason for rejection"
                        />
                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => onReject(r)}
                            disabled={isBusy}
                          >
                            {isRejecting ? 'Rejecting…' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              }

              const isCompleting = busyAction[r.id] === 'completing'
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800">
                      {r.studentName} · {fmt(r.updatedAt || r.createdAt)}
                    </span>
                    {r.status === PTM_STATUS.APPROVED && r.meetingAt ? (
                      <p className="text-xs text-slate-500">Meeting: {fmt(r.meetingAt)}</p>
                    ) : null}
                    {r.status === PTM_STATUS.REJECTED && r.rejectionNote ? (
                      <p className="text-xs text-rose-700">Note: {r.rejectionNote}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <PtmStatusBadge status={r.status} />
                    {r.status === PTM_STATUS.APPROVED ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onComplete(r)}
                        disabled={isCompleting}
                      >
                        {isCompleting ? 'Marking…' : 'Mark completed'}
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
        {apiRows !== null && displayList.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing assigned to you yet.</p>
        ) : null}

        {apiRows !== null && meta.total > 0 ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <span>
              Page {page} of {Math.max(1, meta.totalPages || Math.ceil(meta.total / PAGE_LIMIT))} ·{' '}
              {meta.total} total
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
