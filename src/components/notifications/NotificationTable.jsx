import { useMemo, useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { Input } from '../ui/Input'
import { StatusBadge } from './StatusBadge'
import { NOTIFICATION_CATEGORY_LABELS } from '../../utils/notificationConstants'
import { formatTargetSummary, formatTargetTypeLabel } from '../../utils/notificationFormat'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(ts)
  } catch {
    return '—'
  }
}

export function NotificationTable({ notifications }) {
  const { classes, students } = useAppData()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notifications
    return notifications.filter((n) => {
      const blob = [
        n.title,
        n.message,
        NOTIFICATION_CATEGORY_LABELS[n.category],
        formatTargetTypeLabel(n.targetType),
        formatTargetSummary(n, classes, students),
        n.status,
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
          placeholder="Search your notifications…"
          aria-label="Search notifications"
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
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                    No notifications yet. Create one to see it here.
                  </td>
                </tr>
              ) : (
                filtered.map((n, idx) => (
                  <tr key={n.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="max-w-[200px] px-4 py-3 font-semibold text-slate-900">{n.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {NOTIFICATION_CATEGORY_LABELS[n.category] || n.category}
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
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(n.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
