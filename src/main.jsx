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
import {
  cleanupDevServiceWorkers,
  preventServiceWorkerReloadLoop,
  registerProductionPwa,
} from './utils/appServiceWorker'

installGlobalPwaCapture()
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
