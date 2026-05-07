export const NOTIFICATION_CATEGORIES = {
  ADMINISTRATIVE: 'administrative',
  ACADEMIC: 'academic',
}

export const NOTIFICATION_CATEGORY_LABELS = {
  [NOTIFICATION_CATEGORIES.ADMINISTRATIVE]: 'Administrative',
  [NOTIFICATION_CATEGORIES.ACADEMIC]: 'Academic',
}

export const NOTIFICATION_TARGET_TYPES = {
  CLASS: 'class',
  SECTION: 'section',
  STUDENT: 'student',
  /** Server sent a free-text targets line (e.g. Webpushr segments) instead of class/student ids. */
  AUDIENCE: 'audience',
}

export const NOTIFICATION_TARGET_LABELS = {
  [NOTIFICATION_TARGET_TYPES.CLASS]: 'Class',
  [NOTIFICATION_TARGET_TYPES.SECTION]: 'Section',
  [NOTIFICATION_TARGET_TYPES.STUDENT]: 'Student',
  [NOTIFICATION_TARGET_TYPES.AUDIENCE]: 'Targets',
}

export const NOTIFICATION_STATUSES = {
  PENDING_ADMIN: 'pending_admin',
  PENDING_PRINCIPAL: 'pending_principal',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}
