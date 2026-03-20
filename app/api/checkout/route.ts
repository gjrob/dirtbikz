import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const PLATFORM_FEE_PERCENT = 5 // 5% commission

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
  const { items, customer } = await req.json()

  if (!items?.length) {
    return Response.json({ error: 'No items' }, { status: 400 })
  }

  const totalCents = items.reduce((sum: number, i: { price_cents: number; quantity: number }) => sum + i.price_cents * i.quantity, 0)

  const supabase = createServiceClient()

  // Look up seller from product (first item determines seller)
  const productId = items[0]?.product_id
  let sellerId: string | null = null
  let sellerStripeAccountId: string | null = null

  if (productId) {
    const { data: product } = await supabase
      .from('products')
      .select('seller_id, sellers(stripe_account_id, stripe_payouts_enabled)')
      .eq('id', productId)
      .single()

    if (product?.seller_id) {
      sellerId = product.seller_id
      const seller = product.sellers as unknown as { stripe_account_id: string; stripe_payouts_enabled: boolean } | null
      if (seller?.stripe_payouts_enabled) {
        sellerStripeAccountId = seller.stripe_account_id
      }
    }
  }

  // Calculate commission split
  const platformFeeCents = sellerStripeAccountId
    ? Math.round(totalCents * PLATFORM_FEE_PERCENT / 100)
    : 0
  const sellerPayoutCents = sellerStripeAccountId
    ? totalCents - platformFeeCents
    : 0

  // Create order record
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      client_slug: 'dirtbikz',
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || null,
      items,
      total_cents: totalCents,
      seller_id: sellerId,
      platform_fee_cents: platformFeeCents || null,
      seller_payout_cents: sellerPayoutCents || null,
      payment_status: 'pending',
      order_status: 'new',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Order insert error:', error)
    return Response.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dirtbikz.com'

  // Build Stripe Checkout session — with Connect if seller has Stripe
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customer.email,
    metadata: {
      order_id: order.id,
      client_slug: 'dirtbikz',
      seller_id: sellerId || '',
    },
    line_items: items.map((item: { name: string; price_cents: number; quantity: number }) => ({
      price_data: {
        currency: 'usd',
        unit_amount: item.price_cents,
        product_data: { name: item.name },
      },
      quantity: item.quantity,
    })),
    success_url: `${appUrl}?order=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}?order=cancelled`,
  }

  // Stripe Connect: route payment to seller, keep 5% platform fee
  if (sellerStripeAccountId) {
    sessionParams.payment_intent_data = {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: sellerStripeAccountId,
      },
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  // Update order with session id
  await supabase
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id)

  return Response.json({ url: session.url })
}
