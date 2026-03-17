'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/admin/products')
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#141414', border: '1px solid rgba(255,107,53,0.25)', borderTop: '3px solid #ff6b35', borderRadius: '10px', padding: '48px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', color: '#ff6b35', letterSpacing: '4px', marginBottom: '4px' }}>DIRTBIKZ</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '36px' }}>Admin Dashboard</p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,107,53,0.25)', borderRadius: '6px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', padding: '13px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '3px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Logging in...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  )
}
