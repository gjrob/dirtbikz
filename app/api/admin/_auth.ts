import { cookies } from 'next/headers'

export function checkAdmin(): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  const session = cookies().get('admin_session')?.value
  return session === adminPassword
}
