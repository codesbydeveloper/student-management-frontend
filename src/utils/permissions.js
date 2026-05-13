import { ROLES } from './constants'

/** Route keys used for nav + access */
export const ROUTE_ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT, ROLES.DRIVER],
  teachers: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
  drivers: [ROLES.ADMIN, ROLES.PRINCIPAL],
  students: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT],
  classes: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
  parents: [ROLES.ADMIN, ROLES.PRINCIPAL],
  notifications: [ROLES.TEACHER],
  notifications_create: [ROLES.TEACHER],
  notifications_admin: [ROLES.ADMIN],
  notifications_principal: [ROLES.PRINCIPAL],
  parent_dashboard: [ROLES.PARENT],
  parent_notifications: [ROLES.PARENT],
  parent_bus: [ROLES.PARENT],
  parent_ptm_request: [ROLES.PARENT],
  parent_ptm_history: [ROLES.PARENT],
  driver_transport: [ROLES.DRIVER],
  transport_assignments: [ROLES.ADMIN, ROLES.PRINCIPAL],
  teacher_ptm_requests: [ROLES.TEACHER],
  teacher_assigned_leads: [ROLES.TEACHER],
  /** Intake without assign-teacher (admin/principal use `/leads`). */
  create_lead: [ROLES.TEACHER, ROLES.PARENT, ROLES.DRIVER],
  admin_visitor_logs: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
  admin_leads: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Admin + principal PTM queue. */
  staff_ptm_requests: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Full PTM list (GET /api/ptm-requests/admin/all). */
  staff_ptm_history: [ROLES.ADMIN, ROLES.PRINCIPAL],
}

export function canAccessRoute(role, routeKey) {
  const allowed = ROUTE_ACCESS[routeKey]
  if (!allowed) return false
  return allowed.includes(role)
}

/** CRUD: full edit vs read-only for management tables */
export function canManageTeachers(role) {
  return role === ROLES.ADMIN || role === ROLES.PRINCIPAL
}

export function canManageDrivers(role) {
  return role === ROLES.ADMIN || role === ROLES.PRINCIPAL
}

export function canManageClasses(role) {
  return role === ROLES.ADMIN || role === ROLES.PRINCIPAL
}

export function canManageStudents(role) {
  return role === ROLES.ADMIN || role === ROLES.PRINCIPAL || role === ROLES.TEACHER
}

export function canManageParents(role) {
  return role === ROLES.ADMIN || role === ROLES.PRINCIPAL
}

export function canDeleteStudent(role) {
  return role === ROLES.ADMIN || role === ROLES.PRINCIPAL
}
