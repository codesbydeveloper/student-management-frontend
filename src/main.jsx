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
import { applySiteBrandingToDocument, cacheSiteBranding, getSiteBrandingSnapshot, normalizeSiteBranding } from './utils/siteBranding'
import { cacheAppBackgroundTheme, getAppBackgroundSnapshot } from './utils/appBackgroundTheme'
import { fetchPublicBackgroundAppearance, fetchPublicSiteIdentity } from './api/settingsApi'
import {
  cleanupDevServiceWorkers,
  preventServiceWorkerReloadLoop,
  registerProductionPwa,
} from './utils/appServiceWorker'

installGlobalPwaCapture()
applySiteBrandingToDocument(getSiteBrandingSnapshot())
cacheAppBackgroundTheme(getAppBackgroundSnapshot())
void fetchPublicSiteIdentity().then((res) => {
  if (res.ok && res.identity) cacheSiteBranding(normalizeSiteBranding(res.identity))
})
void fetchPublicBackgroundAppearance().then((res) => {
  if (res.ok && res.theme) {
    cacheAppBackgroundTheme({
      sidebar: res.theme.sidebar,
      main: res.theme.main,
    })
  }
})
preventServiceWorkerReloadLoop()
void cleanupDevServiceWorkers()
registerProductionPwa()

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
