import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export async function GET() {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('client_slug', 'dirtbikz')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: Request) {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('products')
    .insert({ ...body, client_slug: 'dirtbikz' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
