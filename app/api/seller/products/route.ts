import { createServiceClient } from '@/lib/supabase'
import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** GET /api/seller/products — List seller's own products */
export async function GET() {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('client_slug', 'dirtbikz')
    .eq('seller_id', session.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

/** POST /api/seller/products — Seller creates a new product listing */
export async function POST(req: Request) {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.annual_fee_status !== 'paid') {
    return Response.json({ error: 'Annual fee must be paid before listing products' }, { status: 403 })
  }

  if (session.status !== 'active') {
    return Response.json({ error: 'Account not yet approved' }, { status: 403 })
  }

  const body = await req.json()
  const supabase = createServiceClient()

  // Products from sellers always start as not in_stock until admin approves
  const { data, error } = await supabase
    .from('products')
    .insert({
      ...body,
      client_slug: 'dirtbikz',
      seller_id: session.id,
      in_stock: false, // requires admin approval to go live
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
