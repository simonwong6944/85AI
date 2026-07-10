import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ─── Admin Auth Helpers ───────────────────────────────────────────────────────
function makeToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function sessionExpiry(hours = 12): string {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

function getSessionToken(c: any): string | undefined {
  return getCookie(c, 'admin_session')
}

async function verifySession(db: D1Database, token: string | undefined): Promise<boolean> {
  if (!token) return false
  const row = await db.prepare(
    `SELECT id FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')`
  ).bind(token).first()
  return !!row
}

// ─── CORS for API ────────────────────────────────────────────────────────────
app.use('/api/*', cors())

// ─── Admin Auth Middleware (MUST be before all /api/admin/* routes) ───────────
// Exempt: login, logout, me (these handle their own auth)
app.use('/api/admin/*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  // Allow login/logout/me without session
  const exempt = ['/api/admin/login', '/api/admin/logout', '/api/admin/me']
  if (exempt.includes(path)) return next()

  const token = getSessionToken(c)
  const ok = await verifySession(c.env.DB, token)
  if (!ok) return c.json({ ok: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401)
  return next()
})

// ─── Admin Auth Routes ────────────────────────────────────────────────────────
app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json<{ password: string }>()
  const expected = c.env.ADMIN_PASSWORD || 'CoEldery85Admin'
  if (!password || password !== expected) {
    return c.json({ ok: false, error: '密碼錯誤' }, 401)
  }
  const token = makeToken()
  const expiresAt = sessionExpiry(12)
  await c.env.DB.prepare(
    `INSERT INTO admin_sessions (token, role, label, expires_at) VALUES (?, 'admin', 'Admin', ?)`
  ).bind(token, expiresAt).run()
  setCookie(c, 'admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 12 * 3600
  })
  return c.json({ ok: true, role: 'admin', expires_at: expiresAt })
})

app.post('/api/admin/logout', async (c) => {
  const token = getSessionToken(c)
  if (token) {
    await c.env.DB.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(token).run()
  }
  deleteCookie(c, 'admin_session', { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/admin/me', async (c) => {
  const token = getSessionToken(c)
  const ok = await verifySession(c.env.DB, token)
  if (!ok) return c.json({ ok: false, loggedIn: false })
  return c.json({ ok: true, loggedIn: true, role: 'admin' })
})

// ─── Static assets ───────────────────────────────────────────────────────────
app.use('/shared.css', serveStatic({ root: './public' }))
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/vendor/*', serveStatic({ root: './public' }))
app.use('/assets/*', serveStatic({ root: './public' }))
// PWA static files — manifest & icons with no-cache headers so Android PWA picks up icon updates
app.use('/manifest.webmanifest', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'no-cache, must-revalidate')
}, serveStatic({ root: './public' }))
app.use('/sw.js', serveStatic({ root: './public' }))
app.use('/icon-192.png', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'no-cache, must-revalidate')
}, serveStatic({ root: './public' }))
app.use('/icon-512.png', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'no-cache, must-revalidate')
}, serveStatic({ root: './public' }))

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function nextMemberNo(db: D1Database): Promise<string> {
  const row = await db.prepare(
    'UPDATE counter SET next_val = next_val + 1 WHERE id = 1 RETURNING next_val'
  ).first<{ next_val: number }>()
  const n = row?.next_val ?? 1
  return 'CE85-' + String(n).padStart(6, '0')
}

function expiryDate(years = 3): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

// ─── HK phone validator ───────────────────────────────────────────────────────
// Valid HK numbers: mobile 5/6/9xxxxxxx, landline 2/3xxxxxxx
// Rejects obvious fakes: 00000000, 11111111, 12345678, 99999999, etc.
function validateHKPhone(phone: string): { ok: boolean; error?: string } {
  const p = phone.replace(/\D/g, '')
  if (p.length !== 8) return { ok: false, error: '請填寫正確的 8 位香港電話號碼' }
  if (!/^[2-9]/.test(p)) return { ok: false, error: '電話號碼格式不正確（香港號碼以 2–9 開頭，1 除外）' }
  // Reject obvious fakes: all same digit, sequential
  if (/^(\d)\1{7}$/.test(p)) return { ok: false, error: '請填寫真實的電話號碼' }
  if (p === '12345678' || p === '87654321' || p === '11223344') return { ok: false, error: '請填寫真實的電話號碼' }
  return { ok: true }
}

// ─── API: Register member ─────────────────────────────────────────────────────
app.post('/api/members', async (c) => {
  const db = c.env.DB
  try {
    const body = await c.req.json<{
      tier: string; nameZh: string; phone: string;
      nameEn?: string; gender?: string; birthYear?: string;
      district?: string; idPrefix?: string;
      parentPhone?: string; parentName?: string; parentNo?: string; relation?: string;
      roadshow?: string;
      source?: string; referrerNo?: string; roadshowLocation?: string;
      applyMedical?: boolean; medNameZh?: string; medNameEn?: string; medHkid?: string;
    }>()

    // Validate required fields
    if (!body.nameZh?.trim()) return c.json({ ok: false, error: '請填寫中文姓名' }, 400)
    if (!body.phone?.trim()) return c.json({ ok: false, error: '請填寫 WhatsApp 電話' }, 400)
    if (!body.birthYear || isNaN(parseInt(body.birthYear))) {
      return c.json({ ok: false, error: '請填寫出生年份' }, 400)
    }
    const phoneClean = body.phone.replace(/\D/g, '')
    const phoneCheck = validateHKPhone(phoneClean)
    if (!phoneCheck.ok) return c.json({ ok: false, error: phoneCheck.error }, 400)

    // Auto-assign tier by age (ignore frontend-supplied tier to prevent spoofing)
    const currentYear = new Date().getFullYear()
    const age = currentYear - parseInt(body.birthYear)
    const tier = age >= 55 ? 'PRIMARY' : 'FAMILY'

    // Check duplicate phone for same tier
    const existing = await db.prepare(
      'SELECT member_no FROM members WHERE phone = ? AND tier = ?'
    ).bind(phoneClean, tier).first<{ member_no: string }>()
    if (existing) {
      return c.json({ ok: false, error: `此電話已登記，會員編號：${existing.member_no}` }, 409)
    }

    // Find parent for FAMILY tier
    let parentNo = ''
    let parentName = body.parentName || ''
    if (tier === 'FAMILY') {
      if (body.parentNo) {
        // Direct lookup by member_no (from /member/:no profile page link)
        const parent = await db.prepare(
          'SELECT member_no, name_zh FROM members WHERE member_no = ? AND tier = ?'
        ).bind(body.parentNo, 'PRIMARY').first<{ member_no: string; name_zh: string }>()
        if (parent) {
          parentNo = parent.member_no
          parentName = parent.name_zh
        }
      } else if (body.parentPhone) {
        // Lookup by phone (manual entry)
        const parent = await db.prepare(
          'SELECT member_no, name_zh FROM members WHERE phone = ? AND tier = ?'
        ).bind(body.parentPhone.replace(/\D/g, ''), 'PRIMARY').first<{ member_no: string; name_zh: string }>()
        if (parent) {
          parentNo = parent.member_no
          parentName = parent.name_zh
        }
      }
    }

    const memberNo = await nextMemberNo(db)
    const expires = expiryDate(1)
    const now = new Date().toISOString()
    const roadshow = body.roadshow || 'walk-in'
    const source = body.source || 'walk-in'
    const referrerNo = body.referrerNo?.trim() || ''
    const roadshowLocation = body.roadshowLocation?.trim() || ''

    // Validate referrer if provided
    if (referrerNo) {
      const ref = await db.prepare('SELECT member_no FROM members WHERE member_no = ?').bind(referrerNo).first()
      if (!ref) return c.json({ ok: false, error: `介紹人會員編號 ${referrerNo} 不存在` }, 400)
    }

    await db.prepare(`
      INSERT INTO members
        (member_no, tier, name_zh, phone, name_en, gender, birth_year,
         district, id_prefix, parent_no, parent_name, relation,
         roadshow, kyc_status, role, expires_at, created_at,
         source, referrer_no, roadshow_location, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      memberNo, tier,
      body.nameZh.trim(), phoneClean,
      body.nameEn?.trim() || '', body.gender || '',
      body.birthYear ? parseInt(body.birthYear) : null,
      body.district || '', body.idPrefix || '',
      parentNo, parentName, body.relation || '',
      roadshow, 'PENDING', 'CoExplorery',
      expires, now,
      source, referrerNo, roadshowLocation, 'ACTIVE'
    ).run()

    // Log roadshow entry
    if (roadshow !== 'walk-in') {
      await db.prepare(
        'INSERT INTO roadshow_log (roadshow_code, member_no) VALUES (?,?)'
      ).bind(roadshow, memberNo).run()
    }

    // Medical card application (if opted in)
    let medicalApplied = false
    const medNameZhFinal = body.medNameZh?.trim() || ''
    const medNameEnFinal = body.medNameEn?.trim().toUpperCase() || ''
    const medHkidFinal = body.medHkid?.trim().toUpperCase() || ''
    if (body.applyMedical && medNameZhFinal && medNameEnFinal && medHkidFinal) {
      await db.prepare(`
        INSERT INTO medical_card_applications
          (member_no, name_zh_full, name_en_full, hkid_prefix, phone)
        VALUES (?,?,?,?,?)
      `).bind(
        memberNo,
        medNameZhFinal,
        medNameEnFinal,
        medHkidFinal,
        phoneClean
      ).run()

      // 改動 3: 覆蓋真名前先讀原化名，記入 admin_notes
      const origRow = await db.prepare(
        'SELECT name_zh, admin_notes FROM members WHERE member_no = ?'
      ).bind(memberNo).first<{ name_zh: string; admin_notes: string | null }>()
      const origName = origRow?.name_zh || ''
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19)
      const newNote = `原註冊名：${origName}（醫健卡補真名覆蓋 於 ${nowStr}）`
      const existingNotes = origRow?.admin_notes ? origRow.admin_notes.trim() : ''
      const mergedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote

      // Sync real name from medical card back to member record (Part A) + append admin_notes
      await db.prepare(`
        UPDATE members
        SET name_zh = ?, name_en = ?, id_prefix = ?, admin_notes = ?
        WHERE member_no = ?
      `).bind(
        medNameZhFinal,
        medNameEnFinal,
        medHkidFinal,
        mergedNotes,
        memberNo
      ).run()
      medicalApplied = true
    }

    // 改動 4: response 返回正確名字（若有申請醫健卡，用醫健卡真名）
    const responseNameZh = medicalApplied ? medNameZhFinal : body.nameZh.trim()
    const responseNameEn = medicalApplied ? medNameEnFinal : (body.nameEn?.trim() || '')

    return c.json({
      ok: true,
      memberNo,
      nameZh: responseNameZh,
      nameEn: responseNameEn,
      tier: tier,
      expiresAt: expires,
      role: 'CoExplorery',
      medicalApplied
    })
  } catch (err) {
    console.error(err)
    return c.json({ ok: false, error: '登記失敗，請再試一次' }, 500)
  }
})

// ─── API: Lookup member by phone ──────────────────────────────────────────────
app.get('/api/members/lookup', async (c) => {
  // Support: ?phone=XXXXX (legacy) or ?q=XXXXX (phone or member_no, from /app)
  const q = c.req.query('q')?.trim() || c.req.query('phone')?.trim() || ''
  if (!q) return c.json({ ok: false, error: 'Missing query' }, 400)
  const db = c.env.DB
  // Try member_no first (CE85-XXXXXX format), then phone (digits only)
  let row: any = null
  if (/^CE85-/i.test(q)) {
    row = await db.prepare(
      'SELECT member_no, name_zh, name_en, tier, role, expires_at, kyc_status, verified_at, wa_clicked_at FROM members WHERE member_no = ? LIMIT 1'
    ).bind(q.toUpperCase()).first()
  }
  if (!row) {
    const digits = q.replace(/\D/g, '')
    if (digits) {
      row = await db.prepare(
        'SELECT member_no, name_zh, name_en, tier, role, expires_at, kyc_status, verified_at, wa_clicked_at FROM members WHERE phone = ? ORDER BY created_at LIMIT 1'
      ).bind(digits).first()
    }
  }
  if (!row) return c.json({ ok: false, error: '查無此電話號碼或會員編號' }, 404)
  // Return both formats for compatibility
  // wa_clicked_at: used by /app to show install banner immediately (user clicked WA before)
  const m = row as any
  return c.json({ ok: true, member: m, member_no: m.member_no, name_zh: m.name_zh, verified_at: m.verified_at ?? null, wa_clicked_at: m.wa_clicked_at ?? null })
})

// ─── API: Get member by number ────────────────────────────────────────────────
app.get('/api/members/:no', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const row = await db.prepare(
    'SELECT * FROM members WHERE member_no = ?'
  ).bind(no).first()
  if (!row) return c.json({ ok: false, error: '查無此會員' }, 404)
  return c.json({ ok: true, member: row })
})

// ─── API: Admin list members ──────────────────────────────────────────────────
app.get('/api/admin/members', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 500)
  const tier = c.req.query('tier')
  const search = c.req.query('search')
  const status = c.req.query('status')
  const source = c.req.query('source')
  const district = c.req.query('district')
  const roadshow = c.req.query('roadshow')
  const exportCsv = c.req.query('export') === 'csv'
  const offset = (page - 1) * limit

  const groupFilter = c.req.query('group_id')
  let where = 'WHERE 1=1'
  const params: (string | number)[] = []
  if (tier) { where += ' AND m.tier = ?'; params.push(tier) }
  if (status) { where += ' AND m.status = ?'; params.push(status) }
  if (source) { where += ' AND m.source = ?'; params.push(source) }
  if (district) { where += ' AND m.district = ?'; params.push(district) }
  if (roadshow) { where += ' AND m.roadshow = ?'; params.push(roadshow) }
  if (groupFilter === 'none') { where += ' AND m.group_id IS NULL' }
  else if (groupFilter) { where += ' AND m.group_id = ?'; params.push(groupFilter) }
  if (search) {
    where += ' AND (m.name_zh LIKE ? OR m.name_en LIKE ? OR m.member_no LIKE ? OR m.phone LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const countRow = await db.prepare(
    `SELECT COUNT(*) as total FROM members m ${where}`
  ).bind(...params).first<{ total: number }>()

  // CSV export — return all matching rows
  if (exportCsv) {
    const rows = await db.prepare(
      `SELECT member_no, tier, status, name_zh, name_en, phone, gender, birth_year,
              district, role, kyc_status, source, referrer_no, roadshow, roadshow_location,
              expires_at, created_at, notes, admin_notes
       FROM members m ${where} ORDER BY created_at DESC`
    ).bind(...params).all()
    const header = 'member_no,tier,status,name_zh,name_en,phone,gender,birth_year,district,role,kyc_status,source,referrer_no,roadshow,roadshow_location,expires_at,created_at'
    const BOM = '\uFEFF'
    const csv = BOM + header + '\n' + rows.results.map((m: any) =>
      [m.member_no,m.tier,m.status,m.name_zh,m.name_en,m.phone,m.gender,m.birth_year,
       m.district,m.role,m.kyc_status,m.source,m.referrer_no,m.roadshow,m.roadshow_location,
       m.expires_at,m.created_at].map((v: any) => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')
    ).join('\n')
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8-sig',
      'Content-Disposition': `attachment; filename="members_${new Date().toISOString().slice(0,10)}.csv"`
    }})
  }

  const rows = await db.prepare(
    `SELECT m.member_no, m.tier, m.status, m.name_zh, m.name_en, m.phone, m.gender, m.birth_year,
            m.district, m.id_prefix, m.role, m.kyc_status, m.source, m.referrer_no, m.roadshow,
            m.roadshow_location, m.parent_no, m.parent_name, m.relation,
            m.expires_at, m.created_at, m.notes, m.admin_notes, m.verified_at, m.wa_clicked_at,
            m.wa_channel, m.re_verify,
            m.group_id, g.name as group_name, g.color as group_color
     FROM members m
     LEFT JOIN member_groups g ON g.id = m.group_id
     ${where}
     ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all()

  return c.json({
    ok: true,
    total: countRow?.total ?? 0,
    page, limit,
    members: rows.results
  })
})

// ─── API: Admin stats ─────────────────────────────────────────────────────────
app.get('/api/admin/stats', async (c) => {
  const db = c.env.DB
  const [total, primary, family, pending, active, inactive, todayNew, monthNew] = await Promise.all([
    db.prepare("SELECT COUNT(*) as n FROM members").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE tier='PRIMARY'").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE tier='FAMILY'").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE kyc_status='PENDING' AND status='ACTIVE'").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE status='ACTIVE'").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE status='INACTIVE'").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE date(created_at)=date('now')").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')").first<{ n: number }>(),
  ])
  const [bySource, byDistrict, byMonth, byGender, medStats, byRoadshow, byReferrer] = await Promise.all([
    db.prepare("SELECT source, COUNT(*) as cnt FROM members GROUP BY source ORDER BY cnt DESC").all(),
    db.prepare("SELECT district, COUNT(*) as cnt FROM members WHERE district!='' GROUP BY district ORDER BY cnt DESC LIMIT 10").all(),
    db.prepare("SELECT strftime('%Y-%m',created_at) as month, COUNT(*) as cnt FROM members GROUP BY month ORDER BY month DESC LIMIT 12").all(),
    db.prepare("SELECT gender, COUNT(*) as cnt FROM members GROUP BY gender ORDER BY cnt DESC").all(),
    db.prepare("SELECT status, COUNT(*) as cnt FROM medical_card_applications GROUP BY status").all(),
    // Roadshow/institution breakdown: group by roadshow code + location, show count + latest join date
    db.prepare(`
      SELECT roadshow,
             roadshow_location,
             source,
             COUNT(*) as cnt,
             MAX(created_at) as latest,
             SUM(CASE WHEN date(created_at)=date('now') THEN 1 ELSE 0 END) as today_cnt
      FROM members
      WHERE roadshow != 'walk-in' AND roadshow != ''
      GROUP BY roadshow
      ORDER BY latest DESC
      LIMIT 30
    `).all(),
    // Top referrers: members who referred the most others
    db.prepare(`
      SELECT r.referrer_no,
             m.name_zh,
             COUNT(*) as cnt,
             MAX(r.created_at) as latest
      FROM members r
      LEFT JOIN members m ON m.member_no = r.referrer_no
      WHERE r.referrer_no != '' AND r.referrer_no IS NOT NULL
      GROUP BY r.referrer_no
      ORDER BY cnt DESC
      LIMIT 15
    `).all(),
  ])
  return c.json({
    ok: true,
    stats: {
      total: total?.n ?? 0,
      primary: primary?.n ?? 0,
      family: family?.n ?? 0,
      pending: pending?.n ?? 0,
      active: active?.n ?? 0,
      inactive: inactive?.n ?? 0,
      todayNew: todayNew?.n ?? 0,
      monthNew: monthNew?.n ?? 0,
      bySource: bySource.results,
      byDistrict: byDistrict.results,
      byMonth: byMonth.results,
      byGender: byGender.results,
      medStats: medStats.results,
      byRoadshow: byRoadshow.results,
      byReferrer: byReferrer.results,
    }
  })
})

// ─── API: Settings (admin) ────────────────────────────────────────────────────
app.get('/api/admin/settings', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
    const settings: Record<string, string> = {}
    for (const r of rows.results) settings[r.key] = r.value
    return c.json({ ok: true, settings })
  } catch {
    return c.json({ ok: false, error: 'Failed to load settings' }, 500)
  }
})

app.put('/api/admin/settings/:key', async (c) => {
  const key = c.req.param('key')
  const db = c.env.DB
  const { value } = await c.req.json<{ value: string }>()
  if (value === undefined || value === null) return c.json({ ok: false, error: 'Missing value' }, 400)
  await db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
  ).bind(key, value).run()
  return c.json({ ok: true })
})

// ─── API: Update member (admin) ───────────────────────────────────────────────
app.patch('/api/admin/members/:no', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const body = await c.req.json<{
    kyc_status?: string; role?: string; notes?: string; admin_notes?: string;
    status?: string; name_zh?: string; name_en?: string; phone?: string;
    gender?: string; birth_year?: number | null; district?: string;
    id_prefix?: string; source?: string; referrer_no?: string;
    roadshow_location?: string; expires_at?: string;
  }>()
  const allowed = ['kyc_status','role','notes','admin_notes','status',
    'name_zh','name_en','phone','gender','birth_year','id_prefix','district',
    'source','referrer_no','roadshow_location','expires_at']
  const fields: string[] = []
  const vals: any[] = []
  for (const key of allowed) {
    if (body[key as keyof typeof body] !== undefined) {
      fields.push(`${key} = ?`)
      vals.push(body[key as keyof typeof body])
    }
  }
  if (!fields.length) return c.json({ ok: false, error: 'Nothing to update' }, 400)
  await db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE member_no = ?`)
    .bind(...vals, no).run()
  return c.json({ ok: true })
})

// ─── Admin manual unverify — MUST be before the generic :no DELETE route ────
app.delete('/api/admin/members/:no/verify', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  await db.prepare(`UPDATE members SET verified_at = NULL WHERE member_no = ?`).bind(no).run()
  return c.json({ ok: true })
})

// ─── Admin: mark member as needing re-verification (watermark returns) ────────
app.post('/api/admin/members/:no/re-verify', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const existing = await db.prepare('SELECT member_no FROM members WHERE member_no = ?').bind(no).first()
  if (!existing) return c.json({ ok: false, error: '查無此會員' }, 404)
  // Clear verified_at + wa_clicked_at + wa_channel, set re_verify=1 so watermark reappears
  await db.prepare(`UPDATE members SET verified_at = NULL, wa_clicked_at = NULL, wa_channel = NULL, re_verify = 1 WHERE member_no = ?`).bind(no).run()
  return c.json({ ok: true })
})

// ─── API: Delete member — DISABLED (no data deletion policy) ────────────────
app.delete('/api/admin/members/:no', (c) => {
  return c.json({ ok: false, error: '系統政策：不允許刪除會員資料。如需停用請使用 PATCH status=INACTIVE。' }, 403)
})

// ─── API: Get family cards of a member ───────────────────────────────────────
app.get('/api/members/:no/family', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const rows = await db.prepare(
    'SELECT member_no, name_zh, name_en, phone, role, kyc_status, expires_at, created_at FROM members WHERE parent_no = ? ORDER BY created_at'
  ).bind(no).all()
  return c.json({ ok: true, family: rows.results })
})

// ─── API: Admin — List medical card applications ──────────────────────────────
app.get('/api/admin/medical', async (c) => {
  const db = c.env.DB
  const status = c.req.query('status') || ''
  const exportCsv = c.req.query('export') === 'csv'
  let where = 'WHERE 1=1'
  const params: string[] = []
  if (status) { where += ' AND m.status = ?'; params.push(status) }

  // Try with card_no column; fall back to without if column not yet migrated
  let rows: any
  try {
    rows = await db.prepare(`
      SELECT m.id, m.member_no, m.name_zh_full, m.name_en_full, m.hkid_prefix,
             m.phone, m.status, m.applied_at, m.sent_at, m.notes, m.card_no,
             mb.name_zh as member_name_zh, mb.district
      FROM medical_card_applications m
      LEFT JOIN members mb ON mb.member_no = m.member_no
      ${where}
      ORDER BY m.applied_at DESC
    `).bind(...params).all()
  } catch (_) {
    rows = await db.prepare(`
      SELECT m.id, m.member_no, m.name_zh_full, m.name_en_full, m.hkid_prefix,
             m.phone, m.status, m.applied_at, m.sent_at, m.notes, NULL AS card_no,
             mb.name_zh as member_name_zh, mb.district
      FROM medical_card_applications m
      LEFT JOIN members mb ON mb.member_no = m.member_no
      ${where}
      ORDER BY m.applied_at DESC
    `).bind(...params).all()
  }

  if (exportCsv) {
    const BOM = '\uFEFF'
    const header = 'ID,會員編號,中文全名,英文全名,HKID頭4位,電話,狀態,申請日期,傳送日期,備註'
    const lines = (rows.results as any[]).map(r =>
      [r.id, r.member_no, r.name_zh_full, r.name_en_full, r.hkid_prefix,
       r.phone, r.status, r.applied_at, r.sent_at||'', r.notes||'']
      .map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')
    )
    return new Response(BOM + [header, ...lines].join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8-sig',
        'Content-Disposition': `attachment; filename="medical_applications_${new Date().toISOString().slice(0,10)}.csv"`
      }
    })
  }
  return c.json({ ok: true, total: rows.results.length, applications: rows.results })
})

// ─── API: Admin — Update medical application status ───────────────────────────
app.patch('/api/admin/medical/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json<{ status?: string; sent_at?: string; notes?: string }>()
  const allowed = ['status', 'sent_at', 'notes']
  const fields: string[] = []
  const vals: any[] = []
  for (const key of allowed) {
    if (body[key as keyof typeof body] !== undefined) {
      fields.push(`${key} = ?`)
      vals.push(body[key as keyof typeof body])
    }
  }
  if (!fields.length) return c.json({ ok: false, error: 'No fields to update' }, 400)
  vals.push(id)
  await db.prepare(`UPDATE medical_card_applications SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...vals).run()
  return c.json({ ok: true })
})

// ─── API: Admin — Save card_no for medical application ───────────────────────
app.post('/api/admin/medical/:id/card-no', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json<{ card_no: string }>()
  const cardNo = (body.card_no || '').trim()
  if (!cardNo) return c.json({ ok: false, error: 'card_no 不能為空' }, 400)
  // Auto-run migration if column not yet added
  try {
    await db.prepare(
      'UPDATE medical_card_applications SET card_no = ?, status = ? WHERE id = ?'
    ).bind(cardNo, 'ISSUED', id).run()
  } catch (_) {
    // Column missing — add it first, then update
    await db.prepare('ALTER TABLE medical_card_applications ADD COLUMN card_no TEXT').run()
    await db.prepare(
      'UPDATE medical_card_applications SET card_no = ?, status = ? WHERE id = ?'
    ).bind(cardNo, 'ISSUED', id).run()
  }
  return c.json({ ok: true })
})

// ─── API: Medical card application (re-apply from card page) ─────────────────
app.post('/api/members/:no/medical', async (c) => {
  const db = c.env.DB
  const memberNo = c.req.param('no')
  try {
    const body = await c.req.json<{
      nameZh: string; nameEn: string; hkid: string
    }>()

    // Verify member exists
    const member = await db.prepare(
      'SELECT member_no, phone FROM members WHERE member_no = ?'
    ).bind(memberNo).first<{ member_no: string; phone: string }>()
    if (!member) return c.json({ ok: false, error: '會員不存在' }, 404)

    // Validate required fields
    if (!body.nameZh?.trim() || !body.nameEn?.trim() || !body.hkid?.trim()) {
      return c.json({ ok: false, error: '請填寫中文全名、英文全名及身份證頭 4 位' }, 400)
    }

    // Prevent duplicate: already applied
    const existing = await db.prepare(
      'SELECT id, status FROM medical_card_applications WHERE member_no = ?'
    ).bind(memberNo).first<{ id: number; status: string }>()
    if (existing) {
      return c.json({ ok: false, error: '你已申請醫健卡', status: existing.status, alreadyApplied: true }, 409)
    }

    // Insert application
    await db.prepare(`
      INSERT INTO medical_card_applications
        (member_no, name_zh_full, name_en_full, hkid_prefix, phone)
      VALUES (?,?,?,?,?)
    `).bind(
      memberNo,
      body.nameZh.trim(),
      body.nameEn.trim().toUpperCase(),
      body.hkid.trim().toUpperCase(),
      member.phone
    ).run()

    // Sync real name back to members (Part A)
    await db.prepare(`
      UPDATE members SET name_zh = ?, name_en = ?, id_prefix = ? WHERE member_no = ?
    `).bind(
      body.nameZh.trim(),
      body.nameEn.trim().toUpperCase(),
      body.hkid.trim().toUpperCase(),
      memberNo
    ).run()

    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: '提交失敗，請重試' }, 500)
  }
})

// ─── API: Add family card under a primary card ───────────────────────────────
app.post('/api/members/:no/add-family', async (c) => {
  const db = c.env.DB
  const parentNo = c.req.param('no')
  try {
    const body = await c.req.json<{
      nameZh: string; phone: string; gender?: string;
      birthYear?: string; district?: string; relation?: string;
    }>()

    // Confirm parent exists and is PRIMARY
    const parent = await db.prepare(
      "SELECT member_no, name_zh FROM members WHERE member_no = ? AND tier = 'PRIMARY'"
    ).bind(parentNo).first<{ member_no: string; name_zh: string }>()
    if (!parent) return c.json({ ok: false, error: '主卡不存在' }, 404)

    if (!body.nameZh?.trim()) return c.json({ ok: false, error: '請填寫姓名／稱呼' }, 400)
    if (!body.phone?.trim()) return c.json({ ok: false, error: '請填寫電話' }, 400)
    const phoneClean = body.phone.replace(/\D/g, '')
    const phoneCheck = validateHKPhone(phoneClean)
    if (!phoneCheck.ok) return c.json({ ok: false, error: phoneCheck.error }, 400)

    // Auto-assign tier by age (same rule as main join: born ≤ 1971 → PRIMARY, else FAMILY)
    const currentYear = new Date().getFullYear()
    const birthYearNum = body.birthYear ? parseInt(body.birthYear) : null
    const age = birthYearNum ? currentYear - birthYearNum : 0
    const tier = age >= 55 ? 'PRIMARY' : 'FAMILY'

    // Duplicate phone check for computed tier
    const dup = await db.prepare(
      'SELECT member_no FROM members WHERE phone = ? AND tier = ?'
    ).bind(phoneClean, tier).first()
    if (dup) return c.json({ ok: false, error: `此電話已登記${tier === 'PRIMARY' ? '主卡' : '家庭卡'}` }, 409)

    const memberNo = await nextMemberNo(db)
    const expires = expiryDate(1)
    const now = new Date().toISOString()

    await db.prepare(`
      INSERT INTO members
        (member_no, tier, name_zh, name_en, phone, gender, birth_year, district,
         parent_no, parent_name, relation, kyc_status, role, expires_at, created_at,
         source, status)
      VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'CoExplorery', ?, ?, 'referral', 'ACTIVE')
    `).bind(
      memberNo, tier, body.nameZh.trim(), phoneClean,
      body.gender || '', birthYearNum,
      body.district || '', parent.member_no, parent.name_zh,
      body.relation || '', expires, now
    ).run()

    return c.json({ ok: true, member_no: memberNo, tier })
  } catch (e) {
    return c.json({ ok: false, error: '新增失敗，請重試' }, 500)
  }
})

// ─── API: Link family card to existing primary card ──────────────────────────
app.post('/api/members/:no/link-parent', async (c) => {
  const db = c.env.DB
  const familyNo = c.req.param('no')
  try {
    const body = await c.req.json<{ parentPhone: string }>()

    const family = await db.prepare(
      "SELECT member_no FROM members WHERE member_no = ? AND tier = 'FAMILY'"
    ).bind(familyNo).first<{ member_no: string }>()
    if (!family) return c.json({ ok: false, error: '家庭卡不存在' }, 404)

    if (!body.parentPhone?.trim()) return c.json({ ok: false, error: '請輸入主卡電話' }, 400)
    const phoneClean = body.parentPhone.replace(/\D/g, '')

    const parent = await db.prepare(
      "SELECT member_no, name_zh FROM members WHERE phone = ? AND tier = 'PRIMARY'"
    ).bind(phoneClean).first<{ member_no: string; name_zh: string }>()
    if (!parent) return c.json({ ok: false, error: '找不到對應主卡，請確認電話' }, 404)

    await db.prepare(
      'UPDATE members SET parent_no = ?, parent_name = ? WHERE member_no = ?'
    ).bind(parent.member_no, parent.name_zh, familyNo).run()

    return c.json({ ok: true, parent_no: parent.member_no, parent_name: parent.name_zh })
  } catch (e) {
    return c.json({ ok: false, error: '綁定失敗，請重試' }, 500)
  }
})

// ─── API: Create new primary card for a family card member ───────────────────
app.post('/api/members/:no/add-parent', async (c) => {
  const db = c.env.DB
  const familyNo = c.req.param('no')
  try {
    const body = await c.req.json<{
      nameZh: string; phone: string; gender?: string;
      birthYear: string; district?: string
    }>()

    const family = await db.prepare(
      "SELECT member_no FROM members WHERE member_no = ? AND tier = 'FAMILY'"
    ).bind(familyNo).first<{ member_no: string }>()
    if (!family) return c.json({ ok: false, error: '家庭卡不存在' }, 404)

    if (!body.nameZh?.trim()) return c.json({ ok: false, error: '請填寫中文姓名' }, 400)
    if (!body.birthYear || isNaN(parseInt(body.birthYear)))
      return c.json({ ok: false, error: '請填寫出生年份' }, 400)

    // Primary card must be 55+
    const age = new Date().getFullYear() - parseInt(body.birthYear)
    if (age < 55) return c.json({ ok: false, error: '主卡需年滿 55 歲' }, 400)

    if (!body.phone?.trim()) return c.json({ ok: false, error: '請填寫電話' }, 400)
    const phoneClean = body.phone.replace(/\D/g, '')
    const phoneCheck = validateHKPhone(phoneClean)
    if (!phoneCheck.ok) return c.json({ ok: false, error: phoneCheck.error }, 400)

    const dup = await db.prepare(
      "SELECT member_no FROM members WHERE phone = ? AND tier = 'PRIMARY'"
    ).bind(phoneClean).first()
    if (dup) return c.json({ ok: false, error: '此電話已登記主卡' }, 409)

    const parentNo = await nextMemberNo(db)
    const expires = expiryDate(1)
    const now = new Date().toISOString()

    // Create new primary card
    await db.prepare(`
      INSERT INTO members
        (member_no, tier, name_zh, phone, gender, birth_year, district,
         kyc_status, role, expires_at, created_at, source, status)
      VALUES (?, 'PRIMARY', ?, ?, ?, ?, ?, 'PENDING', 'CoExplorery', ?, ?, 'referral', 'ACTIVE')
    `).bind(
      parentNo, body.nameZh.trim(), phoneClean,
      body.gender || '', parseInt(body.birthYear), body.district || '',
      expires, now
    ).run()

    // Link family card to new primary card
    await db.prepare(
      'UPDATE members SET parent_no = ?, parent_name = ? WHERE member_no = ?'
    ).bind(parentNo, body.nameZh.trim(), familyNo).run()

    return c.json({ ok: true, parent_no: parentNo })
  } catch (e) {
    return c.json({ ok: false, error: '新增失敗，請重試' }, 500)
  }
})

// ─── API: Member self-update profile ─────────────────────────────────────────
app.patch('/api/members/:no/profile', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const body = await c.req.json<{
    phone?: string; nameEn?: string; gender?: string;
    birthYear?: string; district?: string; idPrefix?: string;
  }>()
  // Verify member exists first
  const existing = await db.prepare('SELECT member_no FROM members WHERE member_no = ?').bind(no).first()
  if (!existing) return c.json({ ok: false, error: '查無此會員' }, 404)

  const fields: string[] = []
  const vals: (string | number | null)[] = []
  if (body.nameEn !== undefined)  { fields.push('name_en = ?');   vals.push(body.nameEn?.trim().toUpperCase() || '') }
  if (body.gender !== undefined)  { fields.push('gender = ?');    vals.push(body.gender) }
  if (body.birthYear !== undefined){ fields.push('birth_year = ?'); vals.push(body.birthYear ? parseInt(body.birthYear) : null) }
  if (body.district !== undefined){ fields.push('district = ?');  vals.push(body.district) }
  if (body.idPrefix !== undefined){ fields.push('id_prefix = ?'); vals.push(body.idPrefix?.toUpperCase() || '') }

  if (!fields.length) return c.json({ ok: false, error: '沒有資料需要更新' }, 400)
  await db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE member_no = ?`)
    .bind(...vals, no).run()
  return c.json({ ok: true })
})

// ─── User WA button click — records wa_clicked_at + wa_channel, does NOT set verified_at
app.post('/api/members/:no/wa-click', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const existing = await db.prepare('SELECT member_no, re_verify FROM members WHERE member_no = ?').bind(no).first<{ member_no: string; re_verify: number }>()
  if (!existing) return c.json({ ok: false, error: '查無此會員' }, 404)
  // Accept optional channel from request body (default to 'BIZ' for backward compat)
  let channel = 'BIZ'
  try {
    const body = await c.req.json<{ channel?: string }>()
    if (body.channel === 'ICON' || body.channel === 'BIZ') channel = body.channel
  } catch (_) { /* body may be empty */ }
  // Always update wa_clicked_at + wa_channel (allow re-click after re_verify flag)
  await db.prepare(`UPDATE members SET wa_clicked_at = datetime('now'), wa_channel = ?, re_verify = 0 WHERE member_no = ?`)
    .bind(channel, no).run()
  return c.json({ ok: true })
})

app.post('/api/members/:no/verify', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const existing = await db.prepare('SELECT member_no, verified_at FROM members WHERE member_no = ?').bind(no).first<{ member_no: string; verified_at: string | null }>()
  if (!existing) return c.json({ ok: false, error: '查無此會員' }, 404)
  if (existing.verified_at) return c.json({ ok: true, alreadyVerified: true, verified_at: existing.verified_at })
  // Set verified_at + ensure wa_clicked_at + wa_channel=ICON (normal WA flow) + clear re_verify
  await db.prepare(`UPDATE members SET verified_at = datetime('now'), wa_clicked_at = COALESCE(wa_clicked_at, datetime('now')), wa_channel = COALESCE(wa_channel, 'ICON'), re_verify = 0 WHERE member_no = ?`).bind(no).run()
  return c.json({ ok: true, alreadyVerified: false })
})

// ─── Admin manual verify ──────────────────────────────────────────────────────
app.post('/api/admin/members/:no/verify', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const existing = await db.prepare('SELECT member_no FROM members WHERE member_no = ?').bind(no).first()
  if (!existing) return c.json({ ok: false, error: '查無此會員' }, 404)
  await db.prepare(`UPDATE members SET verified_at = datetime('now') WHERE member_no = ?`).bind(no).run()
  return c.json({ ok: true })
})

// ─── Groups API ──────────────────────────────────────────────────────────────
app.get('/api/admin/groups', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    `SELECT g.id, g.name, g.description, g.color, g.created_at,
            COUNT(m.id) as member_count
     FROM member_groups g
     LEFT JOIN members m ON m.group_id = g.id
     GROUP BY g.id ORDER BY g.name ASC`
  ).all()
  return c.json({ ok: true, groups: rows.results })
})

app.post('/api/admin/groups', async (c) => {
  const db = c.env.DB
  const { name, description, color } = await c.req.json()
  if (!name || !name.trim()) return c.json({ ok: false, error: '群組名稱不能為空' }, 400)
  try {
    const result = await db.prepare(
      `INSERT INTO member_groups (name, description, color) VALUES (?, ?, ?)`
    ).bind(name.trim(), description || '', color || '#4caf50').run()
    return c.json({ ok: true, id: result.meta.last_row_id })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ ok: false, error: '此群組名稱已存在' }, 409)
    return c.json({ ok: false, error: '建立失敗' }, 500)
  }
})

app.put('/api/admin/groups/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const { name, description, color } = await c.req.json()
  if (!name || !name.trim()) return c.json({ ok: false, error: '群組名稱不能為空' }, 400)
  try {
    await db.prepare(
      `UPDATE member_groups SET name=?, description=?, color=? WHERE id=?`
    ).bind(name.trim(), description || '', color || '#4caf50', id).run()
    return c.json({ ok: true })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ ok: false, error: '此群組名稱已存在' }, 409)
    return c.json({ ok: false, error: '更新失敗' }, 500)
  }
})

app.delete('/api/admin/groups/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  // Unassign members first
  await db.prepare(`UPDATE members SET group_id = NULL WHERE group_id = ?`).bind(id).run()
  await db.prepare(`DELETE FROM member_groups WHERE id = ?`).bind(id).run()
  return c.json({ ok: true })
})

app.patch('/api/admin/members/:no/group', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const { group_id } = await c.req.json()
  await db.prepare(`UPDATE members SET group_id = ? WHERE member_no = ?`)
    .bind(group_id || null, no).run()
  return c.json({ ok: true })
})

// ─── Roadshow APIs ───────────────────────────────────────────────────────────

// List all JHC stores (for dropdown)
app.get('/api/admin/roadshow/stores', async (c) => {
  const db = c.env.DB
  const district = c.req.query('district')
  const search = c.req.query('search')
  let where = 'WHERE active=1'
  const params: string[] = []
  if (district) { where += ' AND district=?'; params.push(district) }
  if (search) { where += ' AND (name_zh LIKE ? OR store_code LIKE ? OR district LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  const rows = await db.prepare(
    `SELECT id, store_code, name_zh, name_en, district, address FROM jhc_stores ${where} ORDER BY district, name_zh`
  ).bind(...params).all()
  return c.json({ ok: true, stores: rows.results })
})

// List distinct districts
app.get('/api/admin/roadshow/districts', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    `SELECT DISTINCT district FROM jhc_stores WHERE active=1 AND district!='' ORDER BY district`
  ).all()
  return c.json({ ok: true, districts: rows.results.map((r: any) => r.district) })
})

// List roadshows
app.get('/api/admin/roadshows', async (c) => {
  const db = c.env.DB
  const status = c.req.query('status')
  let where = 'WHERE 1=1'
  const params: string[] = []
  if (status) { where += ' AND r.status=?'; params.push(status) }
  const rows = await db.prepare(
    `SELECT r.id, r.code, r.name, r.store_code, r.start_date, r.end_date, r.status, r.notes,
            s.name_zh as store_name, s.district,
            COUNT(m.id) as member_count
     FROM roadshows r
     LEFT JOIN jhc_stores s ON s.store_code = r.store_code
     LEFT JOIN members m ON m.roadshow = r.code
     ${where}
     GROUP BY r.id
     ORDER BY r.created_at DESC`
  ).bind(...params).all()
  return c.json({ ok: true, roadshows: rows.results })
})

// Create roadshow
app.post('/api/admin/roadshows', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{
    code: string; name: string; store_code?: string;
    start_date?: string; end_date?: string; notes?: string
  }>()
  if (!body.code?.trim()) return c.json({ ok: false, error: 'Roadshow code 不能為空' }, 400)
  if (!body.name?.trim()) return c.json({ ok: false, error: 'Roadshow 名稱不能為空' }, 400)

  // Get store_id if store_code provided
  let storeId: number | null = null
  if (body.store_code) {
    const store = await db.prepare('SELECT id FROM jhc_stores WHERE store_code=?').bind(body.store_code).first<{ id: number }>()
    storeId = store?.id ?? null
  }

  try {
    const result = await db.prepare(
      `INSERT INTO roadshows (code, name, store_id, store_code, start_date, end_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
    ).bind(
      body.code.trim(), body.name.trim(), storeId, body.store_code || '',
      body.start_date || '', body.end_date || '', body.notes || ''
    ).run()
    return c.json({ ok: true, id: result.meta.last_row_id })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ ok: false, error: '此 Roadshow Code 已存在' }, 409)
    return c.json({ ok: false, error: '建立失敗' }, 500)
  }
})

// Update roadshow
app.patch('/api/admin/roadshows/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json<{
    name?: string; store_code?: string; start_date?: string;
    end_date?: string; status?: string; notes?: string
  }>()
  const allowed = ['name', 'store_code', 'start_date', 'end_date', 'status', 'notes']
  const fields: string[] = []
  const vals: any[] = []
  for (const key of allowed) {
    if (body[key as keyof typeof body] !== undefined) {
      fields.push(`${key} = ?`)
      vals.push(body[key as keyof typeof body])
    }
  }
  if (!fields.length) return c.json({ ok: false, error: 'Nothing to update' }, 400)
  vals.push(id)
  await db.prepare(`UPDATE roadshows SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run()
  return c.json({ ok: true })
})

// Delete roadshow
app.delete('/api/admin/roadshows/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('DELETE FROM roadshows WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// ─── Products API (Batch 3) ──────────────────────────────────────────────────

// 列出產品（可搜尋 / 篩分類 / 篩狀態）
app.get('/api/admin/products', async (c) => {
  try {
    const search = (c.req.query('search') || '').trim()
    const category = (c.req.query('category') || '').trim()
    const status = (c.req.query('status') || '').trim() // active / inactive / ''
    let sql = 'SELECT * FROM products WHERE 1=1'
    const binds: any[] = []
    if (search) {
      sql += ' AND (name_zh LIKE ? OR name_en LIKE ? OR brand LIKE ? OR sku LIKE ?)'
      const kw = `%${search}%`; binds.push(kw, kw, kw, kw)
    }
    if (category) { sql += ' AND category = ?'; binds.push(category) }
    if (status === 'active') sql += ' AND active = 1'
    if (status === 'inactive') sql += ' AND active = 0'
    sql += ' ORDER BY active DESC, id DESC'
    const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
    return c.json({ ok: true, products: results || [] })
  } catch (err) { console.error(err); return c.json({ ok: false, error: '讀取產品失敗' }, 500) }
})

// 取分類清單（給下拉選單用）
app.get('/api/admin/products/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category"
    ).all()
    return c.json({ ok: true, categories: (results || []).map((r: any) => r.category) })
  } catch (err) { console.error(err); return c.json({ ok: false, error: '讀取分類失敗' }, 500) }
})

// 取單一產品
app.get('/api/admin/products/:id', async (c) => {
  try {
    const p = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(c.req.param('id')).first()
    if (!p) return c.json({ ok: false, error: '找不到產品' }, 404)
    return c.json({ ok: true, product: p })
  } catch (err) { console.error(err); return c.json({ ok: false, error: '讀取失敗' }, 500) }
})

// 新增產品
app.post('/api/admin/products', async (c) => {
  try {
    const b = await c.req.json()
    if (!b.name_zh || !b.name_en) return c.json({ ok: false, error: '中英文名稱必填' }, 400)
    const r = await c.env.DB.prepare(
      `INSERT INTO products (name_zh, name_en, brand, sku, category, unit, cost, price, description, photo_url, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(
      b.name_zh, b.name_en, b.brand || '', b.sku || '', b.category || '', b.unit || '',
      Number(b.cost) || 0, Number(b.price) || 0, b.description || '', b.photo_url || ''
    ).run()
    return c.json({ ok: true, id: r.meta.last_row_id })
  } catch (err) { console.error(err); return c.json({ ok: false, error: '新增產品失敗' }, 500) }
})

// 更新產品
app.patch('/api/admin/products/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const b = await c.req.json()
    const fields: string[] = []; const binds: any[] = []
    const allow = ['name_zh','name_en','brand','sku','category','unit','cost','price','description','photo_url','active']
    for (const k of allow) {
      if (k in b) {
        fields.push(`${k} = ?`)
        binds.push((k === 'cost' || k === 'price') ? (Number(b[k]) || 0) : (k === 'active' ? (b[k] ? 1 : 0) : b[k]))
      }
    }
    if (!fields.length) return c.json({ ok: false, error: '沒有可更新欄位' }, 400)
    binds.push(id)
    await c.env.DB.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).bind(...binds).run()
    return c.json({ ok: true })
  } catch (err) { console.error(err); return c.json({ ok: false, error: '更新產品失敗' }, 500) }
})

// Source statistics API
app.get('/api/admin/source-stats', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(`
    SELECT source, roadshow_location, roadshow,
           COUNT(*) as total,
           SUM(CASE WHEN tier='PRIMARY' THEN 1 ELSE 0 END) as primary_count,
           SUM(CASE WHEN tier='FAMILY' THEN 1 ELSE 0 END) as family_count,
           MIN(created_at) as first_at, MAX(created_at) as last_at
    FROM members
    GROUP BY source, roadshow_location, roadshow
    ORDER BY total DESC
  `).all()
  return c.json({ ok: true, stats: rows.results })
})

// ─── Useful Links: Public API ────────────────────────────────────────────────

// GET /api/useful-links — 公開，只回傳啟用項目，依 sort_order 排序
app.get('/api/useful-links', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    'SELECT id, title, link_type, content, sort_order FROM useful_links WHERE is_active=1 ORDER BY sort_order ASC, id ASC'
  ).all()
  return c.json({ ok: true, links: rows.results })
})

// ─── Useful Links: Admin APIs ─────────────────────────────────────────────────

// GET /api/admin/useful-links — 列出全部（包括隱藏）
app.get('/api/admin/useful-links', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    'SELECT * FROM useful_links ORDER BY sort_order ASC, id ASC'
  ).all()
  return c.json({ ok: true, links: rows.results })
})

// POST /api/admin/useful-links — 新增
app.post('/api/admin/useful-links', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{
    title?: string; link_type?: string; content?: string;
    sort_order?: number; is_active?: number
  }>()
  if (!body.title || !body.link_type || !body.content) {
    return c.json({ ok: false, error: 'title, link_type, content 必填' }, 400)
  }
  const valid = ['phone', 'whatsapp', 'url', 'text']
  if (!valid.includes(body.link_type)) {
    return c.json({ ok: false, error: 'link_type 必須為 phone/whatsapp/url/text' }, 400)
  }
  const sort = body.sort_order ?? 0
  const active = body.is_active ?? 1
  const result = await db.prepare(
    'INSERT INTO useful_links (title, link_type, content, sort_order, is_active) VALUES (?,?,?,?,?)'
  ).bind(body.title, body.link_type, body.content, sort, active).run()
  return c.json({ ok: true, id: result.meta.last_row_id })
})

// PUT /api/admin/useful-links/:id — 更新
app.put('/api/admin/useful-links/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json<{
    title?: string; link_type?: string; content?: string;
    sort_order?: number; is_active?: number
  }>()
  const allowed = ['title', 'link_type', 'content', 'sort_order', 'is_active']
  const fields: string[] = []
  const vals: any[] = []
  for (const key of allowed) {
    if (body[key as keyof typeof body] !== undefined) {
      fields.push(`${key} = ?`)
      vals.push(body[key as keyof typeof body])
    }
  }
  if (!fields.length) return c.json({ ok: false, error: 'Nothing to update' }, 400)
  if (body.link_type !== undefined) {
    const valid = ['phone', 'whatsapp', 'url', 'text']
    if (!valid.includes(body.link_type)) {
      return c.json({ ok: false, error: 'link_type 必須為 phone/whatsapp/url/text' }, 400)
    }
  }
  vals.push(id)
  await db.prepare(`UPDATE useful_links SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run()
  return c.json({ ok: true })
})

// DELETE /api/admin/useful-links/:id — 刪除
app.delete('/api/admin/useful-links/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('DELETE FROM useful_links WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// ─── Jobs: Public APIs ───────────────────────────────────────────────────────

// GET /api/jobs — 公開，只回 open，依 sort_order
app.get('/api/jobs', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    'SELECT id, image_url, title, location, job_type, company, salary, sort_order FROM jobs WHERE status=? ORDER BY sort_order ASC, id ASC'
  ).bind('open').all()
  return c.json({ ok: true, jobs: rows.results })
})

// GET /api/jobs/:id — 單一工作詳情（公開）
app.get('/api/jobs/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const job = await db.prepare('SELECT * FROM jobs WHERE id=?').bind(id).first<any>()
  if (!job) return c.json({ ok: false, error: '工作不存在' }, 404)
  return c.json({ ok: true, job })
})

// POST /api/jobs/:id/apply — 申請工作（公開，需帶 member_no）
app.post('/api/jobs/:id/apply', async (c) => {
  const jobId = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json<{ member_no?: string }>()
  const memberNo = (body.member_no || '').trim()
  if (!memberNo) return c.json({ ok: false, error: '請先喺「我的卡」登記會員' }, 400)
  // 確認工作存在且 open
  const job = await db.prepare('SELECT id, status FROM jobs WHERE id=?').bind(jobId).first<any>()
  if (!job) return c.json({ ok: false, error: '工作不存在' }, 404)
  if (job.status !== 'open') return c.json({ ok: false, error: '此職位已截止申請' }, 400)
  try {
    await db.prepare(
      'INSERT INTO job_applications (job_id, member_no) VALUES (?,?)'
    ).bind(jobId, memberNo).run()
    return c.json({ ok: true, message: '已收到你嘅申請，我哋會跟進' })
  } catch (e: any) {
    // UNIQUE constraint → 已申請過
    if (e && (String(e.message || e).includes('UNIQUE') || String(e.message || e).includes('unique'))) {
      return c.json({ ok: false, already: true, error: '你已經申請咗呢份工' }, 409)
    }
    return c.json({ ok: false, error: '申請失敗，請稍後再試' }, 500)
  }
})

// ─── Jobs: Admin APIs ────────────────────────────────────────────────────────

// GET /api/admin/jobs — 列出全部工作
app.get('/api/admin/jobs', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    'SELECT * FROM jobs ORDER BY sort_order ASC, id ASC'
  ).all()
  return c.json({ ok: true, jobs: rows.results })
})

// POST /api/admin/jobs — 新增工作
app.post('/api/admin/jobs', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{
    image_url?: string; title?: string; location?: string; job_type?: string;
    company?: string; description?: string; requirement?: string;
    salary?: string; status?: string; sort_order?: number
  }>()
  if (!body.title) return c.json({ ok: false, error: '職位名稱必填' }, 400)
  const result = await db.prepare(
    `INSERT INTO jobs (image_url, title, location, job_type, company, description, requirement, salary, status, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    body.image_url || null, body.title, body.location || null, body.job_type || null,
    body.company || null, body.description || null, body.requirement || null,
    body.salary || null, body.status || 'open', body.sort_order ?? 0
  ).run()
  return c.json({ ok: true, id: result.meta.last_row_id })
})

// PUT /api/admin/jobs/:id — 更新工作
app.put('/api/admin/jobs/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json<{
    image_url?: string; title?: string; location?: string; job_type?: string;
    company?: string; description?: string; requirement?: string;
    salary?: string; status?: string; sort_order?: number
  }>()
  const allowed = ['image_url', 'title', 'location', 'job_type', 'company', 'description', 'requirement', 'salary', 'status', 'sort_order']
  const fields: string[] = []
  const vals: any[] = []
  for (const key of allowed) {
    if (body[key as keyof typeof body] !== undefined) {
      fields.push(`${key} = ?`)
      vals.push(body[key as keyof typeof body])
    }
  }
  if (!fields.length) return c.json({ ok: false, error: 'Nothing to update' }, 400)
  vals.push(id)
  await db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run()
  return c.json({ ok: true })
})

// DELETE /api/admin/jobs/:id — 刪除工作（同時刪相關申請）
app.delete('/api/admin/jobs/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('DELETE FROM job_applications WHERE job_id=?').bind(id).run()
  await db.prepare('DELETE FROM jobs WHERE id=?').bind(id).run()
  return c.json({ ok: true })
})

// GET /api/admin/jobs/:id/applications — 列出某工作嘅申請（join members 取姓名）
app.get('/api/admin/jobs/:id/applications', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const rows = await db.prepare(
    `SELECT ja.id, ja.job_id, ja.member_no, ja.applied_at, ja.handle_status,
            m.name_zh, m.name_en
     FROM job_applications ja
     LEFT JOIN members m ON m.member_no = ja.member_no
     WHERE ja.job_id = ?
     ORDER BY ja.applied_at ASC`
  ).bind(id).all()
  return c.json({ ok: true, applications: rows.results })
})

// PUT /api/admin/applications/:id — 更新 handle_status
app.put('/api/admin/applications/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json<{ handle_status?: string }>()
  const hs = body.handle_status || ''
  if (!['new', 'handled'].includes(hs)) return c.json({ ok: false, error: 'handle_status 必須為 new 或 handled' }, 400)
  await db.prepare('UPDATE job_applications SET handle_status=? WHERE id=?').bind(hs, id).run()
  return c.json({ ok: true })
})

// ─── Root: 85 AI Technology Limited Dashboard ────────────────────────────────
app.get('/', (c) => c.html(dashboardHtml()))

// ─── Membership module: /membership/* ────────────────────────────────────────
app.get('/membership',          (c) => c.html(signupMainHtml()))
app.get('/membership/login',    (c) => c.html(signupMainHtml()))
app.get('/membership/join',     (c) => c.html(signupMainHtml()))
app.get('/membership/join-family', (c) => c.html(signupSubHtml()))
app.get('/membership/admin',    (c) => c.html(adminHtml()))
app.get('/membership/card/:no', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const row = await db.prepare('SELECT * FROM members WHERE member_no = ?').bind(no).first<any>()
  if (!row) return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>查無此會員</h2><p>${no}</p><a href="/membership/join">立即登記</a></body></html>`, 404)
  // Check medical card application status + card_no (defensive: card_no column may not exist yet)
  let medApp: { status: string; card_no: string | null } | null = null
  try {
    medApp = await db.prepare(
      'SELECT status, card_no FROM medical_card_applications WHERE member_no = ? LIMIT 1'
    ).bind(no).first<{ status: string; card_no: string | null }>()
  } catch (_) {
    medApp = await db.prepare(
      'SELECT status, NULL AS card_no FROM medical_card_applications WHERE member_no = ? LIMIT 1'
    ).bind(no).first<{ status: string; card_no: string | null }>()
  }
  return c.html(memberProfileHtml(row, medApp?.status ?? null, medApp?.card_no ?? null))
})

// ─── Future modules (placeholder) ────────────────────────────────────────────
app.get('/accounting',  (c) => c.html(comingSoonHtml('Accounting', '財務管理')))
app.get('/governance',  (c) => c.html(comingSoonHtml('Governance', '治理管理')))
app.get('/events',      (c) => c.html(comingSoonHtml('Events', '活動管理')))
app.get('/volunteers',  (c) => c.html(comingSoonHtml('Volunteers', '義工管理')))

// ─── /admin — New unified admin shell with login protection ─────────────────
app.get('/admin', (c) => c.html(newAdminShellHtml()))

// ─── Legacy redirects (old URLs → new URLs, keeps old links working) ──────────
app.get('/login',       (c) => c.redirect('/membership', 301))
app.get('/join',        (c) => c.redirect('/membership/join', 301))
app.get('/join-family', (c) => c.redirect('/membership/join-family', 301))
app.get('/member/:no',  (c) => c.redirect(`/membership/card/${c.req.param('no')}`, 301))
app.get('/poster',      (c) => c.redirect('/', 301))
app.get('/sop',         (c) => c.redirect('/', 301))

// ─── PWA entry: /app ─────────────────────────────────────────────────────────
app.get('/app', (c) => {
  return c.html(pwaAppHtml())
})

// ─── Survey module ────────────────────────────────────────────────────────────

// POST /api/survey/:id/submit — public, no auth required
app.post('/api/survey/:id/submit', async (c) => {
  const surveyId = parseInt(c.req.param('id'))
  if (isNaN(surveyId)) return c.json({ ok: false, error: '無效問卷 ID' }, 400)
  const db = c.env.DB

  // Validate survey exists and is OPEN
  const survey = await db.prepare(
    "SELECT id, status FROM surveys WHERE id = ?"
  ).bind(surveyId).first<{ id: number; status: string }>()
  if (!survey) return c.json({ ok: false, error: '問卷不存在' }, 404)
  if (survey.status !== 'OPEN') return c.json({ ok: false, error: '問卷已關閉' }, 400)

  // Parse body
  let body: { memberNo?: string; roadshowCode?: string; answers?: Record<string, any> }
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效請求格式' }, 400) }
  const { memberNo, roadshowCode, answers } = body
  if (!answers || typeof answers !== 'object') return c.json({ ok: false, error: '缺少 answers' }, 400)

  // Load required questions and validate completeness
  const qRows = await db.prepare(
    "SELECT id, required FROM survey_questions WHERE survey_id = ? AND required = 1"
  ).bind(surveyId).all<{ id: number; required: number }>()

  const missing: number[] = []
  for (const q of (qRows.results || [])) {
    const val = answers[String(q.id)]
    const isEmpty = val === undefined || val === null || val === '' ||
      (Array.isArray(val) && val.length === 0)
    if (isEmpty) missing.push(q.id)
  }
  if (missing.length > 0) {
    return c.json({ ok: false, error: '以下必答題未填寫', missing }, 400)
  }

  // Insert response
  await db.prepare(
    `INSERT INTO survey_responses (survey_id, member_no, roadshow_code, answers_json)
     VALUES (?, ?, ?, ?)`
  ).bind(
    surveyId,
    memberNo?.trim() || null,
    roadshowCode?.trim() || null,
    JSON.stringify(answers)
  ).run()

  return c.json({ ok: true })
})

// GET /survey/:id — public elderly-friendly fill page
app.get('/survey/:id', async (c) => {
  const surveyId = parseInt(c.req.param('id'))
  if (isNaN(surveyId)) return c.html('<h2>無效問卷連結</h2>', 400)
  const db = c.env.DB

  // Load survey
  const survey = await db.prepare(
    "SELECT id, title_zh, status FROM surveys WHERE id = ?"
  ).bind(surveyId).first<{ id: number; title_zh: string; status: string }>()
  if (!survey) return c.html('<h2>找不到問卷</h2>', 404)

  if (survey.status !== 'OPEN') {
    return c.html(`<!DOCTYPE html><html lang="zh-HK"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>問卷已關閉</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#fff;">
<div style="font-size:48px;margin-bottom:20px;">🔒</div>
<div style="font-size:24px;font-weight:700;color:#333;">問卷已關閉</div>
<div style="font-size:18px;color:#555;margin-top:12px;">感謝您的參與！</div>
</body></html>`)
  }

  // Load questions
  const qRows = await db.prepare(
    "SELECT id, seq, qtype, text_zh, options_json, required FROM survey_questions WHERE survey_id = ? ORDER BY seq ASC"
  ).bind(surveyId).all<{ id: number; seq: number; qtype: string; text_zh: string; options_json: string | null; required: number }>()
  const questions = qRows.results || []

  // Optional member greeting — ?m= value used as-is (CE85-000001 format), no reformatting
  const memberNo = c.req.query('m') || ''
  const roadshowCode = c.req.query('rs') || ''
  let greeting = '您好 👋'
  if (memberNo) {
    // memberNo passed directly to WHERE member_no = ? — matches CE85-000001 format in DB
    const mem = await db.prepare('SELECT name_zh FROM members WHERE member_no = ?').bind(memberNo).first<{ name_zh: string }>()
    if (mem?.name_zh) greeting = `${mem.name_zh} 您好 👋`
  }

  // Build question HTML
  const questionsJson = JSON.stringify(questions)

  return c.html(`<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${survey.title_zh}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#fff;color:#111;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-size:20px;min-height:100vh;}
.topbar{background:#1b5e20;color:#fff;padding:16px 20px 14px;}
.topbar .greeting{font-size:18px;opacity:0.9;margin-bottom:4px;}
.topbar .survey-title{font-size:24px;font-weight:900;line-height:1.3;}
.topbar .prog{font-size:16px;opacity:0.85;margin-top:6px;}
.wrap{max-width:600px;margin:0 auto;padding:20px 16px 80px;}
.q-block{background:#f8f8f8;border-radius:12px;padding:22px 18px;margin-bottom:24px;border:2px solid #e0e0e0;}
.q-block.error{border-color:#c62828;background:#fff8f8;}
.q-num{font-size:14px;color:#1b5e20;font-weight:700;letter-spacing:1px;margin-bottom:6px;}
.q-text{font-size:22px;font-weight:700;color:#111;line-height:1.4;margin-bottom:16px;}
.q-required{color:#c62828;font-size:14px;font-weight:700;margin-left:6px;}
.opt-btn{display:block;width:100%;min-height:60px;padding:14px 18px;margin-bottom:10px;
  background:#fff;border:2.5px solid #388e3c;border-radius:10px;
  font-size:20px;font-weight:600;color:#1b5e20;text-align:left;cursor:pointer;
  transition:background 0.15s,color 0.15s;line-height:1.3;}
.opt-btn:last-child{margin-bottom:0;}
.opt-btn.selected{background:#1b5e20;color:#fff;border-color:#1b5e20;}
.opt-btn:active{opacity:0.85;}
.rating-wrap{display:flex;gap:12px;justify-content:flex-start;flex-wrap:wrap;margin-top:4px;}
.star-btn{font-size:44px;background:none;border:none;cursor:pointer;padding:4px;opacity:0.35;transition:opacity 0.1s;line-height:1;}
.star-btn.lit{opacity:1;}
.rating-label{font-size:16px;color:#555;margin-top:8px;}
textarea.q-textarea{width:100%;min-height:120px;padding:14px;border:2.5px solid #388e3c;border-radius:10px;
  font-size:20px;font-family:inherit;color:#111;resize:vertical;background:#fff;}
textarea.q-textarea:focus{outline:none;border-color:#1b5e20;}
.err-msg{color:#c62828;font-size:17px;font-weight:700;margin-top:8px;display:none;}
.err-msg.show{display:block;}
.submit-wrap{position:sticky;bottom:0;background:#fff;padding:14px 16px;border-top:2px solid #e0e0e0;}
.submit-btn{display:block;width:100%;padding:20px;background:#1b5e20;color:#fff;
  border:none;border-radius:12px;font-size:22px;font-weight:900;cursor:pointer;letter-spacing:2px;}
.submit-btn:disabled{background:#a5d6a7;cursor:not-allowed;}
.success-wrap{text-align:center;padding:60px 20px;}
.success-wrap .icon{font-size:72px;margin-bottom:20px;}
.success-wrap .msg{font-size:26px;font-weight:900;color:#1b5e20;line-height:1.4;}
.success-wrap .sub{font-size:20px;color:#333;margin-top:12px;}
</style>
</head>
<body>

<div class="topbar">
  <div class="greeting">${greeting}</div>
  <div class="survey-title">${survey.title_zh}</div>
  <div class="prog">共 ${questions.length} 題</div>
</div>

<div id="formWrap">
<div class="wrap" id="questionsWrap"></div>
<div class="submit-wrap">
  <div id="globalErr" class="err-msg" style="margin-bottom:10px;"></div>
  <button class="submit-btn" id="submitBtn" onclick="submitSurvey()">✅ 提交問卷</button>
</div>
</div>

<div id="successWrap" style="display:none;" class="success-wrap">
  <div class="icon">✅</div>
  <div class="msg">多謝您！<br>已經收到您嘅意見</div>
  <div class="sub">感謝您抽時間填寫問卷 🙏</div>
</div>

<script>
var SURVEY_ID = ${survey.id};
var MEMBER_NO = ${memberNo ? JSON.stringify(memberNo) : 'null'};
var ROADSHOW_CODE = ${roadshowCode ? JSON.stringify(roadshowCode) : 'null'};
var QUESTIONS = ${questionsJson};
// answers store: key = question id (string), value = answer
var answers = {};

function renderQuestions() {
  var wrap = document.getElementById('questionsWrap');
  wrap.innerHTML = QUESTIONS.map(function(q) {
    var reqMark = q.required ? '<span class="q-required">✽ 必填</span>' : '';
    var inner = '';
    if (q.qtype === 'single') {
      var opts = [];
      try { opts = JSON.parse(q.options_json || '[]'); } catch(e){}
      inner = opts.map(function(o) {
        return '<button class="opt-btn" data-qid="'+q.id+'" data-val="'+escHtml(o)+'" onclick="pickSingle('+q.id+',this)">' + escHtml(o) + '</button>';
      }).join('');
    } else if (q.qtype === 'multi') {
      var opts = [];
      try { opts = JSON.parse(q.options_json || '[]'); } catch(e){}
      inner = opts.map(function(o) {
        return '<button class="opt-btn" data-qid="'+q.id+'" data-val="'+escHtml(o)+'" onclick="pickMulti('+q.id+',this)">' + escHtml(o) + '</button>';
      }).join('');
    } else if (q.qtype === 'rating') {
      inner = '<div class="rating-wrap">' +
        [1,2,3,4,5].map(function(n){
          return '<button class="star-btn" id="star-'+q.id+'-'+n+'" onclick="pickRating('+q.id+','+n+')" aria-label="'+n+'星">⭐</button>';
        }).join('') +
      '</div><div class="rating-label" id="rating-label-'+q.id+'">請揀1至5星</div>';
    } else if (q.qtype === 'text') {
      inner = '<textarea class="q-textarea" id="ta-'+q.id+'" placeholder="請輸入您的意見（可以唔填）" oninput="answers[\\''+q.id+'\\'] = this.value"></textarea>';
    }
    return '<div class="q-block" id="qb-'+q.id+'">' +
      '<div class="q-num">第 '+q.seq+' 題</div>' +
      '<div class="q-text">'+escHtml(q.text_zh)+reqMark+'</div>' +
      inner +
      '<div class="err-msg" id="err-'+q.id+'"></div>' +
    '</div>';
  }).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function pickSingle(qid, btn) {
  // Deselect all in group
  document.querySelectorAll('.opt-btn[data-qid="'+qid+'"]').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  answers[String(qid)] = btn.getAttribute('data-val');
  clearErr(qid);
}

function pickMulti(qid, btn) {
  btn.classList.toggle('selected');
  var selected = [];
  document.querySelectorAll('.opt-btn[data-qid="'+qid+'"].selected').forEach(function(b){ selected.push(b.getAttribute('data-val')); });
  answers[String(qid)] = selected;
  if (selected.length > 0) clearErr(qid);
}

function pickRating(qid, n) {
  answers[String(qid)] = n;
  for (var i = 1; i <= 5; i++) {
    var s = document.getElementById('star-'+qid+'-'+i);
    if (s) s.classList.toggle('lit', i <= n);
  }
  var lbl = document.getElementById('rating-label-'+qid);
  if (lbl) lbl.textContent = n + ' 星';
  clearErr(qid);
}

function clearErr(qid) {
  var qb = document.getElementById('qb-'+qid);
  var err = document.getElementById('err-'+qid);
  if (qb) qb.classList.remove('error');
  if (err) { err.textContent = ''; err.classList.remove('show'); }
}

function showErr(qid, msg) {
  var qb = document.getElementById('qb-'+qid);
  var err = document.getElementById('err-'+qid);
  if (qb) { qb.classList.add('error'); qb.scrollIntoView({behavior:'smooth',block:'center'}); }
  if (err) { err.textContent = msg; err.classList.add('show'); }
}

async function submitSurvey() {
  var btn = document.getElementById('submitBtn');
  var globalErr = document.getElementById('globalErr');
  globalErr.classList.remove('show');

  // Validate required questions
  var firstErrQid = null;
  for (var i = 0; i < QUESTIONS.length; i++) {
    var q = QUESTIONS[i];
    if (!q.required) continue;
    var val = answers[String(q.id)];
    var isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
    if (isEmpty) {
      showErr(q.id, '⚠️ 此題必須填寫');
      if (!firstErrQid) firstErrQid = q.id;
    }
  }
  if (firstErrQid) {
    globalErr.textContent = '⚠️ 請先回答所有必填題目（紅框）';
    globalErr.classList.add('show');
    return;
  }

  btn.disabled = true; btn.textContent = '提交中…';
  try {
    var res = await fetch('/api/survey/' + SURVEY_ID + '/submit', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ memberNo: MEMBER_NO, roadshowCode: ROADSHOW_CODE, answers: answers })
    });
    var data = await res.json();
    if (data.ok) {
      document.getElementById('formWrap').style.display = 'none';
      document.getElementById('successWrap').style.display = 'block';
      window.scrollTo(0,0);
    } else {
      globalErr.textContent = '⚠️ ' + (data.error || '提交失敗，請再試');
      globalErr.classList.add('show');
      btn.disabled = false; btn.textContent = '✅ 提交問卷';
    }
  } catch(e) {
    globalErr.textContent = '⚠️ 網絡錯誤，請重試';
    globalErr.classList.add('show');
    btn.disabled = false; btn.textContent = '✅ 提交問卷';
  }
}

// Init
renderQuestions();
</script>
</body></html>`)
})

// ─── HTML Pages ───────────────────────────────────────────────────────────────

// ── 85 AI Technology Limited Dashboard (Homepage) ────────────────────────────
function dashboardHtml() {
  const modules = [
    { path: '/membership/join', icon: '🪪', en: 'Membership', zh: '會員系統', status: 'live', desc: '會員登記、會員卡、資料管理' },
    { path: '/accounting',      icon: '📊', en: 'Accounting',  zh: '財務管理', status: 'soon', desc: '收支記錄、報表、審計' },
    { path: '/governance',      icon: '⚖️', en: 'Governance',  zh: '治理管理', status: 'soon', desc: '董事會、會議記錄、決策' },
    { path: '/events',          icon: '📅', en: 'Events',      zh: '活動管理', status: 'soon', desc: '活動策劃、報名、出席' },
    { path: '/volunteers',      icon: '🤝', en: 'Volunteers',  zh: '義工管理', status: 'soon', desc: '義工招募、時數記錄' },
  ]
  const cards = modules.map(m => {
    const isLive = m.status === 'live'
    return `
    <a href="${m.path}" class="mod-card ${isLive ? 'mod-live' : 'mod-soon'}">
      <div class="mod-icon">${m.icon}</div>
      <div class="mod-body">
        <div class="mod-en">${m.en}</div>
        <div class="mod-zh">${m.zh}</div>
        <div class="mod-desc">${m.desc}</div>
      </div>
      <div class="mod-badge">${isLive ? '使用中' : '即將推出'}</div>
    </a>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>85 AI Technology Limited</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Space+Grotesk:wght@400;500;700&family=Montserrat:wght@700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Noto Sans TC",sans-serif;background:#0a0f1e;color:#e8eaf0;min-height:100vh;display:flex;flex-direction:column}
/* ── Header */
.hdr{padding:48px 40px 32px;border-bottom:1px solid rgba(255,255,255,0.06)}
.hdr-company{font-family:"Montserrat",sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#6c7a9c;margin-bottom:12px}
.hdr-name{font-family:"Space Grotesk",sans-serif;font-size:clamp(28px,4vw,46px);font-weight:700;color:#fff;letter-spacing:-0.5px;line-height:1.15}
.hdr-name span{color:#4f8ef7}
.hdr-sub{margin-top:8px;font-size:14px;color:#4a5568;letter-spacing:0.5px}
/* ── Modules grid */
.main{flex:1;padding:40px}
.section-label{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#4a5568;margin-bottom:20px}
.mod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.mod-card{display:flex;align-items:center;gap:20px;padding:24px;border-radius:16px;border:1px solid rgba(255,255,255,0.07);text-decoration:none;color:inherit;position:relative;transition:transform 0.15s,border-color 0.15s,background 0.15s}
.mod-live{background:rgba(79,142,247,0.06);border-color:rgba(79,142,247,0.25)}
.mod-live:hover{transform:translateY(-2px);background:rgba(79,142,247,0.1);border-color:rgba(79,142,247,0.5)}
.mod-soon{background:rgba(255,255,255,0.02);opacity:0.5;pointer-events:none}
.mod-icon{font-size:32px;flex-shrink:0;width:52px;text-align:center}
.mod-body{flex:1;min-width:0}
.mod-en{font-family:"Space Grotesk",sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#4f8ef7;margin-bottom:4px}
.mod-zh{font-size:18px;font-weight:700;color:#e8eaf0;margin-bottom:4px}
.mod-desc{font-size:12px;color:#4a5568;line-height:1.5}
.mod-badge{position:absolute;top:16px;right:16px;font-size:10px;font-weight:700;letter-spacing:1px;padding:3px 8px;border-radius:20px}
.mod-live .mod-badge{background:rgba(79,142,247,0.15);color:#4f8ef7;border:1px solid rgba(79,142,247,0.3)}
.mod-soon .mod-badge{background:rgba(255,255,255,0.05);color:#4a5568;border:1px solid rgba(255,255,255,0.1)}
/* ── Footer */
.ftr{padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center}
.ftr-copy{font-size:12px;color:#2d3748}
.ftr-link{font-size:12px;color:#4a5568;text-decoration:none}
.ftr-link:hover{color:#4f8ef7}
</style>
</head>
<body>
<header class="hdr">
  <div class="hdr-company">85 AI Technology Limited · Management Platform</div>
  <div class="hdr-name">85 AI<span>.</span></div>
  <div class="hdr-sub">社企管理平台 · Enterprise Management System</div>
</header>
<main class="main">
  <div class="section-label">Modules · 功能模組</div>
  <div class="mod-grid">${cards}</div>
</main>
<footer class="ftr">
  <span class="ftr-copy">© 2026 85 AI Technology Limited. All rights reserved.</span>
  <a href="https://coeldery85.org" class="ftr-link" target="_blank">coeldery85.org →</a>
</footer>
</body>
</html>`
}

// ── Coming Soon placeholder ───────────────────────────────────────────────────
function comingSoonHtml(en: string, zh: string) {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${zh} · 85 AI</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Noto Sans TC",sans-serif;background:#0a0f1e;color:#e8eaf0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px}
.back{position:absolute;top:24px;left:24px;font-size:13px;color:#4a5568;text-decoration:none;font-family:"Space Grotesk",sans-serif}
.back:hover{color:#4f8ef7}
.icon{font-size:64px;margin-bottom:24px;opacity:0.3}
.en{font-family:"Space Grotesk",sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#4a5568;margin-bottom:12px}
.zh{font-size:28px;font-weight:700;color:#fff;margin-bottom:16px}
.msg{font-size:14px;color:#4a5568;line-height:1.8}
</style>
</head>
<body>
<a href="/" class="back">← 返回主頁</a>
<div class="icon">🚧</div>
<div class="en">${en}</div>
<div class="zh">${zh}</div>
<div class="msg">此模組正在開發中<br>Coming Soon</div>
</body>
</html>`
}

function htmlHead(title: string, extra = '') {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${title} · CoEldery 85</title>
<!-- PWA -->
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#228B22">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="CoEldery 85">
<link rel="apple-touch-icon" href="/icon-192.png">
<!-- /PWA -->
<link rel="stylesheet" href="/shared.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Noto+Serif+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&family=Montserrat:wght@700;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
<script>
/* QRCode.toCanvas shim */
window.QRCode = window.QRCode || {};
window.QRCode.toCanvas = function(canvas, text, opts, cb) {
  try {
    var ec = (opts && opts.errorCorrectionLevel) ? opts.errorCorrectionLevel.charAt(0).toUpperCase() : 'H';
    var qr = qrcode(0, ec);
    qr.addData(text);
    qr.make();
    var mcount = qr.getModuleCount();
    var margin = (opts && opts.margin !== undefined) ? opts.margin : 4;
    var size = (opts && opts.width) ? opts.width : 128;
    var cellSize = Math.max(1, Math.floor(size / (mcount + margin * 2)));
    var actualSize = cellSize * (mcount + margin * 2);
    canvas.width = actualSize; canvas.height = actualSize;
    var ctx = canvas.getContext('2d');
    var dark = (opts && opts.color && opts.color.dark) ? opts.color.dark : '#000000';
    var light = (opts && opts.color && opts.color.light) ? opts.color.light : '#ffffff';
    ctx.fillStyle = light; ctx.fillRect(0, 0, actualSize, actualSize);
    ctx.fillStyle = dark;
    for (var r = 0; r < mcount; r++) {
      for (var c2 = 0; c2 < mcount; c2++) {
        if (qr.isDark(r, c2)) ctx.fillRect((c2+margin)*cellSize, (r+margin)*cellSize, cellSize, cellSize);
      }
    }
    if (typeof cb === 'function') cb(null);
  } catch(e) { console.warn('QR shim error:', e); if (typeof cb === 'function') cb(e); }
};
</script>
${extra}
</head>`
}

// ─── Signup Main HTML ─────────────────────────────────────────────────────────
function signupMainHtml() {
  return htmlHead('申請老有卡', `<style>
/* ── 長者友善基礎字體 v2 ── */
body{background:#F0EBD8;min-height:100vh;padding:20px 16px;font-size:20px;line-height:1.7;color:#111;}
.container{max-width:480px;margin:0 auto;}
.brand-strip{display:flex;align-items:center;gap:12px;margin-bottom:24px;}
.brand-strip .mark{width:48px;height:48px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.brand-strip .mark img{width:48px;height:48px;object-fit:contain;}
.brand-strip .name .zh{font-family:"Noto Serif TC",serif;font-size:18px;color:var(--forest-deep);font-weight:700;letter-spacing:2px;line-height:1.3;}
.brand-strip .name .en{font-size:18px;color:var(--grey-2);letter-spacing:2px;margin-top:4px;}
.header-card{background:linear-gradient(135deg,#0d3e12 0%,#1B5E20 100%);color:#fff;padding:26px 22px;border-radius:4px;margin-bottom:20px;position:relative;overflow:hidden;}
.header-card::before{content:"85";position:absolute;right:-20px;bottom:-60px;font-family:"Noto Serif TC",serif;font-size:200px;font-weight:900;color:var(--ferrari);opacity:0.22;line-height:1;}
.header-card .tag{display:inline-block;background:var(--ferrari);color:#fff;padding:4px 12px;font-size:18px;letter-spacing:3px;font-weight:700;margin-bottom:12px;position:relative;z-index:2;}
.header-card h1{font-family:"Noto Serif TC",serif;font-size:32px;font-weight:900;letter-spacing:3px;line-height:1.25;margin-bottom:8px;position:relative;z-index:2;}
.header-card p{font-size:20px;opacity:0.9;line-height:1.7;position:relative;z-index:2;}
.form-card{background:#fff;padding:28px 22px;border-radius:4px;margin-bottom:20px;}
.form-card .step-note{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#FFF3B0;border-left:3px solid var(--ferrari);font-size:18px;color:var(--grey-1);margin-bottom:24px;line-height:1.6;}
/* ── 欄位標籤：22px ── */
.field{margin-bottom:24px;}
.field .label-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
.field label{font-family:"Noto Serif TC",serif;font-size:22px;color:var(--forest-deep);font-weight:700;letter-spacing:1px;line-height:1.4;}
.field .req{color:var(--ferrari);font-size:18px;font-weight:700;}
.field .opt{color:var(--grey-3);font-size:18px;}
/* ── input / select：最少 55px 高、20px 字體 ── */
.field input,.field select{width:100%;padding:16px 14px;min-height:55px;border:2px solid var(--line);border-radius:6px;font-size:20px;font-family:inherit;color:#111;background:#fff;transition:border 0.2s;box-sizing:border-box;line-height:1.4;}
.field input:focus,.field select:focus{outline:0;border-color:var(--forest);border-width:3px;}
.field .hint{font-size:18px;color:var(--grey-3);margin-top:6px;line-height:1.6;}
.section-divider{padding:16px 0 10px;font-family:"Noto Serif TC",serif;font-size:18px;color:var(--grey-2);letter-spacing:3px;border-top:1px dashed var(--line);margin-top:8px;}
/* ── 性別掣：最少 55px 高、20px 字體 ── */
.gender-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.gender-row .g-btn{padding:14px 4px;min-height:55px;border:2px solid var(--line);background:#fff;text-align:center;cursor:pointer;font-size:20px;font-family:inherit;color:#333;border-radius:6px;font-weight:600;line-height:1.3;}
.gender-row .g-btn.active{border-color:var(--forest);border-width:3px;background:var(--forest-pale);color:var(--forest-deep);font-weight:700;}
/* ── 同意條款：字體放大 ── */
.consent{padding:16px;background:var(--forest-pale);border-radius:4px;font-size:18px;color:#111;line-height:1.8;margin-bottom:24px;}
.consent label{display:flex;gap:12px;cursor:pointer;align-items:flex-start;}
.consent input{width:24px;height:24px;margin-top:3px;flex-shrink:0;accent-color:var(--forest);}
.consent a{color:var(--forest);text-decoration:underline;}
/* Medical card opt-in block */
.medical-block{border:2px solid #1565C0;border-radius:6px;overflow:hidden;margin-bottom:24px;}
.medical-header{background:linear-gradient(135deg,#1565C0 0%,#1976D2 100%);color:#fff;padding:16px 16px;display:flex;align-items:center;justify-content:space-between;user-select:none;}
.medical-header .mh-left{display:flex;align-items:center;gap:10px;}
.medical-header .mh-icon{font-size:28px;line-height:1;}
.medical-header .mh-title{font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:1px;line-height:1.3;}
.medical-header .mh-sub{font-size:18px;opacity:0.85;margin-top:3px;letter-spacing:0.5px;}
.medical-header .mh-badge{background:#FFD600;color:#1A237E;font-size:18px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:1px;white-space:nowrap;}
.medical-cta{background:#E8F0FE;border-bottom:1px solid #C5CAE9;transition:background 0.15s;}
.medical-cta-label{display:flex;align-items:center;gap:0;cursor:pointer;width:100%;padding:0;}
.medical-cta-check{display:flex;align-items:center;justify-content:center;background:#1565C0;width:64px;min-height:72px;flex-shrink:0;}
.medical-cta-check input[type=checkbox]{position:absolute;opacity:0;width:0;height:0;pointer-events:none;}
.custom-check-box{width:30px;height:30px;border-radius:6px;border:2.5px solid #fff;background:transparent;display:flex;align-items:center;justify-content:center;transition:background 0.15s,border-color 0.15s;flex-shrink:0;}
.custom-check-box.checked{background:#fff;border-color:#fff;}
.custom-check-box.checked::after{content:'';display:block;width:9px;height:16px;border-right:3px solid #1565C0;border-bottom:3px solid #1565C0;transform:rotate(45deg) translate(-1px,-2px);}
.medical-cta-text{flex:1;padding:16px 14px 16px 16px;}
.medical-cta-main{font-size:20px;color:#0D47A1;font-weight:700;font-family:"Noto Serif TC",serif;letter-spacing:0.5px;margin-bottom:5px;line-height:1.4;}
.medical-cta-sub{font-size:18px;color:#5C6BC0;line-height:1.6;}
.medical-cta-arrow{font-size:22px;color:#1565C0;padding-right:14px;flex-shrink:0;transition:transform 0.2s;}
.medical-cta-arrow.open{transform:rotate(180deg);}
.medical-extra{display:none;padding:20px;background:#fff;}
.medical-extra.show{display:block;}
.medical-extra .notice{background:#FFF8E1;border-left:3px solid #F9A825;padding:12px 14px;font-size:18px;color:#5D4037;line-height:1.7;margin-bottom:20px;border-radius:0 4px 4px 0;}
.medical-extra .field label{color:#1565C0;}
.medical-extra .field input{border-color:#90CAF9;}
.medical-extra .field input:focus{border-color:#1565C0;}
.medical-privacy{background:#E3F2FD;border-radius:4px;padding:14px 16px;font-size:18px;color:#37474F;line-height:1.9;margin-top:14px;}
.medical-privacy label{display:flex;gap:10px;cursor:pointer;align-items:flex-start;}
.medical-privacy input{width:22px;height:22px;flex-shrink:0;margin-top:2px;accent-color:#1565C0;}
/* ── 提交掣：最少 55px 高、20px 字體 ── */
.submit-btn{width:100%;padding:20px;min-height:55px;background:var(--forest);color:#fff;border:0;border-radius:6px;font-size:22px;font-family:"Noto Serif TC",sans-serif;font-weight:700;letter-spacing:3px;cursor:pointer;box-shadow:0 4px 0 var(--forest-deep);transition:all 0.1s;line-height:1.3;}
.submit-btn:active{transform:translateY(2px);box-shadow:0 2px 0 var(--forest-deep);}
.submit-btn:disabled{background:var(--grey-3);box-shadow:0 4px 0 var(--grey-2);cursor:not-allowed;}
.footer-links{text-align:center;margin-top:20px;font-size:18px;color:var(--grey-3);line-height:2;}
.footer-links a{color:var(--forest);text-decoration:none;}
.success{display:none;text-align:center;}
.success.show{display:block;}
.success-icon{width:80px;height:80px;background:var(--forest);color:#fff;border-radius:50%;margin:20px auto 24px;display:flex;align-items:center;justify-content:center;font-size:44px;animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1);}
@keyframes pop{0%{transform:scale(0);}100%{transform:scale(1);}}
.success h1{font-family:"Noto Serif TC",serif;font-size:28px;color:var(--forest-deep);margin-bottom:6px;letter-spacing:3px;}
.success .welcome{font-size:20px;color:var(--grey-2);margin-bottom:24px;}
.gen-card{width:340px;height:232px;margin:0 auto 20px;background:linear-gradient(150deg,#FAF7F0 0%,#F0EBD8 100%);border:1px solid #E5DEC8;border-radius:12px;position:relative;overflow:hidden;color:var(--forest-deep);box-shadow:0 12px 30px rgba(0,0,0,0.18);text-align:left;}
.gen-card::before{content:"";position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,var(--forest) 0%,var(--forest-light) 45%,var(--ferrari) 45%,var(--ferrari) 100%);}
.gen-card .gc-brand{position:absolute;top:16px;left:18px;display:flex;align-items:center;gap:8px;}
.gen-card .gc-cardname{font-family:"Noto Serif TC",serif;font-size:14px;color:var(--forest-deep);letter-spacing:2px;font-weight:900;border-left:2px solid var(--forest-deep);padding-left:8px;line-height:1.1;}
.gen-card .gc-explorery{position:absolute;top:20px;right:18px;display:inline-flex;align-items:center;gap:4px;background:var(--forest-pale);border:1px solid var(--forest);padding:4px 9px;font-family:"Noto Serif TC",serif;font-size:11px;color:var(--forest-deep);letter-spacing:1.5px;font-weight:700;border-radius:2px;white-space:nowrap;}
.gen-card .gc-explorery::before{content:"◆";color:var(--ferrari);font-size:10px;}
.gen-card .gc-tier{position:absolute;top:48px;right:18px;font-family:"Noto Serif TC",serif;font-size:11px;color:var(--ferrari);letter-spacing:3px;font-weight:700;}
.gen-card .gc-name-block{position:absolute;left:18px;right:18px;bottom:62px;}
.gen-card .gc-name-block .gc-prefix{font-family:"Noto Serif TC",serif;font-size:12px;color:var(--grey-2);letter-spacing:4px;margin-bottom:8px;font-weight:500;}
.gen-card .gc-name-block .gc-zh{font-family:"Noto Serif TC",serif;font-size:44px;font-weight:900;color:#0d3e12;letter-spacing:5px;line-height:1;display:inline-block;}
.gen-card .gc-name-block .gc-en{font-family:"Noto Serif TC",serif;font-size:15px;font-weight:700;color:var(--forest-deep);letter-spacing:2px;margin-top:8px;display:block;text-align:left;line-height:1.2;}
.gen-card .gc-footer{position:absolute;bottom:16px;left:18px;right:18px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px;}
.gen-card .gc-num{font-family:"Space Grotesk",monospace;font-size:17px;color:#0d3e12;letter-spacing:1.5px;font-weight:700;}
.gen-card .gc-num .k{font-family:"Noto Serif TC",serif;font-size:10px;color:var(--grey-2);letter-spacing:2.5px;margin-bottom:4px;display:block;font-weight:500;}
.gen-card .gc-qr{width:46px;height:46px;background:#fff;padding:3px;border:1.5px solid var(--forest);border-radius:3px;flex-shrink:0;}
.gen-card .gc-qr canvas{width:100%;height:100%;}
.action-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
.action-btn{padding:14px 8px;background:#fff;border:2px solid var(--forest);color:var(--forest-deep);font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:1px;cursor:pointer;border-radius:4px;text-align:center;min-height:55px;}
.action-btn.red{border-color:var(--ferrari);color:var(--ferrari);}
.wa-link{display:block;width:100%;padding:18px;background:var(--forest);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:12px;min-height:55px;}
/* ── 錯誤提示：大紅字最少 20px ── */
.err-msg{background:var(--ferrari-pale);border:2px solid var(--ferrari);color:#b71c1c;padding:14px 18px;border-radius:6px;font-size:20px;font-weight:700;margin-bottom:20px;display:none;line-height:1.5;}
.err-msg.show{display:block;}
/* ── Tab bar (Login / Register) ── */
.tab-bar{display:grid;grid-template-columns:1fr 1fr;border-radius:6px 6px 0 0;overflow:hidden;margin-bottom:0;}
.tab-btn{padding:16px 8px;text-align:center;font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;letter-spacing:2px;cursor:pointer;border:none;background:var(--forest-pale);color:var(--forest-deep);transition:all 0.2s;min-height:55px;}
.tab-btn.active{background:var(--forest-deep);color:#fff;}
.tab-section{display:none;}
.tab-section.active{display:block;}
/* ── Login panel ── */
.login-panel{background:#fff;border-radius:0 0 6px 6px;padding:28px 22px;margin-bottom:16px;}
.login-panel .field{margin-bottom:22px;}
.login-panel .field label{font-family:"Noto Serif TC",serif;font-size:20px;color:#111;font-weight:700;letter-spacing:1px;margin-bottom:8px;display:block;line-height:1.4;}
.login-panel .field input{width:100%;padding:16px 14px;min-height:55px;border:2px solid var(--line);border-radius:6px;font-size:20px;font-family:inherit;color:#111;background:#fff;transition:border 0.2s;box-sizing:border-box;}
.login-panel .field input:focus{outline:0;border-color:var(--forest);border-width:3px;}
.login-panel .field .hint{font-size:18px;color:var(--grey-3);margin-top:6px;line-height:1.6;}
.result-block{background:#E8F5E9;border:2px solid var(--forest);border-radius:6px;padding:20px;margin-top:16px;display:none;}
.result-block.show{display:block;}
.rb-name{font-family:"Noto Serif TC",serif;font-size:28px;font-weight:900;color:var(--forest-deep);}
.rb-no{font-family:"Space Grotesk",monospace;font-size:18px;color:var(--grey-2);margin-bottom:14px;}
.rb-go{display:block;width:100%;padding:16px;background:var(--forest-deep);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:8px;min-height:55px;}
.rb-family-title{font-family:"Noto Serif TC",serif;font-size:18px;color:var(--ferrari-deep);letter-spacing:2px;font-weight:700;margin:14px 0 8px;padding-top:12px;border-top:1px solid #c8e6c9;}
.fc-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #e0f0e0;}
.fc-row:last-child{border-bottom:none;}
.fc-row .fn{font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;color:var(--ferrari-deep);}
.fc-row .fno{font-size:18px;color:#aaa;}
.fc-row a{padding:8px 14px;background:var(--ferrari);color:#fff;border-radius:4px;font-size:18px;font-weight:700;text-decoration:none;}
</style>`) + `
<body>
<div class="container">
  <div class="brand-strip">
    <div class="mark"><img src="/static/logo-coeldery.png" alt="CoEldery 85"></div>
    <div class="name">
      <div class="zh">CoEldery 85 老有聯盟</div>
      <div class="en">COELDERY 85 · MEMBERSHIP</div>
    </div>
  </div>

  <!-- Tab bar -->
  <div class="tab-bar" id="mainTabBar">
    <button class="tab-btn" id="tabLogin" onclick="switchTab('login')">🔐 會員登入</button>
    <button class="tab-btn active" id="tabRegister" onclick="switchTab('register')">📝 首次登記</button>
  </div>

  <!-- LOGIN tab -->
  <div class="tab-section" id="secLogin">
    <div class="login-panel">
      <div class="field">
        <label for="loginPhone">你的 WhatsApp 電話</label>
        <input id="loginPhone" type="tel" placeholder="例：91234567" inputmode="numeric" maxlength="8">
        <div class="hint">輸入登記老有卡時使用的 8 位號碼</div>
      </div>
      <div class="err-msg" id="loginErrMsg"></div>
      <button type="button" class="submit-btn" id="loginBtn" onclick="doLogin()">登入查看我的卡</button>
      <div class="result-block" id="loginResult">
        <div class="rb-name" id="rbName"></div>
        <div class="rb-no" id="rbNo"></div>
        <a id="rbGoBtn" href="#" class="rb-go">🪪 查看我的老有卡</a>
        <div id="rbFamilyWrap" style="display:none;">
          <div class="rb-family-title">◆ 名下家庭同行卡</div>
          <div id="rbFamilyList"></div>
        </div>
      </div>
      <div class="footer-links" style="margin-top:16px;">
        <a href="/membership/join-family">為家人申請家庭同行卡 →</a>
      </div>
    </div>
  </div>

  <!-- REGISTER tab -->
  <div class="tab-section active" id="secRegister">

  <!-- Form Section -->
  <div id="formSection">
    <div class="header-card">
      <div class="tag">◆ 免費入會</div>
      <h1>申請老有卡</h1>
      <p>55歲或以上長者 · 免費登記成為會員<br>即刻攞數碼會員卡</p>
    </div>

    <div class="err-msg" id="errMsg"></div>

    <form id="signupForm" onsubmit="return false;">

      <!-- ── 醫健卡 opt-in（隱藏：前端不顯示；後端 API 及 medical_card_applications 表保留）── -->
      <div class="medical-block" style="display:none;" aria-hidden="true">
        <div class="medical-header">
          <div class="mh-left">
            <div class="mh-icon">🏥</div>
            <div>
              <div class="mh-title">同時申請免費醫健卡</div>
              <div class="mh-sub">由合作 NGO 香港商貿慈善基金提供</div>
            </div>
          </div>
          <div class="mh-badge">✦ 免費</div>
        </div>
        <div class="medical-cta-label" id="medCta" style="cursor:pointer;" onclick="var cb=document.getElementById('applyMedical');cb.checked=!cb.checked;toggleMedical(cb);">
          <div class="medical-cta-check">
            <input type="checkbox" id="applyMedical" onchange="toggleMedical(this)" onclick="event.stopPropagation();">
            <div class="custom-check-box" id="customCheckBox"></div>
          </div>
          <div class="medical-cta-text">
            <div class="medical-cta-main" id="medCtaMain">點擊申請免費醫健卡（可選）</div>
            <div class="medical-cta-sub">一次登記，同時擁有老有卡 + 醫健卡 · NGO 職員以 WhatsApp 聯絡辦理</div>
          </div>
          <div class="medical-cta-arrow" id="medArrow">▼</div>
        </div>
        <div class="medical-extra" id="medicalExtra">
          <div class="notice">
            ⚕️ 醫健卡資料必須與<strong>香港身份證完全一致</strong>，請確保中英文姓名及身份證號碼頭4位正確無誤。
          </div>
          <div class="field">
            <div class="label-row">
              <label for="medNameZh">中文全名 <span style="font-size:16px;font-weight:400;color:#888;">（與身份證相同）</span></label>
              <span class="req">✽ 必填</span>
            </div>
            <input id="medNameZh" type="text" placeholder="例：陳大文" oninput="syncNameFromMedical()">
          </div>
          <div class="field">
            <div class="label-row">
              <label for="medNameEn">英文全名 <span style="font-size:16px;font-weight:400;color:#888;">（與身份證相同）</span></label>
              <span class="req">✽ 必填</span>
            </div>
            <input id="medNameEn" type="text" placeholder="例：CHAN TAI MAN" style="text-transform:uppercase;" oninput="syncNameFromMedical()">
            <div class="hint">請使用全大楷，與身份證英文姓名一致</div>
          </div>
          <div class="field">
            <div class="label-row">
              <label for="medHkid">身份證頭4位</label>
              <span class="req">✽ 必填</span>
            </div>
            <input id="medHkid" type="text" placeholder="例：K608" maxlength="4" style="text-transform:uppercase;letter-spacing:4px;font-size:20px;font-weight:700;">
            <div class="hint">香港身份證號碼首4個字符，例如 A123、K608</div>
          </div>
          <div class="medical-privacy">
            <label>
              <input type="checkbox" id="medConsent">
              <span>本人同意將以上個人資料（包括姓名及身份證頭4位）提供予<strong>香港商貿慈善基金</strong>，用於申請及發出醫健卡。本人明白 NGO 職員將以電話或 WhatsApp 與本人聯絡辦理手續，並同意接受聯絡。本人已閱讀並同意<a href="https://www.hmmp.com.hk" target="_blank" style="color:#1565C0;">香港商貿慈善基金私隱政策</a>。</span>
            </label>
          </div>
        </div>
      </div>

      <div class="form-card">
        <div class="field">
          <div class="label-row">
            <label for="nameZh">姓名／稱呼</label>
            <span class="req">✽ 必填</span>
          </div>
          <input id="nameZh" type="text" placeholder="填你嘅名或稱呼（中英文都得）" autocomplete="name">
        </div>

        <div class="field">
          <div class="label-row">
            <label for="phone">WhatsApp 電話</label>
            <span class="req">✽ 必填</span>
          </div>
          <input id="phone" type="tel" placeholder="例：91234567" inputmode="numeric" maxlength="8">
          <div class="hint">只限香港 8 位電話號碼</div>
        </div>

        <div class="field">
          <div class="label-row"><label>性別</label><span class="req">✽ 必填</span></div>
          <div class="gender-row">
            <button type="button" class="g-btn" data-v="M" onclick="setGender('M',this)">男 M</button>
            <button type="button" class="g-btn" data-v="F" onclick="setGender('F',this)">女 F</button>
          </div>
        </div>

        <div class="field">
          <div class="label-row"><label for="birthYear">出生年份 <span style="color:var(--ferrari);font-size:18px;">✽ 必填</span></label></div>
          <input id="birthYear" type="number" placeholder="例：1960" inputmode="numeric" min="1920" max="2010" required>
          <div class="hint">年滿 55 歲自動成為主卡，55 歲以下為家庭卡</div>
        </div>

        <div class="field">
          <div class="label-row"><label for="district">居住地區</label><span class="req">✽ 必填</span></div>
          <select id="district">
            <option value="">— 請選擇 —</option>
            <option>中西區</option><option>灣仔</option><option>東區</option><option>南區</option>
            <option>油尖旺</option><option>深水埗</option><option>九龍城</option><option>黃大仙</option>
            <option>觀塘</option><option>荃灣</option><option>屯門</option><option>元朗</option>
            <option>北區</option><option>大埔</option><option>沙田</option><option>西貢</option>
            <option>葵青</option><option>離島</option>
          </select>
        </div>
      </div>

      <div class="consent">
        <label>
          <input type="checkbox" id="consent" required>
          <span>本人同意 85 AI Technology Limited 根據<a href="#" target="_blank">私隱政策</a>收集及使用以上個人資料，用於會員登記及相關服務。</span>
        </label>
      </div>

      <button type="button" class="submit-btn" id="submitBtn" onclick="submitForm()">
        立即登記
      </button>

      <div class="footer-links">
        <a href="/membership/join-family">家庭同行卡申請 →</a><br>
        如有疑問 WhatsApp：<a href="https://wa.me/85291477341" target="_blank">9147-7341</a>
      </div>
    </form>
  </div>

  <!-- Success Section -->
  <div class="success" id="successSection">
    <div class="success-icon">✓</div>
    <h1>登記成功！</h1>
    <p class="welcome">歡迎加入 CoEldery 85 老有聯盟</p>

    <!-- Live card (display only) -->
    <div class="gen-card" id="genCard">
      <div class="gc-brand">
        <div class="gc-cardname">老有卡</div>
      </div>
      <div class="gc-explorery">CoExplorery 探索者</div>
      <div class="gc-tier" id="cardTierLabel">PRIMARY MEMBER</div>
      <div class="gc-name-block">
        <div class="gc-prefix">MEMBER NAME · 姓名</div>
        <div class="gc-zh" id="cardZh"></div>
        <div class="gc-en" id="cardEn"></div>
      </div>
      <div class="gc-footer">
        <div class="gc-num">
          <span class="k">MEMBER NO.</span>
          <span id="cardNo"></span>
        </div>
        <div class="gc-qr"><canvas id="cardQr"></canvas></div>
      </div>
    </div>

    <!-- Card image preview (rendered canvas) — wraps both img + pending watermark overlay -->
    <div id="cardImgWrap" style="display:none;margin:0 auto 0;max-width:340px;position:relative;">
      <img id="cardImg" style="width:100%;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.18);" alt="會員卡">
      <!-- Pending verification watermark overlay -->
      <div id="pendingWatermark" style="position:absolute;inset:0;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.38);pointer-events:none;">
        <div style="color:#fff;font-size:18px;font-weight:900;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.7);background:rgba(0,0,0,0.45);padding:8px 18px;border-radius:6px;border:2px solid rgba(255,255,255,0.6);">⏳ 待驗證</div>
        <div style="color:#ffe082;font-size:18px;font-weight:700;margin-top:6px;text-shadow:0 1px 4px rgba(0,0,0,0.8);">點擊下方按鈕完成驗證</div>
      </div>
    </div>

    <!-- WA Verification block — shown directly below card, BEFORE other action buttons -->
    <div id="waVerifyBlock" style="display:none;margin:10px 0 14px;background:#f0faf3;border:1.5px solid #25D366;border-radius:8px;padding:14px;">
      <div style="font-size:20px;font-weight:700;color:#1a5c2a;margin-bottom:10px;text-align:center;">📲 發 WhatsApp 完成身份驗證</div>
      <div id="waVerifyMsgPreview" style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:9px 11px;font-size:18px;color:#333;margin-bottom:12px;line-height:1.6;"></div>
      <!-- Button 1: Normal WhatsApp — real flow, visibilitychange triggers markVerified on return -->
      <button id="waVerifyBtn" onclick="openWA()"
        style="display:block;width:100%;box-sizing:border-box;background:#25D366;color:#fff;font-size:20px;font-weight:700;padding:16px 8px;border-radius:8px;border:none;cursor:pointer;text-align:center;margin-bottom:8px;min-height:55px;">
        💬 我有 WhatsApp — 發送驗證訊息
      </button>
      <!-- Button 2: WA Business — fake 2.5s flow, records wa_clicked_at only -->
      <button id="waBizBtn" onclick="openWABiz()"
        style="display:block;width:100%;box-sizing:border-box;background:#fff;color:#1a5c2a;font-size:18px;font-weight:700;padding:14px 8px;border-radius:8px;border:1.5px solid #25D366;cursor:pointer;text-align:center;min-height:55px;">
        📱 我用 WhatsApp Business
      </button>
      <div id="waSendingMsg" style="display:none;text-align:center;margin-top:10px;font-size:18px;color:#388E3C;font-weight:600;">📤 正在提交驗證...</div>
    </div>

    <!-- Banner A: normal WA sent — watermark stays, waiting for admin confirm -->
    <div id="waSentBanner" style="display:none;margin:0 0 14px;background:#e8f5e9;border:1.5px solid #4caf50;border-radius:8px;padding:12px 14px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#2E7D32;">📤 驗證訊息已發出！</div>
      <div style="font-size:18px;color:#388E3C;margin-top:4px;">請在 WhatsApp 中發送訊息給我們，Admin 確認後會籍即生效。</div>
    </div>
    <!-- Banner B: WA Biz fake complete — watermark hidden -->
    <div id="verifiedBanner" style="display:none;margin:0 0 14px;background:#e8f5e9;border:1.5px solid #4caf50;border-radius:8px;padding:12px 14px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#2E7D32;">✅ 驗證訊息已發送！</div>
      <div style="font-size:18px;color:#388E3C;margin-top:4px;">Admin 收到後將確認你的會籍，感謝你！</div>
    </div>

    <!-- Medical card notice (shown if applied) -->
    <div id="medSuccessNotice" style="display:none;background:#E3F2FD;border:1.5px solid #1565C0;border-radius:6px;padding:14px 16px;margin-bottom:16px;text-align:left;">
      <div style="font-size:20px;font-weight:700;color:#0D47A1;margin-bottom:6px;">🏥 醫健卡申請已提交</div>
      <div style="font-size:18px;color:#1A237E;line-height:1.7;">
        你的醫健卡申請已記錄，<strong>香港商貿慈善基金</strong>職員將會以<strong>電話或 WhatsApp</strong> 聯絡你安排發卡手續。如有查詢請致電或 WhatsApp：<strong>9888 5708</strong>
      </div>
    </div>

    <div class="action-row">
      <button class="action-btn" id="saveImgBtn" onclick="saveCardImage()">💾 儲存卡圖</button>
      <button class="action-btn red" onclick="window.location.href='/membership/join-family?parent='+(window._verifyMemberNo||'')">家人申請</button>
    </div>

    <button class="wa-link" id="waImgBtn" onclick="shareCardToWA()" style="width:100%;border:0;cursor:pointer;">
      📱 WhatsApp 分享會員卡圖片
    </button>

    <div class="footer-links">
      <a id="myPageLink" href="#" style="color:var(--forest);font-weight:700;">🪪 查看我的會員頁</a><br>
      <a href="#" onclick="switchTab('login');window.scrollTo(0,0);return false;" style="color:var(--forest);">🔐 下次用電話登入</a><br>
      <a href="/">返回首頁</a>
    </div>
  </div>
  </div><!-- /secRegister -->
</div><!-- /container -->

<script>
// ── PWA install prompt storage (for use in showInstallPrompt) ──
window._deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  window._deferredInstallPrompt = e;
  // If install banner is already showing (user already clicked WA), activate install button
  if(window._installBannerPending) {
    window._installBannerPending = false;
    var btn = document.getElementById('pwaInstallBtn');
    var fb = document.getElementById('pwaInstallFallback');
    if(btn) { btn.style.display = ''; }
    if(fb) { fb.style.display = 'none'; }
  }
});
// ── HK Phone validator (frontend mirror of backend validateHKPhone) ───────────
function validateHKPhone(p) {
  if (p.length !== 8) return '請填寫正確的 8 位香港電話號碼';
  if (!/^[2-9]/.test(p)) return '電話號碼格式不正確（香港號碼以 2–9 開頭，1 除外）';
  if(new Set(p.split('')).size===1) return '請填寫真實的電話號碼';
  if (p === '12345678' || p === '87654321' || p === '11223344') return '請填寫真實的電話號碼';
  return null; // ok
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(t) {
  document.getElementById('secLogin').classList.toggle('active', t === 'login');
  document.getElementById('secRegister').classList.toggle('active', t === 'register');
  document.getElementById('tabLogin').classList.toggle('active', t === 'login');
  document.getElementById('tabRegister').classList.toggle('active', t === 'register');
  document.getElementById('loginErrMsg').classList.remove('show');
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function doLogin() {
  document.getElementById('loginErrMsg').classList.remove('show');
  var phone = document.getElementById('loginPhone').value.replace(/[^0-9]/g, '');
  var phoneErr = validateHKPhone(phone);
  if (phoneErr) { showLoginErr(phoneErr); return; }
  var btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = '查詢中…';
  try {
    var res = await fetch('/api/members/lookup?phone=' + encodeURIComponent(phone));
    var data = await res.json();
    if (!data.ok) { showLoginErr('找不到此電話的會員記錄。如未登記，請切換至「首次登記」。'); btn.disabled = false; btn.textContent = '登入查看我的卡'; return; }
    var m = data.member;
    document.getElementById('rbName').textContent = m.name_zh;
    document.getElementById('rbNo').textContent = m.member_no + ' · ' + (m.tier === 'PRIMARY' ? '長者主卡' : '家庭同行卡');
    document.getElementById('rbGoBtn').href = '/membership/card/' + m.member_no;
    document.getElementById('loginResult').classList.add('show');
    btn.style.display = 'none';
    document.getElementById('loginPhone').disabled = true;
    if (m.tier === 'PRIMARY') {
      var fr = await fetch('/api/members/' + encodeURIComponent(m.member_no) + '/family');
      var fd = await fr.json();
      if (fd.ok && fd.family && fd.family.length > 0) {
        document.getElementById('rbFamilyList').innerHTML = fd.family.map(function(f) {
          return '<div class="fc-row"><div><div class="fn">' + f.name_zh + '</div><div class="fno">' + f.member_no + '</div></div><a href="/membership/card/' + f.member_no + '">查看</a></div>';
        }).join('');
        document.getElementById('rbFamilyWrap').style.display = 'block';
      }
    }
    window.scrollTo(0, 0);
  } catch(e) { showLoginErr('網絡錯誤，請再試一次'); btn.disabled = false; btn.textContent = '登入查看我的卡'; }
}
function showLoginErr(msg) { var el = document.getElementById('loginErrMsg'); el.textContent = msg; el.classList.add('show'); }
document.addEventListener('DOMContentLoaded', function() {
  var lp = document.getElementById('loginPhone');
  if (lp) lp.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
  // if URL is /membership or /membership/login, default to login tab
  if (location.pathname === '/membership' || location.pathname === '/membership/login' || location.pathname === '/membership/') {
    switchTab('login');
  }
  // Restore success page after WA redirect (page full reload — rare on iOS bfcache miss)
  if(location.pathname === '/membership/join') {
    var saved = sessionStorage.getItem('successData');
    var waVerifyPending = sessionStorage.getItem('waVerifyPending');
    if(saved && waVerifyPending) {
      try {
        var data = JSON.parse(saved);
        var med = sessionStorage.getItem('appliedMedical') === '1';
        sessionStorage.removeItem('waVerifyPending');
        showSuccess(data, med);
        // Full reload after normal WA: watermark gone, verified_at set
        setTimeout(function(){
          var wm = document.getElementById('pendingWatermark');
          var block = document.getElementById('waVerifyBlock');
          var banner = document.getElementById('verifiedBanner');
          if(wm) wm.style.display = 'none';
          if(block) block.style.display = 'none';
          if(banner) banner.style.display = 'block';
          var no = window._verifyMemberNo;
          if(no) fetch('/api/members/' + encodeURIComponent(no) + '/verify', {method:'POST'}).catch(function(){});
        }, 600);
      } catch(e) {}
    }
  }
});

// ── Register ──────────────────────────────────────────────────────────────────
var selectedGender = '';
function setGender(v, btn) {
  selectedGender = v;
  document.querySelectorAll('.g-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function syncNameFromMain() {
  // 主表單已合併成單一「姓名／稱呼」欄，只同步 nameZh 到醫健卡中文名
  if (!document.getElementById('applyMedical').checked) return;
  var zh = document.getElementById('nameZh').value.trim();
  if (zh) document.getElementById('medNameZh').value = zh;
}

function syncNameFromMedical() {
  // 醫健卡中文名反向同步回主表單「姓名／稱呼」欄（英文名欄已移除，不再同步 nameEn）
  var zh = document.getElementById('medNameZh').value.trim();
  if (zh) document.getElementById('nameZh').value = zh;
}

function toggleMedical(cb) {
  var extra = document.getElementById('medicalExtra');
  var arrow = document.getElementById('medArrow');
  var cta = document.getElementById('medCta');
  var mainLabel = document.getElementById('medCtaMain');
  var customBox = document.getElementById('customCheckBox');
  if (cb.checked) {
    if(customBox){ customBox.classList.add('checked'); }
    extra.classList.add('show');
    if(arrow){ arrow.classList.add('open'); }
    if(cta){ cta.style.background='#C8D8FA'; }
    if(mainLabel){ mainLabel.textContent='✅ 已勾選申請免費醫健卡'; }
    // 預填醫健卡中文名（主表單已無獨立 nameEn，只同步 nameZh）
    var zh = document.getElementById('nameZh').value.trim();
    if (zh) document.getElementById('medNameZh').value = zh;
    document.getElementById('submitBtn').textContent = '立即登記（兩卡同申）';
    extra.scrollIntoView({behavior:'smooth', block:'nearest'});
  } else {
    if(customBox){ customBox.classList.remove('checked'); }
    extra.classList.remove('show');
    if(arrow){ arrow.classList.remove('open'); }
    if(cta){ cta.style.background=''; }
    if(mainLabel){ mainLabel.textContent='點擊此處申請免費醫健卡（選擇性）'; }
    document.getElementById('submitBtn').textContent = '立即登記';
  }
}

function showErr(msg) {
  var el = document.getElementById('errMsg');
  el.textContent = msg;
  el.classList.add('show');
  el.scrollIntoView({behavior:'smooth'});
}

async function submitForm() {
  document.getElementById('errMsg').classList.remove('show');
  var nameZh = document.getElementById('nameZh').value.trim();
  var phone = document.getElementById('phone').value.replace(/[^0-9]/g,'');
  var consent = document.getElementById('consent').checked;
  var applyMedical = document.getElementById('applyMedical').checked;

  // 主表單已合併成單一「姓名／稱呼」欄，nameEn 在未申請醫健卡時存空字串
  var nameEn = '';
  var birthYear = parseInt(document.getElementById('birthYear').value || '0');
  var district = document.getElementById('district').value;
  if (!nameZh) { showErr('請填寫姓名／稱呼'); return; }
  var phoneErr = validateHKPhone(phone);
  if (phoneErr) { showErr(phoneErr); return; }
  if (!selectedGender) { showErr('請選擇性別'); return; }
  if (!birthYear) { showErr('請填寫出生年份'); return; }
  if (birthYear < 1920 || birthYear > 2010) { showErr('請填寫正確的出生年份（1920–2010）'); return; }
  if (!district) { showErr('請選擇居住地區'); return; }
  if (!consent) { showErr('請同意私隱政策'); return; }

  // Validate medical card fields if opted in
  var medPayload = null;
  if (applyMedical) {
    var medNameZh = document.getElementById('medNameZh').value.trim();
    var medNameEn = document.getElementById('medNameEn').value.trim().toUpperCase();
    var medHkid = document.getElementById('medHkid').value.trim().toUpperCase();
    var medConsent = document.getElementById('medConsent').checked;
    if (!medNameZh) { showErr('申請醫健卡：請填寫中文全名'); return; }
    if (!medNameEn) { showErr('申請醫健卡：請填寫英文全名'); return; }
    if (!medHkid || medHkid.length < 3) { showErr('申請醫健卡：請填寫身份證頭4位（如 K608）'); return; }
    if (!medConsent) { showErr('申請醫健卡：請同意醫健卡私隱條款，授權 NGO 聯絡你'); return; }
    medPayload = { medNameZh, medNameEn, medHkid };
  }

  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '登記中…';

  var params = new URLSearchParams(location.search);
  try {
    var res = await fetch('/api/members', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        nameZh: nameZh,
        phone: phone,
        nameEn: nameEn,
        gender: selectedGender,
        birthYear: birthYear.toString(),
        district: district,
        roadshow: params.get('rs') || 'walk-in',
        source: params.get('src') || (params.get('rs') ? 'roadshow' : params.get('ref') ? 'referral' : 'walk-in'),
        referrerNo: params.get('ref') || '',
        roadshowLocation: params.get('loc') || '',
        applyMedical: applyMedical,
        medNameZh: medPayload?.medNameZh || '',
        medNameEn: medPayload?.medNameEn || '',
        medHkid: medPayload?.medHkid || ''
      })
    });
    var data = await res.json();
    if (!data.ok) { showErr(data.error || '登記失敗，請再試一次'); btn.disabled=false; btn.textContent=applyMedical?'立即登記（兩卡同申）':'立即登記'; return; }
    showSuccess(data, applyMedical);
  } catch(e) {
    showErr('網絡錯誤，請再試一次');
    btn.disabled=false; btn.textContent=applyMedical?'立即登記（兩卡同申）':'立即登記';
  }
}

function showSuccess(data, appliedMedical) {
  document.getElementById('formSection').style.display='none';
  document.getElementById('cardZh').textContent = data.nameZh;
  document.getElementById('cardEn').textContent = data.nameEn || '';
  document.getElementById('cardNo').textContent = data.memberNo;
  var cardUrl = location.origin + '/membership/card/' + data.memberNo;
  try { QRCode.toCanvas(document.getElementById('cardQr'), cardUrl, {width:40,margin:0,color:{dark:'#0d3e12',light:'#ffffff'},errorCorrectionLevel:'H'}); } catch(e) { console.warn('QR error (non-fatal):', e); }
  // Show medical card notice if applied
  var medNotice = document.getElementById('medSuccessNotice');
  if (medNotice) medNotice.style.display = appliedMedical ? 'block' : 'none';
  document.getElementById('successSection').classList.add('show');
  // Set link to member profile page
  var myLink = document.getElementById('myPageLink');
  if(myLink) myLink.href = '/membership/card/' + data.memberNo;
  window.scrollTo(0,0);
  // Store member no globally for verify call
  window._verifyMemberNo = data.memberNo;
  // Save to sessionStorage so WA redirect + return can restore this page
  sessionStorage.setItem('successData', JSON.stringify(data));
  sessionStorage.setItem('appliedMedical', appliedMedical ? '1' : '0');
  // Build card image after short delay (let DOM paint) — watermark shown by default
  var gcTierEl = document.getElementById('cardTierLabel');
  if(gcTierEl) gcTierEl.textContent = (data.tier === 'FAMILY') ? 'FAMILY MEMBER' : 'PRIMARY MEMBER';
  setTimeout(function(){ renderCardImage(data, data.tier || 'PRIMARY'); }, 100);
  // Load admin WhatsApp and inject verification block
  fetch('/api/admin/settings').then(function(r){return r.json();}).then(function(s){
    var waNum = (s.settings && s.settings.admin_whatsapp) ? s.settings.admin_whatsapp : '85291477341';
    var msgText = '你好，我剛登記了老有卡，會員編號：' + data.memberNo + '，請幫我確認。';
    var msgEnc = encodeURIComponent(msgText);
    // Build deep link URLs for direct WA app launch (bypass wa.me interstitial page)
    var phoneDigits = waNum.replace(/[^0-9]/g,'');
    // Use whatsapp:// on all mobile (works on both iOS and Android)
    // Desktop fallback: wa.me link
    var isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
    var waUrl = isMobile
      ? 'whatsapp://send?phone=' + phoneDigits + '&text=' + msgEnc
      : 'https://wa.me/' + phoneDigits + '?text=' + msgEnc;
    window._waUrl = waUrl;
    var block = document.getElementById('waVerifyBlock');
    var preview = document.getElementById('waVerifyMsgPreview');
    if(block) block.style.display = 'block';
    if(preview) preview.textContent = msgText;
  }).catch(function(){});

}

// ── Button 1: Normal WhatsApp — open WA, wait for user to return via visibilitychange/pageshow ──
function openWA() {
  if(!window._waUrl) return;
  if(window._waSent) return; // prevent double click
  window._waSent = true;
  var btn = document.getElementById('waVerifyBtn');
  var bizBtn = document.getElementById('waBizBtn');
  if(btn){ btn.disabled = true; btn.textContent = '📤 正在開啟 WhatsApp...'; btn.style.background = '#a5d6a7'; }
  if(bizBtn){ bizBtn.disabled = true; bizBtn.style.opacity = '0.4'; }
  // Save pending state so restore works if page fully reloads
  sessionStorage.setItem('waVerifyPending', '1');
  // Open WA deep link — user leaves page here
  window.location.href = window._waUrl;
  // visibilitychange: fires when user switches back (Android / desktop)
  document.addEventListener('visibilitychange', function onVis() {
    if(document.visibilityState === 'visible') {
      document.removeEventListener('visibilitychange', onVis);
      markWASent();
    }
  });
  // pageshow: fires on iOS bfcache restore when user returns from WA
  window.addEventListener('pageshow', function onPS(e) {
    window.removeEventListener('pageshow', onPS);
    markWASent();
  });
}

// Called when user returns to page after normal WA — watermark gone, verified_at set
function markWASent() {
  if(window._waSentDone) return;
  window._waSentDone = true;
  sessionStorage.removeItem('waVerifyPending');
  var wm = document.getElementById('pendingWatermark');
  var block = document.getElementById('waVerifyBlock');
  var banner = document.getElementById('verifiedBanner');
  if(wm) wm.style.display = 'none';
  if(block) block.style.display = 'none';
  if(banner) banner.style.display = 'block';
  var no = window._verifyMemberNo;
  if(no) fetch('/api/members/' + encodeURIComponent(no) + '/verify', {method:'POST'}).catch(function(){});
  // Show PWA install prompt immediately after WA click
  showInstallPrompt();
}

// ── Button 2: WA Business — fake 2.5s flow, records wa_clicked_at, hides watermark ──
function openWABiz() {
  if(window._waBizSent) return; // prevent double click
  window._waBizSent = true;
  var bizBtn = document.getElementById('waBizBtn');
  var waBtn = document.getElementById('waVerifyBtn');
  var sendingMsg = document.getElementById('waSendingMsg');
  if(bizBtn){ bizBtn.disabled = true; bizBtn.textContent = '📤 發送中...'; bizBtn.style.background = '#c8e6c9'; bizBtn.style.color = '#2E7D32'; }
  if(waBtn){ waBtn.disabled = true; waBtn.style.opacity = '0.4'; }
  if(sendingMsg) sendingMsg.style.display = 'block';
  // Record click in DB (fire and forget)
  var no = window._verifyMemberNo;
  if(no) fetch('/api/members/' + encodeURIComponent(no) + '/wa-click', {method:'POST'}).catch(function(){});
  // Show PWA install prompt immediately when WA Biz clicked
  showInstallPrompt();
  // 2.5s fake process then show complete
  setTimeout(markVerified, 2500);
}

// Called after WA Biz fake flow — hides watermark, shows verified banner
function markVerified() {
  if(window._verifyDone) return;
  window._verifyDone = true;
  var wm = document.getElementById('pendingWatermark');
  var block = document.getElementById('waVerifyBlock');
  var sendingMsg = document.getElementById('waSendingMsg');
  var banner = document.getElementById('verifiedBanner');
  if(wm) wm.style.display = 'none';
  if(block) block.style.display = 'none';
  if(sendingMsg) sendingMsg.style.display = 'none';
  if(banner) banner.style.display = 'block';
  // Do NOT call /verify — admin must manually confirm via admin panel
}

// ── PWA Install Prompt (shown after WA click) ──
function showInstallPrompt() {
  // Skip if already installed (standalone mode)
  if(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua);
  var isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  var isInApp = new RegExp('FBAN|FBAV|Instagram|WhatsApp|Line').test(ua);
  // Show a simple banner below the card
  var existing = document.getElementById('pwaInstallBanner');
  if(existing) return; // already shown
  var banner = document.createElement('div');
  banner.id = 'pwaInstallBanner';
  banner.style.cssText = 'margin:20px 0;background:#e8f5e9;border:2px solid #a5d6a7;border-radius:14px;padding:20px 18px;';
  var content = '';
  if(isInApp) {
    content = '<h3 style="font-size:20px;font-weight:900;color:#1a5c2a;margin-bottom:10px;">📱 將老有卡加落主畫面</h3>' +
      '<p style="font-size:16px;color:#333;margin-bottom:12px;">你而家係用 WhatsApp/FB 內置瀏覽器。請複製網址，喺 Safari 或 Chrome 開啟後加入主畫面。</p>' +
      '<button onclick="copyAppUrl()" style="display:block;width:100%;padding:14px;background:#228B22;color:#fff;border:none;border-radius:10px;font-size:18px;font-weight:900;cursor:pointer;">📋 複製老有卡網址</button>';
  } else if(isIOS && isSafari) {
    content = '<h3 style="font-size:20px;font-weight:900;color:#1a5c2a;margin-bottom:10px;">📱 將老有卡加落主畫面</h3>' +
      '<div style="background:#fff;border-radius:10px;padding:14px;">' +
      '<div style="display:flex;gap:10px;margin-bottom:8px;"><span style="background:#228B22;color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">1</span><span style="font-size:16px;">撳 Safari 下面嘅 <strong>「共享」掣</strong> 🔗</span></div>' +
      '<div style="display:flex;gap:10px;margin-bottom:8px;"><span style="background:#228B22;color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">2</span><span style="font-size:16px;">揀 <strong>「加至主畫面」</strong> ＋</span></div>' +
      '<div style="display:flex;gap:10px;"><span style="background:#228B22;color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">3</span><span style="font-size:16px;">撳右上角 <strong>「新增」</strong> 完成！</span></div>' +
      '</div>';
  } else {
    // Android Chrome (or other) — show install button; if beforeinstallprompt not yet fired, button will trigger it when ready
    content = '<h3 style="font-size:20px;font-weight:900;color:#1a5c2a;margin-bottom:10px;">📱 將老有卡加落主畫面</h3>' +
      '<p style="font-size:16px;color:#333;margin-bottom:12px;">安裝後可以喺主畫面直接開啟，唔使記住網址！</p>' +
      '<button id="pwaInstallBtn" onclick="doInstallApp()" style="display:block;width:100%;padding:14px;background:#228B22;color:#fff;border:none;border-radius:10px;font-size:18px;font-weight:900;cursor:pointer;">⬇️ 安裝到主畫面</button>' +
      '<div id="pwaInstallFallback" style="display:none;margin-top:12px;background:#fff;border-radius:8px;padding:12px;">' +
      '<p style="font-size:14px;color:#555;margin-bottom:8px;">喺 Chrome 選單（⋮）揀「加至主螢幕」即可安裝。</p>' +
      '<div style="font-size:14px;font-weight:700;color:#228B22;word-break:break-all;margin-bottom:8px;">' + location.origin + '/app</div>' +
      '<button onclick="copyAppUrl()" style="width:100%;padding:10px;background:#fff;color:#228B22;border:2px solid #228B22;border-radius:8px;font-size:15px;font-weight:900;cursor:pointer;">📋 複製網址</button>' +
      '</div>';
  }
  banner.innerHTML = content;
  // Insert after successSection or waVerifyBlock, whichever is visible
  var anchor = document.getElementById('verifiedBanner') || document.getElementById('waSentBanner') || document.getElementById('successSection');
  if(anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(banner, anchor.nextSibling);
  } else {
    document.body.appendChild(banner);
  }
  banner.scrollIntoView({behavior:'smooth', block:'center'});
  // If beforeinstallprompt arrives after banner is shown, update button state
  if(!isInApp && !isIOS) {
    window._installBannerPending = true;
  }
}
function copyAppUrl() {
  var url = location.origin + '/app';
  if(navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function(){ alert('已複製！請喺 Safari 或 Chrome 開啟：' + url); });
  } else { prompt('請複製以下網址：', url); }
}
function doInstallApp() {
  if(window._deferredInstallPrompt) {
    window._deferredInstallPrompt.prompt();
    window._deferredInstallPrompt.userChoice.then(function(r) {
      window._deferredInstallPrompt = null;
      var b = document.getElementById('pwaInstallBanner');
      if(b && r.outcome === 'accepted') b.style.display = 'none';
    });
  } else {
    // Prompt not ready — show fallback instructions
    var fb = document.getElementById('pwaInstallFallback');
    if(fb) fb.style.display = '';
    var btn = document.getElementById('pwaInstallBtn');
    if(btn) btn.style.display = 'none';
  }
}

// ── Draw member card onto an off-screen canvas — design-matched ───────────────
function renderCardImage(data, tier) {
  var logoImg = new Image();
  logoImg.onload = function() {
  // Canvas: 1360×860 @2x (displays as 680×430, credit-card ratio)
  var W=1360, H=860;
  var canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  var ctx=canvas.getContext('2d');
  var isPrimary=(tier!=='FAMILY');
  var forestDeep='#0d3e12',forest='#2E7D32',forestPale='#E8F5E9';
  var ferrari='#C62828',ferrariDeep='#8B0000',ferrariPale='#FFEBEE';
  var accentDark=isPrimary?forestDeep:ferrariDeep;
  var accentMid=isPrimary?forest:ferrari;
  var qrDark=isPrimary?forestDeep:'#a80000';
  // ── Background gradient
  var bg=ctx.createLinearGradient(0,0,W,H);
  if(isPrimary){bg.addColorStop(0,'#FDFAF3');bg.addColorStop(1,'#F0EBD8');}
  else{bg.addColorStop(0,'#FFF8F8');bg.addColorStop(1,'#FFE8E8');}
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // ── Watermark "85" — centred-right, large, faint — Montserrat Bold
  ctx.save(); ctx.globalAlpha=0.07; ctx.fillStyle=accentDark;
  ctx.font='bold 700px "Montserrat",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('85',W*0.72,H*0.56); ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.restore();
  // ── Top colour stripe (green left | red right)
  var stripeH=16;
  ctx.fillStyle=forest; ctx.fillRect(0,0,W*0.45,stripeH);
  ctx.fillStyle=ferrari; ctx.fillRect(W*0.45,0,W*0.55,stripeH);
  // ── Logo (top-left) — no divider line below
  var logoX=40,logoY=stripeH+20,logoW=330,logoH=132;
  ctx.drawImage(logoImg,logoX,logoY,logoW,logoH);
  // Vertical divider after logo
  ctx.strokeStyle=accentDark; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(logoX+logoW+24,logoY+10); ctx.lineTo(logoX+logoW+24,logoY+logoH-10); ctx.stroke();
  // Card type label (老有卡 / 家庭同行)
  var cardNameX=logoX+logoW+44;
  ctx.fillStyle=accentDark;
  if(isPrimary){ctx.font='bold 51px "Noto Serif TC",serif';ctx.fillText('老有卡',cardNameX,logoY+logoH/2+18);}
  else{ctx.font='bold 42px "Noto Serif TC",serif';ctx.fillText('老有卡',cardNameX,logoY+logoH/2-9);ctx.fillText('家庭同行',cardNameX,logoY+logoH/2+44);}
  // ── Badge (top-right)
  var badgeW=462,badgeH=75,badgeX=W-badgeW-48,badgeY=stripeH+26;
  ctx.fillStyle=isPrimary?forestPale:ferrariPale; ctx.strokeStyle=accentMid; ctx.lineWidth=3;
  ctx.beginPath(); roundRect(ctx,badgeX,badgeY,badgeW,badgeH,8); ctx.fill(); ctx.stroke();
  ctx.fillStyle=ferrari; ctx.font='bold 29px sans-serif'; ctx.fillText('◆',badgeX+18,badgeY+50);
  ctx.fillStyle=accentDark; ctx.font='bold 35px "Noto Serif TC",serif'; ctx.fillText('CoExplorery 探索者',badgeX+54,badgeY+50);
  // Tier label (right-aligned, below badge)
  ctx.fillStyle=ferrari; ctx.font='bold 33px "Noto Serif TC",serif'; ctx.textAlign='right';
  ctx.fillText(isPrimary?'主卡 · PRIMARY':'附屬 · FAMILY',W-48,badgeY+badgeH+42); ctx.textAlign='left';
  // ── Name area — pushed up, starting right after header zone
  var nameAreaY=stripeH+340;
  ctx.fillStyle='#999'; ctx.font='26px "Noto Serif TC",serif';
  var lbl='會員姓名',lx=48;
  for(var i=0;i<lbl.length;i++){ctx.fillText(lbl[i],lx,nameAreaY);lx+=ctx.measureText(lbl[i]).width+10;}
  ctx.fillStyle=accentDark;
  var zh=data.nameZh||'';
  var zhSz=zh.length<=2?200:zh.length<=3?178:zh.length<=4?148:112;
  ctx.font='bold '+zhSz+'px "Noto Serif TC",serif'; ctx.fillText(zh,48,nameAreaY+zhSz+10);
  var enY=nameAreaY+zhSz+10;
  if(data.nameEn&&data.nameEn.trim()){
    ctx.fillStyle=accentDark; ctx.font='bold 46px "Noto Serif TC",serif'; enY+=60;
    ctx.fillText(data.nameEn.trim(),48,enY);
  }
  if(!isPrimary&&data.parentNo){
    ctx.fillStyle=ferrari; ctx.font='26px "Noto Serif TC",serif';
    ctx.fillText('◆ 綁定主卡：'+data.parentNo+(data.parentName?' （'+data.parentName+'）':''),48,enY+48);
  }
  // ── QR code — bottom-right corner, pixel-perfect fill (no white gap)
  var footY=H-36;
  var qrSz=192,qrX=W-qrSz-40,qrY2=H-qrSz-40;
  ctx.fillStyle='#fff'; ctx.fillRect(qrX-8,qrY2-8,qrSz+16,qrSz+16);
  ctx.strokeStyle=accentMid; ctx.lineWidth=4; ctx.strokeRect(qrX-8,qrY2-8,qrSz+16,qrSz+16);
  try{
    var qr=qrcode(0,'M');
    qr.addData(location.origin+'/membership/card/'+(data.memberNo||''));
    qr.make();
    var mc=qr.getModuleCount();
    // Use exact cell size so modules fill entire qrSz — no fractional gap
    var cell=qrSz/mc;
    ctx.fillStyle=qrDark;
    for(var row=0;row<mc;row++){for(var col=0;col<mc;col++){
      if(qr.isDark(row,col)) ctx.fillRect(qrX+col*cell,qrY2+row*cell,cell,cell);
    }}
  }catch(e){console.warn('QR err',e);}
  // ── Footer — no background box, clean transparent
  ctx.fillStyle='#aaa'; ctx.font='28px "Noto Serif TC",serif'; ctx.fillText('會員編號',48,footY-72);
  ctx.fillStyle=accentDark; ctx.font='bold 56px "Space Grotesk",monospace'; ctx.fillText(data.memberNo||'',48,footY-8);
  if(data.expiresAt){
    var expStr=data.expiresAt.slice(0,7).replace('-','/');
    var expDisp=expStr.slice(5)+' / '+expStr.slice(0,4);
    ctx.fillStyle='#aaa'; ctx.font='28px "Noto Serif TC",serif'; ctx.fillText('有效期至',560,footY-72);
    ctx.fillStyle=accentDark; ctx.font='bold 56px "Space Grotesk",monospace'; ctx.fillText(expDisp,560,footY-8);
  }
  // ── Convert → JPEG blob
  canvas.toBlob(function(blob){
    if(!blob)return;
    window._cardBlob=blob; window._cardFileName='CoEldery85_'+(data.memberNo||'card')+'.jpg';
    var url=URL.createObjectURL(blob);
    var img=document.getElementById('cardImg'); if(img)img.src=url;
    var wrap=document.getElementById('cardImgWrap'); if(wrap)wrap.style.display='block';
    var cssCard=document.getElementById('genCard'); if(cssCard)cssCard.style.display='none';
  },'image/jpeg',0.95);
  }; // end logoImg.onload
  logoImg.src = '/static/logo.png';
}

// Helper: rounded rectangle path
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w,y,   x+w,y+r,   r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w,y+h, x+w-r,y+h, r);
  ctx.lineTo(x+r, y+h);   ctx.arcTo(x,y+h,   x,y+h-r,   r);
  ctx.lineTo(x, y+r);     ctx.arcTo(x,y,     x+r,y,     r);
  ctx.closePath();
}
function saveCardImage() {
  if(!window._cardBlob){ alert('圖片未準備好，請稍候再試'); return; }
  var a = document.createElement('a');
  a.href = URL.createObjectURL(window._cardBlob);
  a.download = window._cardFileName || 'coeldery85-card.jpg';
  a.click();
}

async function shareCardToWA() {
  if(!window._cardBlob){ alert('圖片未準備好，請稍候再試'); return; }
  var file = new File([window._cardBlob], window._cardFileName||'coeldery85-card.jpg', {type:'image/jpeg'});
  if(navigator.canShare && navigator.canShare({files:[file]})) {
    try {
      await navigator.share({
        files:[file],
        title:'CoEldery 85 老有卡',
        text:'我已成功登記 CoEldery 85 老有聯盟會員！'
      });
      return;
    } catch(e){ if(e.name!=='AbortError') console.warn('share error',e); }
  }
  // Fallback: download the image
  saveCardImage();
  alert('請在相簿選取剛下載的會員卡圖片，貼入 WhatsApp 傳送。');
}
</script>
</body></html>`
}


// ─── Signup Sub HTML ──────────────────────────────────────────────────────────
function signupSubHtml() {
  return htmlHead('申請家庭同行卡', `<style>
body{background:#F0EBD8;min-height:100vh;padding:20px 16px;font-size:20px;line-height:1.6;}
.container{max-width:420px;margin:0 auto;}
.brand-strip{display:flex;align-items:center;gap:12px;margin-bottom:24px;}
.brand-strip .mark{width:44px;height:44px;background:var(--ferrari-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Noto Serif TC",serif;font-weight:900;font-size:18px;border-radius:6px;}
.brand-strip .name .zh{font-family:"Noto Serif TC",serif;font-size:20px;color:var(--ferrari-deep);font-weight:700;letter-spacing:2px;line-height:1;}
.brand-strip .name .en{font-size:18px;color:var(--grey-2);letter-spacing:2px;margin-top:4px;}
.header-card{background:linear-gradient(135deg,var(--ferrari-deep) 0%,var(--ferrari) 100%);color:#fff;padding:24px 22px;border-radius:4px;margin-bottom:20px;position:relative;overflow:hidden;}
.header-card::before{content:"家";position:absolute;right:-10px;bottom:-40px;font-family:"Noto Serif TC",serif;font-size:180px;font-weight:900;color:rgba(255,255,255,0.1);line-height:1;}
.header-card .tag{display:inline-block;background:rgba(255,255,255,0.2);color:#fff;padding:3px 10px;font-size:18px;letter-spacing:3px;font-weight:700;margin-bottom:12px;position:relative;z-index:2;}
.header-card h1{font-family:"Noto Serif TC",serif;font-size:28px;font-weight:900;letter-spacing:3px;line-height:1.2;margin-bottom:8px;position:relative;z-index:2;}
.header-card p{font-size:20px;opacity:0.9;line-height:1.6;position:relative;z-index:2;}
.form-card{background:#fff;padding:24px 22px;border-radius:4px;margin-bottom:16px;}
.field{margin-bottom:18px;}
.field .label-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.field label{font-family:"Noto Serif TC",serif;font-size:22px;color:var(--ferrari-deep);font-weight:700;letter-spacing:1px;}
.field .req{color:var(--ferrari);font-size:18px;font-weight:700;}
.field input,.field select{width:100%;padding:14px;border:2px solid var(--line);border-radius:4px;font-size:20px;font-family:inherit;color:var(--ink);background:#fff;transition:border 0.2s;min-height:55px;}
.field input:focus,.field select:focus{outline:0;border-color:var(--ferrari);}
.field .hint{font-size:18px;color:var(--grey-3);margin-top:4px;line-height:1.5;}
.consent{padding:14px;background:var(--ferrari-pale);border-radius:4px;font-size:18px;color:var(--grey-1);line-height:1.7;margin-bottom:20px;}
.consent label{display:flex;gap:10px;cursor:pointer;}
.consent input{width:20px;height:20px;margin-top:2px;flex-shrink:0;accent-color:var(--ferrari);}
.submit-btn{width:100%;padding:18px;background:var(--ferrari);color:#fff;border:0;border-radius:4px;font-size:18px;font-family:"Noto Serif TC",sans-serif;font-weight:700;letter-spacing:4px;cursor:pointer;box-shadow:0 4px 0 var(--ferrari-deep);transition:all 0.1s;}
.submit-btn:disabled{background:var(--grey-3);box-shadow:0 4px 0 var(--grey-2);cursor:not-allowed;}
.footer-links{text-align:center;margin-top:20px;font-size:18px;color:var(--grey-3);line-height:1.8;}
.footer-links a{color:var(--ferrari);text-decoration:none;}
.success{display:none;text-align:center;}
.success.show{display:block;}
.success-icon{width:80px;height:80px;background:var(--ferrari);color:#fff;border-radius:50%;margin:20px auto 24px;display:flex;align-items:center;justify-content:center;font-size:44px;animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1);}
@keyframes pop{0%{transform:scale(0);}100%{transform:scale(1);}}
.success h1{font-family:"Noto Serif TC",serif;font-size:28px;color:var(--ferrari-deep);margin-bottom:6px;letter-spacing:3px;}
.gen-card{width:340px;height:232px;margin:0 auto 20px;background:linear-gradient(150deg,#FFF5F5 0%,#FFE8E8 100%);border:1px solid #F5C6C6;border-radius:12px;position:relative;overflow:hidden;color:var(--ferrari-deep);box-shadow:0 12px 30px rgba(0,0,0,0.18);text-align:left;}
.gen-card::before{content:"";position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,var(--ferrari) 0%,var(--ferrari-deep) 100%);}
.gc-brand{position:absolute;top:16px;left:18px;display:flex;align-items:center;gap:8px;}
.gc-cardname{font-family:"Noto Serif TC",serif;font-size:13px;color:var(--ferrari-deep);letter-spacing:2px;font-weight:900;border-left:2px solid var(--ferrari);padding-left:8px;line-height:1.2;}
.gc-family-badge{position:absolute;top:16px;right:18px;background:var(--ferrari-pale);border:1px solid var(--ferrari);padding:4px 9px;font-family:"Noto Serif TC",serif;font-size:11px;color:var(--ferrari-deep);letter-spacing:1.5px;font-weight:700;border-radius:2px;}
.gc-name-block{position:absolute;left:18px;right:18px;bottom:62px;}
.gc-prefix{font-family:"Noto Serif TC",serif;font-size:12px;color:var(--grey-2);letter-spacing:4px;margin-bottom:8px;font-weight:500;}
.gc-zh{font-family:"Noto Serif TC",serif;font-size:44px;font-weight:900;color:var(--ferrari-deep);letter-spacing:5px;line-height:1;}
.gc-en{font-family:"Noto Serif TC",serif;font-size:15px;font-weight:700;color:var(--ferrari-deep);letter-spacing:2px;margin-top:8px;display:block;line-height:1.2;}
.gc-footer{position:absolute;bottom:16px;left:18px;right:18px;display:flex;justify-content:space-between;align-items:flex-end;}
.gc-num{font-family:"Space Grotesk",monospace;font-size:17px;color:var(--ferrari-deep);letter-spacing:1.5px;font-weight:700;}
.gc-num .k{font-family:"Noto Serif TC",serif;font-size:10px;color:var(--grey-2);letter-spacing:2.5px;margin-bottom:4px;display:block;font-weight:500;}
.gc-qr{width:46px;height:46px;background:#fff;padding:3px;border:1.5px solid var(--ferrari);border-radius:3px;flex-shrink:0;}
.gc-qr canvas{width:100%;height:100%;}
.wa-link{display:block;width:100%;padding:16px;background:var(--ferrari);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:12px;min-height:55px;}
.err-msg{background:var(--ferrari-pale);border:1px solid var(--ferrari);color:var(--ferrari-deep);padding:12px 16px;border-radius:4px;font-size:20px;font-weight:700;margin-bottom:16px;display:none;}
.err-msg.show{display:block;}
</style>`) + `
<body>
<div class="container">
  <div style="margin-bottom:12px;">
    <button type="button" onclick="history.length>1?history.back():window.location.href='/membership/join'" style="display:inline-flex;align-items:center;gap:6px;padding:14px 20px;min-height:55px;background:#fff;border:2px solid var(--ferrari);color:var(--ferrari-deep);font-family:'Noto Serif TC',serif;font-size:20px;font-weight:700;border-radius:6px;cursor:pointer;letter-spacing:1px;">← 返回</button>
  </div>
  <div class="brand-strip">
    <div class="mark">家</div>
    <div class="name">
      <div class="zh">CoEldery 85 家庭同行卡</div>
      <div class="en">FAMILY COMPANION CARD</div>
    </div>
  </div>

  <div id="formSection">
    <div class="header-card">
      <div class="tag">◆ 家庭同行</div>
      <h1>老有卡<br>家庭同行</h1>
      <p>支援屋企長輩的家人 · 消費即支持長者<br>須有主卡會員方可申請附屬卡</p>
    </div>

    <div class="err-msg" id="errMsg"></div>

    <form id="signupForm" onsubmit="return false;">
      <div class="form-card">
        <div class="field">
          <div class="label-row"><label for="nameZh">姓名／稱呼</label><span class="req">✽ 必填</span></div>
          <input id="nameZh" type="text" placeholder="填佢嘅名或稱呼（中英文都得）">
        </div>
        <div class="field">
          <div class="label-row"><label for="phone">你的 WhatsApp 電話</label><span class="req">✽ 必填</span></div>
          <input id="phone" type="tel" placeholder="例：91234567" inputmode="numeric" maxlength="8">
        </div>
        <div class="field">
          <div class="label-row"><label for="birthYear">出生年份</label><span class="req">✽ 必填</span></div>
          <select id="birthYear">
            <option value="">— 請選擇 —</option>
            ${(()=>{const opts=[];for(let y=2010;y>=1930;y--){opts.push(`<option value="${y}">${y}</option>`);}return opts.join('');})()}
          </select>
          <div class="hint">出生年份 ≤ 1971（55歲或以上）將自動升為主卡級別</div>
        </div>
        <div class="field">
          <div class="label-row"><label>性別</label><span class="req">✽ 必填</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button type="button" class="g-btn" id="gBtnM" data-v="M" onclick="setFamilyGender('M',this)">男 M</button>
            <button type="button" class="g-btn" id="gBtnF" data-v="F" onclick="setFamilyGender('F',this)">女 F</button>
          </div>
        </div>
        <div class="field" id="parentPhoneField">
          <div class="label-row"><label for="parentPhone">長輩的 WhatsApp 電話</label><span class="req">✽ 必填</span></div>
          <input id="parentPhone" type="tel" placeholder="長輩已登記的電話" inputmode="numeric" maxlength="8">
          <div class="hint">長輩需先持有主卡，才可申請家庭同行卡</div>
        </div>
        <div class="field" id="parentLinkedField" style="display:none;">
          <div class="label-row"><label>已連結主卡</label></div>
          <div id="parentLinkedInfo" style="padding:12px 14px;background:#f0f7f0;border:2px solid #4caf50;border-radius:4px;font-size:18px;font-weight:700;color:#2e7d32;">✅ 已連結</div>
          <div class="hint">長輩的電話已自動填入，無需再輸入</div>
        </div>
        <div class="field">
          <div class="label-row"><label for="relation">你與長輩的關係</label><span style="color:var(--grey-3);font-size:18px;">選填</span></div>
          <select id="relation">
            <option value="">— 請選擇 —</option>
            <option>子女</option><option>配偶</option><option>孫</option>
            <option>外孫</option><option>兄弟姊妹</option><option>其他</option>
          </select>
        </div>
      </div>

      <div class="consent">
        <label>
          <input type="checkbox" id="consent" required>
          <span>本人同意 85 AI Technology Limited 根據私隱政策收集及使用以上個人資料，用於家庭同行卡登記。</span>
        </label>
      </div>

      <button type="button" class="submit-btn" id="submitBtn" onclick="submitForm()">
        申請家庭同行卡
      </button>

      <div class="footer-links">
        <a href="/membership/join">← 我係長者，申請主卡</a>
      </div>
    </form>
    <input type="hidden" id="linkedParentNo" value="">
  </div>

  <div class="success" id="successSection">
    <div class="success-icon">✓</div>
    <h1>申請成功！</h1>
    <p style="font-size:18px;color:var(--grey-2);margin-bottom:24px;">家庭同行卡已發出</p>

    <!-- Live CSS card (hidden after image renders) -->
    <div class="gen-card" id="genCard">
      <div class="gc-brand"><div class="gc-cardname">老有卡 家庭同行</div></div>
      <div class="gc-family-badge">FAMILY</div>
      <div class="gc-name-block">
        <div class="gc-prefix">MEMBER NAME · 姓名</div>
        <div class="gc-zh" id="cardZh"></div>
        <div class="gc-en" id="cardEn"></div>
      </div>
      <div class="gc-footer">
        <div class="gc-num"><span class="k">MEMBER NO.</span><span id="cardNo"></span></div>
        <div class="gc-qr"><canvas id="cardQr"></canvas></div>
      </div>
    </div>

    <!-- Rendered JPEG preview — with pending watermark overlay -->
    <div id="cardImgWrap" style="display:none;margin:0 auto 0;max-width:340px;position:relative;">
      <img id="cardImg" style="width:100%;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.18);" alt="家庭同行卡">
      <!-- Pending verification watermark overlay -->
      <div id="pendingWatermark" style="position:absolute;inset:0;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.38);pointer-events:none;">
        <div style="color:#fff;font-size:18px;font-weight:900;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.7);background:rgba(0,0,0,0.45);padding:8px 18px;border-radius:6px;border:2px solid rgba(255,255,255,0.6);">⏳ 待驗證</div>
        <div style="color:#ffe082;font-size:18px;font-weight:700;margin-top:6px;text-shadow:0 1px 4px rgba(0,0,0,0.8);">點擊下方按鈕完成驗證</div>
      </div>
    </div>

    <!-- WA Verification block — shown directly below card -->
    <div id="waVerifyBlock" style="display:none;margin:10px 0 14px;background:#f0faf3;border:1.5px solid #25D366;border-radius:8px;padding:14px;">
      <div style="font-size:20px;font-weight:700;color:#1a5c2a;margin-bottom:10px;text-align:center;">📲 發 WhatsApp 完成身份驗證</div>
      <div id="waVerifyMsgPreview" style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:9px 11px;font-size:18px;color:#333;margin-bottom:12px;line-height:1.6;"></div>
      <!-- Button 1: Normal WhatsApp — real flow -->
      <button id="waVerifyBtn" onclick="openWA()"
        style="display:block;width:100%;box-sizing:border-box;background:#25D366;color:#fff;font-size:20px;font-weight:700;padding:16px 8px;border-radius:8px;border:none;cursor:pointer;text-align:center;margin-bottom:8px;min-height:55px;">
        💬 我有 WhatsApp — 發送驗證訊息
      </button>
      <!-- Button 2: WA Business — fake 2.5s flow -->
      <button id="waBizBtn" onclick="openWABiz()"
        style="display:block;width:100%;box-sizing:border-box;background:#fff;color:#1a5c2a;font-size:18px;font-weight:700;padding:14px 8px;border-radius:8px;border:1.5px solid #25D366;cursor:pointer;text-align:center;min-height:55px;">
        📱 我用 WhatsApp Business
      </button>
      <div id="waSendingMsg" style="display:none;text-align:center;margin-top:10px;font-size:18px;color:#388E3C;font-weight:600;">📤 正在提交驗證...</div>
    </div>

    <!-- Banner A: normal WA sent — watermark stays -->
    <div id="waSentBanner" style="display:none;margin:0 0 14px;background:#e8f5e9;border:1.5px solid #4caf50;border-radius:8px;padding:12px 14px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#2E7D32;">📤 驗證訊息已發出！</div>
      <div style="font-size:18px;color:#388E3C;margin-top:4px;">請在 WhatsApp 中發送訊息給我們，Admin 確認後會籍即生效。</div>
    </div>
    <!-- Banner B: WA Biz fake complete — watermark hidden -->
    <div id="verifiedBanner" style="display:none;margin:0 0 14px;background:#e8f5e9;border:1.5px solid #4caf50;border-radius:8px;padding:12px 14px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#2E7D32;">✅ 驗證訊息已發送！</div>
      <div style="font-size:18px;color:#388E3C;margin-top:4px;">Admin 收到後將確認你的會籍，感謝你！</div>
    </div>

    <div class="action-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <button class="action-btn" style="padding:14px 8px;background:#fff;border:2px solid var(--ferrari);color:var(--ferrari-deep);font-family:'Noto Serif TC',serif;font-size:20px;font-weight:700;cursor:pointer;border-radius:4px;min-height:55px;" onclick="saveCardImage()">💾 儲存卡圖</button>
      <button class="action-btn" style="padding:14px 8px;background:#fff;border:2px solid var(--ferrari);color:var(--ferrari-deep);font-family:'Noto Serif TC',serif;font-size:20px;font-weight:700;cursor:pointer;border-radius:4px;min-height:55px;" onclick="window.location.href='/membership/join'">← 返回主卡</button>
    </div>

    <button class="wa-link" onclick="shareCardToWA()" style="width:100%;border:0;cursor:pointer;">📱 WhatsApp 分享會員卡圖片</button>

    <div class="footer-links">
      <a id="mySubPageLink" href="#" style="color:var(--ferrari-deep);font-weight:700;display:none;">🪪 查看我的會員頁</a>
      <span id="mySubPageSep" style="display:none;"> &middot; </span>
      <a href="/membership/join">← 返回主卡登記</a>
    </div>
  </div>
</div>

<script>
// ── PWA install prompt storage ──
window._deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  window._deferredInstallPrompt = e;
  // If install banner is already showing (user already clicked WA), activate install button
  if(window._installBannerPending) {
    window._installBannerPending = false;
    var btn = document.getElementById('pwaInstallBtn');
    var fb = document.getElementById('pwaInstallFallback');
    if(btn) { btn.style.display = ''; }
    if(fb) { fb.style.display = 'none'; }
  }
});
// Auto-fill parent info from ?parent=CE85-XXXXXX URL param
(function(){
  var params = new URLSearchParams(location.search);
  var parentMemberNo = params.get('parent');
  if (!parentMemberNo) return;
  fetch('/api/members/' + encodeURIComponent(parentMemberNo))
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (!d.ok || !d.member) return;
      var m = d.member;
      document.getElementById('linkedParentNo').value = m.member_no;
      document.getElementById('parentLinkedInfo').textContent = '✅ ' + m.name_zh + '　' + m.member_no + (m.phone ? '　📱 ' + m.phone : '');
      document.getElementById('parentPhoneField').style.display = 'none';
      document.getElementById('parentLinkedField').style.display = 'block';
      // Auto-fill primary member's phone into parentPhone field
      if (m.phone) {
        var parentPhoneInput = document.getElementById('parentPhone');
        if (parentPhoneInput) parentPhoneInput.value = m.phone;
      }
    })
    .catch(function(e){ console.warn('parent lookup failed', e); });
})();

var _familyGender='';
function setFamilyGender(v,btn){
  _familyGender=v;
  document.querySelectorAll('#signupForm .g-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
}
function showErr(msg){var el=document.getElementById('errMsg');el.textContent=msg;el.classList.add('show');el.scrollIntoView({behavior:'smooth'});}
function validateHKPhone(p){
  if(p.length!==8)return '請填寫正確的 8 位香港電話號碼';
  if(!/^[2-9]/.test(p))return '電話號碼格式不正確（香港號碼以 2–9 開頭，1 除外）';
  if(new Set(p.split('')).size===1)return '請填寫真實的電話號碼';
  if(p==='12345678'||p==='87654321'||p==='11223344')return '請填寫真實的電話號碼';
  return null;
}
async function submitForm(){
  document.getElementById('errMsg').classList.remove('show');
  var nameZh=document.getElementById('nameZh').value.trim();
  var phone=document.getElementById('phone').value.replace(/[^0-9]/g,'');
  var birthYear=document.getElementById('birthYear').value;
  var linkedParentNo=document.getElementById('linkedParentNo').value.trim();
  var parentPhone=document.getElementById('parentPhone').value.replace(/[^0-9]/g,'');
  if(!nameZh){showErr('請填寫姓名／稱呼');return;}
  if(!birthYear){showErr('請選擇出生年份');return;}
  if(!_familyGender){showErr('請選擇性別');return;}
  var phoneErr=validateHKPhone(phone);
  if(phoneErr){showErr(phoneErr);return;}
  if(!linkedParentNo){var ppErr=validateHKPhone(parentPhone);if(ppErr){showErr('長輩電話：'+ppErr);return;}}
  if(!document.getElementById('consent').checked){showErr('請同意私隱政策');return;}
  var btn=document.getElementById('submitBtn');
  btn.disabled=true;btn.textContent='處理中…';
  var params=new URLSearchParams(location.search);
  var payload={tier:'FAMILY',nameZh,phone,birthYear:birthYear,gender:_familyGender,relation:document.getElementById('relation').value,roadshow:params.get('rs')||'walk-in',source:params.get('src')||(params.get('rs')?'roadshow':params.get('ref')?'referral':'walk-in'),referrerNo:params.get('ref')||'',roadshowLocation:params.get('loc')||''};
  if(linkedParentNo){payload.parentNo=linkedParentNo;}else{payload.parentPhone=parentPhone;}
  try{
    var res=await fetch('/api/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var data=await res.json();
    if(!data.ok){showErr(data.error||'申請失敗，請再試一次');btn.disabled=false;btn.textContent='申請家庭同行卡';return;}
    document.getElementById('formSection').style.display='none';
    document.getElementById('cardZh').textContent=data.nameZh;
    document.getElementById('cardEn').textContent=data.nameEn||'';
    document.getElementById('cardNo').textContent=data.memberNo;
    var cardUrl=location.origin+'/membership/card/'+data.memberNo;
    try{QRCode.toCanvas(document.getElementById('cardQr'),cardUrl,{width:40,margin:0,color:{dark:'#a80000',light:'#ffffff'},errorCorrectionLevel:'H'});}catch(e){console.warn('QR error (non-fatal):',e);}
    document.getElementById('successSection').classList.add('show');
    window.scrollTo(0,0);
    var mySubLink=document.getElementById('mySubPageLink');
    var mySubSep=document.getElementById('mySubPageSep');
    if(mySubLink){mySubLink.href='/membership/card/'+data.memberNo;mySubLink.style.display='inline';}
    if(mySubSep){mySubSep.style.display='inline';}
    setTimeout(function(){renderCardImage(data, data.tier||'FAMILY');},100);
    // Store member no for verify
    window._verifyMemberNo=data.memberNo;
    // Save to sessionStorage so WA redirect + return can restore this page
    sessionStorage.setItem('successData', JSON.stringify(data));
    sessionStorage.setItem('successTier', data.tier||'FAMILY');
    // Load admin WhatsApp and inject verification block
    fetch('/api/admin/settings').then(function(r){return r.json();}).then(function(s){
      var waNum=(s.settings&&s.settings.admin_whatsapp)?s.settings.admin_whatsapp:'85291477341';
      var msgText='你好，我剛登記了老有卡家庭同行卡，會員編號：'+data.memberNo+'，請幫我確認。';
      var msgEnc=encodeURIComponent(msgText);
      var phoneDigits=waNum.replace(/[^0-9]/g,'');
      var isMobile=/iphone|ipad|ipod|android/i.test(navigator.userAgent);
      var waUrl=isMobile
        ?'whatsapp://send?phone='+phoneDigits+'&text='+msgEnc
        :'https://wa.me/'+phoneDigits+'?text='+msgEnc;
      window._waUrl=waUrl;
      var block=document.getElementById('waVerifyBlock');
      var preview=document.getElementById('waVerifyMsgPreview');
      if(block)block.style.display='block';
      if(preview)preview.textContent=msgText;
    }).catch(function(){});
  }catch(e){showErr('網絡錯誤，請再試一次');btn.disabled=false;btn.textContent='申請家庭同行卡';}
}

// ── Button 1: Normal WhatsApp — open WA, visibilitychange/pageshow triggers markWASent on return ──
function openWA(){
  if(!window._waUrl)return;
  if(window._waSent)return;
  window._waSent=true;
  var btn=document.getElementById('waVerifyBtn');
  var bizBtn=document.getElementById('waBizBtn');
  if(btn){btn.disabled=true;btn.textContent='📤 正在開啟 WhatsApp...';btn.style.background='#a5d6a7';}
  if(bizBtn){bizBtn.disabled=true;bizBtn.style.opacity='0.4';}
  sessionStorage.setItem('waVerifyPending','1');
  window.location.href=window._waUrl;
  document.addEventListener('visibilitychange',function onVis(){
    if(document.visibilityState==='visible'){
      document.removeEventListener('visibilitychange',onVis);
      markWASent();
    }
  });
  window.addEventListener('pageshow',function onPS(){
    window.removeEventListener('pageshow',onPS);
    markWASent();
  });
}

// Called when user returns after normal WA — watermark gone, verified_at set
function markWASent(){
  if(window._waSentDone)return;
  window._waSentDone=true;
  sessionStorage.removeItem('waVerifyPending');
  var wm=document.getElementById('pendingWatermark');
  var block=document.getElementById('waVerifyBlock');
  var banner=document.getElementById('verifiedBanner');
  if(wm)wm.style.display='none';
  if(block)block.style.display='none';
  if(banner)banner.style.display='block';
  var no=window._verifyMemberNo;
  if(no)fetch('/api/members/'+encodeURIComponent(no)+'/verify',{method:'POST'}).catch(function(){});
  // Show PWA install prompt immediately after WA click
  showInstallPrompt();
}

// ── Button 2: WA Business — fake 2.5s flow, records wa_clicked_at, hides watermark ──
function openWABiz(){
  if(window._waBizSent)return;
  window._waBizSent=true;
  var bizBtn=document.getElementById('waBizBtn');
  var waBtn=document.getElementById('waVerifyBtn');
  var sendingMsg=document.getElementById('waSendingMsg');
  if(bizBtn){bizBtn.disabled=true;bizBtn.textContent='📤 發送中...';bizBtn.style.background='#c8e6c9';bizBtn.style.color='#2E7D32';}
  if(waBtn){waBtn.disabled=true;waBtn.style.opacity='0.4';}
  if(sendingMsg)sendingMsg.style.display='block';
  var no=window._verifyMemberNo;
  if(no)fetch('/api/members/'+encodeURIComponent(no)+'/wa-click',{method:'POST'}).catch(function(){});
  // Show PWA install prompt immediately on WA Biz click
  showInstallPrompt();
  setTimeout(markVerified,2500);
}

// Called after WA Biz fake flow — hides watermark, shows verified banner
function markVerified(){
  if(window._verifyDone)return;
  window._verifyDone=true;
  var wm=document.getElementById('pendingWatermark');
  var block=document.getElementById('waVerifyBlock');
  var sendingMsg=document.getElementById('waSendingMsg');
  var banner=document.getElementById('verifiedBanner');
  if(wm)wm.style.display='none';
  if(block)block.style.display='none';
  if(sendingMsg)sendingMsg.style.display='none';
  if(banner)banner.style.display='block';
  // Do NOT call /verify — admin must manually confirm via admin panel
}

// ── PWA Install Prompt (shown after WA click on join-family page) ──
function showInstallPrompt() {
  if(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua);
  var isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  var isInApp = new RegExp('FBAN|FBAV|Instagram|WhatsApp|Line').test(ua);
  var existing = document.getElementById('pwaInstallBanner');
  if(existing) return;
  var banner = document.createElement('div');
  banner.id = 'pwaInstallBanner';
  banner.style.cssText = 'margin:20px 0;background:#e8f5e9;border:2px solid #a5d6a7;border-radius:14px;padding:20px 18px;';
  var content = '';
  if(isInApp) {
    content = '<h3 style="font-size:20px;font-weight:900;color:#1a5c2a;margin-bottom:10px;">\ud83d\udcf1 \u5c07\u8001\u6709\u5361\u52a0\u843d\u4e3b\u756b\u9762</h3><p style="font-size:16px;color:#333;margin-bottom:12px;">\u8acb\u8907\u88fd\u7db2\u5740\uff0c\u55ba Safari \u6216 Chrome \u958b\u555f\u5f8c\u52a0\u5165\u4e3b\u756b\u9762\u3002</p><button onclick="copyAppUrl()" style="display:block;width:100%;padding:14px;background:#228B22;color:#fff;border:none;border-radius:10px;font-size:18px;font-weight:900;cursor:pointer;">\ud83d\udccb \u8907\u88fd\u8001\u6709\u5361\u7db2\u5740</button>';
  } else if(isIOS && isSafari) {
    content = '<h3 style="font-size:20px;font-weight:900;color:#1a5c2a;margin-bottom:10px;">\ud83d\udcf1 \u5c07\u8001\u6709\u5361\u52a0\u843d\u4e3b\u756b\u9762</h3><div style="background:#fff;border-radius:10px;padding:14px;"><div style="display:flex;gap:10px;margin-bottom:8px;"><span style="background:#228B22;color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">1</span><span style="font-size:16px;">\u64b3 Safari \u4e0b\u9762\u5605 <strong>\u300c\u5171\u4eab\u300d\u63a3</strong> \ud83d\udd17</span></div><div style="display:flex;gap:10px;margin-bottom:8px;"><span style="background:#228B22;color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">2</span><span style="font-size:16px;">\u63c0 <strong>\u300c\u52a0\u81f3\u4e3b\u756b\u9762\u300d</strong> \uff0b</span></div><div style="display:flex;gap:10px;"><span style="background:#228B22;color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">3</span><span style="font-size:16px;">\u64b3\u53f3\u4e0a\u89d2 <strong>\u300c\u65b0\u589e\u300d</strong> \u5b8c\u6210\uff01</span></div></div>';
  } else {
    // Android Chrome (or other) — show install button; fallback instructions if beforeinstallprompt not yet fired
    content = '<h3 style="font-size:20px;font-weight:900;color:#1a5c2a;margin-bottom:10px;">\ud83d\udcf1 \u5c07\u8001\u6709\u5361\u52a0\u843d\u4e3b\u756b\u9762</h3><p style="font-size:16px;color:#333;margin-bottom:12px;">\u5b89\u88dd\u5f8c\u53ef\u4ee5\u55ba\u4e3b\u756b\u9762\u76f4\u63a5\u958b\u555f\uff0c\u5524\u4f7f\u8a18\u4f4f\u7db2\u5740\uff01</p><button id="pwaInstallBtn" onclick="doInstallApp()" style="display:block;width:100%;padding:14px;background:#228B22;color:#fff;border:none;border-radius:10px;font-size:18px;font-weight:900;cursor:pointer;">\u2b07\ufe0f \u5b89\u88dd\u5230\u4e3b\u756b\u9762</button><div id="pwaInstallFallback" style="display:none;margin-top:12px;background:#fff;border-radius:8px;padding:12px;"><p style="font-size:14px;color:#555;margin-bottom:8px;">\u55ba Chrome \u9078\u55ae\uff08\u22ee\uff09\u63c0\u300c\u52a0\u81f3\u4e3b\u87a2\u5e55\u300d\u5373\u53ef\u5b89\u88dd\u3002</p><div style="font-size:14px;font-weight:700;color:#228B22;word-break:break-all;margin-bottom:8px;">' + location.origin + '/app</div><button onclick="copyAppUrl()" style="width:100%;padding:10px;background:#fff;color:#228B22;border:2px solid #228B22;border-radius:8px;font-size:15px;font-weight:900;cursor:pointer;">\ud83d\udccb \u8907\u88fd\u7db2\u5740</button></div>';
  }
  banner.innerHTML = content;
  var anchor = document.getElementById('verifiedBanner') || document.getElementById('waSentBanner') || document.getElementById('successSection');
  if(anchor && anchor.parentNode) { anchor.parentNode.insertBefore(banner, anchor.nextSibling); }
  else { document.body.appendChild(banner); }
  banner.scrollIntoView({behavior:'smooth', block:'center'});
  // Flag for beforeinstallprompt to activate install button if banner is showing
  if(!isInApp && !isIOS) {
    window._installBannerPending = true;
  }
}
function copyAppUrl() {
  var url = location.origin + '/app';
  if(navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function(){ alert('\u5df2\u8907\u88fd\uff01\u8acb\u55ba Safari \u6216 Chrome \u958b\u555f\uff1a' + url); });
  } else { prompt('\u8acb\u8907\u88fd\u4ee5\u4e0b\u7db2\u5740\uff1a', url); }
}
function doInstallApp() {
  if(window._deferredInstallPrompt) {
    window._deferredInstallPrompt.prompt();
    window._deferredInstallPrompt.userChoice.then(function(r) {
      window._deferredInstallPrompt = null;
      var b = document.getElementById('pwaInstallBanner');
      if(b && r.outcome === 'accepted') b.style.display = 'none';
    });
  } else {
    // Prompt not ready — show fallback instructions
    var fb = document.getElementById('pwaInstallFallback');
    if(fb) fb.style.display = '';
    var btn = document.getElementById('pwaInstallBtn');
    if(btn) btn.style.display = 'none';
  }
}

// Restore success page after WA redirect (family card — full page reload fallback)
document.addEventListener('DOMContentLoaded',function(){
  if(location.pathname==='/membership/join-family'){
    var saved=sessionStorage.getItem('successData');
    var waVerifyPending=sessionStorage.getItem('waVerifyPending');
    var tier=sessionStorage.getItem('successTier');
    if(saved&&waVerifyPending&&tier==='FAMILY'){
      try{
        var data=JSON.parse(saved);
        sessionStorage.removeItem('waVerifyPending');
        document.getElementById('formSection').style.display='none';
        document.getElementById('cardZh').textContent=data.nameZh;
        document.getElementById('cardEn').textContent=data.nameEn||'';
        document.getElementById('cardNo').textContent=data.memberNo;
        var cardUrl=location.origin+'/membership/card/'+data.memberNo;
        try{QRCode.toCanvas(document.getElementById('cardQr'),cardUrl,{width:40,margin:0,color:{dark:'#a80000',light:'#ffffff'},errorCorrectionLevel:'H'});}catch(e){}
        document.getElementById('successSection').classList.add('show');
        var mySubLink=document.getElementById('mySubPageLink');
        var mySubSep=document.getElementById('mySubPageSep');
        if(mySubLink){mySubLink.href='/membership/card/'+data.memberNo;mySubLink.style.display='inline';}
        if(mySubSep){mySubSep.style.display='inline';}
        window._verifyMemberNo=data.memberNo;
        window.scrollTo(0,0);
        setTimeout(function(){renderCardImage(data,'FAMILY');},100);
        // Full reload after normal WA: watermark gone, verified_at set
        setTimeout(function(){
          var wm=document.getElementById('pendingWatermark');
          var block=document.getElementById('waVerifyBlock');
          var banner=document.getElementById('verifiedBanner');
          if(wm)wm.style.display='none';
          if(block)block.style.display='none';
          if(banner)banner.style.display='block';
          var no=window._verifyMemberNo;
          if(no)fetch('/api/members/'+encodeURIComponent(no)+'/verify',{method:'POST'}).catch(function(){});
        },600);
      }catch(e){}
    }
  }
});

function renderCardImage(data, tier) {
  var logoImg=new Image();
  logoImg.onload=function(){
  // Canvas: 1360×860 @2x (displays as 680×430, credit-card ratio)
  var W=1360, H=860;
  var canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  var ctx=canvas.getContext('2d');
  var isPrimary=(tier!=='FAMILY');
  var forestDeep='#0d3e12',forest='#2E7D32',forestPale='#E8F5E9';
  var ferrari='#C62828',ferrariDeep='#8B0000',ferrariPale='#FFEBEE';
  var accentDark=isPrimary?forestDeep:ferrariDeep;
  var accentMid=isPrimary?forest:ferrari;
  var qrDark=isPrimary?forestDeep:'#a80000';
  // ── Background gradient
  var bg=ctx.createLinearGradient(0,0,W,H);
  if(isPrimary){bg.addColorStop(0,'#FDFAF3');bg.addColorStop(1,'#F0EBD8');}
  else{bg.addColorStop(0,'#FFF8F8');bg.addColorStop(1,'#FFE8E8');}
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // ── Watermark "85" — centred-right, large, faint — Montserrat Bold
  ctx.save(); ctx.globalAlpha=0.07; ctx.fillStyle=accentDark;
  ctx.font='bold 700px "Montserrat",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('85',W*0.72,H*0.56); ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.restore();
  // ── Top colour stripe (green left | red right)
  var stripeH=16;
  ctx.fillStyle=forest; ctx.fillRect(0,0,W*0.45,stripeH);
  ctx.fillStyle=ferrari; ctx.fillRect(W*0.45,0,W*0.55,stripeH);
  // ── Logo (top-left) — no divider line below
  var logoX=40,logoY=stripeH+20,logoW=330,logoH=132;
  ctx.drawImage(logoImg,logoX,logoY,logoW,logoH);
  // Vertical divider after logo
  ctx.strokeStyle=accentDark; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(logoX+logoW+24,logoY+10); ctx.lineTo(logoX+logoW+24,logoY+logoH-10); ctx.stroke();
  // Card type label (老有卡 / 家庭同行)
  var cardNameX=logoX+logoW+44;
  ctx.fillStyle=accentDark;
  if(isPrimary){ctx.font='bold 51px "Noto Serif TC",serif';ctx.fillText('老有卡',cardNameX,logoY+logoH/2+18);}
  else{ctx.font='bold 42px "Noto Serif TC",serif';ctx.fillText('老有卡',cardNameX,logoY+logoH/2-9);ctx.fillText('家庭同行',cardNameX,logoY+logoH/2+44);}
  // ── Badge (top-right)
  var badgeW=462,badgeH=75,badgeX=W-badgeW-48,badgeY=stripeH+26;
  ctx.fillStyle=isPrimary?forestPale:ferrariPale; ctx.strokeStyle=accentMid; ctx.lineWidth=3;
  ctx.beginPath(); roundRect(ctx,badgeX,badgeY,badgeW,badgeH,8); ctx.fill(); ctx.stroke();
  ctx.fillStyle=ferrari; ctx.font='bold 29px sans-serif'; ctx.fillText('◆',badgeX+18,badgeY+50);
  ctx.fillStyle=accentDark; ctx.font='bold 35px "Noto Serif TC",serif'; ctx.fillText('CoExplorery 探索者',badgeX+54,badgeY+50);
  // Tier label (right-aligned, below badge)
  ctx.fillStyle=ferrari; ctx.font='bold 33px "Noto Serif TC",serif'; ctx.textAlign='right';
  ctx.fillText(isPrimary?'主卡 · PRIMARY':'附屬 · FAMILY',W-48,badgeY+badgeH+42); ctx.textAlign='left';
  // ── Name area — pushed up, starting right after header zone
  var nameAreaY=stripeH+340;
  ctx.fillStyle='#999'; ctx.font='26px "Noto Serif TC",serif';
  var lbl='會員姓名',lx=48;
  for(var i=0;i<lbl.length;i++){ctx.fillText(lbl[i],lx,nameAreaY);lx+=ctx.measureText(lbl[i]).width+10;}
  ctx.fillStyle=accentDark;
  var zh=data.nameZh||'';
  var zhSz=zh.length<=2?200:zh.length<=3?178:zh.length<=4?148:112;
  ctx.font='bold '+zhSz+'px "Noto Serif TC",serif'; ctx.fillText(zh,48,nameAreaY+zhSz+10);
  var enY=nameAreaY+zhSz+10;
  if(data.nameEn&&data.nameEn.trim()){
    ctx.fillStyle=accentDark; ctx.font='bold 46px "Noto Serif TC",serif'; enY+=60;
    ctx.fillText(data.nameEn.trim(),48,enY);
  }
  if(!isPrimary&&data.parentNo){
    ctx.fillStyle=ferrari; ctx.font='26px "Noto Serif TC",serif';
    ctx.fillText('◆ 綁定主卡：'+data.parentNo+(data.parentName?' （'+data.parentName+'）':''),48,enY+48);
  }
  // ── QR code — bottom-right corner, pixel-perfect fill (no white gap)
  var footY=H-36;
  var qrSz=192,qrX=W-qrSz-40,qrY2=H-qrSz-40;
  ctx.fillStyle='#fff'; ctx.fillRect(qrX-8,qrY2-8,qrSz+16,qrSz+16);
  ctx.strokeStyle=accentMid; ctx.lineWidth=4; ctx.strokeRect(qrX-8,qrY2-8,qrSz+16,qrSz+16);
  try{
    var qr=qrcode(0,'M');
    qr.addData(location.origin+'/membership/card/'+(data.memberNo||''));
    qr.make();
    var mc=qr.getModuleCount();
    // Use exact cell size so modules fill entire qrSz — no fractional gap
    var cell=qrSz/mc;
    ctx.fillStyle=qrDark;
    for(var row=0;row<mc;row++){for(var col=0;col<mc;col++){
      if(qr.isDark(row,col)) ctx.fillRect(qrX+col*cell,qrY2+row*cell,cell,cell);
    }}
  }catch(e){console.warn('QR err',e);}
  // ── Footer — no background box, clean transparent
  ctx.fillStyle='#aaa'; ctx.font='28px "Noto Serif TC",serif'; ctx.fillText('會員編號',48,footY-72);
  ctx.fillStyle=accentDark; ctx.font='bold 56px "Space Grotesk",monospace'; ctx.fillText(data.memberNo||'',48,footY-8);
  if(data.expiresAt){
    var expStr=data.expiresAt.slice(0,7).replace('-','/');
    var expDisp=expStr.slice(5)+' / '+expStr.slice(0,4);
    ctx.fillStyle='#aaa'; ctx.font='28px "Noto Serif TC",serif'; ctx.fillText('有效期至',560,footY-72);
    ctx.fillStyle=accentDark; ctx.font='bold 56px "Space Grotesk",monospace'; ctx.fillText(expDisp,560,footY-8);
  }
  // ── Convert → JPEG blob
  canvas.toBlob(function(blob){
    if(!blob)return;
    window._cardBlob=blob; window._cardFileName='CoEldery85_'+(data.memberNo||'card')+'.jpg';
    var url=URL.createObjectURL(blob);
    var img=document.getElementById('cardImg'); if(img)img.src=url;
    var wrap=document.getElementById('cardImgWrap'); if(wrap)wrap.style.display='block';
    var cssCard=document.getElementById('genCard'); if(cssCard)cssCard.style.display='none';
  },'image/jpeg',0.95);
  }; // end logoImg.onload
  logoImg.src='/static/logo.png';
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
function saveCardImage(){
  if(!window._cardBlob){alert('圖片未準備好，請稍候再試');return;}
  var a=document.createElement('a');a.href=URL.createObjectURL(window._cardBlob);a.download=window._cardFileName||'coeldery85-card.jpg';a.click();
}

async function shareCardToWA(){
  if(!window._cardBlob){alert('圖片未準備好，請稍候再試');return;}
  var file=new File([window._cardBlob],window._cardFileName||'coeldery85-card.jpg',{type:'image/jpeg'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:'CoEldery 85 老有卡',text:'我已成功申請 CoEldery 85 家庭同行卡！'});return;}
    catch(e){if(e.name!=='AbortError')console.warn('share error',e);}
  }
  saveCardImage();
  alert('請在相簿選取剛下載的會員卡圖片，貼入 WhatsApp 傳送。');
}
</script>
</body></html>`
}

// ─── Admin HTML ───────────────────────────────────────────────────────────────
function adminHtml() {
  const srcLabels: Record<string,string> = {
    'walk-in':'Walk-in','roadshow':'Roadshow','referral':'會員介紹',
    'whatsapp':'WhatsApp','social':'社交媒體','institution':'機構轉介','online':'網上登記'
  }
  return htmlHead('會員後台管理', `<style>
*{box-sizing:border-box}
body{background:#f2f3f5;padding:0;font-size:14px;}
/* topbar */
.topbar{background:var(--forest-deep);color:#fff;padding:0 24px;display:flex;align-items:center;height:52px;gap:0;}
.topbar .logo{font-family:"Noto Serif TC",serif;font-size:17px;font-weight:700;letter-spacing:2px;margin-right:32px;}
.topbar .logo em{color:var(--ferrari);font-style:normal;}
.nav-tabs{display:flex;height:100%;}
.nav-tab{padding:0 18px;cursor:pointer;font-size:13px;display:flex;align-items:center;opacity:0.65;border-bottom:3px solid transparent;letter-spacing:1px;color:#fff;}
.nav-tab.active{opacity:1;border-bottom-color:var(--ferrari);}
.topbar-right{margin-left:auto;font-size:11px;opacity:0.5;}
/* layout */
.wrap{max-width:100%;margin:0 auto;padding:16px 24px;}
.page{display:none}.page.active{display:block}
/* stat cards */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
@media(max-width:900px){.stats-grid{grid-template-columns:1fr 1fr;}}
.stat-card{background:#fff;padding:18px 20px;border-radius:6px;border-top:3px solid var(--forest);box-shadow:0 1px 4px rgba(0,0,0,0.06);}
.stat-card.red{border-top-color:var(--ferrari);}
.stat-card.blue{border-top-color:#1565C0;}
.stat-card.amber{border-top-color:#E65100;}
.stat-card .n{font-family:"Space Grotesk",sans-serif;font-size:32px;font-weight:700;color:var(--forest-deep);}
.stat-card.red .n{color:var(--ferrari-deep);}
.stat-card.blue .n{color:#1565C0;}
.stat-card.amber .n{color:#E65100;}
.stat-card .lbl{font-size:11px;color:#888;letter-spacing:2px;margin-top:4px;text-transform:uppercase;}
.stat-card .sub{font-size:11px;color:#aaa;margin-top:2px;}
/* charts row */
.charts-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px;}
@media(max-width:768px){.charts-row{grid-template-columns:1fr;}}
.chart-card{background:#fff;border-radius:6px;padding:18px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
.chart-title{font-size:12px;font-weight:700;letter-spacing:2px;color:#555;text-transform:uppercase;margin-bottom:14px;}
.bar-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;}
.bar-label{width:80px;color:#666;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bar-track{flex:1;background:#f0f0f0;border-radius:3px;height:16px;overflow:hidden;}
.bar-fill{height:100%;border-radius:3px;background:var(--forest);transition:width 0.4s;}
.bar-fill.red{background:var(--ferrari);}
.bar-val{width:30px;font-family:"Space Grotesk",sans-serif;font-weight:700;color:var(--forest-deep);}
/* filters */
.filter-bar{background:#fff;border-radius:6px;padding:14px 18px;margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
.filter-bar input,.filter-bar select{padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;font-family:inherit;color:var(--ink);background:#fff;}
.filter-bar input{flex:1;min-width:180px;}
.btn{padding:7px 16px;border:0;border-radius:4px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:700;letter-spacing:0.5px;}
.btn-green{background:var(--forest);color:#fff;}
.btn-grey{background:#e0e0e0;color:#555;}
.btn-red{background:var(--ferrari);color:#fff;}
.btn-blue{background:#1565C0;color:#fff;}
.btn-amber{background:#E65100;color:#fff;}
/* table */
.table-wrap{background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
.table-meta{padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;}
.table-meta .count{font-size:12px;color:#888;}
.table-actions{display:flex;gap:8px;}
table{width:100%;border-collapse:collapse;font-size:13px;}
th{background:#fafafa;color:#555;padding:9px 12px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #eee;white-space:nowrap;}
td{padding:10px 12px;border-bottom:1px solid #f5f5f5;color:#333;white-space:nowrap;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:#f9fffe;}
tr.inactive td{opacity:0.45;}
/* badges */
.badge{display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.5px;}
.badge-primary{background:#E8F5E9;color:#1B5E20;}
.badge-family{background:#FFEBEE;color:#B71C1C;}
.badge-active{background:#E8F5E9;color:#2E7D32;}
.badge-inactive{background:#FFF3E0;color:#E65100;}
.badge-deleted{background:#F5F5F5;color:#9E9E9E;}
.badge-done{background:#E8F5E9;color:#2E7D32;}
.badge-pending{background:#FFFDE7;color:#F57F17;}
/* action buttons in table */
.act-btn{padding:3px 8px;border:1px solid;border-radius:3px;font-size:11px;cursor:pointer;font-weight:700;background:#fff;margin-right:3px;}
.act-edit{border-color:var(--forest);color:var(--forest);}
.act-kyc{border-color:#1565C0;color:#1565C0;}
.act-deact{border-color:var(--ferrari);color:var(--ferrari);}
.act-react{border-color:#2E7D32;color:#2E7D32;}
/* pagination */
.pagination{padding:12px 16px;display:flex;gap:6px;justify-content:center;border-top:1px solid #f0f0f0;}
.pagination button{padding:5px 12px;border:1px solid #ddd;background:#fff;cursor:pointer;font-family:inherit;font-size:12px;border-radius:3px;}
.pagination button.active{background:var(--forest);color:#fff;border-color:var(--forest);}
/* modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;display:none;align-items:center;justify-content:center;}
.modal-overlay.show{display:flex;}
.modal{background:#fff;border-radius:8px;padding:28px 28px 20px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.2);}
.modal h3{font-family:"Noto Serif TC",serif;font-size:18px;color:var(--forest-deep);margin-bottom:20px;font-weight:700;}
.modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.modal-field{display:flex;flex-direction:column;gap:5px;}
.modal-field.full{grid-column:1/-1;}
.modal-field label{font-size:11px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;}
.modal-field input,.modal-field select,.modal-field textarea{padding:8px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;font-family:inherit;}
.modal-field textarea{height:70px;resize:vertical;}
.modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #f0f0f0;}
/* QR generator */
.qr-layout{display:grid;grid-template-columns:1fr 380px;gap:24px;align-items:start;}
@media(max-width:900px){.qr-layout{grid-template-columns:1fr;}}
.qr-form-card{background:#fff;border-radius:8px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
.qr-form-card h3{font-family:"Noto Serif TC",serif;font-size:16px;font-weight:700;color:var(--forest-deep);margin-bottom:18px;}
.qr-field{margin-bottom:14px;}
.qr-field label{display:block;font-size:11px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;}
.qr-field input,.qr-field select{width:100%;padding:9px 11px;border:1.5px solid #ddd;border-radius:5px;font-size:13px;font-family:inherit;color:var(--ink);transition:border-color 0.2s;}
.qr-field input:focus,.qr-field select:focus{outline:none;border-color:var(--forest);}
.qr-field .hint{font-size:11px;color:#aaa;margin-top:3px;}
.qr-type-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}
.qr-type-btn{padding:10px 8px;border:2px solid #e0e0e0;border-radius:6px;background:#fff;cursor:pointer;text-align:center;font-family:inherit;font-size:12px;font-weight:700;color:#888;transition:all 0.2s;line-height:1.4;}
.qr-type-btn.active{border-color:var(--forest);background:#f0f7f0;color:var(--forest-deep);}
.qr-type-btn .icon{font-size:20px;display:block;margin-bottom:3px;}
.qr-preview-card{background:#fff;border-radius:8px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,0.06);position:sticky;top:24px;}
.qr-preview-card h3{font-family:"Noto Serif TC",serif;font-size:16px;font-weight:700;color:var(--forest-deep);margin-bottom:16px;}
.qr-canvas-wrap{background:#f9f9f9;border:1.5px solid #e8e8e8;border-radius:8px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:14px;min-height:200px;}
.qr-canvas-wrap canvas{width:200px;height:200px;image-rendering:pixelated;}
.qr-label-text{font-size:11px;font-weight:700;letter-spacing:2px;color:#555;text-align:center;text-transform:uppercase;}
.qr-url-box{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:4px;padding:8px 10px;font-size:11px;font-family:monospace;color:#444;word-break:break-all;margin-bottom:12px;line-height:1.5;}
.qr-actions{display:flex;flex-direction:column;gap:8px;}
.qr-action-btn{width:100%;padding:10px;border:none;border-radius:5px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:0.5px;}
.qr-action-btn.dl-png{background:var(--forest);color:#fff;}
.qr-action-btn.cp-url{background:#e8f5e9;color:var(--forest-deep);border:1.5px solid var(--forest);}
.qr-action-btn.cp-url.copied{background:var(--forest-deep);color:#fff;}
/* saved links table */
.links-table-wrap{background:#fff;border-radius:8px;margin-top:24px;box-shadow:0 1px 4px rgba(0,0,0,0.06);overflow:hidden;}
.links-table-wrap .ltitle{padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:2px;color:#555;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;text-transform:uppercase;}
.links-table-wrap table{width:100%;border-collapse:collapse;font-size:12px;}
.links-table-wrap th{background:#fafafa;color:#888;padding:8px 14px;text-align:left;font-size:10px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #eee;}
.links-table-wrap td{padding:10px 14px;border-bottom:1px solid #f8f8f8;vertical-align:middle;}
.links-table-wrap tr:last-child td{border-bottom:none;}
.links-table-wrap tr:hover td{background:#f9fffe;}
.link-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.5px;}
.link-tag.roadshow{background:#E8F5E9;color:#1B5E20;}
.link-tag.institution{background:#E3F2FD;color:#0D47A1;}
.link-tag.referral{background:#FFF3E0;color:#E65100;}
.link-tag.online{background:#F3E5F5;color:#4A148C;}
.link-tag.walkin{background:#F5F5F5;color:#616161;}
</style>`) + `
<body>
<div class="topbar">
  <div class="logo">CoEldery <em>85</em></div>
  <div class="nav-tabs">
    <div class="nav-tab active" onclick="switchTab('dashboard',this)">📊 Dashboard</div>
    <div class="nav-tab" onclick="switchTab('members',this)">👥 會員管理</div>
    <div class="nav-tab" onclick="switchTab('medical',this)">🏥 醫健卡申請</div>
    <div class="nav-tab" onclick="switchTab('qrgen',this)">🔗 QR 連結</div>
    <div class="nav-tab" onclick="switchTab('settings',this)">⚙️ 設定</div>
  </div>
  <div class="topbar-right">coeldery85.com/membership/admin</div>
</div>

<div class="wrap">

  <!-- ── DASHBOARD PAGE ── -->
  <div class="page active" id="page-dashboard">
    <div class="stats-grid">
      <div class="stat-card"><div class="n" id="sTotal">—</div><div class="lbl">總會員數</div><div class="sub" id="sActive">活躍：— / 停用：—</div></div>
      <div class="stat-card"><div class="n" id="sPrimary">—</div><div class="lbl">主卡</div></div>
      <div class="stat-card"><div class="n" id="sFamily">—</div><div class="lbl">家庭同行卡</div></div>
      <div class="stat-card red"><div class="n" id="sPending">—</div><div class="lbl">待 KYC</div></div>
      <div class="stat-card blue"><div class="n" id="sToday">—</div><div class="lbl">今日新增</div></div>
      <div class="stat-card amber"><div class="n" id="sMonth">—</div><div class="lbl">本月新增</div></div>
      <div class="stat-card blue"><div class="n" id="sMedPending">—</div><div class="lbl">醫健卡待送 NGO</div></div>
      <div class="stat-card"><div class="n" id="sMedIssued">—</div><div class="lbl">醫健卡已發出</div></div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">📍 來源渠道分析</div>
        <div id="chartSource"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🗺️ 地區分佈 Top 10</div>
        <div id="chartDistrict"></div>
      </div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">⚧ 性別分佈</div>
        <div id="chartGender"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🏥 醫健卡申請狀態</div>
        <div id="chartMedical"></div>
      </div>
    </div>
    <div class="chart-card" style="margin-bottom:24px;">
      <div class="chart-title">📈 每月新增會員趨勢（近12個月）</div>
      <div id="chartMonth" style="display:flex;align-items:flex-end;gap:6px;height:120px;padding-top:8px;"></div>
    </div>

    <!-- Roadshow / Source breakdown -->
    <div class="chart-card" style="margin-bottom:24px;">
      <div class="chart-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>🏪 Roadshow &amp; 機構場次登記摘要</span>
        <span style="font-size:10px;font-weight:400;color:#aaa;letter-spacing:0;text-transform:none;">點擊場次可跳至會員列表篩選</span>
      </div>
      <div id="chartRoadshow">
        <div style="color:#ccc;font-size:12px;padding:12px 0;">載入中…</div>
      </div>
    </div>

    <!-- Referrer leaderboard -->
    <div class="chart-card" style="margin-bottom:24px;">
      <div class="chart-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>👤 介紹人排行榜 Top 15</span>
        <span style="font-size:10px;font-weight:400;color:#aaa;letter-spacing:0;text-transform:none;">點擊介紹人可跳至會員列表篩選</span>
      </div>
      <div id="chartReferrer">
        <div style="color:#ccc;font-size:12px;padding:12px 0;">載入中…</div>
      </div>
    </div>
  </div>

  <!-- ── MEMBERS PAGE ── -->
  <div class="page" id="page-members">
    <div class="filter-bar">
      <input id="search" type="text" placeholder="搜尋姓名 / 會員編號 / 電話…">
      <select id="filterTier">
        <option value="">全部類型</option>
        <option value="PRIMARY">主卡</option>
        <option value="FAMILY">家庭同行</option>
      </select>
      <select id="filterStatus">
        <option value="">全部狀態</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>
      <select id="filterSource">
        <option value="">全部來源</option>
        <option value="walk-in">Walk-in</option>
        <option value="roadshow">Roadshow</option>
        <option value="referral">會員介紹</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="social">社交媒體</option>
        <option value="institution">機構轉介</option>
        <option value="online">網上登記</option>
      </select>
      <select id="filterGroup">
        <option value="">— 所有群組 —</option>
        <option value="none">未分配群組</option>
      </select>
      <button class="btn btn-green" onclick="loadMembers(1)">🔍 搜尋</button>
      <button class="btn btn-grey" onclick="clearFilters()">清除</button>
      <button class="btn btn-blue" onclick="exportCsv()" title="匯出 CSV">⬇ CSV</button>
      <input type="hidden" id="filterRoadshow" value="">
      <span id="roadshowFilterBadge" style="display:none;background:#E8F5E9;color:#2E7D32;border:1px solid #A5D6A7;border-radius:4px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;" onclick="clearRoadshowFilter()" title="點擊清除 Roadshow 篩選"></span>
    </div>
    <div class="table-wrap">
      <div class="table-meta">
        <span class="count" id="searchCount">載入中…</span>
      </div>
      <div style="overflow-x:auto;">
      <table>
        <thead><tr>
          <th>會員編號</th><th>狀態</th><th>類型</th><th>中文姓名</th><th>英文姓名</th>
          <th>電話</th><th>性別</th><th>出生年</th><th>HKID頭4位</th>
          <th>地區</th><th>角色</th><th>KYC</th><th>WA狀態</th><th>群組</th><th>主卡/家庭卡</th>
          <th>來源</th><th>介紹人</th><th>有效日期</th><th>登記時間</th><th>操作</th>
        </tr></thead>
        <tbody id="membersTbody"></tbody>
      </table>
      </div>
      <div class="pagination" id="pagination"></div>
    </div>
  </div>

  <!-- ── MEDICAL CARD PAGE ── -->
  <div class="page" id="page-medical">
    <div class="filter-bar">
      <select id="medFilterStatus" onchange="loadMedical()">
        <option value="">全部狀態</option>
        <option value="PENDING">待傳送</option>
        <option value="SENT">已傳送 NGO</option>
        <option value="ISSUED">已發卡</option>
        <option value="DECLINED">已拒絕</option>
      </select>
      <button class="btn btn-green" onclick="loadMedical()">🔍 重新整理</button>
      <a class="btn btn-blue" href="/api/admin/medical?export=csv" target="_blank">⬇ CSV 匯出</a>
    </div>
    <div style="overflow-x:auto;">
    <table>
      <thead><tr>
        <th>ID</th><th>會員編號</th><th>中文全名</th><th>英文全名</th>
        <th>HKID頭4位</th><th>電話</th><th>狀態</th><th>申請日期</th><th>操作</th>
      </tr></thead>
      <tbody id="medicalTbody"></tbody>
    </table>
    </div>
    <div id="medicalCount" style="padding:8px 0;font-size:12px;color:#888;"></div>
  </div>

  <!-- ── QR GENERATOR PAGE ── -->
  <div class="page" id="page-qrgen">
    <div class="qr-layout">

      <!-- LEFT: form -->
      <div>
        <div class="qr-form-card">
          <h3>🔗 生成登記連結 &amp; QR Code</h3>

          <!-- type selector -->
          <div style="margin-bottom:6px;font-size:11px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;">登記來源類型</div>
          <div class="qr-type-grid">
            <button class="qr-type-btn active" id="qtype-roadshow" onclick="setQrType('roadshow')"><span class="icon">🏪</span>Roadshow 攤位</button>
            <button class="qr-type-btn" id="qtype-institution" onclick="setQrType('institution')"><span class="icon">🏢</span>機構 / 合作夥伴</button>
            <button class="qr-type-btn" id="qtype-referral" onclick="setQrType('referral')"><span class="icon">👤</span>會員個人介紹</button>
            <button class="qr-type-btn" id="qtype-online" onclick="setQrType('online')"><span class="icon">🌐</span>網上 / 社媒推廣</button>
          </div>

          <!-- ROADSHOW fields -->
          <div id="qfields-roadshow">
            <div class="qr-field">
              <label>Roadshow 場次代碼 <span style="color:var(--ferrari)">*</span></label>
              <input id="qRsCode" type="text" placeholder="例：cwb_2025_07_01" oninput="updateQr()" style="font-family:monospace;letter-spacing:1px;">
              <div class="hint">只用英文小寫、數字、底線。建議格式：地區_年份_月份_場次</div>
            </div>
            <div class="qr-field">
              <label>活動名稱 / 地點（顯示用）</label>
              <input id="qRsLabel" type="text" placeholder="例：銅鑼灣時代廣場 7月份攤位" oninput="updateQr()">
              <div class="hint">此名稱會記錄在 roadshow_location 欄位</div>
            </div>
          </div>

          <!-- INSTITUTION fields -->
          <div id="qfields-institution" style="display:none;">
            <div class="qr-field">
              <label>機構名稱 <span style="color:var(--ferrari)">*</span></label>
              <input id="qInstName" type="text" placeholder="例：基督教家庭服務中心 荃灣" oninput="updateQr()">
              <div class="hint">會記錄在 roadshow_location 欄位</div>
            </div>
            <div class="qr-field">
              <label>機構代碼（選填）</label>
              <input id="qInstCode" type="text" placeholder="例：cfsc_tw" oninput="updateQr()" style="font-family:monospace;letter-spacing:1px;">
              <div class="hint">只用英文小寫、數字、底線。留空則用機構名稱縮寫</div>
            </div>
          </div>

          <!-- REFERRAL fields -->
          <div id="qfields-referral" style="display:none;">
            <div class="qr-field">
              <label>介紹人會員編號 <span style="color:var(--ferrari)">*</span></label>
              <input id="qRefNo" type="text" placeholder="例：CE85-000012" oninput="updateQr()" style="font-family:monospace;letter-spacing:2px;font-weight:700;">
              <div class="hint">掃碼後自動填入 referrer_no 欄位，系統會驗證編號是否有效</div>
            </div>
            <div class="qr-field">
              <label>介紹人姓名（選填，顯示用）</label>
              <input id="qRefName" type="text" placeholder="例：陳大文" oninput="updateQr()">
            </div>
          </div>

          <!-- ONLINE fields -->
          <div id="qfields-online" style="display:none;">
            <div class="qr-field">
              <label>推廣渠道 <span style="color:var(--ferrari)">*</span></label>
              <select id="qOnlineCh" onchange="updateQr()">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="website">官方網站</option>
                <option value="email">電子郵件</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div class="qr-field">
              <label>推廣活動標籤（選填）</label>
              <input id="qOnlineTag" type="text" placeholder="例：july_promo" oninput="updateQr()" style="font-family:monospace;letter-spacing:1px;">
              <div class="hint">用於區分同一渠道不同時期的推廣</div>
            </div>
          </div>

          <!-- common: target form -->
          <div class="qr-field" style="margin-top:6px;">
            <label>目標登記頁面</label>
            <select id="qTarget" onchange="updateQr()">
              <option value="primary">主卡登記（長者用）</option>
              <option value="family">家庭同行卡（家人用）</option>
              <option value="both">登記頁主頁（有 Login/Register tab）</option>
            </select>
          </div>

          <button class="btn btn-green" style="width:100%;margin-top:8px;padding:12px;" onclick="saveQrLink()">💾 儲存至連結記錄</button>
        </div>

        <!-- saved links table -->
        <div class="links-table-wrap">
          <div class="ltitle">
            <span>📋 已儲存的連結</span>
            <button class="btn btn-grey" style="font-size:11px;padding:4px 10px;" onclick="loadQrLinks()">重新整理</button>
          </div>
          <table>
            <thead><tr>
              <th>類型</th><th>標籤</th><th>代碼 / 介紹人</th><th>目標頁</th><th>建立日期</th><th>操作</th>
            </tr></thead>
            <tbody id="qrLinksTbody"><tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px 0;">載入中…</td></tr></tbody>
          </table>
        </div>
      </div>

      <!-- RIGHT: live preview -->
      <div>
        <div class="qr-preview-card">
          <h3>📱 即時預覽</h3>
          <div class="qr-canvas-wrap" id="qrCanvasWrap">
            <div style="color:#ccc;font-size:13px;text-align:center;padding:30px 0;">填寫左方資料<br>即時生成 QR Code</div>
          </div>
          <div class="qr-label-text" id="qrLabelText" style="margin-bottom:10px;"></div>
          <div class="qr-url-box" id="qrUrlBox" style="display:none;"></div>
          <div class="qr-actions" id="qrActionBtns" style="display:none;">
            <button class="qr-action-btn dl-png" onclick="downloadQr()">⬇ 下載 QR Code (PNG)</button>
            <button class="qr-action-btn cp-url" id="cpUrlBtn" onclick="copyUrl()">📋 複製連結</button>
          </div>
          <div style="margin-top:16px;padding:12px;background:#fffde7;border-radius:5px;font-size:11px;color:#795548;line-height:1.6;" id="qrTips">
            <strong>💡 使用提示</strong><br>
            • 下載 PNG 後可直接列印或發送<br>
            • 掃碼者登記時，來源渠道自動記錄<br>
            • 可儲存連結以便日後重用
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ── SETTINGS PAGE ── -->
  <div class="page" id="page-settings">
    <div style="max-width:560px;margin:0 auto;">
      <div style="background:#fff;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,0.07);padding:28px 24px;margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin:0 0 20px;color:#222;letter-spacing:1px;">⚙️ 系統設定</h2>

        <!-- WhatsApp Admin Number -->
        <div style="margin-bottom:24px;">
          <label style="display:block;font-size:12px;font-weight:700;color:#555;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
            📱 WhatsApp 管理員號碼
          </label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="settingWaNum" type="tel" maxlength="15" placeholder="例：85291477341"
              style="flex:1;border:1px solid #ddd;border-radius:5px;padding:10px 12px;font-size:14px;font-family:monospace;letter-spacing:1px;"
              oninput="settingsDirty()">
            <button onclick="saveWaNum()" id="saveWaBtn"
              style="background:#25D366;color:#fff;border:0;border-radius:5px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">
              儲存
            </button>
          </div>
          <div style="font-size:11px;color:#888;margin-top:6px;line-height:1.6;">
            包含國家碼，例如香港號碼 91477341 填入 <strong>85291477341</strong><br>
            會員登記成功後，WhatsApp 驗證按鈕會連到這個號碼。
          </div>
          <div id="settingWaStatus" style="margin-top:8px;font-size:12px;font-weight:700;display:none;"></div>
        </div>

        <hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0;">

        <!-- Preview -->
        <div>
          <div style="font-size:12px;font-weight:700;color:#555;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">👁 預覽驗證訊息</div>
          <div style="background:#f5f5f5;border-radius:6px;padding:12px 14px;font-size:13px;color:#333;line-height:1.7;" id="settingPreview">
            —
          </div>
          <div style="margin-top:10px;">
            <a id="settingTestLink" href="#" target="_blank" rel="noopener"
              style="display:block;background:#25D366;color:#fff;padding:11px 10px;border-radius:6px;font-size:13px;font-weight:700;text-align:center;text-decoration:none;">
              📲 測試：開啟 WhatsApp
            </a>
          </div>
        </div>
      </div>

      <!-- 群組管理 -->
      <div style="background:#fff;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,0.07);padding:28px 24px;margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin:0 0 4px;color:#222;letter-spacing:1px;">🏷️ 會員群組管理</h2>
        <p style="font-size:12px;color:#888;margin:0 0 20px;">建立自訂群組，在會員管理頁分配給會員。</p>

        <!-- New group form -->
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          <input id="newGroupName" type="text" placeholder="群組名稱（如：VIP、葵青社區）" maxlength="30"
            style="flex:1;min-width:160px;border:1px solid #ddd;border-radius:5px;padding:9px 12px;font-size:13px;"
            onkeydown="if(event.key==='Enter')addGroup()">
          <input id="newGroupDesc" type="text" placeholder="說明（選填）" maxlength="60"
            style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:5px;padding:9px 12px;font-size:13px;">
          <input id="newGroupColor" type="color" value="#4caf50" title="群組顏色"
            style="width:40px;height:38px;border:1px solid #ddd;border-radius:5px;cursor:pointer;padding:2px;">
          <button onclick="addGroup()"
            style="background:var(--forest);color:#fff;border:0;border-radius:5px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">
            ＋ 新增群組
          </button>
        </div>
        <div id="groupsStatus" style="font-size:12px;font-weight:700;margin-bottom:12px;display:none;"></div>

        <!-- Groups list -->
        <div id="groupsList" style="display:flex;flex-direction:column;gap:8px;">
          <div style="color:#aaa;font-size:13px;text-align:center;padding:20px;">載入中…</div>
        </div>
      </div>

      <!-- 來源統計 -->
      <div style="background:#fff;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,0.07);padding:28px 24px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <h2 style="font-size:16px;font-weight:700;margin:0 0 4px;color:#222;letter-spacing:1px;">📊 QR / 來源登記統計</h2>
            <p style="font-size:12px;color:#888;margin:0;">每個 QR Code 來源的登記人數</p>
          </div>
          <button onclick="loadSourceStats()" style="background:#f5f5f5;border:1px solid #ddd;border-radius:5px;padding:6px 12px;font-size:12px;cursor:pointer;">🔄 重新整理</button>
        </div>
        <div id="sourceStatsList">
          <div style="color:#aaa;font-size:13px;text-align:center;padding:20px;">載入中…</div>
        </div>
      </div>
    </div>
  </div>

</div>

<!-- ── EDIT MODAL ── -->
<div class="modal-overlay" id="editModal">
  <div class="modal">
    <h3>✏️ 編輯會員資料</h3>
    <input type="hidden" id="editNo">
    <div class="modal-grid">
      <div class="modal-field"><label>中文姓名</label><input id="eNameZh"></div>
      <div class="modal-field"><label>英文姓名</label><input id="eNameEn"></div>
      <div class="modal-field"><label>電話</label><input id="ePhone"></div>
      <div class="modal-field"><label>性別</label>
        <select id="eGender"><option value="">—</option><option value="M">男 M</option><option value="F">女 F</option><option value="X">其他 X</option></select>
      </div>
      <div class="modal-field"><label>出生年份</label><input id="eBirthYear" type="number" placeholder="例：1950" min="1920" max="2010"></div>
      <div class="modal-field"><label>身份證頭4位</label><input id="eIdPrefix" placeholder="例：K608" maxlength="4" style="text-transform:uppercase;letter-spacing:4px;font-size:16px;font-weight:700;"></div>
      <div class="modal-field"><label>地區</label><input id="eDistrict"></div>
      <div class="modal-field"><label>角色</label>
        <select id="eRole">
          <option value="CoExplorery">CoExplorery 探索者</option>
          <option value="CoSupportery">CoSupportery 支持者</option>
          <option value="CoOwnery">CoOwnery 同行者</option>
          <option value="CoLeadery">CoLeadery 領航者</option>
          <option value="CoLinkery">CoLinkery 連結者</option>
        </select>
      </div>
      <div class="modal-field"><label>KYC 狀態</label>
        <select id="eKyc"><option value="PENDING">PENDING</option><option value="DONE">DONE</option></select>
      </div>
      <div class="modal-field"><label>狀態</label>
        <select id="eStatus"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
      </div>
      <div class="modal-field"><label>來源渠道</label>
        <select id="eSource">
          <option value="walk-in">Walk-in</option>
          <option value="roadshow">Roadshow</option>
          <option value="referral">會員介紹</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="social">社交媒體</option>
          <option value="institution">機構轉介</option>
          <option value="online">網上登記</option>
        </select>
      </div>
      <div class="modal-field"><label>介紹人會員編號</label><input id="eReferrer" placeholder="CE85-XXXXXX"></div>
      <div class="modal-field" id="eParentField" style="display:none;"><label>主卡會員編號（唯讀）</label><input id="eParentNo" readonly style="background:#f5f5f5;color:#888;"></div>
      <div class="modal-field"><label>有效日期</label><input id="eExpires" type="date"></div>
      <div class="modal-field"><label>Roadshow 地點</label><input id="eRoadshowLoc"></div>
      <div class="modal-field full"><label>會員備註（會員可見）</label><textarea id="eNotes"></textarea></div>
      <div class="modal-field full"><label>內部備註（僅管理員）</label><textarea id="eAdminNotes"></textarea></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-grey" onclick="closeModal()">取消</button>
      <button class="btn btn-green" onclick="saveEdit()">💾 儲存</button>
    </div>
  </div>
</div>

<script src="/static/admin.js"></script>
</body></html>`
}

// ─── Poster HTML ──────────────────────────────────────────────────────────────
function posterHtml() {
  return htmlHead('Roadshow Poster', `<style>
body{background:#333;padding:24px 0;}
.poster-wrap{display:flex;justify-content:center;padding-bottom:40px;}
.controls{position:fixed;top:20px;right:20px;background:#fff;padding:16px 20px;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:100;font-family:"Noto Sans TC",sans-serif;font-size:12px;max-width:260px;}
.controls h4{font-family:"Noto Serif TC",serif;color:var(--forest-deep);font-size:14px;margin-bottom:10px;}
.controls label{display:block;margin-bottom:8px;color:var(--grey-1);}
.controls input{width:100%;padding:6px 8px;border:1px solid var(--line);font-size:12px;font-family:monospace;}
.controls .hint{font-size:10px;color:var(--grey-3);margin-top:8px;line-height:1.5;}
.controls .btn{display:inline-block;margin-top:12px;padding:8px 14px;background:var(--forest);color:#fff;border:0;cursor:pointer;font-size:12px;font-family:"Noto Sans TC",sans-serif;font-weight:700;letter-spacing:1px;}
.poster{width:900px;height:1273px;background:#FAF7F0;position:relative;overflow:hidden;font-family:"Noto Sans TC",sans-serif;color:var(--ink);box-shadow:0 20px 60px rgba(0,0,0,0.4);}
.poster-header{height:220px;background:linear-gradient(135deg,#0d3e12 0%,#1B5E20 55%,#2d5016 100%);color:#fff;padding:40px 60px;position:relative;overflow:hidden;}
.poster-header::before{content:"85";position:absolute;right:-30px;top:-80px;font-family:"Noto Serif TC",serif;font-size:380px;font-weight:900;color:var(--ferrari);opacity:0.18;line-height:1;}
.poster-header .logo-chip{display:inline-block;background:rgba(255,255,255,0.97);padding:14px 22px 12px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.2);position:relative;z-index:2;font-family:"Noto Serif TC",serif;color:var(--forest-deep);font-size:22px;font-weight:900;letter-spacing:2px;}
.poster-header .logo-chip em{color:var(--ferrari);font-style:normal;}
.poster-header .tagline{position:absolute;right:60px;bottom:40px;text-align:right;font-family:"Noto Serif TC",serif;z-index:2;}
.poster-header .tagline .l1{font-size:22px;font-weight:700;letter-spacing:3px;margin-bottom:4px;}
.poster-header .tagline .l2{font-size:12px;letter-spacing:4px;opacity:0.85;}
.poster-main{padding:44px 60px 20px;text-align:center;}
.poster-main .kicker{font-family:"Noto Serif TC",serif;font-size:15px;letter-spacing:10px;color:var(--ferrari);font-weight:700;margin-bottom:16px;}
.poster-main h1{font-family:"Noto Serif TC",serif;font-size:72px;font-weight:900;color:var(--forest-deep);line-height:1.1;letter-spacing:4px;margin-bottom:12px;}
.poster-main h1 .red{color:var(--ferrari);}
.poster-main .subline{font-family:"Noto Serif TC",serif;font-size:22px;color:var(--grey-1);letter-spacing:4px;font-weight:400;}
.poster-main .rule{width:60px;height:4px;background:var(--ferrari);margin:24px auto 0;}
.entries{padding:30px 50px 0;display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.entry{background:#fff;border:3px solid var(--forest);padding:28px 24px 24px;position:relative;text-align:center;}
.entry.sub{border-color:var(--ferrari);}
.entry .step-badge{position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:var(--forest);color:#fff;padding:6px 20px;font-family:"Noto Serif TC",serif;font-size:13px;letter-spacing:4px;font-weight:700;}
.entry.sub .step-badge{background:var(--ferrari);}
.entry h2{font-family:"Noto Serif TC",serif;font-size:32px;color:var(--forest-deep);margin-top:14px;margin-bottom:6px;letter-spacing:3px;font-weight:900;}
.entry.sub h2{color:var(--ferrari-deep);}
.entry .sub-desc{font-size:14px;color:var(--grey-2);letter-spacing:1px;margin-bottom:18px;line-height:1.5;}
.entry .qr-holder{width:260px;height:260px;margin:0 auto;background:#fff;padding:14px;border:1px solid var(--line);}
.entry .qr-holder canvas{width:100%;height:100%;display:block;}
.entry .who{margin-top:18px;font-family:"Noto Serif TC",serif;font-size:18px;color:var(--ink);font-weight:700;letter-spacing:2px;}
.entry .who-en{font-size:11px;letter-spacing:3px;color:var(--grey-3);margin-top:4px;}
.steps-band{margin:32px 60px 0;padding:24px 28px;background:var(--forest-deep);color:#fff;}
.steps-band .band-title{font-family:"Noto Serif TC",serif;font-size:16px;letter-spacing:4px;color:var(--ferrari);margin-bottom:16px;text-align:center;font-weight:700;}
.steps-band .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;position:relative;}
.steps-band .step{text-align:center;padding:0 8px;position:relative;}
.steps-band .step .num{width:32px;height:32px;border-radius:50%;background:var(--ferrari);color:#fff;font-family:"Noto Serif TC",serif;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;}
.steps-band .step h4{font-family:"Noto Serif TC",serif;font-size:15px;margin-bottom:4px;font-weight:700;letter-spacing:2px;}
.steps-band .step p{font-size:11px;opacity:0.85;line-height:1.5;letter-spacing:0.5px;}
.steps-band .step:not(:last-child)::after{content:"→";position:absolute;right:-12px;top:6px;color:var(--ferrari);font-size:18px;font-weight:900;}
.values{padding:24px 60px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.value{text-align:center;padding:14px;border:1px dashed var(--forest);background:rgba(232,245,233,0.5);}
.value .icon{font-family:"Noto Serif TC",serif;font-size:26px;color:var(--ferrari);font-weight:900;margin-bottom:6px;}
.value h4{font-family:"Noto Serif TC",serif;font-size:15px;color:var(--forest-deep);letter-spacing:2px;font-weight:700;margin-bottom:4px;}
.value p{font-size:11px;color:var(--grey-1);line-height:1.5;}
.poster-footer{position:absolute;bottom:0;left:0;right:0;background:var(--forest-deep);color:#fff;padding:20px 60px;display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:1.5px;}
.poster-footer .brand{font-family:"Noto Serif TC",serif;font-size:16px;font-weight:700;letter-spacing:3px;}
.poster-footer .brand em{color:var(--ferrari);font-style:normal;}
.poster-footer .hotline{font-family:"Space Grotesk",sans-serif;font-size:14px;letter-spacing:2px;color:var(--ferrari);font-weight:700;}
@media print{body{background:#fff;padding:0;}.controls{display:none!important;}.poster{box-shadow:none;}@page{size:A2 portrait;margin:0;}}
</style>`) + `
<body>
<div class="controls">
  <h4>▶ QR Code 設定</h4>
  <label>主卡表單網址 <input id="urlMain" type="text" value="https://coeldery85.com/join"></label>
  <label>附屬卡表單網址 <input id="urlSub" type="text" value="https://coeldery85.com/join-family"></label>
  <button class="btn" onclick="regen()">更新 QR</button>
  <button class="btn" onclick="window.print()" style="background:var(--ferrari);margin-left:6px;">列印/PDF</button>
  <div class="hint">▸ 更改網址後按「更新 QR」<br>▸ 列印時建議 A2 / A3 尺寸</div>
</div>
<div class="poster-wrap">
<div class="poster">
  <div class="poster-header">
    <div class="logo-chip">CoEldery <em>85</em> 老有聯盟</div>
    <div class="tagline">
      <div class="l1">香港銀髮經濟的<br>系統性重構</div>
      <div class="l2">不是解決老齡化 · 是解放第二人生</div>
    </div>
  </div>
  <div class="poster-main">
    <div class="kicker">◆ 免費入會 · 即刻登記 ◆</div>
    <h1>加入我哋 · <span class="red">共同擁有</span></h1>
    <div class="subline">每一位長者 · 都係共同創辦人</div>
    <div class="rule"></div>
  </div>
  <div class="entries">
    <div class="entry main">
      <div class="step-badge">55 歲或以上</div>
      <h2>長者主卡</h2>
      <div class="sub-desc">CoEldery 85 主要成員<br>可累積利潤分成資格</div>
      <div class="qr-holder"><canvas id="qrMain"></canvas></div>
      <div class="who">用你嘅手機掃我</div>
      <div class="who-en">SCAN WITH YOUR PHONE CAMERA</div>
    </div>
    <div class="entry sub">
      <div class="step-badge">家人 &lt; 55 歲</div>
      <h2>家庭同行卡</h2>
      <div class="sub-desc">畀你嘅子女 / 家人<br>用消費支持屋企長輩</div>
      <div class="qr-holder"><canvas id="qrSub"></canvas></div>
      <div class="who">用你嘅手機掃我</div>
      <div class="who-en">SCAN WITH YOUR PHONE CAMERA</div>
    </div>
  </div>
  <div class="steps-band">
    <div class="band-title">◆ 三十秒完成登記 · 即刻攞卡 ◆</div>
    <div class="steps">
      <div class="step"><div class="num">1</div><h4>用手機掃碼</h4><p>打開手機相機<br>對準上方 QR</p></div>
      <div class="step"><div class="num">2</div><h4>填名+電話</h4><p>只需姓名同<br>WhatsApp 電話</p></div>
      <div class="step"><div class="num">3</div><h4>即時發卡</h4><p>手機收到<br>數碼會員卡</p></div>
      <div class="step"><div class="num">4</div><h4>加入銀包</h4><p>Apple Wallet<br>Google Wallet</p></div>
    </div>
  </div>
  <div class="values">
    <div class="value"><div class="icon">85</div><h4>85% 利潤回饋</h4><p>公司 85% 利潤<br>回歸長者社群</p></div>
    <div class="value"><div class="icon">$0</div><h4>入會全免費</h4><p>無入會費<br>無年費 · 無隱藏收費</p></div>
    <div class="value"><div class="icon">◆</div><h4>消費即參與</h4><p>日常買嘢<br>就係共同擁有嘅一份</p></div>
  </div>
  <div class="poster-footer">
    <div><div class="brand">CoEldery <em>85</em> 老有聯盟</div><div class="site" style="opacity:0.85;font-size:11px;margin-top:4px;">www.coeldery85.com</div></div>
    <div class="hotline">☎ 有疑問？WhatsApp: 9147-7341</div>
  </div>
</div>
</div>
<script>
function regen(){
  QRCode.toCanvas(document.getElementById('qrMain'),document.getElementById('urlMain').value,{width:232,margin:1,color:{dark:'#0d3e12',light:'#ffffff'},errorCorrectionLevel:'H'},function(err){if(err)console.error(err);});
  QRCode.toCanvas(document.getElementById('qrSub'),document.getElementById('urlSub').value,{width:232,margin:1,color:{dark:'#a80000',light:'#ffffff'},errorCorrectionLevel:'H'},function(err){if(err)console.error(err);});
}
regen();
</script>
</body></html>`
}

// ─── SOP HTML (simplified) ────────────────────────────────────────────────────
function sopHtml() {
  return htmlHead('Roadshow 作戰手冊') + `
<body style="background:#f4f4f0;padding:40px 24px;">
<div style="max-width:800px;margin:0 auto;">
  <div style="background:var(--forest-deep);color:#fff;padding:32px 40px;margin-bottom:32px;">
    <div style="font-size:11px;letter-spacing:4px;color:var(--ferrari);margin-bottom:12px;">◆ ROADSHOW SOP</div>
    <h1 style="font-family:'Noto Serif TC',serif;font-size:32px;font-weight:900;letter-spacing:4px;">CoEldery 85<br>作戰手冊</h1>
    <p style="opacity:0.8;margin-top:12px;font-size:14px;">Roadshow 現場操作指引 · 2026</p>
  </div>

  ${['準備工作（前一天）','到場設置（開始前 30 分鐘）','現場操作流程','處理特殊情況','收場工作'].map((title, i) => `
  <div style="background:#fff;padding:32px 36px;margin-bottom:16px;position:relative;">
    <div style="position:absolute;top:24px;right:32px;font-family:'Noto Serif TC',serif;font-size:80px;color:var(--forest-pale);font-weight:900;line-height:1;">${String(i+1).padStart(2,'0')}</div>
    <div style="font-size:11px;letter-spacing:3px;color:var(--ferrari);font-weight:700;margin-bottom:8px;">◆ STEP ${String(i+1).padStart(2,'0')}</div>
    <h2 style="font-family:'Noto Serif TC',serif;font-size:22px;color:var(--forest-deep);margin-bottom:16px;">${title}</h2>
    ${i===0?`<ul style="font-size:14px;line-height:2;color:var(--grey-1);padding-left:20px;">
      <li>確認 <strong>poster.html</strong> QR code 指向正確網址</li>
      <li>列印 A2/A3 海報至少 3 張，A4 備用版 10 張</li>
      <li>測試報名流程：用自己電話掃 QR → 填表 → 確認收到會員編號</li>
      <li>確認 WhatsApp 客服號碼可以接收查詢</li>
      <li>帶備：poster.html 網址、admin 後台網址、充電器</li>
    </ul>`:
    i===1?`<ul style="font-size:14px;line-height:2;color:var(--grey-1);padding-left:20px;">
      <li>張貼海報，確保 QR code 清晰可見（建議高度：130-160cm）</li>
      <li>打開 admin 後台，確認資料庫連接正常</li>
      <li>準備 demo 用手機，預先打開報名頁面</li>
      <li>確認自己的電話有網絡連接</li>
    </ul>`:
    i===2?`<div style="font-size:14px;line-height:1.8;color:var(--grey-1);">
      <div style="padding:12px 16px;background:var(--forest-pale);border-left:3px solid var(--forest);margin-bottom:12px;"><strong>① 客人到攤位</strong>：介紹老有聯盟，問「請問你 55 歲以上嗎？」</div>
      <div style="padding:12px 16px;background:var(--forest-pale);border-left:3px solid var(--forest);margin-bottom:12px;"><strong>② 引導掃碼</strong>：指向海報 QR，「用手機相機掃呢個 QR，填名同電話就完成」</div>
      <div style="padding:12px 16px;background:var(--forest-pale);border-left:3px solid var(--forest);margin-bottom:12px;"><strong>③ 輔助填表</strong>：長者如有困難，幫佢填，但確認每個資料都係本人核實</div>
      <div style="padding:12px 16px;background:var(--forest-pale);border-left:3px solid var(--forest);margin-bottom:12px;"><strong>④ 確認成功</strong>：見到「登記成功！」畫面，請客人截圖或儲存</div>
    </div>`:
    i===3?`<ul style="font-size:14px;line-height:2;color:var(--grey-1);padding-left:20px;">
      <li>電話號碼已登記：查詢後台，提供已有編號</li>
      <li>客人唔識用手機：幫佢填，但須客人口頭確認姓名和電話</li>
      <li>網絡問題：切換 4G/5G 熱點，或記錄在紙本，事後補錄</li>
      <li>有疑問：引導聯絡 WhatsApp 客服</li>
    </ul>`:
    `<ul style="font-size:14px;line-height:2;color:var(--grey-1);padding-left:20px;">
      <li>登入 admin 後台，確認當日登記人數</li>
      <li>截圖統計數字記錄（總數、主卡、家庭同行卡）</li>
      <li>收起海報，妥善存放</li>
      <li>向團隊匯報當日成果</li>
    </ul>`}
  </div>`).join('')}

  <div style="background:var(--ferrari);color:#fff;padding:24px 32px;border-radius:4px;">
    <div style="font-size:11px;letter-spacing:3px;margin-bottom:8px;opacity:0.8;">◆ 緊急聯絡</div>
    <div style="font-family:'Noto Serif TC',serif;font-size:18px;font-weight:700;">技術問題 / 系統故障</div>
    <div style="margin-top:8px;font-size:14px;opacity:0.9;">WhatsApp 技術支援：<strong>9147-7341</strong><br>後台管理：<a href="/membership/admin" style="color:#FFD86B;">coeldery85.com/admin</a></div>
  </div>
</div>
</body></html>`
}

// ─── Member Profile HTML ──────────────────────────────────────────────────────
function memberProfileHtml(m: any, medStatus: string | null = null, medCardNo: string | null = null) {
  const isPrimary = m.tier === 'PRIMARY'
  const forestDeep = '#0d3e12', forest = '#2E7D32'
  const ferrari = '#C62828', ferrariDeep = '#8B0000'
  const accentDark = isPrimary ? forestDeep : ferrariDeep
  const accentMid  = isPrimary ? forest     : ferrari
  const expYear = m.expires_at ? m.expires_at.slice(0,4) : ''
  const expMonth = m.expires_at ? m.expires_at.slice(5,7) : ''
  const expDisp = expMonth && expYear ? `${expMonth} / ${expYear}` : '—'
  const kycLabel: Record<string,string> = { PENDING:'待核實', VERIFIED:'已核實', REJECTED:'未通過' }
  const roleLabel: Record<string,string> = { CoExplorery:'探索者', CoFounder:'創始人', CoChampion:'支持者' }
  // Watermark: show if user has NOT clicked any WA button, OR admin flagged re_verify
  const showWatermark = !m.wa_clicked_at || (m.re_verify === 1 || m.re_verify === true)

  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${m.name_zh} · 老有卡 · CoEldery 85</title>
<!-- PWA -->
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#228B22">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="CoEldery 85">
<link rel="apple-touch-icon" href="/icon-192.png">
<!-- /PWA -->
<link rel="stylesheet" href="/shared.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Noto+Serif+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&family=Montserrat:wght@700;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#F0EBD8;min-height:100vh;font-size:20px;font-family:"Noto Sans TC",sans-serif;line-height:1.6;}
.topbar{background:${accentDark};color:#fff;padding:14px 20px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10;}
.topbar .mark{width:36px;height:36px;background:${accentMid};border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:"Noto Serif TC",serif;font-weight:900;font-size:16px;}
.topbar .title{font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;letter-spacing:2px;}
.topbar .no{font-family:"Space Grotesk",monospace;font-size:18px;opacity:0.7;margin-top:2px;}
.wrap{max-width:480px;margin:0 auto;padding:20px 16px 40px;}

/* ── Card canvas area ── */
.card-wrap{margin-bottom:16px;text-align:center;}
.card-wrap canvas{display:none;}
.card-wrap img#cardImg{width:100%;max-width:420px;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,0.2);}
.card-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
.card-btn{padding:13px 8px;background:#fff;border:2px solid ${accentMid};color:${accentDark};font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;letter-spacing:1px;cursor:pointer;border-radius:6px;text-align:center;text-decoration:none;display:block;min-height:55px;}
.card-btn.primary{background:${accentDark};color:#fff;border-color:${accentDark};}
.card-btn.wa{background:#25D366;border-color:#25D366;color:#fff;grid-column:1/-1;font-size:20px;}

/* ── Info sections ── */
.section{background:#fff;border-radius:8px;padding:20px;margin-bottom:14px;}
.section-title{font-family:"Noto Serif TC",serif;font-size:18px;color:${accentMid};letter-spacing:3px;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #eee;}
.info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f5f5f5;}
.info-row:last-child{border-bottom:none;}
.info-label{font-size:18px;color:#999;letter-spacing:1px;}
.info-value{font-size:20px;color:#333;font-weight:500;text-align:right;}
.info-value.big{font-family:"Space Grotesk",monospace;font-size:22px;font-weight:700;color:${accentDark};}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:18px;font-weight:700;letter-spacing:1px;}
.badge.green{background:#E8F5E9;color:${forestDeep};}
.badge.red{background:#FFEBEE;color:${ferrariDeep};}
.badge.grey{background:#f5f5f5;color:#666;}
.badge.yellow{background:#FFF9C4;color:#795548;}

/* ── Family cards list ── */
.family-card{background:#fff9f9;border:1px solid #FFCDD2;border-radius:8px;padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.family-card .fc-name{font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;color:${ferrariDeep};}
.family-card .fc-no{font-family:"Space Grotesk",monospace;font-size:18px;color:#999;}
.family-card .fc-link{padding:6px 14px;background:${ferrari};color:#fff;border-radius:4px;font-size:18px;font-weight:700;text-decoration:none;}
.add-family-btn{width:100%;padding:15px;background:#fff;border:2px dashed ${ferrari};color:${ferrari};font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;letter-spacing:2px;cursor:pointer;border-radius:8px;text-align:center;text-decoration:none;display:block;margin-top:4px;min-height:55px;}

/* ── Edit form ── */
.edit-section{display:none;}
.edit-section.open{display:block;}
.field{margin-bottom:16px;}
.field label{display:block;font-family:"Noto Serif TC",serif;font-size:18px;color:${accentDark};font-weight:700;letter-spacing:1px;margin-bottom:6px;}
.field input,.field select{width:100%;padding:12px 14px;border:2px solid #e0e0e0;border-radius:6px;font-size:20px;font-family:inherit;color:#333;background:#fff;transition:border 0.2s;min-height:55px;}
.field input:focus,.field select:focus{outline:0;border-color:${accentMid};}
.save-btn{width:100%;padding:16px;background:${accentDark};color:#fff;border:0;border-radius:6px;font-size:20px;font-family:"Noto Serif TC",serif;font-weight:700;letter-spacing:3px;cursor:pointer;margin-top:8px;min-height:55px;}
.cancel-btn{width:100%;padding:12px;background:transparent;border:2px solid #ccc;color:#999;border-radius:6px;font-size:18px;font-family:inherit;cursor:pointer;margin-top:8px;}
.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:30px;font-size:18px;opacity:0;transition:opacity 0.3s;z-index:100;pointer-events:none;}
.toast.show{opacity:1;}
.toggle-edit-btn{background:none;border:none;color:${accentMid};font-size:18px;font-family:"Noto Serif TC",serif;cursor:pointer;font-weight:700;letter-spacing:1px;text-decoration:underline;padding:0;}

/* ── Medical card block ── */
.med-section{background:#fff;border-radius:8px;padding:20px;margin-bottom:14px;border:1.5px solid #90CAF9;}
.med-section-title{font-family:"Noto Serif TC",serif;font-size:18px;color:#1565C0;letter-spacing:3px;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #e3f2fd;}
.med-status-badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:18px;font-weight:700;letter-spacing:1px;}
.med-status-badge.pending{background:#FFF8E1;color:#F57F17;}
.med-status-badge.sent{background:#E3F2FD;color:#1565C0;}
.med-status-badge.issued{background:#E8F5E9;color:#1B5E20;}
.med-status-badge.declined{background:#FFEBEE;color:#B71C1C;}
.med-apply-btn{width:100%;padding:15px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:2px;cursor:pointer;min-height:55px;}
.med-apply-btn:disabled{background:#90CAF9;cursor:not-allowed;}
.med-form{display:none;margin-top:16px;}
.med-form.open{display:block;}
.med-field{margin-bottom:14px;}
.med-field label{display:block;font-size:18px;color:#1565C0;font-weight:700;margin-bottom:5px;font-family:"Noto Serif TC",serif;}
.med-field input{width:100%;padding:12px 14px;border:2px solid #90CAF9;border-radius:6px;font-size:20px;font-family:inherit;color:#333;min-height:55px;}
.med-field input:focus{outline:0;border-color:#1565C0;}
.med-submit-btn{width:100%;padding:14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:2px;cursor:pointer;margin-top:4px;min-height:55px;}
.med-submit-btn:disabled{background:#90CAF9;cursor:not-allowed;}
.med-err{color:#C62828;font-size:20px;margin-top:8px;display:none;font-weight:700;}
.med-err.show{display:block;}
.med-success{background:#E8F5E9;border:1.5px solid #4CAF50;border-radius:6px;padding:12px 14px;font-size:20px;color:#1B5E20;display:none;margin-top:12px;line-height:1.7;}
.med-success.show{display:block;}

/* ── Family linking block ── */
.fam-section{background:#fff;border-radius:8px;padding:20px;margin-bottom:14px;border:1.5px solid #A5D6A7;}
.fam-section-title{font-family:"Noto Serif TC",serif;font-size:18px;color:${forestDeep};letter-spacing:3px;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #E8F5E9;}
.fam-tab-bar{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:16px;border-radius:6px;overflow:hidden;border:1.5px solid #A5D6A7;}
.fam-tab{padding:10px 4px;text-align:center;font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;cursor:pointer;border:none;background:#F1F8E9;color:${forestDeep};letter-spacing:1px;transition:all 0.15s;min-height:55px;}
.fam-tab.active{background:${forestDeep};color:#fff;}
.fam-panel{display:none;}
.fam-panel.active{display:block;}
.fam-field{margin-bottom:14px;}
.fam-field label{display:block;font-size:18px;color:${forestDeep};font-weight:700;margin-bottom:5px;font-family:"Noto Serif TC",serif;letter-spacing:0.5px;}
.fam-field input,.fam-field select{width:100%;padding:12px 14px;border:2px solid #C8E6C9;border-radius:6px;font-size:20px;font-family:inherit;color:#333;min-height:55px;}
.fam-field input:focus,.fam-field select:focus{outline:0;border-color:${forestDeep};}
.fam-submit-btn{width:100%;padding:14px;background:${forestDeep};color:#fff;border:0;border-radius:6px;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:2px;cursor:pointer;margin-top:4px;min-height:55px;}
.fam-submit-btn:disabled{background:#A5D6A7;cursor:not-allowed;}
.fam-open-btn{width:100%;padding:14px;background:#fff;color:${forestDeep};border:2px solid ${forestDeep};border-radius:6px;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:1px;cursor:pointer;min-height:55px;}
.fam-err{color:#C62828;font-size:20px;margin-top:8px;display:none;font-weight:700;}
.fam-err.show{display:block;}
.fam-success{background:#E8F5E9;border:1.5px solid #4CAF50;border-radius:6px;padding:12px 14px;font-size:20px;color:#1B5E20;display:none;margin-top:12px;line-height:1.7;}
.fam-success.show{display:block;}
.fam-linked-info{background:#F1F8E9;border:1.5px solid #A5D6A7;border-radius:6px;padding:12px 14px;font-size:20px;color:${forestDeep};line-height:1.7;}
</style>
</head>
<body>

<!-- Top bar -->
<div class="topbar">
  <div class="mark">${isPrimary ? '老' : '家'}</div>
  <div>
    <div class="title">CoEldery 85 · ${isPrimary ? '老有卡' : '家庭同行卡'}</div>
    <div class="no">${m.member_no}</div>
  </div>
</div>

<div class="wrap">

  <!-- ── 會員卡圖片 ── -->
  <div class="card-wrap" style="position:relative;">
    <canvas id="offCanvas"></canvas>
    <img id="cardImg" alt="會員卡" style="opacity:0;transition:opacity 0.3s;">
    <!-- Pending verification watermark overlay — hidden if wa_clicked_at set AND not re_verify -->
    <div id="pendingWatermark" style="position:absolute;inset:0;border-radius:14px;display:${showWatermark ? 'flex' : 'none'};flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.38);pointer-events:none;">
      <div style="color:#fff;font-size:18px;font-weight:900;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.7);background:rgba(0,0,0,0.45);padding:8px 18px;border-radius:6px;border:2px solid rgba(255,255,255,0.6);">⏳ 待驗證</div>
      <div style="color:#ffe082;font-size:18px;font-weight:700;margin-top:6px;text-shadow:0 1px 4px rgba(0,0,0,0.8);">點擊下方按鈕完成驗證</div>
    </div>
  </div>
  <!-- WA Verification block — shown only when watermark is showing -->
  <div id="waVerifyBlock" style="display:${showWatermark ? 'block' : 'none'};margin:10px 0 14px;background:#f0faf3;border:1.5px solid #25D366;border-radius:8px;padding:14px;">
    <div style="font-size:20px;font-weight:700;color:#1a5c2a;margin-bottom:10px;text-align:center;">📲 發 WhatsApp 完成身份驗證</div>
    <div id="waVerifyMsgPreview" style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:9px 11px;font-size:18px;color:#333;margin-bottom:12px;line-height:1.6;"></div>
    <!-- Button 1: Normal WhatsApp — open WA, records channel=ICON, visibilitychange/pageshow hides watermark -->
    <button id="waVerifyBtn" onclick="openWA()"
      style="display:block;width:100%;box-sizing:border-box;background:#25D366;color:#fff;font-size:20px;font-weight:700;padding:16px 8px;border-radius:8px;border:none;cursor:pointer;text-align:center;margin-bottom:8px;min-height:55px;">
      💬 我有 WhatsApp — 發送驗證訊息
    </button>
    <!-- Button 2: WA Business — fake 2.5s flow, records channel=BIZ -->
    <button id="waBizBtn" onclick="openWABiz()"
      style="display:block;width:100%;box-sizing:border-box;background:#fff;color:#1a5c2a;font-size:18px;font-weight:700;padding:14px 8px;border-radius:8px;border:1.5px solid #25D366;cursor:pointer;text-align:center;min-height:55px;">
      📱 我用 WhatsApp Business
    </button>
    <div id="waSendingMsg" style="display:none;text-align:center;margin-top:10px;font-size:18px;color:#388E3C;font-weight:600;">📤 正在提交驗證...</div>
  </div>
  <!-- Banner: after WA sent (icon or biz) -->
  <div id="waSentBanner" style="display:none;margin:0 0 14px;background:#e8f5e9;border:1.5px solid #4caf50;border-radius:8px;padding:12px 14px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#2E7D32;">📤 驗證訊息已發送！</div>
    <div style="font-size:18px;color:#388E3C;margin-top:4px;">Admin 收到後將確認你的會籍，感謝你！</div>
  </div>

  <!-- ── 卡片操作 ── -->
  <div class="card-actions">
    <button class="card-btn" onclick="saveCardImage()">💾 儲存卡圖</button>
    <button class="card-btn" onclick="shareMyCard()" style="min-height:55px;font-size:20px;font-weight:900;">📤 分享我張卡</button>
    <button class="card-btn wa" onclick="inviteFriend()" style="min-height:55px;font-size:20px;font-weight:900;">
      👥 邀請朋友加入
    </button>
  </div>

  <!-- ── 會員資料 ── -->
  <div class="section">
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleMemberInfo()">
      <span>◆ 會員資料</span>
      <span style="display:flex;align-items:center;gap:10px;">
        <button class="toggle-edit-btn" id="editToggleBtn" style="display:none;" onclick="event.stopPropagation();toggleEdit()">✏️ 編輯</button>
        <span id="memberInfoArrow" style="font-size:22px;color:#2E7D32;line-height:1;user-select:none;">▼</span>
      </span>
    </div>

    <!-- 顯示模式（預設收起）-->
    <div id="viewMode" style="display:none;">
      <div class="info-row">
        <span class="info-label">中文姓名</span>
        <span class="info-value" style="font-family:'Noto Serif TC',serif;font-size:20px;font-weight:700;color:${accentDark};">${m.name_zh}</span>
      </div>
      <div class="info-row">
        <span class="info-label">英文姓名</span>
        <span class="info-value" id="vNameEn">${m.name_en || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">會員編號</span>
        <span class="info-value big">${m.member_no}</span>
      </div>
      <div class="info-row">
        <span class="info-label">類別</span>
        <span class="info-value">
          <span class="badge ${isPrimary ? 'green' : 'red'}">${isPrimary ? '長者主卡' : '家庭同行卡'}</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">身份</span>
        <span class="info-value">
          <span class="badge green">${roleLabel[m.role] || m.role}</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">KYC 狀態</span>
        <span class="info-value">
          <span class="badge ${m.kyc_status === 'VERIFIED' ? 'green' : m.kyc_status === 'REJECTED' ? 'red' : 'yellow'}">${kycLabel[m.kyc_status] || m.kyc_status}</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">有效期至</span>
        <span class="info-value big">${expDisp}</span>
      </div>
      <div class="info-row">
        <span class="info-label">性別</span>
        <span class="info-value" id="vGender">${m.gender === 'M' ? '男' : m.gender === 'F' ? '女' : m.gender === 'X' ? '其他' : '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">出生年份</span>
        <span class="info-value" id="vBirthYear">${m.birth_year || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">居住地區</span>
        <span class="info-value" id="vDistrict">${m.district || '—'}</span>
      </div>
      ${m.parent_no ? `
      <div class="info-row">
        <span class="info-label">主卡會員</span>
        <span class="info-value"><a href="/membership/card/${m.parent_no}" style="color:${ferrari};font-weight:700;">${m.parent_no}${m.parent_name ? ' · '+m.parent_name : ''}</a></span>
      </div>` : ''}
      <div class="info-row">
        <span class="info-label">登記日期</span>
        <span class="info-value">${m.created_at ? m.created_at.slice(0,10) : '—'}</span>
      </div>
    </div>

    <!-- 編輯模式 -->
    <div id="editMode" class="edit-section">
      <div class="field">
        <label>英文姓名</label>
        <input id="eNameEn" type="text" placeholder="例：CHAN TAI MAN" value="${m.name_en || ''}" style="text-transform:uppercase;">
      </div>
      <div class="field">
        <label>性別</label>
        <select id="eGender">
          <option value="">— 請選擇 —</option>
          <option value="M" ${m.gender==='M'?'selected':''}>男 M</option>
          <option value="F" ${m.gender==='F'?'selected':''}>女 F</option>
          <option value="X" ${m.gender==='X'?'selected':''}>其他</option>
        </select>
      </div>
      <div class="field">
        <label>出生年份</label>
        <input id="eBirthYear" type="number" placeholder="例：1960" min="1920" max="2010" value="${m.birth_year || ''}">
      </div>
      <div class="field">
        <label>居住地區</label>
        <select id="eDistrict">
          <option value="">— 請選擇 —</option>
          ${['中西區','灣仔','東區','南區','油尖旺','深水埗','九龍城','黃大仙','觀塘','荃灣','屯門','元朗','北區','大埔','沙田','西貢','葵青','離島'].map(d=>`<option value="${d}" ${m.district===d?'selected':''}>${d}</option>`).join('')}
        </select>
      </div>
      <button class="save-btn" onclick="saveProfile()">儲存更新</button>
      <button class="cancel-btn" onclick="toggleEdit()">取消</button>
    </div>
  </div>

  ${isPrimary ? `
  <!-- ── 家庭同行卡 ── -->
  <div class="section">
    <div class="section-title">◆ 家庭同行卡</div>
    <div id="familyList">
      <div style="text-align:center;color:#aaa;padding:10px;font-size:18px;">載入中…</div>
    </div>

    <!-- 新增家庭同行卡表單 -->
    <button class="add-family-btn" id="addFamBtn" onclick="toggleAddFamForm()">＋ 為家人申請家庭同行卡</button>
    <div id="addFamForm" style="display:none;margin-top:16px;">
      <div class="fam-field">
        <label>家人姓名／稱呼 <span style="color:#C62828;">✽ 必填</span></label>
        <input id="afNameZh" type="text" placeholder="填佢嘅名或稱呼（中英文都得）" style="border-color:#FFCDD2;">
      </div>
      <div class="fam-field">
        <label>WhatsApp 電話 <span style="color:#C62828;">✽ 必填</span></label>
        <input id="afPhone" type="tel" inputmode="numeric" maxlength="8" placeholder="例：91234567" style="border-color:#FFCDD2;">
      </div>
      <div class="fam-field">
        <label>性別 <span style="color:#C62828;">✽ 必填</span></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button type="button" id="afGenderM" onclick="setAfGender('M',this)" style="padding:14px 4px;min-height:55px;border:2px solid #FFCDD2;background:#fff;text-align:center;cursor:pointer;font-size:20px;font-family:inherit;color:#333;border-radius:6px;font-weight:600;">男 M</button>
          <button type="button" id="afGenderF" onclick="setAfGender('F',this)" style="padding:14px 4px;min-height:55px;border:2px solid #FFCDD2;background:#fff;text-align:center;cursor:pointer;font-size:20px;font-family:inherit;color:#333;border-radius:6px;font-weight:600;">女 F</button>
        </div>
      </div>
      <div class="fam-field">
        <label>出生年份 <span style="color:#C62828;">✽ 必填</span></label>
        <select id="afBirthYear" style="border-color:#FFCDD2;">
          <option value="">— 請選擇 —</option>
          ${(()=>{const opts=[];for(let y=2010;y>=1930;y--){opts.push(`<option value="${y}">${y}</option>`);}return opts.join('');})()}
        </select>
      </div>
      <div class="fam-field">
        <label>居住地區 <span style="color:#C62828;">✽ 必填</span></label>
        <select id="afDistrict" style="border-color:#FFCDD2;">
          <option value="">— 請選擇 —</option>
          ${['中西區','灣仔','東區','南區','油尖旺','深水埗','九龍城','黃大仙','觀塘','荃灣','屯門','元朗','北區','大埔','沙田','西貢','葵青','離島'].map(d=>`<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>
      <div class="fam-field" id="afParentLinkedField" style="display:none;">
        <label>已連結主卡</label>
        <div style="padding:12px 14px;background:#fff9f9;border:2px solid #FFCDD2;border-radius:6px;font-size:18px;font-weight:700;color:#8B0000;">✅ 已連結：${m.name_zh}（${m.member_no}）</div>
      </div>
      <div class="fam-field">
        <label>你與家人的關係 <span style="color:#C62828;">✽ 必填</span></label>
        <select id="afRelation" style="border-color:#FFCDD2;">
          <option value="">— 請選擇 —</option>
          <option>子女</option><option>配偶</option><option>孫</option>
          <option>外孫</option><option>兄弟姊妹</option><option>其他</option>
        </select>
      </div>
      <div class="fam-err" id="afErr" style="color:#C62828;font-size:20px;margin-top:8px;display:none;font-weight:700;"></div>
      <button type="button" id="afSubmitBtn" onclick="submitAfForm()" style="width:100%;padding:14px;background:#C62828;color:#fff;border:0;border-radius:6px;font-family:'Noto Serif TC',serif;font-size:20px;font-weight:700;letter-spacing:2px;cursor:pointer;margin-top:4px;min-height:55px;">新增家庭同行卡</button>
    </div>
    <div id="afSuccess" style="display:none;background:#E8F5E9;border:1.5px solid #4CAF50;border-radius:6px;padding:12px 14px;font-size:20px;color:#1B5E20;margin-top:12px;line-height:1.7;"></div>
  </div>` : ''}

  <!-- ── 醫健卡區塊 ── -->
  <div class="med-section">
    <div class="med-section-title">🏥 醫健卡</div>
    ${medCardNo ? (() => {
      // Split name_en into surname / given name
      const nameEnFull = (m.name_en || '').trim().toUpperCase()
      const nameParts = nameEnFull.split(/\s+/).filter((p: string) => p.length > 0)
      const hasTwoParts = nameParts.length >= 2
      const surnamePart  = hasTwoParts ? nameParts[0] : ''
      const givenPart    = hasTwoParts ? nameParts.slice(1).join(' ') : ''
      return `
    <div style="font-size:20px;font-weight:700;color:#1565C0;margin-bottom:10px;">你的醫健卡號碼</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
      <span id="medCardNoDisplay" style="font-size:28px;font-weight:900;color:#1B5E20;letter-spacing:3px;font-family:'Space Grotesk',monospace;">${medCardNo}</span>
      <button onclick="copyMedCardNo()" id="copyMedCardBtn" style="padding:10px 18px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer;min-height:44px;white-space:nowrap;">複製卡號</button>
    </div>
    <div style="font-size:18px;color:#546E7A;margin-bottom:16px;line-height:1.6;">你的醫健卡會透過 WhatsApp 發送給你</div>
    <a href="https://www.hmmp.com.hk/DefaultDoctorList_cn.aspx" target="_blank" rel="noopener"
      style="display:block;width:100%;min-height:55px;padding:14px;background:#2E7D32;color:#fff;border:0;border-radius:8px;font-size:20px;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;line-height:1.4;margin-bottom:18px;">
      🩺 查睇醫生名單
    </a>
    <div style="background:#E8F5E9;border:1.5px solid #A5D6A7;border-radius:8px;padding:16px 18px;">
      <div style="font-size:20px;font-weight:700;color:#1B5E20;margin-bottom:12px;">🔐 HMMP 系統登入步驟</div>
      <ol style="padding-left:20px;font-size:20px;line-height:2;color:#1B5E20;">
        <li style="margin-bottom:10px;">
          <span style="font-weight:700;">登入名稱：</span>你的醫健卡號碼<br>
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap;">
            <span style="font-size:22px;font-weight:900;letter-spacing:3px;color:#0D47A1;font-family:'Space Grotesk',monospace;">${medCardNo}</span>
            <button onclick="copyMedCardNo2()" id="copyMedCardBtn2" style="padding:8px 14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer;white-space:nowrap;">複製</button>
          </div>
        </li>
        ${hasTwoParts ? `
        <li style="margin-bottom:10px;">
          <span style="font-weight:700;">姓氏：</span>${surnamePart}<br>
          <button onclick="copySurname()" id="copySurnameBtn" style="margin-top:4px;padding:8px 14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer;white-space:nowrap;">複製</button>
        </li>
        <li style="margin-bottom:10px;">
          <span style="font-weight:700;">名稱：</span>${givenPart}<br>
          <button onclick="copyGivenName()" id="copyGivenBtn" style="margin-top:4px;padding:8px 14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer;white-space:nowrap;">複製</button>
        </li>
        ` : `
        <li style="margin-bottom:10px;">
          <span style="font-weight:700;">英文全名：</span>${nameEnFull}<br>
          <button onclick="copyFullEnName()" id="copyFullEnBtn" style="margin-top:4px;padding:8px 14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer;white-space:nowrap;">複製</button>
        </li>
        `}
        <li style="margin-bottom:10px;"><span style="font-weight:700;">電郵地址：</span><span style="color:#78909C;">不用填</span></li>
        <li><span style="font-weight:700;">按「登入」</span></li>
      </ol>
    </div>
    <script>
    var _medCardNo = '${medCardNo.replace(/'/g, "\\'")}';
    var _medSurname = '${surnamePart.replace(/'/g, "\\'")}';
    var _medGiven = '${givenPart.replace(/'/g, "\\'")}';
    var _medFullEn = '${nameEnFull.replace(/'/g, "\\'")}';
    function copyMedCardNo() {
      navigator.clipboard.writeText(_medCardNo).then(function() {
        var b = document.getElementById("copyMedCardBtn");
        if(b){ b.textContent="已複製 ✓"; b.style.background="#2E7D32"; setTimeout(function(){ b.textContent="複製卡號"; b.style.background="#1565C0"; }, 2000); }
      }).catch(function() { alert(_medCardNo); });
    }
    function copyMedCardNo2() {
      navigator.clipboard.writeText(_medCardNo).then(function() {
        var b = document.getElementById("copyMedCardBtn2");
        if(b){ b.textContent="已複製 ✓"; b.style.background="#2E7D32"; setTimeout(function(){ b.textContent="複製"; b.style.background="#1565C0"; }, 2000); }
      }).catch(function() { alert(_medCardNo); });
    }
    function copySurname() {
      navigator.clipboard.writeText(_medSurname).then(function() {
        var b = document.getElementById("copySurnameBtn");
        if(b){ b.textContent="已複製 ✓"; b.style.background="#2E7D32"; setTimeout(function(){ b.textContent="複製"; b.style.background="#1565C0"; }, 2000); }
      }).catch(function() { alert(_medSurname); });
    }
    function copyGivenName() {
      navigator.clipboard.writeText(_medGiven).then(function() {
        var b = document.getElementById("copyGivenBtn");
        if(b){ b.textContent="已複製 ✓"; b.style.background="#2E7D32"; setTimeout(function(){ b.textContent="複製"; b.style.background="#1565C0"; }, 2000); }
      }).catch(function() { alert(_medGiven); });
    }
    function copyFullEnName() {
      navigator.clipboard.writeText(_medFullEn).then(function() {
        var b = document.getElementById("copyFullEnBtn");
        if(b){ b.textContent="已複製 ✓"; b.style.background="#2E7D32"; setTimeout(function(){ b.textContent="複製"; b.style.background="#1565C0"; }, 2000); }
      }).catch(function() { alert(_medFullEn); });
    }
    </script>
    `})() : medStatus !== null ? `
    <div style="font-size:18px;color:#37474F;margin-bottom:10px;">你的醫健卡申請狀態：</div>
    <span class="med-status-badge ${medStatus.toLowerCase()}">${
      medStatus === 'PENDING'  ? '⏳ 審核中 PENDING'  :
      medStatus === 'SENT'     ? '📮 已發送 SENT'      :
      medStatus === 'ISSUED'   ? '✅ 已發出 ISSUED'    :
      medStatus === 'DECLINED' ? '❌ 未批准 DECLINED'  : medStatus
    }</span>
    <div style="font-size:18px;color:#78909C;margin-top:10px;line-height:1.6;">如有查詢請 WhatsApp：<a href="https://wa.me/85291477341" style="color:#1565C0;">9147-7341</a></div>
    ` : `
    <div style="font-size:18px;color:#546E7A;margin-bottom:14px;line-height:1.6;">
      由合作 NGO <strong>香港商貿慈善基金</strong>提供，免費申請。<br>
      申請後職員將以 WhatsApp 聯絡辦理。
    </div>
    <button class="med-apply-btn" id="medApplyBtn" onclick="toggleMedForm()">＋ 申請免費醫健卡</button>
    <div class="med-form" id="medForm">
      <div class="med-field">
        <label>中文全名 <span style="color:#C62828;">✽ 必填</span>（與身份證相同）</label>
        <input id="mfNameZh" type="text" placeholder="例：陳大文">
      </div>
      <div class="med-field">
        <label>英文全名 <span style="color:#C62828;">✽ 必填</span>（與身份證相同）</label>
        <input id="mfNameEn" type="text" placeholder="例：CHAN TAI MAN" style="text-transform:uppercase;">
      </div>
      <div class="med-field">
        <label>身份證頭 4 位 <span style="color:#C62828;">✽ 必填</span></label>
        <input id="mfHkid" type="text" placeholder="例：K608" maxlength="4" style="text-transform:uppercase;letter-spacing:4px;font-size:20px;font-weight:700;">
      </div>
      <div class="med-err" id="medErr"></div>
      <button class="med-submit-btn" id="medSubmitBtn" onclick="submitMedical()">提交申請</button>
    </div>
    <div class="med-success" id="medSuccess">
      ✅ 醫健卡申請已提交！<br>
      你的醫健卡申請已記錄，<strong>香港商貿慈善基金</strong>職員將會以<strong>電話或 WhatsApp</strong> 聯絡你安排發卡手續。如有查詢請致電或 WhatsApp：<strong>9888 5708</strong>
    </div>
    `}
  </div>

  <!-- ── 底部連結 ── -->
  <div style="text-align:center;margin-top:20px;font-size:18px;color:#aaa;line-height:2;">
    <a href="/membership/join" style="color:${accentMid};">← 返回登記頁</a>
    &nbsp;·&nbsp;
    如有疑問 WhatsApp：<a href="https://wa.me/85291477341" style="color:${accentMid};">9147-7341</a>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
var MEMBER_NO = '${m.member_no}';
var MEMBER_DATA = ${JSON.stringify({
  memberNo: m.member_no,
  nameZh: m.name_zh,
  nameEn: m.name_en || '',
  tier: m.tier,
  expiresAt: m.expires_at || '',
  parentNo: m.parent_no || '',
  parentName: m.parent_name || '',
  role: m.role
})};

// ── WA verify state from DB (server-rendered) ────────────────────────────────
var SHOW_WATERMARK = ${showWatermark ? 'true' : 'false'};

// ── QR + Card render on load ──────────────────────────────────────────────────
window.addEventListener('load', function(){
  renderCardImage(MEMBER_DATA, MEMBER_DATA.tier);
  ${isPrimary ? 'loadFamily();' : ''}
  // If watermark shown, load admin WA number and inject preview
  if(SHOW_WATERMARK) {
    fetch('/api/admin/settings').then(function(r){return r.json();}).then(function(s){
      var waNum=(s.settings&&s.settings.admin_whatsapp)?s.settings.admin_whatsapp:'85291477341';
      var msgText='你好，我的老有卡會員編號：'+MEMBER_NO+'，請幫我確認。';
      var msgEnc=encodeURIComponent(msgText);
      var phoneDigits=waNum.replace(/[^0-9]/g,'');
      var isMobile=/iphone|ipad|ipod|android/i.test(navigator.userAgent);
      window._waUrl=isMobile
        ?'whatsapp://send?phone='+phoneDigits+'&text='+msgEnc
        :'https://wa.me/'+phoneDigits+'?text='+msgEnc;
      var preview=document.getElementById('waVerifyMsgPreview');
      if(preview) preview.textContent=msgText;
    }).catch(function(){});
  }
});

function showToast(msg, dur) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, dur || 2000);
}

// ── Edit toggle ───────────────────────────────────────────────────────────────
// ── 展開/收起「◆ 會員資料」區塊 ──
function toggleMemberInfo() {
  var vm = document.getElementById('viewMode');
  var em = document.getElementById('editMode');
  var arrow = document.getElementById('memberInfoArrow');
  var editBtn = document.getElementById('editToggleBtn');
  // 判斷目前是否展開（viewMode 可見 OR editMode 開着）
  var isOpen = (vm && vm.style.display !== 'none') || (em && em.classList.contains('open'));
  if (isOpen) {
    // 收起
    if (vm) vm.style.display = 'none';
    if (em) em.classList.remove('open');
    if (arrow) arrow.textContent = '\u25bc';
    if (editBtn) editBtn.style.display = 'none';
  } else {
    // 展開
    if (vm) vm.style.display = '';
    if (arrow) arrow.textContent = '\u25b2';
    if (editBtn) editBtn.style.display = '';
  }
}

function toggleEdit() {
  var vm = document.getElementById('viewMode');
  var em = document.getElementById('editMode');
  var isOpen = em.classList.contains('open');
  if(isOpen){ em.classList.remove('open'); vm.style.display=''; }
  else { em.classList.add('open'); vm.style.display='none'; }
}

// ── Save profile ──────────────────────────────────────────────────────────────
async function saveProfile() {
  var btn = document.querySelector('.save-btn');
  btn.disabled = true; btn.textContent = '儲存中…';
  try {
    var res = await fetch('/api/members/'+MEMBER_NO+'/profile', {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        nameEn: document.getElementById('eNameEn').value.trim().toUpperCase(),
        gender: document.getElementById('eGender').value,
        birthYear: document.getElementById('eBirthYear').value || '',
        district: document.getElementById('eDistrict').value
      })
    });
    var data = await res.json();
    if(!data.ok){ showToast('❌ 更新失敗：' + (data.error||''), 3000); }
    else {
      // Update view fields
      document.getElementById('vNameEn').textContent = document.getElementById('eNameEn').value.trim().toUpperCase() || '—';
      var gMap = {'M':'男','F':'女','X':'其他','':'—'};
      document.getElementById('vGender').textContent = gMap[document.getElementById('eGender').value] || '—';
      document.getElementById('vBirthYear').textContent = document.getElementById('eBirthYear').value || '—';
      document.getElementById('vDistrict').textContent = document.getElementById('eDistrict').value || '—';
      showToast('✅ 資料已更新！');
      // Re-render card with updated name
      MEMBER_DATA.nameEn = document.getElementById('eNameEn').value.trim().toUpperCase();
      setTimeout(function(){ renderCardImage(MEMBER_DATA, MEMBER_DATA.tier); }, 300);
      toggleEdit();
    }
  } catch(e) { showToast('❌ 網絡錯誤，請再試', 3000); }
  btn.disabled = false; btn.textContent = '儲存更新';
}

// ── Load family cards ─────────────────────────────────────────────────────────
async function loadFamily() {
  try {
    var res = await fetch('/api/members/'+MEMBER_NO+'/family');
    var data = await res.json();
    var el = document.getElementById('familyList');
    if(!data.family || data.family.length === 0){
      el.innerHTML = '<div style="text-align:center;color:#aaa;padding:10px;font-size:18px;">暫無家庭同行卡</div>';
      return;
    }
    el.innerHTML = data.family.map(function(f){
      return '<div class="family-card">' +
        '<div><div class="fc-name">'+f.name_zh+'</div><div class="fc-no">'+f.member_no+'</div></div>' +
        '<span style="font-size:16px;color:#aaa;padding:6px 10px;">家庭同行卡</span>' +
        '</div>';
    }).join('');
  } catch(e){ console.warn('family load error', e); }
}

// ── Card image rendering (same engine as signup pages) ────────────────────────
function renderCardImage(data, tier) {
  var logoImg=new Image();
  logoImg.onload=function(){
  var W=1360, H=860;
  var canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  var ctx=canvas.getContext('2d');
  var isPrimary=(tier!=='FAMILY');
  var forestDeep='#0d3e12',forest='#2E7D32',forestPale='#E8F5E9';
  var ferrari='#C62828',ferrariDeep='#8B0000',ferrariPale='#FFEBEE';
  var accentDark=isPrimary?forestDeep:ferrariDeep;
  var accentMid=isPrimary?forest:ferrari;
  var qrDark=isPrimary?forestDeep:'#a80000';
  // ── Background gradient
  var bg=ctx.createLinearGradient(0,0,W,H);
  if(isPrimary){bg.addColorStop(0,'#FDFAF3');bg.addColorStop(1,'#F0EBD8');}
  else{bg.addColorStop(0,'#FFF8F8');bg.addColorStop(1,'#FFE8E8');}
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // ── Watermark "85" — centred-right, large, faint — Montserrat Bold
  ctx.save(); ctx.globalAlpha=0.07; ctx.fillStyle=accentDark;
  ctx.font='bold 700px "Montserrat",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('85',W*0.72,H*0.56); ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.restore();
  // ── Top colour stripe
  var stripeH=16;
  ctx.fillStyle=forest; ctx.fillRect(0,0,W*0.45,stripeH);
  ctx.fillStyle=ferrari; ctx.fillRect(W*0.45,0,W*0.55,stripeH);
  // ── Logo (top-left)
  var logoX=40,logoY=stripeH+20,logoW=330,logoH=132;
  ctx.drawImage(logoImg,logoX,logoY,logoW,logoH);
  ctx.strokeStyle=accentDark; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(logoX+logoW+24,logoY+10); ctx.lineTo(logoX+logoW+24,logoY+logoH-10); ctx.stroke();
  var cardNameX=logoX+logoW+44;
  ctx.fillStyle=accentDark;
  if(isPrimary){ctx.font='bold 51px "Noto Serif TC",serif';ctx.fillText('老有卡',cardNameX,logoY+logoH/2+18);}
  else{ctx.font='bold 42px "Noto Serif TC",serif';ctx.fillText('老有卡',cardNameX,logoY+logoH/2-9);ctx.fillText('家庭同行',cardNameX,logoY+logoH/2+44);}
  // ── Badge (top-right)
  var badgeW=462,badgeH=75,badgeX=W-badgeW-48,badgeY=stripeH+26;
  ctx.fillStyle=isPrimary?forestPale:ferrariPale; ctx.strokeStyle=accentMid; ctx.lineWidth=3;
  ctx.beginPath(); roundRect(ctx,badgeX,badgeY,badgeW,badgeH,8); ctx.fill(); ctx.stroke();
  ctx.fillStyle=ferrari; ctx.font='bold 29px sans-serif'; ctx.fillText('◆',badgeX+18,badgeY+50);
  ctx.fillStyle=accentDark; ctx.font='bold 35px "Noto Serif TC",serif'; ctx.fillText('CoExplorery 探索者',badgeX+54,badgeY+50);
  ctx.fillStyle=ferrari; ctx.font='bold 33px "Noto Serif TC",serif'; ctx.textAlign='right';
  ctx.fillText(isPrimary?'主卡 · PRIMARY':'附屬 · FAMILY',W-48,badgeY+badgeH+42); ctx.textAlign='left';
  // ── Name area — pushed up, no horizontal divider
  var nameAreaY=stripeH+340;
  ctx.fillStyle='#999'; ctx.font='26px "Noto Serif TC",serif';
  var lbl='會員姓名',lx=48;
  for(var i=0;i<lbl.length;i++){ctx.fillText(lbl[i],lx,nameAreaY);lx+=ctx.measureText(lbl[i]).width+10;}
  ctx.fillStyle=accentDark;
  var zh=data.nameZh||'';
  var zhSz=zh.length<=2?200:zh.length<=3?178:zh.length<=4?148:112;
  ctx.font='bold '+zhSz+'px "Noto Serif TC",serif'; ctx.fillText(zh,48,nameAreaY+zhSz+10);
  var enY=nameAreaY+zhSz+10;
  if(data.nameEn&&data.nameEn.trim()){ctx.fillStyle=accentDark;ctx.font='bold 46px "Noto Serif TC",serif';enY+=60;ctx.fillText(data.nameEn.trim(),48,enY);}
  if(!isPrimary&&data.parentNo){ctx.fillStyle=ferrari;ctx.font='26px "Noto Serif TC",serif';ctx.fillText('◆ 綁定主卡：'+data.parentNo+(data.parentName?' （'+data.parentName+'）':''),48,enY+48);}
  // ── QR code — bottom-right corner, pixel-perfect fill
  var footY=H-36;
  var qrSz=192,qrX=W-qrSz-40,qrY2=H-qrSz-40;
  ctx.fillStyle='#fff'; ctx.fillRect(qrX-8,qrY2-8,qrSz+16,qrSz+16);
  ctx.strokeStyle=accentMid; ctx.lineWidth=4; ctx.strokeRect(qrX-8,qrY2-8,qrSz+16,qrSz+16);
  try{
    var qr=qrcode(0,'M');
    qr.addData(location.origin+'/membership/card/'+(data.memberNo||''));
    qr.make();
    var mc=qr.getModuleCount();
    var cell=qrSz/mc;
    ctx.fillStyle=qrDark;
    for(var row=0;row<mc;row++){for(var col=0;col<mc;col++){
      if(qr.isDark(row,col)) ctx.fillRect(qrX+col*cell,qrY2+row*cell,cell,cell);
    }}
  }catch(e){console.warn('QR err',e);}
  // ── Footer — no background box, clean transparent
  ctx.fillStyle='#aaa'; ctx.font='28px "Noto Serif TC",serif'; ctx.fillText('會員編號',48,footY-72);
  ctx.fillStyle=accentDark; ctx.font='bold 56px "Space Grotesk",monospace'; ctx.fillText(data.memberNo||'',48,footY-8);
  if(data.expiresAt){
    var expStr=data.expiresAt.slice(0,7).replace('-','/');
    var expDisp=expStr.slice(5)+' / '+expStr.slice(0,4);
    ctx.fillStyle='#aaa'; ctx.font='28px "Noto Serif TC",serif'; ctx.fillText('有效期至',560,footY-72);
    ctx.fillStyle=accentDark; ctx.font='bold 56px "Space Grotesk",monospace'; ctx.fillText(expDisp,560,footY-8);
  }
  canvas.toBlob(function(blob){
    if(!blob)return;
    window._cardBlob=blob; window._cardFileName='CoEldery85_'+(data.memberNo||'card')+'.jpg';
    var url=URL.createObjectURL(blob);
    var img=document.getElementById('cardImg');
    if(img){img.src=url; img.style.opacity='1';}
  },'image/jpeg',0.95);
  }; // end logoImg.onload
  logoImg.src='/static/logo.png';
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
function saveCardImage(){
  if(!window._cardBlob){showToast('圖片生成中，請稍候…');return;}
  var a=document.createElement('a');a.href=URL.createObjectURL(window._cardBlob);a.download=window._cardFileName||'coeldery85-card.jpg';a.click();
}
async function shareCardToWA(){
  if(!window._cardBlob){showToast('圖片生成中，請稍候…');return;}
  var file=new File([window._cardBlob],window._cardFileName||'coeldery85-card.jpg',{type:'image/jpeg'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:'CoEldery 85 老有卡',text:'我的 CoEldery 85 老有聯盟會員卡'});return;}
    catch(e){if(e.name!=='AbortError')console.warn('share err',e);}
  }
  saveCardImage();
  showToast('圖片已下載，請貼入 WhatsApp 傳送', 3000);
}

// ── 開普通 WhatsApp（whatsapp:// deep link，兩平台通用）──
function openNormalWA(msg) {
  // whatsapp:// 係 WhatsApp 官方 URI scheme，直接喚起 WhatsApp app
  // 唔會開 WA Biz，唔會跳 Google Play，iOS/Android 都 work
  var encoded = encodeURIComponent(msg);
  var deepLink = 'whatsapp://send?text=' + encoded;
  var webFallback = 'https://wa.me/?text=' + encoded;
  // 嘗試 deep link，500ms 後如果 app 冇打開就用 web fallback
  var fallbackTimer = setTimeout(function() {
    window.open(webFallback, '_blank');
  }, 500);
  window.addEventListener('blur', function onBlur() {
    clearTimeout(fallbackTimer);
    window.removeEventListener('blur', onBlur);
  }, { once: true });
  window.location.href = deepLink;
}

// ── 分享我張卡 ──
function shareMyCard() {
  var nl = String.fromCharCode(10);
  var msg = '我係 CoEldery 老有聯盟85 會員，呢個係我張會員卡：' + nl + 'https://coeldery85.com/membership/card/' + MEMBER_NO;
  openNormalWA(msg);
}

// ── 邀請朋友加入 ──
function inviteFriend() {
  var nl = String.fromCharCode(10);
  var msg = '我邀請你加入 CoEldery 老有聯盟85！免費登記做會員：' + nl + 'https://coeldery85.com/membership/join';
  openNormalWA(msg);
}

// ── Medical card re-apply (Part C) ───────────────────────────────────────────
function toggleMedForm() {
  var form = document.getElementById('medForm');
  var btn = document.getElementById('medApplyBtn');
  if (!form) return;
  var isOpen = form.classList.contains('open');
  if (isOpen) { form.classList.remove('open'); if(btn) btn.textContent = '＋ 申請免費醫健卡'; }
  else { form.classList.add('open'); if(btn) btn.textContent = '✕ 收起'; }
}
async function submitMedical() {
  var nameZh = document.getElementById('mfNameZh').value.trim();
  var nameEn = document.getElementById('mfNameEn').value.trim().toUpperCase();
  var hkid = document.getElementById('mfHkid').value.trim().toUpperCase();
  var errEl = document.getElementById('medErr');
  errEl.classList.remove('show');
  if (!nameZh || !nameEn || !hkid) { errEl.textContent = '請填寫所有必填欄位'; errEl.classList.add('show'); return; }
  if (hkid.length < 3) { errEl.textContent = '身份證頭 4 位格式不正確（如 K608）'; errEl.classList.add('show'); return; }
  var btn = document.getElementById('medSubmitBtn');
  btn.disabled = true; btn.textContent = '提交中…';
  try {
    var res = await fetch('/api/members/' + MEMBER_NO + '/medical', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nameZh: nameZh, nameEn: nameEn, hkid: hkid })
    });
    var data = await res.json();
    if (data.ok) {
      document.getElementById('medForm').classList.remove('open');
      document.getElementById('medApplyBtn').style.display = 'none';
      document.getElementById('medSuccess').classList.add('show');
    } else if (data.alreadyApplied) {
      errEl.textContent = '你已申請醫健卡，狀態：' + (data.status || 'PENDING');
      errEl.classList.add('show');
      btn.disabled = false; btn.textContent = '提交申請';
    } else {
      errEl.textContent = data.error || '提交失敗，請重試';
      errEl.classList.add('show');
      btn.disabled = false; btn.textContent = '提交申請';
    }
  } catch(e) {
    errEl.textContent = '網絡錯誤，請重試';
    errEl.classList.add('show');
    btn.disabled = false; btn.textContent = '提交申請';
  }
}
// ── 「◆ 家庭同行卡」section — Add family form ──────────────────────────────────
var _afGender = '';
function setAfGender(v, btn) {
  _afGender = v;
  var m = document.getElementById('afGenderM');
  var f = document.getElementById('afGenderF');
  if(m){ m.style.background='#fff'; m.style.borderColor='#FFCDD2'; m.style.color='#333'; m.style.fontWeight='600'; }
  if(f){ f.style.background='#fff'; f.style.borderColor='#FFCDD2'; f.style.color='#333'; f.style.fontWeight='600'; }
  btn.style.background='#8B0000'; btn.style.borderColor='#8B0000'; btn.style.color='#fff'; btn.style.fontWeight='700';
}
function toggleAddFamForm() {
  var form = document.getElementById('addFamForm');
  var btn = document.getElementById('addFamBtn');
  var linked = document.getElementById('afParentLinkedField');
  if (!form) return;
  var isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'block';
  if(btn) btn.textContent = isOpen ? '＋ 為家人申請家庭同行卡' : '✕ 收起';
  if(!isOpen && linked) linked.style.display = 'block';
}
async function submitAfForm() {
  var nameZh = document.getElementById('afNameZh').value.trim();
  var phone = document.getElementById('afPhone').value.replace(/[^0-9]/g,'');
  var birthYear = document.getElementById('afBirthYear').value;
  var district = document.getElementById('afDistrict').value;
  var relation = document.getElementById('afRelation').value;
  var errEl = document.getElementById('afErr');
  errEl.style.display = 'none';
  if (!nameZh) { errEl.textContent='請填寫姓名／稱呼'; errEl.style.display='block'; return; }
  if (phone.length !== 8) { errEl.textContent='請填寫正確8位電話'; errEl.style.display='block'; return; }
  if (!_afGender) { errEl.textContent='請選擇性別'; errEl.style.display='block'; return; }
  if (!birthYear) { errEl.textContent='請選擇出生年份'; errEl.style.display='block'; return; }
  if (!district) { errEl.textContent='請選擇居住地區'; errEl.style.display='block'; return; }
  if (!relation) { errEl.textContent='請選擇你與家人的關係'; errEl.style.display='block'; return; }
  var btn = document.getElementById('afSubmitBtn');
  btn.disabled = true; btn.textContent = '新增中…';
  try {
    var res = await fetch('/api/members/'+MEMBER_NO+'/add-family', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ nameZh: nameZh, phone: phone, gender: _afGender, birthYear: birthYear, district: district, relation: relation })
    });
    var data = await res.json();
    if (data.ok) {
      document.getElementById('addFamForm').style.display='none';
      document.getElementById('addFamBtn').textContent='＋ 為家人申請家庭同行卡';
      var s = document.getElementById('afSuccess');
      s.innerHTML = '✅ 已成功新增！<br><strong>'+nameZh+'</strong> 的家庭同行卡已發出<br>會員編號：<strong>'+data.member_no+'</strong><br><span style="font-size:18px;color:#388E3C;">請家人登入自己的會員卡頁完成 WhatsApp 驗證。</span>';
      s.style.display = 'block';
      _afGender = '';
      // Reset form fields
      document.getElementById('afNameZh').value='';
      document.getElementById('afPhone').value='';
      document.getElementById('afBirthYear').value='';
      document.getElementById('afDistrict').value='';
      document.getElementById('afRelation').value='';
      var gm=document.getElementById('afGenderM'); var gf=document.getElementById('afGenderF');
      if(gm){gm.style.background='#fff';gm.style.borderColor='#FFCDD2';gm.style.color='#333';gm.style.fontWeight='600';}
      if(gf){gf.style.background='#fff';gf.style.borderColor='#FFCDD2';gf.style.color='#333';gf.style.fontWeight='600';}
      btn.disabled=false; btn.textContent='新增家庭同行卡';
      // Reload family list to show new member
      loadFamily();
    } else { errEl.textContent = data.error||'新增失敗'; errEl.style.display='block'; btn.disabled=false; btn.textContent='新增家庭同行卡'; }
  } catch(e) { errEl.textContent='網絡錯誤，請重試'; errEl.style.display='block'; btn.disabled=false; btn.textContent='新增家庭同行卡'; }
}
async function submitLinkParent() {
  var phone = document.getElementById('lpPhone').value.replace(/[^0-9]/g,'');
  var errEl = document.getElementById('linkErr');
  errEl.classList.remove('show');
  if (phone.length !== 8) { errEl.textContent='請填寫正確8位電話'; errEl.classList.add('show'); return; }
  var btn = document.getElementById('linkSubmitBtn');
  btn.disabled=true; btn.textContent='綁定中…';
  try {
    var res = await fetch('/api/members/'+MEMBER_NO+'/link-parent', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ parentPhone: phone })
    });
    var data = await res.json();
    if (data.ok) {
      var s = document.getElementById('famLinkSuccess');
      s.innerHTML = '✅ 已成功綁定主卡！<br><strong>'+data.parent_name+'（'+data.parent_no+'）</strong>';
      s.classList.add('show');
      document.getElementById('tabLink').style.display='none';
      document.getElementById('tabNew').style.display='none';
      document.getElementById('panelLink').style.display='none';
      document.getElementById('panelNew').style.display='none';
    } else { errEl.textContent=data.error||'綁定失敗'; errEl.classList.add('show'); btn.disabled=false; btn.textContent='確認綁定'; }
  } catch(e) { errEl.textContent='網絡錯誤，請重試'; errEl.classList.add('show'); btn.disabled=false; btn.textContent='確認綁定'; }
}
async function submitAddParent() {
  var nameZh = document.getElementById('npNameZh').value.trim();
  var phone = document.getElementById('npPhone').value.replace(/[^0-9]/g,'');
  var birthYear = document.getElementById('npBirthYear').value;
  var gender = document.getElementById('npGender').value;
  var district = document.getElementById('npDistrict').value;
  var errEl = document.getElementById('newErr');
  errEl.classList.remove('show');
  if (!nameZh) { errEl.textContent='請填寫中文姓名'; errEl.classList.add('show'); return; }
  if (!birthYear) { errEl.textContent='請填寫出生年份'; errEl.classList.add('show'); return; }
  if (phone.length !== 8) { errEl.textContent='請填寫正確8位電話'; errEl.classList.add('show'); return; }
  var btn = document.getElementById('newSubmitBtn');
  btn.disabled=true; btn.textContent='開卡中…';
  try {
    var res = await fetch('/api/members/'+MEMBER_NO+'/add-parent', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ nameZh, phone, birthYear, gender: gender||undefined, district: district||undefined })
    });
    var data = await res.json();
    if (data.ok) {
      var s = document.getElementById('famLinkSuccess');
      s.innerHTML = '✅ 已成功為長輩開主卡！<br><strong>主卡編號：'+data.parent_no+'</strong>';
      s.classList.add('show');
      document.getElementById('tabLink').style.display='none';
      document.getElementById('tabNew').style.display='none';
      document.getElementById('panelLink').style.display='none';
      document.getElementById('panelNew').style.display='none';
    } else { errEl.textContent=data.error||'開卡失敗'; errEl.classList.add('show'); btn.disabled=false; btn.textContent='為長輩開主卡'; }
  } catch(e) { errEl.textContent='網絡錯誤，請重試'; errEl.classList.add('show'); btn.disabled=false; btn.textContent='為長輩開主卡'; }
}
// ── WA Verification (card page) ───────────────────────────────────────────────
// Button 1: Normal WhatsApp — records channel=ICON via /verify endpoint
function openWA() {
  if(!window._waUrl) return;
  if(window._waSent) return;
  window._waSent = true;
  var btn = document.getElementById('waVerifyBtn');
  var bizBtn = document.getElementById('waBizBtn');
  if(btn){ btn.disabled=true; btn.textContent='📤 正在開啟 WhatsApp...'; btn.style.background='#a5d6a7'; }
  if(bizBtn){ bizBtn.disabled=true; bizBtn.style.opacity='0.4'; }
  window.location.href = window._waUrl;
  document.addEventListener('visibilitychange', function onVis() {
    if(document.visibilityState==='visible'){ document.removeEventListener('visibilitychange',onVis); markWASent(); }
  });
  window.addEventListener('pageshow', function onPS() {
    window.removeEventListener('pageshow',onPS); markWASent();
  });
}
// Called when user returns after normal WA — hides watermark, calls /verify (sets verified_at + ICON)
function markWASent() {
  if(window._waSentDone) return;
  window._waSentDone = true;
  var wm = document.getElementById('pendingWatermark');
  var block = document.getElementById('waVerifyBlock');
  var banner = document.getElementById('waSentBanner');
  if(wm) wm.style.display='none';
  if(block) block.style.display='none';
  if(banner) banner.style.display='block';
  // Call /verify — sets verified_at + wa_clicked_at + wa_channel=ICON
  fetch('/api/members/'+encodeURIComponent(MEMBER_NO)+'/verify',{method:'POST'}).catch(function(){});
  // Notify parent page (/app iframe) to show install banner
  notifyParentWAClicked();
}
// Button 2: WA Business — fake 2.5s, records channel=BIZ via /wa-click, hides watermark
function openWABiz() {
  if(window._waBizSent) return;
  window._waBizSent = true;
  var bizBtn = document.getElementById('waBizBtn');
  var waBtn = document.getElementById('waVerifyBtn');
  var sendingMsg = document.getElementById('waSendingMsg');
  if(bizBtn){ bizBtn.disabled=true; bizBtn.textContent='📤 發送中...'; bizBtn.style.background='#c8e6c9'; bizBtn.style.color='#2E7D32'; }
  if(waBtn){ waBtn.disabled=true; waBtn.style.opacity='0.4'; }
  if(sendingMsg) sendingMsg.style.display='block';
  // Record click with channel=BIZ
  fetch('/api/members/'+encodeURIComponent(MEMBER_NO)+'/wa-click',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({channel:'BIZ'})
  }).catch(function(){});
  // Notify parent page (/app iframe) to show install banner immediately on WA Biz click
  notifyParentWAClicked();
  setTimeout(markVerified, 2500);
}
// Called after WA Biz — hides watermark, shows banner
function markVerified() {
  if(window._verifyDone) return;
  window._verifyDone = true;
  var wm = document.getElementById('pendingWatermark');
  var block = document.getElementById('waVerifyBlock');
  var sendingMsg = document.getElementById('waSendingMsg');
  var banner = document.getElementById('waSentBanner');
  if(wm) wm.style.display='none';
  if(block) block.style.display='none';
  if(sendingMsg) sendingMsg.style.display='none';
  if(banner) banner.style.display='block';
}
// Notify parent /app page to show PWA install banner (cross-frame via postMessage)
function notifyParentWAClicked() {
  try {
    // Store in localStorage so /app knows on next load too
    localStorage.setItem('ce85_wa_clicked', '1');
    // postMessage to parent frame if in iframe
    if(window.parent && window.parent !== window) {
      window.parent.postMessage({type:'ce85_wa_clicked', memberNo: MEMBER_NO}, '*');
    }
  } catch(e) {}
}
</script>
</body></html>`
}

// ─── Home HTML (統一登入/登記入口) ───────────────────────────────────────────────
function homeHtml() {
  return htmlHead('老有聯盟 CoEldery 85', `<style>
body{background:#F0EBD8;min-height:100vh;padding:20px 16px;font-size:20px;line-height:1.6;}
.container{max-width:420px;margin:0 auto;}
/* Hero */
.hero{text-align:center;padding:28px 0 20px;}
.hero-logo{display:inline-flex;align-items:center;gap:0;margin-bottom:14px;}
.hero-logo .l-co{font-family:"Noto Serif TC",serif;font-size:26px;font-weight:900;color:var(--forest-deep);letter-spacing:1px;}
.hero-logo .l-85{font-family:"Noto Serif TC",serif;font-size:36px;font-weight:900;color:var(--ferrari);line-height:1;margin:0 4px;}
.hero-logo .l-org{font-family:"Noto Serif TC",serif;font-size:14px;font-weight:700;color:var(--forest-deep);letter-spacing:3px;border-left:2px solid var(--line);padding-left:10px;margin-left:6px;line-height:1.2;}
.hero-sub{font-size:18px;color:var(--grey-3);letter-spacing:3px;}
/* Tabs */
.tab-bar{display:grid;grid-template-columns:1fr 1fr;border-radius:6px 6px 0 0;overflow:hidden;margin-bottom:0;}
.tab-btn{padding:14px 8px;text-align:center;font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;letter-spacing:2px;cursor:pointer;border:none;transition:all 0.2s;}
.tab-btn.login{background:#fff;color:var(--forest-deep);}
.tab-btn.register{background:var(--forest-pale);color:var(--forest-deep);}
.tab-btn.active.login{background:var(--forest-deep);color:#fff;}
.tab-btn.active.register{background:var(--forest-deep);color:#fff;}
/* Panel */
.panel{background:#fff;border-radius:0 0 6px 6px;padding:28px 22px;margin-bottom:16px;}
.panel-section{display:none;}
.panel-section.active{display:block;}
/* Fields */
.field{margin-bottom:18px;}
.field label{display:block;font-family:"Noto Serif TC",serif;font-size:18px;color:var(--grey-1);font-weight:700;letter-spacing:1px;margin-bottom:7px;}
.field input,.field select{width:100%;padding:14px;border:2px solid var(--line);border-radius:4px;font-size:20px;font-family:inherit;color:var(--ink);background:#fff;transition:border 0.2s;min-height:55px;}
.field input:focus,.field select:focus{outline:0;border-color:var(--forest);}
.field .hint{font-size:11px;color:var(--grey-3);margin-top:5px;line-height:1.5;}
.field .g-row{display:flex;gap:8px;}
.field .g-btn{flex:1;padding:14px 4px;border:2px solid var(--line);border-radius:4px;font-size:18px;font-family:"Noto Serif TC",serif;font-weight:700;cursor:pointer;background:#fff;color:var(--grey-1);transition:all 0.15s;min-height:55px;}
.field .g-btn.active{border-color:var(--forest);background:var(--forest-pale);color:var(--forest-deep);}
.optional{font-size:11px;color:var(--grey-3);font-weight:400;margin-left:4px;}
.section-divider{padding:10px 0 8px;font-size:18px;color:var(--grey-3);letter-spacing:3px;border-top:1px dashed var(--line);margin-top:4px;}
/* Buttons */
.submit-btn{width:100%;padding:18px;background:var(--forest-deep);color:#fff;border:0;border-radius:4px;font-size:18px;font-family:"Noto Serif TC",sans-serif;font-weight:700;letter-spacing:4px;cursor:pointer;box-shadow:0 4px 0 var(--forest);transition:all 0.1s;margin-top:4px;}
.submit-btn:disabled{background:var(--grey-3);box-shadow:0 4px 0 var(--grey-2);cursor:not-allowed;}
.submit-btn.red{background:var(--ferrari);box-shadow:0 4px 0 var(--ferrari-deep);}
/* Consent */
.consent{padding:12px 14px;background:var(--forest-pale);border-radius:4px;font-size:18px;color:var(--grey-1);line-height:1.7;margin-bottom:18px;}
.consent label{display:flex;gap:10px;cursor:pointer;align-items:flex-start;}
.consent input{width:18px;height:18px;margin-top:2px;flex-shrink:0;accent-color:var(--forest);}
/* Error */
.err-msg{background:var(--ferrari-pale);border:1px solid var(--ferrari);color:var(--ferrari-deep);padding:12px 16px;border-radius:4px;font-size:20px;font-weight:700;margin-bottom:16px;display:none;}
.err-msg.show{display:block;}
/* Login result */
.result-block{background:#E8F5E9;border:2px solid var(--forest);border-radius:6px;padding:20px;margin-bottom:14px;display:none;}
.result-block.show{display:block;}
.rb-name{font-family:"Noto Serif TC",serif;font-size:28px;font-weight:900;color:var(--forest-deep);}
.rb-no{font-family:"Space Grotesk",monospace;font-size:18px;color:var(--grey-2);margin-bottom:14px;}
.rb-go{display:block;width:100%;padding:15px;background:var(--forest-deep);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:8px;min-height:55px;}
.rb-family-title{font-family:"Noto Serif TC",serif;font-size:18px;color:var(--ferrari-deep);letter-spacing:2px;font-weight:700;margin:14px 0 8px;padding-top:12px;border-top:1px solid #c8e6c9;}
.fc-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e0f0e0;}
.fc-row:last-child{border-bottom:none;}
.fc-row .fn{font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;color:var(--ferrari-deep);}
.fc-row .fno{font-size:18px;color:#aaa;}
.fc-row a{padding:5px 12px;background:var(--ferrari);color:#fff;border-radius:4px;font-size:18px;font-weight:700;text-decoration:none;}
/* Footer */
.footer-links{text-align:center;margin-top:6px;font-size:18px;color:var(--grey-3);line-height:2;}
.footer-links a{color:var(--forest);text-decoration:none;}
.footer-note{text-align:center;margin-top:20px;font-size:18px;color:var(--grey-3);line-height:2;}
.footer-note a{color:var(--grey-2);text-decoration:none;}
</style>`) + `
<body>
<div class="container">
  <!-- Hero logo -->
  <div class="hero">
    <div class="hero-logo">
      <span class="l-co">CoEldery</span>
      <span class="l-85">85</span>
      <span class="l-org">老有聯盟<br>老有卡</span>
    </div><br>
    <span class="hero-sub">COELDERY 85 MEMBER PORTAL</span>
  </div>

  <!-- Tab bar -->
  <div class="tab-bar">
    <button class="tab-btn login active" id="tabLogin" onclick="switchTab('login')">🔐 會員登入</button>
    <button class="tab-btn register" id="tabRegister" onclick="switchTab('register')">📝 首次登記</button>
  </div>

  <!-- Shared error -->
  <div class="err-msg" id="errMsg"></div>

  <!-- ════ Panel ════ -->
  <div class="panel">

    <!-- ── LOGIN section ── -->
    <div class="panel-section active" id="secLogin">
      <div class="field">
        <label for="loginPhone">你的 WhatsApp 電話</label>
        <input id="loginPhone" type="tel" placeholder="例：91234567" inputmode="numeric" maxlength="8">
        <div class="hint">輸入登記老有卡時使用的 8 位號碼</div>
      </div>
      <button type="button" class="submit-btn" id="loginBtn" onclick="doLogin()">登入查看我的卡</button>

      <!-- Login result -->
      <div class="result-block" id="loginResult">
        <div class="rb-name" id="rbName"></div>
        <div class="rb-no" id="rbNo"></div>
        <a id="rbGoBtn" href="#" class="rb-go">🪪 查看我的老有卡</a>
        <div id="rbFamilyWrap" style="display:none;">
          <div class="rb-family-title">◆ 名下家庭同行卡</div>
          <div id="rbFamilyList"></div>
        </div>
      </div>

      <div class="footer-links">
        未有會員？點上方「首次登記」<br>
        <a href="/membership/join-family">為家人申請家庭同行卡 →</a>
      </div>
    </div>

    <!-- ── REGISTER section ── -->
    <div class="panel-section" id="secRegister">
      <div class="field">
        <label for="nameZh">中文姓名 <span style="color:var(--ferrari);font-size:11px;">✽ 必填</span></label>
        <input id="nameZh" type="text" placeholder="例：陳大文">
      </div>
      <div class="field">
        <label for="phone">WhatsApp 電話 <span style="color:var(--ferrari);font-size:11px;">✽ 必填</span></label>
        <input id="phone" type="tel" placeholder="例：91234567" inputmode="numeric" maxlength="8">
      </div>
      <div class="field">
        <label for="nameEn">英文姓名 <span class="optional">選填</span></label>
        <input id="nameEn" type="text" placeholder="例：CHAN TAI MAN" style="text-transform:uppercase;">
      </div>
      <div class="field">
        <label>性別 <span class="optional">選填</span></label>
        <div class="g-row">
          <button type="button" class="g-btn" data-v="M" onclick="setGender('M',this)">男 M</button>
          <button type="button" class="g-btn" data-v="F" onclick="setGender('F',this)">女 F</button>
          <button type="button" class="g-btn" data-v="X" onclick="setGender('X',this)">其他</button>
        </div>
      </div>
      <div class="field">
        <label for="birthYear">出生年份 <span class="optional">選填</span></label>
        <input id="birthYear" type="number" placeholder="例：1955" min="1920" max="2010">
      </div>
      <div class="field">
        <label for="district">居住地區 <span class="optional">選填</span></label>
        <select id="district">
          <option value="">— 請選擇 —</option>
          ${['中西區','灣仔','東區','南區','油尖旺','深水埗','九龍城','黃大仙','觀塘','荃灣','屯門','元朗','北區','大埔','沙田','西貢','葵青','離島'].map(d=>`<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>

      <div class="consent">
        <label>
          <input type="checkbox" id="consent">
          <span>本人同意 85 AI Technology Limited 根據私隱政策收集及使用以上個人資料，用於 CoEldery 85 老有聯盟會員登記。</span>
        </label>
      </div>

      <button type="button" class="submit-btn" id="registerBtn" onclick="doRegister()">立即登記老有卡</button>

      <div class="footer-links"><a href="/membership/join-family">為家人申請家庭同行卡 →</a></div>
    </div>

  </div><!-- /panel -->

  <!-- Success section (shown after register) -->
  <div id="successSection" style="display:none;">
    <div style="text-align:center;padding:10px 0 20px;">
      <div style="width:64px;height:64px;background:var(--forest);color:#fff;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:36px;">✓</div>
      <h2 style="font-family:'Noto Serif TC',serif;font-size:24px;color:var(--forest-deep);letter-spacing:3px;margin-bottom:6px;">登記成功！</h2>
      <p style="font-size:18px;color:var(--grey-2);margin-bottom:20px;">你的老有卡已發出</p>
    </div>
    <!-- CSS card preview -->
    <div class="gen-card" id="genCard" style="width:340px;height:215px;margin:0 auto 16px;background:linear-gradient(150deg,#FDFAF3 0%,#F0EBD8 100%);border-radius:12px;position:relative;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.18);">
      <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,var(--forest) 45%,var(--ferrari) 55%);"></div>
      <div style="position:absolute;top:14px;left:16px;font-family:'Noto Serif TC',serif;">
        <span style="color:var(--forest-deep);font-size:13px;font-weight:900;">CoEldery</span><span style="color:var(--ferrari);font-size:18px;font-weight:900;margin:0 3px;">85</span><span style="font-size:10px;color:var(--forest-deep);border-left:1.5px solid #ccc;padding-left:6px;">老有卡</span>
      </div>
      <div style="position:absolute;bottom:52px;left:16px;">
        <div style="font-size:11px;color:#aaa;letter-spacing:3px;margin-bottom:6px;">MEMBER NAME · 姓名</div>
        <div id="cardZh" style="font-family:'Noto Serif TC',serif;font-size:40px;font-weight:900;color:#0d3e12;letter-spacing:4px;line-height:1;"></div>
        <div id="cardEn" style="font-size:16px;font-weight:700;color:#0d3e12;margin-top:6px;letter-spacing:1px;"></div>
      </div>
      <div style="position:absolute;bottom:14px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div><div style="font-size:9px;color:#aaa;letter-spacing:2px;">MEMBER NO.</div><div id="cardNo" style="font-family:'Space Grotesk',monospace;font-size:18px;font-weight:700;color:#0d3e12;"></div></div>
        <div style="width:42px;height:42px;background:#fff;padding:2px;border:1.5px solid var(--forest);border-radius:3px;"><canvas id="cardQr" style="width:100%;height:100%;"></canvas></div>
      </div>
    </div>
    <!-- Canvas JPEG -->
    <div id="cardImgWrap" style="display:none;margin:0 auto 16px;max-width:340px;">
      <img id="cardImg" style="width:100%;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.18);" alt="老有卡">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <button class="action-btn" onclick="saveCardImage()">💾 儲存卡圖</button>
      <button class="action-btn red" onclick="window.location.href='/membership/join-family?parent='+encodeURIComponent(window._memberNo||'')">家人申請</button>
    </div>
    <button class="wa-link" id="waImgBtn" onclick="shareCardToWA()" style="width:100%;border:0;cursor:pointer;">📱 WhatsApp 分享會員卡圖片</button>
    <div class="footer-links">
      <a id="myPageLink" href="#" style="color:var(--forest);font-weight:700;">🪪 查看我的會員頁</a><br>
      <a href="/membership/login" style="color:var(--forest);">🔐 下次用電話登入</a><br>
      <a href="/">返回首頁</a>
    </div>
  </div>

  <div class="footer-note">
    如有疑問 WhatsApp：<a href="https://wa.me/85291477341">9147-7341</a> ·
    <a href="/membership/admin">後台</a>
  </div>
</div>

<script>
var selectedGender='';
function setGender(v,btn){selectedGender=v;document.querySelectorAll('.g-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
function showErr(msg){var el=document.getElementById('errMsg');el.textContent=msg;el.classList.add('show');el.scrollIntoView({behavior:'smooth'});}
function switchTab(t){
  document.getElementById('secLogin').classList.toggle('active',t==='login');
  document.getElementById('secRegister').classList.toggle('active',t==='register');
  document.getElementById('tabLogin').classList.toggle('active',t==='login');
  document.getElementById('tabRegister').classList.toggle('active',t==='register');
  document.getElementById('errMsg').classList.remove('show');
}
function validateHKPhone(p){
  if(p.length!==8)return '請填寫正確的 8 位香港電話號碼';
  if(!/^[2-9]/.test(p))return '電話號碼格式不正確（香港號碼以 2–9 開頭，1 除外）';
  if(new Set(p.split('')).size===1)return '請填寫真實的電話號碼';
  if(p==='12345678'||p==='87654321'||p==='11223344')return '請填寫真實的電話號碼';
  return null;
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
async function doLogin(){
  document.getElementById('errMsg').classList.remove('show');
  var phone=document.getElementById('loginPhone').value.replace(/[^0-9]/g,'');
  var phoneErr=validateHKPhone(phone);
  if(phoneErr){showErr(phoneErr);return;}
  var btn=document.getElementById('loginBtn');
  btn.disabled=true;btn.textContent='查詢中…';
  try{
    var res=await fetch('/api/members/lookup?phone='+encodeURIComponent(phone));
    var data=await res.json();
    if(!data.ok){showErr('找不到此電話的會員記錄。如未登記，請切換至「首次登記」。');btn.disabled=false;btn.textContent='登入查看我的卡';return;}
    var m=data.member;
    document.getElementById('rbName').textContent=m.name_zh;
    document.getElementById('rbNo').textContent=m.member_no+' · '+(m.tier==='PRIMARY'?'長者主卡':'家庭同行卡');
    document.getElementById('rbGoBtn').href='/membership/card/'+m.member_no;
    document.getElementById('loginResult').classList.add('show');
    btn.style.display='none';
    document.getElementById('loginPhone').disabled=true;
    if(m.tier==='PRIMARY'){
      var fr=await fetch('/api/members/'+encodeURIComponent(m.member_no)+'/family');
      var fd=await fr.json();
      if(fd.ok&&fd.family&&fd.family.length>0){
        document.getElementById('rbFamilyList').innerHTML=fd.family.map(function(f){
          return '<div class="fc-row"><div><div class="fn">'+f.name_zh+'</div><div class="fno">'+f.member_no+'</div></div><a href="/membership/card/'+f.member_no+'">查看</a></div>';
        }).join('');
        document.getElementById('rbFamilyWrap').style.display='block';
      }
    }
    window.scrollTo(0,0);
  }catch(e){showErr('網絡錯誤，請再試一次');btn.disabled=false;btn.textContent='登入查看我的卡';}
}
document.getElementById('loginPhone').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

// ── REGISTER ─────────────────────────────────────────────────────────────────
async function doRegister(){
  document.getElementById('errMsg').classList.remove('show');
  var nameZh=document.getElementById('nameZh').value.trim();
  var phone=document.getElementById('phone').value.replace(/[^0-9]/g,'');
  if(!nameZh){showErr('請填寫中文姓名');return;}
  var phoneErr=validateHKPhone(phone);
  if(phoneErr){showErr(phoneErr);return;}
  if(!document.getElementById('consent').checked){showErr('請同意私隱政策');return;}
  var btn=document.getElementById('registerBtn');
  btn.disabled=true;btn.textContent='登記中…';
  var params=new URLSearchParams(location.search);
  try{
    var res=await fetch('/api/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      tier:'PRIMARY',nameZh,phone,
      nameEn:document.getElementById('nameEn').value.trim().toUpperCase(),
      gender:selectedGender,
      birthYear:document.getElementById('birthYear').value||'',
      district:document.getElementById('district').value,
      roadshow:params.get('rs')||'walk-in'
    })});
    var data=await res.json();
    if(!data.ok){showErr(data.error||'登記失敗，請再試一次');btn.disabled=false;btn.textContent='立即登記老有卡';return;}
    showSuccess(data);
  }catch(e){showErr('網絡錯誤，請再試一次');btn.disabled=false;btn.textContent='立即登記老有卡';}
}

function showSuccess(data){
  document.querySelector('.tab-bar').style.display='none';
  document.getElementById('errMsg').classList.remove('show');
  document.querySelector('.panel').style.display='none';
  document.getElementById('successSection').style.display='block';
  document.getElementById('cardZh').textContent=data.nameZh;
  document.getElementById('cardEn').textContent=data.nameEn||'';
  document.getElementById('cardNo').textContent=data.memberNo;
  var cardUrl=location.origin+'/membership/card/'+data.memberNo;
  try{QRCode.toCanvas(document.getElementById('cardQr'),cardUrl,{width:38,margin:0,color:{dark:'#0d3e12',light:'#ffffff'},errorCorrectionLevel:'H'});}catch(e){console.warn('QR:',e);}
  var myLink=document.getElementById('myPageLink');
  if(myLink)myLink.href='/membership/card/'+data.memberNo;
  window._memberNo = data.memberNo;
  window.scrollTo(0,0);
  setTimeout(function(){renderCardImage(data,'PRIMARY');},200);
}

function renderCardImage(data, tier) {
  var logoImg=new Image();
  logoImg.onload=function(){
  // Canvas: 1360×860 @2x (displays as 680×430, credit-card ratio)
  var W=1360, H=860;
  var canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  var ctx=canvas.getContext('2d');
  var isPrimary=(tier!=='FAMILY');
  var forestDeep='#0d3e12',forest='#2E7D32',forestPale='#E8F5E9';
  var ferrari='#C62828',ferrariDeep='#8B0000',ferrariPale='#FFEBEE';
  var accentDark=isPrimary?forestDeep:ferrariDeep;
  var accentMid=isPrimary?forest:ferrari;
  var qrDark=isPrimary?forestDeep:'#a80000';
  // ── Background gradient
  var bg=ctx.createLinearGradient(0,0,W,H);
  if(isPrimary){bg.addColorStop(0,'#FDFAF3');bg.addColorStop(1,'#F0EBD8');}
  else{bg.addColorStop(0,'#FFF8F8');bg.addColorStop(1,'#FFE8E8');}
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // ── Watermark "85" — centred-right, large, faint — Montserrat Bold
  ctx.save(); ctx.globalAlpha=0.07; ctx.fillStyle=accentDark;
  ctx.font='bold 700px "Montserrat",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('85',W*0.72,H*0.56); ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.restore();
  // ── Top colour stripe (green left | red right)
  var stripeH=16;
  ctx.fillStyle=forest; ctx.fillRect(0,0,W*0.45,stripeH);
  ctx.fillStyle=ferrari; ctx.fillRect(W*0.45,0,W*0.55,stripeH);
  // ── Logo (top-left) — no divider line below
  var logoX=40,logoY=stripeH+20,logoW=330,logoH=132;
  ctx.drawImage(logoImg,logoX,logoY,logoW,logoH);
  // Vertical divider after logo
  ctx.strokeStyle=accentDark; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(logoX+logoW+24,logoY+10); ctx.lineTo(logoX+logoW+24,logoY+logoH-10); ctx.stroke();
  // Card type label (老有卡 / 家庭同行)
  var cardNameX=logoX+logoW+44;
  ctx.fillStyle=accentDark;
  if(isPrimary){ctx.font='bold 51px "Noto Serif TC",serif';ctx.fillText('老有卡',cardNameX,logoY+logoH/2+18);}
  else{ctx.font='bold 42px "Noto Serif TC",serif';ctx.fillText('老有卡',cardNameX,logoY+logoH/2-9);ctx.fillText('家庭同行',cardNameX,logoY+logoH/2+44);}
  // ── Badge (top-right)
  var badgeW=462,badgeH=75,badgeX=W-badgeW-48,badgeY=stripeH+26;
  ctx.fillStyle=isPrimary?forestPale:ferrariPale; ctx.strokeStyle=accentMid; ctx.lineWidth=3;
  ctx.beginPath(); roundRect(ctx,badgeX,badgeY,badgeW,badgeH,8); ctx.fill(); ctx.stroke();
  ctx.fillStyle=ferrari; ctx.font='bold 29px sans-serif'; ctx.fillText('◆',badgeX+18,badgeY+50);
  ctx.fillStyle=accentDark; ctx.font='bold 35px "Noto Serif TC",serif'; ctx.fillText('CoExplorery 探索者',badgeX+54,badgeY+50);
  // Tier label (right-aligned, below badge)
  ctx.fillStyle=ferrari; ctx.font='bold 33px "Noto Serif TC",serif'; ctx.textAlign='right';
  ctx.fillText(isPrimary?'主卡 · PRIMARY':'附屬 · FAMILY',W-48,badgeY+badgeH+42); ctx.textAlign='left';
  // ── Name area — pushed up, starting right after header zone
  var nameAreaY=stripeH+340;
  ctx.fillStyle='#999'; ctx.font='26px "Noto Serif TC",serif';
  var lbl='會員姓名',lx=48;
  for(var i=0;i<lbl.length;i++){ctx.fillText(lbl[i],lx,nameAreaY);lx+=ctx.measureText(lbl[i]).width+10;}
  ctx.fillStyle=accentDark;
  var zh=data.nameZh||'';
  var zhSz=zh.length<=2?200:zh.length<=3?178:zh.length<=4?148:112;
  ctx.font='bold '+zhSz+'px "Noto Serif TC",serif'; ctx.fillText(zh,48,nameAreaY+zhSz+10);
  var enY=nameAreaY+zhSz+10;
  if(data.nameEn&&data.nameEn.trim()){
    ctx.fillStyle=accentDark; ctx.font='bold 46px "Noto Serif TC",serif'; enY+=60;
    ctx.fillText(data.nameEn.trim(),48,enY);
  }
  if(!isPrimary&&data.parentNo){
    ctx.fillStyle=ferrari; ctx.font='26px "Noto Serif TC",serif';
    ctx.fillText('◆ 綁定主卡：'+data.parentNo+(data.parentName?' （'+data.parentName+'）':''),48,enY+48);
  }
  // ── QR code — bottom-right corner, pixel-perfect fill (no white gap)
  var footY=H-36;
  var qrSz=192,qrX=W-qrSz-40,qrY2=H-qrSz-40;
  ctx.fillStyle='#fff'; ctx.fillRect(qrX-8,qrY2-8,qrSz+16,qrSz+16);
  ctx.strokeStyle=accentMid; ctx.lineWidth=4; ctx.strokeRect(qrX-8,qrY2-8,qrSz+16,qrSz+16);
  try{
    var qr=qrcode(0,'M');
    qr.addData(location.origin+'/membership/card/'+(data.memberNo||''));
    qr.make();
    var mc=qr.getModuleCount();
    // Use exact cell size so modules fill entire qrSz — no fractional gap
    var cell=qrSz/mc;
    ctx.fillStyle=qrDark;
    for(var row=0;row<mc;row++){for(var col=0;col<mc;col++){
      if(qr.isDark(row,col)) ctx.fillRect(qrX+col*cell,qrY2+row*cell,cell,cell);
    }}
  }catch(e){console.warn('QR err',e);}
  // ── Footer — no background box, clean transparent
  ctx.fillStyle='#aaa'; ctx.font='28px "Noto Serif TC",serif'; ctx.fillText('會員編號',48,footY-72);
  ctx.fillStyle=accentDark; ctx.font='bold 56px "Space Grotesk",monospace'; ctx.fillText(data.memberNo||'',48,footY-8);
  if(data.expiresAt){
    var expStr=data.expiresAt.slice(0,7).replace('-','/');
    var expDisp=expStr.slice(5)+' / '+expStr.slice(0,4);
    ctx.fillStyle='#aaa'; ctx.font='28px "Noto Serif TC",serif'; ctx.fillText('有效期至',560,footY-72);
    ctx.fillStyle=accentDark; ctx.font='bold 56px "Space Grotesk",monospace'; ctx.fillText(expDisp,560,footY-8);
  }
  // ── Convert → JPEG blob
  canvas.toBlob(function(blob){
    if(!blob)return;
    window._cardBlob=blob; window._cardFileName='CoEldery85_'+(data.memberNo||'card')+'.jpg';
    var url=URL.createObjectURL(blob);
    var img=document.getElementById('cardImg'); if(img)img.src=url;
    var wrap=document.getElementById('cardImgWrap'); if(wrap)wrap.style.display='block';
    var cssCard=document.getElementById('genCard'); if(cssCard)cssCard.style.display='none';
  },'image/jpeg',0.95);
  }; // end logoImg.onload
  logoImg.src='/static/logo.png';
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
function saveCardImage(){
  if(!window._cardBlob){alert('圖片未準備好，請稍候再試');return;}
  var a=document.createElement('a');a.href=URL.createObjectURL(window._cardBlob);a.download=window._cardFileName||'coeldery85-card.jpg';a.click();
}
async function shareCardToWA(){
  if(!window._cardBlob){alert('圖片未準備好，請稍候再試');return;}
  var file=new File([window._cardBlob],window._cardFileName||'coeldery85-card.jpg',{type:'image/jpeg'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:'CoEldery 85 老有卡',text:'我已成功登記 CoEldery 85 老有聯盟會員！'});return;}
    catch(e){if(e.name!=='AbortError')console.warn('share error',e);}
  }
  saveCardImage();
  alert('請在相簿選取剛下載的會員卡圖片，貼入 WhatsApp 傳送。');
}
</script>
</body></html>`
}

// ─── Login HTML ───────────────────────────────────────────────────────────────
function loginHtml() {
  return htmlHead('會員登入', `<style>
body{background:#F0EBD8;min-height:100vh;padding:20px 16px;font-size:20px;line-height:1.6;}
.container{max-width:420px;margin:0 auto;}
.brand-strip{display:flex;align-items:center;gap:12px;margin-bottom:24px;}
.brand-strip .mark{width:44px;height:44px;background:var(--forest-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Noto Serif TC",serif;font-weight:900;font-size:18px;border-radius:6px;}
.brand-strip .name .zh{font-family:"Noto Serif TC",serif;font-size:18px;color:var(--forest-deep);font-weight:700;letter-spacing:2px;}
.brand-strip .name .en{font-size:11px;color:var(--grey-2);letter-spacing:2px;margin-top:4px;}
.header-card{background:linear-gradient(135deg,var(--forest-deep) 0%,var(--forest) 100%);color:#fff;padding:28px 22px;border-radius:4px;margin-bottom:20px;position:relative;overflow:hidden;}
.header-card::before{content:"老";position:absolute;right:-10px;bottom:-40px;font-family:"Noto Serif TC",serif;font-size:180px;font-weight:900;color:rgba(255,255,255,0.08);line-height:1;}
.header-card h1{font-family:"Noto Serif TC",serif;font-size:28px;font-weight:900;letter-spacing:3px;margin-bottom:8px;position:relative;z-index:2;}
.header-card p{font-size:18px;opacity:0.85;line-height:1.6;position:relative;z-index:2;}
.form-card{background:#fff;padding:28px 22px;border-radius:4px;margin-bottom:16px;}
.field{margin-bottom:20px;}
.field label{display:block;font-family:"Noto Serif TC",serif;font-size:15px;color:var(--forest-deep);font-weight:700;letter-spacing:1px;margin-bottom:8px;}
.field input{width:100%;padding:16px;border:2px solid var(--line);border-radius:4px;font-size:20px;font-family:"Space Grotesk",monospace;color:var(--ink);background:#fff;transition:border 0.2s;letter-spacing:2px;}
.field input:focus{outline:0;border-color:var(--forest);}
.field .hint{font-size:11px;color:var(--grey-3);margin-top:6px;line-height:1.5;}
.submit-btn{width:100%;padding:18px;background:var(--forest-deep);color:#fff;border:0;border-radius:4px;font-size:18px;font-family:"Noto Serif TC",sans-serif;font-weight:700;letter-spacing:4px;cursor:pointer;box-shadow:0 4px 0 var(--forest);transition:all 0.1s;}
.submit-btn:disabled{background:var(--grey-3);box-shadow:0 4px 0 var(--grey-2);cursor:not-allowed;}
.err-msg{background:var(--ferrari-pale);border:1px solid var(--ferrari);color:var(--ferrari-deep);padding:12px 16px;border-radius:4px;font-size:13px;margin-bottom:16px;display:none;}
.err-msg.show{display:block;}
.footer-links{text-align:center;margin-top:20px;font-size:18px;color:var(--grey-3);line-height:2;}
.footer-links a{color:var(--forest);text-decoration:none;font-weight:700;}
.result-card{background:#fff;border-radius:8px;padding:24px 20px;border-left:4px solid var(--forest);display:none;margin-bottom:16px;}
.result-card.show{display:block;}
.rc-name{font-family:"Noto Serif TC",serif;font-size:32px;font-weight:900;color:var(--forest-deep);margin-bottom:4px;}
.rc-no{font-family:"Space Grotesk",monospace;font-size:18px;color:var(--grey-2);margin-bottom:16px;}
.rc-go-btn{display:block;width:100%;padding:16px;background:var(--forest-deep);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:20px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:10px;min-height:55px;}
.rc-family{background:#fff;border-radius:8px;padding:20px;border-left:4px solid var(--ferrari);display:none;margin-bottom:16px;}
.rc-family.show{display:block;}
.fc-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f5f5f5;}
.fc-item:last-child{border-bottom:none;}
.fc-name{font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;color:var(--ferrari-deep);}
.fc-no{font-family:"Space Grotesk",monospace;font-size:12px;color:#aaa;}
.fc-btn{padding:6px 14px;background:var(--ferrari);color:#fff;border-radius:4px;font-size:12px;font-weight:700;text-decoration:none;}
</style>`) + `
<body>
<div class="container">
  <div class="brand-strip">
    <div class="mark">老</div>
    <div class="name">
      <div class="zh">CoEldery 85 老有聯盟</div>
      <div class="en">MEMBER LOGIN</div>
    </div>
  </div>

  <div class="header-card">
    <h1>會員登入</h1>
    <p>輸入登記時的 WhatsApp 電話<br>即可查看你的老有卡及修改資料</p>
  </div>

  <div class="err-msg" id="errMsg"></div>

  <div id="formSection">
    <div class="form-card">
      <div class="field">
        <label for="phone">你的 WhatsApp 電話</label>
        <input id="phone" type="tel" placeholder="例：91234567" inputmode="numeric" maxlength="8" autofocus>
        <div class="hint">請輸入登記老有卡時使用的 8 位電話號碼</div>
      </div>
      <button type="button" class="submit-btn" id="submitBtn" onclick="doLogin()">
        登入查看我的卡
      </button>
    </div>
    <div class="footer-links">
      <a href="/membership/join">← 未有會員？立即登記</a><br>
      <a href="/">返回首頁</a>
    </div>
  </div>

  <!-- Result: primary card found -->
  <div class="result-card" id="resultCard">
    <div class="rc-name" id="rcName"></div>
    <div class="rc-no" id="rcNo"></div>
    <a id="rcGoBtn" href="#" class="rc-go-btn">🪪 查看我的老有卡</a>
    <div style="text-align:center;font-size:12px;color:var(--grey-3);">點擊後即可查看及編輯你的會員資料</div>
  </div>

  <!-- Result: family cards under this phone -->
  <div class="rc-family" id="familyResult">
    <div style="font-family:'Noto Serif TC',serif;font-size:13px;color:var(--ferrari-deep);letter-spacing:2px;font-weight:700;margin-bottom:12px;">◆ 家庭同行卡</div>
    <div id="familyList"></div>
  </div>

  <div id="afterResult" style="display:none;" class="footer-links">
    <a href="/membership/join">← 返回登記頁</a> · <a href="/">首頁</a>
  </div>
</div>

<script>
function showErr(msg){var el=document.getElementById('errMsg');el.textContent=msg;el.classList.add('show');el.scrollIntoView({behavior:'smooth'});}

async function doLogin(){
  document.getElementById('errMsg').classList.remove('show');
  var phone=document.getElementById('phone').value.replace(/[^0-9]/g,'');
  if(phone.length!==8){showErr('請輸入正確的 8 位電話號碼');return;}
  var btn=document.getElementById('submitBtn');
  btn.disabled=true; btn.textContent='查詢中…';

  try{
    var res=await fetch('/api/members/lookup?phone='+encodeURIComponent(phone));
    var data=await res.json();
    if(!data.ok){
      showErr('找不到此電話的會員記錄。如未登記，請先申請老有卡。');
      btn.disabled=false; btn.textContent='登入查看我的卡';
      return;
    }
    var m=data.member;
    // Show result card
    document.getElementById('formSection').style.display='none';
    document.getElementById('rcName').textContent=m.name_zh;
    document.getElementById('rcNo').textContent=m.member_no+' · '+(m.tier==='PRIMARY'?'長者主卡':'家庭同行卡');
    document.getElementById('rcGoBtn').href='/membership/card/'+m.member_no;
    document.getElementById('resultCard').classList.add('show');

    // If primary, also look up family cards
    if(m.tier==='PRIMARY'){
      var fr=await fetch('/api/members/'+encodeURIComponent(m.member_no)+'/family');
      var fd=await fr.json();
      if(fd.ok && fd.family && fd.family.length>0){
        var html=fd.family.map(function(f){
          return '<div class="fc-item"><div><div class="fc-name">'+f.name_zh+'</div><div class="fc-no">'+f.member_no+'</div></div><a href="/membership/card/'+f.member_no+'" class="fc-btn">查看</a></div>';
        }).join('');
        document.getElementById('familyList').innerHTML=html;
        document.getElementById('familyResult').classList.add('show');
      }
    }
    document.getElementById('afterResult').style.display='block';
    window.scrollTo(0,0);
  }catch(e){
    showErr('網絡錯誤，請再試一次');
    btn.disabled=false; btn.textContent='登入查看我的卡';
  }
}

// Allow pressing Enter to submit
document.getElementById('phone').addEventListener('keydown',function(e){
  if(e.key==='Enter') doLogin();
});
</script>
</body></html>`
}

// ─── New /admin Shell (Login-protected) ──────────────────────────────────────
function newAdminShellHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>85 AI 管理後台</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<style>
:root{--brand:#1B4332;--brand-light:#2D6A4F;--accent:#40916C;}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;min-height:100vh;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F3F4F6;color:#1F2937;min-height:100vh;}
/* ── Login Screen ── */
#login-screen{display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);}
.login-card{background:#fff;border-radius:12px;padding:40px 36px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
.login-logo{text-align:center;margin-bottom:28px;}
.login-logo .mark{display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background:var(--brand);color:#fff;font-size:26px;font-weight:900;border-radius:10px;margin-bottom:12px;}
.login-logo h1{font-size:20px;font-weight:700;color:var(--brand);}
.login-logo p{font-size:12px;color:#6B7280;margin-top:4px;}
.login-field{margin-bottom:18px;}
.login-field label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;}
.login-field input{width:100%;padding:12px 14px;border:1.5px solid #D1D5DB;border-radius:8px;font-size:16px;transition:border 0.2s;}
.login-field input:focus{outline:none;border-color:var(--brand);}
.login-btn{width:100%;padding:13px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;transition:background 0.2s;}
.login-btn:hover{background:var(--brand-light);}
.login-btn:disabled{background:#9CA3AF;cursor:not-allowed;}
.login-err{background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:14px;display:none;}
.login-err.show{display:block;}
/* ── App Shell ── */
#app-shell{display:none;min-height:100vh;width:100%;}
.sidebar{position:fixed;top:0;left:0;width:220px;height:100vh;background:var(--brand);color:#fff;display:flex;flex-direction:column;z-index:100;}
.sidebar-logo{padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,0.1);}
.sidebar-logo .mark{display:inline-block;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:6px;font-weight:900;font-size:16px;letter-spacing:1px;margin-bottom:4px;}
.sidebar-logo p{font-size:11px;opacity:0.7;margin-top:2px;}
.sidebar-nav{flex:1;overflow-y:auto;padding:12px 0;}
.nav-item{display:flex;align-items:center;gap:10px;padding:11px 18px;cursor:pointer;transition:background 0.15s;font-size:14px;font-weight:500;}
.nav-item:hover{background:rgba(255,255,255,0.08);}
.nav-item.active{background:rgba(255,255,255,0.15);border-right:3px solid #fff;}
.nav-item i{width:18px;text-align:center;opacity:0.8;}
.sidebar-footer{padding:14px 16px;border-top:1px solid rgba(255,255,255,0.1);}
.logout-btn{display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#fff;font-size:13px;cursor:pointer;width:100%;transition:background 0.15s;}
.logout-btn:hover{background:rgba(255,255,255,0.15);}
.main-content{margin-left:220px;min-height:100vh;width:calc(100% - 220px);display:flex;flex-direction:column;}
.topbar{background:#fff;border-bottom:1px solid #E5E7EB;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;}
.topbar h2{font-size:18px;font-weight:700;color:#111827;}
.page-area{flex:1;padding:24px;overflow-y:auto;}
/* ── Module Pages ── */
.mod-page{display:none;}
.mod-page.active{display:block;}
/* ── Roadshow Module ── */
.rs-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
.rs-tabs{display:flex;gap:8px;border-bottom:2px solid #E5E7EB;margin-bottom:20px;}
.rs-tab{padding:10px 18px;border:none;background:none;font-size:14px;font-weight:500;color:#6B7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color 0.15s;}
.rs-tab.active{color:var(--brand);border-bottom-color:var(--brand);}
.rs-card{background:#fff;border-radius:10px;border:1px solid #E5E7EB;overflow:hidden;margin-bottom:12px;}
.rs-card-header{padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}
.rs-card-name{font-size:15px;font-weight:700;color:#111827;}
.rs-card-code{font-size:12px;color:#6B7280;font-family:monospace;background:#F3F4F6;padding:2px 8px;border-radius:4px;}
.rs-card-meta{font-size:12px;color:#6B7280;margin-top:4px;}
.status-badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;}
.status-active{background:#D1FAE5;color:#065F46;}
.status-inactive{background:#F3F4F6;color:#6B7280;}
.status-ended{background:#FEE2E2;color:#991B1B;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:all 0.15s;}
.btn-primary{background:var(--brand);color:#fff;border-color:var(--brand);}
.btn-primary:hover{background:var(--brand-light);}
.btn-secondary{background:#fff;color:#374151;border-color:#D1D5DB;}
.btn-secondary:hover{background:#F9FAFB;}
.btn-danger{background:#EF4444;color:#fff;border-color:#EF4444;}
.btn-danger:hover{background:#DC2626;}
.btn-sm{padding:5px 10px;font-size:12px;}
/* ── Store grid ── */
.store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}
.store-card{background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:14px 16px;}
.store-card-code{font-family:monospace;font-size:11px;color:#6B7280;background:#F3F4F6;padding:2px 6px;border-radius:4px;margin-bottom:6px;display:inline-block;}
.store-card-name{font-size:14px;font-weight:700;color:#111827;margin-bottom:4px;}
.store-card-dist{font-size:12px;color:#6B7280;}
/* ── Modal ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;display:none;align-items:center;justify-content:center;}
.modal-overlay.open{display:flex;}
.modal{background:#fff;border-radius:12px;padding:28px 28px 24px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
.modal h3{font-size:17px;font-weight:700;margin-bottom:18px;color:#111827;}
.form-field{margin-bottom:14px;}
.form-field label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:5px;}
.form-field input,.form-field select,.form-field textarea{width:100%;padding:9px 11px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:14px;}
.form-field input:focus,.form-field select:focus,.form-field textarea:focus{outline:none;border-color:var(--brand);}
.modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;}
/* ── Search ── */
.search-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}
.search-bar input,.search-bar select{padding:8px 12px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:14px;}
.search-bar input:focus,.search-bar select:focus{outline:none;border-color:var(--brand);}
/* ── Membership redirect panel ── */
.redirect-panel{background:#fff;border-radius:10px;border:1px solid #E5E7EB;padding:20px;text-align:center;}
.redirect-panel p{color:#6B7280;font-size:14px;margin-bottom:14px;}
.redirect-panel a{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:var(--brand);color:#fff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;}
</style>
</head>
<body>

<!-- LOGIN SCREEN -->
<div id="login-screen">
  <div class="login-card">
    <div class="login-logo">
      <div class="mark">老</div>
      <h1>85 AI 管理後台</h1>
      <p>CoEldery 85 老有聯盟 · 管理員專用</p>
    </div>
    <div class="login-err" id="login-err"></div>
    <div class="login-field">
      <label>管理員密碼</label>
      <input type="password" id="login-pw" placeholder="請輸入密碼" autocomplete="current-password">
    </div>
    <button class="login-btn" id="login-btn" onclick="doAdminLogin()">
      <i class="fas fa-sign-in-alt" style="margin-right:8px"></i>登入
    </button>
  </div>
</div>

<!-- APP SHELL -->
<div id="app-shell">
  <!-- Sidebar -->
  <nav class="sidebar">
    <div class="sidebar-logo">
      <div class="mark">老</div>
      <p>85 AI 管理後台</p>
    </div>
    <div class="sidebar-nav">
      <div class="nav-item" onclick="switchMod('mod-membership')">
        <i class="fas fa-id-card"></i> 會員系統
      </div>
      <div class="nav-item active" onclick="switchMod('mod-roadshow')">
        <i class="fas fa-map-marker-alt"></i> Roadshow 管理
      </div>
      <div class="nav-item" onclick="switchMod('mod-products')">
        <i class="fas fa-box"></i> 產品管理
      </div>
      <div class="nav-item" onclick="switchMod('mod-useful-links')">
        <i class="fas fa-info-circle"></i> 有用資訊管理
      </div>
      <div class="nav-item" onclick="switchMod('mod-jobs')">
        <i class="fas fa-briefcase"></i> 工作管理
      </div>
    </div>
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="doAdminLogout()">
        <i class="fas fa-sign-out-alt"></i> 登出
      </button>
    </div>
  </nav>

  <!-- Main Content -->
  <div class="main-content">
    <div class="topbar">
      <h2 id="topbar-title">Roadshow 管理</h2>
      <span style="font-size:12px;color:#6B7280">CoEldery 85 老有聯盟</span>
    </div>
    <div class="page-area">

      <!-- Membership Module (embedded via iframe — 原生一體外觀) -->
      <div id="mod-membership" class="mod-page">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:10px;background:#fff;border:1px solid #E5E7EB;border-radius:8px;">
          <span style="font-size:13px;font-weight:600;color:#374151;">
            <i class="fas fa-id-card" style="margin-right:6px;color:var(--brand)"></i>會員管理系統
          </span>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="reloadMembershipFrame()">
              <i class="fas fa-rotate-right"></i> 重新載入
            </button>
            <a class="btn btn-secondary btn-sm" href="/membership/admin" target="_blank" style="text-decoration:none;">
              <i class="fas fa-external-link-alt"></i> 新分頁開啟
            </a>
          </div>
        </div>
        <iframe id="membership-frame" src="about:blank"
          style="width:100%;height:calc(100vh - 110px);border:1px solid #E5E7EB;border-radius:8px;background:#fff;display:block;">
        </iframe>
      </div>

      <!-- Roadshow Module -->
      <div id="mod-roadshow" class="mod-page active">
        <!-- Tabs -->
        <div class="rs-tabs">
          <button class="rs-tab active" onclick="rsTab('roadshows')" id="rs-tab-roadshows">
            <i class="fas fa-calendar-alt" style="margin-right:6px"></i>Roadshow 活動
          </button>
          <button class="rs-tab" onclick="rsTab('stores')" id="rs-tab-stores">
            <i class="fas fa-store" style="margin-right:6px"></i>JHC 商店
          </button>
        </div>

        <!-- Roadshow List Panel -->
        <div id="rs-panel-roadshows">
          <div class="rs-header">
            <div>
              <h3 style="font-size:16px;font-weight:700;color:#111827">Roadshow 活動列表</h3>
              <p style="font-size:12px;color:#6B7280;margin-top:2px" id="rs-count-label"></p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <select id="rs-filter-status" onchange="loadRoadshows()" style="padding:8px 12px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:13px;">
                <option value="">全部狀態</option>
                <option value="active">進行中</option>
                <option value="inactive">暫停</option>
                <option value="ended">已結束</option>
              </select>
              <button class="btn btn-primary" onclick="openCreateRs()">
                <i class="fas fa-plus"></i> 新增 Roadshow
              </button>
            </div>
          </div>
          <div id="rs-list"></div>
        </div>

        <!-- Store List Panel -->
        <div id="rs-panel-stores" style="display:none">
          <div class="rs-header">
            <div>
              <h3 style="font-size:16px;font-weight:700;color:#111827">JHC 商店列表</h3>
              <p style="font-size:12px;color:#6B7280;margin-top:2px" id="store-count-label"></p>
            </div>
          </div>
          <div class="search-bar">
            <input type="text" id="store-search" placeholder="搜尋商店名稱/代號..." oninput="loadStores()" style="flex:1;min-width:200px">
            <select id="store-district-filter" onchange="loadStores()" style="min-width:120px">
              <option value="">全部地區</option>
            </select>
          </div>
          <div class="store-grid" id="store-grid"></div>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- Create Roadshow Modal -->
<div class="modal-overlay" id="modal-create-rs">
  <div class="modal">
    <h3><i class="fas fa-plus-circle" style="margin-right:8px;color:var(--brand)"></i>新增 Roadshow 活動</h3>
    <div class="form-field">
      <label>Roadshow Code <span style="color:#EF4444">*</span></label>
      <input type="text" id="new-rs-code" placeholder="例: RS2024-001" style="font-family:monospace">
    </div>
    <div class="form-field">
      <label>活動名稱 <span style="color:#EF4444">*</span></label>
      <input type="text" id="new-rs-name" placeholder="例: 北角健威坊 Roadshow">
    </div>
    <div class="form-field">
      <label>選擇商店 (選填)</label>
      <select id="new-rs-store">
        <option value="">-- 不指定商店 --</option>
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-field">
        <label>開始日期</label>
        <input type="date" id="new-rs-start">
      </div>
      <div class="form-field">
        <label>結束日期</label>
        <input type="date" id="new-rs-end">
      </div>
    </div>
    <div class="form-field">
      <label>備註</label>
      <textarea id="new-rs-notes" rows="2" style="resize:vertical" placeholder="選填備註"></textarea>
    </div>
    <div id="modal-err" style="color:#DC2626;font-size:13px;margin-top:8px;display:none"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-create-rs')">取消</button>
      <button class="btn btn-primary" onclick="submitCreateRs()">
        <i class="fas fa-save"></i> 儲存
      </button>
    </div>
  </div>
</div>

<!-- Edit Roadshow Modal -->
<div class="modal-overlay" id="modal-edit-rs">
  <div class="modal">
    <h3><i class="fas fa-edit" style="margin-right:8px;color:var(--brand)"></i>編輯 Roadshow</h3>
    <input type="hidden" id="edit-rs-id">
    <div class="form-field">
      <label>活動名稱 <span style="color:#EF4444">*</span></label>
      <input type="text" id="edit-rs-name">
    </div>
    <div class="form-field">
      <label>選擇商店</label>
      <select id="edit-rs-store"></select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-field">
        <label>開始日期</label>
        <input type="date" id="edit-rs-start">
      </div>
      <div class="form-field">
        <label>結束日期</label>
        <input type="date" id="edit-rs-end">
      </div>
    </div>
    <div class="form-field">
      <label>狀態</label>
      <select id="edit-rs-status">
        <option value="active">進行中</option>
        <option value="inactive">暫停</option>
        <option value="ended">已結束</option>
      </select>
    </div>
    <div class="form-field">
      <label>備註</label>
      <textarea id="edit-rs-notes" rows="2" style="resize:vertical"></textarea>
    </div>
    <div id="modal-edit-err" style="color:#DC2626;font-size:13px;margin-top:8px;display:none"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-edit-rs')">取消</button>
      <button class="btn btn-primary" onclick="submitEditRs()">
        <i class="fas fa-save"></i> 儲存
      </button>
    </div>
  </div>
</div>

<!-- Products Module (Batch 3) -->
<div id="mod-products" class="mod-page">
  <div class="rs-header">
    <div>
      <h3 style="font-size:16px;font-weight:700;color:#111827">產品主庫</h3>
      <p style="font-size:12px;color:#6B7280;margin-top:2px" id="prod-count-label"></p>
    </div>
    <button class="btn btn-primary" onclick="openCreateProduct()">
      <i class="fas fa-plus"></i> 新增產品
    </button>
  </div>
  <div class="search-bar">
    <input type="text" id="prod-search" placeholder="搜尋名稱／品牌／SKU..." oninput="loadProducts()" style="flex:1;min-width:200px">
    <select id="prod-category-filter" onchange="loadProducts()" style="min-width:120px">
      <option value="">全部分類</option>
    </select>
    <select id="prod-status-filter" onchange="loadProducts()" style="min-width:120px">
      <option value="active">使用中</option>
      <option value="">全部</option>
      <option value="inactive">已停用</option>
    </select>
  </div>
  <div class="store-grid" id="prod-grid"></div>
</div>

<!-- Useful Links Module -->
<div id="mod-useful-links" class="mod-page">
  <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <h3 style="font-size:16px;font-weight:700;color:#111827">有用資訊管理</h3>
      <p style="font-size:12px;color:#6B7280;margin-top:2px" id="ul-count-label"></p>
    </div>
    <button class="btn btn-primary" onclick="openCreateUsefulLink()">
      <i class="fas fa-plus"></i> 新增資訊
    </button>
  </div>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:14px" id="ul-table">
      <thead>
        <tr style="background:#F3F4F6;text-align:left">
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">標題</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">類型</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">內容</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">排序</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">狀態</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">操作</th>
        </tr>
      </thead>
      <tbody id="ul-tbody"></tbody>
    </table>
  </div>
</div>

<!-- Useful Links Create/Edit Modal -->
<div class="modal-overlay" id="modal-useful-link">
  <div class="modal">
    <h3 id="ul-modal-title"><i class="fas fa-info-circle" style="margin-right:8px;color:var(--brand)"></i>新增有用資訊</h3>
    <input type="hidden" id="ul-id">
    <div class="form-field"><label>標題 <span style="color:#EF4444">*</span></label><input type="text" id="ul-title" placeholder="例：長者熱線"></div>
    <div class="form-field">
      <label>類型 <span style="color:#EF4444">*</span></label>
      <select id="ul-link-type">
        <option value="phone">phone（電話）</option>
        <option value="whatsapp">whatsapp（WhatsApp）</option>
        <option value="url">url（網址）</option>
        <option value="text">text（純文字）</option>
      </select>
    </div>
    <div class="form-field"><label>內容 <span style="color:#EF4444">*</span></label><input type="text" id="ul-content" placeholder="電話號碼 / WhatsApp號碼 / 網址 / 純文字"></div>
    <div class="form-field"><label>排序（細數排前）</label><input type="number" id="ul-sort-order" value="0" min="0"></div>
    <div class="form-field" id="ul-active-field" style="display:none">
      <label>狀態</label>
      <select id="ul-is-active"><option value="1">顯示</option><option value="0">隱藏</option></select>
    </div>
    <div id="ul-modal-err" style="color:#DC2626;font-size:13px;margin-top:8px;display:none"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-useful-link')">取消</button>
      <button class="btn btn-primary" onclick="submitUsefulLink()"><i class="fas fa-save"></i> 儲存</button>
    </div>
  </div>
</div>

<!-- Jobs Module -->
<div id="mod-jobs" class="mod-page">
  <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <h3 style="font-size:16px;font-weight:700;color:#111827">工作市場管理</h3>
      <p style="font-size:12px;color:#6B7280;margin-top:2px" id="jobs-count-label"></p>
    </div>
    <button class="btn btn-primary" onclick="openCreateJob()">
      <i class="fas fa-plus"></i> 新增工作
    </button>
  </div>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:14px" id="jobs-table">
      <thead>
        <tr style="background:#F3F4F6;text-align:left">
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">縮圖</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">職位名稱</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">地點</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">性質</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">排序</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">狀態</th>
          <th style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB">操作</th>
        </tr>
      </thead>
      <tbody id="jobs-tbody"></tbody>
    </table>
  </div>
</div>

<!-- Jobs Create/Edit Modal -->
<div class="modal-overlay" id="modal-job">
  <div class="modal" style="max-height:90vh;overflow-y:auto">
    <h3 id="job-modal-title"><i class="fas fa-briefcase" style="margin-right:8px;color:var(--brand)"></i>新增工作</h3>
    <input type="hidden" id="job-id">
    <div class="form-field"><label>圖片 URL (4:3 比例)</label><input type="text" id="job-image-url" placeholder="https://..."></div>
    <div class="form-field"><label>職位名稱 <span style="color:#EF4444">*</span></label><input type="text" id="job-title"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-field"><label>工作地點</label><input type="text" id="job-location" placeholder="例：旺角"></div>
      <div class="form-field"><label>工作性質</label><input type="text" id="job-type" placeholder="兼職/全職/義工"></div>
      <div class="form-field"><label>公司／機構</label><input type="text" id="job-company"></div>
      <div class="form-field"><label>待遇／時薪</label><input type="text" id="job-salary" placeholder="例：$60/小時"></div>
    </div>
    <div class="form-field"><label>詳細資料</label><textarea id="job-description" rows="3" style="resize:vertical"></textarea></div>
    <div class="form-field"><label>要求</label><textarea id="job-requirement" rows="2" style="resize:vertical"></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-field"><label>排序（細數排前）</label><input type="number" id="job-sort-order" value="0" min="0"></div>
      <div class="form-field" id="job-status-field" style="display:none">
        <label>狀態</label>
        <select id="job-status"><option value="open">開放申請</option><option value="closed">已截止</option></select>
      </div>
    </div>
    <div id="job-modal-err" style="color:#DC2626;font-size:13px;margin-top:8px;display:none"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-job')">取消</button>
      <button class="btn btn-primary" onclick="submitJob()"><i class="fas fa-save"></i> 儲存</button>
    </div>
  </div>
</div>

<!-- Job Applications Modal -->
<div class="modal-overlay" id="modal-job-apps">
  <div class="modal" style="max-width:620px;max-height:90vh;overflow-y:auto">
    <h3 id="job-apps-title"><i class="fas fa-users" style="margin-right:8px;color:var(--brand)"></i>申請名單</h3>
    <div id="job-apps-content"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-job-apps')">關閉</button>
    </div>
  </div>
</div>

<!-- Product Create/Edit Modal -->
<div class="modal-overlay" id="modal-product">
  <div class="modal">
    <h3 id="prod-modal-title"><i class="fas fa-box" style="margin-right:8px;color:var(--brand)"></i>新增產品</h3>
    <input type="hidden" id="prod-id">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-field"><label>中文名稱 <span style="color:#EF4444">*</span></label><input type="text" id="prod-name-zh"></div>
      <div class="form-field"><label>英文名稱 <span style="color:#EF4444">*</span></label><input type="text" id="prod-name-en"></div>
      <div class="form-field"><label>品牌／供應商</label><input type="text" id="prod-brand"></div>
      <div class="form-field"><label>分類</label><input type="text" id="prod-category" placeholder="醬料／飲品／紙品…"></div>
      <div class="form-field"><label>SKU 貨號</label><input type="text" id="prod-sku"></div>
      <div class="form-field"><label>單位</label><input type="text" id="prod-unit" placeholder="支／包／盒"></div>
      <div class="form-field"><label>成本價 (HK$)</label><input type="number" id="prod-cost" step="0.1" min="0"></div>
      <div class="form-field"><label>建議售價 (HK$)</label><input type="number" id="prod-price" step="0.1" min="0"></div>
    </div>
    <div class="form-field"><label>相片連結 (URL)</label><input type="text" id="prod-photo" placeholder="https://..."></div>
    <div class="form-field"><label>產品描述</label><textarea id="prod-desc" rows="2" style="resize:vertical"></textarea></div>
    <div class="form-field" id="prod-active-field" style="display:none">
      <label>狀態</label>
      <select id="prod-active"><option value="1">使用中</option><option value="0">已停用</option></select>
    </div>
    <div id="prod-modal-err" style="color:#DC2626;font-size:13px;margin-top:8px;display:none"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-product')">取消</button>
      <button class="btn btn-primary" onclick="submitProduct()"><i class="fas fa-save"></i> 儲存</button>
    </div>
  </div>
</div>

<script>
// ── State ──
var allStores = [];
var allDistricts = [];
var rsCache = {}; // roadshow id -> object cache

// ── Init ──
(function(){
  fetch('/api/admin/me').then(function(r){return r.json();}).then(function(d){
    if(d.loggedIn){
      showAppShell();
    } else {
      document.getElementById('login-screen').style.display='flex';
    }
  }).catch(function(){
    document.getElementById('login-screen').style.display='flex';
  });
})();

function showAppShell(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app-shell').style.display='flex';
  loadRoadshows();
  loadDistricts();
  loadStoreDropdown();
}

// ── Login ──
document.getElementById('login-pw').addEventListener('keydown',function(e){
  if(e.key==='Enter') doAdminLogin();
});

function doAdminLogin(){
  var pw = document.getElementById('login-pw').value;
  var btn = document.getElementById('login-btn');
  var err = document.getElementById('login-err');
  if(!pw){err.textContent='請輸入密碼';err.classList.add('show');return;}
  btn.disabled=true;btn.textContent='登入中...';err.classList.remove('show');
  fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){showAppShell();}
      else{err.textContent=d.error||'密碼錯誤';err.classList.add('show');btn.disabled=false;btn.textContent='登入';}
    })
    .catch(function(e){err.textContent='網絡錯誤';err.classList.add('show');btn.disabled=false;btn.textContent='登入';});
}

function doAdminLogout(){
  fetch('/api/admin/logout',{method:'POST'}).finally(function(){
    window.location.reload();
  });
}

// ── Sidebar nav ──
var _membershipFrameLoaded = false;
function switchMod(id){
  document.querySelectorAll('.mod-page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
  document.getElementById(id).classList.add('active');
  event.currentTarget.classList.add('active');
  var titles = {'mod-membership':'會員系統','mod-roadshow':'Roadshow 管理','mod-products':'產品管理','mod-useful-links':'有用資訊管理','mod-jobs':'工作管理'};
  document.getElementById('topbar-title').textContent = titles[id]||id;
  if(id==='mod-roadshow') loadRoadshows();
  if(id==='mod-membership' && !_membershipFrameLoaded){
    document.getElementById('membership-frame').src = '/membership/admin';
    _membershipFrameLoaded = true;
  }
  document.querySelector('.page-area').style.padding = (id==='mod-membership') ? '10px' : '24px';
  if(id==='mod-products'){ loadProductCategories(); loadProducts(); }
  if(id==='mod-useful-links') loadUsefulLinks();
  if(id==='mod-jobs') loadJobs();
}
function reloadMembershipFrame(){
  var f = document.getElementById('membership-frame');
  f.src = '/membership/admin';
  _membershipFrameLoaded = true;
}

// ── Roadshow Tab ──
function rsTab(name){
  document.querySelectorAll('.rs-tab').forEach(function(t){t.classList.remove('active');});
  document.getElementById('rs-tab-'+name).classList.add('active');
  document.getElementById('rs-panel-roadshows').style.display = name==='roadshows'?'':'none';
  document.getElementById('rs-panel-stores').style.display = name==='stores'?'':'none';
  if(name==='stores') loadStores();
}

// ── Roadshow CRUD ──
function loadRoadshows(){
  var status = document.getElementById('rs-filter-status').value;
  var url = '/api/admin/roadshows'+(status?'?status='+encodeURIComponent(status):'');
  fetch(url).then(function(r){return r.json();}).then(function(d){
    if(!d.ok) return;
    var list = document.getElementById('rs-list');
    var label = document.getElementById('rs-count-label');
    label.textContent = '共 '+d.roadshows.length+' 個 Roadshow';
    if(!d.roadshows.length){
      list.innerHTML='<div style="text-align:center;padding:40px;color:#9CA3AF;"><i class="fas fa-calendar-times" style="font-size:32px;margin-bottom:12px;display:block"></i>暫無 Roadshow 資料</div>';
      return;
    }
    // Cache roadshow data by id to avoid inline JSON in onclick
    rsCache = {};
    d.roadshows.forEach(function(rs){ rsCache[rs.id] = rs; });
    list.innerHTML = d.roadshows.map(function(rs){
      var statusClass = rs.status==='active'?'status-active':rs.status==='ended'?'status-ended':'status-inactive';
      var statusText = rs.status==='active'?'進行中':rs.status==='ended'?'已結束':'暫停';
      var dateRange = '';
      if(rs.start_date||rs.end_date) dateRange = (rs.start_date||'?')+' ~ '+(rs.end_date||'?');
      return '<div class="rs-card">'+
        '<div class="rs-card-header">'+
          '<div>'+
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
              '<span class="rs-card-name">'+esc(rs.name)+'</span>'+
              '<span class="rs-card-code">'+esc(rs.code)+'</span>'+
              '<span class="status-badge '+statusClass+'">'+statusText+'</span>'+
            '</div>'+
            '<div class="rs-card-meta">'+
              (rs.store_name?'<i class="fas fa-store" style="margin-right:4px"></i>'+esc(rs.store_name)+' · ':'')+
              (rs.district?'<i class="fas fa-map-pin" style="margin-right:4px"></i>'+esc(rs.district)+' · ':'')+
              '<i class="fas fa-users" style="margin-right:4px"></i>'+(rs.member_count||0)+' 位會員'+
              (dateRange?' · <i class="fas fa-calendar" style="margin-right:4px"></i>'+dateRange:'')+
            '</div>'+
            (rs.notes?'<div style="font-size:12px;color:#6B7280;margin-top:4px">'+esc(rs.notes)+'</div>':'')+
          '</div>'+
          '<div style="display:flex;gap:6px;flex-shrink:0">'+
            '<button class="btn btn-secondary btn-sm" onclick="openEditRsById('+rs.id+')"><i class="fas fa-edit"></i></button>'+
            '<button class="btn btn-danger btn-sm" onclick="deleteRs('+rs.id+')"><i class="fas fa-trash"></i></button>'+
          '</div>'+
        '</div>'+
      '</div>';
    }).join('');
  }).catch(function(e){console.error('loadRoadshows',e);});
}

function openCreateRs(){
  document.getElementById('new-rs-code').value='';
  document.getElementById('new-rs-name').value='';
  document.getElementById('new-rs-store').value='';
  document.getElementById('new-rs-start').value='';
  document.getElementById('new-rs-end').value='';
  document.getElementById('new-rs-notes').value='';
  document.getElementById('modal-err').style.display='none';
  document.getElementById('modal-create-rs').classList.add('open');
}

function submitCreateRs(){
  var code = document.getElementById('new-rs-code').value.trim();
  var name = document.getElementById('new-rs-name').value.trim();
  var store_code = document.getElementById('new-rs-store').value;
  var start_date = document.getElementById('new-rs-start').value;
  var end_date = document.getElementById('new-rs-end').value;
  var notes = document.getElementById('new-rs-notes').value.trim();
  var errEl = document.getElementById('modal-err');
  if(!code){errEl.textContent='請填寫 Roadshow Code';errEl.style.display='';return;}
  if(!name){errEl.textContent='請填寫活動名稱';errEl.style.display='';return;}
  errEl.style.display='none';
  fetch('/api/admin/roadshows',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({code:code,name:name,store_code:store_code||'',start_date:start_date,end_date:end_date,notes:notes})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){closeModal('modal-create-rs');loadRoadshows();}
      else{errEl.textContent=d.error||'建立失敗';errEl.style.display='';}
    }).catch(function(e){errEl.textContent='網絡錯誤';errEl.style.display='';});
}

var editingRsId = null;
function openEditRsById(id){
  var rs = rsCache[id];
  if(!rs){alert('找不到資料，請重新整理');return;}
  openEditRs(rs);
}
function openEditRs(rs){
  editingRsId = rs.id;
  document.getElementById('edit-rs-id').value = rs.id;
  document.getElementById('edit-rs-name').value = rs.name||'';
  document.getElementById('edit-rs-start').value = rs.start_date||'';
  document.getElementById('edit-rs-end').value = rs.end_date||'';
  document.getElementById('edit-rs-status').value = rs.status||'active';
  document.getElementById('edit-rs-notes').value = rs.notes||'';
  // Populate store dropdown
  var sel = document.getElementById('edit-rs-store');
  populateStoreDropdown(sel, rs.store_code);
  document.getElementById('modal-edit-err').style.display='none';
  document.getElementById('modal-edit-rs').classList.add('open');
}

function submitEditRs(){
  var id = editingRsId;
  var name = document.getElementById('edit-rs-name').value.trim();
  var store_code = document.getElementById('edit-rs-store').value;
  var start_date = document.getElementById('edit-rs-start').value;
  var end_date = document.getElementById('edit-rs-end').value;
  var status = document.getElementById('edit-rs-status').value;
  var notes = document.getElementById('edit-rs-notes').value.trim();
  var errEl = document.getElementById('modal-edit-err');
  if(!name){errEl.textContent='請填寫活動名稱';errEl.style.display='';return;}
  errEl.style.display='none';
  fetch('/api/admin/roadshows/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:name,store_code:store_code,start_date:start_date,end_date:end_date,status:status,notes:notes})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){closeModal('modal-edit-rs');loadRoadshows();}
      else{errEl.textContent=d.error||'更新失敗';errEl.style.display='';}
    }).catch(function(e){errEl.textContent='網絡錯誤';errEl.style.display='';});
}

function deleteRs(id){
  var rs = rsCache[id];
  var name = rs ? rs.name : 'ID '+id;
  if(!confirm('確認刪除 Roadshow ['+name+'] ?  注意：已登記會員的 roadshow 欄位不受影響。')){return;}
  fetch('/api/admin/roadshows/'+id,{method:'DELETE'})
    .then(function(r){return r.json();})
    .then(function(d){if(d.ok){loadRoadshows();}else{alert(d.error||'刪除失敗');}})
    .catch(function(e){alert('網絡錯誤');});
}

// ── Stores ──
function loadDistricts(){
  fetch('/api/admin/roadshow/districts').then(function(r){return r.json();}).then(function(d){
    if(!d.ok) return;
    allDistricts = d.districts;
    var sel = document.getElementById('store-district-filter');
    sel.innerHTML = '<option value="">全部地區</option>';
    d.districts.forEach(function(dist){
      sel.innerHTML += '<option value="'+esc(dist)+'">'+esc(dist)+'</option>';
    });
  });
}

function loadStoreDropdown(){
  fetch('/api/admin/roadshow/stores').then(function(r){return r.json();}).then(function(d){
    if(!d.ok) return;
    allStores = d.stores;
  });
}

function populateStoreDropdown(sel, selectedCode){
  sel.innerHTML = '<option value="">-- 不指定商店 --</option>';
  allStores.forEach(function(s){
    var opt = document.createElement('option');
    opt.value = s.store_code;
    opt.textContent = '['+s.district+'] '+s.name_zh+' ('+s.store_code+')';
    if(s.store_code === selectedCode) opt.selected = true;
    sel.appendChild(opt);
  });
}

function loadStores(){
  var search = document.getElementById('store-search').value.trim();
  var district = document.getElementById('store-district-filter').value;
  var params = new URLSearchParams();
  if(search) params.set('search', search);
  if(district) params.set('district', district);
  fetch('/api/admin/roadshow/stores?'+params.toString())
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok) return;
      var grid = document.getElementById('store-grid');
      document.getElementById('store-count-label').textContent = '共 '+d.stores.length+' 間商店';
      if(!d.stores.length){
        grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9CA3AF"><i class="fas fa-search" style="font-size:28px;margin-bottom:10px;display:block"></i>沒有符合條件的商店</div>';
        return;
      }
      grid.innerHTML = d.stores.map(function(s){
        return '<div class="store-card">'+
          '<div class="store-card-code">'+esc(s.store_code)+'</div>'+
          '<div class="store-card-name">'+esc(s.name_zh)+'</div>'+
          '<div class="store-card-dist"><i class="fas fa-map-pin" style="margin-right:4px;color:#9CA3AF"></i>'+esc(s.district)+'</div>'+
          (s.address?'<div style="font-size:11px;color:#9CA3AF;margin-top:4px;line-height:1.4">'+esc(s.address)+'</div>':'')+
        '</div>';
      }).join('');
    }).catch(function(e){console.error('loadStores',e);});
}

// ── Helpers ──
function esc(s){
  if(s==null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function closeModal(id){
  document.getElementById(id).classList.remove('open');
}

// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(function(overlay){
  overlay.addEventListener('click',function(e){
    if(e.target===overlay) overlay.classList.remove('open');
  });
});

// Populate store dropdowns when allStores is loaded
var _origLoadStoreDropdown = loadStoreDropdown;
window.addEventListener('load', function(){
  // Populate new-rs-store dropdown
  var createSel = document.getElementById('new-rs-store');
  function refreshCreateDropdown(){
    createSel.innerHTML = '<option value="">-- 不指定商店 --</option>';
    allStores.forEach(function(s){
      createSel.innerHTML += '<option value="'+esc(s.store_code)+'">['+esc(s.district)+'] '+esc(s.name_zh)+' ('+esc(s.store_code)+')</option>';
    });
  }
  var origLoad = loadStoreDropdown;
  window.loadStoreDropdown = function(){
    fetch('/api/admin/roadshow/stores').then(function(r){return r.json();}).then(function(d){
      if(!d.ok) return;
      allStores = d.stores;
      refreshCreateDropdown();
    });
  };
  // Re-run if already authenticated
  if(document.getElementById('app-shell').style.display !== 'none'){
    window.loadStoreDropdown();
  }
});

// ── Products (Batch 3) ──
function loadProductCategories(){
  fetch('/api/admin/products/categories').then(function(r){return r.json();}).then(function(d){
    if(!d.ok) return;
    var sel = document.getElementById('prod-category-filter');
    sel.innerHTML = '<option value="">全部分類</option>';
    d.categories.forEach(function(cat){ sel.innerHTML += '<option value="'+esc(cat)+'">'+esc(cat)+'</option>'; });
  });
}
function loadProducts(){
  var params = new URLSearchParams();
  var s = document.getElementById('prod-search').value.trim();
  var cat = document.getElementById('prod-category-filter').value;
  var st = document.getElementById('prod-status-filter').value;
  if(s) params.set('search', s);
  if(cat) params.set('category', cat);
  if(st) params.set('status', st);
  fetch('/api/admin/products?'+params.toString()).then(function(r){return r.json();}).then(function(d){
    if(!d.ok) return;
    var grid = document.getElementById('prod-grid');
    document.getElementById('prod-count-label').textContent = '共 '+d.products.length+' 件產品';
    if(!d.products.length){
      grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9CA3AF"><i class="fas fa-box-open" style="font-size:28px;margin-bottom:10px;display:block"></i>尚無產品，點右上角新增</div>';
      return;
    }
    grid.innerHTML = d.products.map(function(p){
      var img = p.photo_url
        ? '<img src="'+esc(p.photo_url)+'" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;" onerror="this.remove()">'
        : '<div style="width:100%;height:120px;background:#F3F4F6;border-radius:6px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:#D1D5DB;"><i class="fas fa-image" style="font-size:28px"></i></div>';
      var inactive = p.active ? '' : '<span style="background:#FEE2E2;color:#991B1B;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:6px;">已停用</span>';
      return '<div class="store-card" style="cursor:pointer" onclick="openEditProduct('+p.id+')">'+
        img+
        '<div class="store-card-name">'+esc(p.name_zh)+inactive+'</div>'+
        '<div style="font-size:11px;color:#6B7280;margin-bottom:4px">'+esc(p.name_en||'')+'</div>'+
        (p.brand?'<div class="store-card-dist"><i class="fas fa-tag" style="margin-right:4px;color:#9CA3AF"></i>'+esc(p.brand)+'</div>':'')+
        '<div style="margin-top:6px;font-size:13px;"><span style="font-weight:700;color:var(--brand)">$'+(p.price||0)+'</span>'+
        (p.cost?'<span style="font-size:11px;color:#9CA3AF;margin-left:6px">成本 $'+p.cost+'</span>':'')+'</div>'+
      '</div>';
    }).join('');
  }).catch(function(e){console.error('loadProducts',e);});
}
function openCreateProduct(){
  document.getElementById('prod-modal-title').innerHTML='<i class="fas fa-box" style="margin-right:8px;color:var(--brand)"></i>新增產品';
  document.getElementById('prod-id').value='';
  ['prod-name-zh','prod-name-en','prod-brand','prod-category','prod-sku','prod-unit','prod-cost','prod-price','prod-photo','prod-desc'].forEach(function(f){document.getElementById(f).value='';});
  document.getElementById('prod-active-field').style.display='none';
  document.getElementById('prod-modal-err').style.display='none';
  document.getElementById('modal-product').classList.add('open');
}
function openEditProduct(id){
  fetch('/api/admin/products/'+id).then(function(r){return r.json();}).then(function(d){
    if(!d.ok){alert(d.error||'讀取失敗');return;}
    var p = d.product;
    document.getElementById('prod-modal-title').innerHTML='<i class="fas fa-edit" style="margin-right:8px;color:var(--brand)"></i>編輯產品';
    document.getElementById('prod-id').value=p.id;
    document.getElementById('prod-name-zh').value=p.name_zh||'';
    document.getElementById('prod-name-en').value=p.name_en||'';
    document.getElementById('prod-brand').value=p.brand||'';
    document.getElementById('prod-category').value=p.category||'';
    document.getElementById('prod-sku').value=p.sku||'';
    document.getElementById('prod-unit').value=p.unit||'';
    document.getElementById('prod-cost').value=p.cost||'';
    document.getElementById('prod-price').value=p.price||'';
    document.getElementById('prod-photo').value=p.photo_url||'';
    document.getElementById('prod-desc').value=p.description||'';
    document.getElementById('prod-active').value=String(p.active);
    document.getElementById('prod-active-field').style.display='';
    document.getElementById('prod-modal-err').style.display='none';
    document.getElementById('modal-product').classList.add('open');
  });
}
function submitProduct(){
  var id = document.getElementById('prod-id').value;
  var body = {
    name_zh: document.getElementById('prod-name-zh').value.trim(),
    name_en: document.getElementById('prod-name-en').value.trim(),
    brand: document.getElementById('prod-brand').value.trim(),
    category: document.getElementById('prod-category').value.trim(),
    sku: document.getElementById('prod-sku').value.trim(),
    unit: document.getElementById('prod-unit').value.trim(),
    cost: document.getElementById('prod-cost').value,
    price: document.getElementById('prod-price').value,
    photo_url: document.getElementById('prod-photo').value.trim(),
    description: document.getElementById('prod-desc').value.trim()
  };
  var errEl = document.getElementById('prod-modal-err');
  if(!body.name_zh || !body.name_en){errEl.textContent='中英文名稱必填';errEl.style.display='';return;}
  if(id) body.active = document.getElementById('prod-active').value;
  errEl.style.display='none';
  var url = id ? '/api/admin/products/'+id : '/api/admin/products';
  var method = id ? 'PATCH' : 'POST';
  fetch(url,{method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){closeModal('modal-product');loadProductCategories();loadProducts();}
      else{errEl.textContent=d.error||'儲存失敗';errEl.style.display='';}
    }).catch(function(e){errEl.textContent='網絡錯誤';errEl.style.display='';});
}

// ── Useful Links ──
function loadUsefulLinks(){
  fetch('/api/admin/useful-links').then(function(r){return r.json();}).then(function(d){
    if(!d.ok){document.getElementById('ul-tbody').innerHTML='<tr><td colspan="6" style="padding:20px;text-align:center;color:#DC2626">讀取失敗</td></tr>';return;}
    var links = d.links||[];
    document.getElementById('ul-count-label').textContent='共 '+links.length+' 項';
    if(!links.length){
      document.getElementById('ul-tbody').innerHTML='<tr><td colspan="6" style="padding:30px;text-align:center;color:#9CA3AF">尚未有資訊，請新增</td></tr>';
      return;
    }
    var typeLabel={'phone':'📞 電話','whatsapp':'💬 WhatsApp','url':'🔗 網址','text':'📝 文字'};
    document.getElementById('ul-tbody').innerHTML=links.map(function(l){
      return '<tr style="border-bottom:1px solid #F3F4F6">'+
        '<td style="padding:10px 12px;font-weight:600">'+esc(l.title)+'</td>'+
        '<td style="padding:10px 12px">'+esc(typeLabel[l.link_type]||l.link_type)+'</td>'+
        '<td style="padding:10px 12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(l.content)+'</td>'+
        '<td style="padding:10px 12px">'+l.sort_order+'</td>'+
        '<td style="padding:10px 12px">'+
          '<span style="padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;background:'+(l.is_active?'#D1FAE5':'#F3F4F6')+';color:'+(l.is_active?'#065F46':'#6B7280')+'">'+
            (l.is_active?'顯示':'隱藏')+
          '</span>'+
        '</td>'+
        '<td style="padding:10px 12px;white-space:nowrap">'+
          '<button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;margin-right:4px" onclick="openEditUsefulLink('+l.id+')"><i class="fas fa-edit"></i> 編輯</button>'+
          '<button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;margin-right:4px;background:'+(l.is_active?'#FEF3C7':'#D1FAE5')+';color:'+(l.is_active?'#92400E':'#065F46')+'" onclick="toggleUsefulLinkActive('+l.id+','+(l.is_active?0:1)+')">'+
            (l.is_active?'隱藏':'顯示')+
          '</button>'+
          '<button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;background:#FEE2E2;color:#DC2626" onclick="deleteUsefulLink('+l.id+')"><i class="fas fa-trash"></i></button>'+
        '</td>'+
      '</tr>';
    }).join('');
  }).catch(function(e){console.error('loadUsefulLinks',e);});
}
function openCreateUsefulLink(){
  document.getElementById('ul-modal-title').innerHTML='<i class="fas fa-info-circle" style="margin-right:8px;color:var(--brand)"></i>新增有用資訊';
  document.getElementById('ul-id').value='';
  document.getElementById('ul-title').value='';
  document.getElementById('ul-link-type').value='phone';
  document.getElementById('ul-content').value='';
  document.getElementById('ul-sort-order').value='0';
  document.getElementById('ul-active-field').style.display='none';
  document.getElementById('ul-modal-err').style.display='none';
  document.getElementById('modal-useful-link').classList.add('open');
}
function openEditUsefulLink(id){
  fetch('/api/admin/useful-links').then(function(r){return r.json();}).then(function(d){
    if(!d.ok){alert(d.error||'讀取失敗');return;}
    var l=(d.links||[]).find(function(x){return x.id===id;});
    if(!l){alert('找不到此項目');return;}
    document.getElementById('ul-modal-title').innerHTML='<i class="fas fa-edit" style="margin-right:8px;color:var(--brand)"></i>編輯有用資訊';
    document.getElementById('ul-id').value=l.id;
    document.getElementById('ul-title').value=l.title||'';
    document.getElementById('ul-link-type').value=l.link_type||'phone';
    document.getElementById('ul-content').value=l.content||'';
    document.getElementById('ul-sort-order').value=l.sort_order||0;
    document.getElementById('ul-is-active').value=String(l.is_active);
    document.getElementById('ul-active-field').style.display='';
    document.getElementById('ul-modal-err').style.display='none';
    document.getElementById('modal-useful-link').classList.add('open');
  });
}
function submitUsefulLink(){
  var id=document.getElementById('ul-id').value;
  var body={
    title:document.getElementById('ul-title').value.trim(),
    link_type:document.getElementById('ul-link-type').value,
    content:document.getElementById('ul-content').value.trim(),
    sort_order:parseInt(document.getElementById('ul-sort-order').value)||0
  };
  var errEl=document.getElementById('ul-modal-err');
  if(!body.title||!body.content){errEl.textContent='標題和內容必填';errEl.style.display='';return;}
  if(id) body.is_active=parseInt(document.getElementById('ul-is-active').value);
  errEl.style.display='none';
  var url=id?'/api/admin/useful-links/'+id:'/api/admin/useful-links';
  var method=id?'PUT':'POST';
  fetch(url,{method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){closeModal('modal-useful-link');loadUsefulLinks();}
      else{errEl.textContent=d.error||'儲存失敗';errEl.style.display='';}
    }).catch(function(e){errEl.textContent='網絡錯誤';errEl.style.display='';});
}
function deleteUsefulLink(id){
  if(!confirm('確定刪除？此操作不可還原。'))return;
  fetch('/api/admin/useful-links/'+id,{method:'DELETE'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){loadUsefulLinks();}
      else{alert(d.error||'刪除失敗');}
    }).catch(function(){alert('網絡錯誤');});
}
function toggleUsefulLinkActive(id,newActive){
  fetch('/api/admin/useful-links/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({is_active:newActive})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){loadUsefulLinks();}
      else{alert(d.error||'更新失敗');}
    }).catch(function(){alert('網絡錯誤');});
}

// ── Jobs ──
function loadJobs(){
  fetch('/api/admin/jobs').then(function(r){return r.json();}).then(function(d){
    if(!d.ok){document.getElementById('jobs-tbody').innerHTML='<tr><td colspan="7" style="padding:20px;text-align:center;color:#DC2626">讀取失敗</td></tr>';return;}
    var jobs=d.jobs||[];
    document.getElementById('jobs-count-label').textContent='共 '+jobs.length+' 份工作';
    if(!jobs.length){
      document.getElementById('jobs-tbody').innerHTML='<tr><td colspan="7" style="padding:30px;text-align:center;color:#9CA3AF">尚未有工作，請新增</td></tr>';
      return;
    }
    document.getElementById('jobs-tbody').innerHTML=jobs.map(function(j){
      var thumb=j.image_url?'<img src="'+esc(j.image_url)+'" style="width:60px;height:45px;object-fit:cover;border-radius:6px;border:1px solid #E5E7EB">':'<div style="width:60px;height:45px;background:#F3F4F6;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:11px">無圖</div>';
      var statusBadge='<span style="padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;background:'+(j.status==='open'?'#D1FAE5':'#FEE2E2')+';color:'+(j.status==='open'?'#065F46':'#991B1B')+'">'+(j.status==='open'?'開放':'已截止')+'</span>';
      return '<tr style="border-bottom:1px solid #F3F4F6">'+
        '<td style="padding:8px 12px">'+thumb+'</td>'+
        '<td style="padding:8px 12px;font-weight:600;max-width:160px">'+esc(j.title)+'</td>'+
        '<td style="padding:8px 12px">'+esc(j.location||'—')+'</td>'+
        '<td style="padding:8px 12px">'+esc(j.job_type||'—')+'</td>'+
        '<td style="padding:8px 12px">'+j.sort_order+'</td>'+
        '<td style="padding:8px 12px">'+statusBadge+'</td>'+
        '<td style="padding:8px 12px;white-space:nowrap">'+
          '<button class="btn btn-secondary" style="font-size:12px;padding:4px 10px;margin-right:4px" onclick="openEditJob('+j.id+')"><i class="fas fa-edit"></i></button>'+
          '<button class="btn btn-secondary" style="font-size:12px;padding:4px 10px;margin-right:4px;background:'+(j.status==='open'?'#FEF3C7':'#D1FAE5')+';color:'+(j.status==='open'?'#92400E':'#065F46')+'" onclick="toggleJobStatus('+j.id+',' + (j.status==='open'?'"closed"':'"open"') + ')">'+
            (j.status==='open'?'截止':'重開')+'</button>'+
          '<button class="btn btn-secondary" style="font-size:12px;padding:4px 10px;margin-right:4px" onclick="viewJobApplications('+j.id+')" ><i class="fas fa-users"></i> 申請</button>'+
          '<button class="btn btn-secondary" style="font-size:12px;padding:4px 10px;background:#FEE2E2;color:#DC2626" onclick="deleteJob('+j.id+')"><i class="fas fa-trash"></i></button>'+
        '</td>'+
      '</tr>';
    }).join('');
  }).catch(function(e){console.error('loadJobs',e);});
}
function openCreateJob(){
  document.getElementById('job-modal-title').innerHTML='<i class="fas fa-briefcase" style="margin-right:8px;color:var(--brand)"></i>新增工作';
  document.getElementById('job-id').value='';
  ['job-image-url','job-title','job-location','job-type','job-company','job-salary','job-description','job-requirement'].forEach(function(f){document.getElementById(f).value='';});
  document.getElementById('job-sort-order').value='0';
  document.getElementById('job-status-field').style.display='none';
  document.getElementById('job-modal-err').style.display='none';
  document.getElementById('modal-job').classList.add('open');
}
function openEditJob(id){
  fetch('/api/admin/jobs').then(function(r){return r.json();}).then(function(d){
    var j=(d.jobs||[]).find(function(x){return x.id===id;});
    if(!j){alert('讀取失敗');return;}
    document.getElementById('job-modal-title').innerHTML='<i class="fas fa-edit" style="margin-right:8px;color:var(--brand)"></i>編輯工作';
    document.getElementById('job-id').value=j.id;
    document.getElementById('job-image-url').value=j.image_url||'';
    document.getElementById('job-title').value=j.title||'';
    document.getElementById('job-location').value=j.location||'';
    document.getElementById('job-type').value=j.job_type||'';
    document.getElementById('job-company').value=j.company||'';
    document.getElementById('job-salary').value=j.salary||'';
    document.getElementById('job-description').value=j.description||'';
    document.getElementById('job-requirement').value=j.requirement||'';
    document.getElementById('job-sort-order').value=j.sort_order||0;
    document.getElementById('job-status').value=j.status||'open';
    document.getElementById('job-status-field').style.display='';
    document.getElementById('job-modal-err').style.display='none';
    document.getElementById('modal-job').classList.add('open');
  });
}
function submitJob(){
  var id=document.getElementById('job-id').value;
  var body={
    image_url:document.getElementById('job-image-url').value.trim(),
    title:document.getElementById('job-title').value.trim(),
    location:document.getElementById('job-location').value.trim(),
    job_type:document.getElementById('job-type').value.trim(),
    company:document.getElementById('job-company').value.trim(),
    salary:document.getElementById('job-salary').value.trim(),
    description:document.getElementById('job-description').value.trim(),
    requirement:document.getElementById('job-requirement').value.trim(),
    sort_order:parseInt(document.getElementById('job-sort-order').value)||0
  };
  var errEl=document.getElementById('job-modal-err');
  if(!body.title){errEl.textContent='職位名稱必填';errEl.style.display='';return;}
  if(id) body.status=document.getElementById('job-status').value;
  errEl.style.display='none';
  var url=id?'/api/admin/jobs/'+id:'/api/admin/jobs';
  var method=id?'PUT':'POST';
  fetch(url,{method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){closeModal('modal-job');loadJobs();}
      else{errEl.textContent=d.error||'儲存失敗';errEl.style.display='';}
    }).catch(function(e){errEl.textContent='網絡錯誤';errEl.style.display='';});
}
function deleteJob(id){
  if(!confirm('確定刪除此工作？相關申請紀錄亦會一併刪除，此操作不可還原。'))return;
  fetch('/api/admin/jobs/'+id,{method:'DELETE'})
    .then(function(r){return r.json();})
    .then(function(d){if(d.ok){loadJobs();}else{alert(d.error||'刪除失敗');}})
    .catch(function(){alert('網絡錯誤');});
}
function toggleJobStatus(id,newStatus){
  fetch('/api/admin/jobs/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:newStatus})})
    .then(function(r){return r.json();})
    .then(function(d){if(d.ok){loadJobs();}else{alert(d.error||'更新失敗');}})
    .catch(function(){alert('網絡錯誤');});
}
function viewJobApplications(jobId){
  var jobTitle='';
  // try to get title from the table row
  document.getElementById('job-apps-title').innerHTML='<i class="fas fa-users" style="margin-right:8px;color:var(--brand)"></i>申請名單';
  var content=document.getElementById('job-apps-content');
  content.innerHTML='<div style="padding:20px;text-align:center;color:#6B7280">載入中...</div>';
  document.getElementById('modal-job-apps').classList.add('open');
  fetch('/api/admin/jobs/'+jobId+'/applications').then(function(r){return r.json();}).then(function(d){
    if(!d.ok){content.innerHTML='<div style="padding:20px;text-align:center;color:#DC2626">讀取失敗</div>';return;}
    var apps=d.applications||[];
    if(!apps.length){content.innerHTML='<div style="padding:20px;text-align:center;color:#9CA3AF">未有人申請</div>';return;}
    content.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:13px">'+
      '<thead><tr style="background:#F3F4F6">'+
        '<th style="padding:8px 12px;text-align:left">會員編號</th>'+
        '<th style="padding:8px 12px;text-align:left">姓名</th>'+
        '<th style="padding:8px 12px;text-align:left">申請時間</th>'+
        '<th style="padding:8px 12px;text-align:left">狀態</th>'+
        '<th style="padding:8px 12px;text-align:left">操作</th>'+
      '</tr></thead>'+
      '<tbody>'+apps.map(function(a){
        var name=esc(a.name_zh||a.name_en||'—');
        var isNew=a.handle_status==='new';
        return '<tr style="border-bottom:1px solid #F3F4F6">'+
          '<td style="padding:8px 12px;font-family:monospace">'+esc(a.member_no)+'</td>'+
          '<td style="padding:8px 12px">'+name+'</td>'+
          '<td style="padding:8px 12px;font-size:12px;color:#6B7280">'+esc((a.applied_at||'').replace('T',' ').substring(0,16))+'</td>'+
          '<td style="padding:8px 12px"><span style="padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;background:'+(isNew?'#FEF3C7':'#D1FAE5')+';color:'+(isNew?'#92400E':'#065F46')+'">'+(isNew?'待處理':'已處理')+'</span></td>'+
          '<td style="padding:8px 12px">'+
            '<button class="btn btn-secondary" style="font-size:12px;padding:3px 10px;background:'+(isNew?'#D1FAE5':'#FEF3C7')+';color:'+(isNew?'#065F46':'#92400E')+'" onclick="toggleAppStatus('+a.id+',' + (isNew?'"handled"':'"new"') + ')">'+(isNew?'標記已處理':'還原待處理')+'</button>'+
          '</td>'+
        '</tr>';
      }).join('')+
      '</tbody></table>';
  });
}
function toggleAppStatus(appId,newStatus){
  fetch('/api/admin/applications/'+appId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle_status:newStatus})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){
        // 重新載入申請列表（需要知道 jobId，直接重抓）
        var titleEl=document.getElementById('job-apps-title');
        // 簡單方案：重關再手動提示
        alert((newStatus==='handled'?'✅ 已標記處理':'已還原為待處理'));
        closeModal('modal-job-apps');
        loadJobs();
      }else{alert(d.error||'更新失敗');}
    }).catch(function(){alert('網絡錯誤');});
}
</script>
</body>
</html>`
}

// ─── PWA App HTML ─────────────────────────────────────────────────────────────
function pwaAppHtml() {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>CoEldery 85 老有聯盟</title>
<!-- PWA -->
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#228B22">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="CoEldery 85">
<link rel="apple-touch-icon" href="/icon-192.png">
<!-- /PWA -->
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{--green:#228B22;--green-dark:#1a6b1a;--red:#c62828;--bg:#F0EBD8;--white:#fff;}
body{background:var(--bg);min-height:100vh;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-size:20px;line-height:1.7;color:#111;}

/* ── 頂部 ── */
.topbar{background:var(--green-dark);color:#fff;padding:16px 20px;display:flex;align-items:center;gap:14px;}
.topbar img{width:44px;height:44px;border-radius:8px;}
.topbar .brand{font-size:22px;font-weight:900;letter-spacing:1px;}
.topbar .sub{font-size:18px;opacity:0.8;margin-top:2px;}

/* ── 主內容 ── */
.wrap{max-width:480px;margin:0 auto;padding:28px 18px 80px;}

/* ── 輸入區 ── */
.lookup-card{background:var(--white);border-radius:14px;padding:28px 22px;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
.lookup-card h2{font-size:26px;font-weight:900;color:var(--green-dark);margin-bottom:8px;line-height:1.3;}
.lookup-card p{font-size:18px;color:#444;margin-bottom:24px;line-height:1.6;}
.field-label{font-size:20px;font-weight:700;color:#222;margin-bottom:10px;display:block;}
.big-input{width:100%;padding:16px 14px;font-size:22px;border:2.5px solid #388e3c;border-radius:10px;
  font-family:inherit;color:#111;background:#fff;min-height:60px;outline:none;}
.big-input:focus{border-color:var(--green-dark);box-shadow:0 0 0 3px rgba(34,139,34,0.15);}
.big-btn{display:block;width:100%;padding:18px;margin-top:18px;background:var(--green);color:#fff;
  border:none;border-radius:10px;font-size:22px;font-weight:900;cursor:pointer;min-height:60px;
  letter-spacing:1px;transition:background 0.15s;}
.big-btn:active{background:var(--green-dark);}
.big-btn:disabled{background:#a5d6a7;cursor:not-allowed;}
.err-msg{margin-top:16px;padding:14px 16px;background:#ffebee;border:2px solid var(--red);border-radius:8px;
  color:var(--red);font-size:20px;font-weight:700;display:none;line-height:1.5;}
.err-msg.show{display:block;}

/* ── 安裝提示區 ── */
.install-banner{background:#e8f5e9;border:2px solid #a5d6a7;border-radius:14px;padding:22px 18px;
  margin-top:24px;}
.install-banner h3{font-size:22px;font-weight:900;color:var(--green-dark);margin-bottom:10px;}
.install-banner p{font-size:18px;color:#333;line-height:1.7;margin-bottom:14px;}
.install-btn{display:block;width:100%;padding:16px;background:var(--green);color:#fff;border:none;
  border-radius:10px;font-size:20px;font-weight:900;cursor:pointer;min-height:58px;letter-spacing:1px;}
.copy-btn{display:block;width:100%;padding:14px;background:#fff;color:var(--green-dark);border:2.5px solid var(--green);
  border-radius:10px;font-size:20px;font-weight:900;cursor:pointer;min-height:58px;margin-top:12px;}
.ios-steps{background:#fff;border-radius:10px;padding:16px;margin-top:12px;}
.ios-steps p{font-size:18px;color:#333;margin-bottom:8px;}
.ios-steps .step{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;}
.ios-steps .step-num{background:var(--green);color:#fff;width:28px;height:28px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0;margin-top:2px;}
.ios-steps .step-text{font-size:18px;line-height:1.5;}

/* ── 換人連結 ── */
.switch-wrap{text-align:center;margin-top:28px;}
.switch-link{font-size:18px;color:#888;cursor:pointer;background:none;border:none;text-decoration:underline;padding:8px;}

/* ── 卡片框架 ── */
.card-frame{width:100%;border:none;min-height:600px;background:transparent;}

/* ── Accordion（install section 收結）── */
.accordion-content{margin-top:0;overflow:hidden;}

/* ── 底部 5-tab 導航列 ── */
.bottom-tab-bar{position:fixed;bottom:0;left:0;right:0;height:68px;
  background:#fff;border-top:1.5px solid #ddd;
  display:flex;align-items:stretch;z-index:999;
  box-shadow:0 -2px 10px rgba(0,0,0,0.08);}
.tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:none;border:none;cursor:pointer;padding:6px 2px;
  color:#888;font-family:inherit;transition:color 0.15s;min-height:60px;gap:5px;}
.tab-btn .tab-icon{font-size:26px;line-height:1;}
.tab-btn .tab-label{font-size:13px;font-weight:600;line-height:1;letter-spacing:0.3px;margin-top:1px;}
.tab-btn.active{color:var(--green);}
.tab-btn.tab-card-btn{color:var(--green-dark);}
.tab-btn.tab-card-btn .tab-icon{font-size:30px;}
.tab-btn.tab-card-btn .tab-label{font-size:14px;font-weight:900;margin-top:1px;}
.tab-btn.tab-card-btn.active{color:var(--green);}

/* ── Coming soon panel ── */
.coming-soon-panel{display:none;padding:60px 20px;text-align:center;}
.coming-soon-panel .coming-icon{font-size:56px;margin-bottom:18px;}
.coming-soon-panel .coming-text{font-size:24px;font-weight:900;color:#444;line-height:1.6;}
</style>
</head>
<body>

<div class="topbar">
  <img src="/icon-192.png" alt="CoEldery 85">
  <div>
    <div class="brand">CoEldery 85</div>
    <div class="sub">老有聯盟 85</div>
  </div>
  <button id="useful-links-btn" onclick="openUsefulLinksPanel()" style="margin-left:auto;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 10px;color:#fff;min-width:52px">
    <span style="font-size:28px;line-height:1">&#x2139;&#xFE0F;</span>
    <span style="font-size:12px;font-weight:600;margin-top:2px;white-space:nowrap">有用資訊</span>
  </button>
</div>

<!-- ── Tab 面板：購物 ── -->
<div id="tabShop" class="coming-soon-panel">
  <div class="coming-icon">🛒</div>
  <div class="coming-text">🚧 即將推出，敬請期待 🙏</div>
</div>

<!-- ── Tab 面板：消息 ── -->
<div id="tabNews" class="coming-soon-panel">
  <div class="coming-icon">📢</div>
  <div class="coming-text">🚧 即將推出，敬請期待 🙏</div>
</div>

<!-- ── Tab 面板：我的卡（預設顯示）── -->
<div id="tabCard" style="display:block;">
  <div class="wrap" id="mainWrap">

    <!-- 輸入電話查詢 (初始顯示) -->
    <div class="lookup-card" id="lookupSection">
      <h2>📱 查閱你的老有卡</h2>
      <p>請輸入你登記時用嘅電話號碼，系統即時搵出你張卡。</p>
      <label class="field-label" for="phoneInput">電話號碼 / 會員編號</label>
      <input class="big-input" id="phoneInput" type="tel" inputmode="numeric"
        placeholder="例：91234567" autocomplete="tel" maxlength="20">
      <button class="big-btn" id="lookupBtn" onclick="doLookup()">🔍 搵我的卡</button>
      <div class="err-msg" id="errMsg">搵唔到，請確認電話號碼是否正確</div>
    </div>

    <!-- 安裝提示 (搵到會員後顯示，在 accordion 內) -->
    <div id="installSection" style="display:none;">
      <!-- Android / Chrome beforeinstallprompt -->
      <div class="install-banner" id="installAndroid" style="display:none;">
        <h3>📱 將會員卡加落手機主畫面</h3>
        <p>安裝後可以喺主畫面直接開啟，唔使記住網址！</p>
        <button class="install-btn" id="installBtn" onclick="doInstall()">⬇️ 安裝到主畫面</button>
      </div>
      <!-- iPhone Safari -->
      <div class="install-banner" id="installIOS" style="display:none;">
        <h3>📱 將會員卡加落主畫面</h3>
        <div class="ios-steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-text">撳 Safari 下面嘅 <strong>「共享」掣</strong> 🔗</div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-text">向上捲，揀 <strong>「加至主畫面」</strong> ＋</div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-text">撳右上角 <strong>「新增」</strong> 完成！</div>
          </div>
        </div>
      </div>
      <!-- WhatsApp / FB 內置瀏覽器 -->
      <div class="install-banner" id="installInApp" style="display:none;">
        <h3>📱 請用 Safari 或 Chrome 開啟</h3>
        <p>你而家係用 WhatsApp / FB 入面嘅瀏覽器，<strong>唔支援安裝到主畫面</strong>。</p>
        <p>請複製以下網址，喺 Safari 或 Chrome 開啟：</p>
        <button class="copy-btn" onclick="copyUrl()">📋 複製網址</button>
      </div>
      <!-- 換人 -->
      <div class="switch-wrap">
        <button class="switch-link" onclick="switchUser()">唔係你？換人</button>
      </div>
    </div>

  </div>
</div>

<!-- ── Tab 面板：心聲 ── -->
<div id="tabVoice" class="coming-soon-panel">
  <div class="coming-icon">💬</div>
  <div class="coming-text">🚧 即將推出，敬請期待 🙏</div>
</div>

<!-- ── Tab 面板：工作 ── -->
<div id="tabWork" style="display:none;padding-bottom:80px">
  <!-- 工作列表頁 -->
  <div id="jobListView">
    <div style="padding:16px 16px 8px;font-size:22px;font-weight:800;color:#111827">💼 工作市場</div>
    <div id="job-list-loading" style="text-align:center;padding:60px 20px;font-size:20px;color:#6B7280">載入中...</div>
    <div id="job-list-empty" style="display:none;text-align:center;padding:60px 20px">
      <div style="font-size:56px;margin-bottom:16px">🔍</div>
      <div style="font-size:20px;font-weight:700;color:#374151">暫無招聘資訊</div>
      <div style="font-size:16px;color:#6B7280;margin-top:8px">請稍後再來查看</div>
    </div>
    <div id="job-list-cards" style="padding:0 12px;display:flex;flex-direction:column;gap:16px"></div>
  </div>
  <!-- 工作詳情頁 -->
  <div id="jobDetailView" style="display:none">
    <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1.5px solid #E5E7EB;background:#fff;position:sticky;top:0;z-index:10">
      <button onclick="showJobList()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#228B22;padding:0 12px 0 0;line-height:1">&#8592;</button>
      <span style="font-size:18px;font-weight:700;color:#111827">職位詳情</span>
    </div>
    <div id="job-detail-content" style="padding-bottom:100px"></div>
    <!-- 申請掣 -->
    <div style="position:fixed;bottom:68px;left:0;right:0;padding:12px 16px;background:#fff;border-top:1.5px solid #E5E7EB;z-index:50">
      <button id="job-apply-btn" onclick="applyJob()" style="width:100%;min-height:55px;font-size:20px;font-weight:800;background:#228B22;color:#fff;border:none;border-radius:14px;cursor:pointer;letter-spacing:1px">
        我要申請
      </button>
      <div id="job-apply-msg" style="text-align:center;font-size:18px;font-weight:700;margin-top:10px;display:none"></div>
    </div>
  </div>
</div>

<!-- ── 有用資訊 Panel (overlay) ── -->
<div id="useful-links-panel" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,0.5);flex-direction:column;align-items:center;justify-content:flex-end">
  <div style="background:#fff;width:100%;max-width:480px;border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,16px);max-height:85vh;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1.5px solid #E5E7EB">
      <div style="font-size:22px;font-weight:800;color:#111827">&#x2139;&#xFE0F; 有用資訊</div>
      <button onclick="closeUsefulLinksPanel()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#6B7280;padding:4px 8px;line-height:1">&times;</button>
    </div>
    <div id="ul-panel-list" style="overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch"></div>
  </div>
</div>

<!-- ── 底部 5-tab 導航列 ── -->
<nav class="bottom-tab-bar" id="bottomTabBar">
  <button class="tab-btn" id="tabBtnShop" onclick="switchTab('shop')">
    <span class="tab-icon">🛒</span>
    <span class="tab-label">購物</span>
  </button>
  <button class="tab-btn" id="tabBtnNews" onclick="switchTab('news')">
    <span class="tab-icon">📢</span>
    <span class="tab-label">消息</span>
  </button>
  <button class="tab-btn tab-card-btn active" id="tabBtnCard" onclick="switchTab('card')">
    <span class="tab-icon">💳</span>
    <span class="tab-label">我的卡</span>
  </button>
  <button class="tab-btn" id="tabBtnVoice" onclick="switchTab('voice')">
    <span class="tab-icon">💬</span>
    <span class="tab-label">心聲</span>
  </button>
  <button class="tab-btn" id="tabBtnWork" onclick="switchTab('work')">
    <span class="tab-icon">💼</span>
    <span class="tab-label">工作</span>
  </button>
</nav>

<script>
// ── Tab 切換 ──
var TAB_PANELS = { shop:'tabShop', news:'tabNews', card:'tabCard', voice:'tabVoice', work:'tabWork' };
var TAB_BTNS   = { shop:'tabBtnShop', news:'tabBtnNews', card:'tabBtnCard', voice:'tabBtnVoice', work:'tabBtnWork' };
var currentTab = 'card';

function switchTab(name) {
  if (name === currentTab) return;
  // 隱藏現在的 panel
  var oldPanel = document.getElementById(TAB_PANELS[currentTab]);
  if (oldPanel) oldPanel.style.display = 'none';
  // 移除 active class
  var oldBtn = document.getElementById(TAB_BTNS[currentTab]);
  if (oldBtn) oldBtn.classList.remove('active');
  // 顯示新 panel
  currentTab = name;
  var newPanel = document.getElementById(TAB_PANELS[name]);
  if (newPanel) newPanel.style.display = 'block';
  // 加 active class
  var newBtn = document.getElementById(TAB_BTNS[name]);
  if (newBtn) newBtn.classList.add('active');
  // 捲到頂部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── toggleAccordion 已不再使用（accordion-btn 已移除）──
function toggleAccordion() {}

// ── PWA 安裝提示儲存 ──
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
  // 如果安裝區段已顯示（用戶已點 WA），補顯示/更新 Android 安裝掣
  var sec = document.getElementById('installSection');
  if (sec && sec.style.display !== 'none') {
    document.getElementById('installAndroid').style.display = '';
    document.getElementById('installIOS').style.display = 'none';
    document.getElementById('installInApp').style.display = 'none';
  }
});

// ── 接收 card iframe 的 postMessage（用戶在卡頁點咗 WA 按鈕）──
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'ce85_wa_clicked') {
    localStorage.setItem('ce85_wa_clicked', '1');
    showInstallBanner();
  }
});

// ── Service Worker 注冊 ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function(e) {
      console.warn('SW register failed:', e);
    });
  });
}

// ── 偵測瀏覽器類型 ──
function detectBrowser() {
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua);
  var isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  var isInApp = new RegExp('FBAN|FBAV|Instagram|WhatsApp|Line').test(ua);
  return { isIOS: isIOS, isSafari: isSafari, isInApp: isInApp };
}

function showInstallBanner() {
  // 已係 standalone（已安裝 PWA）就唔顯示
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
  var info = detectBrowser();
  var sec = document.getElementById('installSection');
  if (!sec) return;
  sec.style.display = '';
  if (info.isInApp) {
    document.getElementById('installInApp').style.display = '';
    document.getElementById('installAndroid').style.display = 'none';
    document.getElementById('installIOS').style.display = 'none';
  } else if (info.isIOS && info.isSafari) {
    document.getElementById('installIOS').style.display = '';
    document.getElementById('installInApp').style.display = 'none';
    document.getElementById('installAndroid').style.display = 'none';
  } else {
    document.getElementById('installAndroid').style.display = '';
    var btn = document.getElementById('installBtn');
    if (btn && !deferredPrompt) {
      btn.textContent = '⬇️ 安裝到主畫面';
      btn.onclick = function() {
        if (deferredPrompt) {
          doInstall();
        } else {
          btn.textContent = '請喺 Chrome 選單（⋮）→ 加至主螢幕';
          btn.style.background = '#888';
        }
      };
    }
    document.getElementById('installInApp').style.display = 'none';
    document.getElementById('installIOS').style.display = 'none';
  }
  sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── 安裝觸發 ──
function doInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function(r) {
    deferredPrompt = null;
    if (r.outcome === 'accepted') {
      document.getElementById('installAndroid').style.display = 'none';
    }
  });
}

// ── 複製網址 ──
function copyUrl() {
  var url = window.location.origin + '/app';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() {
      alert('已複製！請喺 Safari 或 Chrome 開啟：' + url);
    });
  } else {
    prompt('請複製以下網址：', url);
  }
}

// ── 主查詢邏輯 ──
function doLookup() {
  var input = document.getElementById('phoneInput').value.trim();
  var btn = document.getElementById('lookupBtn');
  var err = document.getElementById('errMsg');
  if (!input) {
    err.textContent = '請輸入電話號碼或會員編號';
    err.classList.add('show');
    return;
  }
  btn.disabled = true;
  btn.textContent = '搜尋中…';
  err.classList.remove('show');

  fetch('/api/members/lookup?q=' + encodeURIComponent(input))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      btn.disabled = false;
      btn.textContent = '🔍 搵我的卡';
      var memberNo = data.member_no || (data.member && data.member.member_no);
      if (data.ok && memberNo) {
        localStorage.setItem('ce85_member_no', memberNo);
        var waClickedAt = data.wa_clicked_at || (data.member && data.member.wa_clicked_at) || null;
        if (waClickedAt) {
          localStorage.setItem('ce85_wa_clicked', '1');
        }
        var waClicked = !!waClickedAt || localStorage.getItem('ce85_wa_clicked') === '1';
        showCard(memberNo, waClicked);
      } else {
        err.textContent = '搵唔到，請確認電話號碼是否正確';
        err.classList.add('show');
      }
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = '🔍 搵我的卡';
      err.textContent = '網絡錯誤，請稍後再試';
      err.classList.add('show');
    });
}

// ── 顯示會員卡（查到後替換主內容）──
// waClicked: boolean — 用戶已點過 WA 按鈕（立即顯示安裝提示）
function showCard(memberNo, waClicked) {
  var wrap = document.getElementById('mainWrap');
  // 卡 iframe
  var iframeHtml = '<iframe class="card-frame" src="/membership/card/' + encodeURIComponent(memberNo) +
    '" title="老有卡" frameborder="0" allow="fullscreen"></iframe>';
  // install section + 換人（預設隱藏，由 showInstallBanner() 展開）
  var installHtml =
    '<div id="installSection" style="display:none;">' +
      '<div class="install-banner" id="installAndroid" style="display:none;">' +
        '<h3>📱 將會員卡加落手機主畫面</h3>' +
        '<p>安裝後可以喺主畫面直接開啟，唔使記住網址！</p>' +
        '<button class="install-btn" id="installBtn" onclick="doInstall()">⬇️ 安裝到主畫面</button>' +
      '</div>' +
      '<div class="install-banner" id="installIOS" style="display:none;">' +
        '<h3>📱 將會員卡加落主畫面</h3>' +
        '<div class="ios-steps">' +
          '<div class="step"><div class="step-num">1</div><div class="step-text">撳 Safari 下面嘅 <strong>「共享」掣</strong> 🔗</div></div>' +
          '<div class="step"><div class="step-num">2</div><div class="step-text">向上捲，揀 <strong>「加至主畫面」</strong> ＋</div></div>' +
          '<div class="step"><div class="step-num">3</div><div class="step-text">撳右上角 <strong>「新增」</strong> 完成！</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="install-banner" id="installInApp" style="display:none;">' +
        '<h3>📱 請用 Safari 或 Chrome 開啟</h3>' +
        '<p>你而家係用 WhatsApp / FB 入面嘅瀏覽器，<strong>唔支援安裝到主畫面</strong>。</p>' +
        '<p>請複製以下網址，喺 Safari 或 Chrome 開啟：</p>' +
        '<button class="copy-btn" onclick="copyUrl()">📋 複製網址</button>' +
      '</div>' +
      '<div class="switch-wrap"><button class="switch-link" onclick="switchUser()">唔係你？換人</button></div>' +
    '</div>';
  wrap.innerHTML = iframeHtml + installHtml;
  // 用戶已點過 WA 按鈕 → 立即展開 accordion + 顯示安裝提示
  if (waClicked) {
    showInstallBanner();
  }
}

// ── 換人（清除 localStorage）──
function switchUser() {
  if (confirm('確定要換人？將會清除記住的帳號。')) {
    localStorage.removeItem('ce85_member_no');
    localStorage.removeItem('ce85_wa_clicked');
    window.location.reload();
  }
}

// ── 頁面載入：檢查 localStorage ──
(function init() {
  // Enter 鍵觸發查詢
  var phoneInput = document.getElementById('phoneInput');
  if (phoneInput) {
    phoneInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLookup();
    });
  }

  var saved = localStorage.getItem('ce85_member_no');
  if (saved) {
    var savedWaClicked = localStorage.getItem('ce85_wa_clicked') === '1';
    showCard(saved, savedWaClicked);
    fetch('/api/members/lookup?q=' + encodeURIComponent(saved))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok) {
          var latestWaClickedAt = data.wa_clicked_at || (data.member && data.member.wa_clicked_at) || null;
          if (latestWaClickedAt && !savedWaClicked) {
            localStorage.setItem('ce85_wa_clicked', '1');
            showInstallBanner();
          }
        }
      })
      .catch(function() { /* ignore refresh error */ });
  }
})();

// ── 有用資訊 Modal ──
function openUsefulLinksPanel(){
  var panel = document.getElementById('useful-links-panel');
  var list = document.getElementById('ul-panel-list');
  panel.style.display='flex';
  list.innerHTML='<div style="text-align:center;padding:40px;font-size:18px;color:#6B7280">載入中...</div>';
  fetch('/api/useful-links')
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok||!d.links||!d.links.length){
        list.innerHTML='<div style="text-align:center;padding:40px;font-size:18px;color:#6B7280">暫無資訊</div>';
        return;
      }
      list.innerHTML=d.links.map(function(l){
        var inner='';
        if(l.link_type==='phone'){
          inner='<a href="tel:'+encodeURIComponent(l.content)+'" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;width:100%">'+
            '<span style="font-size:26px">📞</span>'+
            '<span style="flex:1"><div style="font-size:20px;font-weight:700;color:#111827">'+escHtml(l.title)+'</div>'+
            '<div style="font-size:17px;color:#059669;margin-top:2px">'+escHtml(l.content)+'</div></span>'+
            '<span style="font-size:22px;color:#059669">›</span>'+
          '</a>';
        } else if(l.link_type==='whatsapp'){
          var waNum=l.content.replace(/[^0-9]/g,'');
          inner='<a href="https://wa.me/'+waNum+'" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;width:100%">'+
            '<span style="font-size:26px">💬</span>'+
            '<span style="flex:1"><div style="font-size:20px;font-weight:700;color:#111827">'+escHtml(l.title)+'</div>'+
            '<div style="font-size:17px;color:#059669;margin-top:2px">WhatsApp: '+escHtml(l.content)+'</div></span>'+
            '<span style="font-size:22px;color:#059669">›</span>'+
          '</a>';
        } else if(l.link_type==='url'){
          inner='<a href="'+escHtml(l.content)+'" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;width:100%">'+
            '<span style="font-size:26px">🔗</span>'+
            '<span style="flex:1"><div style="font-size:20px;font-weight:700;color:#111827">'+escHtml(l.title)+'</div>'+
            '<div style="font-size:17px;color:#059669;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">'+escHtml(l.content)+'</div></span>'+
            '<span style="font-size:22px;color:#059669">›</span>'+
          '</a>';
        } else {
          inner='<div style="display:flex;align-items:center;gap:10px;width:100%">'+
            '<span style="font-size:26px">📝</span>'+
            '<span style="flex:1"><div style="font-size:20px;font-weight:700;color:#111827">'+escHtml(l.title)+'</div>'+
            '<div style="font-size:17px;color:#374151;margin-top:2px;white-space:pre-wrap">'+escHtml(l.content)+'</div></span>'+
          '</div>';
        }
        return '<div style="background:#fff;border-radius:12px;padding:14px 16px;min-height:55px;display:flex;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1.5px solid #D1FAE5">'+inner+'</div>';
      }).join('');
    })
    .catch(function(){
      list.innerHTML='<div style="text-align:center;padding:40px;font-size:18px;color:#DC2626">載入失敗，請稍後再試</div>';
    });
}
function closeUsefulLinksPanel(){
  document.getElementById('useful-links-panel').style.display='none';
}
function escHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── 工作市場 ──
var _jobsLoaded = false;
var _currentJobId = null;

// switchTab 切到 work 時自動載入
var _origSwitchTab = switchTab;
switchTab = function(name) {
  _origSwitchTab(name);
  if (name === 'work' && !_jobsLoaded) { loadJobList(); }
};

function loadJobList() {
  var loading = document.getElementById('job-list-loading');
  var empty = document.getElementById('job-list-empty');
  var cards = document.getElementById('job-list-cards');
  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';
  if (cards) cards.innerHTML = '';
  fetch('/api/jobs')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (loading) loading.style.display = 'none';
      if (!d.ok || !d.jobs || !d.jobs.length) {
        if (empty) empty.style.display = 'block';
        return;
      }
      _jobsLoaded = true;
      if (cards) {
        cards.innerHTML = d.jobs.map(function(j) {
          var imgHtml = j.image_url
            ? '<div style="width:100%;aspect-ratio:4/3;overflow:hidden;border-radius:12px 12px 0 0;background:#F3F4F6"><img src="' + escHtml(j.image_url) + '" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display=String.fromCharCode(110,111,110,101)"></div>'
            : '<div style="width:100%;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:18px">&#128247; \u6682\u7121\u5716\u7247</div>';
          var loc = j.location ? '<div style="font-size:18px;color:#374151;margin-top:4px">📍 ' + escHtml(j.location) + '</div>' : '';
          var type = j.job_type ? '<div style="display:inline-block;margin-top:8px;padding:4px 12px;background:#D1FAE5;color:#065F46;border-radius:20px;font-size:16px;font-weight:600">' + escHtml(j.job_type) + '</div>' : '';
          return '<div onclick="showJobDetail(' + j.id + ')" style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.10);border:1.5px solid #E5E7EB;cursor:pointer;overflow:hidden;-webkit-tap-highlight-color:rgba(0,0,0,0.05)">'+
            imgHtml +
            '<div style="padding:14px 16px 16px">' +
              '<div style="font-size:22px;font-weight:800;color:#111827;line-height:1.3">' + escHtml(j.title) + '</div>' +
              loc + type +
              (j.salary ? '<div style="font-size:17px;color:#228B22;font-weight:700;margin-top:8px">💰 ' + escHtml(j.salary) + '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('');
      }
    })
    .catch(function() {
      if (loading) loading.style.display = 'none';
      if (empty) { empty.style.display = 'block'; empty.querySelector('div:last-child').textContent = '載入失敗，請稍後再試'; }
    });
}

function showJobDetail(jobId) {
  _currentJobId = jobId;
  document.getElementById('jobListView').style.display = 'none';
  document.getElementById('jobDetailView').style.display = 'block';
  var content = document.getElementById('job-detail-content');
  var applyMsg = document.getElementById('job-apply-msg');
  var applyBtn = document.getElementById('job-apply-btn');
  content.innerHTML = '<div style="text-align:center;padding:60px 20px;font-size:20px;color:#6B7280">載入中...</div>';
  applyMsg.style.display = 'none';
  applyBtn.disabled = false;
  applyBtn.style.background = '#228B22';
  applyBtn.textContent = '我要申請';
  window.scrollTo({ top: 0 });
  fetch('/api/jobs/' + jobId)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.ok) { content.innerHTML = '<div style="padding:40px;text-align:center;color:#DC2626;font-size:20px">載入失敗</div>'; return; }
      var j = d.job;
      var imgHtml = j.image_url
        ? '<div style="width:100%;aspect-ratio:4/3;background:#F3F4F6;overflow:hidden"><img src="' + escHtml(j.image_url) + '" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display=String.fromCharCode(110,111,110,101)"></div>'
        : '<div style="width:100%;aspect-ratio:4/3;background:#F3F4F6;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:20px">&#128247; \u6682\u7121\u5716\u7247</div>';
      var rows = [
        j.company ? ['🏢 公司／機構', j.company] : null,
        j.location ? ['📍 工作地點', j.location] : null,
        j.job_type ? ['⏰ 工作性質', j.job_type] : null,
        j.salary ? ['💰 待遇', j.salary] : null,
      ].filter(Boolean);
      var rowsHtml = rows.map(function(r) {
        return '<div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid #F3F4F6">'+
          '<div style="font-size:18px;color:#6B7280;min-width:130px;flex-shrink:0">' + r[0] + '</div>'+
          '<div style="font-size:18px;font-weight:600;color:#111827;flex:1">' + escHtml(r[1]) + '</div>'+
        '</div>';
      }).join('');
      var descHtml = j.description ? '<div style="margin-top:20px"><div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:8px">📋 詳細資料</div><div style="font-size:18px;color:#374151;line-height:1.7;white-space:pre-wrap">' + escHtml(j.description) + '</div></div>' : '';
      var reqHtml = j.requirement ? '<div style="margin-top:20px"><div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:8px">✅ 要求</div><div style="font-size:18px;color:#374151;line-height:1.7;white-space:pre-wrap">' + escHtml(j.requirement) + '</div></div>' : '';
      content.innerHTML = imgHtml +
        '<div style="padding:16px">' +
          '<div style="font-size:24px;font-weight:800;color:#111827;line-height:1.3;margin-bottom:12px">' + escHtml(j.title) + '</div>' +
          rowsHtml + descHtml + reqHtml +
          '<div style="height:20px"></div>' +
        '</div>';
    })
    .catch(function() {
      content.innerHTML = '<div style="padding:40px;text-align:center;color:#DC2626;font-size:20px">載入失敗，請稍後再試</div>';
    });
}

function showJobList() {
  _currentJobId = null;
  document.getElementById('jobDetailView').style.display = 'none';
  document.getElementById('jobListView').style.display = 'block';
  window.scrollTo({ top: 0 });
}

function applyJob() {
  if (!_currentJobId) return;
  var memberNo = localStorage.getItem('ce85_member_no') || '';
  var applyBtn = document.getElementById('job-apply-btn');
  var applyMsg = document.getElementById('job-apply-msg');
  if (!memberNo) {
    applyMsg.style.display = 'block';
    applyMsg.style.color = '#D97706';
    applyMsg.textContent = '⚠️ 請先喺「我的卡」登記會員';
    return;
  }
  applyBtn.disabled = true;
  applyBtn.style.background = '#6B7280';
  applyBtn.textContent = '申請中...';
  applyMsg.style.display = 'none';
  fetch('/api/jobs/' + _currentJobId + '/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member_no: memberNo })
  })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      applyMsg.style.display = 'block';
      if (d.ok) {
        applyBtn.style.display = 'none';
        applyMsg.style.color = '#065F46';
        applyMsg.textContent = '✅ 已收到你嘅申請，我哋會跟進';
      } else if (d.already) {
        applyBtn.disabled = false;
        applyBtn.style.background = '#9CA3AF';
        applyBtn.textContent = '已申請';
        applyMsg.style.color = '#374151';
        applyMsg.textContent = '你已經申請咗呢份工';
      } else {
        applyBtn.disabled = false;
        applyBtn.style.background = '#228B22';
        applyBtn.textContent = '我要申請';
        applyMsg.style.color = '#DC2626';
        applyMsg.textContent = d.error || '申請失敗，請稍後再試';
      }
    })
    .catch(function() {
      applyBtn.disabled = false;
      applyBtn.style.background = '#228B22';
      applyBtn.textContent = '我要申請';
      applyMsg.style.display = 'block';
      applyMsg.style.color = '#DC2626';
      applyMsg.textContent = '網絡錯誤，請稍後再試';
    });
}
</script>
</body>
</html>`
}

export default app
