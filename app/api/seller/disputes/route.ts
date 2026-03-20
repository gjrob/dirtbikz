import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { getSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

/** GET /api/seller/disputes — List seller's own disputes + evidence links */
export async function GET() {
  const session = await getSellerSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: disputes } = await supabase
    .from('seller_disputes')
    .select('*, orders(customer_name, total_cents)')
    .eq('seller_id', session.id)
    .order('created_at', { ascending: false })

  // Generate Stripe Express dashboard link for evidence submission
  let stripeDashboardUrl: string | null = null
  if (session.stripe_account_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
      const loginLink = await stripe.accounts.createLoginLink(session.stripe_account_id)
      stripeDashboardUrl = loginLink.url
    } catch {
      // Stripe link generation may fail if account not fully set up
    }
  }

  // Summary
  const all = disputes || []
  const summary = {
    total: all.length,
    active: all.filter(d => d.status === 'needs_response' || d.status === 'under_review').length,
    won: all.filter(d => d.status === 'won').length,
    lost: all.filter(d => d.status === 'lost').length,
    total_amount_cents: all.reduce((s, d) => s + d.amount_cents, 0),
  }

  return Response.json({
    disputes: all,
    summary,
    stripe_dashboard_url: stripeDashboardUrl,
  })
}
