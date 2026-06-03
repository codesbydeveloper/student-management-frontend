import { useEffect } from 'react'

const CATCH_UP_POLL_MS = 10_000
const CATCH_UP_WINDOW_MS = 90_000

/**
 * When REST still says "trip ended" but the driver may have just started, refresh
 * my-bus-live occasionally for a short window (not forever).
 */
export function useParentTripStatusCatchUp({
  enabled = true,
  tripEnded = false,
  tripStarted = false,
  driverLive = false,
  refreshLive,
}) {
  useEffect(() => {
    if (!enabled || !refreshLive) return undefined
    if (!tripEnded || tripStarted || driverLive) return undefined

    void refreshLive()

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshLive()
    }, CATCH_UP_POLL_MS)

    const stopTimer = window.setTimeout(() => {
      window.clearInterval(id)
    }, CATCH_UP_WINDOW_MS)

    return () => {
      window.clearInterval(id)
      window.clearTimeout(stopTimer)
    }
  }, [enabled, tripEnded, tripStarted, driverLive, refreshLive])
}
