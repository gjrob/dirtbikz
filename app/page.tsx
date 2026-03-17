'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import ChatBot from './components/ChatBot'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  category: string
  brand?: string
  model?: string
  year?: number
  description?: string
  primary_image_url?: string
  price_cents: number
  original_price_cents?: number
  location?: string
  in_stock: boolean
  featured: boolean
}

interface CartItem {
  product: Product
  quantity: number
}

// ── Sample data (shown when DB is empty / not configured) ─────────────────────

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 's1',
    name: '2023 Honda CRF250R',
    category: 'dirt-bike',
    brand: 'Honda',
    model: 'CRF250R',
    year: 2023,
    description: 'Competition-ready motocross bike. Excellent condition, low hours.',
    primary_image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    price_cents: 699900,
    location: 'NC',
    in_stock: true,
    featured: true,
  },
  {
    id: 's2',
    name: '2022 Yamaha YFZ450R',
    category: 'atv',
    brand: 'Yamaha',
    model: 'YFZ450R',
    year: 2022,
    description: 'Sport ATV, race-ready. New tires, fresh service.',
    primary_image_url: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=600&q=80',
    price_cents: 899900,
    location: 'SC',
    in_stock: true,
    featured: true,
  },
  {
    id: 's3',
    name: '2021 Polaris RZR XP 1000',
    category: 'side-by-side',
    brand: 'Polaris',
    model: 'RZR XP 1000',
    year: 2021,
    description: 'Trail-ready side-by-side with full cage, winch, and LED bar.',
    primary_image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&q=80',
    price_cents: 1549900,
    original_price_cents: 1699900,
    location: 'GA',
    in_stock: true,
    featured: false,
  },
  {
    id: 's4',
    name: '2023 TrailMaster 300X Go-Cart',
    category: 'go-cart',
    brand: 'TrailMaster',
    model: '300X',
    year: 2023,
    description: 'Adult-sized go-cart, perfect for trails and tracks.',
    primary_image_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80',
    price_cents: 249900,
    location: 'NC',
    in_stock: true,
    featured: false,
  },
  {
    id: 's5',
    name: 'ProX Top End Rebuild Kit — KTM 250',
    category: 'parts',
    brand: 'ProX',
    model: 'KTM 250 Top End Kit',
    description: 'Complete piston, rings, gaskets. Fits KTM 250 EXC 2018-2023.',
    primary_image_url: 'https://images.unsplash.com/photo-1530979788-b6892a39a7fe?w=600&q=80',
    price_cents: 18900,
    location: 'NC',
    in_stock: true,
    featured: false,
  },
  {
    id: 's6',
    name: '2022 CFMOTO UFORCE 1000',
    category: '4-wheeler',
    brand: 'CFMOTO',
    model: 'UFORCE 1000',
    year: 2022,
    description: 'Utility ATV with dump bed, 2" receiver hitch, highway ready.',
    primary_image_url: 'https://images.unsplash.com/photo-1558981285-501cd9af9426?w=600&q=80',
    price_cents: 1099900,
    location: 'SC',
    in_stock: true,
    featured: false,
  },
]

// ── Categories ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: 'all',          label: { en: 'All',           es: 'Todo' },         icon: '🏍️' },
  { slug: 'dirt-bike',    label: { en: 'Dirt Bikes',    es: 'Motos de Tierra'}, icon: '🏁' },
  { slug: 'atv',          label: { en: 'ATVs',          es: 'ATVs' },          icon: '🛞' },
  { slug: 'side-by-side', label: { en: 'Side-by-Sides', es: 'Side-by-Sides' }, icon: '🚗' },
  { slug: 'go-cart',      label: { en: 'Go-Carts',      es: 'Go-Karts' },      icon: '🏎️' },
  { slug: '4-wheeler',    label: { en: '4-Wheelers',    es: '4 Ruedas' },      icon: '🛻' },
  { slug: 'fold-cart',    label: { en: 'Fold Carts',    es: 'Carros Plegables'},icon: '🛒' },
  { slug: 'parts',        label: { en: 'Parts',         es: 'Partes' },        icon: '🔧' },
]

const LOCATIONS = ['All', 'NC', 'SC', 'GA']

// ── Translations ──────────────────────────────────────────────────────────────

const t = {
  tagline:      { en: 'Buy. Sell. Parts.',       es: 'Compra. Vende. Partes.' },
  shopNow:      { en: 'SHOP NOW',                es: 'COMPRAR' },
  filterBy:     { en: 'Filter by location',      es: 'Filtrar por ubicación' },
  addToCart:    { en: 'ADD TO CART',             es: 'AÑADIR' },
  outOfStock:   { en: 'OUT OF STOCK',            es: 'AGOTADO' },
  cart:         { en: 'Cart',                    es: 'Carrito' },
  cartEmpty:    { en: 'Your cart is empty',      es: 'Tu carrito está vacío' },
  checkout:     { en: 'CHECKOUT',                es: 'PAGAR' },
  total:        { en: 'Total',                   es: 'Total' },
  featured:     { en: 'FEATURED',                es: 'DESTACADO' },
  sale:         { en: 'SALE',                    es: 'OFERTA' },
  contactUs:    { en: 'Contact Us',              es: 'Contáctenos' },
  phone:        { en: 'Call or text',            es: 'Llama o escribe' },
  locations:    { en: 'Locations',               es: 'Ubicaciones' },
  checkoutTitle:{ en: 'Checkout',                es: 'Pagar' },
  yourInfo:     { en: 'Your Information',        es: 'Tu Información' },
  firstName:    { en: 'First Name',              es: 'Nombre' },
  lastName:     { en: 'Last Name',               es: 'Apellido' },
  email:        { en: 'Email',                   es: 'Correo' },
  phone2:       { en: 'Phone',                   es: 'Teléfono' },
  placeOrder:   { en: 'PLACE ORDER',             es: 'REALIZAR PEDIDO' },
  processing:   { en: 'Processing...',           es: 'Procesando...' },
  close:        { en: 'Close',                   es: 'Cerrar' },
  remove:       { en: 'Remove',                  es: 'Quitar' },
  noProducts:   { en: 'No products found in this category.',
                  es: 'No se encontraron productos en esta categoría.' },
  heroSub:      { en: 'NC · SC · GA — In-person & Online',
                  es: 'NC · SC · GA — En persona y en línea' },
  statsVehicles:{ en: 'Vehicles',    es: 'Vehículos' },
  statsLocations:{ en: 'Locations', es: 'Ubicaciones' },
  statsYears:   { en: 'Years Selling', es: 'Años Vendiendo' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export default function DirtBikzHome() {
  const [lang, setLang] = useState<'en' | 'es'>('en')
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS)
  const [activeCat, setActiveCat] = useState('all')
  const [activeLoc, setActiveLoc] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const shopRef = useRef<HTMLDivElement>(null)

  // Form state
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('client_slug', 'dirtbikz')
        .eq('in_stock', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
      if (data && data.length > 0) setProducts(data)
    }
    load()
  }, [])

  // Filtered products
  const filtered = products.filter(p => {
    const catMatch = activeCat === 'all' || p.category === activeCat
    const locMatch = activeLoc === 'All' || p.location === activeLoc
    return catMatch && locMatch
  })

  // Cart helpers
  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    setCartOpen(true)
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.product.id !== id))
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price_cents * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ product_id: i.product.id, name: i.product.name, price_cents: i.product.price_cents, quantity: i.quantity })),
          customer: { name: `${form.firstName} ${form.lastName}`, email: form.email, phone: form.phone },
        }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      alert('Something went wrong. Please call (910) 555-0100.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <>
      {/* ── NAV ── */}
      <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
        <div className="nav__inner">
          <a href="#shop" className="nav__logo">DIRTBIKZ</a>
          <div className="nav__links">
            <a href="#shop"      onClick={() => setActiveCat('all')}>
              {lang === 'en' ? 'Shop' : 'Tienda'}
            </a>
            <a href="#categories">
              {lang === 'en' ? 'Categories' : 'Categorías'}
            </a>
            <a href="#contact">
              {lang === 'en' ? 'Contact' : 'Contacto'}
            </a>
            <button className="nav__lang" onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}>
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
            <button className="nav__cart-btn" onClick={() => setCartOpen(true)}>
              🛒
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero__overlay" />
        <div className="hero__content">
          <p className="hero__eyebrow">DIRTBIKZ</p>
          <h1 className="hero__title">
            {lang === 'en' ? 'Dirt Bikes, ATVs\n& More' : 'Motos de Tierra,\nATVs y Más'}
          </h1>
          <p className="hero__tagline">{t.tagline[lang]}</p>
          <p className="hero__sub">{t.heroSub[lang]}</p>
          <button
            className="btn btn--primary hero__cta"
            onClick={() => shopRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t.shopNow[lang]}
          </button>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="stat"><span className="stat__num">500+</span><span className="stat__label">{t.statsVehicles[lang]}</span></div>
        <div className="stat"><span className="stat__num">3</span><span className="stat__label">{t.statsLocations[lang]}</span></div>
        <div className="stat"><span className="stat__num">10+</span><span className="stat__label">{t.statsYears[lang]}</span></div>
      </div>

      {/* ── CATEGORY GRID ── */}
      <section id="categories" className="section">
        <div className="container">
          <h2 className="section__title">
            {lang === 'en' ? 'Shop by Category' : 'Comprar por Categoría'}
          </h2>
          <div className="category-grid">
            {CATEGORIES.filter(c => c.slug !== 'all').map(cat => (
              <button
                key={cat.slug}
                className={`category-card${activeCat === cat.slug ? ' category-card--active' : ''}`}
                onClick={() => {
                  setActiveCat(cat.slug)
                  shopRef.current?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="category-card__icon">{cat.icon}</span>
                <span className="category-card__label">{cat.label[lang]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT GRID ── */}
      <section id="shop" ref={shopRef} className="section section--dark">
        <div className="container">
          <h2 className="section__title">
            {lang === 'en' ? 'Inventory' : 'Inventario'}
          </h2>

          {/* Filters */}
          <div className="filters">
            <div className="filters__cats">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.slug}
                  className={`filter-btn${activeCat === cat.slug ? ' filter-btn--active' : ''}`}
                  onClick={() => setActiveCat(cat.slug)}
                >
                  {cat.label[lang]}
                </button>
              ))}
            </div>
            <div className="filters__locs">
              {LOCATIONS.map(loc => (
                <button
                  key={loc}
                  className={`filter-btn${activeLoc === loc ? ' filter-btn--active' : ''}`}
                  onClick={() => setActiveLoc(loc)}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <p className="no-results">{t.noProducts[lang]}</p>
          ) : (
            <div className="product-grid">
              {filtered.map(product => (
                <div key={product.id} className="product-card">
                  {product.featured && (
                    <span className="badge badge--featured">{t.featured[lang]}</span>
                  )}
                  {product.original_price_cents && (
                    <span className="badge badge--sale">{t.sale[lang]}</span>
                  )}
                  <div className="product-card__img-wrap">
                    {product.primary_image_url ? (
                      <img
                        src={product.primary_image_url}
                        alt={product.name}
                        className="product-card__img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-card__img-placeholder">🏍️</div>
                    )}
                    {product.location && (
                      <span className="product-card__loc">{product.location}</span>
                    )}
                  </div>
                  <div className="product-card__body">
                    <p className="product-card__cat">
                      {CATEGORIES.find(c => c.slug === product.category)?.label[lang] || product.category}
                    </p>
                    <h3 className="product-card__name">{product.name}</h3>
                    {product.description && (
                      <p className="product-card__desc">{product.description}</p>
                    )}
                    <div className="product-card__footer">
                      <div className="product-card__price">
                        <span className="price--current">{fmt(product.price_cents)}</span>
                        {product.original_price_cents && (
                          <span className="price--original">{fmt(product.original_price_cents)}</span>
                        )}
                      </div>
                      <button
                        className={`btn${product.in_stock ? ' btn--primary' : ' btn--disabled'}`}
                        disabled={!product.in_stock}
                        onClick={() => addToCart(product)}
                      >
                        {product.in_stock ? t.addToCart[lang] : t.outOfStock[lang]}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="section section--contact">
        <div className="container contact-grid">
          <div className="contact-block">
            <h2 className="contact-block__title">{t.contactUs[lang]}</h2>
            <p className="contact-block__sub">{t.phone[lang]}: <strong>(910) 555-0100</strong></p>
            <p className="contact-block__sub">dirtbikz@example.com</p>
          </div>
          <div className="contact-block">
            <h2 className="contact-block__title">{t.locations[lang]}</h2>
            <p className="contact-block__sub">📍 Wilmington, NC</p>
            <p className="contact-block__sub">📍 Myrtle Beach, SC</p>
            <p className="contact-block__sub">📍 Savannah, GA</p>
          </div>
          <div className="contact-block">
            <h2 className="contact-block__title">Hours</h2>
            <p className="contact-block__sub">Mon–Sat: 9am – 6pm</p>
            <p className="contact-block__sub">Sunday: By appointment</p>
          </div>
        </div>
      </section>

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="cart-drawer__header">
              <h2>{t.cart[lang]} {cartCount > 0 ? `(${cartCount})` : ''}</h2>
              <button className="cart-drawer__close" onClick={() => setCartOpen(false)}>✕</button>
            </div>
            <div className="cart-drawer__items">
              {cart.length === 0 ? (
                <p className="cart-empty">{t.cartEmpty[lang]}</p>
              ) : cart.map(item => (
                <div key={item.product.id} className="cart-item">
                  {item.product.primary_image_url && (
                    <img src={item.product.primary_image_url} alt={item.product.name} className="cart-item__img" />
                  )}
                  <div className="cart-item__info">
                    <p className="cart-item__name">{item.product.name}</p>
                    <p className="cart-item__price">{fmt(item.product.price_cents)} × {item.quantity}</p>
                  </div>
                  <button className="cart-item__remove" onClick={() => removeFromCart(item.product.id)}>
                    {t.remove[lang]}
                  </button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="cart-drawer__footer">
                <div className="cart-total">
                  <span>{t.total[lang]}</span>
                  <span>{fmt(cartTotal)}</span>
                </div>
                <button className="btn btn--primary btn--full" onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>
                  {t.checkout[lang]}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL ── */}
      {checkoutOpen && (
        <div className="modal-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{t.checkoutTitle[lang]}</h2>
              <button className="modal__close" onClick={() => setCheckoutOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCheckout} className="checkout-form">
              <h3 className="checkout-form__section">{t.yourInfo[lang]}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.firstName[lang]}</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="form-group">
                  <label>{t.lastName[lang]}</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.email[lang]}</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="form-group">
                <label>{t.phone2[lang]}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(910) 555-0100"
                />
              </div>

              <div className="checkout-summary">
                {cart.map(item => (
                  <div key={item.product.id} className="checkout-summary__row">
                    <span>{item.product.name} × {item.quantity}</span>
                    <span>{fmt(item.product.price_cents * item.quantity)}</span>
                  </div>
                ))}
                <div className="checkout-summary__total">
                  <span>{t.total[lang]}</span>
                  <span>{fmt(cartTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={checkoutLoading}
              >
                {checkoutLoading ? t.processing[lang] : t.placeOrder[lang]}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: 'DIRTBIKZ',
          description: 'Dirt bikes, ATVs, side-by-sides, go-carts, and parts. NC · SC · GA.',
          telephone: '(910) 555-0100',
          address: { '@type': 'PostalAddress', addressLocality: 'Wilmington', addressRegion: 'NC', addressCountry: 'US' },
          url: 'https://dirtbikz.com',
          areaServed: ['Wilmington NC', 'Myrtle Beach SC', 'Savannah GA'],
        })}}
      />
    </>
  )
}
