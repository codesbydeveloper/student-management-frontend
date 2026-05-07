import { canAccessRoute } from './permissions'

/** Order = sidebar + mobile dock (filtered by role). */
const items = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard' },
  { key: 'parent_dashboard', to: '/parent-dashboard', label: 'Family dashboard' },
  { key: 'parent_notifications', to: '/parent-notifications', label: 'School messages' },
  { key: 'classes', to: '/classes', label: 'Classes' },
  { key: 'teachers', to: '/teachers', label: 'Teachers' },
  { key: 'students', to: '/students', label: 'Students' },
  { key: 'parents', to: '/parents', label: 'Parents' },
  { key: 'notifications', to: '/notifications', label: 'Notifications' },
  { key: 'notifications_create', to: '/notifications/create', label: 'Create notification' },
  { key: 'notifications_admin', to: '/notifications/admin-approval', label: 'Admin approvals' },
  { key: 'notifications_principal', to: '/notifications/principal-approval', label: 'Principal approvals' },
]

export function getNavItemsForRole(role) {
  return items.filter((item) => canAccessRoute(role, item.key))
}
