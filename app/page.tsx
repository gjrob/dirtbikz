'use client';

import { useState, useEffect } from 'react';
import ReservationModal from './components/ReservationModal';

/* ─── MENU DATA ─── */
const MENU_CATEGORIES = [
  'All', 'Appetizers', 'Soups & Salads', 'Thai & Chinese Stir-Fry', 'Thai Curry',
  'Chef Specialties', 'Japanese Hibachi', 'Sushi Rolls', 'Specialty Sushi Rolls',
  'Bento Box', 'Desserts'
];

const MENU_ITEMS = [
  // Appetizers
  { cat: 'Appetizers', name: 'Pan Fried Dumplings', desc: 'Pan-fried to a crispy golden exterior', price: '$11.23', badge: '#1 Most Liked' },
  { cat: 'Appetizers', name: 'Appetizer Sampler', desc: 'Shrimp wraps (2), crab wonton (2), steamed dumpling (4), spring rolls (2)', price: '$17.24' },
  { cat: 'Appetizers', name: 'Gai Satay', desc: 'Thai chicken skewers in yellow curry with cucumber salad & peanut sauce', price: '$11.23' },
  { cat: 'Appetizers', name: 'Banpei Shrimp', desc: 'Lightly battered shrimp with spicy mayo & sweet chili, topped with scallions', price: '$12.48' },
  { cat: 'Appetizers', name: 'Crab Wonton', desc: 'Crab, red onions & cream cheese filled wontons', price: '$8.73', badge: '86% liked' },
  { cat: 'Appetizers', name: 'Shrimp Tempura', desc: '7 crispy pieces', price: '$12.49' },
  { cat: 'Appetizers', name: 'Steamed Dumplings', desc: 'Pork dumplings with ginger sauce', price: '$11.23', badge: '100% liked' },
  { cat: 'Appetizers', name: 'Edamame', desc: 'Boiled soybeans in their pods', price: '$11.23' },

  // Soups & Salads
  { cat: 'Soups & Salads', name: 'Miso Soup', desc: 'Traditional Japanese miso paste soup', price: '$5.11', badge: '100% liked' },
  { cat: 'Soups & Salads', name: 'Thom Kha Soup', desc: 'Thai coconut soup with Thai peppers, tomatoes, mushrooms & onions', price: '$8.49' },
  { cat: 'Soups & Salads', name: 'Hot & Sour Soup', desc: 'Savory balance of spicy and tangy flavors', price: '$5.73', badge: 'Popular' },
  { cat: 'Soups & Salads', name: 'Larb Gai Salad', desc: 'Spicy Thai chicken salad with basil, rice powder, chili & lime juice', price: '$7.99' },
  { cat: 'Soups & Salads', name: 'Seafood Noodle Soup', desc: 'Egg noodle soup with crabsticks, shrimp, scallops & veggies', price: '$12.99' },

  // Thai & Chinese Stir-Fry
  { cat: 'Thai & Chinese Stir-Fry', name: 'Pad Thai', desc: 'Rice noodles in sweet tamarind sauce with red onions, tofu & peanuts', price: '$12.99', badge: 'Signature' },
  { cat: 'Thai & Chinese Stir-Fry', name: 'Pad Kee Mao', desc: 'Drunken noodles with basil, Thai chili, broccoli, carrots & red pepper', price: '$12.99', badge: 'Fan Favorite' },
  { cat: 'Thai & Chinese Stir-Fry', name: 'Pad See Ewe', desc: 'Wide rice noodles in sweet dark soy with broccoli, eggs & carrots', price: '$12.99' },
  { cat: 'Thai & Chinese Stir-Fry', name: 'General Tso\'s', desc: 'Sweet & spicy sauce with broccoli, onions & carrots', price: '$11.99' },
  { cat: 'Thai & Chinese Stir-Fry', name: 'Thai Basil Fried Rice', desc: 'With fresh Thai peppers, basil, onions, eggs & fish sauce', price: '$12.99' },
  { cat: 'Thai & Chinese Stir-Fry', name: 'Lo Mein', desc: 'Egg noodles with broccoli, carrots, bean sprouts & egg', price: '$12.99' },
  { cat: 'Thai & Chinese Stir-Fry', name: 'Pineapple Fried Rice', desc: 'Curry powder, red peppers, onions, pineapple, eggs & peanuts', price: '$12.99' },

  // Thai Curry
  { cat: 'Thai Curry', name: 'Red Curry', desc: 'Red Thai chili peppers with coconut milk, bamboo & zucchini. Topped with basil', price: '$12.99', badge: 'Best in Wilmington' },
  { cat: 'Thai Curry', name: 'Green Curry', desc: 'Green chili peppers with coconut milk, bamboo & zucchini. Fresh basil', price: '$12.99' },
  { cat: 'Thai Curry', name: 'Masaman Curry', desc: 'Sweet Thai peanut curry with potato, carrots & coconut milk', price: '$12.99', badge: 'Fan Favorite' },
  { cat: 'Thai Curry', name: 'Penang Curry', desc: 'Yellow & red chili peppers with coconut milk, zucchini & carrots', price: '$12.99' },

  // Chef Specialties
  { cat: 'Chef Specialties', name: 'Gang Talay', desc: 'Seafood curry with shrimp, scallops, mussels, soft shell crab & calamari', price: '$22.99', badge: 'Premium' },
  { cat: 'Chef Specialties', name: 'Pla Sam Rod', desc: '3 Flavored Fish — crispy tilapia in sweet, spicy & sour tomato sauce', price: '$13.99' },
  { cat: 'Chef Specialties', name: 'Sweet Thai Chili Chicken', desc: 'Lightly fried chicken with sweet Thai chili sauce, basil & cilantro', price: '$11.99' },
  { cat: 'Chef Specialties', name: 'Crab Fried Rice', desc: 'Stir fried rice with crab meat, egg, onions & scallions', price: '$14.99' },
  { cat: 'Chef Specialties', name: 'Kiss of the Dragon', desc: 'Batter fried chicken in spicy sweet & sour sauce with vegetables', price: '$12.99' },
  { cat: 'Chef Specialties', name: 'Orange Chicken', desc: 'Lightly fried with mixed vegetables & sweet orange flavored sauce', price: '$12.99' },

  // Japanese Hibachi
  { cat: 'Japanese Hibachi', name: 'Hibachi Chicken', desc: 'Grilled chicken with fried rice & stir-fried vegetables', price: '$11.99', badge: 'GF Available' },
  { cat: 'Japanese Hibachi', name: 'Hibachi Steak', desc: 'Grilled steak with fried rice & stir-fried vegetables', price: '$11.95', badge: 'GF Available' },
  { cat: 'Japanese Hibachi', name: 'Hibachi Steak & Shrimp', desc: 'Combo with fried rice & stir-fried vegetables', price: '$13.95' },
  { cat: 'Japanese Hibachi', name: 'Hibachi Salmon', desc: 'Grilled salmon with fried rice & stir-fried vegetables', price: '$14.95' },
  { cat: 'Japanese Hibachi', name: 'Hibachi Steak & Chicken', desc: 'Combo with fried rice & stir-fried vegetables', price: '$11.95' },

  // Sushi Rolls
  { cat: 'Sushi Rolls', name: 'California Roll', desc: '', price: '$4.95' },
  { cat: 'Sushi Rolls', name: 'Spicy Tuna Roll', desc: '', price: '$5.25' },
  { cat: 'Sushi Rolls', name: 'Rainbow Roll', desc: 'Crab & cucumber topped with salmon, tuna & avocado', price: '$9.95' },
  { cat: 'Sushi Rolls', name: 'Spider Roll', desc: 'Soft-shell crab, cucumber, avocado, masago & eel sauce', price: '$8.95' },
  { cat: 'Sushi Rolls', name: 'Shrimp Tempura Roll', desc: '', price: '$5.95' },
  { cat: 'Sushi Rolls', name: 'Carolina Roll', desc: 'Salmon, tuna & cucumber', price: '$8.95' },

  // Specialty Sushi Rolls
  { cat: 'Specialty Sushi Rolls', name: 'Why Not Roll', desc: 'Shrimp tempura, cream cheese, cucumber topped with salmon, tuna, avocado & white sauce', price: '$15.00', badge: 'Premium' },
  { cat: 'Specialty Sushi Rolls', name: 'Vegas Roll', desc: 'Deep fried salmon & cream cheese with spicy mayo & eel sauce', price: '$8.00', badge: 'Fan Favorite' },
  { cat: 'Specialty Sushi Rolls', name: 'Wilmington Roll', desc: 'Shrimp tempura & cream cheese topped with avocado & spicy mayo', price: '$10.00', badge: 'Local Favorite' },
  { cat: 'Specialty Sushi Rolls', name: 'Dragon Roll', desc: 'Eel & cucumber topped with avocado, eel sauce & masago', price: '$10.00' },
  { cat: 'Specialty Sushi Rolls', name: 'UNCW Roll', desc: 'Shrimp tempura & cream cheese with eel sauce, tempura flakes, spicy crab & masago', price: '$10.00', badge: 'Local Favorite' },
  { cat: 'Specialty Sushi Rolls', name: 'Seahawk Roll', desc: 'Shrimp & avocado with spicy tuna, tempura flakes & masago', price: '$11.00' },
  { cat: 'Specialty Sushi Rolls', name: 'Sapporo Roll', desc: 'Tuna & cucumber topped with spicy tuna, tempura flakes & avocado', price: '$11.00' },
  { cat: 'Specialty Sushi Rolls', name: 'Paradise Roll', desc: 'Shrimp tempura & cream cheese topped with mango & spicy tuna', price: '$12.00' },

  // Bento Box
  { cat: 'Bento Box', name: 'Tempura Bento Box', desc: 'Shrimp & vegetables tempura', price: '$12.99' },
  { cat: 'Bento Box', name: 'Broccoli Bento', desc: 'Beef or chicken with broccoli', price: '$12.99' },
  { cat: 'Bento Box', name: 'Sesame Chicken Bento', desc: '', price: '$12.99' },
  { cat: 'Bento Box', name: 'Hibachi Chicken Bento', desc: '', price: '$11.99' },

  // Desserts
  { cat: 'Desserts', name: 'Tempura Ice Cream', desc: 'Vanilla ice cream wrapped in pound cake, fried with tempura flour & chocolate', price: '$5.99' },
  { cat: 'Desserts', name: 'The Sweet Tooth', desc: 'Fried ice cream, fried bananas & golden toast', price: '$10.99' },
  { cat: 'Desserts', name: 'Golden Toast', desc: 'Crispy wrap with sweet cream cheese & ice cream', price: '$4.99' },
  { cat: 'Desserts', name: 'Fried Banana', desc: 'Tempura fried banana with chocolate syrup or honey', price: '$2.99' },
];

const REVIEWS = [
  { text: 'Best Asian all-around restaurant in town, and has remained consistent.', author: 'TripAdvisor Reviewer', stars: 5, source: 'TripAdvisor' },
  { text: 'Really great Asian and I love the menu variety!', author: 'Anna B.', stars: 5, source: 'Uber Eats' },
  { text: 'Best Hibachi I\'ve ever had. Everything was cooked perfectly.', author: 'TripAdvisor Reviewer', stars: 5, source: 'TripAdvisor' },
  { text: 'The owner is on site most of the time and when it\'s yours you care the most.', author: 'Google Reviewer', stars: 5, source: 'Google' },
  { text: 'Incredible Gluten-Free options for super sensitive diners. Staff is so knowledgeable!', author: 'Celiac Diner', stars: 5, source: 'FindMeGlutenFree' },
  { text: 'Kyoto\'s curries will beat Indochine\'s. Staff has always been so friendly.', author: 'Regular Customer', stars: 5, source: 'TripAdvisor' },
];

const PETAL_CONFIG = [
  { left: '5%',  duration: '9s',  delay: '0s' },
  { left: '12%', duration: '12s', delay: '2s' },
  { left: '23%', duration: '8s',  delay: '4s' },
  { left: '35%', duration: '14s', delay: '1s' },
  { left: '47%', duration: '11s', delay: '6s' },
  { left: '58%', duration: '10s', delay: '3s' },
  { left: '67%', duration: '13s', delay: '7s' },
  { left: '76%', duration: '9s',  delay: '5s' },
  { left: '85%', duration: '15s', delay: '2s' },
  { left: '93%', duration: '11s', delay: '8s' },
];

function getCategoryImage(cat: string, name: string): string | null {
  const lower = name.toLowerCase();
  if (cat === 'Desserts') return '/ref/dessert.png';
  if (cat === 'Soups & Salads') return '/ref/soup.png';
  if (cat === 'Sushi Rolls' || cat === 'Specialty Sushi Rolls') return '/ref/suschi.png';
  if (lower.includes('fried rice')) return '/ref/friedrice.png';
  if (lower.includes('chicken') || lower.includes('gai')) return '/ref/chicken.png';
  return null;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeCat, setActiveCat] = useState('All');
  const [showReservation, setShowReservation] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filtered = activeCat === 'All' ? MENU_ITEMS : MENU_ITEMS.filter(i => i.cat === activeCat);

  return (
    <>
      {/* NAV */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="#" className="nav-brand">Kyoto <span>京都</span></a>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#menu">Menu</a></li>
          <li><a href="#reviews">Reviews</a></li>
          <li><a href="#info">Hours & Location</a></li>
          <li>
            <button onClick={() => setShowReservation(true)} style={{ background: 'none', border: 'none', color: '#b8929a', cursor: 'pointer', fontSize: 'inherit', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 400, padding: 0, transition: 'color 0.3s' }} onMouseEnter={e => (e.currentTarget.style.color = '#e8a0b0')} onMouseLeave={e => (e.currentTarget.style.color = '#b8929a')}>
              Reservations
            </button>
          </li>
          <li><a href="https://kyotoasiangrille.cloveronline.com/" target="_blank" rel="noopener" className="nav-cta">Order Online</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="hero">
        {PETAL_CONFIG.map((p, i) => (
          <div
            key={i}
            className="petal"
            style={{ left: p.left, animationDuration: p.duration, animationDelay: p.delay }}
          />
        ))}
        <div className="hero-content">
          <div className="hero-kanji">京都</div>
          <h1>Kyoto <span>Asian Grille</span></h1>
          <p className="hero-tagline">Nothing in the freezer but the ice cream — since 2012</p>
          <div className="hero-details">
            <div className="hero-detail">
              <span className="hero-detail-label">Location</span>
              <span className="hero-detail-value">4102 Market Street</span>
            </div>
            <div className="hero-detail">
              <span className="hero-detail-label">Phone</span>
              <span className="hero-detail-value">(910) 332-3302</span>
            </div>
            <div className="hero-detail">
              <span className="hero-detail-label">Hours</span>
              <span className="hero-detail-value">Mon–Sat 11am–9:30pm</span>
            </div>
          </div>
          <div className="hero-ctas">
            <a href="https://kyotoasiangrille.cloveronline.com/" target="_blank" rel="noopener" className="btn-primary">
              🥢 Order Online
            </a>
            <a href="#menu" className="btn-secondary">
              View Full Menu
            </a>
            <a href="tel:+19103323302" className="btn-secondary">
              📞 Call Now
            </a>
            <button
              onClick={() => setShowReservation(true)}
              style={{
                padding: '0.85rem 2rem',
                background: 'transparent',
                border: '1px solid #e8a0b0',
                borderRadius: '2px',
                color: '#e8a0b0',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,160,176,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              🌸 Reserve a Table
            </button>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-section" id="about">
        <div className="about-grid">
          <div className="about-text">
            <span className="section-label">Our Story</span>
            <h2 className="section-title">Where East Meets South</h2>
            <p>
              Kyoto Asian Grille brings the vibrant flavors of Japan, Thailand, and China to
              Wilmington's Market Street corridor. Every dish is crafted from scratch with the freshest
              ingredients — our chef uses no freezers, no shortcuts, and no compromises.
            </p>
            <p>
              From sizzling hibachi grilled tableside to handcrafted sushi rolls, authentic Thai curries
              to classic Chinese stir-fry, our extensive menu of 135+ dishes offers something for every
              palate. We're proudly owner-operated, and our commitment shows in every plate.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <span className="gf-badge" style={{ display: 'inline-flex', padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>
                🌿 Gluten-Free Friendly
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                Dedicated GF prep area. Top-rated on FindMeGlutenFree.
              </span>
            </p>
          </div>
          <div className="about-stats">
            <div className="stat-card">
              <div className="stat-number">4.6</div>
              <div className="stat-label">Google Rating</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">281+</div>
              <div className="stat-label">Google Reviews</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">135+</div>
              <div className="stat-label">Menu Items</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">#86</div>
              <div className="stat-label">of 582 on TripAdvisor</div>
            </div>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section className="menu-section" id="menu">
        <div className="menu-container">
          <div style={{ textAlign: 'center' }}>
            <span className="section-label">Our Menu</span>
            <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>Taste the Tradition</h2>
            <p className="section-subtitle" style={{ margin: '0 auto 2rem' }}>
              Sushi · Hibachi · Thai · Chinese · 135+ dishes crafted fresh daily
            </p>
          </div>

          <div className="menu-categories">
            {MENU_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`menu-cat-btn ${activeCat === cat ? 'active' : ''}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="menu-grid">
            {filtered.map((item, i) => {
              const itemImg = getCategoryImage(item.cat, item.name);
              return (
                <div className="menu-item" key={i}>
                  <div className="menu-item-text">
                    <div className="menu-item-name">{item.name}</div>
                    {item.desc && <div className="menu-item-desc">{item.desc}</div>}
                    {item.badge && <span className="menu-item-badge">{item.badge}</span>}
                  </div>
                  <div className="menu-item-right">
                    {itemImg && <img src={itemImg} alt="" className="menu-item-img" />}
                    <div className="menu-item-price">{item.price}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <a href="https://kyotoasiangrille.cloveronline.com/" target="_blank" rel="noopener" className="btn-primary">
              🥢 Order Online Now
            </a>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="reviews-section" id="reviews">
        <div className="reviews-container">
          <div style={{ textAlign: 'center' }}>
            <span className="section-label">Reviews</span>
            <h2 className="section-title">What Wilmington Says</h2>
            <div className="divider"><span>◆</span></div>
          </div>

          <div className="reviews-grid">
            {REVIEWS.map((r, i) => (
              <div className="review-card" key={i}>
                <div className="review-stars">{'★'.repeat(r.stars)}</div>
                <div className="review-text">"{r.text}"</div>
                <div className="review-author">{r.author}</div>
                <div className="review-source">{r.source}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INFO BAR */}
      <section className="info-bar" id="info">
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon">📍</div>
            <div className="info-label">Location</div>
            <div className="info-value">
              <a href="https://maps.google.com/?q=4102+Market+St+Wilmington+NC" target="_blank" rel="noopener">
                4102 Market Street<br/>Wilmington, NC 28403
              </a>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">📞</div>
            <div className="info-label">Phone</div>
            <div className="info-value">
              <a href="tel:+19103323302">(910) 332-3302</a>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">🕐</div>
            <div className="info-label">Lunch</div>
            <div className="info-value">Mon–Sat 11am–3pm</div>
          </div>
          <div className="info-card">
            <div className="info-icon">🌙</div>
            <div className="info-label">Dinner</div>
            <div className="info-value">Mon–Sat 5pm–9:30pm</div>
          </div>
          <div className="info-card">
            <div className="info-icon">🚫</div>
            <div className="info-label">Closed</div>
            <div className="info-value">Sunday</div>
          </div>
        </div>
      </section>

      <ReservationModal isOpen={showReservation} onClose={() => setShowReservation(false)} />

      {/* FOOTER */}
      <footer>
        <p>
          © 2026 Kyoto Asian Grille — 4102 Market Street, Wilmington, NC 28403 —{' '}
          <a href="tel:+19103323302">(910) 332-3302</a>
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>
          <a href="https://www.instagram.com/kyotoasiangrille" target="_blank" rel="noopener">Instagram</a>
          {' · '}
          <a href="https://www.facebook.com/KyotoAsianGrille" target="_blank" rel="noopener">Facebook</a>
          {' · '}
          <a href="https://kyotoasiangrille.cloveronline.com/" target="_blank" rel="noopener">Order Online</a>
        </p>
      </footer>
    </>
  );
}
