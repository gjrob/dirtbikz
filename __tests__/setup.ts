import { vi } from 'vitest'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
process.env.SELLER_SALT = 'test-salt'
process.env.ADMIN_PASSWORD = 'testpass123'
process.env.NEXT_PUBLIC_APP_URL = 'https://dirtbikz.com'
process.env.NEXT_PUBLIC_CLIENT_SLUG = 'dirtbikz'

// Mock next/headers cookies
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))
