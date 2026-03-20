import { createServiceClient } from '@/lib/supabase'
import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** GET /api/seller/subscription — Get seller's annual fee + onboarding status */
export async function GET() {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: seller } = await supabase
    .from('sellers')
    .select('annual_fee_status, annual_fee_paid_at, annual_fee_amount_cents, coupon_code, stripe_onboarding_complete, stripe_payouts_enabled, status')
    .eq('id', session.id)
    .single()

  if (!seller) return Response.json({ error: 'Seller not found' }, { status: 404 })

  // Calculate fee expiry (1 year from payment)
  const expiresAt = seller.annual_fee_paid_at
    ? new Date(new Date(seller.annual_fee_paid_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : null

  return Response.json({
    annual_fee_status: seller.annual_fee_status,
    annual_fee_paid_at: seller.annual_fee_paid_at,
    annual_fee_amount_cents: seller.annual_fee_amount_cents,
    coupon_code: seller.coupon_code,
    expires_at: expiresAt,
    stripe_onboarding_complete: seller.stripe_onboarding_complete,
    stripe_payouts_enabled: seller.stripe_payouts_enabled,
    seller_status: seller.status,
    onboarding_steps: {
      registration: true,
      annual_fee_paid: seller.annual_fee_status === 'paid',
      stripe_connected: seller.stripe_onboarding_complete,
      active: seller.status === 'active',
    },
  })
}
