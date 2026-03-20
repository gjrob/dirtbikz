import { vi } from 'vitest'

/** Create a mock Supabase client with chainable query builder */
export function mockSupabase() {
  const queryResult = { data: null as unknown, error: null as unknown, count: null as number | null }

  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  const chainMethods = ['from', 'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'not', 'gte', 'lte', 'order', 'limit', 'single', 'maybeSingle']

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnThis()
  }
  builder.single = vi.fn().mockResolvedValue(queryResult)
  builder.select = vi.fn().mockImplementation(() => {
    const chain = { ...builder, then: (resolve: (v: typeof queryResult) => void) => resolve(queryResult) }
    return chain
  })

  const rpc = vi.fn().mockResolvedValue({ data: 0, error: null })

  return {
    client: { from: vi.fn().mockReturnValue(builder), rpc },
    builder,
    setResult: (data: unknown, error?: unknown) => {
      queryResult.data = data
      queryResult.error = error || null
    },
    setCount: (count: number) => { queryResult.count = count },
  }
}

/** Create a mock Stripe instance */
export function mockStripe() {
  return {
    accounts: {
      create: vi.fn().mockResolvedValue({ id: 'acct_test123' }),
      createLoginLink: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com/login' }),
    },
    accountLinks: {
      create: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com/setup/abc' }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: 'cs_test123', url: 'https://checkout.stripe.com/pay/abc' }),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
    balance: {
      retrieve: vi.fn().mockResolvedValue({
        available: [{ amount: 50000 }],
        pending: [{ amount: 15000 }],
      }),
    },
  }
}

/** Create a mock Request */
export function mockRequest(body: unknown, method = 'POST', url = 'http://localhost:3000/api/test'): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  })
}

/** Create a mock GET Request with query params */
export function mockGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/test')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

/** Parse JSON response helper */
export async function parseResponse(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() }
}
