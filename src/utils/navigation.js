import { ROLES } from './constants'
import { canAccessRoute } from './permissions'

/** Admin / principal: grouped under "Academics" in the sidebar (order = Classes -> Teachers -> Students -> Parents). */
export const ACADEMICS_NAV_KEYS = ['classes', 'teachers', 'students', 'parents']

/** Admin / principal: grouped under "Transport" in the sidebar. */
export const TRANSPORT_NAV_KEYS = ['drivers', 'admin_assign_bus', 'admin_create_buses']

/** Admin / principal: grouped under "Notices" in the sidebar. */
export const NOTICES_NAV_KEYS = ['create_category', 'create_notice', 'notice_history']

/**
 * Admin / principal: "Operations" — role-specific approval queue first, then visitor log and CRM.
 * (Admin sees Admin approvals; principal sees Principal approvals.)
 */
export const OPERATIONS_NAV_KEYS = [
  'notifications_admin',
  'notifications_principal',
  'admin_visitor_logs',
  'admin_leads',
]

/** Admin / principal: staff PTM queue and full history. */
export const PTM_NAV_KEYS = ['staff_ptm_requests', 'staff_ptm_history']

function groupedNavKeys() {
  return new Set([
    ...ACADEMICS_NAV_KEYS,
    ...TRANSPORT_NAV_KEYS,
    ...NOTICES_NAV_KEYS,
    ...OPERATIONS_NAV_KEYS,
    ...PTM_NAV_KEYS,
  ])
}

function isAdminOrPrincipal(role) {
  return role === ROLES.ADMIN || role === ROLES.PRINCIPAL
}

/** Order = master list (filtered + reordered per role). */
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
  { key: 'create_category', to: '/create-category', label: 'Create Category' },
  { key: 'create_notice', to: '/create-notice', label: 'Create Notice' },
  { key: 'notifications', to: '/notifications', label: 'Notifications' },
  { key: 'notifications_create', to: '/notifications/create', label: 'Create notification' },
  { key: 'notifications_admin', to: '/notifications/admin-approval', label: 'Admin approvals' },
  { key: 'notifications_principal', to: '/notifications/principal-approval', label: 'Principal approvals' },
  { key: 'notice_history', to: '/notifications/history', label: 'Notice approvals' },
  { key: 'teacher_ptm_requests', to: '/ptm-requests', label: 'PTM requests' },
  { key: 'teacher_assigned_leads', to: '/assigned-leads', label: 'Assigned leads' },
  { key: 'create_lead', to: '/create-lead', label: 'Create lead' },
  { key: 'admin_visitor_logs', to: '/visitor-logs', label: 'Visitor log' },
  { key: 'admin_leads', to: '/leads', label: 'Leads (CRM)' },
  { key: 'staff_ptm_requests', to: '/ptm-requests/staff', label: 'PTM request' },
  { key: 'staff_ptm_history', to: '/ptm-requests/admin/history', label: 'PTM history' },
]

/**
 * Flat nav list (mobile dock + default order). Admin/principal: Dashboard, academics block,
 * transport, notices, operations, PTM (request + history), then the rest.
 */
export function buildFlatNav(role) {
  const filtered = items.filter((item) => canAccessRoute(role, item.key))

  if (role === ROLES.PARENT) {
    const parentDash = filtered.find((i) => i.key === 'parent_dashboard')
    const orgDash = filtered.find((i) => i.key === 'dashboard')
    const rest = filtered.filter(
      (i) => i.key !== 'parent_dashboard' && i.key !== 'dashboard',
    )
    const head = []
    if (parentDash) head.push({ ...parentDash, label: 'Dashboard' })
    if (orgDash) head.push({ ...orgDash, label: 'School overview' })
    return [...head, ...rest]
  }

  const dash = filtered.find((item) => item.key === 'dashboard')
  const rest = filtered.filter((item) => item.key !== 'dashboard')

  if (isAdminOrPrincipal(role)) {
    const academics = ACADEMICS_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const transport = TRANSPORT_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const notices = NOTICES_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const operations = OPERATIONS_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const ptm = PTM_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const tail = rest.filter((i) => !groupedNavKeys().has(i.key))
    return dash ? [dash, ...academics, ...transport, ...notices, ...operations, ...ptm, ...tail] : filtered
  }

  if (!dash) return filtered
  return [dash, ...rest]
}

/** @typedef {{ type: 'link', key: string, to: string, label: string }} NavSidebarLink */
/** @typedef {{ type: 'group', key: string, label: string, children: NavSidebarLink[], hint?: string }} NavSidebarGroup */

/** Sidebar: admin/principal get collapsible Academics, Transport, Notices, Operations, and PTM groups; others get a flat list. */
export function getNavSidebarEntries(role) {
  const flat = buildFlatNav(role)
  if (!isAdminOrPrincipal(role)) {
    return flat.map((item) => ({ type: 'link', ...item }))
  }

  const dash = flat.find((i) => i.key === 'dashboard')
  const rest = flat.filter((i) => i.key !== 'dashboard')
  const academics = ACADEMICS_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
  const transport = TRANSPORT_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
  const notices = NOTICES_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
  const operations = OPERATIONS_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
  const ptm = PTM_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
  const tail = rest.filter((i) => !groupedNavKeys().has(i.key))

  /** @type {(NavSidebarLink | NavSidebarGroup)[]} */
  const out = []
  if (dash) out.push({ type: 'link', ...dash })
  if (academics.length) {
    out.push({ type: 'group', key: 'academics', label: 'Academics', children: academics })
  }
  if (transport.length) {
    out.push({ type: 'group', key: 'transport', label: 'Transport', children: transport })
  }
  if (notices.length) {
    out.push({ type: 'group', key: 'notices', label: 'Notices', children: notices })
  }
  if (operations.length) {
    out.push({
      type: 'group',
      key: 'operations',
      label: 'Operations',
      children: operations,
    })
  }
  if (ptm.length) {
    out.push({ type: 'group', key: 'ptm', label: 'PTM', children: ptm })
  }
  tail.forEach((item) => out.push({ type: 'link', ...item }))
  return out
}

export function getNavItemsForRole(role) {
  return buildFlatNav(role)
}
