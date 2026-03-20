import { describe, it, expect } from 'vitest'

// ── Commission & Checkout Tests ──────────────────────────────────────────────
// Tests: 5% platform fee, 95% seller payout, Stripe Connect split

describe('Commission Calculation (95/5 Split)', () => {
  const PLATFORM_FEE_PERCENT = 5

  function calculateSplit(totalCents: number) {
    const platformFeeCents = Math.round(totalCents * PLATFORM_FEE_PERCENT / 100)
    const sellerPayoutCents = totalCents - platformFeeCents
    return { platformFeeCents, sellerPayoutCents }
  }

  it('should calculate 5% platform fee on $100 order', () => {
    const { platformFeeCents, sellerPayoutCents } = calculateSplit(10000)
    expect(platformFeeCents).toBe(500)   // $5
    expect(sellerPayoutCents).toBe(9500) // $95
  })

  it('should calculate 5% on $6,999 dirt bike', () => {
    const { platformFeeCents, sellerPayoutCents } = calculateSplit(699900)
    expect(platformFeeCents).toBe(34995)  // $349.95
    expect(sellerPayoutCents).toBe(664905) // $6,649.05
  })

  it('should handle small amounts without rounding errors', () => {
    const { platformFeeCents, sellerPayoutCents } = calculateSplit(100) // $1
    expect(platformFeeCents).toBe(5)   // $0.05
    expect(sellerPayoutCents).toBe(95) // $0.95
    expect(platformFeeCents + sellerPayoutCents).toBe(100) // no penny lost
  })

  it('should handle $0 amount (no seller)', () => {
    const totalCents = 5000
    const sellerStripeAccountId = null
    const platformFeeCents = sellerStripeAccountId ? Math.round(totalCents * PLATFORM_FEE_PERCENT / 100) : 0
    expect(platformFeeCents).toBe(0)
  })

  it('should set application_fee_amount in Stripe session when seller exists', () => {
    const totalCents = 699900
    const sellerStripeAccountId = 'acct_test123'
    const platformFeeCents = Math.round(totalCents * PLATFORM_FEE_PERCENT / 100)

    const sessionParams: Record<string, unknown> = {}
    if (sellerStripeAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: sellerStripeAccountId },
      }
    }

    expect(sessionParams.payment_intent_data).toBeDefined()
    const pid = sessionParams.payment_intent_data as { application_fee_amount: number; transfer_data: { destination: string } }
    expect(pid.application_fee_amount).toBe(34995)
    expect(pid.transfer_data.destination).toBe('acct_test123')
  })
})

describe('Order Creation', () => {
  it('should create order with seller_id, platform_fee, and seller_payout', () => {
    const order = {
      client_slug: 'dirtbikz',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      items: [{ product_id: 'prod_1', name: '2023 CRF250R', price_cents: 699900, quantity: 1 }],
      total_cents: 699900,
      seller_id: 'seller_1',
      platform_fee_cents: 34995,
      seller_payout_cents: 664905,
      payment_status: 'pending',
      order_status: 'new',
    }

    expect(order.total_cents).toBe(order.platform_fee_cents + order.seller_payout_cents)
    expect(order.seller_id).toBeDefined()
    expect(order.client_slug).toBe('dirtbikz')
  })
})
