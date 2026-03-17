import { createServiceClient } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import '../../globals.css'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('products').select('name, description, primary_image_url').eq('id', params.id).single()
  if (!data) return { title: 'Product | DIRTBIKZ' }
  return {
    title: `${data.name} | DIRTBIKZ`,
    description: data.description || 'Available at DIRTBIKZ — NC · SC · GA',
    openGraph: { images: data.primary_image_url ? [data.primary_image_url] : [] },
  }
}

export default async function ProductPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: p } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .eq('client_slug', 'dirtbikz')
    .single()

  if (!p) notFound()

  function fmt(cents: number) {
    return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#0a0a0a', borderBottom: '2px solid #ff6b35', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: '#ff6b35', textDecoration: 'none', letterSpacing: '4px' }}>DIRTBIKZ</a>
        <a href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back to Shop</a>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>

        {/* Image */}
        <div>
          {p.primary_image_url ? (
            <img
              src={p.primary_image_url}
              alt={p.name}
              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '10px', background: '#1a1a1a' }}
            />
          ) : (
            <div style={{ width: '100%', aspectRatio: '4/3', background: '#141414', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🏍️</div>
          )}
          {(p.images as string[] || []).slice(0, 4).length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {(p.images as string[]).slice(0, 4).map((img: string, i: number) => (
                <img key={i} src={img} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', background: '#1a1a1a' }} />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: '#ff6b35', textTransform: 'uppercase', marginBottom: '8px' }}>{p.category}</p>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '3px', lineHeight: 1, marginBottom: '16px' }}>{p.name}</h1>

          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#ffb347', letterSpacing: '2px', marginBottom: '8px' }}>
            {fmt(p.price_cents)}
            {p.original_price_cents && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginLeft: '12px' }}>
                {fmt(p.original_price_cents)}
              </span>
            )}
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '24px 0', padding: '20px', background: '#141414', borderRadius: '8px', border: '1px solid rgba(255,107,53,0.15)' }}>
            {[
              { label: 'Brand',    value: p.brand },
              { label: 'Model',    value: p.model },
              { label: 'Year',     value: p.year },
              { label: 'Location', value: p.location },
            ].filter(i => i.value).map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,107,53,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '3px' }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {p.description && (
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', marginBottom: '28px' }}>{p.description}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {p.in_stock ? (
              <a
                href={`tel:9105550100`}
                style={{ display: 'block', textAlign: 'center', padding: '16px', background: '#ff6b35', color: '#fff', borderRadius: '6px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '3px', textDecoration: 'none' }}
              >
                📞 Call to Purchase — (910) 555-0100
              </a>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '2px', fontSize: '13px', textTransform: 'uppercase' }}>
                Out of Stock
              </div>
            )}
            <a
              href={`mailto:dirtbikz@example.com?subject=Inquiry: ${encodeURIComponent(p.name)}`}
              style={{ display: 'block', textAlign: 'center', padding: '14px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', color: '#ff6b35', borderRadius: '6px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '2px', textDecoration: 'none' }}
            >
              ✉️ Email Inquiry
            </a>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', background: '#141414', borderRadius: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            📍 Location: {p.location || 'Contact us'} &nbsp;·&nbsp; NC · SC · GA
          </div>
        </div>
      </div>
    </div>
  )
}
