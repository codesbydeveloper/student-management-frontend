import { canAccessRoute } from './permissions'

/** Order = sidebar + mobile dock (filtered by role). */
const items = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard' },
  { key: 'parent_dashboard', to: '/parent-dashboard', label: 'Family dashboard' },
  { key: 'parent_notifications', to: '/parent-notifications', label: 'School messages' },
  { key: 'parent_bus', to: '/parent-bus', label: 'Bus tracking' },
  { key: 'parent_ptm_request', to: '/parent/ptm/request', label: 'PTM request' },
  { key: 'parent_ptm_history', to: '/parent/ptm/history', label: 'PTM history' },
  { key: 'driver_transport', to: '/driver-transport', label: 'My trip' },
  { key: 'classes', to: '/classes', label: 'Classes' },
  { key: 'teachers', to: '/teachers', label: 'Teachers' },
  { key: 'drivers', to: '/drivers', label: 'Bus drivers' },
  { key: 'students', to: '/students', label: 'Students' },
  { key: 'parents', to: '/parents', label: 'Parents' },
  { key: 'admin_assign_bus', to: '/transport/assign-bus', label: 'Assign bus' },
  { key: 'admin_create_buses', to: '/transport/buses', label: 'Create buses' },
  { key: 'notifications', to: '/notifications', label: 'Notifications' },
  { key: 'notifications_create', to: '/notifications/create', label: 'Create notification' },
  { key: 'notifications_admin', to: '/notifications/admin-approval', label: 'Admin approvals' },
  { key: 'notifications_principal', to: '/notifications/principal-approval', label: 'Principal approvals' },
  { key: 'teacher_ptm_requests', to: '/ptm-requests', label: 'PTM requests' },
  { key: 'teacher_assigned_leads', to: '/assigned-leads', label: 'Assigned leads' },
  { key: 'create_lead', to: '/create-lead', label: 'Create lead' },
  { key: 'admin_visitor_logs', to: '/visitor-logs', label: 'Visitor log' },
  { key: 'admin_leads', to: '/leads', label: 'Leads (CRM)' },
  { key: 'staff_ptm_requests', to: '/ptm-requests/staff', label: 'PTM request' },
  { key: 'staff_ptm_history', to: '/ptm-requests/admin/history', label: 'PTM history' },
]

export function getNavItemsForRole(role) {
  return items.filter((item) => canAccessRoute(role, item.key))
}
