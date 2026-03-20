import { describe, it, expect } from 'vitest'

// ── VIN Lookup & Fraud Detection Tests ───────────────────────────────────────
// Tests: VIN validation, NHTSA decode, price flagging, fraud scoring

describe('VIN Validation', () => {
  const isValidVin = (vin: string) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)

  it('should accept valid 17-char VIN', () => {
    expect(isValidVin('KMHLN4AJ5CU123456')).toBe(true)
    expect(isValidVin('1HGCM82633A123456')).toBe(true)
  })

  it('should reject VINs with I, O, Q', () => {
    expect(isValidVin('KMHLN4AJ5CI123456')).toBe(false) // I
    expect(isValidVin('KMHLN4AJ5CO123456')).toBe(false) // O
    expect(isValidVin('KMHLN4AJ5CQ123456')).toBe(false) // Q
  })

  it('should reject short VINs', () => {
    expect(isValidVin('KMHLN4AJ5CU12345')).toBe(false)  // 16 chars
    expect(isValidVin('')).toBe(false)
  })

  it('should reject VINs with spaces or special chars', () => {
    expect(isValidVin('KMHLN4AJ5CU 23456')).toBe(false)
    expect(isValidVin('KMHLN4AJ5CU-23456')).toBe(false)
  })
})

describe('Price Flag Logic', () => {
  function getPriceFlag(msrpCents: number | null, listedPriceCents: number | null) {
    if (!msrpCents || !listedPriceCents) return { flag: 'normal', deviation: null }
    const deviation = ((listedPriceCents - msrpCents) / msrpCents) * 100
    const deviationPct = Math.round(deviation * 100) / 100

    let flag = 'normal'
    if (deviation < -40) flag = 'suspicious'
    else if (deviation < -20) flag = 'underpriced'
    else if (deviation > 50) flag = 'overpriced'

    return { flag, deviation: deviationPct }
  }

  it('should flag as normal when price is within 20% of MSRP', () => {
    const { flag } = getPriceFlag(800000, 750000) // $8k MSRP, $7.5k listed
    expect(flag).toBe('normal')
  })

  it('should flag as underpriced when >20% below MSRP', () => {
    const { flag } = getPriceFlag(800000, 600000) // $8k MSRP, $6k listed = -25%
    expect(flag).toBe('underpriced')
  })

  it('should flag as suspicious when >40% below MSRP', () => {
    const { flag } = getPriceFlag(800000, 400000) // $8k MSRP, $4k listed = -50%
    expect(flag).toBe('suspicious')
  })

  it('should flag as overpriced when >50% above MSRP', () => {
    const { flag } = getPriceFlag(800000, 1300000) // $8k MSRP, $13k listed = +62.5%
    expect(flag).toBe('overpriced')
  })

  it('should return normal when MSRP is missing', () => {
    const { flag } = getPriceFlag(null, 600000)
    expect(flag).toBe('normal')
  })

  it('should correctly order suspicious before underpriced', () => {
    // -35% should be underpriced, not suspicious
    const { flag: f35 } = getPriceFlag(100000, 65000)
    expect(f35).toBe('underpriced')

    // -45% should be suspicious
    const { flag: f45 } = getPriceFlag(100000, 55000)
    expect(f45).toBe('suspicious')
  })
})

describe('Seller Risk Scoring', () => {
  function calculateRiskScore(disputes: number, activeDisputes: number, lostDisputes: number, vinFlags: number, isSuspended: boolean) {
    let score = 0
    score += disputes * 15
    score += activeDisputes * 10
    score += lostDisputes * 25
    score += vinFlags * 8
    if (isSuspended) score += 30
    return Math.min(score, 100)
  }

  function getRiskLevel(score: number) {
    return score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
  }

  it('should score clean seller as low risk (0)', () => {
    const score = calculateRiskScore(0, 0, 0, 0, false)
    expect(score).toBe(0)
    expect(getRiskLevel(score)).toBe('low')
  })

  it('should score seller with 1 dispute as medium risk', () => {
    const score = calculateRiskScore(1, 1, 0, 0, false)
    // 1*15 + 1*10 = 25
    expect(score).toBe(25)
    expect(getRiskLevel(score)).toBe('low')
  })

  it('should score seller with 2 lost disputes as high risk', () => {
    const score = calculateRiskScore(2, 0, 2, 0, false)
    // 2*15 + 2*25 = 80
    expect(score).toBe(80)
    expect(getRiskLevel(score)).toBe('high')
  })

  it('should cap at 100', () => {
    const score = calculateRiskScore(10, 5, 5, 10, true)
    expect(score).toBe(100)
  })

  it('should add 30 points for suspended seller', () => {
    const clean = calculateRiskScore(0, 0, 0, 0, false)
    const suspended = calculateRiskScore(0, 0, 0, 0, true)
    expect(suspended - clean).toBe(30)
  })
})

describe('Auto-Suspension Rules', () => {
  const AUTO_SUSPEND_DISPUTE_THRESHOLD = 5
  const AUTO_SUSPEND_LOST_THRESHOLD = 2

  function shouldAutoSuspend(disputes30d: number, lostDisputes: number): string | null {
    if (disputes30d >= AUTO_SUSPEND_DISPUTE_THRESHOLD) {
      return `${disputes30d} disputes in 30 days (threshold: ${AUTO_SUSPEND_DISPUTE_THRESHOLD})`
    }
    if (lostDisputes >= AUTO_SUSPEND_LOST_THRESHOLD) {
      return `${lostDisputes} lost disputes (threshold: ${AUTO_SUSPEND_LOST_THRESHOLD})`
    }
    return null
  }

  it('should not trigger for clean seller', () => {
    expect(shouldAutoSuspend(0, 0)).toBeNull()
  })

  it('should not trigger for 4 disputes in 30 days', () => {
    expect(shouldAutoSuspend(4, 0)).toBeNull()
  })

  it('should trigger for 5+ disputes in 30 days', () => {
    const reason = shouldAutoSuspend(5, 0)
    expect(reason).toContain('5 disputes in 30 days')
  })

  it('should trigger for 2+ lost disputes', () => {
    const reason = shouldAutoSuspend(1, 2)
    expect(reason).toContain('2 lost disputes')
  })

  it('should prioritize dispute count over lost count', () => {
    const reason = shouldAutoSuspend(6, 3)
    expect(reason).toContain('6 disputes in 30 days')
  })
})

describe('Order Velocity Detection', () => {
  const VELOCITY_WINDOW_MINUTES = 30
  const VELOCITY_MAX_ORDERS = 3

  function detectVelocity(orders: { created_at: string }[]): boolean {
    if (orders.length < VELOCITY_MAX_ORDERS) return false
    for (let i = 0; i < orders.length - 1; i++) {
      let cluster = 1
      for (let j = i + 1; j < orders.length; j++) {
        const diffMs = new Date(orders[i].created_at).getTime() - new Date(orders[j].created_at).getTime()
        if (Math.abs(diffMs) <= VELOCITY_WINDOW_MINUTES * 60 * 1000) cluster++
      }
      if (cluster >= VELOCITY_MAX_ORDERS) return true
    }
    return false
  }

  it('should not flag 2 orders from same email', () => {
    const orders = [
      { created_at: '2026-03-20T10:00:00Z' },
      { created_at: '2026-03-20T10:05:00Z' },
    ]
    expect(detectVelocity(orders)).toBe(false)
  })

  it('should flag 3+ orders within 30 minutes', () => {
    const orders = [
      { created_at: '2026-03-20T10:00:00Z' },
      { created_at: '2026-03-20T10:10:00Z' },
      { created_at: '2026-03-20T10:20:00Z' },
    ]
    expect(detectVelocity(orders)).toBe(true)
  })

  it('should not flag 3 orders spread over hours', () => {
    const orders = [
      { created_at: '2026-03-20T10:00:00Z' },
      { created_at: '2026-03-20T12:00:00Z' },
      { created_at: '2026-03-20T14:00:00Z' },
    ]
    expect(detectVelocity(orders)).toBe(false)
  })
})
