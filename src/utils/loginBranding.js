const STORAGE_KEY = 'sm_login_branding_v1'

export const DEFAULT_LOGIN_BRANDING = {
  logoLetter: 'S',
  logoImage: '',
  title: 'School Management Suite',
  subtitle:
    'Secure access to schedules, people, and classes — sign in to continue to your workspace.',
}

const MAX_LOGO_DATA_URL_CHARS = 480_000
const MAX_LOGO_HTTPS_URL_CHARS = 2048

export function sanitizeLogoImage(value) {
  if (value == null) return ''
  const v = String(value).trim()
  if (!v) return ''
  if (v.startsWith('data:image/') && v.length <= MAX_LOGO_DATA_URL_CHARS) return v
  if (/^https:\/\//i.test(v) && v.length <= MAX_LOGO_HTTPS_URL_CHARS) return v
  // Dev uploads often return http://localhost:… from the API
  if (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(v) &&
    v.length <= MAX_LOGO_HTTPS_URL_CHARS
  )
    return v
  return ''
}

function normalize(raw) {
  const letter = String(raw?.logoLetter ?? DEFAULT_LOGIN_BRANDING.logoLetter)
    .trim()
    .slice(0, 2)
  const title = String(raw?.title ?? DEFAULT_LOGIN_BRANDING.title)
    .trim()
    .slice(0, 120)
  const subtitle = String(raw?.subtitle ?? DEFAULT_LOGIN_BRANDING.subtitle)
    .trim()
    .slice(0, 500)
  const logoImage = sanitizeLogoImage(raw?.logoImage)
  return {
    logoLetter: letter || DEFAULT_LOGIN_BRANDING.logoLetter,
    logoImage,
    title: title || DEFAULT_LOGIN_BRANDING.title,
    subtitle: subtitle || DEFAULT_LOGIN_BRANDING.subtitle,
  }
}

export function normalizeLoginBranding(raw) {
  return normalize(raw)
}

function readStored() {
  if (typeof window === 'undefined') return { ...DEFAULT_LOGIN_BRANDING }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_LOGIN_BRANDING }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_LOGIN_BRANDING }
    return normalize(parsed)
  } catch {
    return { ...DEFAULT_LOGIN_BRANDING }
  }
}

let cache = { json: '', value: { ...DEFAULT_LOGIN_BRANDING } }

export function getLoginBrandingSnapshot() {
  const b = readStored()
  const json = JSON.stringify(b)
  if (json === cache.json) return cache.value
  cache = { json, value: b }
  return b
}

export function subscribeLoginBranding(onStoreChange) {
  if (typeof window === 'undefined') return () => {}
  const handler = (e) => {
    if (e.type === 'storage' && e.key != null && e.key !== STORAGE_KEY) return
    onStoreChange()
  }
  window.addEventListener('storage', handler)
  window.addEventListener('sm-login-branding-changed', handler)
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener('sm-login-branding-changed', handler)
  }
}

export function setLoginBranding(patch) {
  const next = normalize({ ...readStored(), ...patch })
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  cache = { json: '', value: { ...DEFAULT_LOGIN_BRANDING } }
  window.dispatchEvent(new Event('sm-login-branding-changed'))
  return next
}

export function resetLoginBranding() {
  window.localStorage.removeItem(STORAGE_KEY)
  cache = { json: '', value: { ...DEFAULT_LOGIN_BRANDING } }
  window.dispatchEvent(new Event('sm-login-branding-changed'))
}
