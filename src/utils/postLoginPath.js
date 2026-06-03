import { ROLES } from './constants'

const GENERIC_HOME_PATHS = new Set(['/dashboard', '/login', '/'])

/**
 * Default landing page after sign-in (when user did not open a deep link first).
 * @param {string | undefined} role
 */
export function getDefaultPathForRole(role) {
  switch (role) {
    case ROLES.DRIVER:
      return '/driver/map'
    case ROLES.PARENT:
      return '/parent/routes'
    default:
      return '/dashboard'
  }
}

/**
 * @param {string | undefined} fromPath — `location.state.from.pathname` from login guard
 * @param {string | undefined} role
 */
export function resolvePostLoginPath(fromPath, role) {
  const trimmed = typeof fromPath === 'string' ? fromPath.trim() : ''
  if (!trimmed || GENERIC_HOME_PATHS.has(trimmed)) {
    return getDefaultPathForRole(role)
  }
  return trimmed
}
