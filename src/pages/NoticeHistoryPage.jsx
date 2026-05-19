import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/notifications/StatusBadge'
import { NotificationDecisionBadge } from '../components/notifications/NotificationDecisionBadge'
import { DeliveryModal } from '../components/notifications/DeliveryModal'
import { RejectReasonModal } from '../components/notifications/RejectReasonModal'
import { NotificationReadReportModal } from '../components/notifications/NotificationReadReportModal'
import { ReadReportActionButton } from '../components/notifications/ReadReportActionButton'
import {
  fetchAdminNotificationById,
  fetchAdminNotifications,
  fetchNotificationApprovalQueue,
  patchNotificationApprove,
  patchNotificationReject,
} from '../api/notificationsApi'
import { ParentMessageDetailModal } from '../components/parent/ParentMessageDetailModal'
import { ROLES } from '../utils/constants'
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TARGET_LABELS,
} from '../utils/notificationConstants'
import { requestParentMessagesRefresh } from '../utils/parentMessagesRefreshBus'

const PAGE_LIMIT = 10
const TABLE_COL_COUNT = 9

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

/** Same data as the API string; splits `name · email` or `name email@…` onto two lines for readability. */
function formatSubmittedBy(name) {
  const s = String(name || '').trim()
  if (!s) return '—'
  if (s.includes(' · ')) {
    const i = s.indexOf(' · ')
    const left = s.slice(0, i).trim()
    const right = s.slice(i + 3).trim()
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span className="font-medium text-slate-900">{left}</span>
        <span className="text-xs text-slate-500">{right}</span>
      </span>
    )
  }
  const idx = s.lastIndexOf(' ')
  if (idx > 0) {
    const maybeEmail = s.slice(idx + 1).trim()
    if (maybeEmail.includes('@') && maybeEmail.includes('.')) {
      const namePart = s.slice(0, idx).trim()
      if (namePart) {
        return (
          <span className="inline-flex flex-col gap-0.5">
            <span className="font-medium text-slate-900">{namePart}</span>
            <span className="text-xs text-slate-500">{maybeEmail}</span>
          </span>
        )
      }
    }
  }
  return truncate(s, 56)
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

function canShowReadReport(row, role) {
  const r = String(role || '')
  if (r !== ROLES.ADMIN && r !== ROLES.PRINCIPAL) return false
  if (row.actions?.canViewReadReport === true) return true
  return row.status === NOTIFICATION_STATUSES.APPROVED
}

function isPrincipalAdministrativeTab(isPrincipal, categoryFilter) {
  return isPrincipal && categoryFilter === NOTIFICATION_CATEGORIES.ADMINISTRATIVE
}

function isPrincipalAdministrativeApiMessage(msg) {
  const s = String(msg || '').toLowerCase()
  return s.includes('principal') && (s.includes('academic') || s.includes('administrative'))
}

function emptyNoticeMessage(categoryFilter, isPrincipal) {
  if (isPrincipalAdministrativeTab(isPrincipal, categoryFilter)) {
    return 'No administrative notices. These are managed by the school admin.'
  }
  return `No ${categoryLabel(categoryFilter).toLowerCase()} notices on this page.`
}

/** Admin / principal: notice history (approval queue). */
export default function NoticeHistoryPage() {
  const { user, token } = useAuth()
  const [searchParams] = useSearchParams()
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
  const [categoryFilter, setCategoryFilter] = useState(NOTIFICATION_CATEGORIES.ADMINISTRATIVE)
  const [readReport, setReadReport] = useState({ open: false, id: null, title: '' })
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewLoadingId, setViewLoadingId] = useState(null)
  const [viewDetail, setViewDetail] = useState(null)
  const [viewError, setViewError] = useState(null)
  const viewFetchSeq = useRef(0)

  const allowed = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL
  const isAdmin = user?.role === ROLES.ADMIN
  const isPrincipal = user?.role === ROLES.PRINCIPAL

  useEffect(() => {
    const cat = String(searchParams.get('category') ?? '').toLowerCase()
    if (isPrincipal) {
      setCategoryFilter(NOTIFICATION_CATEGORIES.ACADEMIC)
      setPage(1)
      return
    }
    if (cat === NOTIFICATION_CATEGORIES.ADMINISTRATIVE) {
      setCategoryFilter(NOTIFICATION_CATEGORIES.ADMINISTRATIVE)
      setPage(1)
    } else if (cat === NOTIFICATION_CATEGORIES.ACADEMIC) {
      setCategoryFilter(NOTIFICATION_CATEGORIES.ACADEMIC)
      setPage(1)
    }
  }, [searchParams, isPrincipal])

  useEffect(() => {
    if (isPrincipal && categoryFilter !== NOTIFICATION_CATEGORIES.ACADEMIC) {
      setCategoryFilter(NOTIFICATION_CATEGORIES.ACADEMIC)
      setPage(1)
    }
  }, [isPrincipal, categoryFilter])

  const load = useCallback(async () => {
    if (!token || !allowed) {
      setRows([])
      setTotal(0)
      setHasNext(false)
      setLoading(false)
      setError(null)
      return
    }
    if (isPrincipalAdministrativeTab(isPrincipal, categoryFilter)) {
      setLoading(false)
      setRows([])
      setTotal(0)
      setHasNext(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const res = isAdmin
      ? await fetchAdminNotifications(token, {
          page,
          limit: PAGE_LIMIT,
          category: categoryFilter,
        })
      : await fetchNotificationApprovalQueue(token, {
          page,
          limit: PAGE_LIMIT,
          categoryKind: categoryFilter,
        })
    setLoading(false)
    if (!res.ok) {
      if (
        isPrincipalAdministrativeTab(isPrincipal, categoryFilter) ||
        (isPrincipal && isPrincipalAdministrativeApiMessage(res.error))
      ) {
        setRows([])
        setTotal(0)
        setHasNext(false)
        setError(null)
        return
      }
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
  }, [token, allowed, isAdmin, isPrincipal, page, categoryFilter])

  const selectCategoryFilter = (kind) => {
    setCategoryFilter(kind)
    setPage(1)
  }

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
        requestParentMessagesRefresh()
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

  const openReadReport = (row) => {
    setReadReport({
      open: true,
      id: row.id,
      title: row.title || 'School notice',
    })
  }

  const closeViewModal = useCallback(() => {
    viewFetchSeq.current += 1
    setViewModalOpen(false)
    setViewLoading(false)
    setViewLoadingId(null)
    setViewDetail(null)
    setViewError(null)
  }, [])

  const openNoticeDetail = useCallback(
    async (notificationId) => {
      if (!token) return
      const id = String(notificationId ?? '').trim()
      if (!id) return

      const seq = ++viewFetchSeq.current
      setViewModalOpen(true)
      setViewLoading(true)
      setViewLoadingId(id)
      setViewDetail(null)
      setViewError(null)

      const res = await fetchAdminNotificationById(token, id)
      if (seq !== viewFetchSeq.current) return

      if (!res.ok) {
        setViewLoading(false)
        setViewLoadingId(null)
        setViewError(res.error || 'Could not load notice.')
        return
      }

      setViewDetail(res.notification)
      setViewLoading(false)
      setViewLoadingId(null)
    },
    [token],
  )

  return (
    <div className="space-y-6">
      <NotificationReadReportModal
        open={readReport.open}
        onClose={() => setReadReport({ open: false, id: null, title: '' })}
        notificationId={readReport.id}
        notificationTitle={readReport.title}
        token={token}
      />
      <ParentMessageDetailModal
        open={viewModalOpen}
        onClose={closeViewModal}
        loading={viewLoading}
        error={viewError}
        item={viewDetail}
        modalTitle="School notice"
      />
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        {user?.role === ROLES.ADMIN ? (
          <Link to="/notifications/admin-approval">
            <Button type="button" size="sm" variant="secondary">
              Notification approvals
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
        <CardHeader title="Notice history" />

        <div className="border-t border-slate-100 px-4 pt-5 sm:px-6">
          {isAdmin ? (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</p>
              <div className="flex max-w-md rounded-xl border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner">
                <button
                  type="button"
                  className={`min-h-11 flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    categoryFilter === NOTIFICATION_CATEGORIES.ADMINISTRATIVE
                      ? 'bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => selectCategoryFilter(NOTIFICATION_CATEGORIES.ADMINISTRATIVE)}
                >
                  Administrative
                </button>
                <button
                  type="button"
                  className={`min-h-11 flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    categoryFilter === NOTIFICATION_CATEGORIES.ACADEMIC
                      ? 'bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => selectCategoryFilter(NOTIFICATION_CATEGORIES.ACADEMIC)}
                >
                  Academic
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-slate-700">
              {NOTIFICATION_CATEGORY_LABELS[NOTIFICATION_CATEGORIES.ACADEMIC]} notices
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-6 sm:px-6">
          {error ? (
            <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-950">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/[0.04]">
            <div className="overflow-x-auto">
              <table className="min-w-[72rem] w-full border-collapse text-sm">
                <thead>
                  <tr className="app-table-head">
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Title</th>
                    <th className="w-36 px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                      Category
                    </th>
                    <th className="w-36 px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                      Status
                    </th>
                    <th className="max-w-[13rem] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Targets
                    </th>
                    <th className="max-w-[11rem] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Submitted by
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="max-w-[14rem] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                      Message
                    </th>
                    <th className="min-w-[9.5rem] px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                      Actions
                    </th>
                    <th className="min-w-[11rem] px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                      Read report
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={TABLE_COL_COUNT} className="px-4 py-12 text-center text-sm text-slate-500">
                        Loading notice history…
                      </td>
                    </tr>
                  ) : sorted.length === 0 ? (
                    <tr>
                      <td colSpan={TABLE_COL_COUNT} className="px-4 py-12 text-center text-sm text-slate-600">
                        {error ? 'Could not load notices.' : emptyNoticeMessage(categoryFilter, isPrincipal)}
                      </td>
                    </tr>
                  ) : (
                    sorted.map((row, idx) => {
                      const act = row.actions || {}
                      const canApprove = act.canApprove === true
                      const canReject = act.canReject === true
                      const showReadReport = canShowReadReport(row, user?.role)
                      const locked = isFinalStatus(row.status)
                      const showApproveReject =
                        canApprove || canReject || (!locked && !Object.keys(act).length)
                      const busyApprove = approvingId != null && String(approvingId) === String(row.id)
                      const rowBusy = busyApprove || rejectSubmitting
                      return (
                        <tr
                          key={row.id}
                          className={`align-middle transition-colors hover:bg-indigo-50/35 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/45'
                          }`}
                        >
                          <td className="max-w-[16rem] border-b border-slate-100/80 px-4 py-3.5 text-left align-top">
                            <p
                              className="line-clamp-2 font-medium leading-snug text-slate-900"
                              title={row.title || ''}
                            >
                              {truncate(row.title, 140)}
                            </p>
                          </td>
                          <td className="border-b border-slate-100/80 px-4 py-3.5 text-center align-top text-slate-700">
                            {categoryLabel(row.category)}
                          </td>
                          <td className="border-b border-slate-100/80 px-4 py-3.5 text-center align-top">
                            <StatusBadge status={row.status} variant="stack" />
                          </td>
                          <td className="max-w-[13rem] border-b border-slate-100/80 px-4 py-3.5 text-left align-top text-slate-600">
                            <p
                              className="line-clamp-2 text-xs leading-relaxed"
                              title={targetSummary(row)}
                            >
                              {truncate(targetSummary(row), 160)}
                            </p>
                          </td>
                          <td className="max-w-[11rem] border-b border-slate-100/80 px-4 py-3.5 text-left align-top text-slate-600">
                            {formatSubmittedBy(row.submitterName || row.createdByName)}
                          </td>
                          <td className="border-b border-slate-100/80 px-4 py-3.5 text-center align-top text-xs tabular-nums text-slate-500">
                            {fmtCreatedAt(row.createdAt)}
                          </td>
                          <td className="border-b border-slate-100/80 px-4 py-3.5 text-center align-middle">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={!token || (viewLoading && String(viewLoadingId) === String(row.id))}
                              onClick={() => void openNoticeDetail(row.id)}
                            >
                              {viewLoading && String(viewLoadingId) === String(row.id) ? 'Loading…' : 'View'}
                            </Button>
                          </td>
                          <td className="border-b border-slate-100/80 px-4 py-3.5 text-center align-top">
                            {showApproveReject ? (
                              <div className="flex flex-wrap justify-center gap-2 pt-0.5">
                                {(canReject || !Object.keys(act).length) && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={
                                      rowBusy || loading || !token || (Object.keys(act).length > 0 && !canReject)
                                    }
                                    onClick={() => onRejectClick(row.id)}
                                  >
                                    Reject
                                  </Button>
                                )}
                                {(canApprove || !Object.keys(act).length) && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      rowBusy || loading || !token || (Object.keys(act).length > 0 && !canApprove)
                                    }
                                    onClick={() => void onApprove(row.id)}
                                  >
                                    {busyApprove ? 'Approving…' : 'Approve'}
                                  </Button>
                                )}
                              </div>
                            ) : locked ? (
                              <NotificationDecisionBadge
                                status={row.status}
                                approvedAt={row.approvedAt}
                              />
                            ) : null}
                          </td>
                          <td className="min-w-[11rem] border-b border-slate-100/80 px-4 py-3.5 text-center align-middle">
                            {showReadReport ? (
                              <ReadReportActionButton
                                disabled={!token}
                                onClick={() => openReadReport(row)}
                              />
                            ) : (
                              <span className="text-sm text-slate-400" aria-hidden>
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loading ? (
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
