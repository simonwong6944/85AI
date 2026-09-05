/**
 * 分 → 元 顯示字串（後端組報表用；前端亦可自行 /100）。
 * 例：12345 → "123.45"
 */
export function centsToStr(cents: number | null | undefined): string {
  const n = typeof cents === 'number' ? cents : 0
  return (n / 100).toFixed(2)
}
