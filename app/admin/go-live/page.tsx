'use client'

import { useEffect, useState } from 'react'

interface CheckItem {
  category: string
  item: string
  status: boolean
  critical: boolean
  manual?: boolean
}

interface GoLiveData {
  checklist: CheckItem[]
  stats: Record<string, number>
  summary: {
    passed: number
    total: number
    critical_failing: number
    ready: boolean
    percentage: number
  }
}

const css = {
  page: { padding: '32px', minHeight: '100vh' } as React.CSSProperties,
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#fff', marginBottom: '24px' } as React.CSSProperties,
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' } as React.CSSProperties,
  statCard: { background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '14px 18px' } as React.CSSProperties,
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: '#ff6b35', lineHeight: 1 } as React.CSSProperties,
  statLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '4px' },
  categoryTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '2px', color: '#ff6b35', marginTop: '24px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,107,53,0.15)' } as React.CSSProperties,
  checkRow: (status: boolean, critical: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '6px', marginBottom: '4px',
    background: status ? 'rgba(34,197,94,0.04)' : critical ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.04)',
  }),
  checkIcon: (status: boolean): React.CSSProperties => ({
    width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    background: status ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
    color: status ? '#22c55e' : 'rgba(255,255,255,0.3)',
    fontSize: '12px', fontWeight: 700,
  }),
  badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: color + '22', color, marginLeft: '8px' }),
  readiness: (ready: boolean): React.CSSProperties => ({
    background: ready ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
    border: `1px solid ${ready ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    borderRadius: '12px', padding: '24px', marginBottom: '28px', textAlign: 'center',
  }),
  progressBar: { width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' } as React.CSSProperties,
  progressFill: (pct: number, ready: boolean): React.CSSProperties => ({
    width: `${pct}%`, height: '100%', borderRadius: '4px',
    background: ready ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444',
    transition: 'width 0.5s ease',
  }),
}

export default function AdminGoLive() {
  const [data, setData] = useState<GoLiveData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/go-live')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ ...css.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>Checking production readiness...</div>
  if (!data) return <div style={css.page}>Failed to load checklist.</div>

  const categories = [...new Set(data.checklist.map(c => c.category))]

  return (
    <div style={css.page}>
      <h1 style={css.title}>Go-Live Checklist</h1>

      {/* Readiness banner */}
      <div style={css.readiness(data.summary.ready)}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', letterSpacing: '4px', color: data.summary.ready ? '#22c55e' : '#ef4444', lineHeight: 1 }}>
          {data.summary.ready ? 'READY FOR LAUNCH' : 'NOT READY'}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
          {data.summary.passed}/{data.summary.total} checks passed
          {data.summary.critical_failing > 0 && (
            <span style={{ color: '#ef4444', fontWeight: 700 }}> — {data.summary.critical_failing} critical items failing</span>
          )}
        </div>
        <div style={css.progressBar}>
          <div style={css.progressFill(data.summary.percentage, data.summary.ready)} />
        </div>
      </div>

      {/* Live stats */}
      <div style={css.statsRow}>
        {[
          { num: data.stats.sellers, label: 'Sellers' },
          { num: data.stats.active_sellers, label: 'Active' },
          { num: data.stats.products, label: 'Products' },
          { num: data.stats.live_products, label: 'Live' },
          { num: data.stats.orders, label: 'Orders' },
          { num: data.stats.paid_orders, label: 'Paid' },
          { num: data.stats.vin_lookups, label: 'VIN Lookups' },
          { num: data.stats.disputes, label: 'Disputes' },
        ].map(s => (
          <div key={s.label} style={css.statCard}>
            <div style={{ ...css.statNum, color: s.num > 0 ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>{s.num}</div>
            <div style={css.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Checklist by category */}
      {categories.map(cat => {
        const items = data.checklist.filter(c => c.category === cat)
        const catPassed = items.filter(c => c.status).length
        return (
          <div key={cat}>
            <div style={css.categoryTitle}>
              {cat}
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginLeft: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 400, letterSpacing: 'normal' }}>
                {catPassed}/{items.length}
              </span>
            </div>
            {items.map((item, i) => (
              <div key={i} style={css.checkRow(item.status, item.critical)}>
                <div style={css.checkIcon(item.status)}>
                  {item.status ? '✓' : '—'}
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: item.status ? 'rgba(255,255,255,0.7)' : '#fff' }}>
                  {item.item}
                  {item.critical && !item.status && <span style={css.badge('#ef4444')}>Critical</span>}
                  {item.manual && <span style={css.badge('#f59e0b')}>Manual</span>}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: item.status ? '#22c55e' : item.critical ? '#ef4444' : '#f59e0b' }}>
                  {item.status ? 'PASS' : item.critical ? 'FAIL' : 'TODO'}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {/* Deployment commands */}
      <div style={{ ...css.categoryTitle, marginTop: '36px' }}>Deployment Commands</div>
      <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '20px', fontFamily: 'monospace', fontSize: '13px', color: '#22c55e', lineHeight: 2 }}>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}># 1. Run tests</div>
        <div>npm test</div>
        <br/>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}># 2. Verify production readiness</div>
        <div>bash scripts/verify-production.sh</div>
        <br/>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}># 3. Apply database migrations</div>
        <div>supabase db push</div>
        <br/>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}># 4. Deploy to Vercel</div>
        <div>vercel --prod</div>
        <br/>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}># 5. Register Stripe webhook endpoint</div>
        <div>stripe listen --forward-to https://dirtbikz.com/api/webhooks/stripe</div>
        <br/>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}># 6. Test seller registration</div>
        <div>open https://dirtbikz.com/seller/onboarding</div>
      </div>
    </div>
  )
}
