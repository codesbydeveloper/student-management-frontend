import { NavigationLoadingBridge } from './components/layout/NavigationLoadingBridge'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <>
      <NavigationLoadingBridge />
      <AppRouter />
    </>
  )
}
