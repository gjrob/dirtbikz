import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
  const { items, customer } = await req.json()

  if (!items?.length) {
    return Response.json({ error: 'No items' }, { status: 400 })
  }

  const totalCents = items.reduce((sum: number, i: { price_cents: number; quantity: number }) => sum + i.price_cents * i.quantity, 0)

  // Create order record first
  const supabase = createServiceClient()
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      client_slug: 'dirtbikz',
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || null,
      items,
      total_cents: totalCents,
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

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customer.email,
    metadata: { order_id: order.id, client_slug: 'dirtbikz' },
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
  })

  // Update order with session id
  await supabase
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id)

  return Response.json({ url: session.url })
}
