const STORAGE_KEY = 'sm_login_branding_v1'
const APPEARANCE_STORAGE_KEY = 'sm_login_appearance_local_v1'

export const DEFAULT_LOGIN_BRANDING = {
  logoLetter: 'S',
  logoImage: '',
  title: 'School Management Suite',
  subtitle:
    'Secure access to schedules, people, and classes — sign in to continue to your workspace.',
  backgroundMode: 'color',
  backgroundColor: '#f1f5f9',
  backgroundOpacity: 100,
  backgroundImageUrl: '',
  titleColor: '#0f172a',
  subtitleColor: '#475569',
  buttonColor: '#4338ca',
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

const MAX_BG_IMAGE_URL_CHARS = 2048

export function sanitizeLoginBackgroundImage(value) {
  if (value == null) return ''
  const v = String(value).trim()
  if (!v) return ''
  if (v.startsWith('data:image/') && v.length <= MAX_LOGO_DATA_URL_CHARS) return v
  if (/^https?:\/\//i.test(v) && v.length <= MAX_BG_IMAGE_URL_CHARS) return v
  if (v.startsWith('blob:') && v.length <= MAX_BG_IMAGE_URL_CHARS) return v
  if (v.startsWith('/') && v.length <= MAX_BG_IMAGE_URL_CHARS) return v
  return ''
}

function clampOpacity(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, Math.round(n)))
}

function normalizeHexColor(value, fallback) {
  let h = String(value ?? '').trim()
  if (!h.startsWith('#')) return fallback
  if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : fallback
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
  const backgroundMode = raw?.backgroundMode === 'image' ? 'image' : 'color'
  const backgroundColor = normalizeHexColor(
    raw?.backgroundColor,
    DEFAULT_LOGIN_BRANDING.backgroundColor,
  )
  const backgroundOpacity = clampOpacity(raw?.backgroundOpacity ?? DEFAULT_LOGIN_BRANDING.backgroundOpacity)
  const backgroundImageUrl = sanitizeLoginBackgroundImage(raw?.backgroundImageUrl)
  const titleColor = normalizeHexColor(raw?.titleColor, DEFAULT_LOGIN_BRANDING.titleColor)
  const subtitleColor = normalizeHexColor(raw?.subtitleColor, DEFAULT_LOGIN_BRANDING.subtitleColor)
  const buttonColor = normalizeHexColor(raw?.buttonColor, DEFAULT_LOGIN_BRANDING.buttonColor)
  return {
    logoLetter: letter || DEFAULT_LOGIN_BRANDING.logoLetter,
    logoImage,
    title: title || DEFAULT_LOGIN_BRANDING.title,
    subtitle: subtitle || DEFAULT_LOGIN_BRANDING.subtitle,
    backgroundMode,
    backgroundColor,
    backgroundOpacity,
    backgroundImageUrl,
    titleColor,
    subtitleColor,
    buttonColor,
  }
}

export function loginBackgroundSurface(branding) {
  const b = normalize(branding)
  return {
    mode: b.backgroundMode,
    color: b.backgroundColor,
    opacity: b.backgroundOpacity,
    imageUrl: b.backgroundImageUrl,
  }
}

export function normalizeLoginBranding(raw) {
  return normalize(raw)
}

/** Text/button colors stored locally until the API supports them. */
export function pickLoginColorFields(branding) {
  const b = normalize(branding)
  return {
    titleColor: b.titleColor,
    subtitleColor: b.subtitleColor,
    buttonColor: b.buttonColor,
  }
}

/** @deprecated Use pickLoginColorFields for server-backed login appearance. */
export function pickLoginAppearanceFields(branding) {
  return pickLoginColorFields(branding)
}

export function getLoginAppearanceLocal() {
  if (typeof window === 'undefined') return pickLoginColorFields(DEFAULT_LOGIN_BRANDING)
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (!raw) {
      const legacy = readStored()
      return pickLoginColorFields(legacy)
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return pickLoginColorFields(DEFAULT_LOGIN_BRANDING)
    return pickLoginColorFields({ ...DEFAULT_LOGIN_BRANDING, ...parsed })
  } catch {
    return pickLoginColorFields(DEFAULT_LOGIN_BRANDING)
  }
}

export function setLoginAppearanceLocal(patch) {
  const next = pickLoginColorFields({ ...getLoginAppearanceLocal(), ...patch })
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('sm-login-branding-changed'))
  return next
}

export function resetLoginAppearanceLocal() {
  window.localStorage.removeItem(APPEARANCE_STORAGE_KEY)
  window.dispatchEvent(new Event('sm-login-branding-changed'))
}

/** Merge GET /api/login-appearance with local text/button color overrides. */
export function mergeLoginBrandingFromApi(apiBranding) {
  return normalize({ ...apiBranding, ...getLoginAppearanceLocal() })
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
    if (
      e.type === 'storage' &&
      e.key != null &&
      e.key !== STORAGE_KEY &&
      e.key !== APPEARANCE_STORAGE_KEY
    ) {
      return
    }
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
  window.localStorage.removeItem(APPEARANCE_STORAGE_KEY)
  cache = { json: '', value: { ...DEFAULT_LOGIN_BRANDING } }
  window.dispatchEvent(new Event('sm-login-branding-changed'))
}
