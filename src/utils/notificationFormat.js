import { NOTIFICATION_TARGET_LABELS, NOTIFICATION_TARGET_TYPES } from './notificationConstants'

export function formatTargetSummary(notification, classes, students) {
  const summary = notification?.targetSummary != null ? String(notification.targetSummary).trim() : ''
  if (summary) return summary
  if (!notification?.targetIds?.length) return '—'
  const { targetType, targetIds } = notification

  if (targetType === NOTIFICATION_TARGET_TYPES.CLASS) {
    return targetIds
      .map((id) => classes.find((c) => c.id === id)?.name || id)
      .join(', ')
  }

  if (targetType === NOTIFICATION_TARGET_TYPES.SECTION) {
    return targetIds
      .map((raw) => {
        const [classId, sec] = String(raw).split('|')
        const cls = classes.find((c) => c.id === classId)
        if (!cls) return raw
        return `${cls.name} (Section ${sec})`
      })
      .join(', ')
  }

  if (targetType === NOTIFICATION_TARGET_TYPES.STUDENT) {
    return targetIds
      .map((id) => students.find((s) => s.id === id)?.fullName || id)
      .join(', ')
  }

  return targetIds.join(', ')
}

export function formatTargetTypeLabel(targetType) {
  if (NOTIFICATION_TARGET_LABELS[targetType]) return NOTIFICATION_TARGET_LABELS[targetType]
  if (typeof targetType === 'string' && targetType) {
    return targetType.charAt(0).toUpperCase() + targetType.slice(1).toLowerCase()
  }
  return targetType || '—'
}

/**
 * Banner / hero image URL from API payloads (parent messages, notices).
 * Prefer absolute `bannerImageFullUrl` when present.
 */
export function pickNotificationMediaUrl(obj) {
  if (!obj || typeof obj !== 'object') return ''
  const candidates = [
    obj.bannerImageFullUrl,
    obj.bannerImageUrl,
    obj.imageUrl,
    obj.coverUrl,
    obj.coverImageUrl,
    obj.thumbnailUrl,
    obj.banner_image,
    typeof obj.banner === 'string' ? obj.banner : null,
    obj.banner && typeof obj.banner === 'object' ? obj.banner.url : null,
    obj.media && typeof obj.media === 'object' ? obj.media.url : null,
    Array.isArray(obj.attachments) && obj.attachments[0] && typeof obj.attachments[0] === 'object'
      ? obj.attachments[0].url
      : null,
  ]
  for (const c of candidates) {
    const s = String(c ?? '').trim()
    if (!s) continue
    const probe = s.slice(0, 12).toLowerCase()
    if (probe.startsWith('javascript:')) continue
    if (
      s.startsWith('https://') ||
      s.startsWith('http://') ||
      s.startsWith('/') ||
      s.startsWith('//') ||
      probe.startsWith('data:image/')
    ) {
      return s.startsWith('//') ? `https:${s}` : s
    }
  }
  return ''
}
