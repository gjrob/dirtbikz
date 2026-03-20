'use client'

import { useEffect, useState, useCallback } from 'react'

interface Dispute {
  id: string
  seller_id: string
  order_id: string | null
  stripe_dispute_id: string
  stripe_charge_id: string | null
  amount_cents: number
  reason: string | null
  status: string
  evidence_due_by: string | null
  resolved_at: string | null
  created_at: string
  sellers: { business_name: string; email: string; stripe_account_id: string } | null
  orders: { customer_name: string; customer_email: string; total_cents: number } | null
}

interface Summary {
  total: number
  needs_response: number
  under_review: number
  won: number
  lost: number
  total_amount_cents: number
  lost_amount_cents: number
}

function fmt(cents: number) { return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }

const STATUS_COLORS: Record<string, string> = {
  needs_response: '#ef4444',
  under_review: '#f59e0b',
  won: '#22c55e',
  lost: '#ef4444',
  warning_needs_response: '#f59e0b',
  warning_under_review: '#f59e0b',
  warning_closed: '#6b7280',
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
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '1000px' } as React.CSSProperties,
  th: { padding: '12px 14px', textAlign: 'left' as const, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'rgba(255,107,53,0.7)', borderBottom: '1px solid rgba(255,107,53,0.1)', background: 'rgba(255,107,53,0.04)', whiteSpace: 'nowrap' as const },
  td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff' },
  badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: color + '22', color }),
  urgent: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#ef4444' } as React.CSSProperties,
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const url = filter === 'all' ? '/api/admin/disputes' : `/api/admin/disputes?status=${filter}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setDisputes(data.disputes || [])
      setSummary(data.summary || null)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const urgentDisputes = disputes.filter(d => d.status === 'needs_response' && d.evidence_due_by)

  return (
    <div style={css.page}>
      <h1 style={css.title}>Disputes & Chargebacks</h1>

      {/* Urgent alert */}
      {urgentDisputes.length > 0 && (
        <div style={css.urgent}>
          <strong>{urgentDisputes.length} dispute{urgentDisputes.length > 1 ? 's' : ''} need{urgentDisputes.length === 1 ? 's' : ''} response!</strong>
          {urgentDisputes.map(d => (
            <div key={d.id} style={{ marginTop: '6px', fontSize: '12px' }}>
              {d.sellers?.business_name} — {fmt(d.amount_cents)} — Due: {d.evidence_due_by ? fmtDate(d.evidence_due_by) : 'Unknown'}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {summary && (
        <div style={css.statsRow}>
          <div style={css.statCard}><div style={css.statNum}>{summary.total}</div><div style={css.statLabel}>Total Disputes</div></div>
          <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{summary.needs_response}</div><div style={css.statLabel}>Needs Response</div></div>
          <div style={css.statCard}><div style={{ ...css.statNum, color: '#f59e0b' }}>{summary.under_review}</div><div style={css.statLabel}>Under Review</div></div>
          <div style={css.statCard}><div style={{ ...css.statNum, color: '#22c55e' }}>{summary.won}</div><div style={css.statLabel}>Won</div></div>
          <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{summary.lost}</div><div style={css.statLabel}>Lost</div></div>
          <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{fmt(summary.lost_amount_cents)}</div><div style={css.statLabel}>Lost Amount</div></div>
        </div>
      )}

      {/* Filter */}
      <div style={css.filterRow}>
        {['all', 'needs_response', 'under_review', 'won', 'lost'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={css.filterBtn(filter === f)}>
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Disputes Table */}
      <div style={css.tableWrap}>
        <table style={css.table}>
          <thead>
            <tr>
              {['Seller', 'Amount', 'Reason', 'Status', 'Customer', 'Order Total', 'Evidence Due', 'Created', 'Resolved'].map(h => (
                <th key={h} style={css.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>Loading...</td></tr>
            ) : disputes.map(d => (
              <tr key={d.id} style={d.status === 'needs_response' ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                <td style={css.td}>
                  <div style={{ fontWeight: 600 }}>{d.sellers?.business_name || '—'}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{d.sellers?.email || ''}</div>
                </td>
                <td style={{ ...css.td, color: '#ef4444', fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem' }}>
                  {fmt(d.amount_cents)}
                </td>
                <td style={css.td}>
                  <span style={css.badge(d.reason === 'fraudulent' ? '#ef4444' : '#f59e0b')}>
                    {(d.reason || 'unknown').replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={css.td}>
                  <span style={css.badge(STATUS_COLORS[d.status] || '#6b7280')}>
                    {d.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ ...css.td, fontSize: '12px' }}>
                  {d.orders?.customer_name || '—'}
                  {d.orders?.customer_email && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{d.orders.customer_email}</div>}
                </td>
                <td style={css.td}>{d.orders?.total_cents ? fmt(d.orders.total_cents) : '—'}</td>
                <td style={css.td}>
                  {d.evidence_due_by ? (
                    <span style={{ fontSize: '12px', color: new Date(d.evidence_due_by) < new Date() ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                      {fmtDate(d.evidence_due_by)}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(d.created_at)}</td>
                <td style={{ ...css.td, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{d.resolved_at ? fmtDate(d.resolved_at) : '—'}</td>
              </tr>
            ))}
            {!loading && disputes.length === 0 && (
              <tr><td colSpan={9} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>No disputes found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
