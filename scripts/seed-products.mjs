// seed-products.mjs — inserts real DIRTBIKZ inventory
// Run: node scripts/seed-products.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = resolve(__dirname, '../.env.local')
const env = {}
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
})

const SUPABASE_URL      = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── Product data ───────────────────────────────────────────────────────────────
// Images are served from /products/*.jpg (Next.js public/)
const APP_URL = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'

const products = [
  {
    client_slug: 'dirtbikz',
    name: 'KTM 250 SX-F',
    category: 'dirt-bike',
    brand: 'KTM',
    model: '250 SX-F',
    year: 2023,
    description: 'Competition-ready 2-stroke dirt bike. Lightweight, responsive, and ready to race right off the lot.',
    primary_image_url: `${APP_URL}/products/ktm-250-sxf.jpg`,
    price_cents: 749900,
    location: 'NC',
    in_stock: true,
    featured: true,
  },
  {
    client_slug: 'dirtbikz',
    name: 'Yamaha YFZ450R',
    category: 'atv',
    brand: 'Yamaha',
    model: 'YFZ450R',
    year: 2022,
    description: 'Sport ATV built for the track. High-revving 450cc engine, aggressive stance, ready to shred.',
    primary_image_url: `${APP_URL}/products/yamaha-yfz450r.jpg`,
    price_cents: 899900,
    location: 'SC',
    in_stock: true,
    featured: true,
  },
  {
    client_slug: 'dirtbikz',
    name: 'Polaris RZR XP 1000',
    category: 'side-by-side',
    brand: 'Polaris',
    model: 'RZR XP 1000',
    year: 2021,
    description: 'Trail-ready side-by-side with full roll cage, 110hp engine, and Fox suspension. Dominate any terrain.',
    primary_image_url: `${APP_URL}/products/polaris-rzr-xp1000.jpg`,
    price_cents: 1549900,
    original_price_cents: 1699900,
    location: 'GA',
    in_stock: true,
    featured: false,
  },
  {
    client_slug: 'dirtbikz',
    name: 'Honda TRX250X',
    category: '4-wheeler',
    brand: 'Honda',
    model: 'TRX250X',
    year: 2023,
    description: 'Sporty, nimble 250cc 4-wheeler. Great for trails, fields, and casual riders of all ages.',
    primary_image_url: `${APP_URL}/products/honda-trx250x.jpg`,
    price_cents: 429900,
    location: 'NC',
    in_stock: true,
    featured: false,
  },
  {
    client_slug: 'dirtbikz',
    name: 'TrailMaster 300X Go-Cart',
    category: 'go-cart',
    brand: 'TrailMaster',
    model: '300X',
    year: 2023,
    description: 'Adult-sized go-cart with 300cc engine, full roll cage, and off-road tires. Perfect for trails and tracks.',
    primary_image_url: `${APP_URL}/products/trailmaster-300x.jpg`,
    price_cents: 249900,
    location: 'SC',
    in_stock: true,
    featured: false,
  },
  {
    client_slug: 'dirtbikz',
    name: 'Custom Chopper',
    category: 'other',
    brand: 'Custom Build',
    model: 'Cruiser',
    year: 2020,
    description: 'One-of-a-kind custom chopper. Hand-built cruiser with chrome accents, extended forks, and a thunderous V-twin.',
    primary_image_url: `${APP_URL}/products/custom-chopper.jpg`,
    price_cents: 1899900,
    location: 'GA',
    in_stock: true,
    featured: false,
  },
]

// ── Run ────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱  Seeding ${products.length} products to ${SUPABASE_URL}\n`)

  let inserted = 0
  let skipped  = 0

  for (const product of products) {
    // Check if already exists (by name + client_slug)
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('client_slug', 'dirtbikz')
      .eq('name', product.name)
      .single()

    if (existing) {
      console.log(`  ⏭️  Skipped (exists): ${product.name}`)
      skipped++
      continue
    }

    const { data, error } = await supabase.from('products').insert(product).select('id, name').single()
    if (error) {
      console.error(`  ❌  Failed: ${product.name} — ${error.message}`)
    } else {
      console.log(`  ✅  Inserted: ${data.name} (${data.id.slice(0, 8)}…)`)
      inserted++
    }
  }

  console.log(`\n✅  Done — ${inserted} inserted, ${skipped} skipped\n`)
}

seed().catch(err => { console.error(err); process.exit(1) })
