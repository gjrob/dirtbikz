import { createServiceClient } from '@/lib/supabase'
import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** PUT /api/seller/products/[id] — Seller updates their own product */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  // Verify product belongs to this seller
  const { data: existing } = await supabase
    .from('products')
    .select('id, seller_id')
    .eq('id', params.id)
    .eq('seller_id', session.id)
    .single()

  if (!existing) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }

  // Sellers cannot toggle in_stock (admin-only)
  delete body.in_stock
  delete body.seller_id
  delete body.client_slug

  const { data, error } = await supabase
    .from('products')
    .update(body)
    .eq('id', params.id)
    .eq('seller_id', session.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

/** DELETE /api/seller/products/[id] — Seller removes their own listing */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', params.id)
    .eq('seller_id', session.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
