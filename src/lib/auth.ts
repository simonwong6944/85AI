import { getCookie } from 'hono/cookie'

export function makeToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function sessionExpiry(hours = 12): string {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

export function getSessionToken(c: any): string | undefined {
  return getCookie(c, 'admin_session')
}
