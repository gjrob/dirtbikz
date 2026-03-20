import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../../_auth'

export const runtime = 'nodejs'

const NHTSA_API = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues'

/** POST /api/admin/vin-lookup/batch — Verify all unverified product VINs */
export async function POST() {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Get all products with VINs that haven't been verified
  const { data: products } = await supabase
    .from('products')
    .select('id, vin, price_cents, seller_id, name')
    .eq('client_slug', 'dirtbikz')
    .eq('vin_verified', false)
    .not('vin', 'is', null)

  if (!products?.length) {
    return Response.json({ verified: 0, message: 'No unverified VINs found' })
  }

  let verified = 0
  let flagged = 0
  const results: { product_id: string; name: string; vin: string; valid: boolean; price_flag: string }[] = []

  for (const product of products) {
    if (!product.vin || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(product.vin)) continue

    try {
      const res = await fetch(`${NHTSA_API}/${product.vin}?format=json`)
      if (!res.ok) continue

      const nhtsa = await res.json()
      const result = nhtsa.Results?.[0]
      if (!result) continue

      const valid = result.ErrorCode === '0'
      const msrpCents = result.MSRP ? Math.round(parseFloat(result.MSRP) * 100) : null

      let priceFlag = 'normal'
      let deviationPct: number | null = null
      if (msrpCents && product.price_cents) {
        const deviation = ((product.price_cents - msrpCents) / msrpCents) * 100
        deviationPct = Math.round(deviation * 100) / 100
        if (deviation < -40) priceFlag = 'suspicious'
        else if (deviation < -20) priceFlag = 'underpriced'
        else if (deviation > 50) priceFlag = 'overpriced'
      }

      // Save lookup
      await supabase.from('vin_lookups').insert({
        client_slug: 'dirtbikz',
        vin: product.vin,
        seller_id: product.seller_id,
        product_id: product.id,
        valid,
        make: result.Make || null,
        model: result.Model || null,
        year: result.ModelYear ? parseInt(result.ModelYear) : null,
        vehicle_type: result.VehicleType || null,
        body_class: result.BodyClass || null,
        engine_info: [result.EngineModel, result.EngineCylinders ? `${result.EngineCylinders}cyl` : null].filter(Boolean).join(' '),
        raw_response: result,
        msrp_cents: msrpCents,
        listed_price_cents: product.price_cents,
        price_flag: priceFlag,
        price_deviation_pct: deviationPct,
      })

      // Update product
      await supabase.from('products').update({
        vin_verified: valid,
        vin_data: { make: result.Make, model: result.Model, year: result.ModelYear, valid },
      }).eq('id', product.id)

      verified++
      if (priceFlag !== 'normal') flagged++

      results.push({
        product_id: product.id,
        name: product.name,
        vin: product.vin,
        valid,
        price_flag: priceFlag,
      })
    } catch {
      // Skip failed lookups, don't block batch
      continue
    }
  }

  return Response.json({ verified, flagged, total: products.length, results })
}
