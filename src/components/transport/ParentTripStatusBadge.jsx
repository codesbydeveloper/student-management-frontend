import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5'

/**
 * Green Active / red Inactive pill — trip started vs not started.
 */
export function ParentTripStatusBadge({ active, className = '' }) {
  if (active) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-800 shadow-sm ${className}`}
        role="status"
        aria-live="polite"
      >
        <IoCheckmarkCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        Active
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-bold text-red-800 shadow-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      <IoCloseCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
      Inactive
    </div>
  )
}
