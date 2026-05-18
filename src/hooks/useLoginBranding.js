import { useCallback, useEffect, useState } from 'react'
import { fetchPublicLoginBranding } from '../api/settingsApi'
import {
  DEFAULT_LOGIN_BRANDING,
  getLoginBrandingSnapshot,
  normalizeLoginBranding,
  subscribeLoginBranding,
} from '../utils/loginBranding'

/**
 * Login / institution branding from GET /api/login-appearance (with local fallback).
 */
export function useLoginBranding() {
  const [branding, setBranding] = useState(() => ({ ...DEFAULT_LOGIN_BRANDING }))

  const load = useCallback(async () => {
    const remote = await fetchPublicLoginBranding()
    if (remote.ok && remote.branding) {
      setBranding(normalizeLoginBranding(remote.branding))
      return
    }
    setBranding(getLoginBrandingSnapshot())
  }, [])

  useEffect(() => {
    void load()
    const unsub = subscribeLoginBranding(() => {
      setBranding(getLoginBrandingSnapshot())
      void load()
    })
    return unsub
  }, [load])

  return branding
}
