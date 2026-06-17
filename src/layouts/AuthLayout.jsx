import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { PwaLoginInstallCard } from '../components/layout/PwaLoginInstallCard'
import { useLoginBranding } from '../hooks/useLoginBranding'
import { surfacePreviewStyle } from '../utils/appBackgroundTheme'
import { loginBackgroundSurface } from '../utils/loginBranding'
import { requestPwaInstallPromptOnLoginPage } from '../utils/pwaInstall'

export function AuthLayout() {
  const branding = useLoginBranding()
  const backgroundStyle = surfacePreviewStyle(loginBackgroundSurface(branding), { imageFit: 'repeat' })

  useEffect(() => {
    requestPwaInstallPromptOnLoginPage()
  }, [])

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="pointer-events-none absolute inset-0" aria-hidden style={backgroundStyle} />
      <PwaLoginInstallCard />
      <div
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14"
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <header className="mb-6 w-full max-w-md text-center sm:mb-8">
          {branding.logoImage ? (
            <div className="mx-auto mb-4 flex max-h-24 max-w-[min(16rem,calc(100vw-2rem))] items-center justify-center">
              <img
                src={branding.logoImage}
                alt=""
                className="max-h-24 max-w-full object-contain"
                decoding="async"
              />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 text-lg font-semibold text-white">
              {branding.logoLetter}
            </div>
          )}
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ color: branding.titleColor }}
          >
            {branding.title}
          </h1>
          <p
            className="mx-auto mt-2 max-w-md text-sm leading-relaxed sm:mt-2.5"
            style={{ color: branding.subtitleColor }}
          >
            {branding.subtitle}
          </p>
        </header>
        <main className="relative w-full max-w-md">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
