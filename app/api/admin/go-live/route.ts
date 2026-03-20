import { createServiceClient } from '@/lib/supabase'
import { checkAdmin } from '../_auth'

export const runtime = 'nodejs'

/** GET /api/admin/go-live — Production readiness checklist with live status */
export async function GET() {
  if (!checkAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Run all checks in parallel
  const [
    { count: sellerCount },
    { count: activeSellerCount },
    { count: productCount },
    { count: liveProductCount },
    { count: orderCount },
    { count: paidOrderCount },
    { count: disputeCount },
    { count: vinLookupCount },
  ] = await Promise.all([
    supabase.from('sellers').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz'),
    supabase.from('sellers').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz').eq('status', 'active'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz').eq('in_stock', true),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz').eq('payment_status', 'paid'),
    supabase.from('seller_disputes').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz'),
    supabase.from('vin_lookups').select('id', { count: 'exact', head: true }).eq('client_slug', 'dirtbikz'),
  ])

  // Environment checks
  const envChecks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    stripe_secret_key: !!process.env.STRIPE_SECRET_KEY,
    stripe_live_mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') || false,
    stripe_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    seller_salt: !!process.env.SELLER_SALT,
    seller_salt_custom: process.env.SELLER_SALT !== 'dirtbikz-seller-salt-change-in-production',
    admin_password: !!process.env.ADMIN_PASSWORD,
    app_url: !!process.env.NEXT_PUBLIC_APP_URL,
  }

  // Build checklist
  const checklist = [
    // Infrastructure
    { category: 'Infrastructure', item: 'Supabase URL configured', status: envChecks.supabase_url, critical: true },
    { category: 'Infrastructure', item: 'Supabase service role key', status: envChecks.supabase_service_key, critical: true },
    { category: 'Infrastructure', item: 'Stripe secret key configured', status: envChecks.stripe_secret_key, critical: true },
    { category: 'Infrastructure', item: 'Stripe in LIVE mode', status: envChecks.stripe_live_mode, critical: true },
    { category: 'Infrastructure', item: 'Stripe webhook secret', status: envChecks.stripe_webhook_secret, critical: true },
    { category: 'Infrastructure', item: 'Seller password salt (custom)', status: envChecks.seller_salt_custom, critical: true },
    { category: 'Infrastructure', item: 'Admin password set', status: envChecks.admin_password, critical: true },
    { category: 'Infrastructure', item: 'App URL configured', status: envChecks.app_url, critical: false },

    // Database
    { category: 'Database', item: 'Sellers table populated', status: (sellerCount || 0) > 0, critical: false },
    { category: 'Database', item: 'Products table populated', status: (productCount || 0) > 0, critical: false },
    { category: 'Database', item: 'At least 1 active seller', status: (activeSellerCount || 0) > 0, critical: false },
    { category: 'Database', item: 'At least 1 live product', status: (liveProductCount || 0) > 0, critical: false },

    // Transactions
    { category: 'Transactions', item: 'First order created', status: (orderCount || 0) > 0, critical: false },
    { category: 'Transactions', item: 'First payment received', status: (paidOrderCount || 0) > 0, critical: false },
    { category: 'Transactions', item: 'VIN lookup tested', status: (vinLookupCount || 0) > 0, critical: false },

    // Onboarding
    { category: 'Onboarding', item: 'DIRTBIKZ owner invited', status: false, critical: false, manual: true },
    { category: 'Onboarding', item: 'WESTERN-N-THIRD owner invited', status: false, critical: false, manual: true },
    { category: 'Onboarding', item: 'First payout verified (3-day wait)', status: false, critical: false, manual: true },
  ]

  const stats = {
    sellers: sellerCount || 0,
    active_sellers: activeSellerCount || 0,
    products: productCount || 0,
    live_products: liveProductCount || 0,
    orders: orderCount || 0,
    paid_orders: paidOrderCount || 0,
    disputes: disputeCount || 0,
    vin_lookups: vinLookupCount || 0,
  }

  const passed = checklist.filter(c => c.status).length
  const total = checklist.length
  const criticalFailing = checklist.filter(c => c.critical && !c.status).length

  return Response.json({
    checklist,
    stats,
    summary: {
      passed,
      total,
      critical_failing: criticalFailing,
      ready: criticalFailing === 0,
      percentage: Math.round((passed / total) * 100),
    },
  })
}
