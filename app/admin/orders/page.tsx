'use client'

import { useEffect, useState, useCallback } from 'react'

interface OrderItem { name: string; price_cents: number; quantity: number }

interface Order {
  id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  items: OrderItem[]
  total_cents: number
  payment_status: string
  order_status: string
  created_at: string
}

const PAYMENT_TABS = ['all', 'pending', 'paid', 'failed', 'refunded']
const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled']

const PAYMENT_COLORS: Record<string, string> = {
  paid: '#22c55e', pending: '#f59e0b', failed: '#ef4444', refunded: '#6b7280',
}
const ORDER_COLORS: Record<string, string> = {
  new: '#3b82f6', confirmed: '#22c55e', shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444',
}

function fmt(cents: number) { return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' }) }

const css = {
  page:  { padding: '32px', minHeight: '100vh' } as React.CSSProperties,
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#fff', marginBottom: '24px' } as React.CSSProperties,
  tabs:  { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: '7px 18px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '13px',
    background: active ? '#ff6b35' : 'rgba(255,255,255,0.07)',
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    textTransform: 'capitalize' as const, letterSpacing: '0.5px',
  }),
  tableWrap: { background: '#0f0f0f', border: '1px solid rgba(255,107,53,0.12)', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' as const } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '900px' } as React.CSSProperties,
  th: { padding: '11px 14px', textAlign: 'left' as const, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'rgba(255,107,53,0.7)', borderBottom: '1px solid rgba(255,107,53,0.1)', background: 'rgba(255,107,53,0.04)', whiteSpace: 'nowrap' as const },
  td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' as const, color: '#fff' },
  badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 9px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: color + '22', color }),
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

  const load = useCallback(async (status: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/orders?status=${status}`)
    if (res.ok) setOrders(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  async function updateOrderStatus(id: string, field: 'order_status', value: string) {
    await fetch(`/api/admin/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o))
  }

  // Per-tab counts (approximate from current data)
  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total_cents, 0)

  return (
    <div style={css.page}>
      <h1 style={css.title}>Orders</h1>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { num: orders.length, label: tab === 'all' ? 'Total Orders' : `${tab} Orders` },
          { num: orders.filter(o => o.payment_status === 'paid').length, label: 'Paid' },
          { num: fmt(totalRevenue), label: 'Revenue Shown' },
        ].map(s => (
          <div key={s.label} style={{ background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '16px 20px' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: '#ff6b35', letterSpacing: '1px', lineHeight: 1 }}>{s.num}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={css.tabs}>
        {PAYMENT_TABS.map(t => (
          <button key={t} style={css.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={css.tableWrap}>
        <table style={css.table}>
          <thead>
            <tr>
              {['Customer', 'Items', 'Total', 'Payment', 'Order Status', 'Date', 'Actions'].map(h => (
                <th key={h} style={css.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>Loading...</td></tr>
            ) : orders.map(order => (
              <tr key={order.id}>
                <td style={css.td}>
                  <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{order.customer_email}</div>
                  {order.customer_phone && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{order.customer_phone}</div>}
                </td>
                <td style={css.td}>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                </td>
                <td style={{ ...css.td, color: '#ffb347', fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                  {fmt(order.total_cents)}
                </td>
                <td style={css.td}>
                  <span style={css.badge(PAYMENT_COLORS[order.payment_status] || '#888')}>
                    {order.payment_status}
                  </span>
                </td>
                <td style={css.td}>
                  <select
                    value={order.order_status}
                    onChange={e => updateOrderStatus(order.id, 'order_status', e.target.value)}
                    style={{ background: '#0a0a0a', border: `1px solid ${ORDER_COLORS[order.order_status] || '#444'}44`, color: ORDER_COLORS[order.order_status] || '#fff', borderRadius: '4px', padding: '5px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{fmtDate(order.created_at)}</td>
                <td style={css.td}>
                  <a
                    href={`mailto:${order.customer_email}?subject=Your DIRTBIKZ Order`}
                    style={{ background: 'rgba(255,107,53,0.1)', color: '#ff6b35', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '4px', padding: '5px 10px', fontSize: '12px', textDecoration: 'none', display: 'inline-block' }}
                  >
                    Email
                  </a>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={7} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
