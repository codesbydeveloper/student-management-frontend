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
import { installGlobalPwaCapture } from './utils/pwaInstall'

installGlobalPwaCapture()

/**
 * PWA service worker — dev + production.
 * Install prompt needs a registered service worker; dev used to unregister SW which broke "Yes".
 */
if ('serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
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
