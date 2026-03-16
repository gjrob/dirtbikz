'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Bike {
  id: string
  model: string
  brand: string
  year: number
  price_cents: number
  status: string
  condition: string
  created_at: string
}

export default function Dashboard() {
  const [bikes, setBikes] = useState<Bike[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bike_listings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setBikes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const active = bikes.filter(b => b.status === 'active').length
  const sold = bikes.filter(b => b.status === 'sold').length

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#DC143C', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.8rem', color: '#fff', textDecoration: 'none', letterSpacing: '2px' }}>
          DUSTDEVIL
        </a>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Admin Dashboard
        </span>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px' }}>
        <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '3rem', color: '#fff', marginBottom: '8px', letterSpacing: '2px' }}>
          LISTINGS DASHBOARD
        </h1>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[
            { label: 'Total Listings', value: bikes.length, color: '#fff' },
            { label: 'Active', value: active, color: '#22c55e' },
            { label: 'Sold', value: sold, color: '#FFD700' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#111', border: '1px solid rgba(220,20,60,0.2)', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '3rem', color: stat.color, lineHeight: 1 }}>
                {loading ? '—' : stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#111', border: '1px solid rgba(220,20,60,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(220,20,60,0.15)', borderBottom: '1px solid rgba(220,20,60,0.3)' }}>
                {['Year', 'Brand', 'Model', 'Price', 'Condition', 'Status', 'Listed'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: '"Bebas Neue", sans-serif', fontSize: '1rem', color: '#DC143C', letterSpacing: '1px', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</td></tr>
              ) : bikes.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No listings yet</td></tr>
              ) : bikes.map(bike => (
                <tr key={bike.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)' }}>{bike.year}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{bike.brand}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <a href={`/bike/${bike.id}`} style={{ color: '#DC143C', textDecoration: 'none' }}>{bike.model}</a>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#FFD700', fontWeight: 700 }}>
                    ${(bike.price_cents / 100).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{bike.condition}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: bike.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(255,215,0,0.15)',
                      color: bike.status === 'active' ? '#22c55e' : '#FFD700',
                    }}>
                      {bike.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    {new Date(bike.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
