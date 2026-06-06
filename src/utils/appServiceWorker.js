
const RELOAD_GUARD_KEY = 'scs_sw_reload_guard_v1'


export function preventServiceWorkerReloadLoop() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    try {
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    
  })
}

function isAppPwaServiceWorkerUrl(url) {
  const u = String(url || '')
  if (!u) return false
  if (u.includes('webpushr')) return false
  return (
    u.includes('dev-sw') ||
    u.includes('workbox') ||
    /\/sw\.js(\?|$)/i.test(u) ||
    u.includes('registerSW')
  )
}

/**
  In dev, remove stale Vite PWA workers so they do not fight Webpushr or hot-reload.
 **/
export async function cleanupDevServiceWorkers() {
  if (!import.meta.env.DEV) return
  if (!('serviceWorker' in navigator)) return

  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      regs.map(async (reg) => {
        const url =
          reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || ''
        if (isAppPwaServiceWorkerUrl(url)) {
          await reg.unregister()
        }
      }),
    )
  } catch {
    /* ignore */
  }
}


export function registerProductionPwa() {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
       
      },
      onOfflineReady() {},
    })
  })
}

/**
 * Before Webpushr push subscribe, drop the app PWA worker so only one SW owns `/`.
 * @param {boolean} [replaceAppSw]
 */
export async function prepareWebpushrServiceWorker(replaceAppSw = false) {
  if (!replaceAppSw || !('serviceWorker' in navigator)) return

  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      regs.map(async (reg) => {
        const url =
          reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || ''
        if (isAppPwaServiceWorkerUrl(url)) {
          await reg.unregister()
        }
      }),
    )
  } catch {
    /* ignore */
  }
}
