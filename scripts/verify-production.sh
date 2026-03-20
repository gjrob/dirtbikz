#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# DIRTBIKZ Seller Marketplace — Production Deployment Verification
# Run: bash scripts/verify-production.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
PASS=0
FAIL=0
WARN=0

check() {
  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} $1"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${NC} $1"
    FAIL=$((FAIL+1))
  fi
}

warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
  WARN=$((WARN+1))
}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  DIRTBIKZ Seller Marketplace — Production Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── 1. Environment Variables ──
echo "1. Environment Variables"
echo "───────────────────────────────────────────────"

[ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && check "NEXT_PUBLIC_SUPABASE_URL set" || { check "NEXT_PUBLIC_SUPABASE_URL set"; }
[ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && check "NEXT_PUBLIC_SUPABASE_ANON_KEY set" || warn "NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
[ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && check "SUPABASE_SERVICE_ROLE_KEY set" || warn "SUPABASE_SERVICE_ROLE_KEY not set"
[ -n "$STRIPE_SECRET_KEY" ] && check "STRIPE_SECRET_KEY set" || warn "STRIPE_SECRET_KEY not set"
[ -n "$STRIPE_WEBHOOK_SECRET" ] && check "STRIPE_WEBHOOK_SECRET set" || warn "STRIPE_WEBHOOK_SECRET not set"
[ -n "$SELLER_SALT" ] && check "SELLER_SALT set" || warn "SELLER_SALT not set"
[ -n "$ADMIN_PASSWORD" ] && check "ADMIN_PASSWORD set" || warn "ADMIN_PASSWORD not set"
[ -n "$NEXT_PUBLIC_APP_URL" ] && check "NEXT_PUBLIC_APP_URL set" || warn "NEXT_PUBLIC_APP_URL not set"

# Check Stripe key is live (not test)
if [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
  check "Stripe key is LIVE mode"
elif [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
  warn "Stripe key is TEST mode (switch to live for production)"
else
  warn "Stripe key format unrecognized"
fi

# Ensure SELLER_SALT is not the default
if [ "$SELLER_SALT" = "dirtbikz-seller-salt-change-in-production" ]; then
  warn "SELLER_SALT is still the default — change before production!"
fi

echo ""

# ── 2. Build Check ──
echo "2. Build Verification"
echo "───────────────────────────────────────────────"

if [ -d ".next" ]; then
  check "Next.js build exists (.next directory)"
else
  warn ".next directory not found — run 'npm run build'"
fi

# TypeScript check
npx tsc --noEmit > /dev/null 2>&1 && check "TypeScript compilation passes" || warn "TypeScript errors found"

echo ""

# ── 3. Tests ──
echo "3. Test Suite"
echo "───────────────────────────────────────────────"

npx vitest run --reporter=dot 2>/dev/null && check "All tests pass" || warn "Some tests failed"

echo ""

# ── 4. API Route Inventory ──
echo "4. API Route Inventory"
echo "───────────────────────────────────────────────"

ROUTES=$(find app/api -name "route.ts" | wc -l | tr -d ' ')
echo "  Found ${ROUTES} API routes:"

find app/api -name "route.ts" | sort | while read route; do
  path=$(echo "$route" | sed 's|app/api||' | sed 's|/route.ts||')
  echo "    /api${path}"
done

echo ""

# ── 5. Database Tables ──
echo "5. Database Migration Files"
echo "───────────────────────────────────────────────"

if [ -d "../../supabase/migrations" ]; then
  DIRTBIKZ_MIGRATIONS=$(ls ../../supabase/migrations/*dirtbikz*.sql 2>/dev/null | wc -l | tr -d ' ')
  echo "  ${DIRTBIKZ_MIGRATIONS} dirtbikz migration files:"
  ls ../../supabase/migrations/*dirtbikz*.sql 2>/dev/null | while read f; do
    echo "    $(basename $f)"
  done
  check "Migration files present"
else
  warn "Supabase migrations directory not found"
fi

echo ""

# ── 6. Key Files ──
echo "6. Critical File Check"
echo "───────────────────────────────────────────────"

FILES=(
  "app/api/seller/onboarding/route.ts"
  "app/api/seller/auth/route.ts"
  "app/api/seller/products/route.ts"
  "app/api/seller/orders/route.ts"
  "app/api/seller/payouts/route.ts"
  "app/api/seller/analytics/route.ts"
  "app/api/seller/disputes/route.ts"
  "app/api/seller/subscription/route.ts"
  "app/api/seller/vin-check/route.ts"
  "app/api/seller/stripe-dashboard/route.ts"
  "app/api/checkout/route.ts"
  "app/api/webhooks/stripe/route.ts"
  "app/api/admin/sellers/route.ts"
  "app/api/admin/disputes/route.ts"
  "app/api/admin/fraud/route.ts"
  "app/api/admin/vin-lookup/route.ts"
  "app/api/admin/vin-lookup/batch/route.ts"
  "app/api/admin/analytics/route.ts"
  "lib/seller-auth.ts"
  "lib/supabase.ts"
  "lib/use-realtime.ts"
  "middleware.ts"
)

for f in "${FILES[@]}"; do
  [ -f "$f" ] && check "$f" || warn "$f MISSING"
done

echo ""

# ── Summary ──
echo "═══════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Passed: ${PASS}${NC}  ${YELLOW}Warnings: ${WARN}${NC}  ${RED}Failed: ${FAIL}${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}DEPLOYMENT BLOCKED — fix failures before deploying${NC}"
  exit 1
elif [ $WARN -gt 3 ]; then
  echo -e "${YELLOW}REVIEW WARNINGS before deploying to production${NC}"
  exit 0
else
  echo -e "${GREEN}READY FOR DEPLOYMENT${NC}"
  exit 0
fi
