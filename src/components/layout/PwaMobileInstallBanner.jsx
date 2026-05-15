import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import {
  getPwaInstallSnoozeUntil,
  isIosLike,
  isLikelyMobileDevice,
  isPwaInstallBannerPermanentlyDismissed,
  isRunningAsInstalledPwa,
  markPwaInstallCompleted,
  snoozePwaInstallBanner,
} from '../../utils/pwaInstall'

/**
 * Shown on the dashboard for signed-in users on mobile browsers who are not
 * already in standalone / installed mode. Android uses `beforeinstallprompt`
 * when available; iOS shows Add to Home Screen steps (no programmatic install).
 */
export function PwaMobileInstallBanner() {
  const deferredRef = useRef(null)
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false)
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)

  const refreshVisibility = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!isLikelyMobileDevice()) {
      setVisible(false)
      return
    }
    if (isRunningAsInstalledPwa()) {
      setVisible(false)
      return
    }
    if (isPwaInstallBannerPermanentlyDismissed()) {
      setVisible(false)
      return
    }
    if (Date.now() < getPwaInstallSnoozeUntil()) {
      setVisible(false)
      return
    }
    setVisible(true)
  }, [])

  useEffect(() => {
    refreshVisibility()
  }, [refreshVisibility])

  useEffect(() => {
    const onBip = (e) => {
      e.preventDefault()
      deferredRef.current = e
      setHasDeferredPrompt(true)
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
  }, [])

  const onInstallClick = async () => {
    const ev = deferredRef.current
    if (!ev || typeof ev.prompt !== 'function') return
    setInstalling(true)
    try {
      await ev.prompt()
      await ev.userChoice
    } catch {
      /* user dismissed native sheet */
    } finally {
      setInstalling(false)
      deferredRef.current = null
      setHasDeferredPrompt(false)
      refreshVisibility()
    }
  }

  const onNotNow = () => {
    snoozePwaInstallBanner()
    setVisible(false)
  }

  if (!visible) return null

  const ios = isIosLike()

  return (
    <div
      className="shrink-0 border-b border-indigo-200/90 bg-gradient-to-r from-indigo-50 via-violet-50/90 to-indigo-50 px-3 py-3 sm:px-6"
      role="region"
      aria-label="Install app"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 text-sm leading-snug text-slate-800">
          <p className="font-semibold text-slate-900">Install EduConsole on this device</p>
          {ios ? (
            <p className="mt-1 text-slate-700">
              On iPhone or iPad: tap <span className="font-medium">Share</span> (square with arrow), then{' '}
              <span className="font-medium">Add to Home Screen</span>, then Add. Open the app from your home screen
              for the best experience.
            </p>
          ) : (
            <p className="mt-1 text-slate-700">
              {hasDeferredPrompt
                ? 'Install the app for quicker access and offline support when your browser allows it.'
                : 'Use your browser menu (often ⋮ or “Install app”) to add EduConsole to your home screen, or tap Install below if your browser shows it.'}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {!ios && hasDeferredPrompt ? (
            <Button
              type="button"
              size="sm"
              className="min-h-10"
              disabled={installing}
              onClick={() => void onInstallClick()}
            >
              {installing ? 'Installing…' : 'Install'}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" size="sm" className="min-h-10" onClick={onNotNow}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
