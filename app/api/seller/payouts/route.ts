import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** GET /api/seller/payouts — List seller's payout history + Stripe balance */
export async function GET() {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!session.stripe_account_id) {
    return Response.json({ error: 'Stripe not connected' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
  const supabase = createServiceClient()

  // Get payout history from our DB
  const { data: payouts } = await supabase
    .from('seller_payouts')
    .select('*')
    .eq('seller_id', session.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Get current Stripe balance for this connected account
  let balance = null
  try {
    const stripeBalance = await stripe.balance.retrieve({
      stripeAccount: session.stripe_account_id,
    })
    balance = {
      available_cents: stripeBalance.available.reduce((sum, b) => sum + b.amount, 0),
      pending_cents: stripeBalance.pending.reduce((sum, b) => sum + b.amount, 0),
    }
  } catch (err) {
    console.error('Balance fetch error:', err)
  }

  return Response.json({ payouts: payouts || [], balance })
}
