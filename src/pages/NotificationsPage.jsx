import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { fetchTeacherNotificationsMine } from '../api/notificationsApi'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { NotificationTable } from '../components/notifications/NotificationTable'
import { ROLES } from '../utils/constants'

const MINE_PAGE_LIMIT = 20

export default function NotificationsPage() {
  const { token, user } = useAuth()

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [serverRows, setServerRows] = useState([])
  const [serverOk, setServerOk] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token || user?.role !== ROLES.TEACHER) {
      setServerOk(false)
      setLoading(false)
      setServerRows([])
      setTotal(0)
      return
    }
    setLoading(true)
    const res = await fetchTeacherNotificationsMine(token, { page, limit: MINE_PAGE_LIMIT })
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
  }, [token, user?.role, page])

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
        <CardHeader
          title="Notifications"
          subtitle={
            serverOk
              ? ``
              : 'Everything you have submitted and its approval status.'
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              {token && user?.role === ROLES.TEACHER ? (
                <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={() => void load()}>
                  {loading ? 'Refreshing…' : 'Refresh'}
                </Button>
              ) : null}
              <Link to="/notifications/create">
                <Button type="button" size="sm">
                  New notification
                </Button>
              </Link>
            </div>
          }
        />
        {awaitingFirstTeacherFetch ? (
          <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-6">
            Loading your notifications from server…
          </p>
        ) : (
          <>
            <NotificationTable notifications={rows} />
            {serverOk && totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-1 pt-4 text-sm text-slate-600">
                <span>
                  {total ? (
                    <>
                      Showing {(page - 1) * MINE_PAGE_LIMIT + 1}–{Math.min(page * MINE_PAGE_LIMIT, total)} of {total}
                    </>
                  ) : (
                    'No items'
                  )}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canPrev || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
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
    </div>
  )
}
