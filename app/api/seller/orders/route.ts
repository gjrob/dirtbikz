import { createServiceClient } from '@/lib/supabase'
import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** GET /api/seller/orders — List orders for this seller */
export async function GET(req: Request) {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = createServiceClient()
  let query = supabase
    .from('orders')
    .select('*')
    .eq('client_slug', 'dirtbikz')
    .eq('seller_id', session.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('payment_status', status)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Calculate summary stats
  const paid = (data || []).filter(o => o.payment_status === 'paid')
  const summary = {
    total_orders: (data || []).length,
    paid_orders: paid.length,
    total_revenue_cents: paid.reduce((sum: number, o: { seller_payout_cents?: number; total_cents: number }) => sum + (o.seller_payout_cents || o.total_cents), 0),
    pending_orders: (data || []).filter(o => o.payment_status === 'pending').length,
  }

  return Response.json({ orders: data, summary })
}
