import { Modal } from '../Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
} from '../../utils/notificationConstants'

const categoryBadge = {
  [NOTIFICATION_CATEGORIES.ADMINISTRATIVE]:
    'bg-sky-50 text-sky-900 ring-sky-300/40 shadow-sm shadow-sky-900/[0.04]',
  [NOTIFICATION_CATEGORIES.ACADEMIC]:
    'bg-emerald-50 text-emerald-900 ring-emerald-300/40 shadow-sm shadow-emerald-900/[0.04]',
}

/**
 * Full message from GET /api/parents/messages/:id (mapped feed item).
 */
export function ParentMessageDetailModal({ open, onClose, loading, error, item }) {
  const showBody = !loading && !error && item

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="School message"
      size="lg"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-600">Loading message…</p>
      ) : null}
      {error && !loading ? (
        <p className="text-sm font-medium text-red-800">{error}</p>
      ) : null}
      {showBody ? (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h4 className="text-base font-bold text-slate-900 sm:text-lg">{item.title}</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  categoryBadge[item.category] || 'bg-slate-50 text-slate-800 ring-slate-200/60'
                }
              >
                {NOTIFICATION_CATEGORY_LABELS[item.category] || item.category}
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-900 ring-emerald-600/25">Approved</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-700">
              {item.message?.trim() ? item.message : '—'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">For</span>
            <div className="flex flex-wrap gap-1.5">
              {(item._feedChildNames || []).map((name) => (
                <Badge key={name} className="bg-indigo-50 text-indigo-900 ring-indigo-300/40">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
