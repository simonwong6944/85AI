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

/**
 * Haversine 公式：計算兩個經緯度之間的距離（米）。
 * 用於硬性 geofence 判斷。
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}
