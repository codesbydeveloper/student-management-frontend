function StatBox({ label, value }) {
  return (
    <div className="min-w-[5.5rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center shadow-sm sm:min-w-[6rem] sm:flex-none">
      <p className="text-[10px] font-medium leading-tight text-slate-600">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums leading-tight text-slate-900">{value}</p>
    </div>
  )
}

/**
 * Compact stat boxes beside queue / category row.
 * Pass `pending` to show Total / Pending / Approved (notice history).
 * Omit `pending` for Total / Approved / Rejected (approval queues).
 * @param {{ align?: 'start' | 'end', pending?: number }} props
 */
export function NotificationApprovalStatsBoxes({
  total,
  approved,
  rejected,
  pending,
  loading = false,
  align = 'start',
}) {
  if (loading) {
    return <p className={`text-xs text-slate-500 ${align === 'end' ? 'ml-auto' : ''}`}>Loading…</p>
  }

  const showPending = pending !== undefined && pending !== null

  return (
    <div
      className={`flex w-full shrink-0 items-stretch gap-2 sm:w-auto ${
        align === 'end' ? 'lg:ml-auto lg:w-auto' : ''
      }`}
    >
      <StatBox label="Total" value={total} />
      {showPending ? (
        <>
          <StatBox label="Pending" value={pending} />
          <StatBox label="Approved" value={approved} />
        </>
      ) : (
        <>
          <StatBox label="Approved" value={approved} />
          <StatBox label="Rejected" value={rejected} />
        </>
      )}
    </div>
  )
}
