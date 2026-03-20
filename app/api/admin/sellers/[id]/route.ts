import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../../_auth'

export const runtime = 'nodejs'

/** PUT /api/admin/sellers/[id] — Update seller status (approve/suspend/reject) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  // Only allow specific field updates
  const allowed: Record<string, unknown> = {}
  if (body.status) {
    allowed.status = body.status
    if (body.status === 'active') allowed.approved_at = new Date().toISOString()
    if (body.status === 'suspended') {
      allowed.suspended_at = new Date().toISOString()
      allowed.suspension_reason = body.suspension_reason || null
    }
  }

  const { data, error } = await supabase
    .from('sellers')
    .update(allowed)
    .eq('id', params.id)
    .eq('client_slug', 'dirtbikz')
    .select('id, email, business_name, status')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
