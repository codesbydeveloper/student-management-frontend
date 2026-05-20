import { useCallback, useEffect, useRef, useState } from 'react'
import { useLoginBranding } from '../../hooks/useLoginBranding'
import {
  dismissPwaInstallForToday,
  isIosLike,
  isLikelyMobileDevice,
  markPwaInstallCompleted,
  PWA_INSTALL_LOGIN_PROMPT_EVENT,
  shouldShowPwaInstallPrompt,
} from '../../utils/pwaInstall'

function InstallAppIcon({ className = 'h-10 w-10 text-sky-500' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M12 3v10m0 0l3.5-3.5M12 13L8.5 9.5M5 17h14a2 2 0 0 1 2 2v1H3v-1a2 2 0 0 1 2-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Floating install prompt on the sign-in page — matches the push-notification style banner.
 */
export function PwaLoginInstallCard() {
  const branding = useLoginBranding()
  const appName = branding.title?.trim() || 'School Management'
  const deferredRef = useRef(null)
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false)
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)

  const syncVisible = useCallback(() => {
    setVisible(shouldShowPwaInstallPrompt())
  }, [])

  useEffect(() => {
    syncVisible()
    const onRefresh = () => syncVisible()
    window.addEventListener(PWA_INSTALL_LOGIN_PROMPT_EVENT, onRefresh)
    return () => window.removeEventListener(PWA_INSTALL_LOGIN_PROMPT_EVENT, onRefresh)
  }, [syncVisible])

  useEffect(() => {
    const onBip = (e) => {
      e.preventDefault()
      deferredRef.current = e
      setHasDeferredPrompt(true)
      syncVisible()
    }
    const onInstalled = () => {
      deferredRef.current = null
      setHasDeferredPrompt(false)
      markPwaInstallCompleted()
      setVisible(false)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [syncVisible])

  const runInstall = async () => {
    const ev = deferredRef.current
    if (ev && typeof ev.prompt === 'function') {
      setInstalling(true)
      try {
        await ev.prompt()
        const choice = await ev.userChoice
        if (choice?.outcome === 'accepted') {
          markPwaInstallCompleted()
          setVisible(false)
        }
      } catch {
        /* dismissed */
      } finally {
        setInstalling(false)
        deferredRef.current = null
        setHasDeferredPrompt(false)
        syncVisible()
      }
      return
    }
    if (isIosLike()) {
      setShowIosSteps(true)
      return
    }
    setShowIosSteps(false)
  }

  const onDismiss = () => {
    dismissPwaInstallForToday()
    setShowIosSteps(false)
    setVisible(false)
  }

  if (!visible) return null

  const ios = isIosLike()
  const mobile = isLikelyMobileDevice()

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))]"
      role="dialog"
      aria-modal="false"
      aria-labelledby="pwa-login-install-title"
    >
      <div className="pointer-events-auto flex w-full max-w-xl gap-4 rounded-sm border border-slate-200/90 bg-white p-4 shadow-[0_8px_30px_rgb(0_0_0/0.12)] sm:gap-5 sm:p-5">
        <div className="flex shrink-0 items-start pt-0.5">
          <InstallAppIcon className="h-10 w-10 text-sky-500 sm:h-11 sm:w-11" />
        </div>
        <div className="min-w-0 flex-1">
          <p id="pwa-login-install-title" className="text-sm leading-relaxed text-slate-700 sm:text-[15px]">
            Would you like to install <span className="font-medium text-slate-900">{appName}</span> on this{' '}
            {mobile ? 'device' : 'computer'}?
          </p>

          {showIosSteps && ios ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              In Safari: tap <strong className="text-slate-800">Share</strong> →{' '}
              <strong className="text-slate-800">Add to Home Screen</strong> → <strong>Add</strong>.
            </p>
          ) : null}

          {!ios && !hasDeferredPrompt && !showIosSteps ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Use the install icon in your browser address bar, or the browser menu → Install app.
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-end gap-5 sm:mt-4">
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-wide text-sky-500 transition hover:text-sky-700"
              onClick={onDismiss}
            >
              Not yet
            </button>
            <button
              type="button"
              disabled={installing}
              className="min-w-[4.5rem] rounded bg-sky-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-60"
              onClick={() => void runInstall()}
            >
              {installing ? '…' : 'Yes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
