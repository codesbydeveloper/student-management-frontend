import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ApprovalTable } from '../components/notifications/ApprovalTable'
import { ApprovalListPagination } from '../components/notifications/ApprovalListPagination'
import { DeliveryModal } from '../components/notifications/DeliveryModal'
import { RejectReasonModal } from '../components/notifications/RejectReasonModal'
import { NotificationReadReportModal } from '../components/notifications/NotificationReadReportModal'
import { ParentMessageDetailModal } from '../components/parent/ParentMessageDetailModal'
import { useNotificationDetailViewer } from '../hooks/useNotificationDetailViewer'
import {
  fetchPendingPrincipalNotifications,
  patchNotificationApprove,
  patchNotificationReject,
} from '../api/notificationsApi'
import { ROLES } from '../utils/constants'
import { pickApprovedAtMs } from '../utils/notificationTimestamps'
import { NOTIFICATION_STATUSES } from '../utils/notificationConstants'
import { requestParentMessagesRefresh } from '../utils/parentMessagesRefreshBus'

const PAGE_LIMIT = 10

export default function NotificationPrincipalApprovalPage() {
  const { user, token } = useAuth()
  const { getNotificationsByRole, approveNotification, rejectNotification } = useNotifications()

  const [serverPending, setServerPending] = useState([])
  const [serverListOk, setServerListOk] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const [delivery, setDelivery] = useState({ open: false, title: '' })
  const [settledRows, setSettledRows] = useState([])
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '', title: '' })
  const [rejectSubmitting, setRejectSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [readReport, setReadReport] = useState({ open: false, id: null, title: '' })

  const {
    viewModalOpen,
    viewLoading,
    viewLoadingId,
    viewDetail,
    viewError,
    closeViewModal,
    openNotificationDetail,
  } = useNotificationDetailViewer(token, 'pending-principal')

  const loadPending = useCallback(async () => {
    if (!token || user?.role !== ROLES.PRINCIPAL) {
      setServerPending([])
      setServerListOk(false)
      setListLoading(false)
      setListError(null)
      return
    }
    setListLoading(true)
    setListError(null)
    const res = await fetchPendingPrincipalNotifications(token, { page, limit: PAGE_LIMIT })
    setListLoading(false)
    if (res.ok) {
      setServerPending(res.notifications)
      setTotal(res.total)
      setHasNext(Boolean(res.hasNext))
      setServerListOk(true)
      setListError(null)
      return
    }
    setServerPending([])
    setTotal(0)
    setHasNext(false)
    setServerListOk(false)
    setListError(res.error || 'Could not load pending list.')
    if (!res.useClient) {
      toast.error(res.error)
    }
  }, [token, user?.role, page])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadPending()
    }, 0)
    return () => window.clearTimeout(t)
  }, [loadPending])

  useEffect(() => {
    if (!token) setSettledRows([])
  }, [token])

  const localRows = getNotificationsByRole()
  const awaitingServerList =
    Boolean(token && user?.role === ROLES.PRINCIPAL) && listLoading && !listError && !serverListOk

  const rows = useMemo(() => {
    if (awaitingServerList) return []
    if (!serverListOk) return localRows
    const ids = new Set(serverPending.map((n) => String(n.id)))
    const extras = settledRows.filter((s) => !ids.has(String(s.id)))
    return [...serverPending, ...extras]
  }, [awaitingServerList, serverListOk, serverPending, localRows, settledRows])

  const onApprove = async (id) => {
    if (serverListOk && token) {
      const sid = String(id)
      const snapshot = serverPending.find((n) => String(n.id) === sid)
      const res = await patchNotificationApprove(token, id)
      if (res.ok) {
        toast.success('Approved successfully.')
        const d = res.data
        const title = typeof d?.title === 'string' ? d.title : serverPending.find((n) => n.id === id)?.title || ''
        setDelivery({ open: true, title })
        if (snapshot) {
          setSettledRows((prev) => [
            {
              ...snapshot,
              status: NOTIFICATION_STATUSES.APPROVED,
              approvedAt: pickApprovedAtMs(d, Date.now()),
            },
            ...prev.filter((x) => String(x.id) !== sid),
          ])
        }
        requestParentMessagesRefresh()
        await loadPending()
        return
      }
      if (!res.useClient) {
        toast.error(res.error)
        return
      }
      toast.info('Approve API unavailable — trying local queue.')
    }

    const res = approveNotification(id, user.role)
    if (!res.ok) {
      toast.error(res.error || 'Unable to approve.')
      return
    }
    toast.success('Approved successfully.')
    requestParentMessagesRefresh()
    setDelivery({
      open: true,
      title: res.notification?.title || '',
    })
  }

  const closeRejectModal = () => {
    if (rejectSubmitting) return
    setRejectModal({ open: false, id: null, reason: '', title: '' })
  }

  const confirmServerReject = async () => {
    const id = rejectModal.id
    if (id == null || !token) return
    const sid = String(id)
    const snapshot = serverPending.find((n) => String(n.id) === sid)
    setRejectSubmitting(true)
    try {
      const res = await patchNotificationReject(token, id, { reason: rejectModal.reason.trim() })
      if (res.ok) {
        toast.info('Rejected')
        if (snapshot) {
          setSettledRows((prev) => [
            { ...snapshot, status: NOTIFICATION_STATUSES.REJECTED },
            ...prev.filter((x) => String(x.id) !== sid),
          ])
        }
        closeRejectModal()
        await loadPending()
        return
      }
      if (!res.useClient) {
        toast.error(res.error)
        return
      }
      toast.info('Reject API unavailable — trying local queue.')
    } finally {
      setRejectSubmitting(false)
    }
  }

  const onReject = async (id) => {
    if (serverListOk && token) {
      const row = serverPending.find((n) => String(n.id) === String(id))
      setRejectModal({
        open: true,
        id,
        reason: '',
        title: row?.title || '',
      })
      return
    }

    const res = rejectNotification(id, user.role)
    if (!res.ok) {
      toast.error(res.error || 'Unable to reject.')
      return
    }
    toast.info('Rejected')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Academic approvals"
          subtitle={
            serverListOk
              ? ''
              : 'Review and action pending Academic notifications from teachers.'
          }
          action={
            token && user?.role === ROLES.PRINCIPAL ? (
              <Button type="button" variant="secondary" size="sm" disabled={listLoading} onClick={() => void loadPending()}>
                {listLoading ? 'Refreshing…' : 'Refresh'}
              </Button>
            ) : null
          }
        />
        {listError && !serverListOk ? (
          <p className="border-t border-slate-100 px-4 py-3 text-sm text-amber-800 sm:px-6">{listError} Showing local queue if any.</p>
        ) : null}
        {awaitingServerList ? (
          <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-6">Loading pending notifications from server…</p>
        ) : (
          <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
            <ApprovalTable
              notifications={rows}
              onApprove={onApprove}
              onReject={onReject}
              showViewColumn
              viewDisabled={!token}
              viewLoadingId={viewLoading ? viewLoadingId : null}
              onView={(n) => void openNotificationDetail(n.id)}
              showReadReportColumn
              readReportDisabled={!token}
              onReadReport={(n) =>
                setReadReport({ open: true, id: n.id, title: n.title || '' })
              }
            />
            {serverListOk ? (
              <ApprovalListPagination
                page={page}
                total={total}
                limit={PAGE_LIMIT}
                hasNext={hasNext}
                loading={listLoading}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => p + 1)}
              />
            ) : null}
          </div>
        )}
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
        onConfirm={confirmServerReject}
        submitting={rejectSubmitting}
      />

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
    </div>
  )
}
