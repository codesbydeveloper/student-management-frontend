import { isWpushSubscribePopupUrl, nativeWebpushrSubscribe } from './webpushrNativeSubscribe'

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

/** Block Webpushr’s HTTP-label popup; run same-page subscribe instead. */
function installWebpushrInterceptors() {
  if (typeof window === 'undefined' || interceptorsInstalled) return
  interceptorsInstalled = true

  originalWindowOpen = window.open.bind(window)
  window.open = function webpushrOpenGuard(url, target, features) {
    if (isWpushSubscribePopupUrl(url)) {
      void nativeWebpushrSubscribe()
      return null
    }
    return originalWindowOpen(url, target, features)
  }

  const onApproveClick = (event) => {
    const btn = event.target?.closest?.('#webpushr-approve-button')
    if (!btn) return
    event.preventDefault()
    event.stopImmediatePropagation()
    void nativeWebpushrSubscribe()
  }
  document.addEventListener('click', onApproveClick, true)
}

/**
 * Enable Webpushr for non-drivers. Never pass integration: "popup" (forces wpush.io).
 * Interceptors keep YES on the custom prompt from opening schoolapp.wpush.io.
 */
export function enableWebpushrForUser() {
  if (typeof document === 'undefined') return
  document.body.classList.remove(DRIVER_WEBPUSHR_BODY_CLASS)
  installWebpushrInterceptors()
  injectWebpushrScript()
  if (setupDone) return
  queueWebpushr('setup', {
    key: WEBPUSHR_PUBLIC_KEY,
    sw: '/webpushr-sw.js',
  })
  setupDone = true
}

export function disableWebpushrForDriver() {
  if (typeof document === 'undefined') return
  document.body.classList.add(DRIVER_WEBPUSHR_BODY_CLASS)
}

/** Header toggle / manual opt-in — same-page browser permission. */
export function requestWebpushrSubscribe() {
  void nativeWebpushrSubscribe()
}
