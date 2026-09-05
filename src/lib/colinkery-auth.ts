export async function verifyColinkerySess(db: D1Database, token: string | undefined): Promise<string | null> {
  if (!token) return null
  const row = await db.prepare(
    `SELECT member_no FROM colinkery_sessions WHERE token=? AND expires_at > datetime('now')`
  ).bind(token).first<{ member_no: string }>()
  if (!row) return null
  // 確認帳戶仍 active
  const m = await db.prepare(`SELECT colinkery_account_status FROM members WHERE member_no=?`).bind(row.member_no).first<{ colinkery_account_status: string }>()
  if (!m || m.colinkery_account_status !== 'active') return null
  return row.member_no
}
