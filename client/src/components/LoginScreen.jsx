import { useState } from 'react'
import { login } from '../api'

export default function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(password)
      onLogin()
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0f172a'
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
        padding: '2.5rem', width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.svg" alt="OpenClaw" style={{ height: 48, marginBottom: 12 }} onError={(e) => { e.target.style.display = 'none' }} />
          <h1 style={{ color: '#f1f5f9', fontSize: '1.4rem', margin: 0 }}>The Huddle</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0' }}>Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '0.65rem 0.75rem', boxSizing: 'border-box',
                background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
                color: '#f1f5f9', fontSize: '1rem', outline: 'none',
              }}
              placeholder="Enter dashboard password"
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0 0 1rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '0.7rem', background: '#3b82f6',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: '1rem',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              opacity: loading || !password ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
