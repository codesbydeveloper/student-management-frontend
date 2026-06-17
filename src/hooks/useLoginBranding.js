import { useEffect, useRef, useState } from 'react'
import { fetchPublicLoginBranding } from '../api/settingsApi'
import {
  DEFAULT_LOGIN_BRANDING,
  getLoginBrandingSnapshot,
  mergeLoginBrandingFromApi,
  subscribeLoginBranding,
} from '../utils/loginBranding'
import { useAsyncLoader } from './useAsyncLoader'

/**
 * Login branding from GET /api/login-appearance (title, subtitle, logo) plus local appearance overrides.
 */
export function useLoginBranding() {
  const [branding, setBranding] = useState(() => ({ ...DEFAULT_LOGIN_BRANDING }))

  const load = useAsyncLoader(async () => {
    const remote = await fetchPublicLoginBranding()
    if (remote.ok && remote.branding) {
      setBranding(mergeLoginBrandingFromApi(remote.branding))
      return
    }
    setBranding(getLoginBrandingSnapshot())
  }, [])

  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    const unsub = subscribeLoginBranding(() => {
      void loadRef.current()
    })
    return unsub
  }, [])

  return branding
}
