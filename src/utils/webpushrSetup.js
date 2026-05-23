import { isWpushSubscribePopupUrl, nativeWebpushrSubscribe } from './webpushrNativeSubscribe'
import {
  getNotificationPermission,
  hasActiveWebpushrServiceWorker,
  hasStoredPushEndpoint,
  markPushPromptCompleted,
  shouldOfferPushPermissionOnce,
} from './pushPermission'

/** Webpushr site key (from Webpushr dashboard). */
export const WEBPUSHR_PUBLIC_KEY =
  'BPvye14rYpRLR_49ONyv6jCt4UYvqX3GGLN7jQe8jUSMHO2LDnaj-z6LN8TI3HipcA3HpxjqzMOP2oyovbchSis'

export const DRIVER_WEBPUSHR_BODY_CLASS = 'driver-no-webpushr'

let scriptInjected = false
let setupDone = false
let interceptorsInstalled = false
let originalWindowOpen = null

function queueWebpushr(...args) {
  if (typeof window === 'undefined') return
  if (typeof window.webpushr === 'function') {
    window.webpushr(...args)
    return
  }
  window.webpushr =
    window.webpushr ||
    function webpushrStub() {
      ;(window.webpushr.q = window.webpushr.q || []).push(arguments)
    }
  window.webpushr(...args)
}

function injectWebpushrScript() {
  if (typeof document === 'undefined' || scriptInjected) return
  if (document.getElementById('webpushr-jssdk')) {
    scriptInjected = true
    return
  }
  const js = document.createElement('script')
  js.id = 'webpushr-jssdk'
  js.async = true
  js.src = 'https://cdn.webpushr.com/app.min.js'
  const first = document.getElementsByTagName('script')[0]
  first?.parentNode?.insertBefore(js, first)
  scriptInjected = true
}

function installWebpushrInterceptors() {
  if (typeof window === 'undefined' || interceptorsInstalled) return
  interceptorsInstalled = true

  originalWindowOpen = window.open.bind(window)
  window.open = function webpushrOpenGuard(url, target, features) {
    if (isWpushSubscribePopupUrl(url)) {
      void handlePushYesClick()
      return null
    }
    return originalWindowOpen(url, target, features)
  }

  document.addEventListener(
    'click',
    (event) => {
      if (event.target?.closest?.('#webpushr-deny-button')) {
        event.preventDefault()
        event.stopImmediatePropagation()
        markPushPromptCompleted('Deny')
        return
      }
      if (!event.target?.closest?.('#webpushr-approve-button')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      void handlePushYesClick()
    },
    true,
  )
}

/** YES on Webpushr banner → browser Allow (if needed) → subscribe once. */
async function handlePushYesClick() {
  if (!shouldOfferPushPermissionOnce() && getNotificationPermission() === 'default') {
    return
  }

  const perm = getNotificationPermission()
  if (perm === 'granted' || hasStoredPushEndpoint()) {
    markPushPromptCompleted('Approve')
    await nativeWebpushrSubscribe({ requestPermission: false })
    return
  }

  await nativeWebpushrSubscribe({ requestPermission: true })
}

/**
 * Load Webpushr so the YES/NOT YET banner can show once.
 * No auto-subscribe on page load (that caused the refresh loop).
 */
export function enableWebpushrForUser() {
  if (typeof document === 'undefined') return
  document.body.classList.remove(DRIVER_WEBPUSHR_BODY_CLASS)
  installWebpushrInterceptors()
  injectWebpushrScript()
  if (!setupDone) {
    queueWebpushr('setup', {
      key: WEBPUSHR_PUBLIC_KEY,
      sw: '/webpushr-sw.js',
    })
    setupDone = true
  }

  void (async () => {
    if (getNotificationPermission() !== 'granted' || !hasStoredPushEndpoint()) return
    if (!(await hasActiveWebpushrServiceWorker())) return
    void nativeWebpushrSubscribe({ requestPermission: false })
  })()
}

export function disableWebpushrForDriver() {
  if (typeof document === 'undefined') return
  document.body.classList.add(DRIVER_WEBPUSHR_BODY_CLASS)
}

export function requestWebpushrSubscribe() {
  const perm = getNotificationPermission()
  void nativeWebpushrSubscribe({ requestPermission: perm === 'default' })
}
