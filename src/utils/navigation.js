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

/** Teacher: grouped sidebar — Academics. */
export const TEACHER_ACADEMICS_NAV_KEYS = ['classes', 'teachers', 'students']

/** Teacher: Create Notice, Notifications, Create notification. */
export const TEACHER_COMMUNICATIONS_NAV_KEYS = ['create_notice', 'notifications', 'notifications_create']

/** Teacher: bus student overview. */
export const TEACHER_TRANSPORT_NAV_KEYS = ['teacher_bus_overview']

/** Teacher: PTM requests. */
export const TEACHER_PTM_NAV_KEYS = ['teacher_ptm_requests']

/** Teacher: leads, intake, visitor log. */
export const TEACHER_CRM_NAV_KEYS = ['teacher_assigned_leads', 'create_lead', 'admin_visitor_logs']

function groupedNavKeys() {
  return new Set([
    ...ACADEMICS_NAV_KEYS,
    ...TRANSPORT_NAV_KEYS,
    ...NOTICES_NAV_KEYS,
    ...OPERATIONS_NAV_KEYS,
    ...PTM_NAV_KEYS,
  ])
}

function teacherGroupedNavKeys() {
  return new Set([
    ...TEACHER_ACADEMICS_NAV_KEYS,
    ...TEACHER_COMMUNICATIONS_NAV_KEYS,
    ...TEACHER_TRANSPORT_NAV_KEYS,
    ...TEACHER_PTM_NAV_KEYS,
    ...TEACHER_CRM_NAV_KEYS,
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
  { key: 'notifications_admin', to: '/notifications/admin-approval', label: 'Notification approvals' },
  { key: 'notifications_principal', to: '/notifications/principal-approval', label: 'Principal approvals' },
  { key: 'notice_history', to: '/notifications/history', label: 'Notice approvals' },
  { key: 'teacher_ptm_requests', to: '/ptm-requests', label: 'PTM requests' },
  { key: 'teacher_assigned_leads', to: '/assigned-leads', label: 'Assigned leads' },
  { key: 'teacher_bus_overview', to: '/transport/bus-rosters', label: 'Buses' },
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
    const dash = filtered.find((i) => i.key === 'dashboard')
    const rest = filtered.filter((i) => i.key !== 'parent_dashboard' && i.key !== 'dashboard')
    return dash ? [{ ...dash, label: 'Dashboard' }, ...rest] : rest
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

  if (role === ROLES.TEACHER) {
    const academics = TEACHER_ACADEMICS_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const communications = TEACHER_COMMUNICATIONS_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(
      Boolean,
    )
    const transport = TEACHER_TRANSPORT_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const ptm = TEACHER_PTM_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const crm = TEACHER_CRM_NAV_KEYS.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    const tail = rest.filter((i) => !teacherGroupedNavKeys().has(i.key))
    return dash
      ? [dash, ...academics, ...communications, ...transport, ...ptm, ...crm, ...tail]
      : filtered
  }

  if (!dash) return filtered
  return [dash, ...rest]
}

/** @typedef {{ type: 'link', key: string, to: string, label: string }} NavSidebarLink */
/** @typedef {{ type: 'group', key: string, label: string, children: NavSidebarLink[], hint?: string }} NavSidebarGroup */

function buildGroupedSidebarEntries(dash, rest, groups, tailKeys) {
  const grouped = new Set(tailKeys)
  const tail = rest.filter((i) => !grouped.has(i.key))
  /** @type {(NavSidebarLink | NavSidebarGroup)[]} */
  const out = []
  if (dash) out.push({ type: 'link', ...dash })
  for (const { key, label, keys } of groups) {
    const children = keys.map((k) => rest.find((i) => i.key === k)).filter(Boolean)
    if (children.length) out.push({ type: 'group', key, label, children })
  }
  tail.forEach((item) => out.push({ type: 'link', ...item }))
  return out
}

/** Sidebar: admin/principal and teacher get collapsible groups; others get a flat list. */
export function getNavSidebarEntries(role) {
  const flat = buildFlatNav(role)
  const dash = flat.find((i) => i.key === 'dashboard')
  const rest = flat.filter((i) => i.key !== 'dashboard')

  if (isAdminOrPrincipal(role)) {
    return buildGroupedSidebarEntries(dash, rest, [
      { key: 'academics', label: 'Academics', keys: ACADEMICS_NAV_KEYS },
      { key: 'transport', label: 'Transport', keys: TRANSPORT_NAV_KEYS },
      { key: 'notices', label: 'Notices', keys: NOTICES_NAV_KEYS },
      { key: 'operations', label: 'Operations', keys: OPERATIONS_NAV_KEYS },
      { key: 'ptm', label: 'PTM', keys: PTM_NAV_KEYS },
    ], groupedNavKeys())
  }

  if (role === ROLES.TEACHER) {
    return buildGroupedSidebarEntries(dash, rest, [
      { key: 'academics', label: 'Academics', keys: TEACHER_ACADEMICS_NAV_KEYS },
      { key: 'communications', label: 'Communications', keys: TEACHER_COMMUNICATIONS_NAV_KEYS },
      { key: 'transport', label: 'Transport', keys: TEACHER_TRANSPORT_NAV_KEYS },
      { key: 'ptm', label: 'PTM', keys: TEACHER_PTM_NAV_KEYS },
      { key: 'crm', label: 'CRM & operations', keys: TEACHER_CRM_NAV_KEYS },
    ], teacherGroupedNavKeys())
  }

  return flat.map((item) => ({ type: 'link', ...item }))
}

export function getNavItemsForRole(role) {
  return buildFlatNav(role)
}
