import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
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

function firstNames(names) {
  return names.map((n) => n.trim().split(/\s+/)[0] || n).join(', ')
}

/**
 * One row in the parent notification feed (approved items only).
 * @param {object} props
 * @param {object} props.item — notification + feed fields from NotificationContext
 * @param {boolean} [props.showViewButton] — parent server feed: show View (opens detail via API)
 * @param {() => void} [props.onViewClick]
 * @param {boolean} [props.viewLoading]
 */
export function NotificationCard({ item, showViewButton = false, onViewClick, viewLoading = false }) {
  const cat = item.category
  const catCls = categoryBadge[cat] || 'bg-slate-50 text-slate-800 ring-slate-200/60'
  const names = item._feedChildNames || []
  const multi = names.length > 1

  const heading = multi ? `${item.title} (${firstNames(names)})` : item.title

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition hover:border-slate-300/90 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">{heading}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={catCls}>{NOTIFICATION_CATEGORY_LABELS[cat] || cat}</Badge>
          <Badge className="bg-emerald-100 text-emerald-900 ring-emerald-600/25">Approved</Badge>
          {showViewButton ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onViewClick}
              disabled={viewLoading}
            >
              {viewLoading ? 'Loading…' : 'View'}
            </Button>
          ) : null}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.message}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">For</span>
        {multi ? (
          <div className="flex flex-wrap gap-1.5">
            {names.map((name) => (
              <Badge
                key={name}
                className="bg-indigo-50 text-indigo-900 ring-indigo-300/40"
              >
                {name}
              </Badge>
            ))}
          </div>
        ) : (
          <Badge className="bg-indigo-50 text-indigo-900 ring-indigo-300/40">
            {item._feedChildNamesLabel || names[0] || '—'}
          </Badge>
        )}
      </div>
    </article>
  )
}
