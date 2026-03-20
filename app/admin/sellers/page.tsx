'use client'

import { useEffect, useState, useCallback } from 'react'

interface Seller {
  id: string
  email: string
  business_name: string
  contact_name: string
  phone: string | null
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  stripe_payouts_enabled: boolean
  annual_fee_status: string
  annual_fee_amount_cents: number
  coupon_code: string | null
  status: string
  total_sales_cents: number
  total_orders: number
  rating: number
  dispute_count: number
  active_disputes: number
  vin_flag_count: number
  risk_score: number
  risk_level: string
  created_at: string
  approved_at: string | null
  suspended_at: string | null
  suspension_reason: string | null
}

function fmt(cents: number) { return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) }

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', active: '#22c55e', suspended: '#ef4444', rejected: '#6b7280',
}
const RISK_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444',
}
const FEE_COLORS: Record<string, string> = {
  paid: '#22c55e', unpaid: '#ef4444', past_due: '#f59e0b', cancelled: '#6b7280',
}

const css = {
  page: { padding: '32px', minHeight: '100vh' } as React.CSSProperties,
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#fff', marginBottom: '24px' } as React.CSSProperties,
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } as React.CSSProperties,
  statCard: { background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '14px 18px' } as React.CSSProperties,
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: '#ff6b35', lineHeight: 1 } as React.CSSProperties,
  statLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '4px' },
  filterRow: { display: 'flex', gap: '8px', marginBottom: '16px' } as React.CSSProperties,
  filterBtn: (active: boolean): React.CSSProperties => ({ padding: '6px 14px', borderRadius: '4px', border: 'none', background: active ? '#ff6b35' : 'rgba(255,255,255,0.06)', color: active ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', cursor: 'pointer' }),
  tableWrap: { background: '#0f0f0f', border: '1px solid rgba(255,107,53,0.12)', borderRadius: '8px', overflow: 'auto' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '1100px' } as React.CSSProperties,
  th: { padding: '12px 14px', textAlign: 'left' as const, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'rgba(255,107,53,0.7)', borderBottom: '1px solid rgba(255,107,53,0.1)', background: 'rgba(255,107,53,0.04)', whiteSpace: 'nowrap' as const },
  td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff' },
  badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: color + '22', color }),
  btnGhost: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' } as React.CSSProperties,
}

export default function AdminSellers() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const url = filter === 'all' ? '/api/admin/sellers' : `/api/admin/sellers?status=${filter}`
    const res = await fetch(url)
    if (res.ok) setSellers(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string, reason?: string) {
    setActionId(id)
    await fetch(`/api/admin/sellers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, suspension_reason: reason }),
    })
    await load()
    setActionId(null)
  }

  const stats = {
    total: sellers.length,
    active: sellers.filter(s => s.status === 'active').length,
    pending: sellers.filter(s => s.status === 'pending').length,
    suspended: sellers.filter(s => s.status === 'suspended').length,
    highRisk: sellers.filter(s => s.risk_level === 'high').length,
    totalRevenue: sellers.reduce((s, sel) => s + sel.total_sales_cents, 0),
  }

  return (
    <div style={css.page}>
      <h1 style={css.title}>Seller Management</h1>

      <div style={css.statsRow}>
        <div style={css.statCard}><div style={css.statNum}>{stats.total}</div><div style={css.statLabel}>Total Sellers</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#22c55e' }}>{stats.active}</div><div style={css.statLabel}>Active</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#f59e0b' }}>{stats.pending}</div><div style={css.statLabel}>Pending</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{stats.suspended}</div><div style={css.statLabel}>Suspended</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{stats.highRisk}</div><div style={css.statLabel}>High Risk</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#22c55e' }}>{fmt(stats.totalRevenue)}</div><div style={css.statLabel}>Total Revenue</div></div>
      </div>

      <div style={css.filterRow}>
        {['all', 'pending', 'active', 'suspended', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={css.filterBtn(filter === f)}>{f}</button>
        ))}
      </div>

      <div style={css.tableWrap}>
        <table style={css.table}>
          <thead>
            <tr>
              {['Business', 'Contact', 'Status', 'Annual Fee', 'Stripe', 'Sales', 'Orders', 'Risk', 'Disputes', 'VIN Flags', 'Joined', 'Actions'].map(h => (
                <th key={h} style={css.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>Loading...</td></tr>
            ) : sellers.map(s => (
              <tr key={s.id} style={s.risk_level === 'high' ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                <td style={css.td}>
                  <div style={{ fontWeight: 600 }}>{s.business_name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{s.email}</div>
                </td>
                <td style={{ ...css.td, fontSize: '12px' }}>
                  {s.contact_name}
                  {s.phone && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{s.phone}</div>}
                </td>
                <td style={css.td}><span style={css.badge(STATUS_COLORS[s.status] || '#6b7280')}>{s.status}</span></td>
                <td style={css.td}>
                  <span style={css.badge(FEE_COLORS[s.annual_fee_status] || '#6b7280')}>{s.annual_fee_status}</span>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                    {fmt(s.annual_fee_amount_cents)}{s.coupon_code ? ` (${s.coupon_code})` : ''}
                  </div>
                </td>
                <td style={css.td}>
                  <span style={css.badge(s.stripe_onboarding_complete ? '#22c55e' : '#f59e0b')}>
                    {s.stripe_onboarding_complete ? 'Connected' : 'Incomplete'}
                  </span>
                </td>
                <td style={{ ...css.td, color: '#22c55e', fontWeight: 700 }}>{fmt(s.total_sales_cents)}</td>
                <td style={css.td}>{s.total_orders}</td>
                <td style={css.td}>
                  <span style={css.badge(RISK_COLORS[s.risk_level] || '#6b7280')}>
                    {s.risk_level} ({s.risk_score})
                  </span>
                </td>
                <td style={css.td}>
                  {s.dispute_count > 0 ? (
                    <span style={css.badge('#ef4444')}>{s.dispute_count} ({s.active_disputes} active)</span>
                  ) : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>None</span>}
                </td>
                <td style={css.td}>
                  {s.vin_flag_count > 0 ? (
                    <span style={css.badge('#f59e0b')}>{s.vin_flag_count}</span>
                  ) : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>0</span>}
                </td>
                <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(s.created_at)}</td>
                <td style={css.td}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {s.status === 'pending' && (
                      <button onClick={() => updateStatus(s.id, 'active')} disabled={actionId === s.id} style={{ ...css.btnGhost, color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}>
                        Approve
                      </button>
                    )}
                    {s.status !== 'suspended' && s.status !== 'rejected' && (
                      <button onClick={() => {
                        const reason = prompt('Suspension reason:')
                        if (reason !== null) updateStatus(s.id, 'suspended', reason)
                      }} disabled={actionId === s.id} style={{ ...css.btnGhost, color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                        Suspend
                      </button>
                    )}
                    {s.status === 'suspended' && (
                      <button onClick={() => updateStatus(s.id, 'active')} disabled={actionId === s.id} style={{ ...css.btnGhost, color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}>
                        Reactivate
                      </button>
                    )}
                  </div>
                  {s.suspension_reason && (
                    <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>Reason: {s.suspension_reason}</div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && sellers.length === 0 && (
              <tr><td colSpan={12} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>No sellers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
