'use client'

import { useEffect, useState } from 'react'

interface SellerRisk {
  seller_id: string
  business_name: string
  email: string
  status: string
  disputes_30d: number
  disputes_lost: number
  disputes_total: number
  vin_flags: number
  risk_score: number
  risk_level: string
  auto_suspend_reason: string | null
}

interface VelocityFlag {
  email: string
  order_count: number
  window_minutes: number
  orders: { id: string; total_cents: number; created_at: string }[]
  flag_type: string
}

interface FraudData {
  summary: {
    total_sellers: number
    high_risk_sellers: number
    pending_auto_suspend: number
    velocity_flags: number
    total_disputes_30d: number
    total_vin_flags: number
  }
  sellerRisks: SellerRisk[]
  velocityFlags: VelocityFlag[]
  sellersToAutoSuspend: string[]
}

function fmt(cents: number) { return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }

const RISK_COLORS: Record<string, string> = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' }
const STATUS_COLORS: Record<string, string> = { pending: '#f59e0b', active: '#22c55e', suspended: '#ef4444', rejected: '#6b7280' }

const css = {
  page: { padding: '32px', minHeight: '100vh' } as React.CSSProperties,
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#fff', marginBottom: '24px' } as React.CSSProperties,
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } as React.CSSProperties,
  statCard: { background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '14px 18px' } as React.CSSProperties,
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: '#ff6b35', lineHeight: 1 } as React.CSSProperties,
  statLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '4px' },
  sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '2px', color: '#fff', marginBottom: '14px', marginTop: '28px' } as React.CSSProperties,
  tableWrap: { background: '#0f0f0f', border: '1px solid rgba(255,107,53,0.12)', borderRadius: '8px', overflow: 'auto', marginBottom: '28px' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '800px' } as React.CSSProperties,
  th: { padding: '12px 14px', textAlign: 'left' as const, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'rgba(255,107,53,0.7)', borderBottom: '1px solid rgba(255,107,53,0.1)', background: 'rgba(255,107,53,0.04)', whiteSpace: 'nowrap' as const },
  td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff' },
  badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: color + '22', color }),
  btnPrimary: { background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '2px', cursor: 'pointer' } as React.CSSProperties,
  btnDanger: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '10px 20px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '2px', cursor: 'pointer' } as React.CSSProperties,
  urgent: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#ef4444' } as React.CSSProperties,
  riskBar: (score: number): React.CSSProperties => ({
    width: '80px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', display: 'inline-block', marginRight: '8px', position: 'relative' as const, overflow: 'hidden',
  }),
  riskFill: (score: number): React.CSSProperties => ({
    width: `${score}%`, height: '100%', borderRadius: '3px',
    background: score >= 60 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#22c55e',
  }),
}

export default function AdminFraud() {
  const [data, setData] = useState<FraudData | null>(null)
  const [loading, setLoading] = useState(true)
  const [suspending, setSuspending] = useState(false)

  useEffect(() => {
    fetch('/api/admin/fraud')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function autoSuspend() {
    if (!data?.sellersToAutoSuspend.length) return
    if (!confirm(`Auto-suspend ${data.sellersToAutoSuspend.length} seller(s)?`)) return

    setSuspending(true)
    const res = await fetch('/api/admin/fraud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auto_suspend', seller_ids: data.sellersToAutoSuspend }),
    })
    if (res.ok) {
      const result = await res.json()
      alert(`Suspended ${result.count} seller(s)`)
      // Reload
      const reload = await fetch('/api/admin/fraud')
      if (reload.ok) setData(await reload.json())
    }
    setSuspending(false)
  }

  if (loading) return <div style={{ ...css.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading fraud data...</div>
  if (!data) return <div style={{ ...css.page, color: '#ef4444' }}>Failed to load fraud data.</div>

  const highRisk = data.sellerRisks.filter(s => s.risk_level === 'high')

  return (
    <div style={css.page}>
      <h1 style={css.title}>Fraud Prevention Dashboard</h1>

      {/* Auto-suspend alert */}
      {data.sellersToAutoSuspend.length > 0 && (
        <div style={css.urgent}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{data.sellersToAutoSuspend.length} seller(s) flagged for auto-suspension</strong>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Exceeded dispute threshold (5+ in 30 days or 2+ lost)
              </div>
            </div>
            <button onClick={autoSuspend} disabled={suspending} style={{ ...css.btnDanger, opacity: suspending ? 0.7 : 1 }}>
              {suspending ? 'Suspending...' : 'Execute Auto-Suspend'}
            </button>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div style={css.statsRow}>
        <div style={css.statCard}><div style={css.statNum}>{data.summary.total_sellers}</div><div style={css.statLabel}>Total Sellers</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{data.summary.high_risk_sellers}</div><div style={css.statLabel}>High Risk</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{data.summary.pending_auto_suspend}</div><div style={css.statLabel}>Pending Suspend</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#f59e0b' }}>{data.summary.velocity_flags}</div><div style={css.statLabel}>Order Velocity Flags</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{data.summary.total_disputes_30d}</div><div style={css.statLabel}>Disputes (30d)</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#f59e0b' }}>{data.summary.total_vin_flags}</div><div style={css.statLabel}>VIN Flags</div></div>
      </div>

      {/* ── High Risk Sellers ── */}
      {highRisk.length > 0 && (
        <>
          <h2 style={css.sectionTitle}>High Risk Sellers</h2>
          <div style={css.tableWrap}>
            <table style={css.table}>
              <thead>
                <tr>
                  {['Seller', 'Status', 'Risk Score', 'Disputes (30d)', 'Lost', 'Total', 'VIN Flags', 'Auto-Suspend Reason'].map(h => (
                    <th key={h} style={css.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {highRisk.map(s => (
                  <tr key={s.seller_id} style={{ background: 'rgba(239,68,68,0.04)' }}>
                    <td style={css.td}>
                      <div style={{ fontWeight: 600 }}>{s.business_name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{s.email}</div>
                    </td>
                    <td style={css.td}><span style={css.badge(STATUS_COLORS[s.status] || '#6b7280')}>{s.status}</span></td>
                    <td style={css.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={css.riskBar(s.risk_score)}>
                          <div style={css.riskFill(s.risk_score)} />
                        </div>
                        <span style={{ fontWeight: 700, color: RISK_COLORS[s.risk_level], fontSize: '13px' }}>{s.risk_score}</span>
                      </div>
                    </td>
                    <td style={{ ...css.td, fontWeight: 700, color: s.disputes_30d > 0 ? '#ef4444' : '#fff' }}>{s.disputes_30d}</td>
                    <td style={{ ...css.td, fontWeight: 700, color: s.disputes_lost > 0 ? '#ef4444' : '#fff' }}>{s.disputes_lost}</td>
                    <td style={css.td}>{s.disputes_total}</td>
                    <td style={css.td}>{s.vin_flags > 0 ? <span style={css.badge('#f59e0b')}>{s.vin_flags}</span> : '0'}</td>
                    <td style={{ ...css.td, fontSize: '12px', color: '#ef4444' }}>{s.auto_suspend_reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── All Seller Risk Scores ── */}
      <h2 style={css.sectionTitle}>All Seller Risk Scores</h2>
      <div style={css.tableWrap}>
        <table style={css.table}>
          <thead>
            <tr>
              {['Seller', 'Status', 'Risk', 'Score', 'Disputes (30d)', 'Lost', 'VIN Flags', 'Trigger'].map(h => (
                <th key={h} style={css.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sellerRisks.map(s => (
              <tr key={s.seller_id} style={s.risk_level === 'high' ? { background: 'rgba(239,68,68,0.03)' } : {}}>
                <td style={css.td}>
                  <div style={{ fontWeight: 600 }}>{s.business_name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{s.email}</div>
                </td>
                <td style={css.td}><span style={css.badge(STATUS_COLORS[s.status] || '#6b7280')}>{s.status}</span></td>
                <td style={css.td}><span style={css.badge(RISK_COLORS[s.risk_level])}>{s.risk_level}</span></td>
                <td style={css.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={css.riskBar(s.risk_score)}>
                      <div style={css.riskFill(s.risk_score)} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{s.risk_score}</span>
                  </div>
                </td>
                <td style={css.td}>{s.disputes_30d}</td>
                <td style={css.td}>{s.disputes_lost}</td>
                <td style={css.td}>{s.vin_flags}</td>
                <td style={{ ...css.td, fontSize: '11px', color: s.auto_suspend_reason ? '#ef4444' : 'rgba(255,255,255,0.2)' }}>
                  {s.auto_suspend_reason || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Order Velocity Flags ── */}
      {data.velocityFlags.length > 0 && (
        <>
          <h2 style={css.sectionTitle}>Order Velocity Flags</h2>
          <div style={css.tableWrap}>
            <table style={css.table}>
              <thead>
                <tr>
                  {['Customer Email', 'Flag Type', 'Orders', 'Window', 'Order Details'].map(h => (
                    <th key={h} style={css.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.velocityFlags.map((f, i) => (
                  <tr key={i} style={{ background: 'rgba(245,158,11,0.03)' }}>
                    <td style={{ ...css.td, fontWeight: 600 }}>{f.email}</td>
                    <td style={css.td}>
                      <span style={css.badge(f.flag_type === 'rapid_ordering' ? '#ef4444' : '#f59e0b')}>
                        {f.flag_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ ...css.td, fontWeight: 700 }}>{f.order_count}</td>
                    <td style={css.td}>{f.window_minutes > 0 ? `${f.window_minutes} min` : 'Various'}</td>
                    <td style={{ ...css.td, fontSize: '11px' }}>
                      {f.orders.map((o, j) => (
                        <div key={j}>{fmt(o.total_cents)} — {fmtDate(o.created_at)}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
