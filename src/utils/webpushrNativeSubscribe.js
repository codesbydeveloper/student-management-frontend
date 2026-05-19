/** Same key as webpushrSetup — duplicated to avoid circular imports. */
const WEBPUSHR_PUBLIC_KEY =
  'BPvye14rYpRLR_49ONyv6jCt4UYvqX3GGLN7jQe8jUSMHO2LDnaj-z6LN8TI3HipcA3HpxjqzMOP2oyovbchSis'

const SW_PATH = '/webpushr-sw.js'
const SUBSCRIBE_URL = 'https://subscriber.webpushr.com/subscribe/'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i)
  return arr
}

function setWebpushrLocal(key, value) {
  let store = {}
  try {
    store = JSON.parse(localStorage.getItem('_webpushr') || '{}') || {}
  } catch {
    store = {}
  }
  store[key] = value
  localStorage.setItem('_webpushr', JSON.stringify(store))
}

function setWebpushrCookie(name, value, days) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

async function postSubscriptionToWebpushr(subscription) {
  const p256dh = subscription.getKey('p256dh')
  const auth = subscription.getKey('auth')
  const body = {
    endpoint: subscription.endpoint,
    key: p256dh ? btoa(String.fromCharCode(...new Uint8Array(p256dh))) : null,
    token: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : null,
    site_id: WEBPUSHR_PUBLIC_KEY,
    type: 'POST',
    old: '',
    welcome_notification: 1,
    timezone: new Date().getTimezoneOffset(),
  }
  const res = await fetch(SUBSCRIBE_URL, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Webpushr subscription failed')
  return res.text()
}

/**
 * Subscribe on the current origin (browser permission dialog here — no wpush.io window).
 * Works on https and on http://localhost where Webpushr’s HTTP-label flow would open a popup.
 */
export async function nativeWebpushrSubscribe() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: permission }
  }

  let registration = await navigator.serviceWorker.getRegistration('/')
  const activeScript = registration?.active?.scriptURL || ''
  if (!registration || !activeScript.includes('webpushr')) {
    registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
  }
  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(WEBPUSHR_PUBLIC_KEY),
    })
  }

  await postSubscriptionToWebpushr(subscription)

  setWebpushrLocal('endpoint', subscription.endpoint)
  setWebpushrCookie('_webpushrEndPoint', subscription.endpoint, 90)
  sessionStorage.setItem('_webpushrPromptAction', 'Approve')

  const wrapper = document.getElementById('webpushr-prompt-wrapper')
  if (wrapper) wrapper.innerHTML = ''

  return { ok: true }
}

export function isWpushSubscribePopupUrl(url) {
  if (!url || typeof url !== 'string') return false
  return /wpush\.io\/subscribe/i.test(url)
}
