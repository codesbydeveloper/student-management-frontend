import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ApprovalTable } from '../components/notifications/ApprovalTable'
import { DeliveryModal } from '../components/notifications/DeliveryModal'
import { RejectReasonModal } from '../components/notifications/RejectReasonModal'
import {
  fetchPendingPrincipalNotifications,
  patchNotificationApprove,
  patchNotificationReject,
} from '../api/notificationsApi'
import { ROLES } from '../utils/constants'
import { NOTIFICATION_STATUSES } from '../utils/notificationConstants'
import { requestParentMessagesRefresh } from '../utils/parentMessagesRefreshBus'

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
    const res = await fetchPendingPrincipalNotifications(token)
    setListLoading(false)
    if (res.ok) {
      setServerPending(res.notifications)
      setServerListOk(true)
      return
    }
    setServerPending([])
    setServerListOk(false)
    setListError(res.error || 'Could not load pending list.')
    if (!res.useClient) {
      toast.error(res.error)
    }
  }, [token, user?.role])

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
            { ...snapshot, status: NOTIFICATION_STATUSES.APPROVED },
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
              ? 'Pending items from the server (GET /api/notifications/pending/principal). Approve/reject uses your principal token.'
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
          <ApprovalTable notifications={rows} onApprove={onApprove} onReject={onReject} />
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
    </div>
  )
}
