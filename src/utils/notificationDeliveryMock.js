import { NOTIFICATION_TARGET_TYPES } from './notificationConstants'

/**
 * Resolve which student IDs a notification applies to (simulation; no backend).
 * @returns {string[]} stable sorted ids
 */
export function resolveStudentIdsForNotification(notification, students, classes) {
  if (!notification?.targetIds?.length) return []

  const classById = new Map(classes.map((c) => [c.id, c]))
  const studentSet = new Set()

  if (notification.targetType === NOTIFICATION_TARGET_TYPES.CLASS) {
    students.forEach((s) => {
      if (notification.targetIds.includes(s.classId)) studentSet.add(s.id)
    })
  } else if (notification.targetType === NOTIFICATION_TARGET_TYPES.SECTION) {
    notification.targetIds.forEach((raw) => {
      const [classId, section] = String(raw).split('|')
      const cls = classById.get(classId)
      if (!cls) return
      students.forEach((s) => {
        if (s.classId === classId && String(cls.section) === String(section)) studentSet.add(s.id)
      })
    })
  } else if (notification.targetType === NOTIFICATION_TARGET_TYPES.STUDENT) {
    notification.targetIds.forEach((id) => studentSet.add(id))
  }

  return [...studentSet].sort()
}

/**
 * Mock unique parent count for delivery preview (no real messaging).
 */
export function countMockParentRecipients(notification, students, parents, classes) {
  const ids = resolveStudentIdsForNotification(notification, students, classes)
  const parentIds = new Set()
  students.forEach((s) => {
    if (ids.includes(s.id) && s.parentId) parentIds.add(s.parentId)
  })

  parents.forEach((p) => {
    if (!parentIds.has(p.id)) return
  })

  return parentIds.size
}
