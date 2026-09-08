// ── 工具：SHA-256 哈希（Web Crypto API）────────────────────────────────────
export async function sha256hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── 工具：追加哈希鏈記錄 ────────────────────────────────────────────────────
export async function appendHashChain(
  db: D1Database,
  record_type: string,
  record_id: number,
  payload: string
): Promise<string> {
  const last = await db.prepare(
    'SELECT sha256 FROM hash_chain ORDER BY id DESC LIMIT 1'
  ).first<{ sha256: string }>()
  const prev = last?.sha256 ?? ''
  const hash = await sha256hex(prev + record_type + record_id + payload)
  await db.prepare(
    'INSERT INTO hash_chain (record_type, record_id, sha256, prev_hash) VALUES (?,?,?,?)'
  ).bind(record_type, record_id, hash, prev).run()
  return hash
}
