import { cookies } from 'next/headers'
import { createServiceClient } from './supabase'

/** Hash password using Web Crypto (no bcrypt dependency needed) */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + process.env.SELLER_SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password)
  return computed === hash
}

const COOKIE_NAME = 'seller_session'

export interface SellerSession {
  id: string
  email: string
  business_name: string
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  annual_fee_status: string
  status: string
}

/** Get current seller from session cookie */
export async function getSellerSession(): Promise<SellerSession | null> {
  const sellerId = cookies().get(COOKIE_NAME)?.value
  if (!sellerId) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('sellers')
    .select('id, email, business_name, stripe_account_id, stripe_onboarding_complete, annual_fee_status, status')
    .eq('id', sellerId)
    .single()

  return data
}

/** Set seller session cookie */
export function setSellerSession(sellerId: string) {
  cookies().set(COOKIE_NAME, sellerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
}

/** Clear seller session */
export function clearSellerSession() {
  cookies().delete(COOKIE_NAME)
}
