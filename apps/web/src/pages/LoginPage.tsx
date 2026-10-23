import { useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import loginImage from '../assets/login-image.png'
import logoImage from '../assets/logo.png'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export default function LoginPage() {
  const { login, user } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  if (user) {
    return <Navigate to={user.role === 'hr' ? '/hr' : '/employee'} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await axios.post<{ token: string }>(`${API_BASE}/api/auth/login`, { email, password })
      login(data.token)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Login failed. Please try again.')
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    setGoogleLoading(true)
    window.location.href = `${API_BASE}/api/auth/google`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap');
        .welcome-heading {
          font-family: 'Playfair Display', 'Georgia', serif;
          font-size: clamp(2.2rem, 4vw, 3.2rem);
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem;
          line-height: 1.15;
          letter-spacing: 0.01em;
          width: 100%;
        }
        @media (max-width: 767px) {
          .login-right-panel { display: none !important; }
          .login-left-panel { padding: 2rem 1.25rem !important; }
          .welcome-heading { font-size: 2rem !important; }
        }
        @media (max-width: 575px) {
          .login-left-panel { padding: 1.5rem 1rem !important; }
        }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>

        {/* ── Left column ── */}
        <div className="login-left-panel" style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '3rem clamp(2rem, 6vw, 5rem)' }}>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.85rem', maxWidth: 480, width: '100%', margin: '0 auto' }}>

            <img
              src={logoImage}
              alt="Onboardly Logo"
              style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 16, marginBottom: '0.5rem' }}
            />
            <p className="welcome-heading">Welcome to Onboardly</p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Onboarding requirements, uploaded and tracked.
            </p>

            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.8rem', backgroundColor: '#ffffff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem', fontWeight: 500, cursor: googleLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: googleLoading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!googleLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f9fafb'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db'; }}
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Connecting…' : 'Sign in with Google'}</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '0.25rem 0' }}>
              <div style={{ flex: 1, borderTop: '1px solid #e5e7eb' }} />
              <span style={{ margin: '0 0.75rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, borderTop: '1px solid #e5e7eb' }} />
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSubmit} noValidate style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {error && (
                <div role="alert" style={{ fontSize: '0.875rem', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                  {error}
                </div>
              )}
              <div style={{ textAlign: 'left' }}>
                <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="hr@onboardly.dev"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ textAlign: 'left' }}>
                <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', backgroundColor: loading ? '#93c5fd' : '#2563eb', color: '#ffffff', fontWeight: 600, padding: '0.65rem', borderRadius: 8, fontSize: '0.875rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s ease' }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

          </div>

          {/* Footer */}
          <footer style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
            <p style={{ margin: '0 0 0.4rem', color: '#4b5563', fontSize: '0.85rem' }}>
              Onboardly is powered by <strong>AWS.</strong>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              <a href="#" style={{ color: '#2563eb', textDecoration: 'none' }}>Help Center</a>
              <span style={{ color: '#9ca3af' }}>·</span>
              <a href="#" style={{ color: '#2563eb', textDecoration: 'none' }}>Privacy Policy</a>
              <span style={{ color: '#9ca3af' }}>·</span>
              <a href="#" style={{ color: '#2563eb', textDecoration: 'none' }}>Terms of Service</a>
            </div>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.75rem' }}>&copy; 2026 AWS</p>
          </footer>
        </div>

        {/* ── Right column ── */}
        <div
          className="login-right-panel"
          style={{ flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', backgroundColor: '#f7f9fc', backgroundImage: 'radial-gradient(circle, #dde3ee 1px, transparent 1px), linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #eef2ff 100%)', backgroundSize: '22px 22px, 100% 100%' }}
        >
          <div style={{ width: '100%', maxWidth: 460, aspectRatio: '4/5', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(29,41,81,0.15), 0 8px 10px -6px rgba(29,41,81,0.1)' }}>
            <img src={loginImage} alt="Onboardly" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        </div>

      </div>
    </>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

