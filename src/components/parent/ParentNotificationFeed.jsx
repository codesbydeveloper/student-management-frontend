import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { useNotifications } from '../../context/NotificationContext'
import { fetchParentMessageById, fetchParentMessages } from '../../api/parentsApi'
import { getLinkedStudentIdsForParent } from '../../utils/parentUtils'
import { onParentMessagesRefreshRequested } from '../../utils/parentMessagesRefreshBus'
import { ROLES } from '../../utils/constants'
import { ChildFilter } from './ChildFilter'
import { NotificationCard } from './NotificationCard'
import { ParentMessageDetailModal } from './ParentMessageDetailModal'
import { Button } from '../ui/Button'

const MESSAGES_PAGE_LIMIT = 20

/**
 * School messages for parents: loads from GET /api/parents/messages when signed in as a parent;
 * otherwise uses the in-app simulation from NotificationContext.
 */
export function ParentNotificationFeed() {
  const { user, token } = useAuth()
  const { parents, students } = useAppData()
  const { getParentNotifications } = useNotifications()
  const [filterStudentId, setFilterStudentId] = useState('all')

  const useServerFeed = Boolean(token && user?.role === ROLES.PARENT)

  const [serverItems, setServerItems] = useState([])
  const [serverLoading, setServerLoading] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewLoadingId, setViewLoadingId] = useState(null)
  const [viewDetail, setViewDetail] = useState(null)
  const [viewError, setViewError] = useState(null)
  const viewFetchSeq = useRef(0)

  useEffect(() => {
    let debounceTimer = null
    const schedule = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null
        setRefreshKey((k) => k + 1)
      }, 200)
    }
    const unsub = onParentMessagesRefreshRequested(schedule)
    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer)
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!useServerFeed) {
      setServerItems([])
      setServerError(null)
      setHasNext(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setServerLoading(true)
      setServerError(null)
      const res = await fetchParentMessages(token, { page: 1, limit: MESSAGES_PAGE_LIMIT })
      if (cancelled) return
      setServerLoading(false)
      if (!res.ok) {
        setServerError(res.error)
        setServerItems([])
        setHasNext(false)
        return
      }
      setHasNext(res.hasNextPage)
      setPage(res.page)
      setServerItems(res.messages)
    })()
    return () => {
      cancelled = true
    }
  }, [useServerFeed, token, refreshKey])

  const onRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const closeViewModal = useCallback(() => {
    viewFetchSeq.current += 1
    setViewModalOpen(false)
    setViewLoading(false)
    setViewLoadingId(null)
    setViewDetail(null)
    setViewError(null)
  }, [])

  const openMessageDetail = useCallback(
    async (messageId) => {
      if (!token || !useServerFeed) return
      const seq = ++viewFetchSeq.current
      setViewModalOpen(true)
      setViewLoading(true)
      setViewLoadingId(String(messageId))
      setViewDetail(null)
      setViewError(null)
      const res = await fetchParentMessageById(token, messageId)
      if (seq !== viewFetchSeq.current) return
      setViewLoading(false)
      setViewLoadingId(null)
      if (!res.ok) {
        setViewError(res.error || 'Could not load message.')
        return
      }
      setViewDetail(res.message)
    },
    [token, useServerFeed],
  )

  const onLoadMore = useCallback(async () => {
    if (!token || !hasNext || serverLoading) return
    const nextPage = page + 1
    setServerLoading(true)
    const res = await fetchParentMessages(token, { page: nextPage, limit: MESSAGES_PAGE_LIMIT })
    setServerLoading(false)
    if (!res.ok) {
      toast.error(res.error || 'Could not load more messages.')
      return
    }
    setHasNext(res.hasNextPage)
    setPage(res.page)
    setServerItems((prev) => {
      const merged = [...prev, ...res.messages]
      const seen = new Set()
      return merged.filter((m) => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
    })
  }, [token, hasNext, serverLoading, page])

  const childIds = useMemo(() => getLinkedStudentIdsForParent(user, parents), [user, parents])

  const childrenList = useMemo(() => {
    return childIds
      .map((id) => students.find((s) => s.id === id))
      .filter(Boolean)
  }, [childIds, students])

  const filteredServerItems = useMemo(() => {
    if (filterStudentId === 'all') return serverItems
    return serverItems.filter((item) => {
      const ids = item._feedMatchingStudentIds || []
      if (!ids.length) return false
      return ids.includes(filterStudentId)
    })
  }, [serverItems, filterStudentId])

  const localItems = useMemo(
    () => (useServerFeed ? [] : getParentNotifications(user.id, filterStudentId)),
    [useServerFeed, getParentNotifications, user.id, filterStudentId],
  )

  const items = useServerFeed ? filteredServerItems : localItems

  return (
    <div className="space-y-6">
      <ParentMessageDetailModal
        open={viewModalOpen}
        onClose={closeViewModal}
        loading={viewLoading}
        error={viewError}
        item={viewDetail}
      />
      {useServerFeed ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
         
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onRefresh}
            disabled={serverLoading}
          >
            Refresh
          </Button>
        </div>
      ) : null}

      {serverError && useServerFeed ? (
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Could not load school messages</p>
          <p className="mt-1 text-amber-900/90">{serverError}</p>
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onRefresh}>
            Try again
          </Button>
        </div>
      ) : null}

      {childrenList.length > 0 ? (
        <ChildFilter
          value={filterStudentId}
          onChange={setFilterStudentId}
          childrenList={childrenList}
        />
      ) : null}

      {useServerFeed && serverLoading && items.length === 0 && !serverError ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">Loading school messages…</p>
        </div>
      ) : null}

      {items.length === 0 && !(useServerFeed && serverLoading && !serverError) ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">No messages to show</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            {useServerFeed && serverItems.length > 0 && filterStudentId !== 'all'
              ? 'Nothing in this list for the selected child. Try “All children” or load more pages.'
              : useServerFeed
                ? 'When your school posts notices for your family, they will show up here.'
                : 'When teachers send approved messages that include your children, they will appear here. Sign in as a parent to load messages from the server.'}
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationCard
                item={item}
                showViewButton={useServerFeed}
                onViewClick={() => void openMessageDetail(item.id)}
                viewLoading={viewLoadingId === String(item.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {useServerFeed && hasNext && items.length > 0 ? (
        <div className="flex justify-center border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={() => void onLoadMore()} disabled={serverLoading}>
            {serverLoading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
