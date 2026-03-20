import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

const NHTSA_API = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues'

/** POST /api/seller/vin-check — Seller-facing VIN validation (lightweight, no DB write) */
export async function POST(req: Request) {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { vin } = await req.json()

  if (!vin || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim())) {
    return Response.json({ valid: false, error: 'Invalid VIN format' }, { status: 400 })
  }

  const cleanVin = vin.trim().toUpperCase()
  const res = await fetch(`${NHTSA_API}/${cleanVin}?format=json`)

  if (!res.ok) {
    return Response.json({ error: 'VIN lookup service unavailable' }, { status: 502 })
  }

  const nhtsa = await res.json()
  const result = nhtsa.Results?.[0]

  if (!result) {
    return Response.json({ valid: false, error: 'No data found' }, { status: 404 })
  }

  return Response.json({
    valid: result.ErrorCode === '0',
    make: result.Make || null,
    model: result.Model || null,
    year: result.ModelYear ? parseInt(result.ModelYear) : null,
    vehicle_type: result.VehicleType || null,
    engine: [result.EngineModel, result.EngineCylinders ? `${result.EngineCylinders}cyl` : null].filter(Boolean).join(' ') || null,
  })
}
