'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const ANNUAL_FEE = '$10,299'
const EARLY_BIRD_FEE = '$299'
const EARLY_BIRD_DISCOUNT = '$10,000'
const COMMISSION = '5%'

const css = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' } as React.CSSProperties,
  card: { background: '#111', border: '1px solid rgba(255,107,53,0.2)', borderTop: '3px solid #ff6b35', borderRadius: '10px', padding: '40px', width: '100%', maxWidth: '520px' } as React.CSSProperties,
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#ff6b35', marginBottom: '8px' } as React.CSSProperties,
  subtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px', lineHeight: 1.6 } as React.CSSProperties,
  label: { display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '16px' } as React.CSSProperties,
  input: { width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' as const, marginTop: '6px', outline: 'none' } as React.CSSProperties,
  btn: { width: '100%', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '2px', cursor: 'pointer', marginTop: '24px' } as React.CSSProperties,
  btnOutline: { width: '100%', background: 'transparent', color: '#ff6b35', border: '1px solid #ff6b35', borderRadius: '6px', padding: '12px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '2px', cursor: 'pointer', marginTop: '12px' } as React.CSSProperties,
  error: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginTop: '16px' } as React.CSSProperties,
  success: { background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '14px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 } as React.CSSProperties,
  link: { color: '#ff6b35', textDecoration: 'none', fontSize: '13px' } as React.CSSProperties,
  toggle: { textAlign: 'center' as const, marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' } as React.CSSProperties,
  feeBox: { background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '16px', marginBottom: '24px' } as React.CSSProperties,
  feeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '13px' } as React.CSSProperties,
  feeBig: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#ff6b35', letterSpacing: '1px' } as React.CSSProperties,
  stepRow: { display: 'flex', gap: '12px', marginBottom: '24px' } as React.CSSProperties,
  step: (active: boolean, done: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    background: done ? 'rgba(34,197,94,0.1)' : active ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)',
    color: done ? '#22c55e' : active ? '#ff6b35' : 'rgba(255,255,255,0.2)',
    border: `1px solid ${done ? '#22c55e33' : active ? '#ff6b3533' : 'rgba(255,255,255,0.06)'}`,
  }),
  couponRow: { display: 'flex', gap: '8px', marginTop: '6px' } as React.CSSProperties,
  couponBtn: { background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const } as React.CSSProperties,
  badge: { display: 'inline-block', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' } as React.CSSProperties,
}

type Mode = 'register' | 'login'
type Step = 'register' | 'payment' | 'connect'

export default function SellerOnboardingPage() {
  return (
    <Suspense fallback={<div style={css.page}><div style={{ ...css.card, textAlign: 'center' as const, color: 'rgba(255,255,255,0.3)' }}>Loading...</div></div>}>
      <SellerOnboarding />
    </Suspense>
  )
}

function SellerOnboarding() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('register')
  const [step, setStep] = useState<Step>('register')
  const [form, setForm] = useState({ email: '', password: '', business_name: '', contact_name: '', phone: '', coupon_code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [sellerId, setSellerId] = useState<string | null>(null)

  // Handle return from Stripe Checkout (annual fee paid)
  useEffect(() => {
    const feePaid = searchParams.get('fee_paid')
    const returnedSellerId = searchParams.get('seller_id')
    const refresh = searchParams.get('refresh')

    if (feePaid === 'true' && returnedSellerId) {
      setSellerId(returnedSellerId)
      setStep('connect')
      // Auto-trigger Connect onboarding
      triggerConnectOnboarding(returnedSellerId)
    }

    if (refresh === 'true') {
      // Returning from Stripe Connect — check auth and redirect
      fetch('/api/seller/auth')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.id) {
            setSellerId(data.id)
            setStep('connect')
            triggerConnectOnboarding(data.id)
          }
        })
    }
  }, [searchParams])

  async function triggerConnectOnboarding(id: string) {
    setLoading(true)
    const res = await fetch(`/api/seller/onboarding?seller_id=${id}`)
    const data = await res.json()
    setLoading(false)

    if (data.step === 'connect' && data.onboarding_url) {
      window.location.href = data.onboarding_url
    } else if (data.step === 'complete') {
      window.location.href = `/seller/${id}/dashboard`
    } else if (data.step === 'payment') {
      setStep('payment')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/seller/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Registration failed')
      return
    }

    setSellerId(data.seller_id)

    // Redirect to Stripe Checkout for annual fee
    if (data.checkout_url) {
      window.location.href = data.checkout_url
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/seller/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Login failed')
      return
    }

    window.location.href = `/seller/${data.id}/dashboard`
  }

  const displayFee = couponApplied ? EARLY_BIRD_FEE : ANNUAL_FEE

  return (
    <div style={css.page}>
      <div style={css.card}>
        {/* Step indicator */}
        {mode === 'register' && (
          <div style={css.stepRow}>
            <div style={css.step(step === 'register', step !== 'register')}>1. Register</div>
            <div style={css.step(step === 'payment', step === 'connect')}>2. Annual Fee</div>
            <div style={css.step(step === 'connect', false)}>3. Connect Bank</div>
          </div>
        )}

        {/* Return from fee payment — connecting Stripe */}
        {step === 'connect' && (
          <>
            <h1 style={css.title}>Connect Your Bank</h1>
            <div style={css.success}>
              Annual fee paid successfully! Now let's connect your bank account via Stripe so you can receive payouts.
            </div>
            <button
              onClick={() => sellerId && triggerConnectOnboarding(sellerId)}
              disabled={loading}
              style={{ ...css.btn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Redirecting to Stripe...' : 'Set Up Stripe Connect'}
            </button>
          </>
        )}

        {/* Registration / Login form */}
        {step === 'register' && (
          <>
            <h1 style={css.title}>{mode === 'register' ? 'Become a Seller' : 'Seller Login'}</h1>
            <p style={css.subtitle}>
              {mode === 'register'
                ? 'Join the DIRTBIKZ marketplace. List bikes, get paid every 3 days.'
                : 'Sign in to your seller dashboard.'}
            </p>

            {/* Fee disclosure (registration only) */}
            {mode === 'register' && (
              <div style={css.feeBox}>
                <div style={css.feeRow}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Annual Marketplace Fee</span>
                  <span style={css.feeBig}>{displayFee}</span>
                </div>
                {couponApplied && (
                  <div style={{ ...css.feeRow, marginTop: '4px' }}>
                    <span style={{ color: '#22c55e', fontSize: '12px' }}>Early bird discount</span>
                    <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 700 }}>-{EARLY_BIRD_DISCOUNT}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid rgba(255,107,53,0.1)', marginTop: '12px', paddingTop: '10px' }}>
                  <div style={{ ...css.feeRow, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    <span>Commission per sale</span>
                    <span>{COMMISSION}</span>
                  </div>
                  <div style={{ ...css.feeRow, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    <span>Payout frequency</span>
                    <span>Every 3 days</span>
                  </div>
                  <div style={{ ...css.feeRow, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    <span>Minimum payout</span>
                    <span>No minimum</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={mode === 'register' ? handleRegister : handleLogin}>
              {mode === 'register' && (
                <>
                  <label style={css.label}>Business Name *</label>
                  <input style={css.input} required value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="Mike's Moto" />

                  <label style={css.label}>Your Name *</label>
                  <input style={css.input} required value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Mike Johnson" />

                  <label style={css.label}>Phone</label>
                  <input style={css.input} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
                </>
              )}

              <label style={css.label}>Email *</label>
              <input style={css.input} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seller@example.com" />

              <label style={css.label}>Password *</label>
              <input style={css.input} type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />

              {/* Coupon code (registration only) */}
              {mode === 'register' && (
                <>
                  <label style={css.label}>Coupon Code</label>
                  <div style={css.couponRow}>
                    <input
                      style={{ ...css.input, marginTop: 0, flex: 1 }}
                      value={form.coupon_code}
                      onChange={e => {
                        setForm(f => ({ ...f, coupon_code: e.target.value.toUpperCase() }))
                        setCouponApplied(false)
                      }}
                      placeholder="e.g. EARLY6"
                    />
                    <button
                      type="button"
                      style={css.couponBtn}
                      onClick={() => {
                        if (form.coupon_code.toUpperCase() === 'EARLY6') {
                          setCouponApplied(true)
                        } else if (form.coupon_code) {
                          setError('Invalid coupon code')
                          setCouponApplied(false)
                        }
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  {couponApplied && (
                    <div style={{ marginTop: '6px' }}>
                      <span style={css.badge}>Early bird — {EARLY_BIRD_DISCOUNT} off</span>
                    </div>
                  )}
                </>
              )}

              {error && <div style={css.error}>{error}</div>}

              <button type="submit" disabled={loading} style={{ ...css.btn, opacity: loading ? 0.7 : 1 }}>
                {loading
                  ? 'Processing...'
                  : mode === 'register'
                    ? `Register & Pay ${displayFee}`
                    : 'Sign In'}
              </button>
            </form>

            <div style={css.toggle}>
              {mode === 'register' ? (
                <>Already a seller? <button onClick={() => { setMode('login'); setError('') }} style={{ ...css.link, background: 'none', border: 'none', cursor: 'pointer' }}>Sign in</button></>
              ) : (
                <>New seller? <button onClick={() => { setMode('register'); setError('') }} style={{ ...css.link, background: 'none', border: 'none', cursor: 'pointer' }}>Create account</button></>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
