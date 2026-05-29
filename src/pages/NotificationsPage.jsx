import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { fetchTeacherNotificationsMine } from '../api/notificationsApi'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { NotificationTable } from '../components/notifications/NotificationTable'
import { ParentMessageDetailModal } from '../components/parent/ParentMessageDetailModal'
import { NotificationReadReportModal } from '../components/notifications/NotificationReadReportModal'
import { DateRangeSelect } from '../components/ui/DateRangeSelect'
import { useNotificationDetailViewer } from '../hooks/useNotificationDetailViewer'
import { ROLES } from '../utils/constants'

const MINE_PAGE_LIMIT = 10

export default function NotificationsPage() {
  const { token, user } = useAuth()

  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState('all')
  const [total, setTotal] = useState(0)
  const [serverRows, setServerRows] = useState([])
  const [serverOk, setServerOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [readReport, setReadReport] = useState({ open: false, id: null, title: '' })

  const {
    viewModalOpen,
    viewLoading,
    viewLoadingId,
    viewDetail,
    viewError,
    closeViewModal,
    openNotificationDetail,
  } = useNotificationDetailViewer(token, 'teacher-mine')

  const load = useCallback(async () => {
    if (!token || user?.role !== ROLES.TEACHER) {
      setServerOk(false)
      setLoading(false)
      setServerRows([])
      setTotal(0)
      return
    }
    setLoading(true)
    const res = await fetchTeacherNotificationsMine(token, {
      page,
      limit: MINE_PAGE_LIMIT,
      dateRange,
    })
    setLoading(false)
    if (res.ok) {
      setServerRows(res.notifications)
      setTotal(res.total)
      setServerOk(true)
      return
    }
    setServerOk(false)
    setServerRows([])
    setTotal(0)
    if (!res.useClient) {
      toast.error(res.error)
    }
  }, [token, user?.role, page, dateRange])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const awaitingFirstTeacherFetch =
    Boolean(token && user?.role === ROLES.TEACHER) && loading && !serverOk
  const rows = awaitingFirstTeacherFetch ? [] : serverOk ? serverRows : []

  const totalPages = Math.max(1, Math.ceil(total / MINE_PAGE_LIMIT))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="shrink-0 text-lg font-semibold text-slate-900">Notifications</h2>
          {token && user?.role === ROLES.TEACHER ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 lg:gap-3">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your notifications…"
                aria-label="Search notifications"
                className="min-w-[10rem] flex-1 sm:max-w-xs lg:max-w-sm"
              />
              <DateRangeSelect
                id="teacher-notifications-date-range"
                hideLabel
                className="w-auto shrink-0"
                selectClassName="min-w-[9.5rem]"
                value={dateRange}
                disabled={loading}
                onChange={(key) => {
                  setDateRange(key)
                  setPage(1)
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                disabled={loading}
                onClick={() => void load()}
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Everything you have submitted and its approval status.</p>
          )}
        </div>
        {awaitingFirstTeacherFetch ? (
          <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-6">
            Loading your notifications from server…
          </p>
        ) : (
          <>
            <NotificationTable
              notifications={rows}
              hideSearch
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              showViewColumn={user?.role === ROLES.TEACHER}
              viewDisabled={!token}
              viewLoadingId={viewLoading ? viewLoadingId : null}
              onView={(n) => void openNotificationDetail(n.id)}
              showReadReportColumn={user?.role === ROLES.TEACHER}
              readReportDisabled={!token}
              onReadReport={(n) =>
                setReadReport({ open: true, id: n.id, title: n.title || '' })
              }
            />
            {serverOk && total > MINE_PAGE_LIMIT ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 text-sm text-slate-600">
                <span className="font-medium">
                  Showing {(page - 1) * MINE_PAGE_LIMIT + 1}–{Math.min(page * MINE_PAGE_LIMIT, total)} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canPrev || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {page} / {totalPages}
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
          </>
        )}
      </Card>

      <ParentMessageDetailModal
        open={viewModalOpen}
        onClose={closeViewModal}
        loading={viewLoading}
        error={viewError}
        item={viewDetail}
        modalTitle="Your notice"
      />

      <NotificationReadReportModal
        open={readReport.open}
        onClose={() => setReadReport({ open: false, id: null, title: '' })}
        notificationId={readReport.id}
        notificationTitle={readReport.title}
        token={token}
      />
    </div>
  )
}
