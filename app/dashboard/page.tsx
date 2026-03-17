'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

interface Product {
  id: string
  name: string
  category: string
  brand?: string
  year?: number
  price_cents: number
  location?: string
  in_stock: boolean
  featured: boolean
  created_at: string
}

interface Order {
  id: string
  customer_name: string
  customer_email: string
  total_cents: number
  payment_status: string
  order_status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  paid: '#22c55e',
  pending: '#f59e0b',
  failed: '#ef4444',
  refunded: '#6b7280',
  new: '#3b82f6',
  confirmed: '#22c55e',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
}

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<'products' | 'orders'>('products')
  const [loading, setLoading] = useState(true)

  // Add product form
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '', category: 'dirt-bike', brand: '', year: '', price: '',
    location: 'NC', description: '', primary_image_url: '',
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: prods }, { data: ords }] = await Promise.all([
        supabase.from('products').select('*').eq('client_slug', 'dirtbikz').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('client_slug', 'dirtbikz').order('created_at', { ascending: false }),
      ])
      if (prods) setProducts(prods)
      if (ords) setOrders(ords)
      setLoading(false)
    }
    load()
  }, [])

  async function toggleStock(id: string, current: boolean) {
    await supabase.from('products').update({ in_stock: !current }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, in_stock: !current } : p))
  }

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from('products').update({ featured: !current }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, featured: !current } : p))
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase.from('products').insert({
      client_slug: 'dirtbikz',
      name: newProduct.name,
      category: newProduct.category,
      brand: newProduct.brand || null,
      year: newProduct.year ? parseInt(newProduct.year) : null,
      price_cents: Math.round(parseFloat(newProduct.price) * 100),
      location: newProduct.location || null,
      description: newProduct.description || null,
      primary_image_url: newProduct.primary_image_url || null,
      in_stock: true,
      featured: false,
    }).select().single()
    if (data) setProducts(prev => [data, ...prev])
    setShowAdd(false)
    setNewProduct({ name: '', category: 'dirt-bike', brand: '', year: '', price: '', location: 'NC', description: '', primary_image_url: '' })
    setSaving(false)
  }

  async function updateOrderStatus(id: string, field: 'payment_status' | 'order_status', value: string) {
    await supabase.from('orders').update({ [field]: value }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o))
  }

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  // Stats
  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total_cents, 0)
  const inStockCount = products.filter(p => p.in_stock).length
  const paidOrders = orders.filter(o => o.payment_status === 'paid').length

  const S = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' } as React.CSSProperties,
    header: { background: '#111', borderBottom: '1px solid rgba(255,107,53,0.2)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
    logo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: '#ff6b35', letterSpacing: '2px' } as React.CSSProperties,
    body: { maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' } as React.CSSProperties,
    stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' } as React.CSSProperties,
    statCard: { background: '#1a1a1a', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '20px' } as React.CSSProperties,
    statNum: { fontSize: '28px', fontWeight: 700, color: '#ff6b35', display: 'block', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' } as React.CSSProperties,
    statLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '1px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '24px' } as React.CSSProperties,
    tab: (active: boolean): React.CSSProperties => ({
      padding: '8px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer',
      background: active ? '#ff6b35' : '#1a1a1a',
      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
      fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '1px',
    }),
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { textAlign: 'left' as const, padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
    td: { padding: '12px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle' as const },
    badge: (color: string): React.CSSProperties => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const,
      background: color + '22', color, letterSpacing: '0.5px',
    }),
    btn: (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
      padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px',
      background: variant === 'primary' ? '#ff6b35' : variant === 'danger' ? '#ef444422' : 'rgba(255,255,255,0.08)',
      color: variant === 'danger' ? '#ef4444' : '#fff',
    }),
    addBtn: { background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '1px' } as React.CSSProperties,
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalInner: { background: '#1a1a1a', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '8px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' as const },
    input: { width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '4px', padding: '8px 10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' as const, marginTop: '4px' },
    label: { display: 'block' as const, fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginTop: '12px' },
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <span style={S.logo}>DIRTBIKZ Admin</span>
        <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
          Logout
        </button>
      </header>

      <div style={S.body}>
        {/* Stats */}
        <div style={S.stats}>
          <div style={S.statCard}>
            <span style={S.statNum}>{products.length}</span>
            <span style={S.statLabel}>Total Products</span>
          </div>
          <div style={S.statCard}>
            <span style={S.statNum}>{inStockCount}</span>
            <span style={S.statLabel}>In Stock</span>
          </div>
          <div style={S.statCard}>
            <span style={S.statNum}>{orders.length}</span>
            <span style={S.statLabel}>Total Orders</span>
          </div>
          <div style={S.statCard}>
            <span style={S.statNum}>{paidOrders}</span>
            <span style={S.statLabel}>Paid Orders</span>
          </div>
          <div style={S.statCard}>
            <span style={S.statNum}>{fmt(totalRevenue)}</span>
            <span style={S.statLabel}>Revenue</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          <button style={S.tab(tab === 'products')} onClick={() => setTab('products')}>Products</button>
          <button style={S.tab(tab === 'orders')} onClick={() => setTab('orders')}>Orders</button>
        </div>

        {/* Products tab */}
        {tab === 'products' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button style={S.addBtn} onClick={() => setShowAdd(true)}>+ Add Product</button>
            </div>
            {loading ? (
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Name</th>
                      <th style={S.th}>Category</th>
                      <th style={S.th}>Price</th>
                      <th style={S.th}>Loc</th>
                      <th style={S.th}>Stock</th>
                      <th style={S.th}>Featured</th>
                      <th style={S.th}>Added</th>
                      <th style={S.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          {p.brand && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{p.brand}{p.year ? ` · ${p.year}` : ''}</div>}
                        </td>
                        <td style={S.td}><span style={S.badge('#ff6b35')}>{p.category}</span></td>
                        <td style={{ ...S.td, color: '#ff6b35', fontWeight: 600 }}>{fmt(p.price_cents)}</td>
                        <td style={S.td}>{p.location || '—'}</td>
                        <td style={S.td}>
                          <button style={S.btn(p.in_stock ? 'primary' : 'ghost')} onClick={() => toggleStock(p.id, p.in_stock)}>
                            {p.in_stock ? 'In Stock' : 'Out'}
                          </button>
                        </td>
                        <td style={S.td}>
                          <button style={S.btn(p.featured ? 'primary' : 'ghost')} onClick={() => toggleFeatured(p.id, p.featured)}>
                            {p.featured ? '★ Yes' : '☆ No'}
                          </button>
                        </td>
                        <td style={{ ...S.td, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{fmtDate(p.created_at)}</td>
                        <td style={S.td}>
                          <button style={S.btn('danger')} onClick={() => deleteProduct(p.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>No products yet.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          loading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Customer</th>
                    <th style={S.th}>Total</th>
                    <th style={S.th}>Payment</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{o.customer_email}</div>
                      </td>
                      <td style={{ ...S.td, color: '#ff6b35', fontWeight: 600 }}>{fmt(o.total_cents)}</td>
                      <td style={S.td}>
                        <span style={S.badge(STATUS_COLORS[o.payment_status] || '#888')}>{o.payment_status}</span>
                      </td>
                      <td style={S.td}>
                        <select
                          value={o.order_status}
                          onChange={e => updateOrderStatus(o.id, 'order_status', e.target.value)}
                          style={{ background: '#0a0a0a', border: '1px solid rgba(255,107,53,0.3)', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
                        >
                          {['new', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...S.td, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{fmtDate(o.created_at)}</td>
                      <td style={S.td}>
                        <a
                          href={`mailto:${o.customer_email}`}
                          style={{ ...S.btn('ghost'), textDecoration: 'none', display: 'inline-block' }}
                        >
                          Email
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>No orders yet.</p>
              )}
            </div>
          )
        )}
      </div>

      {/* Add Product Modal */}
      {showAdd && (
        <div style={S.modal} onClick={() => setShowAdd(false)}>
          <div style={S.modalInner} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#ff6b35', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '2px', marginBottom: '20px' }}>
              Add Product
            </h2>
            <form onSubmit={addProduct}>
              <label style={S.label}>Name *</label>
              <input style={S.input} required value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="2023 Honda CRF250R" />

              <label style={S.label}>Category *</label>
              <select style={S.input} value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}>
                {['dirt-bike', 'atv', 'side-by-side', 'go-cart', '4-wheeler', 'fold-cart', 'parts', 'other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <label style={S.label}>Brand</label>
              <input style={S.input} value={newProduct.brand} onChange={e => setNewProduct(p => ({ ...p, brand: e.target.value }))} placeholder="Honda" />

              <label style={S.label}>Year</label>
              <input style={S.input} type="number" value={newProduct.year} onChange={e => setNewProduct(p => ({ ...p, year: e.target.value }))} placeholder="2023" />

              <label style={S.label}>Price (USD) *</label>
              <input style={S.input} type="number" step="0.01" required value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="6999.00" />

              <label style={S.label}>Location</label>
              <select style={S.input} value={newProduct.location} onChange={e => setNewProduct(p => ({ ...p, location: e.target.value }))}>
                <option value="NC">NC</option>
                <option value="SC">SC</option>
                <option value="GA">GA</option>
              </select>

              <label style={S.label}>Description</label>
              <textarea style={{ ...S.input, height: '80px', resize: 'vertical' }} value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Condition, hours, extras..." />

              <label style={S.label}>Image URL</label>
              <input style={S.input} value={newProduct.primary_image_url} onChange={e => setNewProduct(p => ({ ...p, primary_image_url: e.target.value }))} placeholder="https://..." />

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, ...S.addBtn }}>
                  {saving ? 'Saving...' : 'Add Product'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
