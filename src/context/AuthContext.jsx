import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react'
import { loginRequest } from '../api/authLogin'
import { logoutRequest } from '../api/authLogout'
import { ROLE_LABELS, STORAGE_KEYS } from '../utils/constants'
import { isTokenExpired, tokenMatchesStoredUser } from '../utils/fakeJwt'

const AuthContext = createContext(null)

function persistSession(token, user) {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token)
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  localStorage.removeItem(STORAGE_KEYS.USER)
}

function readStoredSession() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  const userRaw = localStorage.getItem(STORAGE_KEYS.USER)
  if (!token || !userRaw) return { token: null, user: null }
  try {
    const user = JSON.parse(userRaw)
    if (isTokenExpired(token)) {
      clearSession()
      return { token: null, user: null }
    }
    if (!tokenMatchesStoredUser(token, user)) {
      clearSession()
      return { token: null, user: null }
    }
    return { token, user }
  } catch {
    clearSession()
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const { token: t, user: u } = readStoredSession()
    setToken(t)
    setUser(u)
    setReady(true)
  }, [])

  const login = useCallback(async (email, password, expectedRole = null) => {
    const roleMismatch = (actualRole) => ({
      ok: false,
      error: `This account signs in as ${ROLE_LABELS[actualRole] || actualRole}. Select that role above and try again.`,
    })

    const res = await loginRequest(email, password)
    if (!res.ok) return res

    if (expectedRole != null && res.user.role !== expectedRole) {
      return roleMismatch(res.user.role)
    }

    setToken(res.token)
    setUser(res.user)
    persistSession(res.token, res.user)
    return { ok: true, user: res.user }
  }, [])

  const logout = useCallback(async () => {
    const sessionToken = token
    try {
      await logoutRequest(sessionToken)
    } finally {
      setToken(null)
      setUser(null)
      clearSession()
    }
  }, [token])

  const getCurrentUser = useCallback(() => user, [user])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      ready,
      login,
      logout,
      getCurrentUser,
    }),
    [token, user, ready, login, logout, getCurrentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
