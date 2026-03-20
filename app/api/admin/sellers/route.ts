import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export const runtime = 'nodejs'

/** GET /api/admin/sellers — List all sellers with risk scoring */
export async function GET(req: Request) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = createServiceClient()

  let query = supabase
    .from('sellers')
    .select('*')
    .eq('client_slug', 'dirtbikz')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: sellers, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Get dispute counts and flagged VIN counts per seller
  const sellerIds = (sellers || []).map(s => s.id)

  const [{ data: disputes }, { data: vinFlags }] = await Promise.all([
    supabase
      .from('seller_disputes')
      .select('seller_id, status')
      .in('seller_id', sellerIds.length ? sellerIds : ['none']),
    supabase
      .from('vin_lookups')
      .select('seller_id, price_flag')
      .in('seller_id', sellerIds.length ? sellerIds : ['none'])
      .neq('price_flag', 'normal'),
  ])

  // Build risk scores
  const disputeMap: Record<string, { total: number; active: number }> = {}
  for (const d of disputes || []) {
    if (!disputeMap[d.seller_id]) disputeMap[d.seller_id] = { total: 0, active: 0 }
    disputeMap[d.seller_id].total++
    if (d.status === 'needs_response' || d.status === 'under_review') {
      disputeMap[d.seller_id].active++
    }
  }

  const flagMap: Record<string, number> = {}
  for (const v of vinFlags || []) {
    flagMap[v.seller_id] = (flagMap[v.seller_id] || 0) + 1
  }

  const enriched = (sellers || []).map(s => {
    const d = disputeMap[s.id] || { total: 0, active: 0 }
    const flags = flagMap[s.id] || 0

    // Risk score: 0-100, weighted
    let riskScore = 0
    riskScore += d.total * 20        // each dispute = 20 points
    riskScore += d.active * 15       // active disputes extra
    riskScore += flags * 10          // each VIN flag = 10 points
    if (s.status === 'suspended') riskScore += 30
    riskScore = Math.min(riskScore, 100)

    const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low'

    return {
      ...s,
      password_hash: undefined, // never expose
      dispute_count: d.total,
      active_disputes: d.active,
      vin_flag_count: flags,
      risk_score: riskScore,
      risk_level: riskLevel,
    }
  })

  return Response.json(enriched)
}
