import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import { useAppData } from './AppDataContext'
import { STORAGE_KEYS } from '../utils/constants'
import { ROLES } from '../utils/constants'
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_STATUSES,
} from '../utils/notificationConstants'
import {
  countMockParentRecipients,
  resolveStudentIdsForNotification,
} from '../utils/notificationDeliveryMock'
import { getLinkedStudentIdsForParent } from '../utils/parentUtils'

const NotificationContext = createContext(null)

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `n-${crypto.randomUUID()}`
  return `n-${Date.now()}`
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(list) {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list))
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const { students, parents, classes } = useAppData()
  const [notifications, setNotifications] = useState([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setNotifications(loadStored())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    persist(notifications)
  }, [notifications, hydrated])

  const createNotification = useCallback(
    (payload) => {
      if (!user || user.role !== ROLES.TEACHER) {
        return { ok: false, error: 'Only teachers can create notifications.' }
      }
      const title = (payload.title || '').trim()
      const message = (payload.message || '').trim()
      if (!title || !message) {
        return { ok: false, error: 'Title and message are required.' }
      }
      if (!payload.targetIds?.length) {
        return { ok: false, error: 'Select at least one target.' }
      }

      const status =
        payload.category === NOTIFICATION_CATEGORIES.ADMINISTRATIVE
          ? NOTIFICATION_STATUSES.PENDING_ADMIN
          : NOTIFICATION_STATUSES.PENDING_PRINCIPAL

      const record = {
        id: newId(),
        title,
        message,
        category: payload.category,
        targetType: payload.targetType,
        targetIds: [...payload.targetIds],
        createdBy: user.id,
        createdByName: user.fullName,
        status,
        createdAt: Date.now(),
      }

      setNotifications((prev) => [record, ...prev])
      return { ok: true, notification: record }
    },
    [user],
  )

  const approveNotification = useCallback(
    (id, approverRole) => {
      const snapshot = notifications.find((n) => n.id === id)
      if (!snapshot) return { ok: false, error: 'Not found.' }

      if (snapshot.status !== NOTIFICATION_STATUSES.PENDING_ADMIN && snapshot.status !== NOTIFICATION_STATUSES.PENDING_PRINCIPAL) {
        return { ok: false, error: 'Not pending approval.' }
      }

      if (
        approverRole === ROLES.ADMIN &&
        (snapshot.category !== NOTIFICATION_CATEGORIES.ADMINISTRATIVE ||
          snapshot.status !== NOTIFICATION_STATUSES.PENDING_ADMIN)
      ) {
        return { ok: false, error: 'You cannot approve this notification.' }
      }

      if (
        approverRole === ROLES.PRINCIPAL &&
        (snapshot.category !== NOTIFICATION_CATEGORIES.ACADEMIC ||
          snapshot.status !== NOTIFICATION_STATUSES.PENDING_PRINCIPAL)
      ) {
        return { ok: false, error: 'You cannot approve this notification.' }
      }

      const childrenTags = resolveStudentIdsForNotification(snapshot, students, classes)
      const updated = {
        ...snapshot,
        status: NOTIFICATION_STATUSES.APPROVED,
        approvedAt: Date.now(),
        approvedByRole: approverRole,
        childrenTags,
      }

      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)))

      const parentCount = countMockParentRecipients(updated, students, parents, classes)
      return { ok: true, notification: updated, parentCount }
    },
    [notifications, students, parents, classes],
  )

  const rejectNotification = useCallback(
    (id, approverRole) => {
      const snapshot = notifications.find((n) => n.id === id)
      if (!snapshot) return { ok: false, error: 'Not found.' }

      if (snapshot.status !== NOTIFICATION_STATUSES.PENDING_ADMIN && snapshot.status !== NOTIFICATION_STATUSES.PENDING_PRINCIPAL) {
        return { ok: false, error: 'Not pending approval.' }
      }

      if (
        approverRole === ROLES.ADMIN &&
        (snapshot.category !== NOTIFICATION_CATEGORIES.ADMINISTRATIVE ||
          snapshot.status !== NOTIFICATION_STATUSES.PENDING_ADMIN)
      ) {
        return { ok: false, error: 'You cannot reject this notification.' }
      }

      if (
        approverRole === ROLES.PRINCIPAL &&
        (snapshot.category !== NOTIFICATION_CATEGORIES.ACADEMIC ||
          snapshot.status !== NOTIFICATION_STATUSES.PENDING_PRINCIPAL)
      ) {
        return { ok: false, error: 'You cannot reject this notification.' }
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, status: NOTIFICATION_STATUSES.REJECTED, rejectedAt: Date.now() }
            : n,
        ),
      )
      return { ok: true }
    },
    [notifications],
  )

  const getNotificationsByRole = useCallback(() => {
    if (!user) return []
    if (user.role === ROLES.TEACHER) {
      return notifications
        .filter((n) => n.createdBy === user.id)
        .sort((a, b) => b.createdAt - a.createdAt)
    }
    if (user.role === ROLES.ADMIN) {
      return notifications
        .filter(
          (n) =>
            n.category === NOTIFICATION_CATEGORIES.ADMINISTRATIVE &&
            n.status === NOTIFICATION_STATUSES.PENDING_ADMIN,
        )
        .sort((a, b) => b.createdAt - a.createdAt)
    }
    if (user.role === ROLES.PRINCIPAL) {
      return notifications
        .filter(
          (n) =>
            n.category === NOTIFICATION_CATEGORIES.ACADEMIC &&
            n.status === NOTIFICATION_STATUSES.PENDING_PRINCIPAL,
        )
        .sort((a, b) => b.createdAt - a.createdAt)
    }
    return []
  }, [user, notifications])

  /**
   * Approved notifications visible to a parent, de-duplicated per notification with combined child labels.
   * @param {string} parentId — must match signed-in parent user id
   * @param {string} [filterStudentId='all'] — 'all' or a student id to filter the feed
   */
  const getParentNotifications = useCallback(
    (parentId, filterStudentId = 'all') => {
      if (!user || user.role !== ROLES.PARENT || user.id !== parentId) return []

      const myChildIds = getLinkedStudentIdsForParent(user, parents)
      const mySet = new Set(myChildIds)
      if (!mySet.size) return []

      const approved = notifications
        .filter((n) => n.status === NOTIFICATION_STATUSES.APPROVED)
        .sort((a, b) => (b.approvedAt || b.createdAt) - (a.approvedAt || a.createdAt))

      const out = []
      for (const n of approved) {
        const tags =
          Array.isArray(n.childrenTags) && n.childrenTags.length
            ? n.childrenTags
            : resolveStudentIdsForNotification(n, students, classes)
        const matching = tags.filter((sid) => mySet.has(sid))
        if (!matching.length) continue
        if (filterStudentId !== 'all' && !matching.includes(filterStudentId)) continue

        const names = matching
          .map((sid) => students.find((s) => s.id === sid)?.fullName)
          .filter(Boolean)
        out.push({
          ...n,
          _feedMatchingStudentIds: matching,
          _feedChildNamesLabel: names.join(', '),
          _feedChildNames: names,
        })
      }
      return out
    },
    [user, notifications, parents, students, classes],
  )

  const value = useMemo(
    () => ({
      notifications,
      hydrated,
      createNotification,
      approveNotification,
      rejectNotification,
      getNotificationsByRole,
      getParentNotifications,
    }),
    [
      notifications,
      hydrated,
      createNotification,
      approveNotification,
      rejectNotification,
      getNotificationsByRole,
      getParentNotifications,
    ],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
