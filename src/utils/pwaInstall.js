import { STORAGE_KEYS } from './constants'

const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000

/** True when the app is already open as an installed PWA / home-screen shortcut. */
export function isRunningAsInstalledPwa() {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true
  } catch {
    /* ignore */
  }
  // iOS Safari home screen
  if (typeof navigator !== 'undefined' && navigator.standalone === true) return true
  return false
}

/** Coarse mobile detection (phones, tablets, iPadOS reporting as Mac). */
export function isLikelyMobileDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua)) return true
  return false
}

/** iOS / iPadOS — no `beforeinstallprompt`; user adds via Share → Add to Home Screen. */
export function isIosLike() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua)) return true
  return false
}

export function isPwaInstallBannerPermanentlyDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEYS.PWA_MOBILE_INSTALL_DONE) === '1'
  } catch {
    return false
  }
}

export function markPwaInstallCompleted() {
  try {
    localStorage.setItem(STORAGE_KEYS.PWA_MOBILE_INSTALL_DONE, '1')
    localStorage.removeItem(STORAGE_KEYS.PWA_MOBILE_INSTALL_SNOOZE_UNTIL)
  } catch {
    /* ignore */
  }
}

export function getPwaInstallSnoozeUntil() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.PWA_MOBILE_INSTALL_SNOOZE_UNTIL)
    if (!v) return 0
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function snoozePwaInstallBanner() {
  try {
    localStorage.setItem(STORAGE_KEYS.PWA_MOBILE_INSTALL_SNOOZE_UNTIL, String(Date.now() + SNOOZE_MS))
  } catch {
    /* ignore */
  }
}
