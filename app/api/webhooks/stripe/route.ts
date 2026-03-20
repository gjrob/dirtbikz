import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return new Response('Webhook error', { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Checkout completed — annual fee OR order payment ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Annual fee payment
    if (session.metadata?.type === 'seller_annual_fee') {
      await handleAnnualFeePaid(supabase, stripe, session)
      return new Response('ok', { status: 200 })
    }

    // Order payment
    const orderId = session.metadata?.order_id
    const sellerId = session.metadata?.seller_id

    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', orderId)
        .select('total_cents, seller_payout_cents')
        .single()

      // Update seller denormalized stats
      if (sellerId && order) {
        await supabase.rpc('increment_seller_stats', {
          p_seller_id: sellerId,
          p_amount_cents: order.seller_payout_cents || order.total_cents,
        })
      }
    }
  }

  // ── Checkout expired — mark order failed ──
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id
    if (orderId) {
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', orderId)
    }
  }

  // ── Stripe Connect: account updated — track onboarding status ──
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    const stripeAccountId = account.id

    const updates: Record<string, unknown> = {}

    if (account.charges_enabled && account.payouts_enabled) {
      updates.stripe_onboarding_complete = true
      updates.stripe_payouts_enabled = true
      // Only auto-activate if annual fee is paid
      const { data: seller } = await supabase
        .from('sellers')
        .select('annual_fee_status')
        .eq('stripe_account_id', stripeAccountId)
        .single()

      if (seller?.annual_fee_status === 'paid') {
        updates.status = 'active'
        updates.approved_at = new Date().toISOString()
      }
    } else {
      updates.stripe_onboarding_complete = account.details_submitted || false
      updates.stripe_payouts_enabled = account.payouts_enabled || false
    }

    await supabase
      .from('sellers')
      .update(updates)
      .eq('stripe_account_id', stripeAccountId)
  }

  // ── Stripe Connect: payout events — track seller payouts ──
  if (event.type === 'payout.paid' || event.type === 'payout.failed') {
    const payout = event.data.object as Stripe.Payout
    const connectedAccountId = event.account

    if (connectedAccountId) {
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('stripe_account_id', connectedAccountId)
        .single()

      if (seller) {
        const status = event.type === 'payout.paid' ? 'paid' : 'failed'

        await supabase.from('seller_payouts').insert({
          seller_id: seller.id,
          client_slug: 'dirtbikz',
          stripe_payout_id: payout.id,
          amount_cents: payout.amount,
          status,
          arrival_date: payout.arrival_date
            ? new Date(payout.arrival_date * 1000).toISOString()
            : null,
        })
      }
    }
  }

  // ── Dispute/chargeback created ──
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute
    await handleDisputeCreated(supabase, stripe, dispute, event.account)
  }

  // ── Dispute updated (won/lost) ──
  if (event.type === 'charge.dispute.updated' || event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute
    await handleDisputeUpdated(supabase, dispute)
  }

  return new Response('ok', { status: 200 })
}

/** Handle annual fee payment — mark seller as paid, trigger Connect onboarding */
async function handleAnnualFeePaid(
  supabase: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const sellerId = session.metadata?.seller_id
  if (!sellerId) return

  // Mark annual fee as paid
  await supabase
    .from('sellers')
    .update({
      annual_fee_status: 'paid',
      annual_fee_paid_at: new Date().toISOString(),
      stripe_subscription_id: session.payment_intent as string,
    })
    .eq('id', sellerId)

  // Check if Connect onboarding is already complete
  const { data: seller } = await supabase
    .from('sellers')
    .select('stripe_account_id, stripe_onboarding_complete, stripe_payouts_enabled')
    .eq('id', sellerId)
    .single()

  // If Connect is already done, auto-activate
  if (seller?.stripe_onboarding_complete && seller?.stripe_payouts_enabled) {
    await supabase
      .from('sellers')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
      })
      .eq('id', sellerId)
  }
}

/** Handle dispute creation — log to seller_disputes + find affected seller */
async function handleDisputeCreated(
  supabase: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  dispute: Stripe.Dispute,
  connectedAccountId?: string,
) {
  // Find the seller from the connected account
  let sellerId: string | null = null
  let orderId: string | null = null

  if (connectedAccountId) {
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('stripe_account_id', connectedAccountId)
      .single()
    sellerId = seller?.id || null
  }

  // Try to find order from payment intent
  if (dispute.payment_intent) {
    const piId = typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent.id
    const { data: order } = await supabase
      .from('orders')
      .select('id, seller_id')
      .eq('stripe_payment_intent_id', piId)
      .single()

    if (order) {
      orderId = order.id
      if (!sellerId) sellerId = order.seller_id
    }
  }

  if (!sellerId) return

  await supabase.from('seller_disputes').insert({
    seller_id: sellerId,
    order_id: orderId,
    client_slug: 'dirtbikz',
    stripe_dispute_id: dispute.id,
    stripe_charge_id: typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id,
    amount_cents: dispute.amount,
    reason: dispute.reason,
    status: dispute.status === 'warning_needs_response' ? 'warning_needs_response' : 'needs_response',
    evidence_due_by: dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
      : null,
  })

  // If order exists, flag it
  if (orderId) {
    await supabase
      .from('orders')
      .update({ payment_status: 'refunded', order_status: 'cancelled' })
      .eq('id', orderId)
  }
}

/** Handle dispute status update + auto-suspension on 2+ lost */
async function handleDisputeUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  dispute: Stripe.Dispute,
) {
  const statusMap: Record<string, string> = {
    needs_response: 'needs_response',
    under_review: 'under_review',
    won: 'won',
    lost: 'lost',
    warning_needs_response: 'warning_needs_response',
    warning_under_review: 'warning_under_review',
    warning_closed: 'warning_closed',
  }

  const updates: Record<string, unknown> = {
    status: statusMap[dispute.status] || dispute.status,
  }

  if (dispute.status === 'won' || dispute.status === 'lost' || dispute.status === 'warning_closed') {
    updates.resolved_at = new Date().toISOString()
  }

  await supabase
    .from('seller_disputes')
    .update(updates)
    .eq('stripe_dispute_id', dispute.id)

  // Auto-suspend seller if 2+ disputes lost
  if (dispute.status === 'lost') {
    const { data: disputeRecord } = await supabase
      .from('seller_disputes')
      .select('seller_id')
      .eq('stripe_dispute_id', dispute.id)
      .single()

    if (disputeRecord?.seller_id) {
      const { count } = await supabase
        .from('seller_disputes')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', disputeRecord.seller_id)
        .eq('status', 'lost')

      if ((count || 0) >= 2) {
        // Check if seller is still active before suspending
        const { data: seller } = await supabase
          .from('sellers')
          .select('status')
          .eq('id', disputeRecord.seller_id)
          .single()

        if (seller?.status === 'active') {
          await supabase
            .from('sellers')
            .update({
              status: 'suspended',
              suspended_at: new Date().toISOString(),
              suspension_reason: `Auto-suspended: ${count} lost disputes`,
            })
            .eq('id', disputeRecord.seller_id)
        }
      }
    }
  }
}
