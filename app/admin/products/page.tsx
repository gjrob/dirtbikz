'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const QRModal = dynamic(() => import('../components/QRModal'), { ssr: false })

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
  original_price_cents?: number
  location?: string
  in_stock: boolean
  featured: boolean
  created_at: string
}

const BLANK: Omit<Product, 'id' | 'created_at'> = {
  name: '', category: 'dirt-bike', brand: '', model: '', year: undefined,
  description: '', primary_image_url: '',
  price_cents: 0, original_price_cents: undefined,
  location: 'NC', in_stock: true, featured: false,
}

const CATEGORIES = ['dirt-bike','atv','side-by-side','go-cart','4-wheeler','fold-cart','parts','other']
const STATUS_COLOR: Record<string, string> = { true: '#22c55e', false: '#6b7280' }

function fmt(cents: number) { return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) }

// ── Styles ────────────────────────────────────────────────────────────────────
const css = {
  page:   { padding: '32px', minHeight: '100vh' } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' } as React.CSSProperties,
  title:  { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#fff' } as React.CSSProperties,
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' } as React.CSSProperties,
  statCard: { background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '18px 20px' } as React.CSSProperties,
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#ff6b35', letterSpacing: '1px', lineHeight: 1 } as React.CSSProperties,
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '4px' },
  tableWrap: { background: '#0f0f0f', border: '1px solid rgba(255,107,53,0.12)', borderRadius: '8px', overflow: 'hidden' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '12px 14px', textAlign: 'left' as const, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'rgba(255,107,53,0.7)', borderBottom: '1px solid rgba(255,107,53,0.1)', background: 'rgba(255,107,53,0.04)' },
  td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' as const, color: '#fff' },
  btnPrimary: { background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '2px', cursor: 'pointer' } as React.CSSProperties,
  btnGhost:  { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' } as React.CSSProperties,
  btnDanger: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' } as React.CSSProperties,
  badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: color + '22', color }),
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: '#111', border: '1px solid rgba(255,107,53,0.2)', borderTop: '3px solid #ff6b35', borderRadius: '10px', padding: '36px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' as const },
  input: { width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '4px', padding: '9px 12px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' as const, marginTop: '6px', outline: 'none' } as React.CSSProperties,
  label: { display: 'block' as const, fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '14px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' } as React.CSSProperties,
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [qrProduct, setQrProduct] = useState<Product | null>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dirtbikz.com'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/products')
    if (res.ok) setProducts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setForm({ ...BLANK }); setShowForm(true) }
  function openEdit(p: Product) { setEditing(p); setForm({ name: p.name, category: p.category, brand: p.brand || '', model: p.model || '', year: p.year, description: p.description || '', primary_image_url: p.primary_image_url || '', price_cents: p.price_cents, original_price_cents: p.original_price_cents, location: p.location || 'NC', in_stock: p.in_stock, featured: p.featured }); setShowForm(true) }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      brand: form.brand || null,
      model: form.model || null,
      year: form.year || null,
      description: form.description || null,
      primary_image_url: form.primary_image_url || null,
      original_price_cents: form.original_price_cents || null,
      location: form.location || null,
    }
    const res = editing
      ? await fetch(`/api/admin/products/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setShowForm(false); load() }
    setSaving(false)
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function quickToggle(id: string, field: 'in_stock' | 'featured', current: boolean) {
    await fetch(`/api/admin/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: !current }) })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: !current } : p))
  }

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={css.page}>
      <div style={css.header}>
        <h1 style={css.title}>Products</h1>
        <button style={css.btnPrimary} onClick={openAdd}>+ Add Product</button>
      </div>

      {/* QR Modal */}
      {qrProduct && (
        <QRModal
          product={qrProduct}
          baseUrl={baseUrl}
          onClose={() => setQrProduct(null)}
        />
      )}

      {/* Stats */}
      <div style={css.statsRow}>
        {[
          { num: products.length,                           label: 'Total' },
          { num: products.filter(p => p.in_stock).length,  label: 'In Stock' },
          { num: products.filter(p => !p.in_stock).length, label: 'Out of Stock' },
          { num: products.filter(p => p.featured).length,  label: 'Featured' },
        ].map(s => (
          <div key={s.label} style={css.statCard}>
            <div style={css.statNum}>{s.num}</div>
            <div style={css.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        placeholder="Search by name or brand..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...css.input, marginTop: 0, marginBottom: '16px', maxWidth: '320px' }}
      />

      {/* Table */}
      <div style={css.tableWrap}>
        <table style={css.table}>
          <thead>
            <tr>
              {['', 'Product', 'Category', 'Price', 'Loc', 'Stock', 'Featured', 'Added', 'Actions'].map(h => (
                <th key={h} style={css.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>Loading...</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} style={{ transition: 'background 0.15s' }}>
                <td style={{ ...css.td, width: '52px' }}>
                  {p.primary_image_url ? (
                    <img src={p.primary_image_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '4px', background: '#222' }} />
                  ) : <div style={{ width: 44, height: 44, background: '#222', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🏍️</div>}
                </td>
                <td style={css.td}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                  {(p.brand || p.year) && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{[p.brand, p.year].filter(Boolean).join(' · ')}</div>}
                </td>
                <td style={css.td}><span style={css.badge('#ff6b35')}>{p.category}</span></td>
                <td style={{ ...css.td, color: '#ffb347', fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '1px' }}>
                  {fmt(p.price_cents)}
                  {p.original_price_cents && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontFamily: 'Inter, sans-serif' }}>{fmt(p.original_price_cents)}</div>}
                </td>
                <td style={css.td}>{p.location || '—'}</td>
                <td style={css.td}>
                  <button style={{ ...css.btnGhost, background: p.in_stock ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)', color: p.in_stock ? '#22c55e' : '#6b7280' }} onClick={() => quickToggle(p.id, 'in_stock', p.in_stock)}>
                    {p.in_stock ? '✓ In Stock' : '✗ Out'}
                  </button>
                </td>
                <td style={css.td}>
                  <button style={{ ...css.btnGhost, background: p.featured ? 'rgba(255,179,71,0.1)' : 'rgba(255,255,255,0.06)', color: p.featured ? '#ffb347' : '#6b7280' }} onClick={() => quickToggle(p.id, 'featured', p.featured)}>
                    {p.featured ? '★ Yes' : '☆ No'}
                  </button>
                </td>
                <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(p.created_at)}</td>
                <td style={css.td}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={css.btnGhost} onClick={() => openEdit(p)}>Edit</button>
                    <button style={{ ...css.btnGhost, color: '#ffb347' }} onClick={() => setQrProduct(p)} title="Generate QR Code">QR</button>
                    <button style={css.btnDanger} onClick={() => deleteProduct(p.id, p.name)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div style={css.overlay} onClick={() => setShowForm(false)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '3px', color: '#ff6b35', marginBottom: '20px' }}>
              {editing ? 'Edit Product' : 'Add Product'}
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
                  <label style={css.label}>Location</label>
                  <select style={css.input} value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                    <option value="NC">NC</option>
                    <option value="SC">SC</option>
                    <option value="GA">GA</option>
                  </select>
                </div>
              </div>

              <div style={css.formRow}>
                <div>
                  <label style={css.label}>Brand</label>
                  <input style={css.input} value={form.brand || ''} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Honda" />
                </div>
                <div>
                  <label style={css.label}>Model</label>
                  <input style={css.input} value={form.model || ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="CRF250R" />
                </div>
              </div>

              <div style={css.formRow}>
                <div>
                  <label style={css.label}>Year</label>
                  <input style={css.input} type="number" value={form.year || ''} onChange={e => setForm(f => ({ ...f, year: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="2023" />
                </div>
                <div>
                  <label style={css.label}>Price (USD) *</label>
                  <input style={css.input} type="number" step="0.01" required value={form.price_cents ? (form.price_cents / 100).toFixed(2) : ''} onChange={e => setForm(f => ({ ...f, price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0 }))} placeholder="6999.00" />
                </div>
              </div>

              <div style={css.formRow}>
                <div>
                  <label style={css.label}>Original Price (USD)</label>
                  <input style={css.input} type="number" step="0.01" value={form.original_price_cents ? (form.original_price_cents / 100).toFixed(2) : ''} onChange={e => setForm(f => ({ ...f, original_price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined }))} placeholder="(optional)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    <input type="checkbox" checked={form.in_stock} onChange={e => setForm(f => ({ ...f, in_stock: e.target.checked }))} />
                    In Stock
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                    Featured
                  </label>
                </div>
              </div>

              <label style={css.label}>Image URL</label>
              <input style={css.input} value={form.primary_image_url || ''} onChange={e => setForm(f => ({ ...f, primary_image_url: e.target.value }))} placeholder="https://..." />
              {form.primary_image_url && (
                <img src={form.primary_image_url} alt="" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px', marginTop: '8px', background: '#222' }} />
              )}

              <label style={css.label}>Description</label>
              <textarea style={{ ...css.input, height: '80px', resize: 'vertical' as const, marginTop: '6px' }} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Condition, hours, extras..." />

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, ...css.btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Product'}
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
