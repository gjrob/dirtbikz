import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export const runtime = 'nodejs'

const AUTO_SUSPEND_DISPUTE_THRESHOLD = 5  // 5+ disputes in 30 days
const AUTO_SUSPEND_LOST_THRESHOLD = 2     // 2+ lost disputes
const VELOCITY_WINDOW_MINUTES = 30        // same email ordering within 30 min
const VELOCITY_MAX_ORDERS = 3             // max orders in that window

/** GET /api/admin/fraud — Comprehensive fraud dashboard data */
export async function GET() {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  // Fetch all data in parallel
  const [
    { data: sellers },
    { data: recentDisputes },
    { data: allDisputes },
    { data: vinFlags },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('sellers').select('id, email, business_name, status, stripe_account_id').eq('client_slug', 'dirtbikz'),
    supabase.from('seller_disputes').select('seller_id, status, amount_cents, created_at').eq('client_slug', 'dirtbikz').gte('created_at', thirtyDaysAgo),
    supabase.from('seller_disputes').select('seller_id, status, amount_cents').eq('client_slug', 'dirtbikz'),
    supabase.from('vin_lookups').select('seller_id, price_flag').eq('client_slug', 'dirtbikz').neq('price_flag', 'normal'),
    supabase.from('orders').select('id, customer_email, seller_id, total_cents, created_at, payment_status').eq('client_slug', 'dirtbikz').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
  ])

  // ── 1. Seller risk assessment ──
  const sellerRisks: {
    seller_id: string
    business_name: string
    email: string
    status: string
    disputes_30d: number
    disputes_lost: number
    disputes_total: number
    vin_flags: number
    risk_score: number
    risk_level: string
    auto_suspend_reason: string | null
  }[] = []

  const disputesBySeller: Record<string, { total30d: number; lost: number; totalAll: number }> = {}
  for (const d of recentDisputes || []) {
    if (!disputesBySeller[d.seller_id]) disputesBySeller[d.seller_id] = { total30d: 0, lost: 0, totalAll: 0 }
    disputesBySeller[d.seller_id].total30d++
  }
  for (const d of allDisputes || []) {
    if (!disputesBySeller[d.seller_id]) disputesBySeller[d.seller_id] = { total30d: 0, lost: 0, totalAll: 0 }
    disputesBySeller[d.seller_id].totalAll++
    if (d.status === 'lost') disputesBySeller[d.seller_id].lost++
  }

  const vinFlagsBySeller: Record<string, number> = {}
  for (const v of vinFlags || []) {
    if (v.seller_id) vinFlagsBySeller[v.seller_id] = (vinFlagsBySeller[v.seller_id] || 0) + 1
  }

  const sellersToAutoSuspend: string[] = []

  for (const s of sellers || []) {
    const d = disputesBySeller[s.id] || { total30d: 0, lost: 0, totalAll: 0 }
    const flags = vinFlagsBySeller[s.id] || 0

    let riskScore = 0
    riskScore += d.totalAll * 15
    riskScore += d.total30d * 10
    riskScore += d.lost * 25
    riskScore += flags * 8
    riskScore = Math.min(riskScore, 100)

    const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low'

    // Auto-suspension check
    let autoSuspendReason: string | null = null
    if (d.total30d >= AUTO_SUSPEND_DISPUTE_THRESHOLD) {
      autoSuspendReason = `${d.total30d} disputes in 30 days (threshold: ${AUTO_SUSPEND_DISPUTE_THRESHOLD})`
    } else if (d.lost >= AUTO_SUSPEND_LOST_THRESHOLD) {
      autoSuspendReason = `${d.lost} lost disputes (threshold: ${AUTO_SUSPEND_LOST_THRESHOLD})`
    }

    if (autoSuspendReason && s.status === 'active') {
      sellersToAutoSuspend.push(s.id)
    }

    sellerRisks.push({
      seller_id: s.id,
      business_name: s.business_name,
      email: s.email,
      status: s.status,
      disputes_30d: d.total30d,
      disputes_lost: d.lost,
      disputes_total: d.totalAll,
      vin_flags: flags,
      risk_score: riskScore,
      risk_level: riskLevel,
      auto_suspend_reason: autoSuspendReason,
    })
  }

  // ── 2. Order velocity flags ──
  const ordersByEmail: Record<string, { id: string; created_at: string; total_cents: number; seller_id: string }[]> = {}
  for (const o of recentOrders || []) {
    if (!ordersByEmail[o.customer_email]) ordersByEmail[o.customer_email] = []
    ordersByEmail[o.customer_email].push(o)
  }

  const velocityFlags: {
    email: string
    order_count: number
    window_minutes: number
    orders: { id: string; total_cents: number; created_at: string }[]
    flag_type: string
  }[] = []

  for (const [email, orders] of Object.entries(ordersByEmail)) {
    if (orders.length < 2) continue

    // Check for rapid-fire orders
    for (let i = 0; i < orders.length - 1; i++) {
      const cluster = [orders[i]]
      for (let j = i + 1; j < orders.length; j++) {
        const diffMs = new Date(orders[i].created_at).getTime() - new Date(orders[j].created_at).getTime()
        if (diffMs <= VELOCITY_WINDOW_MINUTES * 60 * 1000) {
          cluster.push(orders[j])
        }
      }
      if (cluster.length >= VELOCITY_MAX_ORDERS) {
        velocityFlags.push({
          email,
          order_count: cluster.length,
          window_minutes: VELOCITY_WINDOW_MINUTES,
          orders: cluster.map(o => ({ id: o.id, total_cents: o.total_cents, created_at: o.created_at })),
          flag_type: 'rapid_ordering',
        })
        break // one flag per email
      }
    }

    // Check for duplicate amounts (same email, same total, different orders)
    const amountMap: Record<number, typeof orders> = {}
    for (const o of orders) {
      if (!amountMap[o.total_cents]) amountMap[o.total_cents] = []
      amountMap[o.total_cents].push(o)
    }
    for (const [, dupes] of Object.entries(amountMap)) {
      if (dupes.length >= 2) {
        velocityFlags.push({
          email,
          order_count: dupes.length,
          window_minutes: 0,
          orders: dupes.map(o => ({ id: o.id, total_cents: o.total_cents, created_at: o.created_at })),
          flag_type: 'duplicate_amount',
        })
        break
      }
    }
  }

  // ── 3. Summary stats ──
  const summary = {
    total_sellers: (sellers || []).length,
    high_risk_sellers: sellerRisks.filter(s => s.risk_level === 'high').length,
    pending_auto_suspend: sellersToAutoSuspend.length,
    velocity_flags: velocityFlags.length,
    total_disputes_30d: (recentDisputes || []).length,
    total_vin_flags: (vinFlags || []).length,
  }

  return Response.json({
    summary,
    sellerRisks: sellerRisks.sort((a, b) => b.risk_score - a.risk_score),
    velocityFlags,
    sellersToAutoSuspend,
  })
}

/** POST /api/admin/fraud — Execute auto-suspension for flagged sellers */
export async function POST(req: Request) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, seller_ids } = await req.json()

  if (action !== 'auto_suspend' || !seller_ids?.length) {
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const suspended: string[] = []

  for (const sellerId of seller_ids) {
    const { error } = await supabase
      .from('sellers')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspension_reason: 'Auto-suspended: exceeded dispute threshold',
      })
      .eq('id', sellerId)
      .eq('status', 'active') // only suspend active sellers

    if (!error) suspended.push(sellerId)
  }

  return Response.json({ suspended, count: suspended.length })
}
