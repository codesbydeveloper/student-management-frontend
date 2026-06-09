import { useEffect, useRef, useState } from 'react'
import { fetchPublicLoginBranding } from '../api/settingsApi'
import {
  DEFAULT_LOGIN_BRANDING,
  getLoginBrandingSnapshot,
  normalizeLoginBranding,
  subscribeLoginBranding,
} from '../utils/loginBranding'
import { useAsyncLoader } from './useAsyncLoader'

/**
 * Login / institution branding from GET /api/login-appearance (with local fallback).
 */
export function useLoginBranding() {
  const [branding, setBranding] = useState(() => ({ ...DEFAULT_LOGIN_BRANDING }))

  const load = useAsyncLoader(async () => {
    const remote = await fetchPublicLoginBranding()
    if (remote.ok && remote.branding) {
      setBranding(normalizeLoginBranding(remote.branding))
      return
    }
    setBranding(getLoginBrandingSnapshot())
  }, [])

  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    const unsub = subscribeLoginBranding(() => {
      setBranding(getLoginBrandingSnapshot())
      void loadRef.current()
    })
    return unsub
  }, [])

  return branding
}
