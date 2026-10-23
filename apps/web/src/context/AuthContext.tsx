import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

interface AuthUser {
  id:    string
  email: string
  role:  string
}

interface AuthContextValue {
  user:    AuthUser | null
  token:   string | null
  isHr:    boolean
  login:   (token: string) => void
  logout:  () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'onboardly_token'

function decodeToken(token: string): AuthUser | null {
  try {
    return jwtDecode<AuthUser>(token)
  } catch {
    return null
  }
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// Attach JWT to every axios request; on 401 clear stored token
axios.interceptors.request.use(config => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
    }
    return Promise.reject(err)
  },
)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser]   = useState<AuthUser | null>(() => {
    const t = getStoredToken()
    return t ? decodeToken(t) : null
  })

  const login = useCallback((newToken: string) => {
    const decoded = decodeToken(newToken)
    if (!decoded) return
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(decoded)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isHr: user?.role === 'hr', login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
