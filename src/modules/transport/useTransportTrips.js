import { useEffect, useState } from 'react'
import {
  loadTrips,
  pruneInactiveLiveTrips,
  pruneStaleTrips,
  subscribeTransportMock,
} from './transportMockStore'

/** Live read of mock trips from localStorage (same tab + other tabs). */
export function useTransportTrips() {
  const [trips, setTrips] = useState(() => loadTrips())

  useEffect(() => {
    const sync = () => {
      pruneStaleTrips()
      pruneInactiveLiveTrips()
      setTrips(loadTrips())
    }
    sync()
    const unsub = subscribeTransportMock(sync)
    const interval = window.setInterval(sync, 3000)
    return () => {
      unsub()
      window.clearInterval(interval)
    }
  }, [])

  return trips
}
