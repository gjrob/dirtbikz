'use client'

import { useEffect, useState } from 'react'

interface Analytics {
  revenue: { allTime: number; month: number; week: number; today: number }
  commission: { allTime: number; month: number }
  sellerPayouts: { allTime: number }
  orderCount: number
  paidCount: number
  sellerCount: number
  statusCounts: Record<string, number>
  revenueByLocation: Record<string, number>
  topProducts: { name: string; count: number; revenue: number }[]
  disputeSummary: { total: number; active: number; lostAmount: number }
}

function fmt(cents: number) {
  if (cents >= 100000) return '$' + (cents / 100000).toFixed(1) + 'k'
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })
}
function fmtFull(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const STATUS_COLORS: Record<string, string> = {
  paid: '#22c55e', pending: '#f59e0b', failed: '#ef4444', refunded: '#6b7280',
}

const LOC_COLORS: Record<string, string> = {
  NC: '#ff6b35', SC: '#ffb347', GA: '#ffd700', Unknown: '#444',
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const card: React.CSSProperties = { background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '22px 24px' }
  const cardTitle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }
  const bigNum: React.CSSProperties = { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.4rem', color: '#ff6b35', letterSpacing: '2px', lineHeight: 1 }
  const sub: React.CSSProperties = { fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }

  if (loading) {
    return <div style={{ padding: '64px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>Loading analytics...</div>
  }

  if (!data) {
    return <div style={{ padding: '64px', textAlign: 'center', color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>Failed to load analytics.</div>
  }

  const maxLocRevenue = Math.max(...Object.values(data.revenueByLocation), 1)

  return (
    <div style={{ padding: '32px', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#fff', marginBottom: '28px' }}>Analytics</h1>

      {/* Revenue cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Gross Revenue',  value: data.revenue.allTime,  sub: `${data.paidCount} paid orders` },
          { label: 'This Month',        value: data.revenue.month,    sub: 'current calendar month' },
          { label: 'Last 7 Days',       value: data.revenue.week,     sub: 'rolling 7 days' },
          { label: 'Today',             value: data.revenue.today,    sub: 'since midnight' },
        ].map(item => (
          <div key={item.label} style={card}>
            <div style={cardTitle}>{item.label}</div>
            <div style={bigNum}>{fmt(item.value)}</div>
            <div style={sub}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Platform commission row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={card}>
          <div style={cardTitle}>Platform Commission (5%)</div>
          <div style={{ ...bigNum, color: '#22c55e' }}>{fmt(data.commission.allTime)}</div>
          <div style={sub}>all-time platform earnings</div>
        </div>
        <div style={card}>
          <div style={cardTitle}>Commission This Month</div>
          <div style={{ ...bigNum, color: '#22c55e' }}>{fmt(data.commission.month)}</div>
          <div style={sub}>current month</div>
        </div>
        <div style={card}>
          <div style={cardTitle}>Seller Payouts</div>
          <div style={{ ...bigNum, color: '#f59e0b' }}>{fmt(data.sellerPayouts.allTime)}</div>
          <div style={sub}>paid to sellers (95%)</div>
        </div>
        <div style={card}>
          <div style={cardTitle}>Active Sellers</div>
          <div style={bigNum}>{data.sellerCount}</div>
          <div style={sub}>total registered</div>
        </div>
        <div style={card}>
          <div style={cardTitle}>Disputes</div>
          <div style={{ ...bigNum, color: data.disputeSummary.active > 0 ? '#ef4444' : '#22c55e' }}>{data.disputeSummary.total}</div>
          <div style={sub}>{data.disputeSummary.active} active · {fmt(data.disputeSummary.lostAmount)} lost</div>
        </div>
      </div>

      {/* Second row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>

        {/* Order status breakdown */}
        <div style={card}>
          <div style={cardTitle}>Orders by Status</div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#ff6b35', letterSpacing: '1px' }}>{data.orderCount}</span>
            <span style={{ ...sub, display: 'inline', marginLeft: '8px' }}>total orders</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {Object.entries(data.statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', background: (STATUS_COLORS[status] || '#888') + '22', color: STATUS_COLORS[status] || '#888' }}>
                  {status}
                </span>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>{count}</span>
              </div>
            ))}
            {Object.keys(data.statusCounts).length === 0 && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>No orders yet</p>}
          </div>
        </div>

        {/* Revenue by location */}
        <div style={card}>
          <div style={cardTitle}>Revenue by Location</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            {Object.entries(data.revenueByLocation)
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([loc, rev]) => {
                const pct = Math.round((rev / maxLocRevenue) * 100)
                return (
                  <div key={loc}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: LOC_COLORS[loc] || '#fff' }}>{loc}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{fmtFull(rev)}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '6px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: LOC_COLORS[loc] || '#ff6b35', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
            {Object.values(data.revenueByLocation).every(v => v === 0) && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>No paid orders yet</p>}
          </div>
        </div>

        {/* Top products */}
        <div style={card}>
          <div style={cardTitle}>Top Products</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {data.topProducts.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: i === 0 ? '#ff6b35' : 'rgba(255,255,255,0.3)', minWidth: '20px', lineHeight: 1.2 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{p.count} sold · {fmtFull(p.revenue)}</div>
                </div>
              </div>
            ))}
            {data.topProducts.length === 0 && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>No sales yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
