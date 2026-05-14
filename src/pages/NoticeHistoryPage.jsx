import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { StatusBadge } from '../components/notifications/StatusBadge'
import { DeliveryModal } from '../components/notifications/DeliveryModal'
import { RejectReasonModal } from '../components/notifications/RejectReasonModal'
import {
  fetchNotificationApprovalQueue,
  patchNotificationApprove,
  patchNotificationReject,
} from '../api/notificationsApi'
import { ROLES } from '../utils/constants'
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TARGET_LABELS,
} from '../utils/notificationConstants'

const PAGE_LIMIT = 10

function fmtCreatedAt(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms))
  } catch {
    return '—'
  }
}

function truncate(s, max = 96) {
  const t = String(s || '').trim()
  if (!t) return '—'
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function categoryLabel(cat) {
  const c = String(cat || '').toLowerCase()
  if (c === NOTIFICATION_CATEGORIES.ADMINISTRATIVE) {
    return NOTIFICATION_CATEGORY_LABELS[NOTIFICATION_CATEGORIES.ADMINISTRATIVE]
  }
  if (c === NOTIFICATION_CATEGORIES.ACADEMIC) {
    return NOTIFICATION_CATEGORY_LABELS[NOTIFICATION_CATEGORIES.ACADEMIC]
  }
  return c || '—'
}

function targetSummary(row) {
  if (row.targetSummary) return row.targetSummary
  const ids = row.targetIds
  if (!Array.isArray(ids) || !ids.length) return '—'
  const t = NOTIFICATION_TARGET_LABELS[row.targetType] || row.targetType || ''
  const joined = ids.map(String).join(', ')
  return t ? `${t}: ${joined}` : joined
}

function isFinalStatus(status) {
  return status === NOTIFICATION_STATUSES.APPROVED || status === NOTIFICATION_STATUSES.REJECTED
}

/**
 * Admin / principal: notice history from GET /api/notifications/approval-queue.
 */
export default function NoticeHistoryPage() {
  const { user, token } = useAuth()
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [approvingId, setApprovingId] = useState(null)
  const [delivery, setDelivery] = useState({ open: false, title: '' })
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '', title: '' })
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  const allowed = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL

  const load = useCallback(async () => {
    if (!token || !allowed) {
      setRows([])
      setTotal(0)
      setHasNext(false)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetchNotificationApprovalQueue(token, { page, limit: PAGE_LIMIT })
    setLoading(false)
    if (!res.ok) {
      setRows([])
      setTotal(0)
      setHasNext(false)
      const msg = res.error || 'Could not load notice history.'
      setError(msg)
      if (!res.useClient) {
        toast.error(msg)
      }
      return
    }
    setRows(res.notifications)
    setTotal(res.total)
    setHasNext(Boolean(res.hasNext))
  }, [token, allowed, page])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_LIMIT))
  const canPrev = page > 1
  const canNext = hasNext || page < totalPages
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1
  const rangeEnd = total === 0 ? 0 : Math.min(page * PAGE_LIMIT, total)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }, [rows])

  const onApprove = async (id) => {
    if (!token) return
    const sid = String(id)
    const snapshot = rows.find((n) => String(n.id) === sid)
    setApprovingId(id)
    try {
      const res = await patchNotificationApprove(token, id)
      if (res.ok) {
        toast.success('Approved successfully.')
        const d = res.data
        const title =
          typeof d?.title === 'string' && d.title.trim()
            ? d.title.trim()
            : snapshot?.title || ''
        setDelivery({ open: true, title })
        await load()
        return
      }
      toast.error(res.error || 'Could not approve.')
    } finally {
      setApprovingId(null)
    }
  }

  const closeRejectModal = () => {
    if (rejectSubmitting) return
    setRejectModal({ open: false, id: null, reason: '', title: '' })
  }

  const confirmReject = async () => {
    const id = rejectModal.id
    if (id == null || !token) return
    setRejectSubmitting(true)
    try {
      const res = await patchNotificationReject(token, id, { reason: rejectModal.reason.trim() })
      if (res.ok) {
        toast.info('Rejected')
        closeRejectModal()
        await load()
        return
      }
      toast.error(res.error || 'Could not reject.')
    } finally {
      setRejectSubmitting(false)
    }
  }

  const onRejectClick = (id) => {
    const row = rows.find((n) => String(n.id) === String(id))
    setRejectModal({
      open: true,
      id,
      reason: '',
      title: row?.title || '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        {user?.role === ROLES.ADMIN ? (
          <Link to="/notifications/admin-approval">
            <Button type="button" size="sm" variant="secondary">
              Admin approvals
            </Button>
          </Link>
        ) : null}
        {user?.role === ROLES.PRINCIPAL ? (
          <Link to="/notifications/principal-approval">
            <Button type="button" size="sm" variant="secondary">
              Principal approvals
            </Button>
          </Link>
        ) : null}
        <Button type="button" size="sm" variant="secondary" disabled={loading || !token} onClick={() => void load()}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Notice history"
          subtitle="GET /api/notifications/approval-queue — notices in the approval pipeline (paginated)."
        />

        <div className="border-t border-slate-100 px-4 py-6 sm:px-6">
          {error ? (
            <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              {error}
            </div>
          ) : null}

          {loading && rows.length === 0 && !error ? (
            <p className="text-sm text-slate-500">Loading notice history…</p>
          ) : null}

          {!loading && rows.length === 0 && !error ? (
            <p className="text-sm text-slate-600">No notices on this page.</p>
          ) : null}

          {sorted.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[64rem] text-left text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Targets</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Submitted by</th>
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Message</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sorted.map((row, idx) => {
                      const locked = isFinalStatus(row.status)
                      const busyApprove = approvingId != null && String(approvingId) === String(row.id)
                      const rowBusy = busyApprove || rejectSubmitting
                      return (
                      <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="max-w-[14rem] px-4 py-3 align-top font-medium text-slate-900">
                          {truncate(row.title, 120)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-slate-700">
                          {categoryLabel(row.category)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3 align-top text-slate-600">{truncate(targetSummary(row), 140)}</td>
                        <td className="max-w-[10rem] px-4 py-3 align-top text-slate-600">
                          {truncate(row.createdByName, 48)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-500">
                          {fmtCreatedAt(row.createdAt)}
                        </td>
                        <td className="max-w-xl px-4 py-3 align-top text-slate-600">{truncate(row.message, 200)}</td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-right">
                          {locked ? (
                            <div className="flex justify-end">
                              <Badge
                                className={
                                  row.status === NOTIFICATION_STATUSES.APPROVED
                                    ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
                                    : 'bg-slate-100 text-slate-700 ring-slate-500/20'
                                }
                              >
                                {row.status === NOTIFICATION_STATUSES.APPROVED ? 'Approved' : 'Rejected'}
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={rowBusy || loading || !token}
                                onClick={() => onRejectClick(row.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={rowBusy || loading || !token}
                                onClick={() => void onApprove(row.id)}
                              >
                                {busyApprove ? 'Approving…' : 'Approve'}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {total > 0 || sorted.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <span>
                {total > 0 ? (
                  <>
                    Showing {rangeStart}–{rangeEnd} of {total}
                  </>
                ) : (
                  <>Showing {sorted.length} on this page</>
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canPrev || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="flex items-center px-2 text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <DeliveryModal
        open={delivery.open}
        onClose={() => setDelivery((d) => ({ ...d, open: false }))}
        title={delivery.title}
      />

      <RejectReasonModal
        open={rejectModal.open}
        onClose={closeRejectModal}
        notificationTitle={rejectModal.title}
        reason={rejectModal.reason}
        onReasonChange={(reason) => setRejectModal((m) => ({ ...m, reason }))}
        onConfirm={confirmReject}
        submitting={rejectSubmitting}
      />
    </div>
  )
}
