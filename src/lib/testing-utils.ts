// ── Helper: generate random tracking code ─────────────────────────────────────
export function genTestingCode(prefix: string = 'TEST'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${s}`
}

// ── Helper: generate brand form token ─────────────────────────────────────────
export async function genBrandToken(): Promise<string> {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('')
}
