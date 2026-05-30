import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchParentMyBusLive, fetchParentMyPickupPoints } from '../../api/parentsApi'

/** Only my-bus-live is polled — pickup points do not change during a trip. */
const LIVE_POLL_MS = 30_000

/**
 * Pick-up points: once per page visit.
 * Live bus: once on load, then every 30s. No studentId query — filter in the UI.
 * @param {string | null | undefined} token
 * @param {{ pollMs?: number, enabled?: boolean }} [options]
 */
export function useParentBusLiveStatus(token, options = {}) {
  const { pollMs = LIVE_POLL_MS, enabled = true } = options

  const [pickupStudents, setPickupStudents] = useState([])
  const [liveStudents, setLiveStudents] = useState([])
  const [pickupAssigned, setPickupAssigned] = useState(false)
  const [liveStatus, setLiveStatus] = useState(null)
  const [liveMessage, setLiveMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pickupLoaded = useRef(false)
  const pickupInFlight = useRef(false)
  const liveInFlight = useRef(false)

  const loadPickupPoints = useCallback(async () => {
    if (!token || !enabled) {
      setPickupStudents([])
      setPickupAssigned(false)
      pickupLoaded.current = false
      return
    }
    if (pickupInFlight.current) return
    pickupInFlight.current = true
    try {
      const pickupRes = await fetchParentMyPickupPoints(token)
      if (pickupRes.ok) {
        setPickupStudents(pickupRes.students)
        setPickupAssigned(Boolean(pickupRes.assigned))
        pickupLoaded.current = true
      } else {
        setPickupStudents([])
        setPickupAssigned(false)
      }
    } finally {
      pickupInFlight.current = false
    }
  }, [token, enabled])

  const loadLive = useCallback(async () => {
    if (!token || !enabled) {
      setLiveStudents([])
      setLiveStatus(null)
      setLiveMessage(null)
      setError('')
      return
    }
    if (liveInFlight.current) return
    liveInFlight.current = true
    setLoading(true)
    try {
      const liveRes = await fetchParentMyBusLive(token)
      if (liveRes.ok) {
        setLiveStudents(liveRes.students)
        setLiveStatus(liveRes.status)
        setLiveMessage(liveRes.message)
        setError('')
      } else {
        setLiveStudents([])
        setLiveStatus(null)
        setLiveMessage(liveRes.error || null)
        setError(liveRes.error || '')
      }
    } finally {
      liveInFlight.current = false
      setLoading(false)
    }
  }, [token, enabled])

  const refresh = useCallback(async () => {
    pickupLoaded.current = false
    await Promise.all([loadPickupPoints(), loadLive()])
  }, [loadPickupPoints, loadLive])

  useEffect(() => {
    if (!token || !enabled || pickupLoaded.current) return
    void loadPickupPoints()
  }, [token, enabled, loadPickupPoints])

  useEffect(() => {
    if (!token || !enabled) return undefined
    void loadLive()
    if (pollMs <= 0) return undefined
    const id = window.setInterval(() => {
      void loadLive()
    }, pollMs)
    return () => window.clearInterval(id)
  }, [token, enabled, pollMs, loadLive])

  return {
    pickupStudents,
    liveStudents,
    pickupAssigned,
    liveStatus,
    liveMessage,
    loading,
    error,
    refresh,
  }
}
