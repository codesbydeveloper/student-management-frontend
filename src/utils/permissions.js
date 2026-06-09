import { ROLES } from './constants'

/** Route keys used for nav + access */
export const ROUTE_ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT, ROLES.DRIVER],
  profile: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT, ROLES.DRIVER],
  teachers: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
  drivers: [ROLES.ADMIN, ROLES.PRINCIPAL],
  students: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT],
  classes: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
  parents: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Staff directories — admin only (not principals, teachers, parents, drivers). */
  admins: [ROLES.ADMIN],
  principals: [ROLES.ADMIN],
  notifications: [ROLES.TEACHER],
  // notifications_create: [ROLES.TEACHER],
  // notifications_admin: [ROLES.ADMIN],
  // notifications_principal: [ROLES.PRINCIPAL],
  /** GET /api/notifications/approval-queue — paginated notice history (admin / principal). */
  notice_history: [ROLES.ADMIN, ROLES.PRINCIPAL],
  parent_dashboard: [ROLES.PARENT],
  parent_notifications: [ROLES.PARENT],
  parent_bus: [ROLES.PARENT],
  /** GET /api/parents/my-transport — driver, bus, route per child. */
  parent_my_transport: [ROLES.PARENT],
  parent_ptm_request: [ROLES.PARENT],
  parent_ptm_history: [ROLES.PARENT],
  driver_transport: [ROLES.DRIVER],
  /** Live GPS map (driver only). */
  driver_map: [ROLES.DRIVER],
  /** GET /api/drivers/my-transport-routes — driver route roster. */
  driver_my_routes: [ROLES.DRIVER],
  /** Admin / principal — assign students to a bus (UI shell). */
  admin_assign_bus: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Admin / principal — register buses (local until API). */
  admin_create_buses: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Admin / principal — pick up points (UI until API). */
  admin_pick_up_points: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Admin / principal — transport routes (UI until API). */
  admin_transport_routes: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Admin / principal — live running buses. */
  transport_live_buses: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Admin / principal — completed trip history (pick-up / absent times). */
  transport_trip_history: [ROLES.ADMIN, ROLES.PRINCIPAL],
  teacher_ptm_requests: [ROLES.TEACHER],
  teacher_assigned_leads: [ROLES.TEACHER],
  /** Teacher — read-only bus ↔ student overview. */
  teacher_bus_overview: [ROLES.TEACHER],
  /** Intake without assign-teacher (admin/principal use `/leads`). */
  create_lead: [ROLES.TEACHER, ROLES.PARENT, ROLES.DRIVER],
  admin_visitor_logs: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
  admin_leads: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Admin + principal PTM queue. */
  staff_ptm_requests: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Full PTM list (GET /api/ptm-requests/admin/all). */
  staff_ptm_history: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Notice category name — UI shell until API (admin / principal). */
  create_category: [ROLES.ADMIN, ROLES.PRINCIPAL],
  /** Create notice form — UI shell until API (admin / principal / teacher). */
  create_notice: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
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

export function canManageStaffRoles(role) {
  return role === ROLES.ADMIN
}

/** POST /api/auth/register/admin — logged-in admin (bootstrap is public, not used from this UI). */
export function canCreateStaffAdmin(role) {
  return role === ROLES.ADMIN
}

/** POST /api/auth/register/principal — admin only. */
export function canCreateStaffPrincipal(role) {
  return role === ROLES.ADMIN
}

export function canDeleteStudent(role) {
  return role === ROLES.ADMIN || role === ROLES.PRINCIPAL
}
