/**
 * 分 → 元 顯示字串（後端組報表用；前端亦可自行 /100）。
 * 例：12345 → "123.45"
 */
export function centsToStr(cents: number | null | undefined): string {
  const n = typeof cents === 'number' ? cents : 0
  return (n / 100).toFixed(2)
}

/**
 * CSV 欄位轉義：處理逗號、引號、換行，並防 CSV injection。
 * 遇到以 = + - @ 開頭的值加前置單引號，避免試算表執行公式。
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = "'" + s
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}
