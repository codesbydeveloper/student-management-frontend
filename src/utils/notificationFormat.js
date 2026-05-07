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
