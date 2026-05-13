import { API_BASE_URL } from '../utils/constants'
import {
  DEFAULT_LOGIN_BRANDING,
  normalizeLoginBranding,
  sanitizeLogoImage,
} from '../utils/loginBranding'

function formatError(data, status) {
  if (data == null) return `Request failed (${status})`
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && data.message) return String(data.message)
  if (typeof data === 'object' && data.error) return String(data.error)
  return `Request failed (${status})`
}

function resolveServerAssetUrl(value) {
  const s = String(value ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('/')) return `${API_BASE_URL}${s}`
  return s
}

/**
 * Map GET/POST /api/login-appearance JSON to the shape used by {@link normalizeLoginBranding}.
 */
function mapLoginAppearanceToBranding(data) {
  if (!data || typeof data !== 'object') return null
  const raw = data.data ?? data.branding ?? data.settings ?? data
  if (!raw || typeof raw !== 'object') return null

  const logoUrl = raw.logoUrl ?? raw.logo_url
  const logoStr = logoUrl == null || logoUrl === '' ? '' : String(logoUrl).trim()
  const logoImage = sanitizeLogoImage(resolveServerAssetUrl(logoStr))

  const title = String(raw.title ?? '').trim()
  const subtitle = String(raw.subtitle ?? raw.tagline ?? '').trim()

  return {
    logoLetter: DEFAULT_LOGIN_BRANDING.logoLetter,
    logoImage,
    title: title || DEFAULT_LOGIN_BRANDING.title,
    subtitle: subtitle || DEFAULT_LOGIN_BRANDING.subtitle,
  }
}

/** Parse logo URL from POST /api/login-appearance/logo JSON body. */
function extractUploadedLogoUrl(data) {
  if (!data || typeof data !== 'object') return ''
  const raw = data.data ?? data
  if (!raw || typeof raw !== 'object') return ''
  const u = raw.logoUrl ?? raw.logo_url ?? raw.url ?? raw.fileUrl ?? raw.publicUrl ?? raw.path
  return resolveServerAssetUrl(u)
}

/**
 * POST /api/login-appearance/logo — multipart `file` field, Bearer (admin / principal).
 * Response shape varies; we read logoUrl (or similar) and fall back to GET login-appearance.
 */
export async function uploadLoginAppearanceLogo(token, file) {
  if (!token) return { ok: false, error: 'Not signed in' }
  if (!file || typeof file !== 'object') return { ok: false, error: 'No file chosen' }
  const form = new FormData()
  form.append('file', file, file.name)
  try {
    const res = await fetch(`${API_BASE_URL}/api/login-appearance/logo`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: form,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: formatError(data, res.status), status: res.status }
    const fromMap = mapLoginAppearanceToBranding(data)
    const extracted = extractUploadedLogoUrl(data)
    const logoUrl =
      extracted ||
      (fromMap?.logoImage ? resolveServerAssetUrl(String(fromMap.logoImage)) : '')
    return { ok: true, logoUrl, data, branding: fromMap }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}

/** Public GET — no auth (login / register before sign-in). */
export async function fetchPublicLoginBranding() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/login-appearance`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: formatError(data, res.status), branding: null, status: res.status }
    }
    const branding = mapLoginAppearanceToBranding(data)
    if (!branding) return { ok: false, error: 'Invalid login appearance response.', branding: null }
    return { ok: true, branding, data }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg, branding: null }
  }
}

/**
 * POST (or PUT) — admin / principal only. Partial body is allowed.
 * Sends `logoUrl` only when it is **https** (server validation) or **null** to clear.
 * Dev-only `http://localhost…` preview URLs are omitted so title/subtitle saves still succeed.
 * Data URLs are omitted (`skippedLogoUrlForServer` true for UI hint).
 */
export async function updateLoginBranding(token, body) {
  if (!token) return { ok: false, error: 'Not signed in' }
  const apiBody = { title: body.title, subtitle: body.subtitle }
  let skippedLogoUrlForServer = false
  const img = String(body.logoImage || '').trim()
  if (!img) {
    apiBody.logoUrl = null
  } else if (/^https:\/\//i.test(img)) {
    apiBody.logoUrl = img
  } else if (img.startsWith('data:')) {
    skippedLogoUrlForServer = true
  }
  // else: http://localhost… from upload, or other — omit logoUrl (partial update)

  try {
    const res = await fetch(`${API_BASE_URL}/api/login-appearance`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(apiBody),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: formatError(data, res.status), status: res.status }
    const branding = mapLoginAppearanceToBranding(data) ?? normalizeLoginBranding(body)
    return { ok: true, branding, data, skippedLogoUrlForServer }
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message.includes('fetch') ? 'Cannot reach server.' : 'Network error.'
    return { ok: false, error: msg }
  }
}
