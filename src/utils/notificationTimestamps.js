/**
 * Parse notification timestamps from API (ISO, epoch, or server display strings).
 * @param {unknown} v
 * @returns {number | null} epoch ms
 */
export function parseNotificationTimestamp(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v < 1e12 ? v * 1000 : v
  }
  const s = String(v).trim()
  if (!s) return null
  const iso = Date.parse(s)
  if (!Number.isNaN(iso)) return iso

  const m = s.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i,
  )
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2]) - 1
    const year = Number(m[3])
    let hour = Number(m[4])
    const min = Number(m[5])
    const sec = m[6] != null ? Number(m[6]) : 0
    const ampm = String(m[7]).toUpperCase()
    if (ampm === 'PM' && hour < 12) hour += 12
    if (ampm === 'AM' && hour === 12) hour = 0
    const d = new Date(year, month, day, hour, min, sec)
    if (!Number.isNaN(d.getTime())) return d.getTime()
  }

  return null
}

/** @param {object} raw */
export function pickApprovedAtMs(raw, fallback = null) {
  if (!raw || typeof raw !== 'object') return fallback
  const candidates = [
    raw.approvedAt,
    raw.approved_at,
    raw.approvedOn,
    raw.approved_on,
    raw.approvedDate,
    raw.approved_date,
  ]
  for (const c of candidates) {
    const ms = parseNotificationTimestamp(c)
    if (ms != null) return ms
  }
  return fallback
}

/**
 * Date + time under Approved badge — always 12-hour clock (e.g. 2:49 PM, not 14:49).
 * @param {unknown} ts
 */
export function formatApprovalDateTime(ts) {
  const ms = typeof ts === 'number' ? ts : parseNotificationTimestamp(ts)
  if (ms == null) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(ms)
  } catch {
    return null
  }
}
