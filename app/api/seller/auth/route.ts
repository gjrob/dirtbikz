import { createServiceClient } from '@/lib/supabase'
import { verifyPassword, setSellerSession, clearSellerSession, getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** POST /api/seller/auth — Seller login */
export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return Response.json({ error: 'Email and password required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, email, business_name, password_hash, stripe_account_id, stripe_onboarding_complete, annual_fee_status, status')
    .eq('email', email)
    .eq('client_slug', 'dirtbikz')
    .single()

  if (!seller) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, seller.password_hash)
  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (seller.status === 'suspended') {
    return Response.json({ error: 'Account suspended' }, { status: 403 })
  }

  setSellerSession(seller.id)

  return Response.json({
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    stripe_account_id: seller.stripe_account_id,
    stripe_onboarding_complete: seller.stripe_onboarding_complete,
    annual_fee_status: seller.annual_fee_status,
    status: seller.status,
  })
}

/** GET /api/seller/auth — Get current session */
export async function GET() {
  const session = await getSellerSession()
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return Response.json(session)
}

/** DELETE /api/seller/auth — Logout */
export async function DELETE() {
  clearSellerSession()
  return Response.json({ ok: true })
}
