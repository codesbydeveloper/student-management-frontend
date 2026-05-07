import { API_BASE_URL } from '../utils/constants'

/**
 * POST /api/auth/logout — matches server (JSON content-type, optional Bearer token).
 */
export async function logoutRequest(authToken) {
  const headers = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers,
    })
  } catch {
    // Still clear local session if the network fails
  }
}
