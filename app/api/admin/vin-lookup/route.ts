import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export const runtime = 'nodejs'

const NHTSA_API = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues'

interface NHTSAResult {
  Make: string
  Model: string
  ModelYear: string
  VehicleType: string
  BodyClass: string
  EngineModel: string
  EngineCylinders: string
  DisplacementL: string
  ErrorCode: string
  ErrorText: string
  MSRP: string
}

/** Validate VIN format (17 chars, no I/O/Q) */
function isValidVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)
}

/** POST /api/admin/vin-lookup — Decode VIN via NHTSA + price verification */
export async function POST(req: Request) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { vin, seller_id, product_id, listed_price_cents } = await req.json()

  if (!vin) {
    return Response.json({ error: 'VIN required' }, { status: 400 })
  }

  const cleanVin = vin.trim().toUpperCase()

  if (!isValidVin(cleanVin)) {
    return Response.json({
      valid: false,
      error: 'Invalid VIN format. Must be 17 alphanumeric characters (no I, O, or Q).',
    }, { status: 400 })
  }

  // Call NHTSA API (free, no key needed)
  const res = await fetch(`${NHTSA_API}/${cleanVin}?format=json`)
  if (!res.ok) {
    return Response.json({ error: 'NHTSA API unavailable' }, { status: 502 })
  }

  const nhtsa = await res.json()
  const result: NHTSAResult = nhtsa.Results?.[0]

  if (!result) {
    return Response.json({ error: 'No data returned from NHTSA' }, { status: 404 })
  }

  // ErrorCode "0" means clean decode, anything else means issues
  const hasErrors = result.ErrorCode !== '0'
  const valid = !hasErrors

  const decoded = {
    valid,
    make: result.Make || null,
    model: result.Model || null,
    year: result.ModelYear ? parseInt(result.ModelYear) : null,
    vehicle_type: result.VehicleType || null,
    body_class: result.BodyClass || null,
    engine_info: [result.EngineModel, result.EngineCylinders ? `${result.EngineCylinders}cyl` : null, result.DisplacementL ? `${result.DisplacementL}L` : null].filter(Boolean).join(' '),
    msrp_cents: result.MSRP ? Math.round(parseFloat(result.MSRP) * 100) : null,
    errors: hasErrors ? result.ErrorText : null,
  }

  // Price verification
  let price_flag: string = 'normal'
  let price_deviation_pct: number | null = null

  if (decoded.msrp_cents && listed_price_cents) {
    const deviation = ((listed_price_cents - decoded.msrp_cents) / decoded.msrp_cents) * 100
    price_deviation_pct = Math.round(deviation * 100) / 100

    if (deviation < -40) {
      price_flag = 'suspicious'  // major red flag — >40% below MSRP
    } else if (deviation < -20) {
      price_flag = 'underpriced' // possible fraud — >20% below MSRP
    } else if (deviation > 50) {
      price_flag = 'overpriced'
    }
  }

  // Save lookup to DB
  const supabase = createServiceClient()
  await supabase.from('vin_lookups').insert({
    client_slug: 'dirtbikz',
    vin: cleanVin,
    seller_id: seller_id || null,
    product_id: product_id || null,
    valid: decoded.valid,
    make: decoded.make,
    model: decoded.model,
    year: decoded.year,
    vehicle_type: decoded.vehicle_type,
    body_class: decoded.body_class,
    engine_info: decoded.engine_info,
    raw_response: result,
    msrp_cents: decoded.msrp_cents,
    listed_price_cents: listed_price_cents || null,
    price_flag,
    price_deviation_pct,
  })

  // If linked to a product, update it with VIN data
  if (product_id) {
    await supabase.from('products').update({
      vin: cleanVin,
      vin_verified: decoded.valid,
      vin_data: decoded,
    }).eq('id', product_id)
  }

  return Response.json({
    valid: decoded.valid,
    make: decoded.make,
    model: decoded.model,
    year: decoded.year,
    vehicle_type: decoded.vehicle_type,
    body_class: decoded.body_class,
    engine_info: decoded.engine_info,
    msrp: decoded.msrp_cents ? decoded.msrp_cents / 100 : null,
    price_flag,
    price_deviation_pct,
    flags: price_flag !== 'normal' ? [`Price flagged as ${price_flag} (${price_deviation_pct}% vs MSRP)`] : [],
  })
}

/** GET /api/admin/vin-lookup — List all VIN lookups (admin dashboard) */
export async function GET(req: Request) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const flag = searchParams.get('flag')

  const supabase = createServiceClient()
  let query = supabase
    .from('vin_lookups')
    .select('*, sellers(business_name, email), products(name, price_cents)')
    .eq('client_slug', 'dirtbikz')
    .order('created_at', { ascending: false })
    .limit(100)

  if (flag && flag !== 'all') {
    query = query.eq('price_flag', flag)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
