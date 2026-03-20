import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { hashPassword, setSellerSession } from '@/lib/seller-auth'

export const runtime = 'nodejs'

const ANNUAL_FEE_CENTS = 1029900 // $10,299
const EARLY_BIRD_DISCOUNT_CENTS = 1000000 // $10,000 off for first 6 sellers
const EARLY_BIRD_COUPON = 'EARLY6'
const MAX_EARLY_BIRD_SELLERS = 6
const PLATFORM_FEE_PERCENT = 5

/** POST /api/seller/onboarding — Register new seller + create Stripe Connect + annual fee checkout */
export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
  const body = await req.json()
  const { email, password, business_name, contact_name, phone, coupon_code } = body

  if (!email || !password || !business_name || !contact_name) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check if seller already exists
  const { data: existing } = await supabase
    .from('sellers')
    .select('id, annual_fee_status, stripe_account_id')
    .eq('email', email)
    .single()

  if (existing) {
    // If they registered but haven't paid the annual fee, let them retry
    if (existing.annual_fee_status === 'unpaid') {
      return await createAnnualFeeCheckout(stripe, supabase, existing.id, email, coupon_code)
    }
    return Response.json({ error: 'Email already registered' }, { status: 409 })
  }

  // Validate coupon code if provided
  let discountCents = 0
  let validCoupon: string | null = null
  if (coupon_code?.toUpperCase() === EARLY_BIRD_COUPON) {
    const { data: paidCount } = await supabase.rpc('count_paid_sellers')
    if ((paidCount ?? 0) < MAX_EARLY_BIRD_SELLERS) {
      discountCents = EARLY_BIRD_DISCOUNT_CENTS
      validCoupon = EARLY_BIRD_COUPON
    }
  }

  // Create Stripe Connect Express account with 3-day payout delay
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    business_type: 'individual',
    metadata: { client_slug: 'dirtbikz', business_name },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        // 3-day rolling payout delay, any amount
        schedule: { delay_days: 3, interval: 'daily' },
      },
    },
  })

  // Insert seller record (status: pending until annual fee is paid)
  const password_hash = await hashPassword(password)
  const feeAmount = ANNUAL_FEE_CENTS - discountCents

  const { data: seller, error } = await supabase
    .from('sellers')
    .insert({
      client_slug: 'dirtbikz',
      email,
      password_hash,
      business_name,
      contact_name,
      phone: phone || null,
      stripe_account_id: account.id,
      status: 'pending',
      annual_fee_status: 'unpaid',
      annual_fee_amount_cents: feeAmount,
      coupon_code: validCoupon,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Seller insert error:', error)
    return Response.json({ error: 'Failed to create seller' }, { status: 500 })
  }

  // Set session cookie so they can resume if they leave
  setSellerSession(seller.id)

  // Create Stripe Checkout for annual fee
  return await createAnnualFeeCheckout(stripe, supabase, seller.id, email, coupon_code)
}

/** GET /api/seller/onboarding — Resume onboarding for existing seller (Stripe Connect link) */
export async function GET(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
  const { searchParams } = new URL(req.url)
  const sellerId = searchParams.get('seller_id')

  if (!sellerId) {
    return Response.json({ error: 'Missing seller_id' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, stripe_account_id, annual_fee_status, stripe_onboarding_complete')
    .eq('id', sellerId)
    .single()

  if (!seller) {
    return Response.json({ error: 'Seller not found' }, { status: 404 })
  }

  // If annual fee not paid, redirect to payment
  if (seller.annual_fee_status !== 'paid') {
    return Response.json({
      step: 'payment',
      message: 'Annual fee payment required before Stripe Connect setup',
    })
  }

  // If Stripe Connect not complete, generate new onboarding link
  if (!seller.stripe_onboarding_complete && seller.stripe_account_id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dirtbikz.com'
    const accountLink = await stripe.accountLinks.create({
      account: seller.stripe_account_id,
      refresh_url: `${appUrl}/seller/onboarding?refresh=true`,
      return_url: `${appUrl}/seller/${seller.id}/dashboard?onboarding=complete`,
      type: 'account_onboarding',
    })

    return Response.json({
      step: 'connect',
      onboarding_url: accountLink.url,
    })
  }

  return Response.json({
    step: 'complete',
    message: 'Onboarding already complete',
  })
}

async function createAnnualFeeCheckout(
  stripe: Stripe,
  supabase: ReturnType<typeof createServiceClient>,
  sellerId: string,
  email: string,
  couponCode?: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dirtbikz.com'

  // Get the seller's fee amount (may have early bird discount applied)
  const { data: seller } = await supabase
    .from('sellers')
    .select('annual_fee_amount_cents, stripe_account_id')
    .eq('id', sellerId)
    .single()

  const feeCents = seller?.annual_fee_amount_cents || ANNUAL_FEE_CENTS

  // Create one-time Checkout Session for annual fee
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: email,
    metadata: {
      type: 'seller_annual_fee',
      seller_id: sellerId,
      client_slug: 'dirtbikz',
      coupon_code: couponCode?.toUpperCase() || '',
    },
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: feeCents,
        product_data: {
          name: 'DIRTBIKZ Seller Marketplace — Annual Fee',
          description: [
            'Full marketplace access for 12 months',
            `${PLATFORM_FEE_PERCENT}% commission on sales`,
            'Stripe Connect payouts every 3 days',
            'VIN verification & fraud protection',
            feeCents < ANNUAL_FEE_CENTS ? `Early bird discount applied (-$${((ANNUAL_FEE_CENTS - feeCents) / 100).toLocaleString()})` : null,
          ].filter(Boolean).join(' · '),
        },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/seller/onboarding?fee_paid=true&seller_id=${sellerId}`,
    cancel_url: `${appUrl}/seller/onboarding?fee_cancelled=true`,
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return Response.json({
    seller_id: sellerId,
    stripe_account_id: seller?.stripe_account_id || null,
    checkout_url: session.url,
    annual_fee_cents: feeCents,
    discount_applied: feeCents < ANNUAL_FEE_CENTS,
  }, { status: 201 })
}
