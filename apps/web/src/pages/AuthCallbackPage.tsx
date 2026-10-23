import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Landing page after Google OAuth redirect.
 * URL: /auth/callback?token=<jwt>
 * Stores the token then redirects to the correct dashboard.
 */
export default function AuthCallbackPage() {
  const [params]   = useSearchParams()
  const { login, user } = useAuth()
  const navigate   = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      login(token)
    } else {
      navigate('/login', { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After login() resolves, user state updates and we redirect
  useEffect(() => {
    if (user) {
      navigate(user.role === 'hr' ? '/hr' : '/employee', { replace: true })
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <p className="text-neutral-500">Signing you in…</p>
    </div>
  )
}
