import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../../_auth'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .update(body)
    .eq('id', params.id)
    .eq('client_slug', 'dirtbikz')
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
