import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../../_auth'

export const runtime = 'nodejs'

/** PUT /api/admin/vin-lookup/[id] — Admin review/override a VIN lookup */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { reviewed_by, override_reason, override_flag } = body

  if (!reviewed_by) {
    return Response.json({ error: 'reviewed_by required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const updates: Record<string, unknown> = {
    reviewed_by,
    reviewed_at: new Date().toISOString(),
    override_reason: override_reason || null,
  }

  // Allow admin to override the price flag
  if (override_flag) {
    updates.price_flag = override_flag
  }

  const { data, error } = await supabase
    .from('vin_lookups')
    .update(updates)
    .eq('id', params.id)
    .select('*, sellers(business_name), products(name)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // If overriding to 'normal' and product exists, clear the product flag
  if (override_flag === 'normal' && data.product_id) {
    await supabase.from('products').update({
      vin_verified: true,
    }).eq('id', data.product_id)
  }

  return Response.json(data)
}
