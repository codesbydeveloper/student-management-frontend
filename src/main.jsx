import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { AppDataProvider } from './context/AppDataContext'
import { NotificationProvider } from './context/NotificationContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { LoadingProvider } from './context/LoadingContext'

/**
 * PWA service worker — production only.
 * - Dev: unregister any stale SW (e.g. after testing a prod build on localhost) to avoid
 *   infinite refresh / HMR fights (vite-plugin-pwa + dev SW is a known footgun).
 * - Prod: register with no auto-reload on update; users keep working until they hard-refresh
 *   or we add an explicit “Update available” UI later.
 */
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister()
  })
}

if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: false,
      onNeedRefresh() {
        /* Do not auto-reload — prevents loops with Webpushr SW + DevTools “Update on reload”. */
      },
      onOfflineReady() {},
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LoadingProvider>
        <AuthProvider>
          <AppDataProvider>
            <ConfirmProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
              <ToastContainer
                position="top-right"
                autoClose={4200}
                limit={4}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                hideProgressBar={false}
                className="!p-0"
              />
            </ConfirmProvider>
          </AppDataProvider>
        </AuthProvider>
      </LoadingProvider>
    </BrowserRouter>
  </StrictMode>,
)
