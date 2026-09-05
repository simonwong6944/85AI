/**
 * 取得下一個 CW 編號。
 * 用單一 UPDATE ... RETURNING，避免「先讀後寫」race condition。
 * counter seed = 0，第一次回傳 1 → "CW000001"。
 */
export async function nextCwNo(db: D1Database): Promise<string> {
  const row = await db
    .prepare('UPDATE coworkery_counter SET next_val = next_val + 1 WHERE id = 1 RETURNING next_val')
    .first<{ next_val: number }>()
  if (!row || typeof row.next_val !== 'number') {
    throw new Error('coworkery_counter 未初始化或更新失敗')
  }
  return 'CW' + String(row.next_val).padStart(6, '0')
}
