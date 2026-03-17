import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export async function GET(req: Request) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = createServiceClient()
  let query = supabase
    .from('orders')
    .select('*')
    .eq('client_slug', 'dirtbikz')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('payment_status', status)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
