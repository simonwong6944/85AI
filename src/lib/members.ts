export function expiryDate(years = 3): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

// ─── HK phone validator ───────────────────────────────────────────────────────
// Valid HK numbers: mobile 5/6/9xxxxxxx, landline 2/3xxxxxxx
// Rejects obvious fakes: 00000000, 11111111, 12345678, 99999999, etc.
export function validateHKPhone(phone: string): { ok: boolean; error?: string } {
  const p = phone.replace(/\D/g, '')
  if (p.length !== 8) return { ok: false, error: '請填寫正確的 8 位香港電話號碼' }
  if (!/^[2-9]/.test(p)) return { ok: false, error: '電話號碼格式不正確（香港號碼以 2–9 開頭，1 除外）' }
  // Reject obvious fakes: all same digit, sequential
  if (/^(\d)\1{7}$/.test(p)) return { ok: false, error: '請填寫真實的電話號碼' }
  if (p === '12345678' || p === '87654321' || p === '11223344') return { ok: false, error: '請填寫真實的電話號碼' }
  return { ok: true }
}
