function StatBox({ label, value }) {
  return (
    <div className="w-[5.25rem] rounded-lg border border-slate-200 bg-white px-2 py-2 text-center shadow-sm sm:w-24">
      <p className="text-[10px] font-medium leading-tight text-slate-600">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums leading-tight text-slate-900">{value}</p>
    </div>
  )
}

/**
 * Total / Approved / Rejected — compact boxes beside the queue row.
 * @param {{ align?: 'start' | 'end' }} props
 */
export function NotificationApprovalStatsBoxes({
  total,
  approved,
  rejected,
  loading = false,
  align = 'start',
}) {
  if (loading) {
    return <p className={`text-xs text-slate-500 ${align === 'end' ? 'ml-auto' : ''}`}>Loading…</p>
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-2 ${
        align === 'end' ? 'ml-auto' : ''
      }`}
    >
      <StatBox label="Total" value={total} />
      <StatBox label="Approved" value={approved} />
      <StatBox label="Rejected" value={rejected} />
    </div>
  )
}
