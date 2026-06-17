import { NavigationLoadingBridge } from './components/layout/NavigationLoadingBridge'
import { SiteBrandingDocumentSync } from './components/layout/SiteBrandingDocumentSync'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <>
      <SiteBrandingDocumentSync />
      <NavigationLoadingBridge />
      <AppRouter />
    </>
  )
}
