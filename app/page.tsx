'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { emit, EventType } from '../lib/events'

const CLIENT_SLUG = 'dustdevil'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Sample / seed bikes (shown while DB is empty) ─────────────────────────────
const SAMPLE_BIKES = [
  {
    id: 'sample-1',
    brand: 'Honda', model: 'CRF450R', year: 2021,
    condition: 'excellent', hours_ridden: 28,
    price_cents: 749900,
    location: 'Wilmington, NC',
    seller_name: 'Jake R.',
    image_urls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop'],
    description: 'Bone stock. Fresh top-end. Dunlop AT81s. Title in hand.',
    status: 'active', badge: 'hot',
  },
  {
    id: 'sample-2',
    brand: 'KTM', model: '350 SX-F', year: 2020,
    condition: 'good', hours_ridden: 55,
    price_cents: 649900,
    location: 'Jacksonville, NC',
    seller_name: 'Mike T.',
    image_urls: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&h=400&fit=crop'],
    description: 'New chain, sprockets, and air filter. Ready to rip.',
    status: 'active', badge: 'new',
  },
  {
    id: 'sample-3',
    brand: 'Yamaha', model: 'YZ250F', year: 2019,
    condition: 'good', hours_ridden: 72,
    price_cents: 529900,
    location: 'Leland, NC',
    seller_name: 'Chris D.',
    image_urls: ['https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=600&h=400&fit=crop'],
    description: 'Rebuilt carb. New plastics. Pro Taper bars.',
    status: 'active', badge: null,
  },
  {
    id: 'sample-4',
    brand: 'Kawasaki', model: 'KX250', year: 2018,
    condition: 'fair', hours_ridden: 110,
    price_cents: 369900,
    location: 'Wilmington, NC',
    seller_name: 'Tony M.',
    image_urls: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=400&fit=crop'],
    description: 'Needs new seals. Great project bike. Priced to move.',
    status: 'active', badge: null,
  },
  {
    id: 'sample-5',
    brand: 'Husqvarna', model: 'FC 350', year: 2022,
    condition: 'excellent', hours_ridden: 14,
    price_cents: 899900,
    location: 'Hampstead, NC',
    seller_name: 'Sara K.',
    image_urls: ['https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=600&h=400&fit=crop'],
    description: 'Barely broken in. Dealer serviced. Akrapovic slip-on.',
    status: 'active', badge: 'hot',
  },
  {
    id: 'sample-6',
    brand: 'Suzuki', model: 'RMZ450', year: 2017,
    condition: 'good', hours_ridden: 88,
    price_cents: 449900,
    location: 'Castle Hayne, NC',
    seller_name: 'Brett S.',
    image_urls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop'],
    description: 'Full FMF exhaust. Race-ready. Receipts available.',
    status: 'active', badge: null,
  },
]

const BRANDS = ['All Brands', 'Honda', 'Yamaha', 'KTM', 'Kawasaki', 'Husqvarna', 'Suzuki', 'Beta', 'Gas Gas', 'Sherco']
const CONDITIONS = ['All Conditions', 'excellent', 'good', 'fair', 'parts']
const PRICE_MAX = ['Any Price', '1000', '2500', '4000', '6000', '8000', '10000']

// ── Stars config ──────────────────────────────────────────────────────────────
const STARS = [
  { top: '12%', left: '8%',  delay: '0s',   dur: '1.8s', size: '1rem' },
  { top: '20%', left: '85%', delay: '0.4s', dur: '2.2s', size: '1.4rem' },
  { top: '35%', left: '5%',  delay: '0.8s', dur: '1.5s', size: '0.8rem' },
  { top: '60%', left: '92%', delay: '1.2s', dur: '2s',   size: '1.2rem' },
  { top: '75%', left: '15%', delay: '0.3s', dur: '1.7s', size: '0.9rem' },
  { top: '80%', left: '78%', delay: '0.9s', dur: '2.4s', size: '1rem' },
  { top: '45%', left: '48%', delay: '1.5s', dur: '1.9s', size: '0.7rem' },
]

function formatPrice(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

function conditionClass(c: string) {
  return `listing-pill pill-condition-${c}`
}

interface Bike {
  id: string; brand: string; model: string; year: number;
  condition: string; hours_ridden?: number; price_cents: number;
  location: string; seller_name: string; image_urls: string[];
  description: string; status: string; badge?: string | null;
}

// ── Listing Modal Form ────────────────────────────────────────────────────────
function PostModal({ onClose, lang }: { onClose: () => void; lang: 'en' | 'es' }) {
  const [form, setForm] = useState({
    seller_name: '', seller_email: '', seller_phone: '',
    brand: 'Honda', model: '', year: new Date().getFullYear().toString(),
    condition: 'good', hours_ridden: '', description: '', price: '', location: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: listing } = await supabase.from('bike_listings').insert({
        client_slug: CLIENT_SLUG,
        seller_name: form.seller_name,
        seller_email: form.seller_email,
        seller_phone: form.seller_phone || null,
        brand: form.brand,
        model: form.model,
        year: parseInt(form.year),
        condition: form.condition,
        hours_ridden: form.hours_ridden ? parseInt(form.hours_ridden) : null,
        description: form.description,
        price_cents: Math.round(parseFloat(form.price) * 100),
        location: form.location,
        status: 'active',
      }).select('id').single()

      if (listing) {
        await supabase.from('qr_codes').insert({
          client_slug: CLIENT_SLUG,
          listing_id: listing.id,
          destination_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dustdevil.com'}/bike/${listing.id}`,
        })
        emit({ event_type: EventType.PAGE_VIEW, client_slug: CLIENT_SLUG, payload: { listing_id: listing.id, action: 'listing_created' } })
      }

      setDone(true)
    } catch (err) {
      console.error(err)
      alert(lang === 'en' ? 'Failed to post listing. Try again.' : 'Error al publicar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', color: '#22c55e' }}>✓</div>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', letterSpacing: '3px', marginBottom: '8px' }}>
            {lang === 'en' ? 'LISTING POSTED!' : '¡ANUNCIO PUBLICADO!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {lang === 'en' ? "Your bike is live. Buyers will reach you directly." : "Tu moto está en vivo. Los compradores te contactarán directamente."}
          </p>
          <button className="btn-primary" onClick={onClose}>
            {lang === 'en' ? 'VIEW MARKETPLACE' : 'VER MERCADO'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{lang === 'en' ? 'POST YOUR BIKE' : 'PUBLICA TU MOTO'}</div>
        <div className="modal-sub">{lang === 'en' ? 'Free listing. No middleman. Get paid fast.' : 'Gratis. Sin intermediarios. Vende rápido.'}</div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'en' ? 'Your Name *' : 'Tu Nombre *'}</label>
              <input type="text" value={form.seller_name} onChange={e => set('seller_name', e.target.value)} required placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>{lang === 'en' ? 'Email *' : 'Correo *'}</label>
              <input type="email" value={form.seller_email} onChange={e => set('seller_email', e.target.value)} required placeholder="you@email.com" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'en' ? 'Phone' : 'Teléfono'}</label>
              <input type="tel" value={form.seller_phone} onChange={e => set('seller_phone', e.target.value)} placeholder="(910) 555-0000" />
            </div>
            <div className="form-group">
              <label>{lang === 'en' ? 'Location *' : 'Ubicación *'}</label>
              <input type="text" value={form.location} onChange={e => set('location', e.target.value)} required placeholder="City, NC" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'en' ? 'Brand *' : 'Marca *'}</label>
              <select value={form.brand} onChange={e => set('brand', e.target.value)}>
                {BRANDS.slice(1).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{lang === 'en' ? 'Model *' : 'Modelo *'}</label>
              <input type="text" value={form.model} onChange={e => set('model', e.target.value)} required placeholder="YZ250F" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'en' ? 'Year *' : 'Año *'}</label>
              <input type="number" value={form.year} onChange={e => set('year', e.target.value)} required min="1990" max="2030" />
            </div>
            <div className="form-group">
              <label>{lang === 'en' ? 'Hours Ridden' : 'Horas Corridas'}</label>
              <input type="number" value={form.hours_ridden} onChange={e => set('hours_ridden', e.target.value)} placeholder="e.g. 45" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'en' ? 'Condition *' : 'Condición *'}</label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)}>
                <option value="excellent">{lang === 'en' ? 'Excellent' : 'Excelente'}</option>
                <option value="good">{lang === 'en' ? 'Good' : 'Bueno'}</option>
                <option value="fair">{lang === 'en' ? 'Fair' : 'Regular'}</option>
                <option value="parts">{lang === 'en' ? 'Parts Only' : 'Solo Piezas'}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{lang === 'en' ? 'Asking Price ($) *' : 'Precio ($) *'}</label>
              <input type="number" step="0.01" min="1" value={form.price} onChange={e => set('price', e.target.value)} required placeholder="0.00" />
            </div>
          </div>
          <div className="form-group">
            <label>{lang === 'en' ? 'Description' : 'Descripción'}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder={lang === 'en' ? 'Mods, service history, why you\'re selling...' : 'Modificaciones, historial de servicio, por qué vendes...'} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {lang === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (lang === 'en' ? 'POSTING...' : 'PUBLICANDO...') : (lang === 'en' ? 'POST MY BIKE' : 'PUBLICAR MOTO')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Page() {
  const [lang, setLang] = useState<'en' | 'es'>('en')
  const [filterBrand, setFilterBrand] = useState('All Brands')
  const [filterCondition, setFilterCondition] = useState('All Conditions')
  const [filterMaxPrice, setFilterMaxPrice] = useState('Any Price')
  const [searchQ, setSearchQ] = useState('')
  const [bikes, setBikes] = useState<Bike[]>(SAMPLE_BIKES)
  const [showModal, setShowModal] = useState(false)

  const t = {
    eyebrow:      { en: '★  THE DIRT BIKE MARKETPLACE  ★', es: '★  EL MERCADO DE MOTOS  ★' },
    title1:       { en: 'DUST', es: 'DUST' },
    title2:       { en: 'DEVIL', es: 'DEVIL' },
    tagline:      { en: 'BUY • SELL • DOMINATE', es: 'COMPRA • VENDE • DOMINA' },
    sub:          { en: 'Dirt bikes. No BS. No middleman. Fast deals.', es: 'Motos de tierra. Sin intermediarios. Tratos rápidos.' },
    postBtn:      { en: 'LIST YOUR BIKE', es: 'PUBLICA TU MOTO' },
    browseBtn:    { en: 'BROWSE BIKES', es: 'VER MOTOS' },
    listingsTitle:{ en: 'AVAILABLE BIKES', es: 'MOTOS DISPONIBLES' },
    listingsSub:  { en: 'Updated daily. All bikes inspected by seller.', es: 'Actualizado diariamente.' },
    howTitle:     { en: 'HOW IT WORKS', es: 'CÓMO FUNCIONA' },
    step1Title:   { en: 'LIST FREE', es: 'PUBLICA GRATIS' },
    step1Desc:    { en: 'Post your bike in under 2 minutes. Photos, price, condition. No fees. No nonsense.', es: 'Publica tu moto en menos de 2 minutos. Sin comisiones.' },
    step2Title:   { en: 'BUYERS HIT YOU', es: 'COMPRADORES TE CONTACTAN' },
    step2Desc:    { en: "Interested buyers message you directly. No platform taking a cut.", es: 'Compradores interesados te contactan directamente.' },
    step3Title:   { en: 'GET PAID', es: 'COBRA' },
    step3Desc:    { en: 'Meet local or ship. You set the terms. DUSTDEVIL just makes the connection.', es: 'Reúnete localmente o envía. Tú pones las condiciones.' },
    viewDetails:  { en: 'VIEW DETAILS', es: 'VER DETALLES' },
    searchPlaceholder: { en: 'Search bikes, brands, models...', es: 'Buscar motos, marcas, modelos...' },
    searchBtn:    { en: 'FIND BIKES', es: 'BUSCAR' },
    brandLabel:   { en: 'BRAND', es: 'MARCA' },
    condLabel:    { en: 'CONDITION', es: 'CONDICIÓN' },
    priceLabel:   { en: 'MAX PRICE', es: 'PRECIO MÁX' },
    noBikes:      { en: 'No bikes match your filters. Try adjusting your search.', es: 'No hay motos que coincidan. Ajusta tu búsqueda.' },
    footerSub:    { en: 'The fastest way to buy and sell dirt bikes in the Carolinas.', es: 'La forma más rápida de comprar y vender motos en las Carolinas.' },
  }

  useEffect(() => {
    const load = async () => {
      try {
        let q = supabase
          .from('bike_listings')
          .select('*')
          .eq('client_slug', CLIENT_SLUG)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(24)
        if (filterBrand !== 'All Brands') q = q.eq('brand', filterBrand)
        if (filterCondition !== 'All Conditions') q = q.eq('condition', filterCondition)
        if (filterMaxPrice !== 'Any Price') q = q.lte('price_cents', parseInt(filterMaxPrice) * 100)
        const { data } = await q
        if (data && data.length > 0) setBikes(data)
      } catch { /* use sample data */ }
    }
    load()
  }, [filterBrand, filterCondition, filterMaxPrice])

  const displayBikes = bikes.filter(b => {
    if (!searchQ) return true
    const q = searchQ.toLowerCase()
    return `${b.brand} ${b.model} ${b.year} ${b.location}`.toLowerCase().includes(q)
  })

  return (
    <main>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'DUSTDEVIL',
          description: 'Dirt bike buy/sell marketplace in Wilmington NC',
          url: 'https://dustdevil.com',
          areaServed: 'Wilmington, NC',
          address: { '@type': 'PostalAddress', addressLocality: 'Wilmington', addressRegion: 'NC', addressCountry: 'US' },
        })}}
      />

      {showModal && <PostModal onClose={() => setShowModal(false)} lang={lang} />}

      {/* ── NAV ── */}
      <nav className="nav">
        <a href="/" className="nav-logo">DUST<span>DEVIL</span></a>
        <div className="nav-right">
          <a href="#listings" className="nav-link">{lang === 'en' ? 'Browse' : 'Explorar'}</a>
          <a href="#how" className="nav-link">{lang === 'en' ? 'How It Works' : 'Cómo Funciona'}</a>
          <button className="nav-cta" onClick={() => setShowModal(true)}>{lang === 'en' ? 'POST BIKE' : 'PUBLICA'}</button>
          <button className="lang-toggle" onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}>
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&h=900&fit=crop&q=80"
          alt="Dirt bike rider"
          className="hero-bg"
        />
        <div className="hero-overlay" />

        {/* Stars */}
        <div className="star-field" aria-hidden="true">
          {STARS.map((s, i) => (
            <span key={i} className="star" style={{ top: s.top, left: s.left, fontSize: s.size, '--delay': s.delay, '--dur': s.dur } as React.CSSProperties}>
              ★
            </span>
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">{t.eyebrow[lang]}</div>
          <h1 className="hero-title">
            {t.title1[lang]}<br /><em>{t.title2[lang]}</em>
          </h1>
          <div className="hero-tagline">{t.tagline[lang]}</div>
          <div className="hero-rule" />
          <p className="hero-sub">{t.sub[lang]}</p>
          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              {t.postBtn[lang]}
            </button>
            <a href="#listings" className="btn-outline">{t.browseBtn[lang]}</a>
          </div>
        </div>
      </section>

      {/* ── SEARCH ── */}
      <div className="search-section">
        <div className="search-bar">
          <div className="search-group">
            <label>{t.brandLabel[lang]}</label>
            <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
              {BRANDS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="search-group">
            <label>{t.condLabel[lang]}</label>
            <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}>
              {CONDITIONS.map(c => (
                <option key={c} value={c} style={{ textTransform: 'capitalize' }}>
                  {lang === 'en' ? c.charAt(0).toUpperCase() + c.slice(1) : c === 'All Conditions' ? 'Todas las Condiciones' : c === 'excellent' ? 'Excelente' : c === 'good' ? 'Bueno' : c === 'fair' ? 'Regular' : 'Solo Piezas'}
                </option>
              ))}
            </select>
          </div>
          <div className="search-group">
            <label>{t.priceLabel[lang]}</label>
            <select value={filterMaxPrice} onChange={e => setFilterMaxPrice(e.target.value)}>
              {PRICE_MAX.map(p => (
                <option key={p} value={p}>{p === 'Any Price' ? (lang === 'en' ? 'Any Price' : 'Cualquier Precio') : `$${parseInt(p).toLocaleString()}`}</option>
              ))}
            </select>
          </div>
          <div className="search-group">
            <label>{lang === 'en' ? 'KEYWORD' : 'PALABRA CLAVE'}</label>
            <input
              type="text"
              placeholder={t.searchPlaceholder[lang]}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
          <button className="search-btn" onClick={() => {}}>
            {t.searchBtn[lang]}
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="stats-inner">
          <div className="stat-item">
            <div className="stat-number">500+</div>
            <div className="stat-label">{lang === 'en' ? 'Bikes Listed' : 'Motos Publicadas'}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">7</div>
            <div className="stat-label">{lang === 'en' ? 'Days Avg Sold' : 'Días Prom. Vendida'}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">NC</div>
            <div className="stat-label">{lang === 'en' ? 'Home Base' : 'Base'}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">★★★★★</div>
            <div className="stat-label">{lang === 'en' ? 'Seller Reviews' : 'Reseñas'}</div>
          </div>
        </div>
      </div>

      {/* ── LISTINGS ── */}
      <div id="listings" style={{ background: 'var(--bg-primary)', padding: '80px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-header">
            <div className="section-eyebrow">★ {lang === 'en' ? 'AVAILABLE NOW' : 'DISPONIBLE AHORA'} ★</div>
            <h2 className="section-title">{t.listingsTitle[lang]}</h2>
            <p className="section-sub">{t.listingsSub[lang]}</p>
          </div>

          {displayBikes.length === 0 ? (
            <div className="empty-state">
              <h3>{t.noBikes[lang]}</h3>
            </div>
          ) : (
            <div className="listings-grid">
              {displayBikes.map(bike => (
                <a key={bike.id} href={`/bike/${bike.id}`} className="listing-card">
                  <div className="listing-img-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bike.image_urls?.[0] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop'}
                      alt={`${bike.year} ${bike.brand} ${bike.model}`}
                      className="listing-img"
                    />
                    {bike.badge && (
                      <span className={`badge badge-${bike.badge}`}>
                        {bike.badge === 'hot' ? '🔥 HOT' : bike.badge === 'new' ? '★ NEW' : bike.badge.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="listing-body">
                    <div className="listing-price">{formatPrice(bike.price_cents)}</div>
                    <div className="listing-title">{bike.year} {bike.brand} {bike.model}</div>
                    <div className="listing-details">
                      <span className={conditionClass(bike.condition)}>
                        {lang === 'en' ? bike.condition : bike.condition === 'excellent' ? 'Excelente' : bike.condition === 'good' ? 'Bueno' : bike.condition === 'fair' ? 'Regular' : 'Piezas'}
                      </span>
                      {bike.hours_ridden && (
                        <span className="listing-pill" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                          {bike.hours_ridden}{lang === 'en' ? ' hrs' : ' hrs'}
                        </span>
                      )}
                    </div>
                    <div className="listing-footer">
                      <span className="listing-location">📍 {bike.location}</span>
                      <span className="listing-cta">{t.viewDetails[lang]}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div id="how" className="section-full">
        <div className="section-full-inner">
          <div className="section-header">
            <div className="section-eyebrow">★ {lang === 'en' ? 'SIMPLE PROCESS' : 'PROCESO SIMPLE'} ★</div>
            <h2 className="section-title">{t.howTitle[lang]}</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <div className="step-icon">📋</div>
              <div className="step-title">{t.step1Title[lang]}</div>
              <p className="step-desc">{t.step1Desc[lang]}</p>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <div className="step-icon">📱</div>
              <div className="step-title">{t.step2Title[lang]}</div>
              <p className="step-desc">{t.step2Desc[lang]}</p>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <div className="step-icon">💰</div>
              <div className="step-title">{t.step3Title[lang]}</div>
              <p className="step-desc">{t.step3Desc[lang]}</p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              {lang === 'en' ? '★ LIST YOUR BIKE FREE ★' : '★ PUBLICA TU MOTO GRATIS ★'}
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-brand">DUST<span>DEVIL</span></div>
              <p className="footer-copy">{t.footerSub[lang]}</p>
            </div>
            <div>
              <div className="footer-col-title">{lang === 'en' ? 'MARKETPLACE' : 'MERCADO'}</div>
              <ul className="footer-links">
                <li><a href="#listings">{lang === 'en' ? 'Browse Bikes' : 'Ver Motos'}</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); setShowModal(true) }}>{lang === 'en' ? 'Post a Listing' : 'Publicar Anuncio'}</a></li>
                <li><a href="/qr">{lang === 'en' ? 'QR Code' : 'Código QR'}</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">{lang === 'en' ? 'INFO' : 'INFO'}</div>
              <ul className="footer-links">
                <li><a href="#how">{lang === 'en' ? 'How It Works' : 'Cómo Funciona'}</a></li>
                <li><a href="https://bluetubetv.com" target="_blank" rel="noopener">BlueTubeTV</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 DUSTDEVIL. {lang === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}</span>
            <span>Wilmington, NC</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
