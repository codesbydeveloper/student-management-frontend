import { useMemo, useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_STATUSES,
} from '../../utils/notificationConstants'
import { formatTargetSummary, formatTargetTypeLabel } from '../../utils/notificationFormat'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ts)
  } catch {
    return '—'
  }
}

export function ApprovalTable({ notifications, onApprove, onReject }) {
  const { classes, students } = useAppData()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notifications
    return notifications.filter((n) => {
      const blob = [
        n.title,
        n.message,
        n.createdByName,
        NOTIFICATION_CATEGORY_LABELS[n.category],
        formatTargetSummary(n, classes, students),
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [notifications, query, classes, students])

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pending items…"
          aria-label="Search approvals"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">From</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                    No pending notifications in this queue.
                  </td>
                </tr>
              ) : (
                filtered.map((n, idx) => {
                  const locked =
                    n.status === NOTIFICATION_STATUSES.APPROVED ||
                    n.status === NOTIFICATION_STATUSES.REJECTED
                  return (
                  <tr key={n.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="max-w-[180px] px-4 py-3 align-top">
                      <p className="font-semibold text-slate-900">{n.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
                      {NOTIFICATION_CATEGORY_LABELS[n.category]}
                    </td>
                    <td className="max-w-xs min-w-[10rem] px-4 py-3.5 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">
                          {formatTargetTypeLabel(n.targetType)}
                        </span>
                        <span className="text-sm font-medium leading-snug text-slate-800">
                          {formatTargetSummary(n, classes, students)}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-medium text-slate-800">
                      {n.createdByName || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
                      {formatDate(n.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-right">
                      {locked ? (
                        <div className="flex justify-end">
                          <Badge
                            className={
                              n.status === NOTIFICATION_STATUSES.APPROVED
                                ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
                                : 'bg-slate-100 text-slate-700 ring-slate-500/20'
                            }
                          >
                            {n.status === NOTIFICATION_STATUSES.APPROVED ? 'Approved' : 'Rejected'}
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => onReject(n.id)}>
                            Reject
                          </Button>
                          <Button type="button" size="sm" onClick={() => onApprove(n.id)}>
                            Approve
                          </Button>
                        </div>
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
    </div>
  )
}
