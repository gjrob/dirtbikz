import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export const runtime = 'nodejs'

/** GET /api/admin/disputes — List all disputes with seller info */
export async function GET(req: Request) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = createServiceClient()

  let query = supabase
    .from('seller_disputes')
    .select('*, sellers(business_name, email, stripe_account_id), orders(customer_name, customer_email, total_cents)')
    .eq('client_slug', 'dirtbikz')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Summary stats
  const all = data || []
  const summary = {
    total: all.length,
    needs_response: all.filter(d => d.status === 'needs_response').length,
    under_review: all.filter(d => d.status === 'under_review').length,
    won: all.filter(d => d.status === 'won').length,
    lost: all.filter(d => d.status === 'lost').length,
    total_amount_cents: all.reduce((s, d) => s + d.amount_cents, 0),
    lost_amount_cents: all.filter(d => d.status === 'lost').reduce((s, d) => s + d.amount_cents, 0),
  }

  return Response.json({ disputes: data, summary })
}
