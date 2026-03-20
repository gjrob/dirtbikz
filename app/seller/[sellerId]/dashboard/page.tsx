'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface SellerSession {
  id: string
  email: string
  business_name: string
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  annual_fee_status: string
  status: string
}

interface Product {
  id: string
  name: string
  category: string
  brand?: string
  model?: string
  year?: number
  description?: string
  primary_image_url?: string
  price_cents: number
  in_stock: boolean
  vin?: string
  vin_verified?: boolean
  created_at: string
}

interface Order {
  id: string
  customer_name: string
  customer_email: string
  items: { name: string; price_cents: number; quantity: number }[]
  total_cents: number
  seller_payout_cents: number | null
  platform_fee_cents: number | null
  payment_status: string
  order_status: string
  created_at: string
}

interface Payout {
  id: string
  stripe_payout_id: string
  amount_cents: number
  status: string
  arrival_date: string | null
  created_at: string
}

interface SellerDispute {
  id: string
  stripe_dispute_id: string
  amount_cents: number
  reason: string | null
  status: string
  evidence_due_by: string | null
  resolved_at: string | null
  created_at: string
  orders: { customer_name: string; total_cents: number } | null
}

const CATEGORIES = ['dirt-bike', 'atv', 'side-by-side', 'go-cart', '4-wheeler', 'fold-cart', 'parts', 'other']

function fmt(cents: number) { return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) }

const css = {
  page: { padding: '32px', minHeight: '100vh' } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap' as const, gap: '12px' } as React.CSSProperties,
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#fff' } as React.CSSProperties,
  tabs: { display: 'flex', gap: '4px', marginBottom: '24px' } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: '6px', border: 'none', background: active ? '#ff6b35' : 'rgba(255,255,255,0.06)', color: active ? '#fff' : 'rgba(255,255,255,0.5)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '2px', cursor: 'pointer' }),
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' } as React.CSSProperties,
  statCard: { background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '18px 20px' } as React.CSSProperties,
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#ff6b35', letterSpacing: '1px', lineHeight: 1 } as React.CSSProperties,
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '4px' },
  tableWrap: { background: '#0f0f0f', border: '1px solid rgba(255,107,53,0.12)', borderRadius: '8px', overflow: 'auto' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '600px' } as React.CSSProperties,
  th: { padding: '12px 14px', textAlign: 'left' as const, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'rgba(255,107,53,0.7)', borderBottom: '1px solid rgba(255,107,53,0.1)', background: 'rgba(255,107,53,0.04)' },
  td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff' },
  btnPrimary: { background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '2px', cursor: 'pointer' } as React.CSSProperties,
  btnGhost: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' } as React.CSSProperties,
  btnDanger: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' } as React.CSSProperties,
  badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: color + '22', color }),
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: '#111', border: '1px solid rgba(255,107,53,0.2)', borderTop: '3px solid #ff6b35', borderRadius: '10px', padding: '36px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' as const },
  input: { width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '4px', padding: '9px 12px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' as const, marginTop: '6px', outline: 'none' } as React.CSSProperties,
  label: { display: 'block' as const, fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '14px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' } as React.CSSProperties,
  alert: (color: string): React.CSSProperties => ({ background: color + '15', border: `1px solid ${color}33`, borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color }),
}

const STATUS_COLORS: Record<string, string> = {
  paid: '#22c55e', pending: '#f59e0b', failed: '#ef4444', refunded: '#8b5cf6',
  new: '#3b82f6', confirmed: '#22c55e', shipped: '#f59e0b', delivered: '#22c55e', cancelled: '#ef4444',
  in_transit: '#f59e0b',
}

type Tab = 'overview' | 'products' | 'orders' | 'payouts' | 'analytics' | 'disputes'

interface AnalyticsData {
  revenue: { allTime: number; month: number; week: number; today: number }
  commission: { allTime: number; month: number }
  grossSales: { allTime: number; month: number }
  dailyRevenue: Record<string, number>
  topProducts: { name: string; count: number; revenue: number }[]
  totalOrders: number
  disputeCount: number
}

const BLANK_PRODUCT = { name: '', category: 'dirt-bike', brand: '', model: '', year: undefined as number | undefined, description: '', primary_image_url: '', price_cents: 0, vin: '' }

export default function SellerDashboard() {
  const params = useParams()
  const [session, setSession] = useState<SellerSession | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderSummary, setOrderSummary] = useState({ total_orders: 0, paid_orders: 0, total_revenue_cents: 0, pending_orders: 0 })
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [balance, setBalance] = useState<{ available_cents: number; pending_cents: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...BLANK_PRODUCT })
  const [saving, setSaving] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [sellerDisputes, setSellerDisputes] = useState<SellerDispute[]>([])
  const [disputeSummary, setDisputeSummary] = useState<{ total: number; active: number; won: number; lost: number } | null>(null)
  const [stripeDashboardUrl, setStripeDashboardUrl] = useState<string | null>(null)
  const [orderFilter, setOrderFilter] = useState('all')
  const [orderDateFrom, setOrderDateFrom] = useState('')

  // Auth check
  useEffect(() => {
    fetch('/api/seller/auth')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.id !== params.sellerId) {
          window.location.href = '/seller/onboarding'
        } else {
          setSession(data)
        }
      })
  }, [params.sellerId])

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/seller/products')
    if (res.ok) setProducts(await res.json())
  }, [])

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/seller/orders')
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders || [])
      setOrderSummary(data.summary || {})
    }
  }, [])

  const loadPayouts = useCallback(async () => {
    const res = await fetch('/api/seller/payouts')
    if (res.ok) {
      const data = await res.json()
      setPayouts(data.payouts || [])
      setBalance(data.balance || null)
    }
  }, [])

  const loadAnalytics = useCallback(async () => {
    const res = await fetch('/api/seller/analytics')
    if (res.ok) setAnalytics(await res.json())
  }, [])

  const loadDisputes = useCallback(async () => {
    const res = await fetch('/api/seller/disputes')
    if (res.ok) {
      const data = await res.json()
      setSellerDisputes(data.disputes || [])
      setDisputeSummary(data.summary || null)
      setStripeDashboardUrl(data.stripe_dashboard_url || null)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    Promise.all([loadProducts(), loadOrders(), loadPayouts(), loadAnalytics(), loadDisputes()]).then(() => setLoading(false))
  }, [session, loadProducts, loadOrders, loadPayouts, loadAnalytics, loadDisputes])

  function openAdd() { setEditing(null); setForm({ ...BLANK_PRODUCT }); setShowForm(true) }
  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name: p.name, category: p.category, brand: p.brand || '', model: p.model || '', year: p.year, description: p.description || '', primary_image_url: p.primary_image_url || '', price_cents: p.price_cents, vin: p.vin || '' })
    setShowForm(true)
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      category: form.category,
      brand: form.brand || null,
      model: form.model || null,
      year: form.year || null,
      description: form.description || null,
      primary_image_url: form.primary_image_url || null,
      price_cents: form.price_cents,
      vin: form.vin || null,
    }
    const res = editing
      ? await fetch(`/api/seller/products/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/seller/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setShowForm(false); loadProducts() }
    setSaving(false)
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch(`/api/seller/products/${id}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function logout() {
    await fetch('/api/seller/auth', { method: 'DELETE' })
    window.location.href = '/seller/onboarding'
  }

  if (!session) return <div style={{ ...css.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>

  return (
    <div style={css.page}>
      {/* Header */}
      <div style={css.header}>
        <div>
          <h1 style={css.title}>{session.business_name}</h1>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Seller Dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={css.badge(session.status === 'active' ? '#22c55e' : '#f59e0b')}>{session.status}</span>
          <button onClick={logout} style={css.btnGhost}>Logout</button>
        </div>
      </div>

      {/* Annual fee unpaid alert */}
      {session.annual_fee_status !== 'paid' && (
        <div style={css.alert('#ef4444')}>
          Your annual marketplace fee is unpaid. You must pay the fee before you can list products or receive payouts.
          <button onClick={() => window.location.href = '/seller/onboarding'} style={{ ...css.btnGhost, marginLeft: '12px', color: '#ef4444' }}>
            Pay Annual Fee
          </button>
        </div>
      )}

      {/* Stripe onboarding alert */}
      {session.annual_fee_status === 'paid' && !session.stripe_onboarding_complete && (
        <div style={css.alert('#f59e0b')}>
          Your Stripe account setup is incomplete. You won&apos;t receive payouts until setup is finished.
          <button onClick={() => window.location.href = `/seller/onboarding?fee_paid=true&seller_id=${session.id}`} style={{ ...css.btnGhost, marginLeft: '12px', color: '#f59e0b' }}>
            Complete Setup
          </button>
        </div>
      )}

      {session.status === 'pending' && session.annual_fee_status === 'paid' && session.stripe_onboarding_complete && (
        <div style={css.alert('#3b82f6')}>
          Your seller account is pending approval. You can add products, but they won&apos;t be visible to buyers until approved.
        </div>
      )}

      {/* Tabs */}
      <div style={css.tabs}>
        {(['overview', 'products', 'orders', 'payouts', 'analytics', 'disputes'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={css.tab(tab === t)}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <>
              <div style={css.statsRow}>
                <div style={css.statCard}>
                  <div style={css.statNum}>{products.length}</div>
                  <div style={css.statLabel}>Listings</div>
                </div>
                <div style={css.statCard}>
                  <div style={css.statNum}>{orderSummary.paid_orders}</div>
                  <div style={css.statLabel}>Sales</div>
                </div>
                <div style={css.statCard}>
                  <div style={css.statNum}>{fmt(orderSummary.total_revenue_cents)}</div>
                  <div style={css.statLabel}>Revenue</div>
                </div>
                <div style={css.statCard}>
                  <div style={css.statNum}>{balance ? fmt(balance.available_cents) : '$0'}</div>
                  <div style={css.statLabel}>Available Balance</div>
                </div>
                <div style={css.statCard}>
                  <div style={css.statNum}>{balance ? fmt(balance.pending_cents) : '$0'}</div>
                  <div style={css.statLabel}>Pending Payout</div>
                </div>
                <div style={css.statCard}>
                  <div style={css.statNum}>{orderSummary.pending_orders}</div>
                  <div style={css.statLabel}>Pending Orders</div>
                </div>
              </div>

              {/* Recent orders */}
              <h2 style={{ ...css.title, fontSize: '1.4rem', marginBottom: '14px' }}>Recent Orders</h2>
              <div style={css.tableWrap}>
                <table style={css.table}>
                  <thead>
                    <tr>
                      {['Customer', 'Items', 'Total', 'Your Cut', 'Status', 'Date'].map(h => <th key={h} style={css.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td style={css.td}>{o.customer_name}</td>
                        <td style={css.td}>{o.items?.length || 0} items</td>
                        <td style={css.td}>{fmt(o.total_cents)}</td>
                        <td style={{ ...css.td, color: '#22c55e', fontWeight: 700 }}>{fmt(o.seller_payout_cents || o.total_cents)}</td>
                        <td style={css.td}><span style={css.badge(STATUS_COLORS[o.payment_status] || '#6b7280')}>{o.payment_status}</span></td>
                        <td style={{ ...css.td, color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{fmtDate(o.created_at)}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan={6} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px' }}>No orders yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── PRODUCTS ── */}
          {tab === 'products' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button style={css.btnPrimary} onClick={openAdd}>+ Add Listing</button>
              </div>
              <div style={css.tableWrap}>
                <table style={css.table}>
                  <thead>
                    <tr>
                      {['', 'Product', 'Category', 'Price', 'VIN', 'Status', 'Added', 'Actions'].map(h => <th key={h} style={css.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td style={{ ...css.td, width: '48px' }}>
                          {p.primary_image_url
                            ? <img src={p.primary_image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '4px' }} />
                            : <div style={{ width: 40, height: 40, background: '#222', borderRadius: '4px' }} />}
                        </td>
                        <td style={css.td}>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {(p.brand || p.year) && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{[p.brand, p.year].filter(Boolean).join(' · ')}</div>}
                        </td>
                        <td style={css.td}><span style={css.badge('#ff6b35')}>{p.category}</span></td>
                        <td style={{ ...css.td, color: '#ffb347', fontWeight: 700 }}>{fmt(p.price_cents)}</td>
                        <td style={css.td}>
                          {p.vin ? (
                            <span style={css.badge(p.vin_verified ? '#22c55e' : '#f59e0b')}>
                              {p.vin_verified ? 'Verified' : 'Pending'}
                            </span>
                          ) : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>None</span>}
                        </td>
                        <td style={css.td}>
                          <span style={css.badge(p.in_stock ? '#22c55e' : '#f59e0b')}>
                            {p.in_stock ? 'Live' : 'Pending Review'}
                          </span>
                        </td>
                        <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(p.created_at)}</td>
                        <td style={css.td}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button style={css.btnGhost} onClick={() => openEdit(p)}>Edit</button>
                            <button style={css.btnDanger} onClick={() => deleteProduct(p.id, p.name)}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr><td colSpan={8} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>
                        No listings yet. Click "+ Add Listing" to get started.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && (() => {
            const filtered = orders.filter(o => {
              if (orderFilter !== 'all' && o.payment_status !== orderFilter) return false
              if (orderDateFrom && o.created_at < orderDateFrom) return false
              return true
            })
            return (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {['all', 'paid', 'pending', 'failed', 'refunded'].map(f => (
                    <button key={f} onClick={() => setOrderFilter(f)} style={{ padding: '6px 14px', borderRadius: '4px', border: 'none', background: orderFilter === f ? '#ff6b35' : 'rgba(255,255,255,0.06)', color: orderFilter === f ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', cursor: 'pointer' }}>{f}</button>
                  ))}
                  <input type="date" value={orderDateFrom} onChange={e => setOrderDateFrom(e.target.value)} style={{ ...css.input, width: '160px', marginTop: 0, fontSize: '12px', padding: '6px 10px' }} />
                  {orderDateFrom && <button onClick={() => setOrderDateFrom('')} style={css.btnGhost}>Clear</button>}
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{filtered.length} orders</span>
                </div>
                <div style={css.tableWrap}>
                  <table style={css.table}>
                    <thead>
                      <tr>
                        {['Customer', 'Email', 'Items', 'Total', 'Your Cut', 'Platform Fee', 'Payment', 'Order Status', 'Date'].map(h => <th key={h} style={css.th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(o => (
                        <tr key={o.id}>
                          <td style={css.td}>{o.customer_name}</td>
                          <td style={{ ...css.td, fontSize: '11px' }}>{o.customer_email}</td>
                          <td style={css.td}>{o.items?.length || 0}</td>
                          <td style={css.td}>{fmt(o.total_cents)}</td>
                          <td style={{ ...css.td, color: '#22c55e', fontWeight: 700 }}>{fmt(o.seller_payout_cents || o.total_cents)}</td>
                          <td style={{ ...css.td, color: '#ef4444', fontSize: '11px' }}>{o.platform_fee_cents ? fmt(o.platform_fee_cents) : '—'}</td>
                          <td style={css.td}><span style={css.badge(STATUS_COLORS[o.payment_status] || '#6b7280')}>{o.payment_status}</span></td>
                          <td style={css.td}><span style={css.badge(STATUS_COLORS[o.order_status] || '#6b7280')}>{o.order_status}</span></td>
                          <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(o.created_at)}</td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={9} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>No orders match filters</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}

          {/* ── PAYOUTS ── */}
          {tab === 'payouts' && (
            <>
              {balance && (
                <div style={css.statsRow}>
                  <div style={css.statCard}>
                    <div style={css.statNum}>{fmt(balance.available_cents)}</div>
                    <div style={css.statLabel}>Available for Payout</div>
                  </div>
                  <div style={css.statCard}>
                    <div style={css.statNum}>{fmt(balance.pending_cents)}</div>
                    <div style={css.statLabel}>In Transit</div>
                  </div>
                </div>
              )}
              <div style={css.tableWrap}>
                <table style={css.table}>
                  <thead>
                    <tr>
                      {['Amount', 'Status', 'Arrival Date', 'Created'].map(h => <th key={h} style={css.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => (
                      <tr key={p.id}>
                        <td style={{ ...css.td, color: '#22c55e', fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem' }}>{fmt(p.amount_cents)}</td>
                        <td style={css.td}><span style={css.badge(STATUS_COLORS[p.status] || '#6b7280')}>{p.status}</span></td>
                        <td style={css.td}>{p.arrival_date ? fmtDate(p.arrival_date) : '—'}</td>
                        <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(p.created_at)}</td>
                      </tr>
                    ))}
                    {payouts.length === 0 && (
                      <tr><td colSpan={4} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>
                        Payouts arrive every 3 days once your Stripe account is active. No minimum payout amount.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* ── ANALYTICS ── */}
          {tab === 'analytics' && analytics && (
            <>
              {/* Revenue cards */}
              <div style={css.statsRow}>
                {[
                  { label: 'Your Revenue (All-Time)', value: analytics.revenue.allTime, color: '#22c55e' },
                  { label: 'This Month', value: analytics.revenue.month, color: '#22c55e' },
                  { label: 'Last 7 Days', value: analytics.revenue.week, color: '#22c55e' },
                  { label: 'Today', value: analytics.revenue.today, color: '#22c55e' },
                ].map(s => (
                  <div key={s.label} style={css.statCard}>
                    <div style={{ ...css.statNum, color: s.color }}>{fmt(s.value)}</div>
                    <div style={css.statLabel}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Commission breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <div style={css.statCard}>
                  <div style={{ ...css.statNum, color: '#ffb347' }}>{fmt(analytics.grossSales.allTime)}</div>
                  <div style={css.statLabel}>Gross Sales</div>
                </div>
                <div style={css.statCard}>
                  <div style={{ ...css.statNum, color: '#ef4444' }}>{fmt(analytics.commission.allTime)}</div>
                  <div style={css.statLabel}>Platform Commission (5%)</div>
                </div>
                <div style={css.statCard}>
                  <div style={{ ...css.statNum, color: analytics.disputeCount > 0 ? '#ef4444' : '#22c55e' }}>{analytics.disputeCount}</div>
                  <div style={css.statLabel}>Disputes</div>
                </div>
              </div>

              {/* 30-day revenue trend (bar chart) */}
              <div style={{ ...css.statCard, marginBottom: '28px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px' }}>
                  Revenue — Last 30 Days
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
                  {Object.entries(analytics.dailyRevenue).map(([day, cents]) => {
                    const maxCents = Math.max(...Object.values(analytics.dailyRevenue), 1)
                    const pct = (cents / maxCents) * 100
                    return (
                      <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${day}: ${fmt(cents)}`}>
                        <div style={{ width: '100%', minHeight: '2px', height: `${Math.max(pct, 2)}%`, background: cents > 0 ? '#ff6b35' : 'rgba(255,255,255,0.06)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>30 days ago</span>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>Today</span>
                </div>
              </div>

              {/* Top products */}
              {analytics.topProducts.length > 0 && (
                <div style={css.statCard}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px' }}>
                    Top Products by Revenue
                  </div>
                  {analytics.topProducts.map((p, i) => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < analytics.topProducts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: i === 0 ? '#ff6b35' : 'rgba(255,255,255,0.25)', minWidth: '24px' }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{p.count} sold</div>
                      </div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#22c55e' }}>{fmt(p.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === 'analytics' && !analytics && (
            <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading analytics...</div>
          )}

          {/* ── DISPUTES ── */}
          {tab === 'disputes' && (
            <>
              {/* Summary */}
              {disputeSummary && (
                <div style={css.statsRow}>
                  <div style={css.statCard}>
                    <div style={{ ...css.statNum, color: disputeSummary.active > 0 ? '#ef4444' : '#22c55e' }}>{disputeSummary.total}</div>
                    <div style={css.statLabel}>Total Disputes</div>
                  </div>
                  <div style={css.statCard}>
                    <div style={{ ...css.statNum, color: '#ef4444' }}>{disputeSummary.active}</div>
                    <div style={css.statLabel}>Active</div>
                  </div>
                  <div style={css.statCard}>
                    <div style={{ ...css.statNum, color: '#22c55e' }}>{disputeSummary.won}</div>
                    <div style={css.statLabel}>Won</div>
                  </div>
                  <div style={css.statCard}>
                    <div style={{ ...css.statNum, color: '#ef4444' }}>{disputeSummary.lost}</div>
                    <div style={css.statLabel}>Lost</div>
                  </div>
                </div>
              )}

              {/* Evidence submission link */}
              {stripeDashboardUrl && sellerDisputes.some(d => d.status === 'needs_response') && (
                <div style={css.alert('#f59e0b')}>
                  You have disputes that need a response. Submit evidence via your Stripe dashboard.
                  <a href={stripeDashboardUrl} target="_blank" rel="noopener noreferrer" style={{ ...css.btnGhost, marginLeft: '12px', color: '#f59e0b', textDecoration: 'none', display: 'inline-block' }}>
                    Open Stripe Dashboard
                  </a>
                </div>
              )}

              {/* Auto-suspension warning */}
              {(disputeSummary?.lost || 0) >= 2 && (
                <div style={css.alert('#ef4444')}>
                  Your account may be at risk of suspension. Sellers with 2 or more lost disputes are subject to automatic review.
                </div>
              )}

              <div style={css.tableWrap}>
                <table style={css.table}>
                  <thead>
                    <tr>
                      {['Amount', 'Reason', 'Status', 'Customer', 'Evidence Due', 'Created', 'Resolved', 'Action'].map(h => <th key={h} style={css.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {sellerDisputes.map(d => (
                      <tr key={d.id} style={d.status === 'needs_response' ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                        <td style={{ ...css.td, color: '#ef4444', fontWeight: 700 }}>{fmt(d.amount_cents)}</td>
                        <td style={css.td}>
                          <span style={css.badge(d.reason === 'fraudulent' ? '#ef4444' : '#f59e0b')}>
                            {(d.reason || 'unknown').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={css.td}>
                          <span style={css.badge(
                            d.status === 'won' ? '#22c55e' : d.status === 'lost' ? '#ef4444' : d.status === 'needs_response' ? '#ef4444' : '#f59e0b'
                          )}>
                            {d.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...css.td, fontSize: '12px' }}>{d.orders?.customer_name || '—'}</td>
                        <td style={css.td}>
                          {d.evidence_due_by ? (
                            <span style={{ fontSize: '12px', color: new Date(d.evidence_due_by) < new Date() ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                              {fmtDate(d.evidence_due_by)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(d.created_at)}</td>
                        <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{d.resolved_at ? fmtDate(d.resolved_at) : '—'}</td>
                        <td style={css.td}>
                          {d.status === 'needs_response' && stripeDashboardUrl && (
                            <a href={stripeDashboardUrl} target="_blank" rel="noopener noreferrer" style={{ ...css.btnGhost, color: '#f59e0b', textDecoration: 'none', display: 'inline-block' }}>
                              Submit Evidence
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sellerDisputes.length === 0 && (
                      <tr><td colSpan={8} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>
                        No disputes. Keep up the good work!
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Add/Edit Product Modal ── */}
      {showForm && (
        <div style={css.overlay} onClick={() => setShowForm(false)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '3px', color: '#ff6b35', marginBottom: '20px' }}>
              {editing ? 'Edit Listing' : 'New Listing'}
            </h2>
            <form onSubmit={saveProduct}>
              <label style={css.label}>Name *</label>
              <input style={css.input} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="2023 Honda CRF250R" />

              <div style={{ ...css.formRow, marginTop: '14px' }}>
                <div>
                  <label style={css.label}>Category *</label>
                  <select style={css.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={css.label}>Price (USD) *</label>
                  <input style={css.input} type="number" step="0.01" required value={form.price_cents ? (form.price_cents / 100).toFixed(2) : ''} onChange={e => setForm(f => ({ ...f, price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0 }))} placeholder="6999.00" />
                </div>
              </div>

              <div style={css.formRow}>
                <div>
                  <label style={css.label}>Brand</label>
                  <input style={css.input} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Honda" />
                </div>
                <div>
                  <label style={css.label}>Model</label>
                  <input style={css.input} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="CRF250R" />
                </div>
              </div>

              <div style={css.formRow}>
                <div>
                  <label style={css.label}>Year</label>
                  <input style={css.input} type="number" value={form.year || ''} onChange={e => setForm(f => ({ ...f, year: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="2023" />
                </div>
                <div>
                  <label style={css.label}>VIN (17 chars)</label>
                  <input style={css.input} maxLength={17} value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value.toUpperCase() }))} placeholder="KMHLN4AJ5CU123456" />
                </div>
              </div>

              <label style={css.label}>Image URL</label>
              <input style={css.input} value={form.primary_image_url} onChange={e => setForm(f => ({ ...f, primary_image_url: e.target.value }))} placeholder="https://..." />

              <label style={css.label}>Description</label>
              <textarea style={{ ...css.input, height: '80px', resize: 'vertical' as const }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Condition, hours, extras..." />

              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>
                New listings require admin approval before going live. VINs are verified automatically.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, ...css.btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Submit Listing'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, ...css.btnGhost, padding: '9px 18px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
