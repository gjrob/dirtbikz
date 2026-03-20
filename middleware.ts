import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin/* except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = request.cookies.get('admin_session')?.value
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword || session !== adminPassword) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Protect legacy /dashboard
  if (pathname.startsWith('/dashboard')) {
    const session = request.cookies.get('admin_session')?.value
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword || session !== adminPassword) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Protect /seller/[id]/dashboard — require seller session cookie
  if (pathname.match(/^\/seller\/[^/]+\/dashboard/)) {
    const sellerSession = request.cookies.get('seller_session')?.value
    if (!sellerSession) {
      return NextResponse.redirect(new URL('/seller/onboarding', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/seller/:path*'],
}
