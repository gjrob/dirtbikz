import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export async function GET() {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const now = new Date()
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart   = new Date(now.getTime() - 7  * 86400000).toISOString()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Fetch all paid orders + all products + seller count + disputes in parallel
  const [{ data: allOrders }, { data: products }, { count: sellerCount }, { data: disputes }] = await Promise.all([
    supabase.from('orders').select('*').eq('client_slug', 'dirtbikz').eq('payment_status', 'paid'),
    supabase.from('products').select('id, name, category, location').eq('client_slug', 'dirtbikz'),
    supabase.from('sellers').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz'),
    supabase.from('seller_disputes').select('status, amount_cents').eq('client_slug', 'dirtbikz'),
  ])

  const orders = allOrders || []
  const productMap = Object.fromEntries((products || []).map(p => [p.id, p]))

  function sumField(list: typeof orders, field: string) {
    return list.reduce((s, o) => s + ((o as Record<string, number>)[field] || 0), 0)
  }

  const periodOrders = (since: string) => orders.filter(o => o.created_at >= since)

  const revenueAllTime = sumField(orders, 'total_cents')
  const revenueMonth   = sumField(periodOrders(monthStart), 'total_cents')
  const revenueWeek    = sumField(periodOrders(weekStart), 'total_cents')
  const revenueToday   = sumField(periodOrders(todayStart), 'total_cents')

  // Platform commission (5% of gross)
  const commissionAllTime = sumField(orders, 'platform_fee_cents')
  const commissionMonth   = sumField(periodOrders(monthStart), 'platform_fee_cents')
  const sellerPayoutAllTime = sumField(orders, 'seller_payout_cents')

  // Order counts by status (all orders, not just paid)
  const { data: allOrdersRaw } = await supabase
    .from('orders').select('payment_status, order_status').eq('client_slug', 'dirtbikz')

  const statusCounts: Record<string, number> = {}
  for (const o of allOrdersRaw || []) {
    statusCounts[o.payment_status] = (statusCounts[o.payment_status] || 0) + 1
  }

  // Revenue by location
  const revenueByLocation: Record<string, number> = { NC: 0, SC: 0, GA: 0, Unknown: 0 }
  for (const order of orders) {
    const items: { product_id?: string; price_cents: number; quantity: number }[] = order.items || []
    for (const item of items) {
      const product = item.product_id ? productMap[item.product_id] : null
      const loc = product?.location || 'Unknown'
      const key = revenueByLocation[loc] !== undefined ? loc : 'Unknown'
      revenueByLocation[key] += item.price_cents * item.quantity
    }
  }

  // Top products
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
  const topProducts = Object.values(productCounts).sort((a, b) => b.count - a.count).slice(0, 5)

  // Dispute summary
  const allDisputes = disputes || []
  const disputeSummary = {
    total: allDisputes.length,
    active: allDisputes.filter(d => d.status === 'needs_response' || d.status === 'under_review').length,
    lostAmount: allDisputes.filter(d => d.status === 'lost').reduce((s, d) => s + d.amount_cents, 0),
  }

  return Response.json({
    revenue: { allTime: revenueAllTime, month: revenueMonth, week: revenueWeek, today: revenueToday },
    commission: { allTime: commissionAllTime, month: commissionMonth },
    sellerPayouts: { allTime: sellerPayoutAllTime },
    orderCount: (allOrdersRaw || []).length,
    paidCount: orders.length,
    sellerCount: sellerCount || 0,
    statusCounts,
    revenueByLocation,
    topProducts,
    disputeSummary,
  })
}
