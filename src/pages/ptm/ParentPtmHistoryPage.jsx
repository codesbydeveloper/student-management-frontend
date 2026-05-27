import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PtmRequestDetailModal } from '../../components/ptm/PtmRequestDetailModal'
import { PtmRequestsTable } from '../../components/ptm/PtmRequestsTable'
import { fetchMyPtmRequests } from '../../api/ptmApi'
import { useOpenPtmRequestFromBell } from '../../hooks/useOpenPtmRequestFromBell'
import { usePtmRequestViewer } from '../../hooks/usePtmRequestViewer'
import { ROLES } from '../../utils/constants'

const PAGE_LIMIT = 20

export default function ParentPtmHistoryPage() {
  const { user, token } = useAuth()
  const [apiRows, setApiRows] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const { viewRow, viewLoading, viewError, openView, closeView } = usePtmRequestViewer(token)
  useOpenPtmRequestFromBell(openView)

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
        <CardHeader title="PTM history" />

        {apiRows === null ? (
          <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-6">
            Loading your meetings…
          </p>
        ) : null}

        {error ? (
          <p className="border-t border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 sm:px-6">
            {error}
          </p>
        ) : null}

        {apiRows !== null ? (
          <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
            <PtmRequestsTable
              rows={merged}
              showParent={false}
              showApprovedBy
              emptyMessage={
                error
                  ? 'Could not load meetings.'
                  : 'No meetings yet. Use New request to send your first PTM request.'
              }
              onView={(row) => void openView(row)}
            />
            {apiRows !== null && merged.length === 0 && !error ? (
              <p className="mt-3 text-center text-sm text-slate-600">
                <Link to="/parent/ptm/request" className="font-semibold text-indigo-700 underline">
                  Send your first request
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {apiRows !== null && total > PAGE_LIMIT ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-500 sm:px-6">
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

      <PtmRequestDetailModal
        open={Boolean(viewRow)}
        row={viewRow}
        loading={viewLoading}
        error={viewError}
        onClose={closeView}
        footer={
          <Button type="button" variant="secondary" onClick={closeView}>
            Close
          </Button>
        }
      />
    </div>
  )
}
