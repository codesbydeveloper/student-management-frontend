import { Badge } from '../ui/Badge'
import {
  NOTIFICATION_STATUSES,
} from '../../utils/notificationConstants'

const styles = {
  [NOTIFICATION_STATUSES.PENDING_ADMIN]:
    'bg-amber-100 text-amber-900 ring-amber-600/25',
  [NOTIFICATION_STATUSES.PENDING_PRINCIPAL]:
    'bg-amber-100 text-amber-900 ring-amber-600/25',
  [NOTIFICATION_STATUSES.APPROVED]: 'bg-emerald-100 text-emerald-900 ring-emerald-600/25',
  [NOTIFICATION_STATUSES.REJECTED]: 'bg-red-100 text-red-800 ring-red-600/25',
}

export function StatusBadge({ status }) {
  if (status == null || status === '') {
    return (
      <Badge className="bg-slate-100 text-slate-600 ring-slate-500/20">—</Badge>
    )
  }

  const isPending =
    status === NOTIFICATION_STATUSES.PENDING_ADMIN ||
    status === NOTIFICATION_STATUSES.PENDING_PRINCIPAL

  const label = isPending
    ? 'Pending'
    : status === NOTIFICATION_STATUSES.APPROVED
      ? 'Approved'
      : status === NOTIFICATION_STATUSES.REJECTED
        ? 'Rejected'
        : status

  const cls = styles[status] || 'bg-slate-100 text-slate-700 ring-slate-500/20'

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge className={cls}>{label}</Badge>
      {status === NOTIFICATION_STATUSES.APPROVED ? (
        <Badge className="bg-indigo-100 text-indigo-900 ring-indigo-600/25">Delivered</Badge>
      ) : null}
    </span>
  )
}
