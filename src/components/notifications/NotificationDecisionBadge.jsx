import { Badge } from '../ui/Badge'
import { NOTIFICATION_STATUSES } from '../../utils/notificationConstants'
import { formatApprovalDateTime } from '../../utils/notificationTimestamps'

/**
 * Locked approval row: Approved / Rejected with approval date-time under Approved.
 */
export function NotificationDecisionBadge({ status, approvedAt }) {
  const isApproved = status === NOTIFICATION_STATUSES.APPROVED
  const isRejected = status === NOTIFICATION_STATUSES.REJECTED
  if (!isApproved && !isRejected) return null

  const when = isApproved ? formatApprovalDateTime(approvedAt) : null

  return (
    <div className="flex flex-col items-center gap-1 pt-0.5">
      <Badge
        className={
          isApproved
            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/25'
            : 'bg-slate-100 text-slate-700 ring-1 ring-slate-500/20'
        }
      >
        {isApproved ? 'Approved' : 'Rejected'}
      </Badge>
      {when && approvedAt != null ? (
        <time
          dateTime={new Date(approvedAt).toISOString()}
          className="max-w-[9rem] text-center text-[10px] font-medium leading-tight text-slate-500 tabular-nums"
        >
          {when}
        </time>
      ) : null}
    </div>
  )
}
