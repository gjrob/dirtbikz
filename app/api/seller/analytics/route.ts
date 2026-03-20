import { createServiceClient } from '@/lib/supabase'
import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** GET /api/seller/analytics — Seller's own revenue, commission, trends, top products */
export async function GET() {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Fetch all seller's paid orders
  const { data: allOrders } = await supabase
    .from('orders')
    .select('total_cents, seller_payout_cents, platform_fee_cents, items, created_at')
    .eq('client_slug', 'dirtbikz')
    .eq('seller_id', session.id)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  const orders = allOrders || []

  function sumField(list: typeof orders, field: 'total_cents' | 'seller_payout_cents' | 'platform_fee_cents') {
    return list.reduce((s, o) => s + (o[field] || 0), 0)
  }

  // Revenue periods
  const periodOrders = (since: string) => orders.filter(o => o.created_at >= since)

  const revenue = {
    allTime: sumField(orders, 'seller_payout_cents'),
    month: sumField(periodOrders(monthStart), 'seller_payout_cents'),
    week: sumField(periodOrders(weekStart), 'seller_payout_cents'),
    today: sumField(periodOrders(todayStart), 'seller_payout_cents'),
  }

  const commission = {
    allTime: sumField(orders, 'platform_fee_cents'),
    month: sumField(periodOrders(monthStart), 'platform_fee_cents'),
  }

  const grossSales = {
    allTime: sumField(orders, 'total_cents'),
    month: sumField(periodOrders(monthStart), 'total_cents'),
  }

  // Daily revenue for last 30 days (for trend chart)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
  const dailyRevenue: Record<string, number> = {}
  for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
    dailyRevenue[d.toISOString().slice(0, 10)] = 0
  }
  for (const o of orders) {
    const day = o.created_at.slice(0, 10)
    if (dailyRevenue[day] !== undefined) {
      dailyRevenue[day] += o.seller_payout_cents || 0
    }
  }

  // Top products by quantity sold
  const productCounts: Record<string, { name: string; count: number; revenue: number }> = {}
  for (const order of orders) {
    const items: { product_id?: string; name: string; price_cents: number; quantity: number }[] = order.items || []
    for (const item of items) {
      const id = item.product_id || item.name
      if (!productCounts[id]) productCounts[id] = { name: item.name, count: 0, revenue: 0 }
      productCounts[id].count += item.quantity
      productCounts[id].revenue += item.price_cents * item.quantity
    }
  }
  const topProducts = Object.values(productCounts).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Dispute count
  const { count: disputeCount } = await supabase
    .from('seller_disputes')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', session.id)

  return Response.json({
    revenue,
    commission,
    grossSales,
    dailyRevenue,
    topProducts,
    totalOrders: orders.length,
    disputeCount: disputeCount || 0,
  })
}
