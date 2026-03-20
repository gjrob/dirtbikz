import Stripe from 'stripe'
import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** GET /api/seller/stripe-dashboard — Get Stripe Express dashboard login link */
export async function GET() {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!session.stripe_account_id) {
    return Response.json({ error: 'Stripe not connected' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

  const loginLink = await stripe.accounts.createLoginLink(session.stripe_account_id)

  return Response.json({ url: loginLink.url })
}
