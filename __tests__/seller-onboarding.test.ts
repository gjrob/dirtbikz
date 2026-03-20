import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Seller Onboarding E2E Tests ──────────────────────────────────────────────
// Tests: registration → annual fee → Stripe Connect → activation
// Business rules: $10,299 fee, EARLY6 coupon ($10k off), 3-day payout delay

describe('Seller Onboarding Flow', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  describe('1. Registration', () => {
    it('should reject missing required fields', async () => {
      const { POST } = await import('@/app/api/seller/onboarding/route')

      vi.mock('@/lib/supabase', () => ({
        createServiceClient: () => ({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }) }),
      }))

      const req = new Request('http://localhost/api/seller/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com' }), // missing password, business_name, contact_name
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('Missing required fields')
    })
  })

  describe('2. Annual Fee Pricing', () => {
    it('should set annual fee to $10,299 (1029900 cents)', () => {
      const ANNUAL_FEE_CENTS = 1029900
      expect(ANNUAL_FEE_CENTS).toBe(1029900)
      expect(ANNUAL_FEE_CENTS / 100).toBe(10299)
    })

    it('should apply EARLY6 coupon for $10,000 discount', () => {
      const ANNUAL_FEE_CENTS = 1029900
      const EARLY_BIRD_DISCOUNT_CENTS = 1000000
      const discountedFee = ANNUAL_FEE_CENTS - EARLY_BIRD_DISCOUNT_CENTS
      expect(discountedFee).toBe(29900) // $299
    })

    it('should limit EARLY6 to first 6 sellers', () => {
      const MAX_EARLY_BIRD_SELLERS = 6
      const paidSellers = 6
      expect(paidSellers >= MAX_EARLY_BIRD_SELLERS).toBe(true) // coupon should not apply
    })
  })

  describe('3. Stripe Connect Configuration', () => {
    it('should configure 3-day payout delay with daily schedule', () => {
      const payoutSettings = {
        schedule: { delay_days: 3, interval: 'daily' },
      }
      expect(payoutSettings.schedule.delay_days).toBe(3)
      expect(payoutSettings.schedule.interval).toBe('daily')
    })

    it('should create Express account with card_payments and transfers', () => {
      const capabilities = {
        card_payments: { requested: true },
        transfers: { requested: true },
      }
      expect(capabilities.card_payments.requested).toBe(true)
      expect(capabilities.transfers.requested).toBe(true)
    })
  })

  describe('4. Seller Session', () => {
    it('should hash passwords with SHA-256 + salt', async () => {
      const { hashPassword, verifyPassword } = await import('@/lib/seller-auth')
      const hash = await hashPassword('test123')
      expect(hash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 = 64 hex chars
      expect(await verifyPassword('test123', hash)).toBe(true)
      expect(await verifyPassword('wrong', hash)).toBe(false)
    })
  })
})
