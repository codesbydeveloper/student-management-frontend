import { ROLES } from './constants'

/** Route keys used for nav + access */
export const ROUTE_ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT, ROLES.DRIVER],
  teachers: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
  students: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT],
  classes: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],
  parents: [ROLES.ADMIN, ROLES.PRINCIPAL],
  notifications: [ROLES.TEACHER],
  notifications_create: [ROLES.TEACHER],
  notifications_admin: [ROLES.ADMIN],
  notifications_principal: [ROLES.PRINCIPAL],
  parent_dashboard: [ROLES.PARENT],
  parent_notifications: [ROLES.PARENT],
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
