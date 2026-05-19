import { Button } from '../ui/Button'

/**
 * Previous / next controls for paginated approval queues.
 */
export function ApprovalListPagination({
  page,
  total,
  limit,
  hasNext,
  loading,
  onPrev,
  onNext,
  emptyLabel = 'No pending items on this page',
}) {
  const lim = Math.max(1, Number(limit) || 10)
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  const canPrev = page > 1
  const canNext = hasNext || page < totalPages
  const rangeStart = total === 0 ? 0 : (page - 1) * lim + 1
  const rangeEnd = total === 0 ? 0 : Math.min(page * lim, total)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
      <span>
        {total > 0 ? (
          <>
            Showing {rangeStart}–{rangeEnd} of {total}
          </>
        ) : (
          <>{emptyLabel}</>
        )}
      </span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={!canPrev || loading} onClick={onPrev}>
          Previous
        </Button>
        <span className="flex items-center px-2 text-xs text-slate-500">
          Page {page} of {totalPages}
        </span>
        <Button type="button" variant="secondary" size="sm" disabled={!canNext || loading} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}
