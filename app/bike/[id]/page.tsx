import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  parts: 'Parts Only',
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('bike_listings')
    .select('model, brand, year, price_cents')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (!data) return { title: 'Bike Not Found | DUSTDEVIL' }

  const price = (data.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  return {
    title: `${data.year} ${data.brand} ${data.model} ${price} | DUSTDEVIL`,
    description: `${data.year} ${data.brand} ${data.model} for sale in Wilmington NC. Listed on DUSTDEVIL — the dirt bike marketplace.`,
  }
}

export default async function BikePage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const { data: bike } = await supabase
    .from('bike_listings')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (!bike) notFound()

  const price = (bike.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  const heroImage = bike.image_urls?.[0] || null

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{
        background: '#DC143C',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <a href="/" style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.8rem',
          color: '#fff',
          textDecoration: 'none',
          letterSpacing: '2px',
        }}>
          DUSTDEVIL
        </a>
        <a href="/" style={{
          color: 'rgba(255,255,255,0.8)',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          ← Back to Listings
        </a>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC143C', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
            {bike.brand}
          </div>
          <h1 style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            color: '#fff',
            margin: 0,
            lineHeight: 1,
            letterSpacing: '2px',
          }}>
            {bike.year} {bike.brand} {bike.model}
          </h1>
        </div>

        {/* Price + Condition */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '3rem',
            color: '#FFD700',
            lineHeight: 1,
          }}>
            {price}
          </div>
          <div style={{
            padding: '6px 14px',
            background: 'rgba(220,20,60,0.2)',
            border: '1px solid #DC143C',
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: '#DC143C',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {CONDITION_LABELS[bike.condition] || bike.condition}
          </div>
          {bike.hours_ridden && (
            <div style={{
              padding: '6px 14px',
              background: 'rgba(0,40,104,0.4)',
              border: '1px solid #002868',
              borderRadius: '4px',
              fontSize: '0.85rem',
              color: '#6699ff',
              fontWeight: 700,
            }}>
              {bike.hours_ridden} hrs
            </div>
          )}
        </div>

        {/* Image */}
        {heroImage && (
          <div style={{ marginBottom: '32px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(220,20,60,0.3)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={`${bike.year} ${bike.brand} ${bike.model}`}
              style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Details */}
          <div style={{
            background: '#111',
            border: '1px solid rgba(220,20,60,0.2)',
            borderRadius: '8px',
            padding: '24px',
          }}>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#DC143C', margin: '0 0 16px', letterSpacing: '2px' }}>
              DETAILS
            </h2>
            <dl style={{ margin: 0, display: 'grid', gap: '12px' }}>
              {[
                ['Year', bike.year],
                ['Brand', bike.brand],
                ['Model', bike.model],
                ['Condition', CONDITION_LABELS[bike.condition] || bike.condition],
                ['Hours Ridden', bike.hours_ridden ? `${bike.hours_ridden} hrs` : null],
                ['Location', bike.location],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                  <dt style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</dt>
                  <dd style={{ margin: 0, color: '#fff', fontWeight: 600 }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Contact */}
          <div style={{
            background: '#111',
            border: '2px solid #DC143C',
            borderRadius: '8px',
            padding: '24px',
          }}>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#DC143C', margin: '0 0 16px', letterSpacing: '2px' }}>
              CONTACT SELLER
            </h2>
            {bike.seller_name && (
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '12px' }}>{bike.seller_name}</div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
              No middleman. Contact the seller directly to inspect and negotiate.
            </p>

            {bike.seller_phone && (
              <a
                href={`tel:${bike.seller_phone}`}
                style={{
                  display: 'block',
                  padding: '14px 20px',
                  background: '#DC143C',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontFamily: '"Bebas Neue", sans-serif',
                  fontSize: '1.2rem',
                  letterSpacing: '2px',
                  textAlign: 'center',
                  marginBottom: '12px',
                }}
              >
                📞 CALL {bike.seller_phone}
              </a>
            )}

            {bike.seller_email && (
              <a
                href={`mailto:${bike.seller_email}?subject=${encodeURIComponent(`Interested in your ${bike.year} ${bike.brand} ${bike.model} on DUSTDEVIL`)}`}
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  background: 'transparent',
                  color: '#DC143C',
                  border: '1px solid #DC143C',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontFamily: '"Bebas Neue", sans-serif',
                  fontSize: '1.1rem',
                  letterSpacing: '2px',
                  textAlign: 'center',
                }}
              >
                ✉ EMAIL SELLER
              </a>
            )}

            {bike.location && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                📍 {bike.location}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {bike.description && (
          <div style={{
            marginTop: '24px',
            background: '#111',
            border: '1px solid rgba(220,20,60,0.2)',
            borderRadius: '8px',
            padding: '24px',
          }}>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#DC143C', margin: '0 0 16px', letterSpacing: '2px' }}>
              DESCRIPTION
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {bike.description}
            </p>
          </div>
        )}

        {/* Back CTA */}
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.2)',
              textDecoration: 'none',
              borderRadius: '4px',
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '1.1rem',
              letterSpacing: '2px',
            }}
          >
            ← VIEW ALL LISTINGS
          </a>
        </div>
      </div>
    </div>
  )
}
