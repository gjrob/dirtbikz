import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export async function GET() {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const now = new Date()
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart   = new Date(now.getTime() - 7  * 86400000).toISOString()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Fetch all paid orders + all products in parallel
  const [{ data: allOrders }, { data: products }] = await Promise.all([
    supabase.from('orders').select('*').eq('client_slug', 'dirtbikz').eq('payment_status', 'paid'),
    supabase.from('products').select('id, name, category, location').eq('client_slug', 'dirtbikz'),
  ])

  const orders = allOrders || []
  const productMap = Object.fromEntries((products || []).map(p => [p.id, p]))

  function sumRevenue(list: typeof orders) {
    return list.reduce((s, o) => s + (o.total_cents || 0), 0)
  }

  const revenueAllTime = sumRevenue(orders)
  const revenueMonth   = sumRevenue(orders.filter(o => o.created_at >= monthStart))
  const revenueWeek    = sumRevenue(orders.filter(o => o.created_at >= weekStart))
  const revenueToday   = sumRevenue(orders.filter(o => o.created_at >= todayStart))

  // Order counts by status (all orders, not just paid)
  const { data: allOrdersRaw } = await supabase
    .from('orders').select('payment_status, order_status').eq('client_slug', 'dirtbikz')

  const statusCounts: Record<string, number> = {}
  for (const o of allOrdersRaw || []) {
    statusCounts[o.payment_status] = (statusCounts[o.payment_status] || 0) + 1
  }

  // Revenue by location — join items → product location
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

  // Top products by order count
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
  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return Response.json({
    revenue: { allTime: revenueAllTime, month: revenueMonth, week: revenueWeek, today: revenueToday },
    orderCount: (allOrdersRaw || []).length,
    paidCount: orders.length,
    statusCounts,
    revenueByLocation,
    topProducts,
  })
}
