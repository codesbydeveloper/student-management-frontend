const STORAGE_KEY = 'sm_site_branding_v1'
const EVENT = 'sm-site-branding-changed'

export const DEFAULT_SITE_BRANDING = {
  siteName: 'School Management Suite',
  faviconUrl: '/favicon.svg',
}

const MAX_FAVICON_DATA_URL_CHARS = 380_000
const MAX_FAVICON_URL_CHARS = 2048

export function sanitizeFaviconUrl(value) {
  if (value == null) return ''
  const v = String(value).trim()
  if (!v) return ''
  if (v.startsWith('data:image/') && v.length <= MAX_FAVICON_DATA_URL_CHARS) return v
  if (/^https:\/\//i.test(v) && v.length <= MAX_FAVICON_URL_CHARS) return v
  if (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(v) &&
    v.length <= MAX_FAVICON_URL_CHARS
  )
    return v
  if (v.startsWith('/') && v.length <= MAX_FAVICON_URL_CHARS) return v
  return ''
}

export function normalizeSiteBranding(raw) {
  const siteName = String(raw?.siteName ?? DEFAULT_SITE_BRANDING.siteName)
    .trim()
    .slice(0, 120)
  const faviconUrl =
    sanitizeFaviconUrl(raw?.faviconUrl) || DEFAULT_SITE_BRANDING.faviconUrl
  return {
    siteName: siteName || DEFAULT_SITE_BRANDING.siteName,
    faviconUrl,
  }
}

export function getSiteBrandingSnapshot() {
  if (typeof window === 'undefined') return { ...DEFAULT_SITE_BRANDING }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SITE_BRANDING }
    return normalizeSiteBranding(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SITE_BRANDING }
  }
}

export function setSiteBranding(branding) {
  const next = cacheSiteBranding(branding)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT))
  }
  return next
}

/** Update cache + document without notifying subscribers (avoids fetch loops). */
export function cacheSiteBranding(branding) {
  const next = normalizeSiteBranding(branding)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  applySiteBrandingToDocument(next)
  return next
}

export function resetSiteBranding() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(EVENT))
  }
  const next = { ...DEFAULT_SITE_BRANDING }
  applySiteBrandingToDocument(next)
  return next
}

export function applySiteBrandingToDocument(branding) {
  if (typeof document === 'undefined') return
  const b = normalizeSiteBranding(branding)
  document.title = b.siteName

  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (appleTitle) appleTitle.setAttribute('content', b.siteName)
  const appName = document.querySelector('meta[name="application-name"]')
  if (appName) appName.setAttribute('content', b.siteName)

  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = b.faviconUrl
  if (b.faviconUrl.endsWith('.svg')) {
    link.type = 'image/svg+xml'
  } else if (b.faviconUrl.startsWith('data:image/')) {
    const mime = b.faviconUrl.slice(5, b.faviconUrl.indexOf(';'))
    if (mime) link.type = mime
  } else {
    link.removeAttribute('type')
  }
}

export function subscribeSiteBranding(listener) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener()
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
