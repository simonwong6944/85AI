import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { centsToStr, csvCell, haversineMeters, resolveRate } from './lib/utils'
import { makeToken, sessionExpiry, getSessionToken, verifySession } from './lib/auth'
import { nextMemberNo, expiryDate, validateHKPhone } from './lib/members'
import { genTestingCode, genBrandToken } from './lib/testing-utils'
import { nextCwNo } from './lib/coworkery-utils'
import { sha256hex, appendHashChain } from './lib/revenue-utils'
import { verifyColinkerySess, requireColinkery } from './lib/colinkery-auth'
import { htmlHead } from './lib/html-shared'
import { HK_DISTRICTS } from './lib/constants'
import { dashboardHtml, comingSoonHtml, adminColinkerySectionHtml, qrRegisterHtml, adminQrHtml, walletHtml, teamConfirmHtml, coworkeryAppHtml, brandFormHtml, memberProfileHtml, colinkerypwaHtml, partnerApplyHtml , qrCompleteHtml , sopHtml , posterHtml } from './lib/html-templates'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD: string
  FILES?: R2Bucket        // CoWorkery 身份證 / 打卡 selfie；optional：本地無 bucket 時為 undefined
  OPENROUTER_API_KEY?: string  // CoLinkery OCR via OpenRouter
  CLOUDINARY_CLOUD_NAME?: string  // Cloudinary cloud name (e.g. ex2zrh2h)
  CLOUDINARY_API_KEY?: string     // Cloudinary API key
  CLOUDINARY_API_SECRET?: string  // Cloudinary API secret (for signed uploads)
  WHATSAPP_VERIFY_TOKEN?: string  // WhatsApp webhook verify token (set in Meta Dashboard)
  WHATSAPP_API_TOKEN?: string     // WhatsApp Cloud API token (for sending messages)
  WHATSAPP_PHONE_ID?: string      // WhatsApp Cloud API phone number ID
  APP_SECRET?: string             // App-level secret for signing login tokens
}

const app = new Hono<{ Bindings: Bindings }>()

// ═══════════════════════════════════════════════════════════════════════════════
// CoWorkery 共用工具函式
// ═══════════════════════════════════════════════════════════════════════════════

// nextCwNo → moved to src/lib/coworkery-utils.ts

// haversineMeters → moved to src/lib/utils.ts

// resolveRate → moved to src/lib/utils.ts

// csvCell → moved to src/lib/utils.ts

// centsToStr → moved to src/lib/utils.ts

// ─── Admin Auth Helpers ───────────────────────────────────────────────────────
// makeToken → moved to src/lib/auth.ts
// sessionExpiry → moved to src/lib/auth.ts
// getSessionToken → moved to src/lib/auth.ts

// [MOVED to src/lib/auth.ts @ Wave2] verifySession — pure mechanical move, see commit ef527ad

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
// PWA root-level static files — served via explicit GET + ASSETS binding
// (serveStatic with double-middleware caused 500 in CF Pages; direct ASSETS fetch is reliable)
app.get('/manifest.webmanifest', serveStatic({ root: './public' }))
app.get('/sw.js', (c) => {
  const swContent = `// CoEldery 85 Service Worker
// v4: no-store for navigation, force fresh /app always
const CACHE_NAME = 'coeldery85-v4';
const OFFLINE_URLS = ['/app'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        caches.match('/app').then((r) => r || caches.match('/'))
      )
    );
    return;
  }

  if (url.pathname === '/icon-192.png' || url.pathname === '/icon-512.png' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
`
  return new Response(swContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  })
})
app.get('/icon-192.png', serveStatic({ root: './public' }))
app.get('/icon-512.png', serveStatic({ root: './public' }))

// ─── Helpers ─────────────────────────────────────────────────────────────────
// nextMemberNo → moved to src/lib/members.ts

// expiryDate → moved to src/lib/members.ts
// validateHKPhone → moved to src/lib/members.ts

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

  // Try with card_no + card_image_url columns; fall back gracefully if not yet migrated
  let rows: any
  try {
    rows = await db.prepare(`
      SELECT m.id, m.member_no, m.name_zh_full, m.name_en_full, m.hkid_prefix,
             m.phone, m.status, m.applied_at, m.sent_at, m.notes, m.card_no, m.card_image_url,
             mb.name_zh as member_name_zh, mb.district
      FROM medical_card_applications m
      LEFT JOIN members mb ON mb.member_no = m.member_no
      ${where}
      ORDER BY m.applied_at DESC
    `).bind(...params).all()
  } catch (_) {
    try {
      rows = await db.prepare(`
        SELECT m.id, m.member_no, m.name_zh_full, m.name_en_full, m.hkid_prefix,
               m.phone, m.status, m.applied_at, m.sent_at, m.notes, m.card_no, NULL AS card_image_url,
               mb.name_zh as member_name_zh, mb.district
        FROM medical_card_applications m
        LEFT JOIN members mb ON mb.member_no = m.member_no
        ${where}
        ORDER BY m.applied_at DESC
      `).bind(...params).all()
    } catch (_2) {
      rows = await db.prepare(`
        SELECT m.id, m.member_no, m.name_zh_full, m.name_en_full, m.hkid_prefix,
               m.phone, m.status, m.applied_at, m.sent_at, m.notes, NULL AS card_no, NULL AS card_image_url,
               mb.name_zh as member_name_zh, mb.district
        FROM medical_card_applications m
        LEFT JOIN members mb ON mb.member_no = m.member_no
        ${where}
        ORDER BY m.applied_at DESC
      `).bind(...params).all()
    }
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

// ─── API: Admin — Save card_no + card_image_url for medical application ──────
app.post('/api/admin/medical/:id/card-no', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json<{ card_no: string; card_image_url?: string }>()
  const cardNo = (body.card_no || '').trim()
  const cardImageUrl = (body.card_image_url || '').trim()
  if (!cardNo) return c.json({ ok: false, error: 'card_no 不能為空' }, 400)
  // Auto-run migration if columns not yet added
  try {
    await db.prepare(
      'UPDATE medical_card_applications SET card_no = ?, card_image_url = ?, status = ? WHERE id = ?'
    ).bind(cardNo, cardImageUrl, 'ISSUED', id).run()
  } catch (_) {
    // Columns missing — add them first, then update
    try { await db.prepare('ALTER TABLE medical_card_applications ADD COLUMN card_no TEXT').run() } catch (_) {}
    try { await db.prepare('ALTER TABLE medical_card_applications ADD COLUMN card_image_url TEXT DEFAULT \'\'').run() } catch (_) {}
    await db.prepare(
      'UPDATE medical_card_applications SET card_no = ?, card_image_url = ?, status = ? WHERE id = ?'
    ).bind(cardNo, cardImageUrl, 'ISSUED', id).run()
  }
  return c.json({ ok: true })
})

// ─── API: Admin — Cloudinary signed upload signature ─────────────────────────
// Returns a short-lived signature so the browser can upload directly to Cloudinary
// without exposing the API Secret in frontend JS.
// Flow: browser POST here → get {signature, timestamp, api_key, cloud_name, folder}
//       → browser uploads directly to https://api.cloudinary.com/v1_1/{cloud}/image/upload
//       → Cloudinary returns secure_url → browser saves it via /api/admin/medical/:id/card-no
app.post('/api/admin/cloudinary-sign', async (c) => {
  const cloudName   = c.env.CLOUDINARY_CLOUD_NAME
  const apiKey      = c.env.CLOUDINARY_API_KEY
  const apiSecret   = c.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return c.json({ ok: false, error: 'Cloudinary secrets not configured' }, 500)
  }

  // Allow caller to specify folder; default to 'medical_cards' for backward compat
  let reqBody2: any = {}
  try { reqBody2 = await c.req.json() } catch (_) { /* no body is fine */ }
  const allowedFolders = ['medical_cards', 'app_contents', 'jobs']
  const folder = allowedFolders.includes(reqBody2?.folder) ? reqBody2.folder : 'medical_cards'

  const timestamp = Math.floor(Date.now() / 1000)

  // Build the string-to-sign: sorted params joined by & then + apiSecret
  // Cloudinary signature = SHA-1( "folder=<folder>&timestamp=<ts>" + apiSecret )
  const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`

  // SHA-1 using Web Crypto API (available in Cloudflare Workers)
  const encoder = new TextEncoder()
  const data = encoder.encode(strToSign)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray  = Array.from(new Uint8Array(hashBuffer))
  const signature  = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return c.json({
    ok: true,
    signature,
    timestamp,
    api_key:    apiKey,
    cloud_name: cloudName,
    folder
  })
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── app_contents APIs (shopping / news) ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/contents?section=shopping|news — public, only OPEN items
app.get('/api/contents', async (c) => {
  const section = c.req.query('section') || ''
  if (!['shopping', 'news'].includes(section)) return c.json({ ok: false, error: '無效 section' }, 400)
  const db = c.env.DB
  let rows: any
  try {
    rows = await db.prepare(
      `SELECT id, section, title, body, address, sort_order, image_url, created_at, updated_at
       FROM app_contents WHERE section=? AND status='OPEN' ORDER BY sort_order ASC, id ASC`
    ).bind(section).all()
  } catch (_) {
    return c.json({ ok: true, items: [] })
  }
  return c.json({ ok: true, items: rows.results })
})

// GET /api/admin/contents — admin: all items
app.get('/api/admin/contents', async (c) => {
  const db = c.env.DB
  const section = c.req.query('section') || ''
  let rows: any
  try {
    if (section) {
      rows = await db.prepare(
        `SELECT * FROM app_contents WHERE section=? ORDER BY sort_order ASC, id ASC`
      ).bind(section).all()
    } else {
      rows = await db.prepare(
        `SELECT * FROM app_contents ORDER BY section ASC, sort_order ASC, id ASC`
      ).all()
    }
  } catch (_) {
    return c.json({ ok: true, items: [] })
  }
  return c.json({ ok: true, items: rows.results })
})

// POST /api/admin/contents — create
app.post('/api/admin/contents', async (c) => {
  const db = c.env.DB
  let reqBody: any
  try { reqBody = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效 JSON' }, 400) }
  const section   = String(reqBody.section   || '')
  const title     = String(reqBody.title     || '').trim()
  const bodyText  = String(reqBody.body      || '')
  const address   = reqBody.address ? String(reqBody.address) : null
  const sortOrder = Number(reqBody.sort_order ?? 0)
  const status    = String(reqBody.status    || 'OPEN')
  const imageUrl  = reqBody.image_url ? String(reqBody.image_url) : null
  if (!['shopping', 'news'].includes(section)) return c.json({ ok: false, error: '無效 section' }, 400)
  if (!title) return c.json({ ok: false, error: 'title 不能為空' }, 400)
  const now = new Date().toISOString()
  try {
    const r = await db.prepare(
      `INSERT INTO app_contents (section, title, body, address, sort_order, status, image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(section, title, bodyText, address, sortOrder, status, imageUrl, now, now).run()
    return c.json({ ok: true, id: r.meta.last_row_id })
  } catch (err: any) {
    return c.json({ ok: false, error: String(err?.message || err) }, 500)
  }
})

// PUT /api/admin/contents/:id — update
app.put('/api/admin/contents/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  let rb: any
  try { rb = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效 JSON' }, 400) }
  const fields: string[] = []
  const vals: any[] = []
  if (rb.section    !== undefined) { fields.push('section=?');    vals.push(rb.section) }
  if (rb.title      !== undefined) { fields.push('title=?');      vals.push(rb.title) }
  if (rb.body       !== undefined) { fields.push('body=?');       vals.push(rb.body) }
  if (rb.address    !== undefined) { fields.push('address=?');    vals.push(rb.address) }
  if (rb.sort_order !== undefined) { fields.push('sort_order=?'); vals.push(rb.sort_order) }
  if (rb.status     !== undefined) { fields.push('status=?');     vals.push(rb.status) }
  if (rb.image_url  !== undefined) { fields.push('image_url=?');  vals.push(rb.image_url || null) }
  if (!fields.length) return c.json({ ok: false, error: '無更新欄位' }, 400)
  fields.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id)
  try {
    await db.prepare(`UPDATE app_contents SET ${fields.join(', ')} WHERE id=?`).bind(...vals).run()
    return c.json({ ok: true })
  } catch (err: any) {
    return c.json({ ok: false, error: String(err?.message || err) }, 500)
  }
})

// DELETE /api/admin/contents/:id — delete
app.delete('/api/admin/contents/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('DELETE FROM app_contents WHERE id=?').bind(id).run()
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Product Testing Survey System APIs ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// genTestingCode → moved to src/lib/testing-utils.ts
// genBrandToken → moved to src/lib/testing-utils.ts

// ── Public: GET /api/testing/scan/:code — user scans QR, get campaign info ────
app.get('/api/testing/scan/:code', async (c) => {
  const code = c.req.param('code').toUpperCase()
  const db = c.env.DB
  const qr = await db.prepare(
    `SELECT tq.*, tc.campaign_name, tc.brand_name, tc.brand_logo_url, tc.brand_description,
            tc.product_name, tc.product_image_url, tc.testing_duration_days, tc.survey_deadline,
            tc.status as campaign_status
     FROM testing_qr_codes tq
     JOIN testing_campaigns tc ON tq.campaign_id = tc.id
     WHERE tq.tracking_code=? AND tq.status='active'`
  ).bind(code).first<any>()
  if (!qr) return c.json({ ok: false, error: 'QR 碼無效或已停用' }, 404)
  if (qr.campaign_status !== 'live') return c.json({ ok: false, error: '此測試計劃暫未開放' }, 400)
  // Increment scan count
  await db.prepare('UPDATE testing_qr_codes SET scanned_count=scanned_count+1 WHERE id=?').bind(qr.id).run()
  return c.json({ ok: true, qr_code_id: qr.id, campaign_id: qr.campaign_id,
    campaign_name: qr.campaign_name, brand_name: qr.brand_name,
    brand_logo_url: qr.brand_logo_url, brand_description: qr.brand_description,
    product_name: qr.product_name, product_image_url: qr.product_image_url,
    testing_duration_days: qr.testing_duration_days, survey_deadline: qr.survey_deadline })
})

// ── Public: POST /api/testing/join — member joins campaign (claims sample) ────
app.post('/api/testing/join', async (c) => {
  const db = c.env.DB
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const { member_no, qr_code_id, campaign_id } = body
  if (!member_no || !campaign_id) return c.json({ ok: false, error: '缺少必要參數' }, 400)
  // Verify member exists
  const member = await db.prepare('SELECT member_no, name_zh FROM members WHERE member_no=? LIMIT 1')
    .bind(member_no).first<any>()
  if (!member) return c.json({ ok: false, error: '會員不存在，請先登記' }, 404)
  // Verify campaign is live
  const camp = await db.prepare('SELECT id, campaign_name, testing_duration_days, survey_deadline FROM testing_campaigns WHERE id=? AND status="live" LIMIT 1')
    .bind(campaign_id).first<any>()
  if (!camp) return c.json({ ok: false, error: '測試計劃不存在或未開放' }, 404)
  // Check already joined
  const existing = await db.prepare('SELECT id, status FROM testing_participants WHERE campaign_id=? AND member_no=? LIMIT 1')
    .bind(campaign_id, member_no).first<any>()
  if (existing) {
    return c.json({ ok: true, already_joined: true, participant_id: existing.id, status: existing.status,
      member_name: member.name_zh, campaign_name: camp.campaign_name })
  }
  // Calculate deadline
  const deadline = camp.survey_deadline || (() => {
    const d = new Date(); d.setDate(d.getDate() + camp.testing_duration_days); return d.toISOString().slice(0,10)
  })()
  const now = new Date().toISOString()
  const result = await db.prepare(
    `INSERT INTO testing_participants (campaign_id, qr_code_id, member_no, status, registered_at, sample_claimed_at)
     VALUES (?, ?, ?, 'sample_claimed', ?, ?)`
  ).bind(campaign_id, qr_code_id || null, member_no, now, now).run()
  return c.json({ ok: true, already_joined: false, participant_id: result.meta.last_row_id,
    member_name: member.name_zh, campaign_name: camp.campaign_name, survey_deadline: deadline })
})

// ── Public: GET /api/testing/my-campaigns/:member_no — list joined campaigns ──
app.get('/api/testing/my-campaigns/:member_no', async (c) => {
  const db = c.env.DB
  const memberNo = c.req.param('member_no')
  const rows = await db.prepare(
    `SELECT tp.id as participant_id, tp.status, tp.registered_at, tp.sample_claimed_at,
            tp.survey_submitted_at, tc.id as campaign_id, tc.campaign_name, tc.brand_name,
            tc.brand_logo_url, tc.product_name, tc.product_image_url, tc.survey_deadline,
            tc.status as campaign_status,
            tr.reward_name, tr.reward_description, tr.reward_type, tr.reward_value
     FROM testing_participants tp
     JOIN testing_campaigns tc ON tp.campaign_id = tc.id
     LEFT JOIN testing_rewards tr ON tr.campaign_id = tc.id
     WHERE tp.member_no=? ORDER BY tp.registered_at DESC`
  ).bind(memberNo).all<any>()
  return c.json({ ok: true, campaigns: rows.results || [] })
})

// ── Public: GET /api/testing/available/:member_no — live campaigns + join status ──
app.get('/api/testing/available/:member_no', async (c) => {
  const db = c.env.DB
  const memberNo = c.req.param('member_no')
  const camps = await db.prepare(
    `SELECT tc.id, tc.campaign_name, tc.brand_name, tc.brand_logo_url, tc.brand_description,
            tc.product_name, tc.product_image_url, tc.testing_duration_days, tc.survey_deadline,
            tp.id as participant_id, tp.status as participant_status
     FROM testing_campaigns tc
     LEFT JOIN testing_participants tp ON tp.campaign_id=tc.id AND tp.member_no=?
     WHERE tc.status='live'
     ORDER BY tc.created_at DESC`
  ).bind(memberNo).all<any>()
  return c.json({ ok: true, campaigns: camps.results || [] })
})

// ── Public: GET /api/testing/survey/:campaign_id — get survey questions ────────
app.get('/api/testing/survey/:campaign_id', async (c) => {
  const db = c.env.DB
  const cid = c.req.param('campaign_id')
  const camp = await db.prepare(
    'SELECT id, campaign_name, brand_name, brand_logo_url, brand_description, product_name, media_content FROM testing_campaigns WHERE id=? AND status IN ("live","completed") LIMIT 1'
  ).bind(cid).first<any>()
  if (!camp) return c.json({ ok: false, error: '問卷不存在' }, 404)
  const qs = await db.prepare(
    'SELECT id, question_order, question_type, title, description, image_url, is_required, options, min_value, max_value FROM testing_questions WHERE campaign_id=? ORDER BY question_order ASC'
  ).bind(cid).all<any>()
  let mediaContent: any[] = []
  try { mediaContent = JSON.parse(camp.media_content || '[]') } catch {}
  return c.json({ ok: true, campaign: {
    id: camp.id, campaign_name: camp.campaign_name, brand_name: camp.brand_name,
    brand_logo_url: camp.brand_logo_url, brand_description: camp.brand_description,
    product_name: camp.product_name, media_content: mediaContent
  }, questions: (qs.results || []).map((q:any) => ({
    ...q, options: (() => { try { return JSON.parse(q.options) } catch { return [] } })()
  })) })
})

// ── Public: POST /api/testing/survey/submit — submit survey answers ────────────
app.post('/api/testing/survey/submit', async (c) => {
  const db = c.env.DB
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const { participant_id, campaign_id, responses, time_spent_seconds } = body
  if (!participant_id || !campaign_id || !Array.isArray(responses)) {
    return c.json({ ok: false, error: '缺少必要參數' }, 400)
  }
  const participant = await db.prepare('SELECT id, status, member_no FROM testing_participants WHERE id=? AND campaign_id=? LIMIT 1')
    .bind(participant_id, campaign_id).first<any>()
  if (!participant) return c.json({ ok: false, error: '找不到參與記錄' }, 404)
  if (participant.status === 'survey_submitted') return c.json({ ok: false, error: '問卷已提交' }, 400)
  const now = new Date().toISOString()
  // Insert responses
  for (const r of responses) {
    if (!r.question_id) continue
    await db.prepare(
      `INSERT OR REPLACE INTO testing_responses (participant_id, campaign_id, question_id, answer, submitted_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(participant_id, campaign_id, r.question_id, String(r.answer ?? ''), now).run()
  }
  await db.prepare(
    `UPDATE testing_participants SET status='survey_submitted', survey_submitted_at=?, time_to_complete_seconds=? WHERE id=?`
  ).bind(now, time_spent_seconds || null, participant_id).run()
  // Get reward info
  const reward = await db.prepare('SELECT reward_name, reward_description, reward_value, reward_type FROM testing_rewards WHERE campaign_id=? LIMIT 1')
    .bind(campaign_id).first<any>()
  return c.json({ ok: true, reward })
})

// ── Admin: GET /api/admin/testing/campaigns — list all campaigns ────────────────
app.get('/api/admin/testing/campaigns', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    `SELECT tc.*, 
      (SELECT COUNT(*) FROM testing_participants WHERE campaign_id=tc.id) as participant_count,
      (SELECT COUNT(*) FROM testing_participants WHERE campaign_id=tc.id AND status='survey_submitted') as submitted_count,
      (SELECT COUNT(*) FROM testing_qr_codes WHERE campaign_id=tc.id) as qr_count
     FROM testing_campaigns tc ORDER BY tc.created_at DESC`
  ).all<any>()
  return c.json({ ok: true, campaigns: rows.results || [] })
})

// ── Admin: POST /api/admin/testing/campaigns — create campaign ─────────────────
app.post('/api/admin/testing/campaigns', async (c) => {
  const db = c.env.DB
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  if (!body.campaign_name?.trim()) return c.json({ ok: false, error: '請填寫計劃名稱' }, 400)
  if (!body.product_name?.trim()) return c.json({ ok: false, error: '請填寫產品名稱' }, 400)
  const now = new Date().toISOString()
  const token = await genBrandToken()
  const tokenExpiry = new Date(Date.now() + 30*24*60*60*1000).toISOString()
  const r = await db.prepare(
    `INSERT INTO testing_campaigns
      (campaign_name, description, brand_name, brand_logo_url, brand_description,
       brand_story_image_url, brand_website_url, product_name, product_image_url,
       testing_duration_days, survey_deadline, reminder1_day, reminder2_days_before,
       media_content, wa_template_welcome, wa_template_reminder1, wa_template_reminder2,
       wa_template_complete, brand_form_token, brand_form_expires_at, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?)`
  ).bind(
    body.campaign_name.trim(), body.description || '', body.brand_name || '', body.brand_logo_url || null,
    body.brand_description || '', body.brand_story_image_url || null, body.brand_website_url || null,
    body.product_name.trim(), body.product_image_url || null,
    body.testing_duration_days || 14, body.survey_deadline || null,
    body.reminder1_day || 7, body.reminder2_days_before || 3,
    body.media_content || '[]',
    body.wa_template_welcome || '', body.wa_template_reminder1 || '',
    body.wa_template_reminder2 || '', body.wa_template_complete || '',
    token, tokenExpiry, now, now
  ).run()
  return c.json({ ok: true, id: r.meta.last_row_id, brand_form_token: token, brand_form_expires_at: tokenExpiry })
})

// ── Admin: PUT /api/admin/testing/campaigns/:id — update campaign ──────────────
app.put('/api/admin/testing/campaigns/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const allowed = ['campaign_name','description','brand_name','brand_logo_url','brand_description',
    'brand_story_image_url','brand_website_url','product_name','product_image_url',
    'testing_duration_days','survey_deadline','reminder1_day','reminder2_days_before',
    'media_content','wa_template_welcome','wa_template_reminder1','wa_template_reminder2',
    'wa_template_complete','status','review_comments']
  const fields: string[] = []; const vals: any[] = []
  for (const k of allowed) {
    if (body[k] !== undefined) { fields.push(`${k}=?`); vals.push(body[k]) }
  }
  if (!fields.length) return c.json({ ok: false, error: '無更新欄位' }, 400)
  fields.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(id)
  await db.prepare(`UPDATE testing_campaigns SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ ok: true })
})

// ── Admin: DELETE /api/admin/testing/campaigns/:id ─────────────────────────────
app.delete('/api/admin/testing/campaigns/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const camp = await db.prepare('SELECT status FROM testing_campaigns WHERE id=? LIMIT 1').bind(id).first<any>()
  if (!camp) return c.json({ ok: false, error: '計劃不存在' }, 404)
  if (camp.status === 'live') return c.json({ ok: false, error: '進行中的計劃不可刪除，請先改為 archived' }, 400)
  await db.prepare('DELETE FROM testing_campaigns WHERE id=?').bind(id).run()
  return c.json({ ok: true })
})

// ── Admin: POST /api/admin/testing/campaigns/:id/approve — approve/reject ──────
app.post('/api/admin/testing/campaigns/:id/approve', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const action = body.action // 'approve' | 'request_changes' | 'reject'
  const statusMap: Record<string,string> = { approve:'approved', request_changes:'pending_review', reject:'archived' }
  if (!statusMap[action]) return c.json({ ok: false, error: '無效操作' }, 400)
  const now = new Date().toISOString()
  await db.prepare('UPDATE testing_campaigns SET status=?, review_comments=?, reviewed_at=?, updated_at=? WHERE id=?')
    .bind(statusMap[action], body.comments || null, now, now, id).run()
  return c.json({ ok: true, new_status: statusMap[action] })
})

// ── Admin: POST /api/admin/testing/campaigns/:id/publish — set live ───────────
app.post('/api/admin/testing/campaigns/:id/publish', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const camp = await db.prepare('SELECT status FROM testing_campaigns WHERE id=? LIMIT 1').bind(id).first<any>()
  if (!camp) return c.json({ ok: false, error: '計劃不存在' }, 404)
  if (!['approved','draft'].includes(camp.status)) return c.json({ ok: false, error: '只有已審批或草稿計劃可發佈' }, 400)
  const now = new Date().toISOString()
  await db.prepare('UPDATE testing_campaigns SET status="live", updated_at=? WHERE id=?').bind(now, id).run()
  return c.json({ ok: true })
})

// ── Admin: GET /api/admin/testing/campaigns/:id — get single campaign detail ───
app.get('/api/admin/testing/campaigns/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const camp = await db.prepare('SELECT * FROM testing_campaigns WHERE id=? LIMIT 1').bind(id).first<any>()
  if (!camp) return c.json({ ok: false, error: '計劃不存在' }, 404)
  const questions = await db.prepare('SELECT * FROM testing_questions WHERE campaign_id=? ORDER BY question_order').bind(id).all<any>()
  const reward = await db.prepare('SELECT * FROM testing_rewards WHERE campaign_id=? LIMIT 1').bind(id).first<any>()
  const qrCodes = await db.prepare('SELECT * FROM testing_qr_codes WHERE campaign_id=? ORDER BY id').bind(id).all<any>()
  return c.json({ ok: true, campaign: camp,
    questions: (questions.results || []).map((q:any) => ({ ...q, options: (() => { try { return JSON.parse(q.options) } catch { return [] } })() })),
    reward: reward || null,
    qr_codes: qrCodes.results || [] })
})

// ── Admin: GET /api/admin/testing/campaigns/:id/report — analytics ────────────
app.get('/api/admin/testing/campaigns/:id/report', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const camp = await db.prepare('SELECT campaign_name, brand_name, product_name FROM testing_campaigns WHERE id=? LIMIT 1').bind(id).first<any>()
  if (!camp) return c.json({ ok: false, error: '計劃不存在' }, 404)
  // Funnel counts
  const funnel = await db.prepare(
    `SELECT status, COUNT(*) as cnt FROM testing_participants WHERE campaign_id=? GROUP BY status`
  ).bind(id).all<any>()
  const funnelMap: Record<string,number> = {}
  for (const row of (funnel.results||[])) funnelMap[row.status] = row.cnt
  const total = Object.values(funnelMap).reduce((a,b)=>a+b,0)
  const submitted = funnelMap['survey_submitted'] || 0
  // Per-question response stats
  const qs = await db.prepare('SELECT id, title, question_type, min_value, max_value FROM testing_questions WHERE campaign_id=? ORDER BY question_order').bind(id).all<any>()
  const questionStats = await Promise.all((qs.results||[]).map(async (q:any) => {
    const answers = await db.prepare('SELECT answer FROM testing_responses WHERE campaign_id=? AND question_id=?').bind(id, q.id).all<any>()
    const vals = (answers.results||[]).map((r:any) => r.answer)
    let stat: any = { question_id: q.id, title: q.title, type: q.question_type, response_count: vals.length }
    if (q.question_type === 'rating') {
      const nums = vals.map(Number).filter(n => !isNaN(n))
      stat.average = nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2) : null
      stat.distribution = {}
      for (let i = q.min_value; i <= q.max_value; i++) stat.distribution[i] = nums.filter(n=>n===i).length
    } else if (['single_choice','multi_choice','yes_no'].includes(q.question_type)) {
      const counts: Record<string,number> = {}
      vals.forEach(v => { (v||'').split(',').forEach((s:string) => { s=s.trim(); if(s) counts[s]=(counts[s]||0)+1 }) })
      stat.option_counts = counts
    } else {
      stat.sample_answers = vals.slice(0, 20)
    }
    return stat
  }))
  // QR scan stats
  const qrStats = await db.prepare('SELECT label, tracking_code, scanned_count FROM testing_qr_codes WHERE campaign_id=? ORDER BY scanned_count DESC').bind(id).all<any>()
  return c.json({ ok: true,
    campaign: camp,
    funnel: { total_registered: total, sample_claimed: (funnelMap['sample_claimed']||0)+(funnelMap['survey_started']||0)+(funnelMap['survey_submitted']||0)+(funnelMap['reward_sent']||0), survey_submitted: submitted, conversion_rate: total ? ((submitted/total)*100).toFixed(1)+'%' : '0%', by_status: funnelMap },
    question_stats: questionStats,
    qr_stats: qrStats.results || [] })
})

// ── Admin: GET /api/admin/testing/campaigns/:id/participants — list ────────────
app.get('/api/admin/testing/campaigns/:id/participants', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const rows = await db.prepare(
    `SELECT tp.*, m.name_zh as member_name, m.phone as member_phone,
            tq.label as qr_label, tq.tracking_code
     FROM testing_participants tp
     JOIN members m ON tp.member_no = m.member_no
     LEFT JOIN testing_qr_codes tq ON tp.qr_code_id = tq.id
     WHERE tp.campaign_id=? ORDER BY tp.registered_at DESC`
  ).bind(id).all<any>()
  return c.json({ ok: true, participants: rows.results || [] })
})

// ── Admin: GET /api/admin/testing/participants/:pid/responses — get answers ─────
app.get('/api/admin/testing/participants/:pid/responses', async (c) => {
  const db = c.env.DB
  const pid = c.req.param('pid')
  const participant = await db.prepare(
    `SELECT tp.*, m.name_zh as member_name, m.phone as member_phone
     FROM testing_participants tp
     JOIN members m ON tp.member_no = m.member_no
     WHERE tp.id=? LIMIT 1`
  ).bind(pid).first<any>()
  if (!participant) return c.json({ ok: false, error: '找不到參與者' }, 404)
  const questions = await db.prepare(
    `SELECT id, question_order, question_type, title FROM testing_questions
     WHERE campaign_id=? ORDER BY question_order ASC`
  ).bind(participant.campaign_id).all<any>()
  const responses = await db.prepare(
    `SELECT question_id, answer FROM testing_responses WHERE participant_id=? ORDER BY question_id ASC`
  ).bind(pid).all<any>()
  const answerMap: Record<number, string> = {}
  for (const r of (responses.results || [])) { answerMap[r.question_id] = r.answer }
  const qWithAnswers = (questions.results || []).map((q: any) => ({
    ...q, answer: answerMap[q.id] ?? ''
  }))
  return c.json({ ok: true, participant, questions: qWithAnswers })
})

// ── Admin: POST /api/admin/testing/campaigns/:id/qr-codes — generate QR code ──
app.post('/api/admin/testing/campaigns/:id/qr-codes', async (c) => {
  const db = c.env.DB
  const campId = c.req.param('id')
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const label = (body.label || '').trim() || '未命名'
  const trackingCode = genTestingCode('PT')
  const now = new Date().toISOString()
  const r = await db.prepare(
    'INSERT INTO testing_qr_codes (campaign_id, label, tracking_code, status, created_at) VALUES (?,?,?,"active",?)'
  ).bind(campId, label, trackingCode, now).run()
  // Build the QR URL (points to /testing/scan page)
  const surveyUrl = `https://coeldery85.com/testing/scan/${trackingCode}`
  return c.json({ ok: true, id: r.meta.last_row_id, tracking_code: trackingCode, survey_url: surveyUrl, label })
})

// ── Admin: GET/POST/PUT /api/admin/testing/campaigns/:id/questions ─────────────
app.get('/api/admin/testing/campaigns/:id/questions', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const rows = await db.prepare('SELECT * FROM testing_questions WHERE campaign_id=? ORDER BY question_order').bind(id).all<any>()
  return c.json({ ok: true, questions: (rows.results||[]).map((q:any) => ({ ...q, options: (() => { try { return JSON.parse(q.options) } catch { return [] } })() })) })
})

app.post('/api/admin/testing/campaigns/:id/questions', async (c) => {
  const db = c.env.DB
  const campId = c.req.param('id')
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  if (!body.title?.trim()) return c.json({ ok: false, error: '請填寫題目' }, 400)
  const maxOrder = await db.prepare('SELECT COALESCE(MAX(question_order),0) as m FROM testing_questions WHERE campaign_id=?').bind(campId).first<any>()
  const order = (maxOrder?.m || 0) + 1
  const r = await db.prepare(
    `INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, image_url, is_required, options, min_value, max_value, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(campId, order, body.question_type||'rating', body.title.trim(), body.description||'',
    body.image_url||null, body.is_required!==false?1:0,
    JSON.stringify(body.options||[]), body.min_value||1, body.max_value||5, new Date().toISOString()).run()
  return c.json({ ok: true, id: r.meta.last_row_id })
})

app.put('/api/admin/testing/questions/:qid', async (c) => {
  const db = c.env.DB
  const qid = c.req.param('qid')
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const allowed = ['question_order','question_type','title','description','image_url','is_required','options','min_value','max_value']
  const fields: string[] = []; const vals: any[] = []
  for (const k of allowed) {
    if (body[k] !== undefined) {
      fields.push(`${k}=?`)
      vals.push(k === 'options' ? JSON.stringify(body[k]) : body[k])
    }
  }
  if (!fields.length) return c.json({ ok: false, error: '無更新欄位' }, 400)
  vals.push(qid)
  await db.prepare(`UPDATE testing_questions SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ ok: true })
})

app.delete('/api/admin/testing/questions/:qid', async (c) => {
  const db = c.env.DB
  await db.prepare('DELETE FROM testing_questions WHERE id=?').bind(c.req.param('qid')).run()
  return c.json({ ok: true })
})

// ── Admin: GET/POST/PUT /api/admin/testing/campaigns/:id/reward ───────────────
app.get('/api/admin/testing/campaigns/:id/reward', async (c) => {
  const db = c.env.DB
  const r = await db.prepare('SELECT * FROM testing_rewards WHERE campaign_id=? LIMIT 1').bind(c.req.param('id')).first<any>()
  return c.json({ ok: true, reward: r || null })
})

app.post('/api/admin/testing/campaigns/:id/reward', async (c) => {
  const db = c.env.DB
  const campId = c.req.param('id')
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const existing = await db.prepare('SELECT id FROM testing_rewards WHERE campaign_id=? LIMIT 1').bind(campId).first<any>()
  const now = new Date().toISOString()
  if (existing) {
    await db.prepare('UPDATE testing_rewards SET reward_name=?, reward_description=?, reward_type=?, reward_value=?, quantity_available=?, delivery_notes=? WHERE campaign_id=?')
      .bind(body.reward_name||'', body.reward_description||'', body.reward_type||'product', body.reward_value||'', body.quantity_available||0, body.delivery_notes||'', campId).run()
  } else {
    await db.prepare('INSERT INTO testing_rewards (campaign_id, reward_name, reward_description, reward_type, reward_value, quantity_available, delivery_notes, created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(campId, body.reward_name||'', body.reward_description||'', body.reward_type||'product', body.reward_value||'', body.quantity_available||0, body.delivery_notes||'', now).run()
  }
  return c.json({ ok: true })
})

// ── Admin: POST /api/admin/testing/send-whatsapp — manual WA send ─────────────
app.post('/api/admin/testing/send-whatsapp', async (c) => {
  const db = c.env.DB
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const { participant_id, message_type } = body
  // Get participant + member + campaign info
  const info = await db.prepare(
    `SELECT tp.*, m.name as member_name, m.phone, tc.campaign_name, tc.product_name,
            tc.wa_template_welcome, tc.wa_template_reminder1, tc.wa_template_reminder2, tc.wa_template_complete,
            tc.testing_duration_days, tc.survey_deadline
     FROM testing_participants tp
     JOIN members m ON tp.member_no = m.member_no
     JOIN testing_campaigns tc ON tp.campaign_id = tc.id
     WHERE tp.id=? LIMIT 1`
  ).bind(participant_id).first<any>()
  if (!info) return c.json({ ok: false, error: '找不到參與記錄' }, 404)
  // Select template
  const templateMap: Record<string,string> = {
    welcome: info.wa_template_welcome, reminder1: info.wa_template_reminder1,
    reminder2: info.wa_template_reminder2, complete: info.wa_template_complete
  }
  let template = templateMap[message_type] || ''
  if (!template) return c.json({ ok: false, error: '此計劃未設定此類型訊息模板' }, 400)
  // Replace placeholders
  const deadline = info.survey_deadline || (() => { const d=new Date(info.registered_at||Date.now()); d.setDate(d.getDate()+info.testing_duration_days); return d.toISOString().slice(0,10) })()
  const surveyLink = `https://coeldery85.com/app` // members go to /app → testing tab
  template = template.replace(/\{user_name\}/g, info.member_name||'').replace(/\{product_name\}/g, info.product_name||'').replace(/\{campaign_name\}/g, info.campaign_name||'').replace(/\{survey_deadline\}/g, deadline).replace(/\{survey_link\}/g, surveyLink)
  // Build WA link (manual send for now — admin copies link or API)
  const phone = (info.phone||'').replace(/\D/g,'')
  const waUrl = phone ? `https://wa.me/852${phone}?text=${encodeURIComponent(template)}` : null
  // Record send time
  const nowStr = new Date().toISOString()
  const colMap: Record<string,string> = { welcome:'wa_welcome_sent_at', reminder1:'wa_reminder1_sent_at', reminder2:'wa_reminder2_sent_at', complete:'wa_complete_sent_at' }
  if (colMap[message_type]) {
    await db.prepare(`UPDATE testing_participants SET ${colMap[message_type]}=? WHERE id=?`).bind(nowStr, participant_id).run()
  }
  return c.json({ ok: true, wa_url: waUrl, message: template, phone })
})

// ── Brand form: GET /api/testing/brand-form/:token — get campaign for brand ────
app.get('/api/testing/brand-form/:token', async (c) => {
  const db = c.env.DB
  const token = c.req.param('token')
  const camp = await db.prepare(
    'SELECT id, campaign_name, brand_form_expires_at, status FROM testing_campaigns WHERE brand_form_token=? LIMIT 1'
  ).bind(token).first<any>()
  if (!camp) return c.json({ ok: false, error: '表單連結無效' }, 404)
  if (new Date(camp.brand_form_expires_at) < new Date()) return c.json({ ok: false, error: '表單連結已過期' }, 400)
  if (!['draft','pending_review'].includes(camp.status)) return c.json({ ok: false, error: '此計劃已不接受提交' }, 400)
  return c.json({ ok: true, campaign_id: camp.id, campaign_name: camp.campaign_name })
})

// ── Brand form: POST /api/testing/brand-form/:token/submit — brand submits ─────
app.post('/api/testing/brand-form/:token/submit', async (c) => {
  const db = c.env.DB
  const token = c.req.param('token')
  let body: any
  try { body = await c.req.json() } catch { return c.json({ ok: false, error: '無效請求' }, 400) }
  const camp = await db.prepare('SELECT id, brand_form_expires_at, status FROM testing_campaigns WHERE brand_form_token=? LIMIT 1').bind(token).first<any>()
  if (!camp) return c.json({ ok: false, error: '表單連結無效' }, 404)
  if (new Date(camp.brand_form_expires_at) < new Date()) return c.json({ ok: false, error: '表單連結已過期' }, 400)
  const now = new Date().toISOString()
  // Update campaign brand info
  await db.prepare(
    `UPDATE testing_campaigns SET brand_name=?, brand_logo_url=?, brand_description=?, brand_story_image_url=?,
     brand_website_url=?, media_content=?, wa_template_welcome=?, wa_template_reminder1=?,
     wa_template_reminder2=?, wa_template_complete=?, status='pending_review', brand_submitted_at=?, updated_at=? WHERE id=?`
  ).bind(body.brand_name||'', body.brand_logo_url||null, body.brand_description||'', body.brand_story_image_url||null,
    body.brand_website_url||null, JSON.stringify(body.media_content||[]),
    body.wa_template_welcome||'', body.wa_template_reminder1||'',
    body.wa_template_reminder2||'', body.wa_template_complete||'',
    now, now, camp.id).run()
  // Upsert reward
  if (body.reward) {
    const existing = await db.prepare('SELECT id FROM testing_rewards WHERE campaign_id=? LIMIT 1').bind(camp.id).first<any>()
    if (existing) {
      await db.prepare('UPDATE testing_rewards SET reward_name=?, reward_description=?, reward_type=?, reward_value=?, quantity_available=?, delivery_notes=? WHERE campaign_id=?')
        .bind(body.reward.reward_name||'', body.reward.reward_description||'', body.reward.reward_type||'product', body.reward.reward_value||'', body.reward.quantity_available||0, body.reward.delivery_notes||'', camp.id).run()
    } else {
      await db.prepare('INSERT INTO testing_rewards (campaign_id, reward_name, reward_description, reward_type, reward_value, quantity_available, delivery_notes, created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(camp.id, body.reward.reward_name||'', body.reward.reward_description||'', body.reward.reward_type||'product', body.reward.reward_value||'', body.reward.quantity_available||0, body.reward.delivery_notes||'', now).run()
    }
  }
  return c.json({ ok: true, campaign_id: camp.id })
})

// ── Public: GET /testing/scan/:code — redirect page (browser entry point) ──────
app.get('/testing/scan/:code', (c) => {
  const code = c.req.param('code')
  // Redirect to /app with testing context — member identifies themselves there
  return c.redirect(`/app?testing=${encodeURIComponent(code)}`)
})

// ── Brand form page: GET /brand-form — standalone brand submission page ─────────
app.get('/brand-form', (c) => {
  const token = c.req.query('token') || ''
  return c.html(brandFormHtml(token))
})

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Feedback (心聲) APIs ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/feedback — create thread + first message (member)
app.post('/api/feedback', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{ member_no: string; subject: string; content: string }>()
  const { member_no, subject, content } = body
  if (!member_no || !subject || !content) return c.json({ ok: false, error: '缺少必要欄位' }, 400)
  // verify member exists
  const member = await db.prepare('SELECT name_zh FROM members WHERE member_no=?').bind(member_no).first<{ name_zh: string }>()
  if (!member) return c.json({ ok: false, error: '找不到會員' }, 403)
  const now = new Date().toISOString()
  try {
    const thread = await db.prepare(
      `INSERT INTO feedback_threads (member_no, member_name, subject, status, has_unread_for_member, created_at, updated_at)
       VALUES (?, ?, ?, 'new', 0, ?, ?)`
    ).bind(member_no, member.name_zh || '', subject.trim(), now, now).run()
    const threadId = thread.meta.last_row_id
    await db.prepare(
      `INSERT INTO feedback_messages (thread_id, sender, content, created_at) VALUES (?, 'member', ?, ?)`
    ).bind(threadId, content.trim(), now).run()
    return c.json({ ok: true, thread_id: threadId })
  } catch (_) {
    return c.json({ ok: false, error: '資料表未建立，請先執行 migration 0017' }, 500)
  }
})

// GET /api/feedback?m=member_no — list own threads only
app.get('/api/feedback', async (c) => {
  const memberNo = c.req.query('m') || ''
  if (!memberNo) return c.json({ ok: false, error: '缺少 m 參數' }, 400)
  const db = c.env.DB
  // verify member
  const member = await db.prepare('SELECT member_no FROM members WHERE member_no=?').bind(memberNo).first<{ member_no: string }>()
  if (!member) return c.json({ ok: false, error: '找不到會員' }, 403)
  try {
    const rows = await db.prepare(
      `SELECT id, subject, status, has_unread_for_member, created_at, updated_at
       FROM feedback_threads WHERE member_no=? ORDER BY updated_at DESC`
    ).bind(memberNo).all()
    return c.json({ ok: true, threads: rows.results })
  } catch (_) {
    return c.json({ ok: true, threads: [] })
  }
})

// GET /api/feedback/:threadId?m=member_no — thread messages (own only)
app.get('/api/feedback/:threadId', async (c) => {
  const threadId = c.req.param('threadId')
  const memberNo = c.req.query('m') || ''
  if (!memberNo) return c.json({ ok: false, error: '缺少 m 參數' }, 400)
  const db = c.env.DB
  const thread = await db.prepare('SELECT * FROM feedback_threads WHERE id=?').bind(threadId).first<any>()
  if (!thread) return c.json({ ok: false, error: '找不到對話' }, 404)
  if (thread.member_no !== memberNo) return c.json({ ok: false, error: '無權查閱' }, 403)
  // mark as read for member
  await db.prepare('UPDATE feedback_threads SET has_unread_for_member=0 WHERE id=?').bind(threadId).run()
  const msgs = await db.prepare(
    `SELECT id, sender, content, created_at FROM feedback_messages WHERE thread_id=? ORDER BY created_at ASC`
  ).bind(threadId).all()
  return c.json({ ok: true, thread, messages: msgs.results })
})

// POST /api/feedback/:threadId/reply — member reply
app.post('/api/feedback/:threadId/reply', async (c) => {
  const threadId = c.req.param('threadId')
  const db = c.env.DB
  const body = await c.req.json<{ member_no: string; content: string }>()
  const { member_no, content } = body
  if (!member_no || !content) return c.json({ ok: false, error: '缺少必要欄位' }, 400)
  const thread = await db.prepare('SELECT * FROM feedback_threads WHERE id=?').bind(threadId).first<any>()
  if (!thread) return c.json({ ok: false, error: '找不到對話' }, 404)
  if (thread.member_no !== member_no) return c.json({ ok: false, error: '無權回覆' }, 403)
  if (thread.status === 'closed') return c.json({ ok: false, error: '對話已關閉' }, 400)
  const now = new Date().toISOString()
  await db.prepare(
    `INSERT INTO feedback_messages (thread_id, sender, content, created_at) VALUES (?, 'member', ?, ?)`
  ).bind(threadId, content.trim(), now).run()
  await db.prepare(
    `UPDATE feedback_threads SET updated_at=?, status='new' WHERE id=?`
  ).bind(now, threadId).run()
  return c.json({ ok: true })
})

// GET /api/admin/feedback — admin: all threads
app.get('/api/admin/feedback', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare(
      `SELECT id, member_no, member_name, subject, status, has_unread_for_member, created_at, updated_at
       FROM feedback_threads ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'replied' THEN 1 ELSE 2 END ASC, updated_at DESC`
    ).all()
    return c.json({ ok: true, threads: rows.results })
  } catch (_) {
    return c.json({ ok: true, threads: [] })
  }
})

// GET /api/admin/feedback/:threadId — admin: read thread messages
app.get('/api/admin/feedback/:threadId', async (c) => {
  const threadId = c.req.param('threadId')
  const db = c.env.DB
  const thread = await db.prepare('SELECT * FROM feedback_threads WHERE id=?').bind(threadId).first<any>()
  if (!thread) return c.json({ ok: false, error: '找不到對話' }, 404)
  const msgs = await db.prepare(
    `SELECT id, sender, content, created_at FROM feedback_messages WHERE thread_id=? ORDER BY created_at ASC`
  ).bind(threadId).all()
  return c.json({ ok: true, thread, messages: msgs.results })
})

// POST /api/admin/feedback/:threadId/reply — admin reply
app.post('/api/admin/feedback/:threadId/reply', async (c) => {
  const threadId = c.req.param('threadId')
  const db = c.env.DB
  const body = await c.req.json<{ content: string }>()
  if (!body.content) return c.json({ ok: false, error: '內容不能為空' }, 400)
  const thread = await db.prepare('SELECT id FROM feedback_threads WHERE id=?').bind(threadId).first<any>()
  if (!thread) return c.json({ ok: false, error: '找不到對話' }, 404)
  const now = new Date().toISOString()
  await db.prepare(
    `INSERT INTO feedback_messages (thread_id, sender, content, created_at) VALUES (?, 'admin', ?, ?)`
  ).bind(threadId, body.content.trim(), now).run()
  await db.prepare(
    `UPDATE feedback_threads SET status='replied', has_unread_for_member=1, updated_at=? WHERE id=?`
  ).bind(now, threadId).run()
  return c.json({ ok: true })
})

// PATCH /api/admin/feedback/:threadId/status — close thread
app.patch('/api/admin/feedback/:threadId/status', async (c) => {
  const threadId = c.req.param('threadId')
  const db = c.env.DB
  const body = await c.req.json<{ status: string }>()
  if (!['new', 'replied', 'closed'].includes(body.status)) return c.json({ ok: false, error: '無效 status' }, 400)
  await db.prepare('UPDATE feedback_threads SET status=?, updated_at=? WHERE id=?').bind(body.status, new Date().toISOString(), threadId).run()
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
  // Check medical card application status + card_no + card_image_url (defensive: columns may not exist yet)
  let medApp: { status: string; card_no: string | null; card_image_url: string | null } | null = null
  try {
    medApp = await db.prepare(
      'SELECT status, card_no, card_image_url FROM medical_card_applications WHERE member_no = ? LIMIT 1'
    ).bind(no).first<{ status: string; card_no: string | null; card_image_url: string | null }>()
  } catch (_) {
    try {
      medApp = await db.prepare(
        'SELECT status, card_no, NULL AS card_image_url FROM medical_card_applications WHERE member_no = ? LIMIT 1'
      ).bind(no).first<{ status: string; card_no: string | null; card_image_url: string | null }>()
    } catch (_2) {
      medApp = await db.prepare(
        'SELECT status, NULL AS card_no, NULL AS card_image_url FROM medical_card_applications WHERE member_no = ? LIMIT 1'
      ).bind(no).first<{ status: string; card_no: string | null; card_image_url: string | null }>()
    }
  }
  return c.html(memberProfileHtml(row, medApp?.status ?? null, medApp?.card_no ?? null, medApp?.card_image_url ?? null))
})

// ─── Future modules (placeholder) ────────────────────────────────────────────
app.get('/accounting',  (c) => c.html(comingSoonHtml('Accounting', '財務管理')))
app.get('/governance',  (c) => c.html(comingSoonHtml('Governance', '治理管理')))
app.get('/events',      (c) => c.html(comingSoonHtml('Events', '活動管理')))
app.get('/volunteers',    (c) => c.html(coworkeryAppHtml()))   // /volunteers → 長者打卡頁
app.get('/app/coworkery', (c) => c.html(coworkeryAppHtml()))   // 正式打卡頁 URL

// ═══════════════════════════════════════════════════════════════════════════════
// CoWorkery 後台管理 API（受既有 /api/admin/* middleware 保護）
// Schema 確認：
//   roadshows.code（主鍵）、roadshows.name、roadshows.store_code（去正規化）
//   jhc_stores JOIN: s.store_code = r.store_code
//   members.tier = 'PRIMARY' | 'FAMILY'
// ═══════════════════════════════════════════════════════════════════════════════

// ── 3A-1. 開卡（註冊）+ 上傳身份證正本 ──────────────────────────────────────
// multipart/form-data：文字欄位 + id_front 檔案（可選）
app.post('/api/admin/coworkery/register', async (c) => {
  try {
    const form = await c.req.formData()
    const get = (k: string) => {
      const v = form.get(k)
      return v === null ? '' : String(v).trim()
    }

    const member_no = get('member_no')
    const name_zh   = get('name_zh')
    const phone     = get('phone')
    if (!member_no || !name_zh || !phone) {
      return c.json({ ok: false, error: '缺少必填欄位（member_no / name_zh / phone）' }, 400)
    }

    // 驗證會員存在、為主卡（tier = PRIMARY）、年齡 >= 55
    const member = await c.env.DB
      .prepare('SELECT member_no, birth_year, tier FROM members WHERE member_no = ?')
      .bind(member_no)
      .first<{ member_no: string; birth_year: number | null; tier: string }>()
    if (!member) {
      return c.json({ ok: false, error: '找不到對應會員，請確認老有卡編號' }, 404)
    }
    if (member.tier !== 'PRIMARY') {
      return c.json({ ok: false, error: '只有主卡會員可申請 CoWorkery' }, 400)
    }
    const thisYear = new Date().getFullYear()
    if (member.birth_year && thisYear - member.birth_year < 55) {
      return c.json({ ok: false, error: '該會員未滿 55 歲，不符合 CoWorkery 資格' }, 400)
    }

    // 防重複開卡
    const dup = await c.env.DB
      .prepare('SELECT cw_no FROM co_workery WHERE member_no = ?')
      .bind(member_no)
      .first<{ cw_no: string }>()
    if (dup) {
      return c.json({ ok: false, error: `該會員已有 CoWorkery 編號 ${dup.cw_no}` }, 409)
    }

    // 取新 CW 編號（atomic RETURNING）
    const cw_no = await nextCwNo(c.env.DB)

    // 上傳身份證正本（可選；R2 無綁定時 graceful skip）
    let id_front_key: string | null = null
    const idFile = form.get('id_front')
    if (idFile && idFile instanceof File && idFile.size > 0) {
      if (!c.env.FILES) {
        return c.json({ ok: false, error: 'R2 未綁定，無法上傳身份證。請先不附圖開卡，或 deploy 時加 --with-r2。' }, 503)
      }
      id_front_key = `coworkery/${cw_no}/id_front.jpg`
      await c.env.FILES.put(id_front_key, await idFile.arrayBuffer(), {
        httpMetadata: { contentType: idFile.type || 'image/jpeg' },
      })
    }

    await c.env.DB.prepare(`
      INSERT INTO co_workery
        (cw_no, member_no, name_zh, name_en, phone, gender, birth_year, address, district,
         hkid_prefix, id_front_key, bank_name, bank_account_name, bank_account_no,
         default_hourly_rate, status, approved_by, approved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'admin', datetime('now'))
    `).bind(
      cw_no, member_no, name_zh,
      get('name_en') || null, phone,
      get('gender') || null,
      member.birth_year ?? null,
      get('address') || null,
      get('district') || null,
      get('hkid_prefix') || null,
      id_front_key,
      get('bank_name') || null,
      get('bank_account_name') || null,
      get('bank_account_no') || null,
      parseInt(get('default_hourly_rate')) || 0
    ).run()

    return c.json({ ok: true, cw_no })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3A-2. 列表 + 統計 ──────────────────────────────────────────────────────
app.get('/api/admin/coworkery/list', async (c) => {
  try {
    const status = c.req.query('status') || ''
    const q      = (c.req.query('q') || '').trim()

    let sql = `SELECT id, cw_no, member_no, name_zh, name_en, phone, gender, district,
                      hkid_prefix, bank_name, bank_account_name, bank_account_no, bank_account, default_hourly_rate,
                      status, reject_reason, id_front_key, created_at
               FROM co_workery WHERE 1=1`
    const binds: unknown[] = []
    if (status) { sql += ' AND status = ?'; binds.push(status) }
    if (q) {
      sql += ' AND (cw_no LIKE ? OR name_zh LIKE ? OR phone LIKE ? OR member_no LIKE ?)'
      const like = `%${q}%`
      binds.push(like, like, like, like)
    }
    sql += ' ORDER BY id DESC LIMIT 500'

    const { results } = await c.env.DB.prepare(sql).bind(...binds).all()

    const stat = await c.env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='ACTIVE'    THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status='PENDING'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='REJECTED'  THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status='SUSPENDED' THEN 1 ELSE 0 END) AS suspended
      FROM co_workery
    `).first()

    return c.json({ ok: true, list: results, stat })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3A-3. 審批 / 拒絕 / 停牌 / 更新資料 ────────────────────────────────────
app.patch('/api/admin/coworkery/list', async (c) => {
  try {
    const body = await c.req.json<{
      cw_no: string
      action?: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE'
      reject_reason?: string
      default_hourly_rate?: number
      bank_name?: string
      bank_account_name?: string
      bank_account_no?: string
    }>()
    if (!body.cw_no) return c.json({ ok: false, error: '缺少 cw_no' }, 400)

    if (body.action) {
      const statusMap: Record<string, string> = {
        APPROVE: 'ACTIVE', REJECT: 'REJECTED', SUSPEND: 'SUSPENDED', REACTIVATE: 'ACTIVE',
      }
      const newStatus = statusMap[body.action]
      if (!newStatus) return c.json({ ok: false, error: '未知 action' }, 400)

      await c.env.DB.prepare(`
        UPDATE co_workery
        SET status = ?, reject_reason = ?,
            approved_by = 'admin', approved_at = datetime('now'),
            updated_at = datetime('now')
        WHERE cw_no = ?
      `).bind(
        newStatus,
        body.action === 'REJECT' ? (body.reject_reason || '') : null,
        body.cw_no
      ).run()
    }

    // 更新可編輯欄位（只更新有傳嘅）
    const sets: string[] = []
    const binds: unknown[] = []
    if (typeof body.default_hourly_rate === 'number') { sets.push('default_hourly_rate = ?'); binds.push(body.default_hourly_rate) }
    if (typeof body.bank_name === 'string')           { sets.push('bank_name = ?');           binds.push(body.bank_name) }
    if (typeof body.bank_account_name === 'string')   { sets.push('bank_account_name = ?');   binds.push(body.bank_account_name) }
    if (typeof body.bank_account_no === 'string')     { sets.push('bank_account_no = ?');     binds.push(body.bank_account_no) }
    if (sets.length) {
      sets.push("updated_at = datetime('now')")
      binds.push(body.cw_no)
      await c.env.DB.prepare(
        `UPDATE co_workery SET ${sets.join(', ')} WHERE cw_no = ?`
      ).bind(...binds).run()
    }

    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3A-4. 場次 geo / 時薪 / 津貼 設定 ──────────────────────────────────────
// GET：JOIN roadshows（r.code）+ jhc_stores（s.store_code = r.store_code）+ roadshow_geo
app.get('/api/admin/coworkery/sessions', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        r.code            AS roadshow_code,
        r.name            AS roadshow_name,
        r.start_date,
        r.end_date,
        r.status          AS roadshow_status,
        s.district        AS store_district,
        s.address         AS store_address,
        g.latitude,
        g.longitude,
        g.geofence_radius,
        g.headcount_needed,
        g.session_hourly_rate,
        g.transport_allowance,
        g.meal_allowance,
        g.brand_ref
      FROM roadshows r
      LEFT JOIN jhc_stores s  ON s.store_code = r.store_code
      LEFT JOIN roadshow_geo g ON g.roadshow_code = r.code
      ORDER BY r.start_date DESC
      LIMIT 300
    `).all()
    return c.json({ ok: true, list: results })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// POST：upsert 某場次的 geo / 時薪 / 津貼 / 品牌設定
// roadshow_code 對應 roadshows.code
app.post('/api/admin/coworkery/sessions', async (c) => {
  try {
    const b = await c.req.json<{
      roadshow_code: string
      latitude?: number; longitude?: number; geofence_radius?: number
      headcount_needed?: number; session_hourly_rate?: number
      transport_allowance?: number; meal_allowance?: number; brand_ref?: string
    }>()
    if (!b.roadshow_code) return c.json({ ok: false, error: '缺少 roadshow_code（即 roadshows.code）' }, 400)

    // 確認 roadshow 存在（roadshows.code）
    const rs = await c.env.DB
      .prepare('SELECT code FROM roadshows WHERE code = ?')
      .bind(b.roadshow_code).first()
    if (!rs) return c.json({ ok: false, error: `找不到 roadshow code: ${b.roadshow_code}` }, 404)

    await c.env.DB.prepare(`
      INSERT INTO roadshow_geo
        (roadshow_code, latitude, longitude, geofence_radius, headcount_needed,
         session_hourly_rate, transport_allowance, meal_allowance, brand_ref, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(roadshow_code) DO UPDATE SET
        latitude            = excluded.latitude,
        longitude           = excluded.longitude,
        geofence_radius     = excluded.geofence_radius,
        headcount_needed    = excluded.headcount_needed,
        session_hourly_rate = excluded.session_hourly_rate,
        transport_allowance = excluded.transport_allowance,
        meal_allowance      = excluded.meal_allowance,
        brand_ref           = excluded.brand_ref,
        updated_at          = datetime('now')
    `).bind(
      b.roadshow_code,
      b.latitude ?? null, b.longitude ?? null,
      b.geofence_radius ?? 250,
      b.headcount_needed ?? 0,
      b.session_hourly_rate ?? 0,
      b.transport_allowance ?? 0,
      b.meal_allowance ?? 0,
      b.brand_ref ?? null
    ).run()

    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3A-5. 派更 ──────────────────────────────────────────────────────────────
// GET：某場次的報名 + 已派更名單（roadshow_code = roadshows.code）
app.get('/api/admin/coworkery/assign', async (c) => {
  try {
    const code = (c.req.query('roadshow_code') || '').trim()
    if (!code) return c.json({ ok: false, error: '缺少 roadshow_code' }, 400)

    const apps = await c.env.DB.prepare(`
      SELECT sa.cw_no, sa.status, sa.created_at,
             cw.name_zh, cw.phone, cw.district, cw.default_hourly_rate
      FROM session_applications sa
      JOIN co_workery cw ON cw.cw_no = sa.cw_no
      WHERE sa.roadshow_code = ?
      ORDER BY sa.created_at ASC
    `).bind(code).all()

    const assigned = await c.env.DB.prepare(`
      SELECT sg.cw_no, sg.assigned_hourly_rate, sg.assigned_by, sg.created_at,
             cw.name_zh, cw.phone
      FROM session_assignments sg
      JOIN co_workery cw ON cw.cw_no = sg.cw_no
      WHERE sg.roadshow_code = ?
      ORDER BY sg.created_at ASC
    `).bind(code).all()

    return c.json({ ok: true, applications: apps.results, assignments: assigned.results })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// POST：派更（可設特別時薪）；或取消派更
app.post('/api/admin/coworkery/assign', async (c) => {
  try {
    const b = await c.req.json<{
      roadshow_code: string
      cw_no: string
      assigned_hourly_rate?: number
      remove?: boolean
    }>()
    if (!b.roadshow_code || !b.cw_no) {
      return c.json({ ok: false, error: '缺少 roadshow_code / cw_no' }, 400)
    }

    if (b.remove) {
      await c.env.DB
        .prepare('DELETE FROM session_assignments WHERE roadshow_code = ? AND cw_no = ?')
        .bind(b.roadshow_code, b.cw_no).run()
      return c.json({ ok: true, removed: true })
    }

    // 確認 CW 為 ACTIVE 狀態
    const cw = await c.env.DB
      .prepare('SELECT status FROM co_workery WHERE cw_no = ?')
      .bind(b.cw_no).first<{ status: string }>()
    if (!cw || cw.status !== 'ACTIVE') {
      return c.json({ ok: false, error: '該 CoWorkery 非 ACTIVE 狀態，不可派更' }, 400)
    }

    await c.env.DB.prepare(`
      INSERT INTO session_assignments (roadshow_code, cw_no, assigned_hourly_rate, assigned_by)
      VALUES (?, ?, ?, 'admin')
      ON CONFLICT(roadshow_code, cw_no) DO UPDATE SET
        assigned_hourly_rate = excluded.assigned_hourly_rate,
        assigned_by          = 'admin'
    `).bind(b.roadshow_code, b.cw_no, b.assigned_hourly_rate ?? 0).run()

    // 同步：有報名記錄的標為 APPROVED
    await c.env.DB.prepare(`
      UPDATE session_applications
      SET status = 'APPROVED', updated_at = datetime('now')
      WHERE roadshow_code = ? AND cw_no = ?
    `).bind(b.roadshow_code, b.cw_no).run()

    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3A-6. CSV 匯出（CoWorkery 名冊）──────────────────────────────────────
app.get('/api/admin/coworkery/export/csv', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT cw_no, member_no, name_zh, name_en, phone, gender, district,
             hkid_prefix, bank_name, bank_account_name, bank_account_no,
             default_hourly_rate, status, created_at
      FROM co_workery ORDER BY id ASC
    `).all<Record<string, unknown>>()

    const headers = [
      'CW\u7de8\u865f', '\u6703\u54e1\u7de8\u865f', '\u4e2d\u6587\u59d3\u540d', '\u82f1\u6587\u59d3\u540d',
      '\u96fb\u8a71', '\u6027\u5225', '\u5730\u5340', 'HKID\u982d4\u4f4d',
      '\u9280\u884c', '\u6236\u540d', '\u8cec\u865f', '\u9810\u8a2d\u6642\u85aa(\u5143)',
      '\u72c0\u614b', '\u767b\u8a18\u6642\u9593'
    ]
    const lines = [headers.map(csvCell).join(',')]
    for (const r of results) {
      lines.push([
        csvCell(r.cw_no),
        csvCell(r.member_no),
        csvCell(r.name_zh),
        csvCell(r.name_en),
        csvCell(r.phone),
        csvCell(r.gender),
        csvCell(r.district),
        csvCell(r.hkid_prefix),
        csvCell(r.bank_name),
        csvCell(r.bank_account_name),
        csvCell(r.bank_account_no),
        csvCell(centsToStr(r.default_hourly_rate as number)),
        csvCell(r.status),
        csvCell(r.created_at),
      ].join(','))
    }
    // BOM 令 Excel 正確顯示中文
    const csv = '\uFEFF' + lines.join('\r\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="coworkery_list.csv"',
      },
    })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// CoWorkery 打卡（半公開，內建 phone+cw_no 自足驗證）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 自足驗證：核對 cw_no + phone 相符且狀態 ACTIVE。
 * 回傳 co_workery 該筆，或 null。
 */
async function verifyCw(db: D1Database, cw_no: string, phone: string) {
  if (!cw_no || !phone) return null
  const row = await db
    .prepare('SELECT cw_no, member_no, name_zh, status FROM co_workery WHERE cw_no = ? AND phone = ?')
    .bind(cw_no, phone)
    .first<{ cw_no: string; member_no: string; name_zh: string; status: string }>()
  if (!row || row.status !== 'ACTIVE') return null
  return row
}

// ── 3B-0. 長者自助申請 ────────────────────────────────────────────────────────
app.post('/api/coworkery/apply', async (c) => {
  try {
    const { DB } = c.env as Env
    const body = await c.req.json() as {
      member_no?: string; phone?: string; name_zh?: string; district?: string;
      bank_name?: string; bank_account_name?: string; bank_account_no?: string; bank_account?: string;
    }
    const member_no = (body.member_no ?? '').trim()
    const phone     = (body.phone ?? '').trim()
    const name_zh   = (body.name_zh ?? '').trim()
    if (!member_no || !phone || !name_zh) return c.json({ ok: false, error: '請填寫會員編號、電話及姓名' })

    // 1. 確認係會員
    const member = await DB.prepare(
      `SELECT id FROM members WHERE member_no=? LIMIT 1`
    ).bind(member_no).first<{ id: number }>()
    if (!member) return c.json({ ok: false, error: `找不到會員編號 ${member_no}，請確認編號正確` })

    // 2. 檢查有冇重複申請
    const existing = await DB.prepare(
      `SELECT cw_no, status FROM co_workery WHERE member_no=? LIMIT 1`
    ).bind(member_no).first<{ cw_no: string; status: string }>()
    if (existing) {
      if (existing.status === 'ACTIVE')    return c.json({ ok: false, error: `你已係 CoWorkery，CW 編號：${existing.cw_no}` })
      if (existing.status === 'PENDING')   return c.json({ ok: false, error: '你的申請正在審批中，請耐心等候' })
      if (existing.status === 'REJECTED')  return c.json({ ok: false, error: '你的申請已被拒絕，如有疑問請聯絡管理員' })
      if (existing.status === 'SUSPENDED') return c.json({ ok: false, error: '你的帳戶已被暫停，如有疑問請聯絡管理員' })
    }

    // 3. 生成 CW 編號
    const counter = await DB.prepare(
      `SELECT COALESCE(MAX(CAST(SUBSTR(cw_no,3) AS INTEGER)),0)+1 AS next FROM co_workery`
    ).first<{ next: number }>()
    const cw_no = 'CW' + String(counter?.next ?? 1).padStart(6, '0')

    // 4. 銀行資料
    const bank_name         = body.bank_name?.trim() || null
    const bank_account_name = body.bank_account_name?.trim() || name_zh   // 默認用申請人姓名
    const bank_account_no   = body.bank_account_no?.trim() || null
    const bank_account      = bank_name && bank_account_no
      ? `${bank_name} ${bank_account_no}`
      : (body.bank_account?.trim() || null)

    // 5. Insert
    await DB.prepare(`
      INSERT INTO co_workery
        (cw_no, member_no, phone, name_zh, district,
         bank_name, bank_account_name, bank_account_no, bank_account,
         status, default_hourly_rate)
      VALUES (?,?,?,?,?, ?,?,?,?, 'PENDING',0)
    `).bind(
      cw_no, member_no, phone, name_zh, body.district || null,
      bank_name, bank_account_name, bank_account_no, bank_account
    ).run()

    return c.json({ ok: true, cw_no })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message ?? '伺服器錯誤' })
  }
})

// ── 3B-0b. 查詢申請狀態（用 member_no 查，供前端自動填入）──────────────────
// GET /api/coworkery/my-status?member_no=85-00001
app.get('/api/coworkery/my-status', async (c) => {
  try {
    const { DB } = c.env as Env
    const member_no = (c.req.query('member_no') || '').trim()
    if (!member_no) return c.json({ ok: false, error: 'missing member_no' }, 400)

    const row = await DB.prepare(
      `SELECT cw_no, name_zh, phone, district, status, reject_reason, bank_name, bank_account_no
       FROM co_workery WHERE member_no=? LIMIT 1`
    ).bind(member_no).first<{
      cw_no: string; name_zh: string; phone: string; district: string | null; status: string;
      reject_reason: string | null; bank_name: string | null; bank_account_no: string | null;
    }>()

    if (!row) return c.json({ ok: true, found: false })
    return c.json({ ok: true, found: true,
      cw_no: row.cw_no, name_zh: row.name_zh, phone: row.phone,
      district: row.district || null,
      status: row.status, reject_reason: row.reject_reason || null,
      bank_name: row.bank_name, bank_account_no: row.bank_account_no
    })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message ?? '伺服器錯誤' })
  }
})

// ── 3B-1. 上班打卡 ──────────────────────────────────────────────────────────
app.post('/api/coworkery/clock-in', async (c) => {
  try {
    const form = await c.req.formData()
    const get = (k: string) => { const v = form.get(k); return v === null ? '' : String(v).trim() }

    const cw_no         = get('cw_no')
    const phone         = get('phone')
    const roadshow_code = get('roadshow_code')   // 對應 roadshows.code
    const lat           = parseFloat(get('lat'))
    const lng           = parseFloat(get('lng'))

    const cw = await verifyCw(c.env.DB, cw_no, phone)
    if (!cw) return c.json({ ok: false, error: '\u8eab\u4efd\u9a57\u8b49\u5931\u6557\uff0c\u8acb\u78ba\u8a8d CW \u7de8\u865f\u8207\u96fb\u8a71' }, 401)
    if (!roadshow_code) return c.json({ ok: false, error: '\u7f3a\u5c11\u5834\u6b21' }, 400)
    if (isNaN(lat) || isNaN(lng)) return c.json({ ok: false, error: '\u672a\u80fd\u53d6\u5f97\u5b9a\u4f4d\uff0c\u8acb\u958b\u555f\u5b9a\u4f4d\u6b0a\u9650' }, 400)

    // 必須已被派更到此場次
    const assign = await c.env.DB
      .prepare('SELECT cw_no FROM session_assignments WHERE roadshow_code = ? AND cw_no = ?')
      .bind(roadshow_code, cw_no).first()
    if (!assign) return c.json({ ok: false, error: '\u4f60\u672a\u88ab\u6d3e\u66f4\u81f3\u6b64\u5834\u6b21\uff0c\u7121\u6cd5\u6253\u5361' }, 403)

    // 硬性 geofence（roadshow_geo.roadshow_code = roadshows.code）
    const geo = await c.env.DB
      .prepare('SELECT latitude, longitude, geofence_radius FROM roadshow_geo WHERE roadshow_code = ?')
      .bind(roadshow_code)
      .first<{ latitude: number; longitude: number; geofence_radius: number }>()
    if (!geo || geo.latitude == null || geo.longitude == null) {
      return c.json({ ok: false, error: '\u6b64\u5834\u6b21\u672a\u8a2d\u5b9a\u5ea7\u6a19\uff0c\u8acb\u806f\u7d61\u7ba1\u7406\u54e1' }, 400)
    }
    const dist   = haversineMeters(lat, lng, geo.latitude, geo.longitude)
    const radius = geo.geofence_radius || 250
    if (dist > radius) {
      return c.json({ ok: false, error: `\u4f60\u8ddd\u96e2\u5834\u5730\u7d04 ${dist} \u7c73\uff0c\u8d85\u51fa ${radius} \u7c73\u7bc4\u570d\uff0c\u7121\u6cd5\u6253\u5361`, dist }, 403)
    }

    // 防重複打卡
    const exist = await c.env.DB
      .prepare('SELECT clock_in_at FROM attendance_records WHERE roadshow_code = ? AND cw_no = ?')
      .bind(roadshow_code, cw_no)
      .first<{ clock_in_at: string }>()
    if (exist && exist.clock_in_at) {
      return c.json({ ok: false, error: '\u4f60\u5df2\u65bc\u6b64\u5834\u6b21\u6253\u5361\u4e0a\u73ed' }, 409)
    }

    // 自拍（可選；R2 無綁定時 graceful skip）
    let selfieKey: string | null = null
    const selfie = form.get('selfie')
    if (selfie && selfie instanceof File && selfie.size > 0 && c.env.FILES) {
      selfieKey = `attendance/${roadshow_code}_${cw_no}_in.jpg`
      await c.env.FILES.put(selfieKey, await selfie.arrayBuffer(), {
        httpMetadata: { contentType: selfie.type || 'image/jpeg' },
      })
    }

    await c.env.DB.prepare(`
      INSERT INTO attendance_records
        (roadshow_code, cw_no, clock_in_at, clock_in_lat, clock_in_lng, clock_in_dist, clock_in_selfie)
      VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
      ON CONFLICT(roadshow_code, cw_no) DO UPDATE SET
        clock_in_at     = datetime('now'),
        clock_in_lat    = excluded.clock_in_lat,
        clock_in_lng    = excluded.clock_in_lng,
        clock_in_dist   = excluded.clock_in_dist,
        clock_in_selfie = excluded.clock_in_selfie,
        updated_at      = datetime('now')
    `).bind(roadshow_code, cw_no, lat, lng, dist, selfieKey).run()

    return c.json({ ok: true, dist, name: cw.name_zh })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3B-2. 下班打卡 ──────────────────────────────────────────────────────────
app.post('/api/coworkery/clock-out', async (c) => {
  try {
    const form = await c.req.formData()
    const get = (k: string) => { const v = form.get(k); return v === null ? '' : String(v).trim() }

    const cw_no         = get('cw_no')
    const phone         = get('phone')
    const roadshow_code = get('roadshow_code')
    const lat           = parseFloat(get('lat'))
    const lng           = parseFloat(get('lng'))

    const cw = await verifyCw(c.env.DB, cw_no, phone)
    if (!cw) return c.json({ ok: false, error: '\u8eab\u4efd\u9a57\u8b49\u5931\u6557' }, 401)
    if (!roadshow_code) return c.json({ ok: false, error: '\u7f3a\u5c11\u5834\u6b21' }, 400)
    if (isNaN(lat) || isNaN(lng)) return c.json({ ok: false, error: '\u672a\u80fd\u53d6\u5f97\u5b9a\u4f4d\uff0c\u8acb\u958b\u555f\u5b9a\u4f4d\u6b0a\u9650' }, 400)

    const rec = await c.env.DB
      .prepare('SELECT clock_in_at, clock_out_at FROM attendance_records WHERE roadshow_code = ? AND cw_no = ?')
      .bind(roadshow_code, cw_no)
      .first<{ clock_in_at: string; clock_out_at: string }>()
    if (!rec || !rec.clock_in_at) return c.json({ ok: false, error: '\u4f60\u5c1a\u672a\u6253\u5361\u4e0a\u73ed' }, 400)
    if (rec.clock_out_at)         return c.json({ ok: false, error: '\u4f60\u5df2\u6253\u5361\u4e0b\u73ed' }, 409)

    // 硬性 geofence（下班亦需在範圍內）
    const geo = await c.env.DB
      .prepare('SELECT latitude, longitude, geofence_radius FROM roadshow_geo WHERE roadshow_code = ?')
      .bind(roadshow_code)
      .first<{ latitude: number; longitude: number; geofence_radius: number }>()
    if (!geo || geo.latitude == null) return c.json({ ok: false, error: '\u5834\u6b21\u672a\u8a2d\u5ea7\u6a19' }, 400)
    const dist   = haversineMeters(lat, lng, geo.latitude, geo.longitude)
    const radius = geo.geofence_radius || 250
    if (dist > radius) {
      return c.json({ ok: false, error: `\u4f60\u8ddd\u96e2\u5834\u5730\u7d04 ${dist} \u7c73\uff0c\u8d85\u51fa\u7bc4\u570d\uff0c\u7121\u6cd5\u6253\u5361\u4e0b\u73ed`, dist }, 403)
    }

    // 計算工時（julianday 差轉分鐘，server 時鐘為準）
    const diff = await c.env.DB
      .prepare(`SELECT CAST((julianday('now') - julianday(clock_in_at)) * 24 * 60 AS INTEGER) AS mins
                FROM attendance_records WHERE roadshow_code = ? AND cw_no = ?`)
      .bind(roadshow_code, cw_no)
      .first<{ mins: number }>()
    const worked = Math.max(0, diff?.mins || 0)

    // 每週 20 小時（1200 分）上限警示
    const weekSum = await c.env.DB
      .prepare(`SELECT COALESCE(SUM(worked_minutes),0) AS total
                FROM attendance_records
                WHERE cw_no = ? AND clock_in_at >= datetime('now','-7 days')`)
      .bind(cw_no)
      .first<{ total: number }>()
    const weekTotal = (weekSum?.total || 0) + worked
    const flag = weekTotal > 1200 ? 'OVER_WEEKLY' : null

    // 下班自拍（可選；R2 無綁定時 skip）
    let selfieKey: string | null = null
    const selfie = form.get('selfie')
    if (selfie && selfie instanceof File && selfie.size > 0 && c.env.FILES) {
      selfieKey = `attendance/${roadshow_code}_${cw_no}_out.jpg`
      await c.env.FILES.put(selfieKey, await selfie.arrayBuffer(), {
        httpMetadata: { contentType: selfie.type || 'image/jpeg' },
      })
    }

    await c.env.DB.prepare(`
      UPDATE attendance_records
      SET clock_out_at   = datetime('now'),
          clock_out_lat  = ?, clock_out_lng = ?,
          clock_out_dist = ?, worked_minutes = ?, flag = ?,
          clock_out_selfie = COALESCE(?, clock_out_selfie),
          updated_at     = datetime('now')
      WHERE roadshow_code = ? AND cw_no = ?
    `).bind(lat, lng, dist, worked, flag, selfieKey, roadshow_code, cw_no).run()

    return c.json({ ok: true, worked_minutes: worked, flag })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3B-5. 長者端：我的今日/近期派更場次（兼登入驗證）─────────────────────────
// GET /api/coworkery/my-shifts?cw_no=CW000001&phone=12345678
// 成功回傳 { ok:true, name, shifts:[...] }；失敗 401 { ok:false, error }
app.get('/api/coworkery/my-shifts', async (c) => {
  try {
    const cw_no = (c.req.query('cw_no') || '').trim().toUpperCase()
    const phone  = (c.req.query('phone')  || '').trim()
    if (!cw_no || !phone) return c.json({ ok: false, error: '請提供 cw_no 與 phone' }, 400)

    // 自足驗證：phone + cw_no 核對 co_workery 表
    const cw = await verifyCw(c.env.DB, cw_no, phone)
    if (!cw) return c.json({ ok: false, error: '身份驗證失敗，請確認 CW 編號與電話' }, 401)

    // 已派更且場次未過期（end_date >= 昨日，兼顧跨夜班）的場次
    // 同時帶出當日/近期打卡狀態（LEFT JOIN attendance_records）
    const { results } = await c.env.DB.prepare(`
      SELECT
        sg.roadshow_code,
        r.name,
        r.start_date,
        r.end_date,
        a.clock_in_at,
        a.clock_out_at
      FROM session_assignments sg
      JOIN roadshows r ON r.code = sg.roadshow_code
      LEFT JOIN attendance_records a
             ON a.roadshow_code = sg.roadshow_code
            AND a.cw_no         = sg.cw_no
      WHERE sg.cw_no = ?
        AND date(r.end_date) >= date('now', '-1 day')
      ORDER BY r.start_date ASC
    `).bind(cw_no).all()

    return c.json({ ok: true, name: cw.name_zh, shifts: results })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// CoWorkery 出糧（後台，受 /api/admin/* middleware 保護）
// ═══════════════════════════════════════════════════════════════════════════════

// ── 3B-3. 出糧計算（按場次結算，pay_due_date = 完場 +7 天）─────────────────
app.post('/api/admin/coworkery/payroll/calculate', async (c) => {
  try {
    const b = await c.req.json<{ roadshow_code: string }>()
    if (!b.roadshow_code) return c.json({ ok: false, error: '\u7f3a\u5c11 roadshow_code' }, 400)

    // 場次資訊（roadshows.code = roadshow_code）
    const sess = await c.env.DB.prepare(`
      SELECT g.session_hourly_rate, g.transport_allowance, g.meal_allowance, g.brand_ref, r.end_date
      FROM roadshows r
      LEFT JOIN roadshow_geo g ON g.roadshow_code = r.code
      WHERE r.code = ?
    `).bind(b.roadshow_code).first<{
      session_hourly_rate: number; transport_allowance: number
      meal_allowance: number; brand_ref: string | null; end_date: string | null
    }>()
    if (!sess) return c.json({ ok: false, error: '\u627e\u4e0d\u5230\u5834\u6b21' }, 404)

    // pay_due_date = end_date + 7 天（fallback: now + 7）
    const dueDateExpr = sess.end_date
      ? `date('${sess.end_date}','+7 days')`
      : `date('now','+7 days')`

    // 只計「已 clock-out」的派更人員 + 各自時薪
    const { results } = await c.env.DB.prepare(`
      SELECT a.cw_no, a.worked_minutes,
             sg.assigned_hourly_rate, cw.default_hourly_rate
      FROM attendance_records a
      JOIN session_assignments sg ON sg.roadshow_code = a.roadshow_code AND sg.cw_no = a.cw_no
      JOIN co_workery cw ON cw.cw_no = a.cw_no
      WHERE a.roadshow_code = ? AND a.clock_out_at IS NOT NULL
    `).bind(b.roadshow_code).all<{
      cw_no: string; worked_minutes: number
      assigned_hourly_rate: number; default_hourly_rate: number
    }>()

    let count = 0
    for (const r of results) {
      const rate      = resolveRate(r.assigned_hourly_rate, sess.session_hourly_rate, r.default_hourly_rate)
      const wage      = Math.round((r.worked_minutes / 60) * rate)   // 分
      const transport = sess.transport_allowance || 0                 // 分
      const meal      = sess.meal_allowance || 0                      // 分
      const total     = wage + transport + meal

      await c.env.DB.prepare(`
        INSERT INTO payroll_records
          (roadshow_code, cw_no, total_minutes, hourly_rate, wage_amount,
           transport_total, meal_total, total_payable, brand_ref, status, pay_due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ${dueDateExpr})
        ON CONFLICT(roadshow_code, cw_no) DO UPDATE SET
          total_minutes   = excluded.total_minutes,
          hourly_rate     = excluded.hourly_rate,
          wage_amount     = excluded.wage_amount,
          transport_total = excluded.transport_total,
          meal_total      = excluded.meal_total,
          total_payable   = excluded.total_payable,
          brand_ref       = excluded.brand_ref,
          pay_due_date    = excluded.pay_due_date,
          updated_at      = datetime('now')
      `).bind(
        b.roadshow_code, r.cw_no, r.worked_minutes, rate, wage,
        transport, meal, total, sess.brand_ref || null
      ).run()
      count++
    }

    return c.json({ ok: true, generated: count })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3B-4. 出糧單列表（支援 ?roadshow_code= ?status= ?export=csv）─────────
app.get('/api/admin/coworkery/payroll', async (c) => {
  try {
    const code     = c.req.query('roadshow_code') || ''
    const status   = c.req.query('status') || ''
    const isExport = c.req.query('export') === 'csv'

    let sql = `
      SELECT p.roadshow_code, p.cw_no,
             cw.name_zh, cw.bank_name, cw.bank_account_name, cw.bank_account_no,
             p.total_minutes, p.hourly_rate, p.wage_amount,
             p.transport_total, p.meal_total, p.total_payable,
             p.brand_ref, p.status, p.pay_due_date, p.paid_at
      FROM payroll_records p
      JOIN co_workery cw ON cw.cw_no = p.cw_no
      WHERE 1=1`
    const binds: unknown[] = []
    if (code)   { sql += ' AND p.roadshow_code = ?'; binds.push(code) }
    if (status) { sql += ' AND p.status = ?';        binds.push(status) }
    sql += ' ORDER BY p.roadshow_code DESC, p.cw_no ASC'

    const { results } = await c.env.DB.prepare(sql).bind(...binds).all<Record<string, unknown>>()

    if (isExport) {
      const headers = [
        '\u5834\u6b21', 'CW\u7de8\u865f', '\u59d3\u540d', '\u9280\u884c', '\u6236\u540d', '\u8cec\u865f',
        '\u5de5\u6642(\u5206)', '\u6642\u85aa(\u5143)', '\u5de5\u8cc7(\u5143)',
        '\u8eca\u99ac\u8cbb(\u5143)', '\u81b3\u98df(\u5143)', '\u7e3d\u61c9\u4ed8(\u5143)',
        '\u54c1\u724c', '\u72c0\u614b', '\u51fa\u7cae\u9650\u671f', '\u5df2\u4ed8\u6642\u9593'
      ]
      const lines = [headers.map(csvCell).join(',')]
      for (const r of results) {
        lines.push([
          csvCell(r.roadshow_code), csvCell(r.cw_no), csvCell(r.name_zh),
          csvCell(r.bank_name), csvCell(r.bank_account_name), csvCell(r.bank_account_no),
          csvCell(r.total_minutes),
          csvCell(centsToStr(r.hourly_rate as number)),
          csvCell(centsToStr(r.wage_amount as number)),
          csvCell(centsToStr(r.transport_total as number)),
          csvCell(centsToStr(r.meal_total as number)),
          csvCell(centsToStr(r.total_payable as number)),
          csvCell(r.brand_ref), csvCell(r.status),
          csvCell(r.pay_due_date), csvCell(r.paid_at),
        ].join(','))
      }
      const csv = '\uFEFF' + lines.join('\r\n')
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="coworkery_payroll.csv"',
        },
      })
    }

    const totals = results.reduce(
      (acc, r) => {
        acc.total_payable += (r.total_payable as number) || 0
        acc.total_minutes += (r.total_minutes as number) || 0
        return acc
      },
      { total_payable: 0, total_minutes: 0, count: results.length }
    )

    return c.json({ ok: true, list: results, totals })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3B-5. 出糧審批 / 標記已付 ───────────────────────────────────────────────
app.patch('/api/admin/coworkery/payroll', async (c) => {
  try {
    const b = await c.req.json<{
      roadshow_code: string
      cw_no: string
      action: 'APPROVE' | 'PAID' | 'REVERT'
    }>()
    if (!b.roadshow_code || !b.cw_no || !b.action) {
      return c.json({ ok: false, error: '\u7f3a\u5c11\u53c3\u6578' }, 400)
    }

    if (b.action === 'APPROVE') {
      await c.env.DB.prepare(`
        UPDATE payroll_records SET status='APPROVED', updated_at=datetime('now')
        WHERE roadshow_code=? AND cw_no=? AND status='PENDING'
      `).bind(b.roadshow_code, b.cw_no).run()

    } else if (b.action === 'PAID') {
      await c.env.DB.prepare(`
        UPDATE payroll_records
        SET status='PAID', paid_at=datetime('now'), paid_by='admin', updated_at=datetime('now')
        WHERE roadshow_code=? AND cw_no=? AND status='APPROVED'
      `).bind(b.roadshow_code, b.cw_no).run()

    } else if (b.action === 'REVERT') {
      await c.env.DB.prepare(`
        UPDATE payroll_records
        SET status='PENDING', paid_at=NULL, paid_by=NULL, updated_at=datetime('now')
        WHERE roadshow_code=? AND cw_no=?
      `).bind(b.roadshow_code, b.cw_no).run()
    }

    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3B-6. 後台手動補打卡 ────────────────────────────────────────────────────
// is_manual=1, 記錄 manual_by / manual_reason
app.post('/api/admin/coworkery/manual-clock', async (c) => {
  try {
    const b = await c.req.json<{
      roadshow_code: string; cw_no: string
      clock_in_at?: string; clock_out_at?: string
      reason?: string
    }>()
    if (!b.roadshow_code || !b.cw_no) {
      return c.json({ ok: false, error: '\u7f3a\u5c11 roadshow_code / cw_no' }, 400)
    }
    if (!b.clock_in_at && !b.clock_out_at) {
      return c.json({ ok: false, error: '\u81f3\u5c11\u8981\u63d0\u4f9b clock_in_at \u6216 clock_out_at' }, 400)
    }

    const reason = b.reason || '\u5f8c\u53f0\u88dc\u6253\u5361'

    // 計算 worked_minutes（若兩者都有）
    let worked: number | null = null
    if (b.clock_in_at && b.clock_out_at) {
      const diff = await c.env.DB
        .prepare(`SELECT CAST((julianday(?) - julianday(?)) * 24 * 60 AS INTEGER) AS mins`)
        .bind(b.clock_out_at, b.clock_in_at)
        .first<{ mins: number }>()
      worked = Math.max(0, diff?.mins || 0)
    }

    // UPSERT：若無記錄則新建，若有則只更新指定欄
    const exist = await c.env.DB
      .prepare('SELECT id FROM attendance_records WHERE roadshow_code=? AND cw_no=?')
      .bind(b.roadshow_code, b.cw_no).first()

    if (!exist) {
      await c.env.DB.prepare(`
        INSERT INTO attendance_records
          (roadshow_code, cw_no, clock_in_at, clock_out_at, worked_minutes,
           is_manual, manual_by, manual_reason)
        VALUES (?, ?, ?, ?, ?, 1, 'admin', ?)
      `).bind(
        b.roadshow_code, b.cw_no,
        b.clock_in_at || null, b.clock_out_at || null,
        worked ?? 0, reason
      ).run()
    } else {
      const sets: string[] = ["is_manual=1", "manual_by='admin'", "manual_reason=?", "updated_at=datetime('now')"]
      const binds: unknown[] = [reason]
      if (b.clock_in_at)  { sets.unshift('clock_in_at=?');  binds.unshift(b.clock_in_at) }
      if (b.clock_out_at) { sets.unshift('clock_out_at=?'); binds.unshift(b.clock_out_at) }
      if (worked !== null){ sets.push('worked_minutes=?');   binds.push(worked) }
      binds.push(b.roadshow_code, b.cw_no)
      await c.env.DB.prepare(
        `UPDATE attendance_records SET ${sets.join(',')} WHERE roadshow_code=? AND cw_no=?`
      ).bind(...binds).run()
    }

    return c.json({ ok: true, worked_minutes: worked })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ── 3B-7. R2 檔案代理（後台限定，含本地 fallback 說明）─────────────────────
app.get('/api/admin/coworkery/files/*', async (c) => {
  try {
    if (!c.env.FILES) {
      return c.json({ ok: false, error: 'R2 \u672a\u7dae\u5b9a\uff08\u672c\u5730\u74b0\u5883\uff09\uff0c\u7121\u6cd5\u8b80\u53d6\u6a94\u6848' }, 503)
    }
    const key = c.req.path.replace('/api/admin/coworkery/files/', '')
    if (!key) return c.json({ ok: false, error: '\u7f3a\u5c11\u6a94\u6848 key' }, 400)

    const obj = await c.env.FILES.get(key)
    if (!obj) return c.json({ ok: false, error: '\u6a94\u6848\u4e0d\u5b58\u5728' }, 404)

    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// ─── /admin — New unified admin shell with login protection ─────────────────
app.get('/admin', (c) => {
  const res = c.html(newAdminShellHtml())
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res
})

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
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage1] dashboardHtml — pure mechanical move

// [MOVED to src/lib/html-templates.ts @ Wave3/Stage1] comingSoonHtml — pure mechanical move

// [MOVED to src/lib/html-shared.ts @ Wave3/Stage0] htmlHead — pure mechanical move

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
        如有疑問 WhatsApp：<a href="https://wa.me/85254429749?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E6%9F%A5%E8%A9%A2%E6%9C%89%E9%97%9C%E8%80%81%E6%9C%89%E5%8D%A1%E7%9A%84%E8%B3%87%E8%A8%8A%E3%80%82" target="_blank" style="color:#25D366;font-weight:700;">📱 WhatsApp 5442-9749</a>
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
    var waNum = (s.settings && s.settings.admin_whatsapp) ? s.settings.admin_whatsapp : '85254429749';
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
        <div class="field" id="parentLinkedField" style="display:none;">
          <div class="label-row"><label>已連結主卡</label></div>
          <div id="parentLinkedInfo" style="padding:12px 14px;background:#f0f7f0;border:2px solid #4caf50;border-radius:4px;font-size:18px;font-weight:700;color:#2e7d32;">✅ 已連結</div>
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

    <!-- ══ Master Card Linking Section ══ -->
    <!-- Only shown when family card was registered without a pre-linked parent -->
    <div id="masterCardSection" style="display:none;margin:0 0 16px;border:2px solid #b71c1c;border-radius:10px;overflow:hidden;">
      <div style="background:#b71c1c;color:#fff;padding:12px 16px;font-size:19px;font-weight:700;text-align:center;">
        🔗 連結長輩主卡
      </div>
      <div style="padding:14px 16px;background:#fff8f8;">
        <p style="font-size:16px;color:#555;margin:0 0 14px;line-height:1.6;">家庭同行卡需連結長輩主卡方可完整使用。請選擇以下方式：</p>

        <!-- Tab buttons -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
          <button id="tabLinkBtn" onclick="showMasterTab('link')"
            style="padding:12px 6px;background:#b71c1c;color:#fff;border:2px solid #b71c1c;border-radius:6px;font-size:16px;font-weight:700;cursor:pointer;">
            📱 連結已有主卡
          </button>
          <button id="tabAddBtn" onclick="showMasterTab('add')"
            style="padding:12px 6px;background:#fff;color:#b71c1c;border:2px solid #b71c1c;border-radius:6px;font-size:16px;font-weight:700;cursor:pointer;">
            ➕ 為長輩申請主卡
          </button>
        </div>

        <!-- Tab A: Link existing primary card by phone -->
        <div id="tabLinkPanel" style="display:block;">
          <p style="font-size:15px;color:#444;margin:0 0 8px;">輸入長輩的香港電話號碼，系統會自動找到其主卡並連結。</p>
          <input id="linkParentPhone" type="tel" inputmode="numeric" maxlength="8" placeholder="長輩電話（8位）"
            style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:18px;border:1.5px solid #ccc;border-radius:6px;margin-bottom:10px;"/>
          <div id="linkParentErr" style="display:none;color:#c62828;font-size:15px;font-weight:600;margin-bottom:8px;"></div>
          <div id="linkParentSuccess" style="display:none;background:#e8f5e9;border:1.5px solid #4caf50;border-radius:6px;padding:10px 12px;font-size:16px;color:#2E7D32;font-weight:700;margin-bottom:10px;"></div>
          <button onclick="doLinkParent()"
            style="width:100%;padding:14px;background:#b71c1c;color:#fff;border:0;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer;min-height:52px;">
            🔗 確認連結主卡
          </button>
        </div>

        <!-- Tab B: Register new primary card for elder -->
        <div id="tabAddPanel" style="display:none;">
          <p style="font-size:15px;color:#444;margin:0 0 10px;">為長輩登記新主卡（需年滿55歲），完成後自動連結到此家庭卡。</p>
          <input id="addParentName" type="text" placeholder="長輩中文姓名"
            style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:18px;border:1.5px solid #ccc;border-radius:6px;margin-bottom:10px;"/>
          <input id="addParentPhone" type="tel" inputmode="numeric" maxlength="8" placeholder="長輩電話（8位）"
            style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:18px;border:1.5px solid #ccc;border-radius:6px;margin-bottom:10px;"/>
          <select id="addParentYear"
            style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:18px;border:1.5px solid #ccc;border-radius:6px;margin-bottom:10px;background:#fff;">
            <option value="">長輩出生年份</option>
          </select>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
            <button id="addGenderM" onclick="setAddGender('M',this)"
              style="padding:13px;background:#fff;border:2px solid #ccc;border-radius:6px;font-size:17px;font-weight:700;cursor:pointer;">男 M</button>
            <button id="addGenderF" onclick="setAddGender('F',this)"
              style="padding:13px;background:#fff;border:2px solid #ccc;border-radius:6px;font-size:17px;font-weight:700;cursor:pointer;">女 F</button>
          </div>
          <div id="addParentErr" style="display:none;color:#c62828;font-size:15px;font-weight:600;margin-bottom:8px;"></div>
          <div id="addParentSuccess" style="display:none;background:#e8f5e9;border:1.5px solid #4caf50;border-radius:6px;padding:10px 12px;font-size:16px;color:#2E7D32;font-weight:700;margin-bottom:10px;"></div>
          <button onclick="doAddParent()"
            style="width:100%;padding:14px;background:#b71c1c;color:#fff;border:0;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer;min-height:52px;">
            ➕ 為長輩申請主卡並連結
          </button>
        </div>
      </div>
    </div>
    <!-- ══ End Master Card Linking Section ══ -->

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
      document.getElementById('parentLinkedField').style.display = 'block';
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
  if(!nameZh){showErr('請填寫姓名／稱呼');return;}
  if(!birthYear){showErr('請選擇出生年份');return;}
  if(!_familyGender){showErr('請選擇性別');return;}
  var phoneErr=validateHKPhone(phone);
  if(phoneErr){showErr(phoneErr);return;}
  // parentPhone is now optional — linking happens after registration via masterCardSection
  if(!document.getElementById('consent').checked){showErr('請同意私隱政策');return;}
  var btn=document.getElementById('submitBtn');
  btn.disabled=true;btn.textContent='處理中…';
  var params=new URLSearchParams(location.search);
  var payload={tier:'FAMILY',nameZh,phone,birthYear:birthYear,gender:_familyGender,relation:document.getElementById('relation').value,roadshow:params.get('rs')||'walk-in',source:params.get('src')||(params.get('rs')?'roadshow':params.get('ref')?'referral':'walk-in'),referrerNo:params.get('ref')||'',roadshowLocation:params.get('loc')||''};
  if(linkedParentNo){payload.parentNo=linkedParentNo;}
  try{
    var res=await fetch('/api/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var data=await res.json();
    if(!data.ok){showErr(data.error||'申請失敗，請再試一次');btn.disabled=false;btn.textContent='申請家庭同行卡';return;}
    // ── Registration success: redirect to card page which has full WA verify + master-card linking UI ──
    document.getElementById('formSection').style.display='none';
    var ss=document.getElementById('successSection');
    ss.innerHTML='<div style="padding:40px 20px;text-align:center;">'
      +'<div style="font-size:60px;margin-bottom:16px;">\u2705</div>'
      +'<div style="font-size:26px;font-weight:900;color:#8B0000;margin-bottom:10px;">\u7533\u8acb\u6210\u529f\uff01</div>'
      +'<div style="font-size:20px;color:#444;margin-bottom:8px;">\u6703\u54e1\u7de8\u865f\uff1a<strong style="color:#C62828;">'+data.memberNo+'</strong></div>'
      +'<div style="font-size:18px;color:#666;margin-bottom:24px;">\u6b63\u5728\u8df3\u8f49\u5230\u4f60\u7684\u6703\u54e1\u5361\u9801\u9762\u2026</div>'
      +'<div style="font-size:15px;color:#999;">\uff08\u5982\u672a\u81ea\u52d5\u8df3\u8f49\uff0c\u8acb<a href="/membership/card/'+data.memberNo+'" style="color:#C62828;font-weight:700;">\u9ede\u6b64\u9032\u5165</a>\uff09</div>'
      +'</div>';
    ss.classList.add('show');
    window.scrollTo(0,0);
    // Redirect to card page after 2s
    setTimeout(function(){
      window.location.href='/membership/card/'+data.memberNo;
    },2000);
  }catch(e){showErr('網絡錯誤，請再試一次');btn.disabled=false;btn.textContent='申請家庭同行卡';}
}

// ══ Master Card Linking JS ══
var _addParentGender='';

function showMasterTab(tab){
  var linkPanel=document.getElementById('tabLinkPanel');
  var addPanel=document.getElementById('tabAddPanel');
  var linkBtn=document.getElementById('tabLinkBtn');
  var addBtn=document.getElementById('tabAddBtn');
  if(tab==='link'){
    linkPanel.style.display='block'; addPanel.style.display='none';
    linkBtn.style.background='#b71c1c'; linkBtn.style.color='#fff';
    addBtn.style.background='#fff'; addBtn.style.color='#b71c1c';
  } else {
    linkPanel.style.display='none'; addPanel.style.display='block';
    addBtn.style.background='#b71c1c'; addBtn.style.color='#fff';
    linkBtn.style.background='#fff'; linkBtn.style.color='#b71c1c';
  }
}

function initAddParentYearDropdown(){
  var sel=document.getElementById('addParentYear');
  if(!sel||sel.options.length>1)return;
  var curYear=new Date().getFullYear();
  // Primary card must be 55+ so max birth year = curYear - 55
  for(var y=curYear-55;y>=1930;y--){
    var opt=document.createElement('option');
    opt.value=y; opt.textContent=y+'年';
    sel.appendChild(opt);
  }
}

function setAddGender(v,btn){
  _addParentGender=v;
  document.getElementById('addGenderM').style.background='#fff';
  document.getElementById('addGenderM').style.borderColor='#ccc';
  document.getElementById('addGenderM').style.color='#333';
  document.getElementById('addGenderF').style.background='#fff';
  document.getElementById('addGenderF').style.borderColor='#ccc';
  document.getElementById('addGenderF').style.color='#333';
  btn.style.background='#b71c1c'; btn.style.borderColor='#b71c1c'; btn.style.color='#fff';
}

async function doLinkParent(){
  var no=window._verifyMemberNo;
  if(!no)return;
  var phone=document.getElementById('linkParentPhone').value.replace(/[^0-9]/g,'');
  var errEl=document.getElementById('linkParentErr');
  var sucEl=document.getElementById('linkParentSuccess');
  errEl.style.display='none'; sucEl.style.display='none';
  if(phone.length!==8){errEl.textContent='請輸入正確的8位電話號碼';errEl.style.display='block';return;}
  try{
    var res=await fetch('/api/members/'+encodeURIComponent(no)+'/link-parent',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({parentPhone:phone})
    });
    var d=await res.json();
    if(!d.ok){errEl.textContent=d.error||'連結失敗，請確認電話號碼';errEl.style.display='block';return;}
    sucEl.textContent='✅ 成功連結主卡：'+d.parent_no+(d.parent_name?' （'+d.parent_name+'）':'');
    sucEl.style.display='block';
    // Hide the section after 3s
    setTimeout(function(){
      var mcs=document.getElementById('masterCardSection');
      if(mcs)mcs.style.display='none';
    },3000);
  }catch(e){errEl.textContent='網絡錯誤，請再試一次';errEl.style.display='block';}
}

async function doAddParent(){
  var no=window._verifyMemberNo;
  if(!no)return;
  var nameZh=document.getElementById('addParentName').value.trim();
  var phone=document.getElementById('addParentPhone').value.replace(/[^0-9]/g,'');
  var birthYear=document.getElementById('addParentYear').value;
  var errEl=document.getElementById('addParentErr');
  var sucEl=document.getElementById('addParentSuccess');
  errEl.style.display='none'; sucEl.style.display='none';
  if(!nameZh){errEl.textContent='請填寫長輩中文姓名';errEl.style.display='block';return;}
  if(phone.length!==8){errEl.textContent='請輸入正確的8位電話號碼';errEl.style.display='block';return;}
  if(!birthYear){errEl.textContent='請選擇長輩出生年份';errEl.style.display='block';return;}
  if(!_addParentGender){errEl.textContent='請選擇長輩性別';errEl.style.display='block';return;}
  try{
    var res=await fetch('/api/members/'+encodeURIComponent(no)+'/add-parent',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nameZh:nameZh,phone:phone,birthYear:birthYear,gender:_addParentGender})
    });
    var d=await res.json();
    if(!d.ok){errEl.textContent=d.error||'申請失敗，請再試一次';errEl.style.display='block';return;}
    sucEl.textContent='✅ 長輩主卡已申請：'+d.parent_no+'，已自動連結到此家庭卡！';
    sucEl.style.display='block';
    // Hide the section after 3s
    setTimeout(function(){
      var mcs=document.getElementById('masterCardSection');
      if(mcs)mcs.style.display='none';
    },3000);
  }catch(e){errEl.textContent='網絡錯誤，請再試一次';errEl.style.display='block';}
}
// ══ End Master Card Linking JS ══

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
        // Show master card linking section if no parent linked
        if(!data.parentNo){
          var mcs=document.getElementById('masterCardSection');
          if(mcs){mcs.style.display='block';}
          initAddParentYearDropdown();
        }
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
    <div class="nav-tab" onclick="switchTab('contents',this)">📢 內容管理</div>
    <div class="nav-tab" id="navFeedback" onclick="switchTab('feedback',this)">💬 心聲意見</div>
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
            <input id="settingWaNum" type="tel" maxlength="15" placeholder="例：85254429749"
              style="flex:1;border:1px solid #ddd;border-radius:5px;padding:10px 12px;font-size:14px;font-family:monospace;letter-spacing:1px;"
              oninput="settingsDirty()">
            <button onclick="saveWaNum()" id="saveWaBtn"
              style="background:#25D366;color:#fff;border:0;border-radius:5px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">
              儲存
            </button>
          </div>
          <div style="font-size:11px;color:#888;margin-top:6px;line-height:1.6;">
            包含國家碼，例如香港號碼 54429749 填入 <strong>85254429749</strong><br>
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

  <!-- ── 內容管理 PAGE ── -->
  <div class="page" id="page-contents">
    <div style="max-width:700px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <h2 style="font-size:16px;font-weight:700;color:#222;margin:0;">📢 內容管理（購物 / 消息）</h2>
        <div style="display:flex;gap:8px;">
          <select id="cFilterSection" onchange="loadContents()" style="border:1px solid #ddd;border-radius:5px;padding:6px 10px;font-size:13px;background:#fff;">
            <option value="">全部</option>
            <option value="shopping">購物</option>
            <option value="news">消息</option>
          </select>
          <button class="btn btn-green" onclick="openAddContent()" style="font-size:13px;padding:7px 14px;">＋ 新增</button>
        </div>
      </div>
      <div id="contentsList" style="display:flex;flex-direction:column;gap:12px;">
        <div style="text-align:center;padding:40px;color:#aaa;font-size:13px;">載入中…</div>
      </div>
    </div>

    <!-- 新增/編輯 表單 (inline, 預設隱藏) -->
    <div id="contentFormWrap" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:2000;display:none;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:12px;padding:24px;width:90%;max-width:520px;max-height:90vh;overflow-y:auto;">
        <h3 id="cFormHeading" style="margin:0 0 18px;font-size:15px;font-weight:700;">＋ 新增內容</h3>
        <input type="hidden" id="cFormId">
        <input type="hidden" id="cFormImageUrl">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">類別 *</label>
            <select id="cFormSection" style="width:100%;border:1px solid #ddd;border-radius:5px;padding:9px 10px;font-size:13px;">
              <option value="shopping">購物</option>
              <option value="news">消息</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">標題 *</label>
            <input id="cFormTitleInput" type="text" maxlength="100" style="width:100%;border:1px solid #ddd;border-radius:5px;padding:9px 10px;font-size:13px;" placeholder="例：限時特惠套餐">
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">內容 *</label>
            <textarea id="cFormBody" rows="5" style="width:100%;border:1px solid #ddd;border-radius:5px;padding:9px 10px;font-size:13px;resize:vertical;" placeholder="可多行，Roadshow 詳情、套餐說明等"></textarea>
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">地址（選填，購物 Roadshow 用）</label>
            <input id="cFormAddress" type="text" maxlength="200" style="width:100%;border:1px solid #ddd;border-radius:5px;padding:9px 10px;font-size:13px;" placeholder="例：九龍灣德福廣場 L1 大堂">
          </div>
          <!-- ── 圖片上傳 (Cloudinary) ── -->
          <div>
            <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">圖片（選填）</label>
            <div id="cImgDropZone"
              ondragover="event.preventDefault();this.style.borderColor='#228B22';this.style.background='#f0fff0';"
              ondragleave="this.style.borderColor='#ccc';this.style.background='#fafafa';"
              ondrop="cImgHandleDrop(event)"
              onclick="document.getElementById('cImgFileInput').click()"
              style="border:2px dashed #ccc;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#fafafa;transition:all 0.2s;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
              <div id="cImgPreviewWrap" style="display:none;">
                <img id="cImgPreview" src="" alt="preview" style="max-width:100%;max-height:160px;border-radius:6px;display:block;margin:0 auto 8px;">
                <div style="display:flex;gap:6px;justify-content:center;">
                  <span id="cImgPreviewName" style="font-size:11px;color:#555;"></span>
                  <button type="button" onclick="event.stopPropagation();cImgClear()" style="font-size:11px;color:#e53935;background:none;border:none;cursor:pointer;padding:0;">✕ 移除</button>
                </div>
              </div>
              <div id="cImgPlaceholder">
                <div style="font-size:28px;margin-bottom:4px;">🖼️</div>
                <div style="font-size:13px;color:#888;">拖放圖片至此，或點擊選擇</div>
                <div style="font-size:11px;color:#bbb;margin-top:2px;">JPG / PNG / WEBP，建議寬度 800px 以上</div>
              </div>
              <div id="cImgUploadProgress" style="display:none;font-size:12px;color:#228B22;">
                <i class="fas fa-spinner fa-spin"></i> 上傳中…
              </div>
            </div>
            <input id="cImgFileInput" type="file" accept="image/*" style="display:none;" onchange="cImgHandleFile(this.files[0])">
          </div>
          <div style="display:flex;gap:10px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">排序（數字越小越前）</label>
              <input id="cFormSort" type="number" value="0" min="0" style="width:100%;border:1px solid #ddd;border-radius:5px;padding:9px 10px;font-size:13px;">
            </div>
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">狀態</label>
              <select id="cFormStatus" style="width:100%;border:1px solid #ddd;border-radius:5px;padding:9px 10px;font-size:13px;">
                <option value="OPEN">顯示 OPEN</option>
                <option value="HIDDEN">隱藏 HIDDEN</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">
            <button onclick="closeContentForm()" style="padding:9px 18px;background:#f5f5f5;border:1px solid #ddd;border-radius:5px;font-size:13px;cursor:pointer;">取消</button>
            <button onclick="saveContent()" id="cFormSaveBtn" style="padding:9px 18px;background:#228B22;color:#fff;border:0;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer;">儲存</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── 心聲意見 PAGE ── -->
  <div class="page" id="page-feedback">
    <div style="max-width:700px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <h2 style="font-size:16px;font-weight:700;color:#222;margin:0;">💬 心聲意見（會員一對一）</h2>
        <button class="btn btn-green" onclick="loadAdminFeedback()" style="font-size:13px;padding:7px 14px;">🔄 重新整理</button>
      </div>

      <!-- Thread list -->
      <div id="adminFeedbackList" style="display:flex;flex-direction:column;gap:10px;"></div>

      <!-- Thread detail (hidden by default) -->
      <div id="adminFeedbackDetail" style="display:none;">
        <button onclick="closeAdminFeedbackDetail()" style="margin-bottom:12px;background:none;border:none;font-size:14px;color:#1565C0;cursor:pointer;">← 返回列表</button>
        <div id="adminFeedbackInfo" style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin-bottom:14px;font-size:13px;"></div>
        <div id="adminFeedbackMsgs" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;"></div>
        <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px;">
          <textarea id="adminReplyText" rows="3" style="width:100%;border:1.5px solid #ddd;border-radius:5px;padding:9px 10px;font-size:13px;resize:vertical;" placeholder="輸入回覆內容…"></textarea>
          <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
            <button onclick="adminCloseFeedback()" style="padding:9px 14px;background:#fff;border:1.5px solid #888;border-radius:5px;font-size:13px;cursor:pointer;">🔒 標記已關閉</button>
            <button onclick="adminReplyFeedback()" style="padding:9px 18px;background:#228B22;color:#fff;border:0;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer;">📤 發送回覆</button>
          </div>
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
<script>
// ── 內容管理 (Contents) ──────────────────────────────────────────────────────
var _contentsData = [];

function loadContents() {
  var section = document.getElementById('cFilterSection') ? document.getElementById('cFilterSection').value : '';
  var url = '/api/admin/contents' + (section ? '?section=' + section : '');
  document.getElementById('contentsList').innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-size:13px;">載入中…</div>';
  fetch(url, { credentials: 'include' }).then(function(r){ return r.json(); }).then(function(d) {
    _contentsData = d.items || [];
    if (!_contentsData.length) {
      document.getElementById('contentsList').innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-size:13px;">暫無內容</div>';
      return;
    }
    document.getElementById('contentsList').innerHTML = _contentsData.map(function(item, i) {
      var sectionLabel = item.section === 'shopping' ? '🛒 購物' : '📢 消息';
      var statusBadge = item.status === 'OPEN'
        ? '<span style="background:#e8f5e9;color:#2E7D32;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700;">顯示</span>'
        : '<span style="background:#fafafa;color:#999;border:1px solid #ddd;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700;">隱藏</span>';
      return '<div style="background:#fff;border-radius:8px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.07);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:11px;color:#666;">'+sectionLabel+'</span>' +
            statusBadge +
            '<span style="font-size:11px;color:#999;">排序:'+item.sort_order+'</span>' +
          '</div>' +
          '<div style="display:flex;gap:6px;">' +
            '<button onclick="openEditContent('+i+')" style="padding:5px 12px;background:#1565C0;color:#fff;border:0;border-radius:4px;font-size:12px;cursor:pointer;">✏️ 編輯</button>' +
            '<button onclick="toggleContentStatus('+i+')" style="padding:5px 10px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;font-size:12px;cursor:pointer;">'+(item.status==='OPEN'?'隱藏':'顯示')+'</button>' +
            '<button onclick="deleteContent('+i+')" style="padding:5px 10px;background:#fff;border:1px solid #e53935;color:#e53935;border-radius:4px;font-size:12px;cursor:pointer;">刪除</button>' +
          '</div>' +
        '</div>' +
        (item.image_url ? '<img src="'+escHtml(item.image_url)+'" alt="" style="width:100%;max-height:140px;object-fit:cover;border-radius:6px;margin-bottom:8px;">' : '') +
        '<div style="font-size:14px;font-weight:700;color:#222;margin-bottom:4px;">'+escHtml(item.title)+'</div>' +
        (item.address ? '<div style="font-size:12px;color:#555;margin-bottom:4px;">📍 '+escHtml(item.address)+'</div>' : '') +
        '<div style="font-size:12px;color:#444;white-space:pre-wrap;line-height:1.6;">'+escHtml(item.body)+'</div>' +
      '</div>';
    }).join('');
  }).catch(function(){ document.getElementById('contentsList').innerHTML = '<div style="text-align:center;padding:40px;color:#e53935;font-size:13px;">載入失敗</div>'; });
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Content form image helpers ────────────────────────────────────────────────
function cImgClear() {
  document.getElementById('cFormImageUrl').value = '';
  document.getElementById('cImgPreviewWrap').style.display = 'none';
  document.getElementById('cImgPlaceholder').style.display = '';
  document.getElementById('cImgFileInput').value = '';
  var dz = document.getElementById('cImgDropZone');
  dz.style.borderColor = '#ccc';
  dz.style.background = '#fafafa';
}

function cImgSetPreview(url, name) {
  document.getElementById('cFormImageUrl').value = url;
  document.getElementById('cImgPreview').src = url;
  document.getElementById('cImgPreviewName').textContent = name || '';
  document.getElementById('cImgPreviewWrap').style.display = '';
  document.getElementById('cImgPlaceholder').style.display = 'none';
  var dz = document.getElementById('cImgDropZone');
  dz.style.borderColor = '#228B22';
  dz.style.background = '#f0fff0';
}

function cImgHandleDrop(e) {
  e.preventDefault();
  var dz = document.getElementById('cImgDropZone');
  dz.style.borderColor = '#ccc'; dz.style.background = '#fafafa';
  var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) cImgHandleFile(file);
}

function cImgHandleFile(file) {
  if (!file || !file.type.startsWith('image/')) { alert('請選擇圖片檔案'); return; }
  var progress = document.getElementById('cImgUploadProgress');
  var placeholder = document.getElementById('cImgPlaceholder');
  var previewWrap = document.getElementById('cImgPreviewWrap');
  progress.style.display = '';
  placeholder.style.display = 'none';
  previewWrap.style.display = 'none';
  fetch('/api/admin/cloudinary-sign', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    credentials: 'include',
    body: JSON.stringify({ folder: 'app_contents' })
  }).then(function(r){ return r.json(); }).then(function(sig){
    if (!sig.ok) { progress.style.display='none'; placeholder.style.display=''; alert('無法取得上傳簽名：'+(sig.error||'未知錯誤')); return; }
    var fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', sig.api_key);
    fd.append('timestamp', sig.timestamp);
    fd.append('signature', sig.signature);
    fd.append('folder', sig.folder);
    return fetch('https://api.cloudinary.com/v1_1/'+sig.cloud_name+'/image/upload', {
      method: 'POST', body: fd
    }).then(function(r2){ return r2.json(); }).then(function(res){
      progress.style.display = 'none';
      if (res.secure_url) {
        cImgSetPreview(res.secure_url, file.name);
      } else {
        placeholder.style.display = '';
        alert('上傳失敗：'+(res.error&&res.error.message||'未知錯誤'));
      }
    });
  }).catch(function(e){
    progress.style.display='none'; placeholder.style.display='';
    alert('上傳錯誤：'+String(e));
  });
}

function openAddContent() {
  document.getElementById('cFormId').value = '';
  var heading = document.getElementById('cFormHeading'); if (heading) heading.textContent = '＋ 新增內容';
  document.getElementById('cFormTitleInput').value = '';
  document.getElementById('cFormBody').value = '';
  document.getElementById('cFormAddress').value = '';
  document.getElementById('cFormSort').value = '0';
  document.getElementById('cFormStatus').value = 'OPEN';
  cImgClear();
  var wrap = document.getElementById('contentFormWrap');
  wrap.style.display = 'flex';
}

function openEditContent(i) {
  var item = _contentsData[i];
  if (!item) return;
  document.getElementById('cFormId').value = item.id;
  document.getElementById('cFormSection').value = item.section;
  var heading = document.getElementById('cFormHeading'); if (heading) heading.textContent = '✏️ 編輯內容';
  document.getElementById('cFormTitleInput').value = item.title;
  document.getElementById('cFormBody').value = item.body;
  document.getElementById('cFormAddress').value = item.address || '';
  document.getElementById('cFormSort').value = item.sort_order;
  document.getElementById('cFormStatus').value = item.status;
  // Restore image if already set
  if (item.image_url) {
    cImgSetPreview(item.image_url, '');
  } else {
    cImgClear();
  }
  document.getElementById('contentFormWrap').style.display = 'flex';
}

function closeContentForm() {
  document.getElementById('contentFormWrap').style.display = 'none';
  cImgClear();
}

function saveContent() {
  var id = document.getElementById('cFormId').value;
  var imageUrl = document.getElementById('cFormImageUrl').value.trim() || null;
  var payload = {
    section: document.getElementById('cFormSection').value,
    title: document.getElementById('cFormTitleInput').value.trim(),
    body: document.getElementById('cFormBody').value,
    address: document.getElementById('cFormAddress').value.trim() || null,
    sort_order: parseInt(document.getElementById('cFormSort').value) || 0,
    status: document.getElementById('cFormStatus').value,
    image_url: imageUrl
  };
  if (!payload.title) { alert('請填寫標題'); return; }
  var btn = document.getElementById('cFormSaveBtn');
  btn.disabled = true; btn.textContent = '儲存中…';
  var url = id ? '/api/admin/contents/'+id : '/api/admin/contents';
  var method = id ? 'PUT' : 'POST';
  fetch(url, { method: method, headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(payload) })
    .then(function(r){ return r.json(); })
    .then(function(d) {
      btn.disabled = false; btn.textContent = '儲存';
      if (d.ok) { closeContentForm(); loadContents(); }
      else { alert('儲存失敗：'+(d.error||'未知錯誤')); }
    }).catch(function(e){ btn.disabled=false; btn.textContent='儲存'; alert('網絡錯誤: '+String(e)); });
}

function toggleContentStatus(i) {
  var item = _contentsData[i];
  if (!item) return;
  var newStatus = item.status === 'OPEN' ? 'HIDDEN' : 'OPEN';
  fetch('/api/admin/contents/'+item.id, { method:'PUT', headers:{'Content-Type':'application/json'}, credentials: 'include', body:JSON.stringify({status:newStatus}) })
    .then(function(r){ return r.json(); }).then(function(d){ if(d.ok) loadContents(); });
}

function deleteContent(i) {
  var item = _contentsData[i];
  if (!item) return;
  if (!confirm('確認刪除「'+item.title+'」？')) return;
  fetch('/api/admin/contents/'+item.id, { method:'DELETE', credentials: 'include' })
    .then(function(r){ return r.json(); }).then(function(d){ if(d.ok) loadContents(); });
}

// ── 心聲管理 (Admin Feedback) ─────────────────────────────────────────────────
var _adminFeedbackThreads = [];
var _adminCurrentThreadId = null;

function loadAdminFeedback() {
  document.getElementById('adminFeedbackList').innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;font-size:13px;">載入中…</div>';
  document.getElementById('adminFeedbackDetail').style.display = 'none';
  document.getElementById('adminFeedbackList').style.display = 'flex';
  document.getElementById('adminFeedbackList').style.flexDirection = 'column';
  fetch('/api/admin/feedback', { credentials: 'include' }).then(function(r){ return r.json(); }).then(function(d) {
    _adminFeedbackThreads = d.threads || [];
    if (!_adminFeedbackThreads.length) {
      document.getElementById('adminFeedbackList').innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;font-size:13px;">暫無意見</div>';
      var nav = document.getElementById('navFeedback');
      if (nav) nav.textContent = '💬 心聲意見';
      return;
    }
    var unread = _adminFeedbackThreads.filter(function(t){ return t.status === 'new'; }).length;
    var nav = document.getElementById('navFeedback');
    if (nav) nav.textContent = unread > 0 ? '💬 心聲意見 (' + unread + ')' : '💬 心聲意見';
    document.getElementById('adminFeedbackList').innerHTML = _adminFeedbackThreads.map(function(t, i) {
      var statusColor = t.status === 'new' ? '#e53935' : t.status === 'replied' ? '#1565C0' : '#888';
      var statusLabel = t.status === 'new' ? '🆕 新' : t.status === 'replied' ? '✅ 已回覆' : '🔒 已關閉';
      var dt = t.updated_at ? t.updated_at.slice(0,16).replace('T',' ') : '';
      return '<div onclick="openAdminFeedbackThread(' + i + ')" style="background:#fff;border-radius:8px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.07);cursor:pointer;border-left:4px solid ' + statusColor + ';">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">' +
          '<div style="font-size:14px;font-weight:700;color:#222;">' + escHtml(t.subject) + '</div>' +
          '<span style="font-size:11px;font-weight:700;color:' + statusColor + ';">' + statusLabel + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:#666;margin-top:4px;">' + escHtml(t.member_no) + ' ' + escHtml(t.member_name) + '</div>' +
        '<div style="font-size:11px;color:#aaa;margin-top:4px;">' + dt + '</div>' +
      '</div>';
    }).join('');
  }).catch(function(){ document.getElementById('adminFeedbackList').innerHTML = '<div style="color:#e53935;padding:20px;font-size:13px;">載入失敗</div>'; });
}

function openAdminFeedbackThread(i) {
  var t = _adminFeedbackThreads[i];
  if (!t) return;
  _adminCurrentThreadId = t.id;
  document.getElementById('adminFeedbackList').style.display = 'none';
  document.getElementById('adminFeedbackDetail').style.display = 'block';
  document.getElementById('adminFeedbackInfo').innerHTML =
    '<strong>主題：</strong>' + escHtml(t.subject) + '<br>' +
    '<strong>會員：</strong>' + escHtml(t.member_no) + ' ' + escHtml(t.member_name) + '<br>' +
    '<strong>狀態：</strong>' + t.status;
  document.getElementById('adminFeedbackMsgs').innerHTML = '<div style="color:#aaa;font-size:13px;">載入中…</div>';
  fetch('/api/admin/feedback/' + t.id, { credentials: 'include' }).then(function(r){ return r.json(); }).then(function(d) {
    if (!d.ok) { document.getElementById('adminFeedbackMsgs').innerHTML = '<div style="color:#e53935;">載入失敗</div>'; return; }
    document.getElementById('adminFeedbackMsgs').innerHTML = (d.messages || []).map(function(msg) {
      var isAdmin = msg.sender === 'admin';
      var dt = msg.created_at ? msg.created_at.slice(0,16).replace('T',' ') : '';
      return '<div style="display:flex;flex-direction:column;align-items:' + (isAdmin ? 'flex-end' : 'flex-start') + ';gap:2px;">' +
        '<div style="max-width:85%;background:' + (isAdmin ? '#e3f2fd' : '#f5f5f5') + ';border-radius:10px;padding:10px 14px;">' +
          '<div style="font-size:11px;font-weight:700;color:' + (isAdmin ? '#1565C0' : '#555') + ';margin-bottom:4px;">' + (isAdmin ? '🔧 管理員' : '👤 會員') + ' ' + dt + '</div>' +
          '<div style="font-size:13px;color:#222;white-space:pre-wrap;">' + escHtml(msg.content) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  });
}

function closeAdminFeedbackDetail() {
  document.getElementById('adminFeedbackDetail').style.display = 'none';
  document.getElementById('adminFeedbackList').style.display = 'flex';
  document.getElementById('adminFeedbackList').style.flexDirection = 'column';
  document.getElementById('adminReplyText').value = '';
  _adminCurrentThreadId = null;
  loadAdminFeedback();
}

function adminReplyFeedback() {
  if (!_adminCurrentThreadId) return;
  var content = document.getElementById('adminReplyText').value.trim();
  if (!content) { alert('請輸入回覆內容'); return; }
  fetch('/api/admin/feedback/' + _adminCurrentThreadId + '/reply', {
    method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({content: content})
  }).then(function(r){ return r.json(); }).then(function(d) {
    if (d.ok) {
      document.getElementById('adminReplyText').value = '';
      var idx = _adminFeedbackThreads.findIndex(function(t){ return t.id === _adminCurrentThreadId; });
      openAdminFeedbackThread(idx);
    } else { alert('回覆失敗：' + (d.error || '')); }
  });
}

function adminCloseFeedback() {
  if (!_adminCurrentThreadId) return;
  if (!confirm('確認將此對話標記為已關閉？')) return;
  fetch('/api/admin/feedback/' + _adminCurrentThreadId + '/status', {
    method: 'PATCH', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({status: 'closed'})
  }).then(function(r){ return r.json(); }).then(function(d) {
    if (d.ok) closeAdminFeedbackDetail();
  });
}

// ── switchTab hook for contents & feedback ───────────────────────────────────
var _origAdminSwitch = switchTab;
switchTab = function(name, el) {
  _origAdminSwitch(name, el);
  if (name === 'contents') loadContents();
  if (name === 'feedback') loadAdminFeedback();
};
</script>
</body></html>`
}

// ─── Poster HTML ──────────────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage4] posterHtml — pure mechanical move

// ─── SOP HTML (simplified) ────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage4] sopHtml — pure mechanical move

// ─── Member Profile HTML ──────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] memberProfileHtml — pure mechanical move

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
    如有疑問 WhatsApp：<a href="https://wa.me/85254429749">5442-9749</a> ·
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
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
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
/* Modules rendered outside .page-area: position fixed to overlay the whole screen */
#app-shell ~ .mod-page.active {
  display:block !important;
  position:fixed !important;
  top:0 !important;
  left:220px !important;
  right:0 !important;
  bottom:0 !important;
  overflow-y:auto;
  padding:24px !important;
  box-sizing:border-box;
  background:#F3F4F6;
  z-index:50;
}

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
      <input type="password" id="login-pw" placeholder="請輸入密碼" autocomplete="current-password" onkeydown="if(event.key==='Enter')doAdminLogin()">
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
      <div class="nav-item" onclick="switchMod('mod-coworkery')">
        <i class="fas fa-hard-hat"></i> CoWorkery 人手
      </div>
      <div class="nav-item" onclick="switchMod('mod-revenue')">
        <i class="fas fa-star"></i> CoLeadery 申請
      </div>
      <div class="nav-item" onclick="switchMod('mod-colinkery-admin')">
        <i class="fas fa-handshake"></i> CoLinkery 申請
      </div>
      <div class="nav-item" onclick="switchMod('mod-qr')">
        <i class="fas fa-qrcode"></i> QR 快速登記
      </div>
      <div class="nav-item" onclick="switchMod('mod-testing')">
        <i class="fas fa-flask"></i> 產品測試計劃
      </div>
      <div class="nav-item" onclick="switchMod('mod-benefits')">
        <i class="fas fa-gift"></i> 福利管理
      </div>
      <div class="nav-item" onclick="switchMod('mod-hmvod')">
        <i class="fas fa-film"></i> HMVod 申請
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
    <input type="hidden" id="job-image-url">
    <div class="form-field">
      <label>職位圖片（選填）</label>
      <div id="jobImgDropZone"
        ondragover="event.preventDefault();this.style.borderColor='var(--brand)';this.style.background='#f0fff0';"
        ondragleave="this.style.borderColor='#D1D5DB';this.style.background='#F9FAFB';"
        ondrop="jobImgHandleDrop(event)"
        onclick="document.getElementById('jobImgFileInput').click()"
        style="border:2px dashed #D1D5DB;border-radius:8px;padding:16px;text-align:center;cursor:pointer;background:#F9FAFB;transition:all 0.2s;min-height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">
        <div id="jobImgPreviewWrap" style="display:none;width:100%;">
          <img id="jobImgPreview" src="" alt="preview" style="max-width:100%;max-height:120px;object-fit:contain;border-radius:6px;display:block;margin:0 auto 6px;">
          <div style="display:flex;gap:6px;justify-content:center;align-items:center;">
            <span id="jobImgPreviewName" style="font-size:11px;color:#555;"></span>
            <button type="button" onclick="event.stopPropagation();jobImgClear()" style="font-size:11px;color:#DC2626;background:none;border:none;cursor:pointer;padding:0;">✕ 移除</button>
          </div>
        </div>
        <div id="jobImgPlaceholder">
          <div style="font-size:22px;margin-bottom:2px;">🖼️</div>
          <div style="font-size:12px;color:#6B7280;">拖放或點擊上傳圖片</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:1px;">建議 4:3 比例，JPG / PNG / WEBP</div>
        </div>
        <div id="jobImgUploadProgress" style="display:none;font-size:12px;color:var(--brand);">
          <i class="fas fa-spinner fa-spin"></i> 上傳中…
        </div>
      </div>
      <input id="jobImgFileInput" type="file" accept="image/*" style="display:none;" onchange="jobImgHandleFile(this.files[0])">
    </div>
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

<!-- ── CoWorkery Module ── -->
<div id="mod-coworkery" class="mod-page">
  <style>
    .cw-tab{padding:8px 16px;border:1.5px solid #D1D5DB;background:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;transition:all 0.15s;}
    .cw-tab.active{background:var(--brand);color:#fff;border-color:var(--brand);}
    .cw-tab-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB;}
    .cw-panel{display:none;}
    .cw-stat-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
    .cw-stat{background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:14px 18px;min-width:100px;text-align:center;}
    .cw-stat .n{font-size:28px;font-weight:700;color:var(--brand);}
    .cw-stat .l{font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
  </style>
  <div class="cw-tab-bar">
    <button class="cw-tab active" data-tab="cw-overview" onclick="cwTab('cw-overview')">\u7e3d\u89bd</button>
    <button class="cw-tab" data-tab="cw-approval" onclick="cwTab('cw-approval')">\u5f85\u5be9\u6279</button>
    <button class="cw-tab" data-tab="cw-sessions" onclick="cwTab('cw-sessions')">\u5834\u6b21\u8a2d\u5b9a</button>
    <button class="cw-tab" data-tab="cw-assign" onclick="cwTab('cw-assign')">\u6d3e\u66f4</button>
    <button class="cw-tab" data-tab="cw-payroll" onclick="cwTab('cw-payroll')">\u6253\u5361\u51fa\u7cae</button>
  </div>
  <!-- Tab 1: 總覽 -->
  <div id="cw-overview" class="cw-panel" style="display:block">
    <div class="cw-stat-row">
      <div class="cw-stat"><div class="n" id="cwStatTotal">-</div><div class="l">\u7e3d\u6578</div></div>
      <div class="cw-stat"><div class="n" id="cwStatActive">-</div><div class="l">ACTIVE</div></div>
      <div class="cw-stat"><div class="n" id="cwStatPending">-</div><div class="l">\u5f85\u5be9\u6279</div></div>
      <div class="cw-stat"><div class="n" id="cwStatSusp">-</div><div class="l">\u505c\u724c</div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <input id="cwSearch" placeholder="\u641c\u5c0b CW\u7de8\u865f/\u59d3\u540d/\u96fb\u8a71/\u6703\u54e1\u865f" style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:14px" onkeydown="if(event.key==='Enter')cwLoadList()">
      <button class="btn btn-secondary" onclick="cwLoadList()">\u641c\u5c0b</button>
      <button class="btn btn-secondary" onclick="location.href='/api/admin/coworkery/export/csv'">\u5305\u51faCSV</button>
      <button class="btn btn-primary" onclick="cwOpenRegister()">\uff0b \u958b\u5361</button>
    </div>
    <div id="cwListBox">\u8f09\u5165\u4e2d\u2026</div>
  </div>
  <!-- Tab 2: 待審批 -->
  <div id="cw-approval" class="cw-panel">
    <div id="cwApprovalBox">\u8f09\u5165\u4e2d\u2026</div>
  </div>
  <!-- Tab 3: 場次設定 -->
  <div id="cw-sessions" class="cw-panel">
    <div id="cwSessionsBox">\u8f09\u5165\u4e2d\u2026</div>
  </div>
  <!-- Tab 4: 派更 -->
  <div id="cw-assign" class="cw-panel">
    <div style="margin-bottom:12px">
      <select id="cwAssignSession" style="padding:8px 12px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:14px;min-width:300px" onchange="cwLoadAssign()"></select>
    </div>
    <div id="cwAssignBox">\u8acb\u5148\u9078\u64c7\u5834\u6b21</div>
  </div>
  <!-- Tab 5: 打卡出糧 -->
  <div id="cw-payroll" class="cw-panel">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
      <select id="cwPayrollSession" style="padding:8px 12px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:14px;min-width:300px" onchange="cwLoadPayroll()"></select>
      <button class="btn btn-primary" onclick="cwCalcPayroll()">\u8a08\u7b97\u51fa\u7cae</button>
      <button class="btn btn-secondary" onclick="cwExportPayroll()">\u5305\u51faCSV</button>
    </div>
    <div id="cwPayrollTotals" style="font-size:13px;font-weight:600;color:#374151;margin-bottom:10px"></div>
    <div id="cwPayrollBox">\u8acb\u5148\u9078\u64c7\u5834\u6b21</div>
  </div>

  <!-- ── 開卡 Modal ───────────────────────────────────────────────── -->
  <div id="cwRegModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:14px;max-width:520px;width:92%;max-height:90vh;overflow-y:auto;padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0">&#xFF0B; \u958b\u5361\uff08\u65b0\u589e CoWorkery\uff09</h3>
        <button class="btn btn-sm" onclick="cwCloseRegister()" style="line-height:1">&#x2715;</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="grid-column:1/3">
          <label style="font-weight:600;display:block;margin-bottom:4px">\u6703\u54e1\u7de8\u865f <span style="color:#dc2626">*</span></label>
          <div style="display:flex;gap:6px;align-items:center">
            <input id="regMemberNo" placeholder="\u8001\u6709\u5361\u6703\u54e1\u7de8\u865f" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
            <button class="btn btn-sm btn-secondary" onclick="cwCheckMember()">\u67e5\u6703\u54e1</button>
          </div>
          <span id="regMemberHint" style="font-size:13px;margin-top:4px;display:block"></span>
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u4e2d\u6587\u59d3\u540d <span style="color:#dc2626">*</span></label>
          <input id="regNameZh" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u82f1\u6587\u59d3\u540d</label>
          <input id="regNameEn" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u96fb\u8a71 <span style="color:#dc2626">*</span></label>
          <input id="regPhone" inputmode="numeric" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u6027\u5225</label>
          <select id="regGender" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
            <option value="">\u2014</option><option value="M">\u7537</option><option value="F">\u5973</option>
          </select>
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u5730\u5340</label>
          <input id="regDistrict" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">HKID \u982d 4 \u4f4d</label>
          <input id="regHkid" maxlength="4" placeholder="\u4f8b\u5982 A123" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div style="grid-column:1/3">
          <label style="font-weight:600;display:block;margin-bottom:4px">\u5730\u5740</label>
          <input id="regAddress" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u9280\u884c\u540d\u7a31</label>
          <input id="regBankName" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u6236\u540d</label>
          <input id="regBankAcctName" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u9280\u884c\u8cec\u865f</label>
          <input id="regBankAcctNo" inputmode="numeric" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">\u9810\u8a2d\u6642\u85aa\uff08\u5143/\u5c0f\u6642\uff09</label>
          <input id="regRate" inputmode="decimal" placeholder="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        </div>
        <div style="grid-column:1/3">
          <label style="font-weight:600;display:block;margin-bottom:4px">\u8eab\u4efd\u8b49\u6b63\u672c\uff08\u5716\u7247\uff0c\u53ef\u9078\uff09</label>
          <input type="file" accept="image/*" id="regIdFront" onchange="cwPreviewId()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px">
          <img id="regIdPreview" style="max-width:100%;margin-top:8px;border-radius:8px;display:none" alt="\u8eab\u4efd\u8b49\u9810\u89bd">
          <div style="font-size:12px;color:#6b7280;margin-top:4px">\u4e0a\u50b3\u5f8c\u53ea\u6709\u5f8c\u53f0\u53ef\u8b80\uff0c\u524d\u7aef\u906e\u853d\uff08PDPO \u5408\u898f\uff09</div>
        </div>
      </div>
      <div id="regMsg" style="margin-top:12px;font-size:14px;min-height:20px"></div>
      <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="cwCloseRegister()">\u53d6\u6d88</button>
        <button class="btn btn-primary" id="regSubmitBtn" onclick="cwSubmitRegister()">\u78ba\u8a8d\u958b\u5361</button>
      </div>
    </div>
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

<div id="mod-revenue" class="mod-page">
  <style>
    .app-card{background:#fff;border-radius:10px;border:1.5px solid #E5E7EB;padding:16px 18px;margin-bottom:12px;cursor:pointer;transition:box-shadow 0.15s;}
    .app-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.09);}
    .app-card .ac-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
    .app-card .ac-name{font-size:17px;font-weight:700;color:#111;}
    .app-card .ac-role{font-size:13px;font-weight:700;padding:3px 10px;border-radius:20px;}
    .ac-role.CL{background:#FFF3CD;color:#92400e;}
    .ac-role.CK{background:#E0F2FE;color:#0369a1;}
    .app-card .ac-meta{font-size:13px;color:#6B7280;margin-top:4px;}
    .app-card .ac-detail{font-size:14px;color:#374151;margin-top:8px;line-height:1.6;border-top:1px solid #F3F4F6;padding-top:8px;}
    .status-badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;}
    .status-PENDING{background:#FFFBEB;color:#92400e;border:1px solid #FCD34D;}
    .status-APPROVED{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;}
    .status-REJECTED{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;}
    .rev-filter-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}
    .rev-filter-btn{padding:6px 16px;border:1.5px solid #D1D5DB;background:#fff;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;}
    .rev-filter-btn.active{background:var(--brand);color:#fff;border-color:var(--brand);}
    .review-actions{display:flex;gap:8px;margin-top:12px;}
    .btn-approve{padding:9px 20px;background:#065F46;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;}
    .btn-reject{padding:9px 20px;background:#991B1B;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;}
    .review-notes{width:100%;padding:8px 10px;font-size:14px;border:1.5px solid #D1D5DB;border-radius:6px;resize:vertical;font-family:inherit;margin-top:8px;}
    .doc-link{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#F3F4F6;border-radius:6px;font-size:13px;font-weight:600;color:#1B4332;text-decoration:none;margin-top:6px;}
    /* Rev Tabs */
    .rev-tabs{display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:20px;}
    .rev-tab{padding:10px 20px;border:none;background:none;font-size:14px;font-weight:600;color:#6B7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;}
    .rev-tab.active{color:var(--brand);border-bottom-color:var(--brand);}
    /* Project cards */
    .proj-card{background:#fff;border-radius:10px;border:1.5px solid #E5E7EB;padding:14px 16px;margin-bottom:10px;}
    .proj-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;}
    .proj-code{font-size:12px;font-family:monospace;background:#F3F4F6;padding:2px 8px;border-radius:4px;color:#6B7280;}
    .proj-name{font-size:16px;font-weight:700;color:#111;}
    .proj-status-DRAFT{background:#F3F4F6;color:#374151;}
    .proj-status-ACTIVE{background:#D1FAE5;color:#065F46;}
    .proj-status-SETTLING{background:#FEF3C7;color:#92400e;}
    .proj-status-SETTLED{background:#DBEAFE;color:#1D4ED8;}
    .proj-status-CLOSED{background:#F3F4F6;color:#9CA3AF;}
    .ledger-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #F9FAFB;font-size:13px;}
    .ledger-INCOME{color:#065F46;font-weight:700;}
    .ledger-cost{color:#991B1B;}
    .share-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;}
    .share-row{display:flex;justify-content:space-between;background:#F9FAFB;padding:5px 10px;border-radius:6px;font-size:13px;}
    .holder-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:20px;font-size:12px;font-weight:600;color:#065F46;margin:2px;}
  </style>

  <!-- Rev Module Tabs -->
  <div class="rev-tabs">
    <button class="rev-tab active" onclick="revTabSwitch('tab-apps',this)">📋 申請審核</button>
    <button class="rev-tab" onclick="revTabSwitch('tab-holders',this)">🏅 已認證持有人</button>
    <button class="rev-tab" onclick="revTabSwitch('tab-projects',this)">📊 項目管理</button>
  </div>

  <!-- Tab 1: 申請審核 -->
  <div id="tab-apps" class="rev-tab-panel" style="max-width:700px;">
    <div id="revStats" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;"></div>
    <div class="rev-filter-bar">
      <button class="rev-filter-btn active" onclick="loadRevApps('PENDING',this)">⏳ 待審批</button>
      <button class="rev-filter-btn" onclick="loadRevApps('APPROVED',this)">✅ 已批准</button>
      <button class="rev-filter-btn" onclick="loadRevApps('REJECTED',this)">❌ 已拒絕</button>
    </div>
    <div id="revAppList">載入中…</div>
  </div>

  <!-- Tab 2: 已認證持有人 -->
  <div id="tab-holders" class="rev-tab-panel" style="display:none;max-width:700px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="font-size:16px;font-weight:700;color:#374151;">🏅 已認證 CoLeadery / CoLinkery</h3>
      <button class="btn btn-secondary btn-sm" onclick="loadRevHolders()"><i class="fas fa-rotate-right"></i> 刷新</button>
    </div>
    <div id="revHolderList">載入中…</div>
  </div>

  <!-- Tab 3: 項目管理 -->
  <div id="tab-projects" class="rev-tab-panel" style="display:none;max-width:900px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <h3 style="font-size:16px;font-weight:700;color:#374151;">📊 項目列表</h3>
      <button class="btn btn-primary btn-sm" onclick="openCreateProject()"><i class="fas fa-plus"></i> 新增項目</button>
    </div>
    <div id="projList">載入中…</div>
  </div>

  <!-- 審核 Detail Modal -->
  <div id="revModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;overflow-y:auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;max-width:560px;margin:0 auto;padding:24px;position:relative;">
      <button onclick="closeRevModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#6B7280;">✕</button>
      <h3 style="font-size:20px;font-weight:900;margin-bottom:16px;color:#1B4332;">📋 申請詳情</h3>
      <div id="revModalBody"></div>
    </div>
  </div>

  <!-- 項目詳情 Modal -->
  <div id="projModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;overflow-y:auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;max-width:680px;margin:0 auto;padding:24px;position:relative;">
      <button onclick="closeProjModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#6B7280;">✕</button>
      <h3 id="projModalTitle" style="font-size:18px;font-weight:900;margin-bottom:16px;color:#1B4332;">項目詳情</h3>
      <div id="projModalBody"></div>
    </div>
  </div>

  <!-- 持有人詳情 Modal -->
  <div id="holderDetailModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;overflow-y:auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;max-width:620px;margin:0 auto;padding:24px;position:relative;">
      <button onclick="document.getElementById('holderDetailModal').style.display='none'" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#6B7280;">✕</button>
      <h3 id="holderDetailTitle" style="font-size:18px;font-weight:900;margin-bottom:16px;color:#1B4332;">持有人詳情</h3>
      <div id="holderDetailBody"></div>
    </div>
  </div>

  <!-- 新增/編輯項目 Modal -->
  <div id="createProjModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;overflow-y:auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:24px;position:relative;">
      <button onclick="closeCreateProjModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#6B7280;">✕</button>
      <h3 style="font-size:18px;font-weight:900;margin-bottom:16px;color:#1B4332;">➕ 新增項目</h3>
      <div class="search-bar" style="flex-direction:column;gap:10px;">
        <div style="width:100%;">
          <label style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px;display:block;">項目名稱 <span style="color:#DC2626">*</span></label>
          <input id="cpName" type="text" placeholder="例：葵青社區日用品項目" style="width:100%;padding:9px 12px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:14px;">
        </div>
        <div style="width:100%;">
          <label style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px;display:block;">業務場景 <span style="color:#DC2626">*</span></label>
          <select id="cpScenario" style="width:100%;padding:9px 12px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:14px;">
            <option value="PURE_B2C">PURE_B2C — 純消費者銷售</option>
            <option value="B2C_TO_B2B">B2C_TO_B2B — 消費者轉商業</option>
            <option value="PURE_B2B">PURE_B2B — 純商業合作</option>
          </select>
        </div>
        <div style="width:100%;">
          <label style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px;display:block;">業務類型</label>
          <input id="cpBizType" type="text" placeholder="例：日用品、餐飲、服務" style="width:100%;padding:9px 12px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:14px;">
        </div>
        <div style="width:100%;">
          <label style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px;display:block;">備注</label>
          <textarea id="cpNotes" rows="2" placeholder="項目說明" style="width:100%;padding:9px 12px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:14px;resize:vertical;font-family:inherit;"></textarea>
        </div>
        <div id="cpErr" style="color:#DC2626;font-size:13px;display:none;"></div>
        <button class="btn btn-primary" onclick="submitCreateProject()" style="width:100%;">建立項目</button>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     MOD: CoLinkery 申請審核
════════════════════════════════════════════════════════════════════ -->
<div id="mod-colinkery-admin" class="mod-page">
  <style>
    .ck-app-card{background:#fff;border-radius:10px;border:1.5px solid #BAE6FD;padding:16px 18px;margin-bottom:12px;}
    .ck-app-card .cka-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
    .ck-app-card .cka-name{font-size:17px;font-weight:700;color:#0C4A6E;}
    .ck-app-card .cka-meta{font-size:13px;color:#6B7280;margin-top:4px;}
    .ck-app-card .cka-notes{font-size:13px;color:#374151;margin-top:8px;background:#F0F9FF;border-radius:6px;padding:8px 10px;}
    .ck-filter-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}
    .ck-filter-btn{padding:6px 16px;border:1.5px solid #BAE6FD;background:#fff;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;color:#0369A1;}
    .ck-filter-btn.active{background:#0284C7;color:#fff;border-color:#0284C7;}
    .ck-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
    .btn-ck-approve{padding:8px 18px;background:#065F46;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;}
    .btn-ck-reject{padding:8px 18px;background:#991B1B;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;}
    .btn-ck-wa{padding:8px 18px;background:#25D366;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
    .ck-otp-card{background:#fff;border-radius:10px;border:1.5px solid #A7F3D0;padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
    .ck-otp-code{font-size:26px;font-weight:900;color:#065F46;letter-spacing:6px;font-family:monospace;}
    .ck-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;}
    .ck-stat-card{background:#fff;border-radius:10px;border:1.5px solid #E5E7EB;padding:14px 16px;text-align:center;}
    .ck-stat-num{font-size:28px;font-weight:900;color:#0284C7;}
    .ck-stat-lbl{font-size:12px;color:#6B7280;margin-top:2px;}
    .ck-tab-bar{display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:20px;}
    .ck-tab{padding:10px 20px;border:none;background:none;font-size:14px;font-weight:600;color:#6B7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;}
    .ck-tab.active{color:#0284C7;border-bottom-color:#0284C7;}
    .ck-type-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:#E0F2FE;color:#0369A1;}
    .ck-holder-card{background:#fff;border-radius:10px;border:1.5px solid #BAE6FD;padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}
  </style>

  <!-- 統計卡片 -->
  <div id="ckStatGrid" class="ck-stat-grid"></div>

  <!-- Tab 列 -->
  <div class="ck-tab-bar">
    <button class="ck-tab active" id="ckTab-pending" onclick="ckSwitchTab('pending',this)">⏳ 待審批</button>
    <button class="ck-tab" id="ckTab-approved" onclick="ckSwitchTab('approved',this)">✅ 已批准</button>
    <button class="ck-tab" id="ckTab-rejected" onclick="ckSwitchTab('rejected',this)">❌ 已拒絕</button>
    <button class="ck-tab" id="ckTab-otp" onclick="ckSwitchTab('otp',this)">📱 OTP 管理</button>
  </div>

  <!-- 待審批 -->
  <div id="ckPanel-pending" style="max-width:700px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <span style="font-size:14px;color:#6B7280;">點擊「批准」或「拒絕」處理申請</span>
      <button class="btn btn-secondary btn-sm" onclick="loadCkAdminData()"><i class="fas fa-rotate-right"></i> 刷新</button>
    </div>
    <div id="ckPendingList">載入中…</div>
  </div>

  <!-- 已批准 -->
  <div id="ckPanel-approved" style="display:none;max-width:700px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <span style="font-size:14px;color:#6B7280;">已批准的 CoLinkery 連結者</span>
      <button class="btn btn-secondary btn-sm" onclick="loadCkApproved()"><i class="fas fa-rotate-right"></i> 刷新</button>
    </div>
    <div id="ckApprovedList">載入中…</div>
  </div>

  <!-- 已拒絕 -->
  <div id="ckPanel-rejected" style="display:none;max-width:700px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <span style="font-size:14px;color:#6B7280;">已拒絕的 CoLinkery 申請</span>
      <button class="btn btn-secondary btn-sm" onclick="loadCkRejected()"><i class="fas fa-rotate-right"></i> 刷新</button>
    </div>
    <div id="ckRejectedList">載入中…</div>
  </div>

  <!-- OTP 管理 -->
  <div id="ckPanel-otp" style="display:none;max-width:700px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div>
        <div style="font-size:15px;font-weight:700;color:#374151;">📱 待發 OTP（忘記密碼）</div>
        <div style="font-size:13px;color:#6B7280;margin-top:2px;">用 WhatsApp 發送 OTP 給申請重設密碼的用戶</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadCkAdminData()"><i class="fas fa-rotate-right"></i> 刷新</button>
    </div>
    <div id="ckOtpList">載入中…</div>
  </div>
</div>


<script>
// v2 2026-08-04
// ── Login ──
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

function showAppShell(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app-shell').style.display='flex';
  loadRoadshows();
  loadDistricts();
  loadStoreDropdown();
}

// ── State ──
var allStores = [];
var allDistricts = [];
var rsCache = {};

// ── Init: check existing session ──
(function(){
  fetch('/api/admin/me').then(function(r){return r.json();}).then(function(d){
    if(d.loggedIn){ showAppShell(); }
    else { document.getElementById('login-screen').style.display='flex'; }
  }).catch(function(){
    document.getElementById('login-screen').style.display='flex';
  });
})();

// ── QR 快速登記管理 Module ──────────────────────────────────────────────────
</script>

<div id="mod-qr" class="mod-page" style="display:none">
  <style>
    /* ── QR mod layout ── */
    .qrmod-layout{display:grid;grid-template-columns:1fr 360px;gap:20px;align-items:start;}
    @media(max-width:900px){.qrmod-layout{grid-template-columns:1fr;}}
    .qrmod-card{background:#fff;border-radius:10px;border:1px solid #E5E7EB;padding:22px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
    .qrmod-card h3{font-size:15px;font-weight:700;color:#1B4332;margin:0 0 16px;}
    /* type selector */
    .qrmod-type-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}
    .qrmod-type-btn{border:1.5px solid #E5E7EB;border-radius:8px;background:#fff;padding:10px 8px;font-size:12px;font-weight:600;color:#6B7280;cursor:pointer;text-align:center;transition:all .15s;}
    .qrmod-type-btn .icon{display:block;font-size:18px;margin-bottom:4px;}
    .qrmod-type-btn.active{border-color:#1B4332;background:#F0FDF4;color:#1B4332;}
    /* form fields */
    .qrmod-field{margin-bottom:12px;}
    .qrmod-field label{display:block;font-size:11px;font-weight:700;color:#555;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;}
    .qrmod-field input,.qrmod-field select,.qrmod-field textarea{width:100%;border:1.5px solid #D1D5DB;border-radius:6px;padding:9px 10px;font-size:13px;box-sizing:border-box;font-family:inherit;}
    .qrmod-field input:focus,.qrmod-field select:focus{border-color:#1B4332;outline:none;}
    .qrmod-hint{font-size:11px;color:#9CA3AF;margin-top:3px;line-height:1.5;}
    /* preview card */
    .qrmod-preview{background:#fff;border-radius:10px;border:1px solid #E5E7EB;padding:22px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);position:sticky;top:20px;}
    .qrmod-preview h3{font-size:15px;font-weight:700;color:#1B4332;margin:0 0 14px;}
    .qrmod-canvas-wrap{width:200px;height:200px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;}
    .qrmod-url-box{font-family:monospace;font-size:11px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:8px 10px;word-break:break-all;margin-bottom:10px;color:#374151;}
    .qrmod-action-btn{width:100%;padding:10px;border-radius:6px;border:none;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px;}
    .qrmod-dl-btn{background:#1B4332;color:#fff;}
    .qrmod-cp-btn{background:#F3F4F6;color:#1B4332;border:1.5px solid #D1D5DB;}
    .qrmod-tips{background:#FFFDE7;border-radius:6px;padding:10px 12px;font-size:11px;color:#795548;line-height:1.7;margin-top:12px;}
    /* sources list */
    .qrmod-src-list{margin-top:16px;}
    .qrmod-src-item{background:#fff;border-radius:8px;border:1px solid #E5E7EB;border-left:4px solid #1B4332;padding:14px 16px;margin-bottom:10px;}
    .qrmod-src-item.inactive{border-left-color:#D1D5DB;opacity:.7;}
    .qrmod-src-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;}
    .qrmod-src-name{font-size:14px;font-weight:700;color:#111827;}
    .qrmod-src-meta{font-size:11px;color:#6B7280;line-height:1.8;margin-bottom:8px;}
    .qrmod-src-count{font-size:22px;font-weight:900;color:#1B4332;}
    .qrmod-src-url{font-size:10px;font-family:monospace;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:5px 8px;word-break:break-all;margin:6px 0;}
    /* tab bar */
    .qrmod-tabs{display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:18px;}
    .qrmod-tab{padding:9px 16px;border:none;background:none;font-size:13px;font-weight:600;color:#6B7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;}
    .qrmod-tab.active{color:#1B4332;border-bottom-color:#1B4332;}
    /* log table */
    .qrmod-log-table{width:100%;border-collapse:collapse;font-size:12px;}
    .qrmod-log-table th{background:#F9FAFB;padding:8px 10px;text-align:left;font-weight:700;color:#374151;border-bottom:2px solid #E5E7EB;}
    .qrmod-log-table td{padding:7px 10px;border-bottom:1px solid #F0F0F0;vertical-align:top;}
    .qrmod-log-table tr:hover td{background:#FAFAFA;}
    .lbadge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;}
    .lb-success{background:#D1FAE5;color:#065F46;}
    .lb-format_error,.lb-db_error{background:#FEE2E2;color:#991B1B;}
    .lb-invalid_year,.lb-invalid_phone{background:#FEF3C7;color:#92400E;}
    .lb-duplicate_phone{background:#DBEAFE;color:#1E40AF;}
    .lb-pending{background:#F3F4F6;color:#6B7280;}
    /* stat boxes */
    .qrmod-stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:16px;}
    .qrmod-stat-box{background:#fff;border-radius:8px;border:1px solid #E5E7EB;padding:12px;text-align:center;}
    .qrmod-stat-num{font-size:22px;font-weight:900;color:#1B4332;}
    .qrmod-stat-lbl{font-size:11px;color:#6B7280;margin-top:2px;}
  </style>

  <!-- Tab bar -->
  <div class="qrmod-tabs">
    <button class="qrmod-tab active" id="qrtab-create" onclick="qrModTab('create',this)">➕ 新增 QR 碼</button>
    <button class="qrmod-tab" id="qrtab-sources" onclick="qrModTab('sources',this)">🔖 已有 QR 來源</button>
    <button class="qrmod-tab" id="qrtab-logs" onclick="qrModTab('logs',this)">📋 Webhook 日誌</button>
    <button class="qrmod-tab" id="qrtab-stats" onclick="qrModTab('stats',this)">📊 統計分析</button>
    <button class="qrmod-tab" id="qrtab-test" onclick="qrModTab('test',this)" style="color:#b45309;">🧪 測試登記流程</button>
  </div>

  <!-- ── CREATE PANEL (left form + right live preview) ── -->
  <div id="qrmodpanel-create">
    <div class="qrmod-layout">

      <!-- LEFT: form -->
      <div>
        <div class="qrmod-card">
          <h3>🔗 生成登記連結 &amp; QR Code</h3>

          <!-- type selector -->
          <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">登記來源類型</div>
          <div class="qrmod-type-grid">
            <button class="qrmod-type-btn active" id="qrmodtype-roadshow" onclick="qrModSetType('roadshow')"><span class="icon">🏪</span>Roadshow 攤位</button>
            <button class="qrmod-type-btn" id="qrmodtype-institution" onclick="qrModSetType('institution')"><span class="icon">🏢</span>機構 / 合作夥伴</button>
            <button class="qrmod-type-btn" id="qrmodtype-referral" onclick="qrModSetType('referral')"><span class="icon">👤</span>會員個人介紹</button>
            <button class="qrmod-type-btn" id="qrmodtype-online" onclick="qrModSetType('online')"><span class="icon">🌐</span>網上 / 社媒推廣</button>
          </div>

          <!-- ROADSHOW fields -->
          <div id="qrmodfields-roadshow">
            <div class="qrmod-field">
              <label>Roadshow 場次代碼 <span style="color:#dc2626">*</span></label>
              <input id="qrmodRsCode" type="text" placeholder="例：cwb_2025_07_01" oninput="qrModUpdatePreview()" style="font-family:monospace;letter-spacing:1px;">
              <div class="qrmod-hint">只用英文小寫、數字、底線。建議格式：地區_年份_月份_場次</div>
            </div>
            <div class="qrmod-field">
              <label>活動名稱 / 地點</label>
              <input id="qrmodRsLabel" type="text" placeholder="例：銅鑼灣時代廣場 7月份攤位" oninput="qrModUpdatePreview()">
            </div>
            <div class="qrmod-field">
              <label>活動日期</label>
              <input id="qrmodRsDate" type="date" oninput="qrModUpdatePreview()">
            </div>
            <div class="qrmod-field">
              <label>備註（選填）</label>
              <input id="qrmodRsNotes" type="text" placeholder="（可選）">
            </div>
          </div>

          <!-- INSTITUTION fields -->
          <div id="qrmodfields-institution" style="display:none;">
            <div class="qrmod-field">
              <label>機構名稱 <span style="color:#dc2626">*</span></label>
              <input id="qrmodInstName" type="text" placeholder="例：基督教家庭服務中心 荃灣" oninput="qrModUpdatePreview()">
            </div>
            <div class="qrmod-field">
              <label>機構代碼（選填）</label>
              <input id="qrmodInstCode" type="text" placeholder="例：cfsc_tw" oninput="qrModUpdatePreview()" style="font-family:monospace;letter-spacing:1px;">
              <div class="qrmod-hint">只用英文小寫、數字、底線。留空則用機構名稱縮寫</div>
            </div>
            <div class="qrmod-field">
              <label>備註（選填）</label>
              <input id="qrmodInstNotes" type="text" placeholder="（可選）">
            </div>
          </div>

          <!-- REFERRAL fields -->
          <div id="qrmodfields-referral" style="display:none;">
            <div class="qrmod-field">
              <label>介紹人會員編號 <span style="color:#dc2626">*</span></label>
              <input id="qrmodRefNo" type="text" placeholder="例：CE85-000012" oninput="qrModUpdatePreview()" style="font-family:monospace;letter-spacing:2px;font-weight:700;">
              <div class="qrmod-hint">掃碼後自動填入 referrer_no 欄位</div>
            </div>
            <div class="qrmod-field">
              <label>介紹人姓名（選填）</label>
              <input id="qrmodRefName" type="text" placeholder="例：陳大文" oninput="qrModUpdatePreview()">
            </div>
          </div>

          <!-- ONLINE fields -->
          <div id="qrmodfields-online" style="display:none;">
            <div class="qrmod-field">
              <label>推廣渠道 <span style="color:#dc2626">*</span></label>
              <select id="qrmodOnlineCh" onchange="qrModUpdatePreview()">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="website">官方網站</option>
                <option value="email">電子郵件</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div class="qrmod-field">
              <label>推廣活動標籤（選填）</label>
              <input id="qrmodOnlineTag" type="text" placeholder="例：july_promo" oninput="qrModUpdatePreview()" style="font-family:monospace;letter-spacing:1px;">
            </div>
          </div>

          <!-- target page -->
          <div class="qrmod-field" style="margin-top:8px;">
            <label>目標登記頁面</label>
            <select id="qrmodTarget" onchange="qrModUpdatePreview()">
              <option value="primary">主卡登記（長者用）</option>
              <option value="family">家庭同行卡（家人用）</option>
              <option value="both">登記頁主頁（有 Login/Register tab）</option>
            </select>
          </div>

          <div id="qrmodCreateErr" style="color:#dc2626;font-size:12px;margin:8px 0;display:none;padding:8px 12px;background:#FEF2F2;border-radius:6px;"></div>
          <div id="qrmodCreateOk" style="color:#065F46;font-size:12px;margin:8px 0;display:none;padding:8px 12px;background:#D1FAE5;border-radius:6px;font-weight:700;">✅ QR 碼來源已成功建立！</div>

          <button class="btn btn-primary" style="width:100%;padding:12px;margin-top:4px;font-size:14px;" onclick="qrModCreate()">
            💾 建立並儲存 QR 來源
          </button>
        </div>

        <!-- saved sources mini-table -->
        <div class="qrmod-src-list" id="qrmodSrcListWrap">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:13px;font-weight:700;color:#374151;">📋 已建立的 QR 來源</span>
            <button class="btn btn-secondary btn-sm" onclick="qrModLoadSources()">🔄 重新整理</button>
          </div>
          <div id="qrmodSrcList"><div style="color:#aaa;font-size:13px;text-align:center;padding:16px;">載入中…</div></div>
        </div>
      </div>

      <!-- RIGHT: live preview -->
      <div>
        <div class="qrmod-preview">
          <h3>📱 即時預覽</h3>
          <div class="qrmod-canvas-wrap" id="qrmodCanvasWrap">
            <div style="color:#ccc;font-size:12px;text-align:center;line-height:1.6;">填寫左方資料<br>即時生成 QR Code</div>
          </div>
          <div id="qrmodLabelText" style="text-align:center;font-size:12px;color:#555;font-weight:600;margin-bottom:8px;min-height:18px;"></div>
          <div class="qrmod-url-box" id="qrmodUrlBox" style="display:none;"></div>
          <div id="qrmodActionBtns" style="display:none;">
            <button class="qrmod-action-btn qrmod-dl-btn" onclick="qrModDownload()">⬇ 下載 QR Code (PNG)</button>
            <button class="qrmod-action-btn qrmod-cp-btn" id="qrmodCpBtn" onclick="qrModCopyUrl()">📋 複製連結</button>
          </div>
          <div class="qrmod-tips">
            <strong>💡 使用提示</strong><br>
            • 下載 PNG 後可直接列印或發送<br>
            • 掃碼者登記時，來源渠道自動記錄<br>
            • 建立後可在「已有 QR 來源」管理
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ── SOURCES PANEL ── -->
  <div id="qrmodpanel-sources" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div>
        <h3 style="font-size:15px;font-weight:700;color:#111827">QR 碼來源列表</h3>
        <p style="font-size:12px;color:#6B7280;margin-top:2px">管理所有 Roadshow QR 碼，可啟用／暫停、查看統計</p>
      </div>
      <button class="btn btn-primary" onclick="qrModTab('create',document.getElementById('qrtab-create'))">
        <i class="fas fa-plus"></i> 新增 QR 碼
      </button>
    </div>
    <div id="qrSourceGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;">
      <div style="color:#aaa;font-size:13px;text-align:center;padding:24px;">載入中…</div>
    </div>
  </div>

  <!-- ── LOGS PANEL ── -->
  <div id="qrmodpanel-logs" style="display:none">
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <select id="qrLogStatus" onchange="qrLoadLogs()" style="padding:7px 10px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:13px">
        <option value="">全部狀態</option>
        <option value="success">成功</option>
        <option value="format_error">格式錯誤</option>
        <option value="invalid_year">年份無效</option>
        <option value="duplicate_phone">重複電話</option>
        <option value="db_error">系統錯誤</option>
      </select>
      <select id="qrLogSource" onchange="qrLoadLogs()" style="padding:7px 10px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:13px">
        <option value="">全部來源</option>
      </select>
      <button class="btn btn-secondary btn-sm" onclick="qrLoadLogs()"><i class="fas fa-rotate-right"></i> 刷新</button>
    </div>
    <div style="overflow-x:auto">
      <div id="qrLogsTable"><p style="color:#888;font-size:14px">載入中...</p></div>
    </div>
    <div id="qrLogsPager" style="margin-top:12px;display:flex;gap:8px;align-items:center"></div>
  </div>

  <!-- ── STATS PANEL ── -->
  <div id="qrmodpanel-stats" style="display:none">
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <label style="font-size:13px;font-weight:600;color:#374151">選擇 QR 來源：</label>
      <select id="qrStatsSelect" onchange="qrLoadStats()" style="padding:7px 12px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:13px">
        <option value="">── 請選擇 ──</option>
      </select>
    </div>
    <div id="qrStatsContent"><p style="color:#888;font-size:14px">請選擇一個 QR 來源以查看統計</p></div>
  </div>

  <!-- ── TEST PANEL ── -->
  <div id="qrmodpanel-test" style="display:none">
    <div style="background:#FFFBEB;border:1.5px solid #F59E0B;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:10px;">
      <span style="font-size:20px;line-height:1.2;">🧪</span>
      <div style="font-size:13px;color:#92400E;line-height:1.7;">
        <strong>測試模式：</strong>此功能模擬 WhatsApp 用戶掃碼後發送訊息的完整流程，用於在 Meta API 審批前測試系統是否正常運作。<br>
        測試完成後會建立真實的會員記錄，請記得在測試後手動刪除測試資料（或使用測試電話號碼）。
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">

      <!-- Left: Test Form -->
      <div style="background:#fff;border-radius:10px;border:1px solid #E5E7EB;padding:22px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <h3 style="font-size:15px;font-weight:700;color:#1B4332;margin:0 0 18px;">📱 模擬 WhatsApp 訊息</h3>

        <div class="qrmod-field">
          <label>WhatsApp 電話號碼（8位香港號碼）<span style="color:#dc2626">*</span></label>
          <input id="qrTestPhone" type="text" placeholder="例：91234567" maxlength="8" style="font-size:16px;letter-spacing:2px;">
          <div class="qrmod-hint">建議用測試號碼（如：99999999）避免影響真實用戶</div>
        </div>

        <div class="qrmod-field">
          <label>姓名 <span style="color:#dc2626">*</span></label>
          <input id="qrTestName" type="text" placeholder="例：測試用戶" maxlength="50">
        </div>

        <div class="qrmod-field">
          <label>出生年份 <span style="color:#dc2626">*</span></label>
          <input id="qrTestYear" type="number" placeholder="例：1960" min="1920" max="2011">
        </div>

        <div class="qrmod-field">
          <label>QR 來源 (Source)</label>
          <select id="qrTestSource" style="padding:9px 10px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%;">
            <option value="online_website">online_website（預設）</option>
          </select>
        </div>

        <div style="background:#F0FDF4;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:12px;color:#166534;">
          <strong>📨 模擬 WhatsApp 訊息內容：</strong>
          <pre id="qrTestMsgPreview" style="margin:6px 0 0;font-family:monospace;white-space:pre-wrap;font-size:12px;color:#166534;background:none;border:none;padding:0;">姓名:...\n年份:...\nSource:...</pre>
        </div>

        <div id="qrTestErr" style="display:none;background:#FEE2E2;border:1px solid #FCA5A5;border-radius:6px;padding:10px 14px;font-size:13px;color:#B91C1C;margin-bottom:12px;"></div>

        <button id="qrTestBtn" onclick="qrTestSubmit()" style="width:100%;padding:13px;background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.5px;">
          🚀 模擬發送 &amp; 測試登記流程
        </button>
      </div>

      <!-- Right: Result -->
      <div style="background:#fff;border-radius:10px;border:1px solid #E5E7EB;padding:22px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <h3 style="font-size:15px;font-weight:700;color:#1B4332;margin:0 0 18px;">📋 測試結果</h3>
        <div id="qrTestResult">
          <div style="text-align:center;padding:40px 20px;color:#9CA3AF;">
            <div style="font-size:40px;margin-bottom:12px;">⏳</div>
            <div style="font-size:13px;">點擊左方按鈕開始測試</div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ── Edit Modal ── -->
  <div id="qrmodEditOverlay" onclick="if(event.target===this)qrModCloseEdit()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;align-items:center;justify-content:center;">
    <div style="background:#fff;border-radius:12px;padding:28px 24px;width:90%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="font-size:16px;font-weight:700;color:#1B4332;margin:0;">✏️ 編輯 QR 來源</h3>
        <button onclick="qrModCloseEdit()" style="background:none;border:none;font-size:20px;color:#6B7280;cursor:pointer;line-height:1;">✕</button>
      </div>
      <input type="hidden" id="qrmodEditId">
      <div class="qrmod-field">
        <label>Source ID <span style="font-size:11px;color:#9CA3AF;font-weight:400;text-transform:none;">(不可更改)</span></label>
        <input id="qrmodEditSourceIdDisplay" type="text" disabled style="background:#F9FAFB;color:#6B7280;font-family:monospace;letter-spacing:1px;">
      </div>
      <div class="qrmod-field">
        <label>顯示名稱 <span style="color:#dc2626">*</span></label>
        <input id="qrmodEditName" type="text" placeholder="例：旺角 Roadshow">
      </div>
      <div class="qrmod-field">
        <label>活動日期</label>
        <input id="qrmodEditDate" type="date">
      </div>
      <div class="qrmod-field">
        <label>地點</label>
        <input id="qrmodEditLocation" type="text" placeholder="例：旺角朗豪坊廣場">
      </div>
      <div class="qrmod-field">
        <label>備註</label>
        <input id="qrmodEditNotes" type="text" placeholder="（選填）">
      </div>
      <div id="qrmodEditErr" style="color:#dc2626;font-size:12px;padding:8px 12px;background:#FEF2F2;border-radius:6px;display:none;margin-bottom:10px;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button onclick="qrModCloseEdit()" style="padding:9px 18px;background:#F3F4F6;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;cursor:pointer;color:#374151;">取消</button>
        <button onclick="qrModSaveEdit()" id="qrmodEditSaveBtn" style="padding:9px 18px;background:#1B4332;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">💾 儲存變更</button>
      </div>
    </div>
  </div>

</div>

<script>
// ═══════════════════════════════════════════════════════
// QR Module JS  (session-cookie auth, no localStorage pw)
// ═══════════════════════════════════════════════════════
var _qrLogPage = 1;
var _qrModCurrentType = 'roadshow';
var _qrModCurrentUrl = '';

// ── tab switching ──────────────────────────────────────────────────────────────
function qrModTab(tab, btnEl){
  ['create','sources','logs','stats','test'].forEach(function(t){
    var panel = document.getElementById('qrmodpanel-'+t);
    if(panel) panel.style.display = t===tab?'block':'none';
    var tb = document.getElementById('qrtab-'+t);
    if(tb) tb.classList.toggle('active', t===tab);
  });
  if(tab==='sources'){ qrModLoadSources(); qrFillSourceSelects(); }
  if(tab==='test'){ qrTestInit(); }
  if(tab==='logs'){ qrFillSourceSelects(); qrLoadLogs(); }
  if(tab==='stats'){ qrFillSourceSelects(); }
}

// ── type selector ──────────────────────────────────────────────────────────────
function qrModSetType(type){
  _qrModCurrentType = type;
  ['roadshow','institution','referral','online'].forEach(function(t){
    var btn = document.getElementById('qrmodtype-'+t);
    var fields = document.getElementById('qrmodfields-'+t);
    if(btn) btn.classList.toggle('active', t===type);
    if(fields) fields.style.display = t===type ? '' : 'none';
  });
  qrModUpdatePreview();
}

// ── build source_id and label from form inputs ─────────────────────────────────
function qrModGetIdAndLabel(){
  var type = _qrModCurrentType;
  var sourceId = '', label = '', location = '', eventDate = '', notes = '';
  if(type==='roadshow'){
    var code = (document.getElementById('qrmodRsCode').value||'').trim().toLowerCase().replace(/[^a-z0-9_\-]/g,'');
    label = (document.getElementById('qrmodRsLabel').value||'').trim() || code;
    eventDate = document.getElementById('qrmodRsDate').value||'';
    notes = (document.getElementById('qrmodRsNotes').value||'').trim();
    sourceId = code || '';
    location = label;
  } else if(type==='institution'){
    var instName = (document.getElementById('qrmodInstName').value||'').trim();
    var instCode = (document.getElementById('qrmodInstCode').value||'').trim().toLowerCase().replace(/[^a-z0-9_\-]/g,'');
    sourceId = instCode || instName.toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/__+/g,'_').substring(0,30);
    label = instName;
    notes = (document.getElementById('qrmodInstNotes').value||'').trim();
    location = instName;
  } else if(type==='referral'){
    var refNo = (document.getElementById('qrmodRefNo').value||'').trim();
    var refName = (document.getElementById('qrmodRefName').value||'').trim();
    sourceId = 'ref_'+(refNo.toLowerCase().replace(/[^a-z0-9]/g,'_'));
    label = refName ? refName+'（'+refNo+'）' : refNo;
    location = '';
  } else if(type==='online'){
    var ch = document.getElementById('qrmodOnlineCh').value||'facebook';
    var tag = (document.getElementById('qrmodOnlineTag').value||'').trim().toLowerCase().replace(/[^a-z0-9_\-]/g,'');
    sourceId = 'online_'+ch+(tag?'_'+tag:'');
    label = '網上推廣 · '+ch.charAt(0).toUpperCase()+ch.slice(1)+(tag?' ('+tag+')':'');
    location = '';
  }
  return { sourceId:sourceId, label:label, location:location, eventDate:eventDate, notes:notes };
}

// ── build registration URL ─────────────────────────────────────────────────────
function qrModBuildUrl(sourceId){
  if(!sourceId) return '';
  var base = window.location.origin;
  // Real route: /qr-register?source=xxx  (target selector kept for future use)
  return base + '/qr-register?source=' + encodeURIComponent(sourceId);
}

// ── QR image render via reliable external API ─────────────────────────────────
function qrModRenderCanvas(url, wrap){
  wrap.innerHTML = '';
  var img = document.createElement('img');
  // Use goqr.me API — reliable, no CORS issues, returns clean QR PNG
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + encodeURIComponent(url);
  img.width = 200; img.height = 200;
  img.style.cssText = 'display:block;border-radius:6px;';
  img.alt = 'QR Code';
  // loading indicator
  img.onload = function(){ wrap.style.background = 'transparent'; };
  img.onerror = function(){
    wrap.innerHTML = '<div style="color:#e53935;font-size:11px;text-align:center;padding:16px;">QR 生成失敗<br>請檢查網絡連線</div>';
  };
  wrap.appendChild(img);
  // Store reference for download
  wrap._qrImg = img;
}

// ── update live preview ────────────────────────────────────────────────────────
function qrModUpdatePreview(){
  var info = qrModGetIdAndLabel();
  var url = qrModBuildUrl(info.sourceId);
  _qrModCurrentUrl = url;

  var wrap = document.getElementById('qrmodCanvasWrap');
  var labelEl = document.getElementById('qrmodLabelText');
  var urlBox = document.getElementById('qrmodUrlBox');
  var actionBtns = document.getElementById('qrmodActionBtns');

  if(!url){
    wrap.innerHTML = '<div style="color:#ccc;font-size:12px;text-align:center;line-height:1.6;">填寫左方資料<br>即時生成 QR Code</div>';
    labelEl.textContent = '';
    urlBox.style.display = 'none';
    actionBtns.style.display = 'none';
    return;
  }
  qrModRenderCanvas(url, wrap);
  labelEl.textContent = info.label || info.sourceId;
  urlBox.textContent = url;
  urlBox.style.display = '';
  actionBtns.style.display = '';
}

// ── download PNG (high-res 600x600) ───────────────────────────────────────────
function qrModDownload(){
  if(!_qrModCurrentUrl){ alert('請先填寫表單'); return; }
  var info = qrModGetIdAndLabel();
  var a = document.createElement('a');
  a.href = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&format=png&data=' + encodeURIComponent(_qrModCurrentUrl);
  a.download = 'qr-' + (info.sourceId || 'code') + '.png';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── copy URL ───────────────────────────────────────────────────────────────────
function qrModCopyUrl(){
  if(!_qrModCurrentUrl){ alert('請先填寫表單'); return; }
  var btn = document.getElementById('qrmodCpBtn');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(_qrModCurrentUrl).then(function(){
      btn.textContent = '✅ 已複製！';
      setTimeout(function(){ btn.textContent = '📋 複製連結'; }, 2000);
    }).catch(function(){ prompt('請複製以下連結：', _qrModCurrentUrl); });
  } else {
    prompt('請複製以下連結：', _qrModCurrentUrl);
  }
}

// ── CREATE: POST to API (uses session cookie) ──────────────────────────────────
function qrModCreate(){
  var info = qrModGetIdAndLabel();
  var errEl = document.getElementById('qrmodCreateErr');
  var okEl = document.getElementById('qrmodCreateOk');
  errEl.style.display = 'none';
  okEl.style.display = 'none';

  if(!info.sourceId){
    errEl.textContent = '請填寫必填欄位（代碼或名稱）以生成 Source ID';
    errEl.style.display = 'block'; return;
  }
  if(!info.label){
    errEl.textContent = '請填寫顯示名稱';
    errEl.style.display = 'block'; return;
  }

  var payload = {
    source_id: info.sourceId,
    display_name: info.label,
    location: info.location || null,
    event_date: info.eventDate || null,
    notes: info.notes || null
  };

  fetch('/api/admin/qr-sources', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    credentials: 'include',
    body: JSON.stringify(payload)
  }).then(function(r){ return r.json(); }).then(function(d){
    if(d.ok){
      okEl.textContent = '✅ QR 來源「' + info.sourceId + '」已成功建立！';
      okEl.style.display = 'block';
      // Refresh mini list
      qrModLoadSources();
      // Keep preview so user can download QR
    } else {
      errEl.textContent = d.error || '建立失敗';
      errEl.style.display = 'block';
    }
  }).catch(function(e){
    errEl.textContent = '網絡錯誤：' + String(e);
    errEl.style.display = 'block';
  });
}

// ── load sources list (mini version in create panel) ──────────────────────────
function qrModLoadSources(){
  var list = document.getElementById('qrmodSrcList');
  var grid = document.getElementById('qrSourceGrid');
  if(list) list.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;padding:16px;"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  if(grid) grid.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;padding:24px;grid-column:1/-1;"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  fetch('/api/admin/qr-sources', { credentials: 'include' })
  .then(function(r){
    if(r.status === 401){
      var errHtml = '<div style="color:#e53935;font-size:13px;padding:12px;text-align:center;"><i class="fas fa-lock"></i> 未授權，請重新登入</div>';
      if(list) list.innerHTML = errHtml;
      if(grid) grid.innerHTML = '<p style="color:#e53935;font-size:14px;grid-column:1/-1;text-align:center;padding:24px;"><i class="fas fa-lock"></i> 未授權，請重新登入</p>';
      return null;
    }
    return r.json();
  })
  .then(function(d){
    if(!d) return;
    var list2 = document.getElementById('qrmodSrcList');
    var grid2 = document.getElementById('qrSourceGrid');
    if(!d.ok){
      var errMsg = d.error || '載入失敗';
      if(list2) list2.innerHTML = '<div style="color:#e53935;font-size:13px;padding:12px;text-align:center;"><i class="fas fa-exclamation-circle"></i> '+escHtml(errMsg)+'</div>';
      if(grid2) grid2.innerHTML = '<p style="color:#e53935;font-size:14px;grid-column:1/-1;text-align:center;padding:24px;">'+escHtml(errMsg)+'</p>';
      return;
    }
    var sources = d.sources || [];
    // alias for block below
    var list = list2, grid = grid2;

    // Mini list for create panel
    if(list){
      if(!sources.length){
        list.innerHTML = '<div style="color:#aaa;font-size:12px;text-align:center;padding:12px;">尚無 QR 來源</div>';
      } else {
        list.innerHTML = sources.map(function(s){
          var url = window.location.origin + '/qr-register?source=' + encodeURIComponent(s.source_id);
          return '<div class="qrmod-src-item'+(s.status==='inactive'?' inactive':'')+'">' +
            '<div class="qrmod-src-header">' +
              '<div class="qrmod-src-name">' + escHtml(s.display_name) + '</div>' +
              '<span class="status-badge ' + (s.status==='active'?'status-active':'status-inactive') + '">' + (s.status==='active'?'啟用':'暫停') + '</span>' +
            '</div>' +
            '<div class="qrmod-src-meta">' +
              (s.event_date ? '📅 '+s.event_date+'&nbsp;&nbsp;':'') +
              (s.location ? '📍 '+escHtml(s.location)+'&nbsp;&nbsp;' : '') +
              '<span style="font-family:monospace;font-size:10px;color:#9CA3AF">'+escHtml(s.source_id)+'</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
              '<div><div class="qrmod-src-count">'+s.member_count+'</div><div style="font-size:10px;color:#6B7280;">已登記會員</div></div>' +
            '</div>' +
            '<div class="qrmod-src-url">'+url+'</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
              '<button class="btn btn-secondary btn-sm" onclick="qrModCopyLink(&apos;'+escHtml(url)+'&apos;)"><i class="fas fa-copy"></i> 複製</button>' +
              '<a class="btn btn-secondary btn-sm" href="'+url+'" target="_blank"><i class="fas fa-eye"></i> 預覽</a>' +
              '<button class="btn btn-secondary btn-sm" onclick="qrModViewStats(&apos;'+escHtml(s.source_id)+'&apos;)"><i class="fas fa-chart-bar"></i> 統計</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="qrModOpenEdit(&apos;'+escHtml(s.source_id)+'&apos;,&apos;'+escHtml(s.display_name)+'&apos;,&apos;'+(s.event_date||'')+'&apos;,&apos;'+escHtml(s.location||'')+'&apos;,&apos;'+escHtml(s.notes||'')+'&apos;)"><i class="fas fa-pen"></i> 編輯</button>' +
              '<button class="btn btn-sm '+(s.status==='active'?'btn-danger':'btn-primary')+'" onclick="qrModToggle(&apos;'+escHtml(s.source_id)+'&apos;,&apos;'+s.status+'&apos;)">'+(s.status==='active'?'⏸ 暫停':'▶ 啟用')+'</button>' +
              '<button class="btn btn-sm" style="background:#FEF2F2;color:#DC2626;border:1px solid #FCA5A5;" onclick="qrModDelete(&apos;'+escHtml(s.source_id)+'&apos;,&apos;'+escHtml(s.display_name)+'&apos;,'+s.member_count+')"><i class="fas fa-trash"></i></button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    // Full grid in sources panel
    if(grid){
      if(!sources.length){
        grid.innerHTML = '<p style="color:#888;font-size:14px;grid-column:1/-1;">尚無QR碼，請點「新增QR碼」</p>';
      } else {
        grid.innerHTML = sources.map(function(s){
          var url = window.location.origin + '/qr-register?source=' + encodeURIComponent(s.source_id);
          var qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(url);
          return '<div class="qrmod-src-item'+(s.status==='inactive'?' inactive':'')+'" style="border-radius:10px;border:1.5px solid #E5E7EB;">' +
            '<div class="qrmod-src-header">' +
              '<div class="qrmod-src-name">'+escHtml(s.display_name)+'</div>' +
              '<span class="status-badge '+(s.status==='active'?'status-active':'status-inactive')+'">'+(s.status==='active'?'啟用':'暫停')+'</span>' +
            '</div>' +
            '<div class="qrmod-src-meta">' +
              (s.event_date?'📅 '+s.event_date+'&nbsp;&nbsp;':'') +
              (s.location?'📍 '+escHtml(s.location)+'&nbsp;&nbsp;':'') +
              '<br><span style="font-family:monospace;font-size:10px;color:#9CA3AF">'+escHtml(s.source_id)+'</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">' +
              '<img src="'+qrApiUrl+'" width="80" height="80" style="border:1.5px solid #E5E7EB;border-radius:6px">' +
              '<div><div class="qrmod-src-count">'+s.member_count+'</div><div style="font-size:10px;color:#6B7280;">已登記會員</div></div>' +
            '</div>' +
            '<div class="qrmod-src-url">'+url+'</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
              '<a class="btn btn-secondary btn-sm" href="'+qrApiUrl+'" target="_blank"><i class="fas fa-download"></i> 下載QR</a>' +
              '<button class="btn btn-secondary btn-sm" onclick="qrModCopyLink(&apos;'+escHtml(url)+'&apos;)"><i class="fas fa-copy"></i> 複製連結</button>' +
              '<a class="btn btn-secondary btn-sm" href="'+url+'" target="_blank"><i class="fas fa-eye"></i> 預覽</a>' +
              '<button class="btn btn-secondary btn-sm" onclick="qrModViewStats(&apos;'+escHtml(s.source_id)+'&apos;)"><i class="fas fa-chart-bar"></i> 統計</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="qrModOpenEdit(&apos;'+escHtml(s.source_id)+'&apos;,&apos;'+escHtml(s.display_name)+'&apos;,&apos;'+(s.event_date||'')+'&apos;,&apos;'+escHtml(s.location||'')+'&apos;,&apos;'+escHtml(s.notes||'')+'&apos;)"><i class="fas fa-pen"></i> 編輯</button>' +
              '<button class="btn btn-sm '+(s.status==='active'?'btn-danger':'btn-primary')+'" onclick="qrModToggle(&apos;'+escHtml(s.source_id)+'&apos;,&apos;'+s.status+'&apos;)">'+(s.status==='active'?'⏸ 暫停':'▶ 啟用')+'</button>' +
              '<button class="btn btn-sm" style="background:#FEF2F2;color:#DC2626;border:1px solid #FCA5A5;" onclick="qrModDelete(&apos;'+escHtml(s.source_id)+'&apos;,&apos;'+escHtml(s.display_name)+'&apos;,'+s.member_count+')"><i class="fas fa-trash"></i> 刪除</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }
  }).catch(function(err){
    console.error('qrModLoadSources error:', err);
    var list = document.getElementById('qrmodSrcList');
    var grid = document.getElementById('qrSourceGrid');
    if(list) list.innerHTML = '<div style="color:#e53935;font-size:13px;padding:12px;text-align:center;"><i class="fas fa-exclamation-triangle"></i> 載入失敗，請確認已登入</div>';
    if(grid) grid.innerHTML = '<p style="color:#e53935;font-size:14px;grid-column:1/-1;text-align:center;padding:24px;"><i class="fas fa-exclamation-triangle"></i> 載入失敗，請確認已登入</p>';
  });
}

function qrModCopyLink(url){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){ alert('已複製連結！'); }).catch(function(){ prompt('複製此連結：',url); });
  } else {
    prompt('複製此連結：',url);
  }
}

function qrModToggle(sourceId, currentStatus){
  var newStatus = currentStatus==='active'?'inactive':'active';
  fetch('/api/admin/qr-sources/'+encodeURIComponent(sourceId),{
    method:'PATCH',
    headers:{'Content-Type':'application/json'},
    credentials: 'include',
    body:JSON.stringify({status:newStatus})
  }).then(function(){ qrModLoadSources(); });
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function qrModOpenEdit(sourceId, displayName, eventDate, location, notes){
  document.getElementById('qrmodEditId').value = sourceId;
  document.getElementById('qrmodEditSourceIdDisplay').value = sourceId;
  document.getElementById('qrmodEditName').value = displayName;
  document.getElementById('qrmodEditDate').value = eventDate || '';
  document.getElementById('qrmodEditLocation').value = location || '';
  document.getElementById('qrmodEditNotes').value = notes || '';
  document.getElementById('qrmodEditErr').style.display = 'none';
  document.getElementById('qrmodEditSaveBtn').disabled = false;
  document.getElementById('qrmodEditSaveBtn').textContent = '💾 儲存變更';
  var overlay = document.getElementById('qrmodEditOverlay');
  overlay.style.display = 'flex';
}

function qrModCloseEdit(){
  document.getElementById('qrmodEditOverlay').style.display = 'none';
}

function qrModSaveEdit(){
  var sourceId = document.getElementById('qrmodEditId').value;
  var displayName = (document.getElementById('qrmodEditName').value||'').trim();
  var eventDate = document.getElementById('qrmodEditDate').value || null;
  var location = (document.getElementById('qrmodEditLocation').value||'').trim() || null;
  var notes = (document.getElementById('qrmodEditNotes').value||'').trim() || null;
  var errEl = document.getElementById('qrmodEditErr');
  errEl.style.display = 'none';
  if(!displayName){ errEl.textContent='請填寫顯示名稱'; errEl.style.display='block'; return; }
  var btn = document.getElementById('qrmodEditSaveBtn');
  btn.disabled = true; btn.textContent = '儲存中…';
  fetch('/api/admin/qr-sources/'+encodeURIComponent(sourceId),{
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    credentials: 'include',
    body: JSON.stringify({display_name:displayName, event_date:eventDate, location:location, notes:notes})
  }).then(function(r){ return r.json(); }).then(function(d){
    btn.disabled = false; btn.textContent = '💾 儲存變更';
    if(d.ok){
      qrModCloseEdit();
      qrModLoadSources();
    } else {
      errEl.textContent = d.error || '更新失敗';
      errEl.style.display = 'block';
    }
  }).catch(function(e){
    btn.disabled = false; btn.textContent = '💾 儲存變更';
    errEl.textContent = '網絡錯誤：'+String(e);
    errEl.style.display = 'block';
  });
}

// ── Delete ─────────────────────────────────────────────────────────────────────
function qrModDelete(sourceId, displayName, memberCount){
  if(memberCount > 0){
    alert('❌ 無法刪除「'+displayName+'」 - 此 QR 來源已有 '+memberCount+' 名會員登記。如不再使用，請改為「暫停」。');
    return;
  }
  if(!confirm('確認刪除「'+displayName+'」（'+sourceId+'）？此操作不可撤銷！')){return;}
  fetch('/api/admin/qr-sources/'+encodeURIComponent(sourceId),{
    method: 'DELETE',
    credentials: 'include'
  }).then(function(r){ return r.json(); }).then(function(d){
    if(d.ok){
      qrModLoadSources();
    } else {
      alert('刪除失敗：'+(d.error||'未知錯誤'));
    }
  }).catch(function(e){ alert('網絡錯誤：'+String(e)); });
}

function qrModViewStats(sourceId){
  qrModTab('stats', document.getElementById('qrtab-stats'));
  var sel = document.getElementById('qrStatsSelect');
  if(sel) sel.value = sourceId;
  qrLoadStats();
}

// ── init when mod-qr is shown ──────────────────────────────────────────────────
function qrLoadAll(){
  qrModLoadSources();
  qrFillSourceSelects();
}

// ══════════════════════════════════════════════════════════════════════════════
// QR TEST PANEL
// ══════════════════════════════════════════════════════════════════════════════
function qrTestInit(){
  // Populate source dropdown from API
  fetch('/api/admin/qr-sources', { credentials:'include' })
  .then(function(r){ return r.json(); })
  .then(function(d){
    var sel = document.getElementById('qrTestSource');
    if(!sel) return;
    sel.innerHTML = '<option value="online_website">online_website（預設）</option>';
    (d.sources||[]).forEach(function(s){
      sel.innerHTML += '<option value="'+escHtml(s.source_id)+'">'+escHtml(s.source_id)+' — '+escHtml(s.display_name)+'</option>';
    });
  }).catch(function(){});
  // Live preview
  ['qrTestPhone','qrTestName','qrTestYear','qrTestSource'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('input', qrTestUpdatePreview);
    if(el) el.addEventListener('change', qrTestUpdatePreview);
  });
  qrTestUpdatePreview();
}

function qrTestUpdatePreview(){
  var name   = (document.getElementById('qrTestName')||{}).value||'...';
  var year   = (document.getElementById('qrTestYear')||{}).value||'...';
  var source = (document.getElementById('qrTestSource')||{}).value||'online_website';
  var pre = document.getElementById('qrTestMsgPreview');
  if(pre) pre.textContent = '姓名:'+name+'\\n年份:'+year+'\\nSource:'+source;
}

function qrTestSubmit(){
  var phone  = ((document.getElementById('qrTestPhone')||{}).value||'').trim();
  var name   = ((document.getElementById('qrTestName')||{}).value||'').trim();
  var yearStr= ((document.getElementById('qrTestYear')||{}).value||'').trim();
  var source = ((document.getElementById('qrTestSource')||{}).value||'online_website').trim();
  var errEl  = document.getElementById('qrTestErr');

  function showErr(msg){ errEl.textContent=msg; errEl.style.display='block'; }
  errEl.style.display='none';

  if(!/^\d{8}$/.test(phone)){ showErr('請輸入8位香港電話號碼'); return; }
  if(!name || name.length<1){ showErr('請輸入姓名'); return; }
  var year = parseInt(yearStr,10);
  if(isNaN(year)||year<1920||year>2011){ showErr('請輸入有效出生年份（1920-2011）'); return; }

  var btn = document.getElementById('qrTestBtn');
  btn.disabled=true; btn.textContent='⏳ 測試中...';

  var resultEl = document.getElementById('qrTestResult');
  resultEl.innerHTML = '<div style="text-align:center;padding:30px;color:#6B7280;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i><div style="margin-top:10px;font-size:13px;">正在模擬 WhatsApp 流程…</div></div>';

  fetch('/api/admin/qr-test-webhook', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ phone: phone, name: name, year: year, source: source })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    btn.disabled=false; btn.textContent='🚀 模擬發送 & 測試登記流程';
    if(d.ok){
      var member = d.member;
      var appUrl = d.app_link || '';
      resultEl.innerHTML =
        '<div style="text-align:center;margin-bottom:16px;">' +
          '<div style="font-size:36px;margin-bottom:8px;">🎉</div>' +
          '<div style="font-size:16px;font-weight:700;color:#065F46;">登記成功！</div>' +
        '</div>' +
        '<div style="background:#F0FDF4;border-radius:8px;border:1px solid #A7F3D0;padding:16px;font-size:13px;line-height:2;">' +
          '<div><strong>會員號碼：</strong><span style="font-family:monospace;font-size:15px;font-weight:900;color:#1B4332;">'+escHtml(member.member_no)+'</span></div>' +
          '<div><strong>姓名：</strong>'+escHtml(member.name_zh)+'</div>' +
          '<div><strong>電話：</strong>'+escHtml(member.phone)+'</div>' +
          '<div><strong>出生年份：</strong>'+escHtml(String(member.birth_year))+'</div>' +
          '<div><strong>會員類型：</strong>'+(member.tier==='PRIMARY'?'主卡（55+）':'家庭卡')+'</div>' +
          '<div><strong>來源渠道：</strong>'+escHtml(member.roadshow_source||'—')+'</div>' +
        '</div>' +
        (appUrl ? '<div style="margin-top:14px;background:#EFF6FF;border-radius:8px;padding:12px 14px;font-size:12px;color:#1E40AF;word-break:break-all;"><strong>📱 會員卡連結（24小時有效）：</strong><br><a href="'+escHtml(appUrl)+'" target="_blank" style="color:#2563EB;">'+escHtml(appUrl)+'</a></div>' : '') +
        '<div style="margin-top:14px;padding:10px 14px;background:#FEF3C7;border-radius:6px;font-size:12px;color:#92400E;">' +
          '⚠️ 這是測試記錄，請到<strong>會員系統</strong>搜尋「'+escHtml(name)+'」後刪除測試資料，或使用不真實的電話號碼測試。' +
        '</div>';
      // Refresh sources count
      qrFillSourceSelects();
    } else {
      resultEl.innerHTML =
        '<div style="text-align:center;padding:20px;">' +
          '<div style="font-size:36px;margin-bottom:8px;">❌</div>' +
          '<div style="font-size:14px;font-weight:700;color:#DC2626;margin-bottom:8px;">'+escHtml(d.error||'未知錯誤')+'</div>' +
          (d.detail ? '<div style="font-size:12px;color:#6B7280;background:#F9FAFB;border-radius:6px;padding:8px 12px;text-align:left;">'+escHtml(d.detail)+'</div>' : '') +
        '</div>';
    }
  })
  .catch(function(e){
    btn.disabled=false; btn.textContent='🚀 模擬發送 & 測試登記流程';
    resultEl.innerHTML = '<div style="text-align:center;padding:20px;color:#DC2626;font-size:13px;">網絡錯誤：'+String(e)+'</div>';
  });
}

// ── LEGACY COMPAT: qrSwitchTab → qrModTab (for any remaining old calls) ───────
function qrSwitchTab(tab, btnEl){ qrModTab(tab, btnEl); }

// ── fill source selects (logs + stats) ────────────────────────────────────────
function qrFillSourceSelects(){
  fetch('/api/admin/qr-sources', { credentials: 'include' })
  .then(function(r){ return r.json(); }).then(function(d){
    var sels = [document.getElementById('qrLogSource'), document.getElementById('qrStatsSelect')];
    sels.forEach(function(sel){
      if(!sel) return;
      var prev = sel.value;
      var baseOpt = sel.id==='qrLogSource' ? '<option value="">全部來源</option>' : '<option value="">── 請選擇 ──</option>';
      sel.innerHTML = baseOpt;
      (d.sources||[]).forEach(function(s){ sel.innerHTML+='<option value="'+escHtml(s.source_id)+'">'+escHtml(s.display_name)+'</option>'; });
      if(prev) sel.value = prev;
    });
  });
}

// ── LOGS ───────────────────────────────────────────────────────────────────────
function qrLoadLogs(){
  var statusEl = document.getElementById('qrLogStatus');
  var sourceEl = document.getElementById('qrLogSource');
  var status = statusEl ? statusEl.value : '';
  var source = sourceEl ? sourceEl.value : '';
  var url='/api/admin/webhook-logs?page='+_qrLogPage;
  if(status) url+='&status='+encodeURIComponent(status);
  if(source) url+='&source='+encodeURIComponent(source);
  fetch(url, { credentials: 'include' }).then(function(r){return r.json();}).then(function(d){
    var rows = d.logs||[];
    var statusMap={success:'成功',format_error:'格式錯誤',invalid_year:'年份無效',duplicate_phone:'重複電話',db_error:'系統錯誤',pending:'處理中',invalid_phone:'電話無效'};
    var html='<table class="qrmod-log-table"><thead><tr><th>時間</th><th>電話</th><th>姓名</th><th>年份</th><th>來源</th><th>狀態</th><th>會員號</th></tr></thead><tbody>';
    rows.forEach(function(l){
      html+='<tr>'+
        '<td style="white-space:nowrap;font-size:11px">'+((l.created_at||'').substring(0,16))+'</td>'+
        '<td>'+qrMaskPhone(l.from_number||'')+'</td>'+
        '<td>'+(l.parsed_name?escHtml(l.parsed_name):'<span style="color:#ccc">—</span>')+'</td>'+
        '<td>'+(l.parsed_year||'<span style="color:#ccc">—</span>')+'</td>'+
        '<td style="font-size:10px;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(l.parsed_source||'')+'">'+(l.parsed_source?escHtml(l.parsed_source):'<span style="color:#ccc">—</span>')+'</td>'+
        '<td><span class="lbadge lb-'+(l.validation_result||'pending')+'">'+(statusMap[l.validation_result]||l.validation_result||'處理中')+'</span></td>'+
        '<td>'+(l.member_no?'<a href="/membership/card/'+escHtml(l.member_no)+'" target="_blank" style="color:#1B4332;font-weight:700">'+escHtml(l.member_no)+'</a>':'<span style="color:#ccc">—</span>')+'</td>'+
      '</tr>';
    });
    html+='</tbody></table>';
    document.getElementById('qrLogsTable').innerHTML = html;
    document.getElementById('qrLogsPager').innerHTML =
      '<button class="btn btn-secondary btn-sm" onclick="_qrLogPage=Math.max(1,_qrLogPage-1);qrLoadLogs()" '+(_qrLogPage<=1?'disabled':'')+'>上一頁</button>'+
      '<span style="font-size:13px;color:#6B7280;padding:0 8px">第 '+_qrLogPage+' 頁 · 共 '+(d.total||0)+' 條</span>'+
      '<button class="btn btn-secondary btn-sm" onclick="_qrLogPage++;qrLoadLogs()" '+((_qrLogPage*50>=(d.total||0))?'disabled':'')+'>下一頁</button>';
  });
}

function qrMaskPhone(p){ if(p.length>=8) return p.substring(0,4)+'****'+p.substring(p.length-2); return p; }

// ── STATS ──────────────────────────────────────────────────────────────────────
function qrViewStats(sourceId){ qrModViewStats(sourceId); }

function qrLoadStats(){
  var sourceId = document.getElementById('qrStatsSelect').value;
  if(!sourceId){ document.getElementById('qrStatsContent').innerHTML='<p style="color:#888;font-size:14px">請選擇一個 QR 來源以查看統計</p>'; return; }
  fetch('/api/admin/qr-sources/'+encodeURIComponent(sourceId)+'/stats', { credentials: 'include' })
  .then(function(r){return r.json();}).then(function(d){
    if(!d.ok){ document.getElementById('qrStatsContent').innerHTML='<p style="color:#dc2626">查詢失敗</p>'; return; }
    var gMap={M:'男',F:'女',Other:'其他','Prefer not to say':'不說','':'未填'};
    var tMap={PRIMARY:'主卡（55+）',FAMILY:'家庭卡'};
    var sMap={incomplete:'未完整',complete:'已完整'};
    var currentYear = new Date().getFullYear();
    var avgAge = d.avg_birth_year ? currentYear - d.avg_birth_year : null;
    var html = '<div class="qrmod-stat-grid">' +
      '<div class="qrmod-stat-box"><div class="qrmod-stat-num">'+d.total+'</div><div class="qrmod-stat-lbl">總登記人數</div></div>' +
      (avgAge?'<div class="qrmod-stat-box"><div class="qrmod-stat-num">'+avgAge+'</div><div class="qrmod-stat-lbl">平均年齡</div></div>':'') +
      (d.birth_year_range&&d.birth_year_range.min?'<div class="qrmod-stat-box"><div class="qrmod-stat-num" style="font-size:15px">'+d.birth_year_range.min+'–'+d.birth_year_range.max+'</div><div class="qrmod-stat-lbl">出生年份範圍</div></div>':'') +
    '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-top:4px">';
    html += '<div><h4 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">📊 會員類型</h4>';
    (d.by_tier||[]).forEach(function(r){ html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F0F0F0;font-size:13px"><span>'+(tMap[r.tier]||r.tier)+'</span><strong>'+r.cnt+'</strong></div>'; });
    html += '</div>';
    html += '<div><h4 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">⚧ 性別分佈</h4>';
    (d.by_gender||[]).forEach(function(r){ html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F0F0F0;font-size:13px"><span>'+(gMap[r.gender||'']||r.gender||'未填')+'</span><strong>'+r.cnt+'</strong></div>'; });
    html += '</div>';
    html += '<div><h4 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">✅ 完成率</h4>';
    (d.by_status||[]).forEach(function(r){ html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F0F0F0;font-size:13px"><span>'+(sMap[r.registration_status]||r.registration_status)+'</span><strong>'+r.cnt+'</strong></div>'; });
    html += '</div>';
    if((d.by_district||[]).length>0){
      html += '<div><h4 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">🗺 地區分佈 (Top 10)</h4>';
      (d.by_district||[]).forEach(function(r){ html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F0F0F0;font-size:13px"><span>'+(r.district||'未填')+'</span><strong>'+r.cnt+'</strong></div>'; });
      html += '</div>';
    }
    html += '</div>';
    document.getElementById('qrStatsContent').innerHTML = html;
  });
}

function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
</script>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- mod-testing: 產品測試計劃 管理面板 -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
<div id="mod-testing" class="mod-page" style="display:none">
<style>
.tst-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;}
.tst-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .15s;}
.tst-btn:disabled{opacity:.5;cursor:not-allowed;}
.tst-btn-primary{background:#7c3aed;color:#fff;}
.tst-btn-secondary{background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;}
.tst-btn-sm{padding:5px 10px;font-size:12px;border-radius:6px;}
.tst-btn-danger{background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;}
.tst-btn-green{background:#f0fdf4;color:#166534;border:1px solid #86efac;}
.tst-btn-orange{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;}
.tst-tabs{display:flex;gap:4px;background:#f3f4f6;border-radius:10px;padding:4px;margin-bottom:20px;overflow-x:auto;}
.tst-tab{flex:none;padding:7px 14px;border-radius:7px;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer;white-space:nowrap;border:none;background:transparent;}
.tst-tab.active{background:#fff;color:#7c3aed;box-shadow:0 1px 4px rgba(0,0,0,0.1);}
.tst-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);}
.tst-campaign-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.tst-campaign-title{font-size:15px;font-weight:800;color:#1f2937;margin-bottom:3px;}
.tst-campaign-sub{font-size:13px;color:#6b7280;}
.tst-status-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;}
.tst-status-draft{background:#f3f4f6;color:#374151;}
.tst-status-pending_review{background:#fef3c7;color:#92400e;}
.tst-status-approved{background:#dbeafe;color:#1e40af;}
.tst-status-live{background:#d1fae5;color:#065f46;}
.tst-status-completed{background:#ede9fe;color:#5b21b6;}
.tst-status-archived{background:#f3f4f6;color:#9ca3af;}
.tst-stats-row{display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;}
.tst-stat-item{text-align:center;background:#f9fafb;border-radius:8px;padding:8px 14px;}
.tst-stat-num{font-size:20px;font-weight:900;color:#7c3aed;}
.tst-stat-lbl{font-size:11px;color:#6b7280;margin-top:1px;}
.tst-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;}
.tst-panel{display:none;}
.tst-panel.active{display:block;}
.tst-detail-hd{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
.tst-back-btn{background:#f3f4f6;border:none;border-radius:8px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;}
.tst-section{margin-bottom:20px;}
.tst-section-title{font-size:13px;font-weight:800;color:#5b21b6;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #ede9fe;}
.tst-field{margin-bottom:12px;}
.tst-label{font-size:12px;font-weight:700;color:#6b7280;margin-bottom:4px;}
.tst-value{font-size:14px;color:#111;}
.tst-form-field{margin-bottom:14px;}
.tst-form-label{display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:5px;}
.tst-input{width:100%;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;background:#fafafa;}
.tst-input:focus{border-color:#7c3aed;outline:none;background:#fff;}
.tst-textarea{resize:vertical;min-height:70px;line-height:1.6;}
.tst-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;}
.tst-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.tst-table{width:100%;border-collapse:collapse;font-size:13px;}
.tst-table th{background:#f9fafb;padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;}
.tst-table td{padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
.tst-table tr:last-child td{border-bottom:none;}
.tst-qr-code{font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;}
.tst-q-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px;}
.tst-q-num{background:#7c3aed;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;}
.tst-q-body{flex:1;}
.tst-q-title{font-size:14px;font-weight:700;color:#1f2937;margin-bottom:3px;}
.tst-q-type{font-size:11px;color:#7c3aed;font-weight:600;}
.tst-funnel{display:flex;flex-direction:column;gap:8px;}
.tst-funnel-row{display:flex;align-items:center;gap:12px;}
.tst-funnel-bar-wrap{flex:1;background:#f3f4f6;border-radius:6px;height:24px;overflow:hidden;}
.tst-funnel-bar{height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa);border-radius:6px;transition:width .5s;}
.tst-funnel-lbl{font-size:12px;color:#374151;width:100px;text-align:right;}
.tst-funnel-num{font-size:13px;font-weight:800;color:#7c3aed;width:30px;}
.tst-review-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px;font-size:13px;color:#92400e;line-height:1.6;}
.tst-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;}
.tst-modal{background:#fff;border-radius:16px;padding:28px 24px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);}
.tst-modal-title{font-size:18px;font-weight:800;color:#1f2937;margin-bottom:18px;}
.tst-modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;}
</style>

<!-- ── Panel: Campaign List ── -->
<div id="tst-panel-list" class="tst-panel active">
  <div class="tst-topbar">
    <div style="font-size:15px;font-weight:800;color:#1f2937;">所有測試計劃</div>
    <button class="tst-btn tst-btn-primary" onclick="tstOpenCreate()"><i class="fas fa-plus"></i> 新增計劃</button>
  </div>
  <div id="tstCampaignList">
    <div style="text-align:center;padding:40px;color:#9ca3af;">載入中…</div>
  </div>
</div>

<!-- ── Panel: Campaign Detail ── -->
<div id="tst-panel-detail" class="tst-panel">
  <div class="tst-detail-hd">
    <button class="tst-back-btn" onclick="tstShowList()">← 返回列表</button>
    <div id="tstDetailTitle" style="font-size:16px;font-weight:800;color:#1f2937;flex:1;"></div>
    <div id="tstDetailBadge"></div>
  </div>
  <div class="tst-tabs" id="tstDetailTabs">
    <button class="tst-tab active" onclick="tstDetailTab('overview',this)">📋 概覽</button>
    <button class="tst-tab" onclick="tstDetailTab('questions',this)">❓ 問卷題目</button>
    <button class="tst-tab" onclick="tstDetailTab('qrcodes',this)">🔖 QR 碼</button>
    <button class="tst-tab" onclick="tstDetailTab('participants',this)">👥 參與者</button>
    <button class="tst-tab" onclick="tstDetailTab('report',this)">📊 報告</button>
  </div>
  <div id="tstDetailContent">
    <div style="text-align:center;padding:40px;color:#9ca3af;">載入中…</div>
  </div>
</div>

<!-- ── Panel: Create/Edit Campaign ── -->
<div id="tst-panel-form" class="tst-panel">
  <div class="tst-detail-hd">
    <button class="tst-back-btn" onclick="tstShowList()">← 返回列表</button>
    <div id="tstFormTitle" style="font-size:16px;font-weight:800;color:#1f2937;flex:1;"></div>
  </div>
  <div id="tstFormMsg" style="display:none;padding:12px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:14px;"></div>
  <div class="tst-card">
    <div class="tst-section-title">基本資料</div>
    <div class="tst-form-field">
      <label class="tst-form-label">計劃名稱 <span style="color:#ef4444">*</span></label>
      <input class="tst-input" id="tstFName" placeholder="例：XX 品牌護膚品測試計劃 2025">
    </div>
    <div class="tst-form-grid">
      <div class="tst-form-field">
        <label class="tst-form-label">品牌名稱 <span style="color:#ef4444">*</span></label>
        <input class="tst-input" id="tstFBrand" placeholder="例：XX 護膚">
      </div>
      <div class="tst-form-field">
        <label class="tst-form-label">產品名稱 <span style="color:#ef4444">*</span></label>
        <input class="tst-input" id="tstFProduct" placeholder="例：深層保濕面霜">
      </div>
    </div>
    <div class="tst-form-field">
      <label class="tst-form-label">品牌標誌 URL</label>
      <input class="tst-input" id="tstFLogo" placeholder="https://…">
    </div>
    <div class="tst-form-field">
      <label class="tst-form-label">品牌描述</label>
      <textarea class="tst-input tst-textarea" id="tstFDesc" rows="3" placeholder="品牌簡介…"></textarea>
    </div>
    <div class="tst-form-grid">
      <div class="tst-form-field">
        <label class="tst-form-label">測試天數</label>
        <select class="tst-input tst-select" id="tstFDuration">
          <option value="7">7 天</option>
          <option value="14" selected>14 天</option>
          <option value="21">21 天</option>
          <option value="28">28 天</option>
        </select>
      </div>
      <div class="tst-form-field">
        <label class="tst-form-label">問卷截止日期</label>
        <input class="tst-input" id="tstFDeadline" placeholder="YYYY-MM-DD">
      </div>
    </div>
    <div class="tst-form-field">
      <label class="tst-form-label">生成品牌填表連結</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input class="tst-input" id="tstFBrandToken" readonly style="flex:1;background:#f9fafb;font-size:12px;font-family:monospace;">
        <button class="tst-btn tst-btn-secondary tst-btn-sm" onclick="tstCopyBrandLink()" style="white-space:nowrap;">📋 複製</button>
      </div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">儲存計劃後自動生成，有效期 30 天</div>
    </div>
  </div>
  <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
    <button class="tst-btn tst-btn-secondary" onclick="tstShowList()">取消</button>
    <button class="tst-btn tst-btn-primary" id="tstFormSaveBtn" onclick="tstSaveCampaign()"><i class="fas fa-save"></i> 儲存</button>
  </div>
</div>
</div><!-- end mod-testing -->

<script>
// ══════════════════════════════════════════════════════════════════════════════
// TESTING MODULE JS
// ══════════════════════════════════════════════════════════════════════════════
var tstCurrentId = null;
var tstCurrentData = null;

var TST_STATUS_LABELS = {
  draft:'草稿', pending_review:'待審核', approved:'已批准', live:'進行中', completed:'已完成', archived:'已封存'
};
var TST_Q_TYPE_LABELS = {
  rating:'評分', yes_no:'是/否', single_choice:'單選', multi_choice:'多選', text:'文字'
};
var TST_PARTICIPANT_STATUS = {
  registered:'已登記', sample_claimed:'已取樣品',
  survey_started:'填寫中', survey_submitted:'已提交', reward_sent:'已發獎勵'
};

function tstEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function tstPanel(id){
  document.querySelectorAll('#mod-testing .tst-panel').forEach(function(p){p.classList.remove('active');});
  document.getElementById(id).classList.add('active');
}

function tstShowList(){ tstPanel('tst-panel-list'); testingLoadCampaigns(); }

function tstStatusBadge(status){
  return '<span class="tst-status-badge tst-status-'+tstEsc(status)+'">'+(TST_STATUS_LABELS[status]||status)+'</span>';
}

// ── Load campaign list ──────────────────────────────────────────────────────
function testingLoadCampaigns(){
  var el = document.getElementById('tstCampaignList');
  el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">載入中…</div>';
  fetch('/api/admin/testing/campaigns',{credentials:'include'})
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.ok||!(d.campaigns||[]).length){
      el.innerHTML='<div style="text-align:center;padding:40px;color:#9ca3af;">尚未有測試計劃。點擊「新增計劃」開始。</div>';
      return;
    }
    var html='';
    d.campaigns.forEach(function(c){
      html+='<div class="tst-card">'+
        '<div class="tst-campaign-hd">'+
          '<div style="flex:1;">'+
            '<div class="tst-campaign-title">'+tstEsc(c.campaign_name)+'</div>'+
            '<div class="tst-campaign-sub">'+tstEsc(c.brand_name)+' ／ '+tstEsc(c.product_name)+'</div>'+
          '</div>'+
          tstStatusBadge(c.status)+
        '</div>'+
        '<div class="tst-stats-row">'+
          '<div class="tst-stat-item"><div class="tst-stat-num">'+(c.total_participants||0)+'</div><div class="tst-stat-lbl">參與者</div></div>'+
          '<div class="tst-stat-item"><div class="tst-stat-num">'+(c.submitted_count||0)+'</div><div class="tst-stat-lbl">已提交</div></div>'+
          '<div class="tst-stat-item"><div class="tst-stat-num">'+(c.qr_count||0)+'</div><div class="tst-stat-lbl">QR 碼</div></div>'+
          '<div class="tst-stat-item"><div class="tst-stat-num">'+(c.testing_duration_days||14)+'天</div><div class="tst-stat-lbl">測試期</div></div>'+
        '</div>'+
        '<div class="tst-actions">'+
          '<button class="tst-btn tst-btn-secondary tst-btn-sm" onclick="tstViewDetail('+c.id+')"><i class="fas fa-eye"></i> 查看</button>'+
          (c.status==='draft'?'<button class="tst-btn tst-btn-secondary tst-btn-sm" onclick="tstOpenEdit('+c.id+')"><i class="fas fa-edit"></i> 編輯</button>':'')+
          (c.status==='draft'?'<button class="tst-btn tst-btn-orange tst-btn-sm" onclick="tstSubmitReview('+c.id+')">📤 提交審核</button>':'')+
          (c.status==='pending_review'?'<button class="tst-btn tst-btn-green tst-btn-sm" onclick="tstApprove('+c.id+')">✅ 批准</button><button class="tst-btn tst-btn-danger tst-btn-sm" onclick="tstReject('+c.id+')">❌ 拒絕</button>':'')+
          (c.status==='approved'?'<button class="tst-btn tst-btn-green tst-btn-sm" onclick="tstPublish('+c.id+')">🚀 發佈上線</button>':'')+
          (c.status==='draft'?'<button class="tst-btn tst-btn-danger tst-btn-sm" onclick="tstDeleteCampaign('+c.id+',this.dataset.name)" data-name="'+tstEsc(c.campaign_name)+'"><i class="fas fa-trash"></i></button>':'')+
        '</div>'+
      '</div>';
    });
    el.innerHTML=html;
  }).catch(function(){ el.innerHTML='<div style="text-align:center;padding:40px;color:#ef4444;">載入失敗</div>'; });
}

// ── Create / Edit ───────────────────────────────────────────────────────────
function tstOpenCreate(){
  tstCurrentId=null; tstCurrentData=null;
  document.getElementById('tstFormTitle').textContent='新增測試計劃';
  ['tstFName','tstFBrand','tstFProduct','tstFLogo','tstFDesc','tstFDeadline','tstFBrandToken'].forEach(function(id){
    document.getElementById(id).value='';
  });
  document.getElementById('tstFDuration').value='14';
  document.getElementById('tstFormMsg').style.display='none';
  tstPanel('tst-panel-form');
}

function tstOpenEdit(id){
  fetch('/api/admin/testing/campaigns/'+id,{credentials:'include'})
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.ok){alert('載入失敗');return;}
    var c=d.campaign;
    tstCurrentId=id; tstCurrentData=d;
    document.getElementById('tstFormTitle').textContent='編輯計劃：'+c.campaign_name;
    document.getElementById('tstFName').value=c.campaign_name||'';
    document.getElementById('tstFBrand').value=c.brand_name||'';
    document.getElementById('tstFProduct').value=c.product_name||'';
    document.getElementById('tstFLogo').value=c.brand_logo_url||'';
    document.getElementById('tstFDesc').value=c.brand_description||'';
    document.getElementById('tstFDuration').value=String(c.testing_duration_days||14);
    document.getElementById('tstFDeadline').value=c.survey_deadline||'';
    if(c.brand_form_token){
      document.getElementById('tstFBrandToken').value=location.origin+'/brand-form?token='+c.brand_form_token;
    }
    document.getElementById('tstFormMsg').style.display='none';
    tstPanel('tst-panel-form');
  });
}

function tstSaveCampaign(){
  var name=document.getElementById('tstFName').value.trim();
  var brand=document.getElementById('tstFBrand').value.trim();
  var product=document.getElementById('tstFProduct').value.trim();
  if(!name||!brand||!product){
    tstShowFormMsg('請填寫計劃名稱、品牌名稱及產品名稱','#fef2f2','#991b1b');return;
  }
  var payload={
    campaign_name:name, brand_name:brand, product_name:product,
    brand_logo_url:document.getElementById('tstFLogo').value.trim()||null,
    brand_description:document.getElementById('tstFDesc').value.trim(),
    testing_duration_days:parseInt(document.getElementById('tstFDuration').value)||14,
    survey_deadline:document.getElementById('tstFDeadline').value.trim()||null
  };
  var btn=document.getElementById('tstFormSaveBtn');
  btn.disabled=true; btn.textContent='儲存中…';
  var url=tstCurrentId?'/api/admin/testing/campaigns/'+tstCurrentId:'/api/admin/testing/campaigns';
  var method=tstCurrentId?'PUT':'POST';
  fetch(url,{method:method,credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
  .then(function(r){return r.json();})
  .then(function(d){
    btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> 儲存';
    if(d.ok){
      var cid=d.id||(d.campaign&&d.campaign.id)||tstCurrentId;
      if(d.brand_form_token){
        document.getElementById('tstFBrandToken').value=location.origin+'/brand-form?token='+d.brand_form_token;
      }
      tstShowFormMsg('儲存成功！','#f0fdf4','#166534');
      if(!tstCurrentId && cid){ tstCurrentId=cid; }
    } else {
      tstShowFormMsg(d.error||'儲存失敗','#fef2f2','#991b1b');
    }
  }).catch(function(){
    btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> 儲存';
    tstShowFormMsg('網絡錯誤，請重試','#fef2f2','#991b1b');
  });
}

function tstShowFormMsg(text, bg, color){
  var el=document.getElementById('tstFormMsg');
  el.textContent=text; el.style.background=bg; el.style.color=color;
  el.style.border='1px solid '+color; el.style.display='block';
}

function tstCopyBrandLink(){
  var val=document.getElementById('tstFBrandToken').value;
  if(!val){alert('請先儲存計劃以生成連結');return;}
  navigator.clipboard.writeText(val).then(function(){alert('連結已複製！');}).catch(function(){
    prompt('請手動複製連結：',val);
  });
}

// ── Status actions ──────────────────────────────────────────────────────────
function tstSubmitReview(id){
  if(!confirm('確定提交此計劃供審核？')) return;
  fetch('/api/admin/testing/campaigns/'+id+'/approve',{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'submit_review'})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok) testingLoadCampaigns(); else alert(d.error||'操作失敗');
  });
}

function tstApprove(id){
  if(!confirm('確定批准此計劃？')) return;
  fetch('/api/admin/testing/campaigns/'+id+'/approve',{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'approve'})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok) testingLoadCampaigns(); else alert(d.error||'操作失敗');
  });
}

function tstReject(id){
  var comments=prompt('請輸入拒絕原因（選填）：','');
  if(comments===null) return;
  fetch('/api/admin/testing/campaigns/'+id+'/approve',{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'reject',comments:comments})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok) testingLoadCampaigns(); else alert(d.error||'操作失敗');
  });
}

function tstPublish(id){
  if(!confirm('確定發佈此計劃上線？發佈後參與者可掃描 QR 碼加入。')) return;
  fetch('/api/admin/testing/campaigns/'+id+'/publish',{
    method:'POST',credentials:'include'
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok) testingLoadCampaigns(); else alert(d.error||'操作失敗');
  });
}

function tstDeleteCampaign(id, nameOrEl){
  var name = (nameOrEl && typeof nameOrEl === 'object') ? (nameOrEl.dataset&&nameOrEl.dataset.name)||'' : (nameOrEl||'');
  if(!confirm('確定刪除計劃「'+name+'」？此操作不可撤銷。')) return;
  fetch('/api/admin/testing/campaigns/'+id,{
    method:'DELETE',credentials:'include'
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok) testingLoadCampaigns(); else alert(d.error||'刪除失敗');
  });
}

// ── Detail view ─────────────────────────────────────────────────────────────
function tstViewDetail(id){
  tstCurrentId=id;
  tstPanel('tst-panel-detail');
  document.getElementById('tstDetailContent').innerHTML='<div style="text-align:center;padding:40px;color:#9ca3af;">載入中…</div>';
  tstLoadDetailData(id,'overview');
}

function tstDetailTab(tab, btn){
  document.querySelectorAll('#tstDetailTabs .tst-tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active');
  tstLoadDetailData(tstCurrentId, tab);
}

function tstLoadDetailData(id, tab){
  var el=document.getElementById('tstDetailContent');
  el.innerHTML='<div style="text-align:center;padding:40px;color:#9ca3af;">載入中…</div>';

  if(tab==='overview'){
    fetch('/api/admin/testing/campaigns/'+id,{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok){el.innerHTML='<div style="color:#ef4444">載入失敗</div>';return;}
      var c=d.campaign;
      tstCurrentData=d;
      document.getElementById('tstDetailTitle').textContent=c.campaign_name;
      document.getElementById('tstDetailBadge').innerHTML=tstStatusBadge(c.status);
      var brandLink=c.brand_form_token?(location.origin+'/brand-form?token='+c.brand_form_token):'（尚未生成）';
      var reviewHtml=c.review_comments?'<div class="tst-review-box">📝 審核備注：'+tstEsc(c.review_comments)+'</div>':'';
      var html=''+
        reviewHtml+
        '<div class="tst-card">'+
          '<div class="tst-section-title">基本資料</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'+
            '<div><div class="tst-label">品牌名稱</div><div class="tst-value">'+tstEsc(c.brand_name)+'</div></div>'+
            '<div><div class="tst-label">產品名稱</div><div class="tst-value">'+tstEsc(c.product_name)+'</div></div>'+
            '<div><div class="tst-label">測試天數</div><div class="tst-value">'+tstEsc(String(c.testing_duration_days||14))+' 天</div></div>'+
            '<div><div class="tst-label">問卷截止</div><div class="tst-value">'+tstEsc(c.survey_deadline||'—')+'</div></div>'+
          '</div>'+
          (c.brand_description?'<div style="margin-top:10px;"><div class="tst-label">品牌描述</div><div class="tst-value" style="white-space:pre-wrap">'+tstEsc(c.brand_description)+'</div></div>':'')+
        '</div>'+
        '<div class="tst-card">'+
          '<div class="tst-section-title">品牌填表連結</div>'+
          '<div style="display:flex;align-items:center;gap:8px;">'+
            '<input style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:monospace;background:#f9fafb;" readonly value="'+tstEsc(brandLink)+'">'+
            (c.brand_form_token?'<button class="tst-btn tst-btn-secondary tst-btn-sm" data-url="'+tstEsc(brandLink)+'" onclick="navigator.clipboard.writeText(this.dataset.url).then(function(){alert(&apos;已複製！&apos;)})">📋</button>':'')+
          '</div>'+
          '<div style="font-size:11px;color:#6b7280;margin-top:4px;">品牌可使用此連結填寫詳細資料</div>'+
        '</div>'+
        '<div class="tst-card">'+
          '<div class="tst-section-title">WhatsApp 範本</div>'+
          ['welcome','reminder1','reminder2','complete'].map(function(k){
            var labels={welcome:'歡迎訊息',reminder1:'第一次提醒',reminder2:'第二次提醒',complete:'完成感謝'};
            var val=c['wa_template_'+k]||'';
            return val?'<div style="margin-bottom:10px;"><div class="tst-label">'+labels[k]+'</div><div style="background:#f9fafb;border-radius:6px;padding:10px;font-size:13px;white-space:pre-wrap;color:#374151">'+tstEsc(val)+'</div></div>':'';
          }).join('')+
        '</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">'+
          (c.status==='draft'?'<button class="tst-btn tst-btn-secondary" onclick="tstOpenEdit('+id+')"><i class="fas fa-edit"></i> 編輯</button>':'')+
          (c.status==='draft'?'<button class="tst-btn tst-btn-orange" onclick="tstSubmitReview('+id+')">📤 提交審核</button>':'')+
          (c.status==='pending_review'?'<button class="tst-btn tst-btn-green" onclick="tstApprove('+id+')">✅ 批准</button><button class="tst-btn tst-btn-danger" onclick="tstReject('+id+')">❌ 拒絕</button>':'')+
          (c.status==='approved'?'<button class="tst-btn tst-btn-primary" onclick="tstPublish('+id+')">🚀 發佈上線</button>':'')+
        '</div>';
      el.innerHTML=html;
    }).catch(function(){el.innerHTML='<div style="color:#ef4444">載入失敗</div>';});
  }

  else if(tab==='questions'){
    fetch('/api/admin/testing/campaigns/'+id,{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      var questions=d.questions||[];
      var html='<div class="tst-card">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'+
          '<div class="tst-section-title" style="margin:0">問卷題目（共 '+questions.length+' 題）</div>'+
          '<button class="tst-btn tst-btn-primary tst-btn-sm" onclick="tstOpenAddQuestion('+id+')">＋ 新增題目</button>'+
        '</div>';
      if(!questions.length){
        html+='<div style="text-align:center;padding:24px;color:#9ca3af;">尚未有題目</div>';
      } else {
        questions.sort(function(a,b){return a.question_order-b.question_order;});
        // Group consecutive rating questions into one display item
        var displayNum=1;
        var qi=0;
        while(qi<questions.length){
          var q=questions[qi];
          if(q.question_type==='rating'){
            // Collect all consecutive rating questions
            var ratingGroup=[];
            while(qi<questions.length && questions[qi].question_type==='rating'){
              ratingGroup.push(questions[qi]); qi++;
            }
            html+='<div class="tst-q-card">'+
              '<div class="tst-q-num">'+displayNum+'</div>'+
              '<div class="tst-q-body">'+
                '<div class="tst-q-title">\u8acb\u70ba\u4ee5\u4e0b\u9805\u76ee\u8a55\u5206\uff1a<span style="font-size:12px;font-weight:400;color:#6b7280;">\uff081-5\u5206\uff09</span></div>'+
                '<div class="tst-q-type">\u8a55\u5206\u8868\uff08'+ratingGroup.length+'\u9805\uff09&nbsp;&nbsp;<span style="color:#ef4444;font-size:11px;">\u5fc5\u586b</span></div>'+
                '<div style="margin-top:6px;font-size:12px;color:#6b7280;">'+
                  ratingGroup.map(function(rq,ri){ return (ri+1)+'. '+tstEsc(rq.title.replace(/^\u8a55\u5206[\uff1a:]\s*/,'')); }).join('&emsp;')+
                '</div>'+
              '</div>'+
            '</div>';
            displayNum++;
          } else {
            var optsHtml='';
            if(q.options){
              try{
                var opts=JSON.parse(q.options);
                if(opts.length) optsHtml='<div style="margin-top:6px;font-size:12px;color:#6b7280;">\u9078\u9805\uff1a'+opts.map(function(o){return tstEsc(o);}).join(' \uff0f ')+'</div>';
              }catch(e){}
            }
            html+='<div class="tst-q-card">'+
              '<div class="tst-q-num">'+displayNum+'</div>'+
              '<div class="tst-q-body">'+
                '<div class="tst-q-title">'+tstEsc(q.title)+(q.is_required?'  <span style="color:#ef4444;font-size:11px;">\u5fc5\u586b</span>':'')+'</div>'+
                '<div class="tst-q-type">'+(TST_Q_TYPE_LABELS[q.question_type]||q.question_type)+'</div>'+
                optsHtml+
              '</div>'+
              '<div style="display:flex;gap:6px;">'+
                '<button class="tst-btn tst-btn-secondary tst-btn-sm" onclick="tstDeleteQuestion('+q.id+','+id+')"><i class="fas fa-trash" style="color:#ef4444"></i></button>'+
              '</div>'+
            '</div>';
            displayNum++;
            qi++;
          }
        }
      }
      html+='</div>';
      el.innerHTML=html;
    }).catch(function(){el.innerHTML='<div style="color:#ef4444">載入失敗</div>';});
  }

  else if(tab==='qrcodes'){
    fetch('/api/admin/testing/campaigns/'+id,{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      var qrs=d.qr_codes||[];
      var html='<div class="tst-card">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'+
          '<div class="tst-section-title" style="margin:0">QR 碼（共 '+qrs.length+' 個）</div>'+
          '<button class="tst-btn tst-btn-primary tst-btn-sm" onclick="tstAddQR('+id+')">＋ 新增 QR 碼</button>'+
        '</div>'+
        '<table class="tst-table">'+
          '<thead><tr><th>標籤</th><th>追蹤碼</th><th>掃描次數</th><th>狀態</th><th>掃描連結</th></tr></thead>'+
          '<tbody>';
      if(!qrs.length){
        html+='<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">尚未有 QR 碼</td></tr>';
      } else {
        qrs.forEach(function(q){
          var scanUrl=location.origin+'/testing/scan/'+q.tracking_code;
          html+='<tr>'+
            '<td>'+tstEsc(q.label||'—')+'</td>'+
            '<td><span class="tst-qr-code">'+tstEsc(q.tracking_code)+'</span></td>'+
            '<td>'+tstEsc(String(q.scanned_count||0))+'</td>'+
            '<td>'+(q.status==='active'?'<span style="color:#166534;font-weight:700;">✅ 啟用</span>':'<span style="color:#9ca3af;">停用</span>')+'</td>'+
            '<td><a href="'+tstEsc(scanUrl)+'" target="_blank" style="font-size:11px;color:#7c3aed;word-break:break-all;">'+tstEsc(scanUrl)+'</a>'+
              ' <button class="tst-btn tst-btn-secondary tst-btn-sm" data-url="'+tstEsc(scanUrl)+'" onclick="navigator.clipboard.writeText(this.dataset.url).then(function(){alert(&apos;已複製！&apos;)})">📋</button>'+
            '</td>'+
          '</tr>';
        });
      }
      html+='</tbody></table></div>';
      el.innerHTML=html;
    }).catch(function(){el.innerHTML='<div style="color:#ef4444">載入失敗</div>';});
  }

  else if(tab==='participants'){
    fetch('/api/admin/testing/campaigns/'+id+'/participants',{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      var ps=d.participants||[];
      var html='<div class="tst-card">'+
        '<div class="tst-section-title">參與者列表（'+ps.length+' 人）</div>'+
        '<table class="tst-table">'+
          '<thead><tr><th>會員編號</th><th>姓名</th><th>狀態</th><th>登記時間</th><th>WA 操作</th></tr></thead>'+
          '<tbody>';
      if(!ps.length){
        html+='<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">尚未有參與者</td></tr>';
      } else {
        ps.forEach(function(p){
          var statusLabel=TST_PARTICIPANT_STATUS[p.status]||p.status;
          var statusColor={'registered':'#374151','sample_claimed':'#c2410c','survey_started':'#1e40af','survey_submitted':'#166534','reward_sent':'#5b21b6'}[p.status]||'#374151';
          html+='<tr>'+
            '<td><span class="tst-qr-code">'+tstEsc(p.member_no)+'</span></td>'+
            '<td>'+tstEsc(p.member_name||'—')+'</td>'+
            '<td><span style="color:'+statusColor+';font-weight:700;">'+tstEsc(statusLabel)+'</span></td>'+
            '<td style="font-size:12px;color:#6b7280;">'+tstEsc((p.registered_at||'').slice(0,16))+'</td>'+
            '<td>'+
              (p.status==='survey_submitted'?'<button class="tst-btn tst-btn-primary tst-btn-sm" data-pid="'+p.id+'" onclick="tstViewResponses(this.dataset.pid)">📋 查看答案</button> ':'')+
              '<button class="tst-btn tst-btn-secondary tst-btn-sm" data-pid="'+p.id+'" data-mt="welcome" onclick="tstSendWA(this.dataset.pid,this.dataset.mt)">歡迎</button> '+
              '<button class="tst-btn tst-btn-secondary tst-btn-sm" data-pid="'+p.id+'" data-mt="reminder1" onclick="tstSendWA(this.dataset.pid,this.dataset.mt)">提醒1</button> '+
              '<button class="tst-btn tst-btn-secondary tst-btn-sm" data-pid="'+p.id+'" data-mt="complete" onclick="tstSendWA(this.dataset.pid,this.dataset.mt)">完成</button>'+
            '</td>'+
          '</tr>';
        });
      }
      html+='</tbody></table></div>';
      el.innerHTML=html;
    }).catch(function(){el.innerHTML='<div style="color:#ef4444">載入失敗</div>';});
  }

  else if(tab==='report'){
    fetch('/api/admin/testing/campaigns/'+id+'/report',{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok){el.innerHTML='<div style="color:#ef4444">載入失敗</div>';return;}
      var r=d.report;
      var funnel=r.funnel||{};
      var total=funnel.registered||0;
      function pct(n){ return total>0?Math.round(n/total*100):0; }
      var html='<div class="tst-card">'+
        '<div class="tst-section-title">參與漏斗</div>'+
        '<div class="tst-funnel">'+
          tstFunnelRow('已登記',funnel.registered||0,pct(funnel.registered||0))+
          tstFunnelRow('已取樣品',funnel.sample_claimed||0,pct(funnel.sample_claimed||0))+
          tstFunnelRow('填寫中',funnel.survey_started||0,pct(funnel.survey_started||0))+
          tstFunnelRow('已提交',funnel.survey_submitted||0,pct(funnel.survey_submitted||0))+
          tstFunnelRow('已發獎勵',funnel.reward_sent||0,pct(funnel.reward_sent||0))+
        '</div>'+
        (r.avg_completion_minutes?'<div style="margin-top:12px;font-size:13px;color:#6b7280;">平均完成時間：<strong>'+Math.round(r.avg_completion_minutes)+' 分鐘</strong></div>':'')+
      '</div>';
      // Per-question stats
      var qs=r.question_stats||[];
      qs.forEach(function(q){
        html+='<div class="tst-card">'+
          '<div class="tst-section-title">'+tstEsc(q.title)+'</div>'+
          '<div style="font-size:12px;color:#7c3aed;margin-bottom:10px;">'+(TST_Q_TYPE_LABELS[q.question_type]||q.question_type)+' ／ 回答人數：'+(q.response_count||0)+'</div>';
        if(q.question_type==='rating' && q.avg_rating){
          var stars=Math.round(q.avg_rating);
          html+='<div style="font-size:28px;margin-bottom:6px;">'+'★'.repeat(stars)+'☆'.repeat(5-stars)+'</div>'+
            '<div style="font-size:20px;font-weight:900;color:#7c3aed;">'+parseFloat(q.avg_rating).toFixed(1)+' / 5</div>';
        } else if(q.options_breakdown){
          html+='<div>';
          (q.options_breakdown||[]).forEach(function(opt){
            html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'+
              '<div style="width:120px;font-size:13px;color:#374151;">'+tstEsc(opt.answer)+'</div>'+
              '<div style="flex:1;background:#f3f4f6;border-radius:4px;height:16px;overflow:hidden;">'+
                '<div style="height:100%;background:#7c3aed;width:'+opt.pct+'%;border-radius:4px;"></div>'+
              '</div>'+
              '<div style="font-size:13px;font-weight:700;color:#7c3aed;width:40px;">'+opt.count+'</div>'+
            '</div>';
          });
          html+='</div>';
        } else if(q.question_type==='text'){
          html+='<div style="font-size:12px;color:#6b7280;">（文字回答，請查看個別參與者資料）</div>';
        }
        html+='</div>';
      });
      el.innerHTML=html;
    }).catch(function(){el.innerHTML='<div style="color:#ef4444">載入失敗</div>';});
  }
}

function tstFunnelRow(label, num, pct){
  return '<div class="tst-funnel-row">'+
    '<div class="tst-funnel-lbl">'+tstEsc(label)+'</div>'+
    '<div class="tst-funnel-bar-wrap"><div class="tst-funnel-bar" style="width:'+pct+'%"></div></div>'+
    '<div class="tst-funnel-num">'+num+'</div>'+
  '</div>';
}

// ── View Participant Responses ───────────────────────────────────────────────
function tstViewResponses(pid){
  fetch('/api/admin/testing/participants/'+pid+'/responses',{credentials:'include'})
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.ok){alert(d.error||'載入失敗');return;}
    var p=d.participant;
    var qs=d.questions||[];
    var TST_Q_LABELS={'rating':'\u8a55\u5206','single_choice':'\u55ae\u9078','multi_choice':'\u591a\u9078','text':'\u6587\u5b57','yes_no':'\u662f\u5426'};
    var html='<div style="font-weight:800;font-size:16px;margin-bottom:4px;">'+tstEsc(p.member_name||p.member_no)+'</div>'+
      '<div style="font-size:12px;color:#6b7280;margin-bottom:16px;">'+tstEsc(p.member_no)+' ／ \u63d0\u4ea4\u6642\u9593\uff1a'+tstEsc((p.survey_submitted_at||'').slice(0,16))+'</div>';
    // Group consecutive rating questions into one table block
    var displayNum=1;
    var ri=0;
    while(ri<qs.length){
      var q=qs[ri];
      if(q.question_type==='rating'){
        var rGroup=[];
        while(ri<qs.length && qs[ri].question_type==='rating'){ rGroup.push(qs[ri]); ri++; }
        html+='<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f3f4f6;">'+
          '<div style="font-size:12px;color:#7c3aed;font-weight:700;margin-bottom:8px;">Q'+displayNum+'. \u8acb\u70ba\u4ee5\u4e0b\u9805\u76ee\u8a55\u5206\uff1a</div>'+
          '<table style="width:100%;border-collapse:collapse;font-size:13px;">'+
          '<thead><tr>'+
            '<th style="text-align:left;padding:4px 8px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">\u9805\u76ee</th>'+
            '<th style="text-align:center;padding:4px 8px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">\u5206\u6578</th>'+
          '</tr></thead><tbody>';
        rGroup.forEach(function(rq){
          var label=rq.title.replace(/^\u8a55\u5206[\uff1a:]\s*/,'');
          var ans=rq.answer||'';
          var stars='';
          if(ans){ for(var si=0;si<5;si++){ stars+=si<parseInt(ans)?'\u2605':'\u2606'; } }
          html+='<tr style="border-bottom:1px solid #f9fafb;">'+
            '<td style="padding:6px 8px;color:#374151;">'+tstEsc(label)+'</td>'+
            '<td style="text-align:center;padding:6px 8px;">'+
              (ans?'<span style="color:#7c3aed;font-weight:700;font-size:15px;">'+stars+' '+tstEsc(ans)+'</span>':'<span style="color:#d1d5db;">\u672a\u4f5c\u7b54</span>')+
            '</td>'+
          '</tr>';
        });
        html+='</tbody></table></div>';
        displayNum++;
      } else {
        var ans2=q.answer||'';
        var ansHtml2=ans2?('<span style="color:#1f2937;font-weight:700;">'+tstEsc(ans2)+'</span>'):'<span style="color:#d1d5db;">\u672a\u4f5c\u7b54</span>';
        html+='<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f3f4f6;">'+
          '<div style="font-size:12px;color:#7c3aed;font-weight:700;margin-bottom:3px;">Q'+displayNum+'. '+tstEsc(q.title)+'</div>'+
          '<div style="font-size:14px;padding:8px 10px;background:#f9fafb;border-radius:8px;">'+ansHtml2+'</div>'+
        '</div>';
        displayNum++;
        ri++;
      }
    }
    var modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML='<div style="background:#fff;border-radius:16px;width:100%;max-width:520px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'+
      '<div style="padding:16px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">'+
        '<div style="font-size:16px;font-weight:900;color:#1f2937;">\ud83d\udcdd \u554f\u5377\u56de\u7b54</div>'+
        '<button id="tst-resp-modal-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#9ca3af;">\u00d7</button>'+
      '</div>'+
      '<div style="padding:16px 18px;overflow-y:auto;">'+html+'</div>'+
    '</div>';
    document.body.appendChild(modal);
    modal.querySelector('#tst-resp-modal-close').addEventListener('click',function(){modal.remove();});
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  }).catch(function(){alert('\u8f09\u5165\u5931\u6557');});
}

// ── Add QR Code ─────────────────────────────────────────────────────────────
function tstAddQR(cid){
  var label=prompt('請輸入此 QR 碼的標籤（例：Exhibition A / 門市 B）：','');
  if(label===null) return;
  fetch('/api/admin/testing/campaigns/'+cid+'/qr-codes',{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({label:label})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok){ tstLoadDetailData(cid,'qrcodes'); }
    else alert(d.error||'生成失敗');
  });
}

// ── Add Question modal ───────────────────────────────────────────────────────
function tstCloseQModal(){ var m=document.getElementById('tstQModal'); if(m) m.remove(); }
function tstOpenAddQuestion(cid){
  var html='<div class="tst-modal-overlay" id="tstQModal" onclick="if(event.target===this)this.remove()">'+
    '<div class="tst-modal">'+
      '<div class="tst-modal-title">新增問卷題目</div>'+
      '<div class="tst-form-field"><label class="tst-form-label">題型</label>'+
        '<select class="tst-input tst-select" id="tstQType" onchange="tstQTypeChange()">'+
          '<option value="rating">評分（1-5 星）</option>'+
          '<option value="yes_no">是 / 否</option>'+
          '<option value="single_choice">單選題</option>'+
          '<option value="multi_choice">多選題</option>'+
          '<option value="text">文字回答</option>'+
        '</select></div>'+
      '<div class="tst-form-field"><label class="tst-form-label">題目內容 <span style="color:#ef4444">*</span></label>'+
        '<input class="tst-input" id="tstQTitle" placeholder="例：您對產品的整體評分？"></div>'+
      '<div id="tstQOptsWrap"></div>'+
      '<div class="tst-modal-footer">'+
        '<button class="tst-btn tst-btn-secondary" onclick="tstCloseQModal()">取消</button>'+
        '<button class="tst-btn tst-btn-primary" onclick="tstSaveQuestion('+cid+')">新增</button>'+
      '</div>'+
    '</div>'+
  '</div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function tstQTypeChange(){
  var type=document.getElementById('tstQType').value;
  var wrap=document.getElementById('tstQOptsWrap');
  if(type==='single_choice'||type==='multi_choice'){
    wrap.innerHTML='<div class="tst-form-field"><label class="tst-form-label">選項（每行一個）</label>'+
      '<textarea class="tst-input tst-textarea" id="tstQOpts" placeholder="選項 1&#10;選項 2&#10;選項 3" rows="4"></textarea></div>';
  } else {
    wrap.innerHTML='';
  }
}

function tstSaveQuestion(cid){
  var type=document.getElementById('tstQType').value;
  var title=document.getElementById('tstQTitle').value.trim();
  if(!title){alert('請輸入題目內容');return;}
  var options=[];
  if((type==='single_choice'||type==='multi_choice') && document.getElementById('tstQOpts')){
    options=document.getElementById('tstQOpts').value.split(String.fromCharCode(10)).map(function(s){return s.trim();}).filter(function(s){return s;});
  }
  fetch('/api/admin/testing/campaigns/'+cid+'/questions',{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({question_type:type,title:title,options:options,is_required:1})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok){
      var m=document.getElementById('tstQModal'); if(m) m.remove();
      tstLoadDetailData(cid,'questions');
    } else alert(d.error||'新增失敗');
  });
}

function tstDeleteQuestion(qid, cid){
  if(!confirm('確定刪除此題目？')) return;
  fetch('/api/admin/testing/questions/'+qid,{method:'DELETE',credentials:'include'})
  .then(function(r){return r.json()}).then(function(d){
    if(d.ok) tstLoadDetailData(cid,'questions'); else alert(d.error||'刪除失敗');
  });
}

// ── Send WA ─────────────────────────────────────────────────────────────────
function tstSendWA(participantId, type){
  fetch('/api/admin/testing/send-whatsapp',{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({participant_id:participantId,message_type:type})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok && d.wa_url){
      window.open(d.wa_url,'_blank');
    } else {
      alert(d.error||'無法生成 WhatsApp 連結');
    }
  });
}
</script>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- mod-benefits: 福利管理面板 -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
<div id="mod-benefits" class="mod-page" style="display:none">
<style>
.bnf-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap;}
.bnf-cat-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;}
.bnf-cat-tab{padding:6px 14px;border-radius:20px;border:2px solid #e0e0e0;background:#fff;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s;}
.bnf-cat-tab.active{background:#1B4332;color:#fff;border-color:#1B4332;}
.bnf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;}
.bnf-card{background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.07);overflow:hidden;border:1px solid #f0f0f0;transition:box-shadow .2s;}
.bnf-card:hover{box-shadow:0 4px 18px rgba(0,0,0,.13);}
.bnf-card-img{width:100%;height:160px;object-fit:cover;display:block;background:#f5f5f5;}
.bnf-card-img-placeholder{width:100%;height:100px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);display:flex;align-items:center;justify-content:center;font-size:36px;}
.bnf-card-body{padding:14px 16px;}
.bnf-card-cat{font-size:11px;font-weight:700;color:#388E3C;background:#E8F5E9;padding:2px 8px;border-radius:10px;display:inline-block;margin-bottom:6px;}
.bnf-card-title{font-size:15px;font-weight:800;color:#1a1a1a;margin-bottom:6px;line-height:1.3;}
.bnf-card-desc{font-size:12px;color:#555;line-height:1.5;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.bnf-card-meta{font-size:11px;color:#888;margin-bottom:10px;}
.bnf-card-actions{display:flex;gap:8px;flex-wrap:wrap;}
.bnf-badge{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;}
.bnf-badge-active{background:#E8F5E9;color:#2E7D32;}
.bnf-badge-inactive{background:#FFF3E0;color:#E65100;}
.bnf-badge-expired{background:#f5f5f5;color:#9e9e9e;}
.bnf-form-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;}
.bnf-form-box{background:#fff;border-radius:16px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;padding:28px;}
.bnf-form-title{font-size:18px;font-weight:800;color:#1B4332;margin-bottom:20px;}
.bnf-field{margin-bottom:16px;}
.bnf-label{font-size:12px;font-weight:700;color:#555;margin-bottom:5px;display:block;}
.bnf-input,.bnf-select,.bnf-textarea{width:100%;padding:10px 12px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;font-family:inherit;}
.bnf-textarea{min-height:80px;resize:vertical;}
.bnf-input:focus,.bnf-select:focus,.bnf-textarea:focus{outline:none;border-color:#1B4332;}
.bnf-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.bnf-extra-field{display:flex;gap:8px;align-items:center;margin-bottom:8px;}
.bnf-extra-field input{flex:1;padding:8px 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;}
.bnf-add-field-btn{display:flex;align-items:center;gap:6px;color:#1B4332;font-size:13px;font-weight:700;cursor:pointer;border:2px dashed #a5d6a7;border-radius:8px;padding:8px 14px;background:#f1f8e9;margin-top:4px;}
.bnf-upload-area{border:2px dashed #c8e6c9;border-radius:10px;padding:20px;text-align:center;cursor:pointer;background:#f9fdf9;transition:border-color .2s;}
.bnf-upload-area:hover{border-color:#1B4332;}
.bnf-upload-preview{max-width:100%;max-height:200px;border-radius:8px;margin-top:10px;}
.bnf-claims-table{width:100%;border-collapse:collapse;font-size:13px;}
.bnf-claims-table th{background:#f5f5f5;padding:8px 12px;text-align:left;font-weight:700;color:#444;}
.bnf-claims-table td{padding:8px 12px;border-bottom:1px solid #f0f0f0;}
.bnf-stat-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;}
.bnf-stat-box{background:#fff;border-radius:10px;padding:14px 18px;box-shadow:0 1px 6px rgba(0,0,0,.07);min-width:100px;text-align:center;}
.bnf-stat-num{font-size:26px;font-weight:900;color:#1B4332;}
.bnf-stat-lbl{font-size:11px;color:#888;margin-top:2px;}
</style>
<div class="bnf-toolbar">
  <button class="btn btn-primary" onclick="bnfOpenCreate()"><i class="fas fa-plus"></i> 新增福利</button>
  <button class="btn btn-secondary" onclick="bnfShowClaims()"><i class="fas fa-chart-bar"></i> 申領記錄</button>
  <button class="btn btn-secondary" onclick="bnfLoadAll()"><i class="fas fa-sync"></i> 刷新</button>
</div>
<div class="bnf-cat-tabs" id="bnfCatTabs">
  <div class="bnf-cat-tab active" data-cat="0" onclick="bnfFilterCat(0,this)">📋 全部</div>
</div>
<div id="bnfLoading" style="text-align:center;padding:40px;color:#888;font-size:14px;">載入中…</div>
<div id="bnfGrid" class="bnf-grid" style="display:none"></div>
<div id="bnfEmpty" style="display:none;text-align:center;padding:40px;color:#aaa;">
  <div style="font-size:40px;margin-bottom:10px;">🎁</div>
  <div style="font-size:15px;">此分類暫無福利，點擊「新增福利」開始新增</div>
</div>
<div id="bnfClaimsPanel" style="display:none;margin-top:8px;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div style="font-size:16px;font-weight:800;color:#1B4332;">📊 申領記錄總覽</div>
    <button class="btn btn-sm btn-secondary" onclick="bnfHideClaims()">✕ 關閉</button>
  </div>
  <div id="bnfClaimsSummary"></div>
</div>
</div><!-- end mod-benefits -->

<!-- mod-hmvod: HMVod 申請管理 -->
<div id="mod-hmvod" class="mod-page" style="display:none">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
    <div style="font-size:20px;font-weight:900;color:#B71C1C;">🎬 HMVod 免費會籍申請記錄</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn-secondary" onclick="hmvodAdminLoad()" style="font-size:14px;padding:8px 16px;"><i class="fas fa-sync"></i> 重新整理</button>
      <button class="btn btn-primary" onclick="hmvodExportExcel()" style="font-size:14px;padding:8px 16px;background:#1B5E20;border-color:#1B5E20;"><i class="fas fa-file-excel"></i> 下載 Excel</button>
    </div>
  </div>

  <!-- WA Number Setting -->
  <div style="background:#FFF8E1;border:1.5px solid #FFD54F;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
    <div style="font-size:15px;font-weight:800;color:#F57F17;margin-bottom:12px;">⚙️ 職員 WhatsApp 號碼設定</div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <label style="font-size:13px;color:#555;font-weight:700;display:block;margin-bottom:4px;">接收申請的 WhatsApp 號碼（含國家號，如 85290001234）</label>
        <input id="hmvodWaInput" type="tel" placeholder="85290001234" style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:16px;box-sizing:border-box;font-family:monospace;letter-spacing:1px;">
      </div>
      <button class="btn btn-primary" onclick="hmvodSaveWa()" style="padding:10px 20px;margin-top:20px;">儲存</button>
    </div>
    <div id="hmvodWaMsg" style="font-size:13px;margin-top:8px;display:none;"></div>
  </div>

  <!-- Stats bar -->
  <div id="hmvodStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;"></div>

  <!-- Applications table -->
  <div style="background:#fff;border-radius:12px;border:1.5px solid #e0e0e0;overflow:hidden;">
    <div id="hmvodTableWrap" style="overflow-x:auto;">
      <div id="hmvodLoading" style="padding:40px;text-align:center;color:#888;">載入中…</div>
      <table id="hmvodTable" style="width:100%;border-collapse:collapse;display:none;">
        <thead>
          <tr style="background:#B71C1C;color:#fff;font-size:13px;">
            <th style="padding:12px 14px;text-align:left;white-space:nowrap;">#</th>
            <th style="padding:12px 14px;text-align:left;white-space:nowrap;">申請時間</th>
            <th style="padding:12px 14px;text-align:left;white-space:nowrap;">姓名</th>
            <th style="padding:12px 14px;text-align:left;white-space:nowrap;">電話</th>
            <th style="padding:12px 14px;text-align:left;white-space:nowrap;">會員號</th>
            <th style="padding:12px 14px;text-align:left;white-space:nowrap;">狀態</th>
            <th style="padding:12px 14px;text-align:left;white-space:nowrap;">備註</th>
            <th style="padding:12px 14px;text-align:left;white-space:nowrap;">操作</th>
          </tr>
        </thead>
        <tbody id="hmvodTbody"></tbody>
      </table>
      <div id="hmvodEmpty" style="padding:40px;text-align:center;color:#aaa;display:none;">暫無申請記錄</div>
    </div>
  </div>
</div><!-- end mod-hmvod -->

<script>
// ══════════════════════════════════════════════════════════════════════════════
// BENEFITS MODULE JS
// ══════════════════════════════════════════════════════════════════════════════
var _bnfCats=[];
var _bnfCurrentCat=0;
var _bnfBenefits=[];
var _bnfEditingId=null;
var _bnfExtraFields=[];

function bnfLoadAll(){
  fetch('/api/admin/benefit-categories',{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok) return;
      _bnfCats=d.categories||[];
      var tabs=document.getElementById('bnfCatTabs');
      if(!tabs) return;
      tabs.innerHTML='<div class="bnf-cat-tab active" data-cat="0" onclick="bnfFilterCat(0,this)">📋 全部</div>';
      _bnfCats.forEach(function(cat){
        tabs.innerHTML+='<div class="bnf-cat-tab" data-cat="'+cat.id+'" onclick="bnfFilterCat('+cat.id+',this)">'+cat.icon+' '+cat.name+'</div>';
      });
    });
  bnfFetchBenefits(0);
}

function bnfFetchBenefits(catId){
  var loading=document.getElementById('bnfLoading'),grid=document.getElementById('bnfGrid'),empty=document.getElementById('bnfEmpty');
  if(loading) loading.style.display='block';
  if(grid) grid.style.display='none';
  if(empty) empty.style.display='none';
  var url='/api/admin/benefits'+(catId?'?category_id='+catId:'');
  fetch(url,{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(loading) loading.style.display='none';
      if(!d.ok){
        if(d.code==='AUTH_REQUIRED'||d.error==='Unauthorized'){
          if(empty){empty.style.display='block';empty.textContent='請先登入管理後台';}
        } else {
          if(empty){empty.style.display='block';empty.textContent='載入失敗：'+(d.error||'未知錯誤');}
        }
        return;
      }
      _bnfBenefits=d.benefits||[];
      if(!_bnfBenefits.length){if(empty)empty.style.display='block';return;}
      if(grid){grid.style.display='grid';grid.innerHTML=_bnfBenefits.map(function(b){return bnfCardHtml(b);}).join('');}
    })
    .catch(function(e){if(loading)loading.style.display='none';if(empty){empty.style.display='block';empty.textContent='網路錯誤，請重試';} });
}

function bnfFilterCat(catId,el){
  _bnfCurrentCat=catId;
  document.querySelectorAll('#bnfCatTabs .bnf-cat-tab').forEach(function(t){t.classList.remove('active');});
  if(el) el.classList.add('active');
  document.getElementById('bnfClaimsPanel').style.display='none';
  bnfFetchBenefits(catId);
}

function bnfCardHtml(b){
  var statusBadge=b.status==='active'?'<span class="bnf-badge bnf-badge-active">啟用</span>':
    b.status==='inactive'?'<span class="bnf-badge bnf-badge-inactive">停用</span>':
    '<span class="bnf-badge bnf-badge-expired">已過期</span>';
  var imgHtml=b.image_url
    ?'<img class="bnf-card-img" src="'+bnfEsc(b.image_url)+'" alt="'+bnfEsc(b.title)+'">'
    :'<div class="bnf-card-img-placeholder">'+bnfEsc(b.category_icon||'🎁')+'</div>';
  var dateHtml=(b.start_date||b.end_date)?'<div>📅 '+(b.start_date||'—')+' ~ '+(b.end_date||'長期')+'</div>':'';
  return '<div class="bnf-card">'+imgHtml+
    '<div class="bnf-card-body">'+
      '<div><span class="bnf-card-cat">'+(b.category_icon||'')+' '+(b.category_name||'')+'</span> '+statusBadge+
        ' <span style="font-size:11px;color:#888;margin-left:6px;">👥 '+b.claim_count+' 人領取</span></div>'+
      '<div class="bnf-card-title">'+bnfEsc(b.title)+'</div>'+
      '<div class="bnf-card-desc">'+bnfEsc(b.description)+'</div>'+
      '<div class="bnf-card-meta">'+dateHtml+'</div>'+
      '<div class="bnf-card-actions">'+
        '<button class="btn btn-sm btn-primary" data-bid="'+b.id+'" onclick="bnfOpenEdit(this.dataset.bid)">✏️ 編輯</button>'+
        '<button class="btn btn-sm btn-secondary" data-bid="'+b.id+'" data-btitle="'+bnfEsc(b.title)+'" onclick="bnfViewClaims(this.dataset.bid,this.dataset.btitle)">👥 申領</button>'+
        '<button class="btn btn-sm btn-danger" data-bid="'+b.id+'" data-btitle="'+bnfEsc(b.title)+'" onclick="bnfDelete(this.dataset.bid,this.dataset.btitle)">🗑️</button>'+
      '</div>'+
    '</div></div>';
}

function bnfEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function bnfClickFileInput(){var el=document.getElementById('bnfFileInput');if(el)el.click();}
function bnfCloseForm(){var el=document.getElementById('bnfFormOverlay');if(el)el.remove();}
function bnfCloseClaimsModal(){var el=document.getElementById('bnfClaimsModal');if(el)el.remove();}
function bnfOpenCreate(){_bnfEditingId=null;_bnfExtraFields=[];bnfShowForm(null);}
function bnfOpenEdit(id){
  var b=_bnfBenefits.find(function(x){return x.id==id;});
  if(!b){alert('找不到此福利');return;}
  _bnfEditingId=id;_bnfExtraFields=[];
  try{_bnfExtraFields=JSON.parse(b.extra_fields||'[]');}catch(e){}
  bnfShowForm(b);
}

function bnfShowForm(b){
  var old=document.getElementById('bnfFormOverlay');if(old)old.remove();
  var catsOpts=_bnfCats.map(function(c){
    var sel=(b&&b.category_id==c.id)?' selected':'';
    return '<option value="'+c.id+'"'+sel+'>'+c.icon+' '+c.name+'</option>';
  }).join('');
  var extraHtml=_bnfExtraFields.map(function(f,i){
    var parts=['<div class="bnf-extra-field">'];
    parts.push('<input placeholder="欄位名稱" value="'+bnfEsc(f.label||'')+'" oninput="bnfEFUpdate('+i+',this,0)">');
    parts.push('<input placeholder="內容" value="'+bnfEsc(f.value||'')+'" oninput="bnfEFUpdate('+i+',this,1)">');
    parts.push('<button onclick="bnfEFRemove('+i+')" style="border:none;background:#ffebee;color:#c62828;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px;">✕</button>');
    parts.push('</div>');
    return parts.join('');
  }).join('');
  var imgUrl=b&&b.image_url?b.image_url:'';
  var imgPreviewHtml=imgUrl?'<img class="bnf-upload-preview" id="bnfImgPreview" src="'+bnfEsc(imgUrl)+'">':'<img class="bnf-upload-preview" id="bnfImgPreview" style="display:none">';
  var formTitle=b?'✏️ 編輯福利':'➕ 新增福利';
  var selActive=(!b||b.status==='active')?' selected':'';
  var selInactive=(b&&b.status==='inactive')?' selected':'';
  var parts=[];
  parts.push('<div id="bnfFormOverlay" class="bnf-form-overlay"><div class="bnf-form-box">');
  parts.push('<div class="bnf-form-title">'+formTitle+'</div>');
  parts.push('<div class="bnf-row">');
  parts.push('<div class="bnf-field"><label class="bnf-label">分類 *</label><select class="bnf-select" id="bnfFCat"><option value="">請選擇</option>'+catsOpts+'</select></div>');
  parts.push('<div class="bnf-field"><label class="bnf-label">狀態</label><select class="bnf-select" id="bnfFStatus"><option value="active"'+selActive+'>啟用</option><option value="inactive"'+selInactive+'>停用</option></select></div>');
  parts.push('</div>');
  parts.push('<div class="bnf-field"><label class="bnf-label">標題 *</label><input class="bnf-input" id="bnfFTitle" placeholder="福利標題" value="'+bnfEsc(b?b.title:'')+'"></div>');
  parts.push('<div class="bnf-field"><label class="bnf-label">簡介</label><textarea class="bnf-textarea" id="bnfFDesc" placeholder="簡短介紹">'+bnfEsc(b?b.description:'')+'</textarea></div>');
  parts.push('<div class="bnf-field"><label class="bnf-label">封面圖片</label>');
  parts.push('<div class="bnf-upload-area" onclick="bnfClickFileInput()">');
  parts.push('<div style="font-size:24px;margin-bottom:4px;">📷</div>');
  parts.push('<div id="bnfUploadTxt" style="font-size:13px;color:#666;">點擊上傳圖片（自動上傳至 Cloudinary）</div>');
  parts.push('<input type="file" id="bnfFileInput" accept="image/*" style="display:none" onchange="bnfUploadImage(this)">');
  parts.push(imgPreviewHtml);
  parts.push('</div>');
  parts.push('<input class="bnf-input" id="bnfFImg" placeholder="或直接輸入圖片 URL" value="'+bnfEsc(imgUrl)+'" style="margin-top:8px;" oninput="bnfPreviewUrl(this.value)">');
  parts.push('</div>');
  parts.push('<div class="bnf-row">');
  parts.push('<div class="bnf-field"><label class="bnf-label">開始日期</label><input class="bnf-input" type="date" id="bnfFStart" value="'+bnfEsc(b&&b.start_date?b.start_date:'')+'"></div>');
  parts.push('<div class="bnf-field"><label class="bnf-label">結束日期</label><input class="bnf-input" type="date" id="bnfFEnd" value="'+bnfEsc(b&&b.end_date?b.end_date:'')+'"></div>');
  parts.push('</div>');
  parts.push('<div class="bnf-field"><label class="bnf-label">福利內容詳情</label><textarea class="bnf-textarea" id="bnfFContent" placeholder="詳細說明福利條款、如何使用等" style="min-height:100px;">'+bnfEsc(b?b.benefit_content:'')+'</textarea></div>');
  parts.push('<div class="bnf-row">');
  parts.push('<div class="bnf-field"><label class="bnf-label">每人領取上限（0=不限）</label><input class="bnf-input" type="number" id="bnfFClaimLimit" min="0" value="'+(b?b.claim_limit:0)+'"></div>');
  parts.push('<div class="bnf-field"><label class="bnf-label">總名額上限（0=不限）</label><input class="bnf-input" type="number" id="bnfFTotalQuota" min="0" value="'+(b?b.total_quota:0)+'"></div>');
  parts.push('</div>');
  parts.push('<div class="bnf-field"><label class="bnf-label">自訂欄位 <span style="font-weight:400;color:#999;">（可新增任意資訊欄位）</span></label>');
  parts.push('<div id="bnfExtraFieldsList">'+extraHtml+'</div>');
  parts.push('<div class="bnf-add-field-btn" onclick="bnfEFAdd()">＋ 新增欄位</div></div>');
  parts.push('<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #f0f0f0;">');
  parts.push('<button class="btn btn-secondary" onclick="bnfCloseForm()">取消</button>');
  parts.push('<button class="btn btn-primary" onclick="bnfSave()">💾 儲存</button>');
  parts.push('</div></div></div>');
  var html=parts.join('');
  document.getElementById('mod-benefits').insertAdjacentHTML('beforeend',html);
}

function bnfPreviewUrl(url){
  var img=document.getElementById('bnfImgPreview');
  if(!img) return;
  if(url){img.src=url;img.style.display='block';}else{img.style.display='none';}
}
function bnfUploadImage(input){
  var file=input.files[0];if(!file) return;
  var fd=new FormData();fd.append('file',file);
  var txt=document.getElementById('bnfUploadTxt');if(txt) txt.textContent='上傳中…';
  fetch('/api/admin/benefits/upload-image',{method:'POST',credentials:'include',body:fd})
    .then(function(r){return r.json();})
    .then(function(d){
      if(txt) txt.textContent='點擊上傳圖片（自動上傳至 Cloudinary）';
      if(d.ok&&d.url){document.getElementById('bnfFImg').value=d.url;bnfPreviewUrl(d.url);}
      else alert(d.error||'上傳失敗');
    })
    .catch(function(){if(txt)txt.textContent='點擊上傳圖片';alert('上傳失敗');});
}
function bnfEFAdd(){_bnfExtraFields.push({label:'',value:''});bnfRenderEF();}
function bnfEFRemove(i){_bnfExtraFields.splice(i,1);bnfRenderEF();}
function bnfEFUpdate(i,inputEl,keyIdx){
  if(!_bnfExtraFields[i]) return;
  if(keyIdx===0) _bnfExtraFields[i].label=inputEl.value;
  else _bnfExtraFields[i].value=inputEl.value;
}
function bnfRenderEF(){
  var wrap=document.getElementById('bnfExtraFieldsList');if(!wrap) return;
  wrap.innerHTML=_bnfExtraFields.map(function(f,i){
    return '<div class="bnf-extra-field">'+
      '<input placeholder="欄位名稱" value="'+bnfEsc(f.label||'')+'" oninput="bnfEFUpdate('+i+',this,0)">'+
      '<input placeholder="內容" value="'+bnfEsc(f.value||'')+'" oninput="bnfEFUpdate('+i+',this,1)">'+
      '<button onclick="bnfEFRemove('+i+')" style="border:none;background:#ffebee;color:#c62828;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px;">✕</button>'+
    '</div>';
  }).join('');
}
function bnfSave(){
  var cat=document.getElementById('bnfFCat').value;
  var title=(document.getElementById('bnfFTitle').value||'').trim();
  if(!cat||!title){alert('請填寫分類及標題');return;}
  var payload={
    category_id:parseInt(cat),title:title,
    description:(document.getElementById('bnfFDesc').value||'').trim(),
    image_url:(document.getElementById('bnfFImg').value||'').trim(),
    start_date:document.getElementById('bnfFStart').value||'',
    end_date:document.getElementById('bnfFEnd').value||'',
    benefit_content:(document.getElementById('bnfFContent').value||'').trim(),
    claim_limit:parseInt(document.getElementById('bnfFClaimLimit').value)||0,
    total_quota:parseInt(document.getElementById('bnfFTotalQuota').value)||0,
    extra_fields:JSON.stringify(_bnfExtraFields.filter(function(f){return f.label;})),
    status:document.getElementById('bnfFStatus').value||'active',sort_order:0
  };
  var url=_bnfEditingId?'/api/admin/benefits/'+_bnfEditingId:'/api/admin/benefits';
  var method=_bnfEditingId?'PUT':'POST';
  fetch(url,{method:method,credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){var ov=document.getElementById('bnfFormOverlay');if(ov)ov.remove();bnfFetchBenefits(_bnfCurrentCat);}
      else alert(d.error||'儲存失敗');
    });
}
function bnfDelete(id,titleStr){
  if(!confirm('確定刪除福利「'+titleStr+'」？此操作不可撤銷。')) return;
  fetch('/api/admin/benefits/'+id,{method:'DELETE',credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){if(d.ok)bnfFetchBenefits(_bnfCurrentCat);else alert(d.error||'刪除失敗');});
}
function bnfShowClaims(){
  var panel=document.getElementById('bnfClaimsPanel');panel.style.display='block';
  document.getElementById('bnfClaimsSummary').innerHTML='<div style="text-align:center;padding:30px;color:#888;">載入中…</div>';
  fetch('/api/admin/benefits/claims/summary',{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok){document.getElementById('bnfClaimsSummary').innerHTML='<p style="color:red;">載入失敗</p>';return;}
      var rows=d.summary||[];
      if(!rows.length){document.getElementById('bnfClaimsSummary').innerHTML='<p style="color:#aaa;text-align:center;">暫無申領記錄</p>';return;}
      var total=rows.reduce(function(s,r){return s+(r.claim_count||0);},0);
      var html='<div class="bnf-stat-row"><div class="bnf-stat-box"><div class="bnf-stat-num">'+rows.length+'</div><div class="bnf-stat-lbl">福利項目</div></div>'+
        '<div class="bnf-stat-box"><div class="bnf-stat-num">'+total+'</div><div class="bnf-stat-lbl">總申領次數</div></div></div>';
      html+='<table class="bnf-claims-table"><thead><tr><th>分類</th><th>福利名稱</th><th>申領人次</th><th>最新申領</th><th>操作</th></tr></thead><tbody>';
      rows.forEach(function(r){
        html+='<tr><td>'+(r.icon||'')+(r.category_name||'')+'</td>'+
          '<td style="font-weight:700;">'+bnfEsc(r.title)+'</td>'+
          '<td><strong style="color:#1B4332;font-size:16px;">'+r.claim_count+'</strong></td>'+
          '<td style="font-size:11px;color:#888;">'+(r.last_claimed_at?(r.last_claimed_at+'').slice(0,16):'—')+'</td>'+
          '<td><button class="btn btn-sm btn-secondary" data-bid="'+r.benefit_id+'" data-btitle="'+bnfEsc(r.title)+'" onclick="bnfViewClaims(this.dataset.bid,this.dataset.btitle)">查看</button></td></tr>';
      });
      html+='</tbody></table>';
      document.getElementById('bnfClaimsSummary').innerHTML=html;
    });
}
function bnfHideClaims(){document.getElementById('bnfClaimsPanel').style.display='none';}
function bnfViewClaims(id,titleStr){
  var old=document.getElementById('bnfClaimsModal');if(old)old.remove();
  var modal='<div id="bnfClaimsModal" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:4000;display:flex;align-items:center;justify-content:center;padding:20px;">'+
    '<div style="background:#fff;border-radius:14px;max-width:600px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'+
        '<div style="font-size:16px;font-weight:800;color:#1B4332;">👥 申領記錄：'+bnfEsc(titleStr)+'</div>'+
        '<button onclick="bnfCloseClaimsModal()" style="border:none;background:#f5f5f5;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;">✕</button>'+
      '</div><div id="bnfClaimsDetail" style="text-align:center;padding:20px;color:#888;">載入中…</div>'+
    '</div></div>';
  document.getElementById('mod-benefits').insertAdjacentHTML('beforeend',modal);
  fetch('/api/admin/benefits/'+id+'/claims',{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      var el=document.getElementById('bnfClaimsDetail');if(!el) return;
      if(!d.ok){el.innerHTML='<p style="color:red;">載入失敗</p>';return;}
      var claims=d.claims||[];
      if(!claims.length){el.innerHTML='<p style="color:#aaa;">暫無申領記錄</p>';return;}
      var tbl='<table class="bnf-claims-table"><thead><tr><th>#</th><th>會員號碼</th><th>姓名</th><th>申領時間</th></tr></thead><tbody>';
      claims.forEach(function(c,i){
        tbl+='<tr><td style="color:#888;">'+(i+1)+'</td>'+
          '<td style="font-family:monospace;font-weight:700;">'+bnfEsc(c.member_no)+'</td>'+
          '<td>'+bnfEsc(c.name_zh||'—')+'</td>'+
          '<td style="font-size:11px;color:#888;">'+(c.claimed_at+'').slice(0,16)+'</td></tr>';
      });
      tbl+='</tbody></table>';
      el.innerHTML='<div style="margin-bottom:10px;font-size:13px;color:#555;">共 <strong>'+claims.length+'</strong> 位會員申領</div>'+tbl;
    });
}
</script>

<script>
// ── Sidebar nav ──
var _membershipFrameLoaded = false;
function switchMod(id){
  document.querySelectorAll('.mod-page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
  document.getElementById(id).classList.add('active');
  event.currentTarget.classList.add('active');
  var titles = {'mod-membership':'會員系統','mod-roadshow':'Roadshow 管理','mod-products':'產品管理','mod-useful-links':'有用資訊管理','mod-jobs':'工作管理','mod-coworkery':'CoWorkery 人手管理','mod-revenue':'🌟 CoLeadery 申請審核','mod-colinkery-admin':'🤝 CoLinkery 申請審核','mod-qr':'🔖 QR 快速登記管理','mod-testing':'🧪 產品測試計劃','mod-benefits':'🎁 福利管理','mod-hmvod':'🎬 HMVod 申請管理'};
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
  if(id==='mod-coworkery') cwTab('cw-overview');
  if(id==='mod-revenue') { loadRevApps('PENDING'); loadRevStats(); }
  if(id==='mod-colinkery-admin') { loadCkAdminData(); }
  if(id==='mod-qr') { qrLoadAll(); }
  if(id==='mod-testing') { testingLoadCampaigns(); }
  if(id==='mod-benefits') { bnfLoadAll(); }
  if(id==='mod-hmvod') { hmvodAdminLoad(); }
}
function reloadMembershipFrame(){
  var f = document.getElementById('membership-frame');
  f.src = '/membership/admin';
  _membershipFrameLoaded = true;
}

// ══════════════════════════════════════════════════════════
// ── HMVod Admin Tab ──
// ══════════════════════════════════════════════════════════
var _hmvodAdminData = [];

function hmvodAdminLoad(){
  var loading=document.getElementById('hmvodLoading');
  var table=document.getElementById('hmvodTable');
  var empty=document.getElementById('hmvodEmpty');
  if(loading) loading.style.display='block';
  if(table) table.style.display='none';
  if(empty) empty.style.display='none';
  // Load WA setting + applications in parallel
  Promise.all([
    fetch('/api/admin/hmvod/applications',{credentials:'include'}).then(function(r){return r.json();}),
    fetch('/api/hmvod/settings').then(function(r){return r.json();})
  ]).then(function(results){
    var appsData=results[0], settings=results[1];
    if(loading) loading.style.display='none';
    // Fill WA input
    var waInput=document.getElementById('hmvodWaInput');
    if(waInput&&settings.wa_number) waInput.value=settings.wa_number;
    if(!appsData.ok){ if(empty){empty.textContent='載入失敗';empty.style.display='block';} return; }
    _hmvodAdminData=appsData.applications||[];
    hmvodRenderTable(_hmvodAdminData);
    hmvodRenderStats(_hmvodAdminData);
  }).catch(function(){
    if(loading) loading.style.display='none';
    if(empty){empty.textContent='網絡錯誤';empty.style.display='block';}
  });
}

function hmvodRenderStats(apps){
  var statsEl=document.getElementById('hmvodStats');
  if(!statsEl) return;
  var total=apps.length;
  var done=apps.filter(function(a){return a.status==='DONE';}).length;
  var pending=total-done;
  var statItems=[
    {label:'總申請',value:total,color:'#B71C1C',bg:'#FFEBEE'},
    {label:'待處理',value:pending,color:'#F57F17',bg:'#FFF8E1'},
    {label:'已完成',value:done,color:'#2E7D32',bg:'#E8F5E9'},
    {label:'應收費用',value:'HK$ '+(total*10),color:'#1565C0',bg:'#E3F2FD'}
  ];
  statsEl.innerHTML=statItems.map(function(s){
    return '<div style="background:'+s.bg+';border-radius:10px;padding:14px 20px;min-width:120px;text-align:center;">'
      +'<div style="font-size:22px;font-weight:900;color:'+s.color+';">'+s.value+'</div>'
      +'<div style="font-size:12px;color:#555;margin-top:2px;">'+s.label+'</div></div>';
  }).join('');
}

function hmvodRenderTable(apps){
  var table=document.getElementById('hmvodTable');
  var tbody=document.getElementById('hmvodTbody');
  var empty=document.getElementById('hmvodEmpty');
  if(!tbody) return;
  if(!apps.length){ if(empty)empty.style.display='block'; if(table)table.style.display='none'; return; }
  if(table) table.style.display='table';
  tbody.innerHTML=apps.map(function(a,i){
    var isDone=a.status==='DONE';
    var statusBadge=isDone
      ? '<span style="background:#E8F5E9;color:#2E7D32;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;">✅ 已完成</span>'
      : '<span style="background:#FFF8E1;color:#F57F17;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;">⏳ 待處理</span>';
    var dt=a.created_at?a.created_at.replace('T',' ').slice(0,16):'';
    var waUrl='https://wa.me/'+a.phone+'?text='+encodeURIComponent('你好 '+a.name_zh+'，你的 HMVod 驗証碼已準備好，請收看。');
    return '<tr style="border-bottom:1px solid #f0f0f0;'+(i%2===0?'':'background:#fafafa')+';">'
      +'<td style="padding:12px 14px;font-size:13px;color:#888;">'+(i+1)+'</td>'
      +'<td style="padding:12px 14px;font-size:13px;white-space:nowrap;">'+escAdminHtml(dt)+'</td>'
      +'<td style="padding:12px 14px;font-size:14px;font-weight:700;">'+escAdminHtml(a.name_zh||'')+'</td>'
      +'<td style="padding:12px 14px;font-size:14px;"><a href="'+waUrl+'" target="_blank" style="color:#B71C1C;font-weight:700;text-decoration:none;">📱 '+escAdminHtml(a.phone||'')+'</a></td>'
      +'<td style="padding:12px 14px;font-size:13px;font-family:monospace;">'+escAdminHtml(a.member_no||'')+'</td>'
      +'<td style="padding:12px 14px;">'+statusBadge+'</td>'
      +'<td style="padding:12px 14px;font-size:13px;color:#555;">'+escAdminHtml(a.notes||'')+'</td>'
      +'<td style="padding:12px 14px;">'
        +'<button onclick="hmvodMarkDone('+a.id+',this)" style="padding:6px 12px;border:0;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;'+(isDone?'background:#e0e0e0;color:#888;':'background:#2E7D32;color:#fff;')+'">'+(isDone?'已完成':'標記完成')+'</button>'
      +'</td>'
      +'</tr>';
  }).join('');
}

function hmvodMarkDone(id, btn){
  var notes=prompt('備註（可填驗証碼或其他）：')||'';
  if(btn){btn.disabled=true;btn.textContent='處理中…';}
  fetch('/api/admin/hmvod/applications/'+id,{
    method:'PUT',credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status:'DONE',notes:notes})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok) hmvodAdminLoad();
    else{ if(btn){btn.disabled=false;btn.textContent='標記完成';} alert('失敗：'+d.error); }
  }).catch(function(){ if(btn){btn.disabled=false;btn.textContent='標記完成';} });
}

function hmvodSaveWa(){
  var val=(document.getElementById('hmvodWaInput')||{}).value||'';
  var clean=val.replace(/\D/g,'');
  var msgEl=document.getElementById('hmvodWaMsg');
  if(!clean||clean.length<8){
    if(msgEl){msgEl.textContent='請輸入有效電話號碼（如 85290001234）';msgEl.style.color='#C62828';msgEl.style.display='block';}
    return;
  }
  fetch('/api/admin/hmvod/settings',{
    method:'PUT',credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({wa_number:clean})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok){
      if(msgEl){msgEl.textContent='✅ 儲存成功！WhatsApp 號碼：'+d.wa_number;msgEl.style.color='#2E7D32';msgEl.style.display='block';}
      if(document.getElementById('hmvodWaInput')) document.getElementById('hmvodWaInput').value=d.wa_number;
    } else {
      if(msgEl){msgEl.textContent='儲存失敗：'+d.error;msgEl.style.color='#C62828';msgEl.style.display='block';}
    }
  }).catch(function(){
    if(msgEl){msgEl.textContent='網絡錯誤，請稍後再試';msgEl.style.color='#C62828';msgEl.style.display='block';}
  });
}

function hmvodExportExcel(){
  if(!_hmvodAdminData.length){ alert('暫無數據可下載'); return; }
  var headers=['#','申請時間','姓名','電話','會員號','狀態','備註'];
  var rows=_hmvodAdminData.map(function(a,i){
    return [
      i+1,
      (a.created_at||'').replace('T',' ').slice(0,16),
      a.name_zh||'',
      a.phone||'',
      a.member_no||'',
      a.status==='DONE'?'已完成':'待處理',
      a.notes||''
    ];
  });
  // Build CSV (Excel-compatible UTF-8 with BOM)
  var csvContent='\uFEFF'+[headers].concat(rows).map(function(r){
    return r.map(function(cell){
      var s=String(cell).replace(/"/g,'""');
      var nl=String.fromCharCode(10);
      return (s.indexOf(',')!==-1||s.indexOf('"')!==-1||s.indexOf(nl)!==-1)?'"'+s+'"':s;
    }).join(',');
  }).join(String.fromCharCode(13,10));
  var blob=new Blob([csvContent],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  var today=new Date().toISOString().slice(0,10);
  a.href=url; a.download='HMVod申請記錄_'+today+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escAdminHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════
// ── CoLinkery Admin Tab ──
// ══════════════════════════════════════════════════════════
var _ckAllData = { applications: [], pending_otps: [] };
var _ckCurrentTab = 'pending';

function ckSwitchTab(tab, btnEl) {
  _ckCurrentTab = tab;
  document.querySelectorAll('.ck-tab').forEach(function(t){ t.classList.remove('active'); });
  if(btnEl) btnEl.classList.add('active');
  ['pending','approved','rejected','otp'].forEach(function(p){
    document.getElementById('ckPanel-'+p).style.display = p===tab ? '' : 'none';
  });
  if(tab==='approved') loadCkApproved();
  if(tab==='rejected') loadCkRejected();
}

async function loadCkAdminData() {
  // 載入待審批 + OTP
  try {
    var res = await fetch('/api/admin/colinkery/pending', {credentials:'include'});
    var d = await res.json();
    if(!d.ok){ document.getElementById('ckPendingList').innerHTML='<p style="color:#c00;">'+d.error+'</p>'; return; }
    _ckAllData = d;
    renderCkPending(d.applications||[]);
    renderCkOtp(d.pending_otps||[]);
    renderCkStats(d);
  } catch(e) {
    document.getElementById('ckPendingList').innerHTML='<p style="color:#c00;">網絡錯誤：'+e.message+'</p>';
  }
}

function renderCkStats(d) {
  var apps = d.applications||[];
  var otps = d.pending_otps||[];
  var grid = document.getElementById('ckStatGrid');
  if(!grid) return;
  grid.innerHTML =
    '<div class="ck-stat-card"><div class="ck-stat-num">'+apps.length+'</div><div class="ck-stat-lbl">待審批申請</div></div>' +
    '<div class="ck-stat-card"><div class="ck-stat-num" style="color:#065F46;">'+otps.length+'</div><div class="ck-stat-lbl">待發 OTP</div></div>' +
    '<div class="ck-stat-card"><div class="ck-stat-num" id="ckStatApproved" style="color:#6B7280;">–</div><div class="ck-stat-lbl">已批准總數</div></div>';
  // Lazy load approved count
  fetch('/api/admin/colinkery/pending?status=APPROVED&count=1', {credentials:'include'})
    .then(function(r){ return r.json(); })
    .catch(function(){ return null; })
    .then(function(dd){
      var el = document.getElementById('ckStatApproved');
      if(el && dd && dd.total_approved !== undefined) el.textContent = dd.total_approved;
    });
}

function renderCkPending(apps) {
  var typeMap = {INDIVIDUAL:'個人',GROUP:'小組',COMPANY:'公司',ASSOCIATION:'協會'};
  var list = document.getElementById('ckPendingList');
  if(!list) return;
  if(apps.length===0){ list.innerHTML='<div style="text-align:center;padding:40px;color:#9CA3AF;"><i class="fas fa-check-circle" style="font-size:32px;margin-bottom:12px;display:block;color:#6EE7B7;"></i>目前無待審批申請</div>'; return; }
  list.innerHTML = apps.map(function(a){
    var typeLabel = typeMap[a.applicant_type]||a.applicant_type||'–';
    var dateStr = a.created_at ? a.created_at.slice(0,16) : '–';
    return '<div class="ck-app-card">' +
      '<div class="cka-top">' +
        '<div>' +
          '<div class="cka-name">'+escHtml(a.name_zh||'')+'</div>' +
          '<div class="cka-meta">'+escHtml(a.member_no)+' ｜ 電話：'+escHtml(a.phone||'')+'</div>' +
          '<div style="margin-top:6px;"><span class="ck-type-badge">'+typeLabel+'</span></div>' +
        '</div>' +
        '<div style="font-size:12px;color:#9CA3AF;white-space:nowrap;">'+dateStr+'</div>' +
      '</div>' +
      (a.notes ? '<div class="cka-notes">'+escHtml(a.notes)+'</div>' : '') +
      '<div class="ck-actions">' +
        '<button class="btn-ck-approve" onclick="ckApproveApp('+a.id+')">✅ 批准</button>' +
        '<button class="btn-ck-reject" onclick="ckRejectApp('+a.id+')">❌ 拒絕</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderCkOtp(otps) {
  var list = document.getElementById('ckOtpList');
  if(!list) return;
  if(otps.length===0){ list.innerHTML='<div style="text-align:center;padding:40px;color:#9CA3AF;"><i class="fas fa-mobile-alt" style="font-size:32px;margin-bottom:12px;display:block;"></i>目前無待發 OTP</div>'; return; }
  list.innerHTML = otps.map(function(o){
    var phoneDigits = (o.phone||'').replace(/\D/g,'');
    var fullPhone = phoneDigits.startsWith('852') ? phoneDigits : '852'+phoneDigits;
    var msg = encodeURIComponent('你好'+o.name_zh+'！你的 CoLinkery 密碼重設碼為：'+o.otp_code+'，請於 10 分鐘內使用。');
    var waLink = 'https://wa.me/'+fullPhone+'?text='+msg;
    var expiryStr = o.expires_at ? o.expires_at.slice(0,16) : '–';
    return '<div class="ck-otp-card">' +
      '<div>' +
        '<div style="font-size:15px;font-weight:700;color:#0C4A6E;">'+escHtml(o.name_zh||'')+'</div>' +
        '<div style="font-size:13px;color:#6B7280;">'+escHtml(o.member_no)+' ｜ '+escHtml(o.phone||'')+'</div>' +
        '<div class="ck-otp-code">'+escHtml(o.otp_code||'')+'</div>' +
        '<div style="font-size:12px;color:#9CA3AF;">到期：'+expiryStr+'</div>' +
      '</div>' +
      '<a href="'+waLink+'" target="_blank" class="btn-ck-wa">💬 WhatsApp 發送</a>' +
    '</div>';
  }).join('');
}

async function loadCkApproved() {
  var list = document.getElementById('ckApprovedList');
  if(!list) return;
  list.innerHTML='<div style="padding:20px;color:#6B7280;text-align:center;"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  try {
    var res = await fetch('/api/admin/colinkery/approved', {credentials:'include'});
    var d = await res.json();
    if(!d.ok){ list.innerHTML='<p style="color:#c00;">'+d.error+'</p>'; return; }
    var holders = d.holders||[];
    var typeMap = {INDIVIDUAL:'個人',GROUP:'小組',COMPANY:'公司',ASSOCIATION:'協會'};
    if(holders.length===0){ list.innerHTML='<div style="text-align:center;padding:40px;color:#9CA3AF;">尚無已批准記錄</div>'; return; }
    list.innerHTML = holders.map(function(h){
      var typeLabel = typeMap[h.applicant_type]||h.applicant_type||'–';
      var dateStr = h.approved_at ? h.approved_at.slice(0,10) : (h.updated_at ? h.updated_at.slice(0,10) : '–');
      var phoneDigits = (h.phone||'').replace(/\D/g,'');
      var fullPhone = phoneDigits.startsWith('852') ? phoneDigits : '852'+phoneDigits;
      var waMsg = encodeURIComponent('你好'+h.name_zh+'！你的 CoLinkery 連結者帳戶已批准啟用，可用電話號碼 + 你設定的密碼登入 coeldery85.com/colinkery');
      var waLink = 'https://wa.me/'+fullPhone+'?text='+waMsg;
      return '<div class="ck-holder-card">' +
        '<div>' +
          '<div style="font-size:16px;font-weight:700;color:#065F46;">'+escHtml(h.name_zh||'')+' <span style="font-size:12px;background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:10px;font-weight:700;">'+escHtml(h.holder_no||'')+'</span></div>' +
          '<div style="font-size:13px;color:#6B7280;margin-top:3px;">'+escHtml(h.member_no)+' ｜ '+escHtml(h.phone||'')+'</div>' +
          '<div style="margin-top:4px;"><span class="ck-type-badge">'+typeLabel+'</span></div>' +
          '<div style="font-size:12px;color:#9CA3AF;margin-top:4px;">批准：'+dateStr+'</div>' +
        '</div>' +
        '<a href="'+waLink+'" target="_blank" class="btn-ck-wa" style="font-size:13px;padding:7px 14px;">💬 WA</a>' +
      '</div>';
    }).join('');
  } catch(e) { list.innerHTML='<p style="color:#c00;">網絡錯誤</p>'; }
}

async function loadCkRejected() {
  var list = document.getElementById('ckRejectedList');
  if(!list) return;
  list.innerHTML='<div style="padding:20px;color:#6B7280;text-align:center;"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  try {
    var res = await fetch('/api/admin/colinkery/rejected', {credentials:'include'});
    var d = await res.json();
    if(!d.ok){ list.innerHTML='<p style="color:#c00;">'+d.error+'</p>'; return; }
    var apps = d.applications||[];
    if(apps.length===0){ list.innerHTML='<div style="text-align:center;padding:40px;color:#9CA3AF;">尚無已拒絕記錄</div>'; return; }
    var typeMap = {INDIVIDUAL:'個人',GROUP:'小組',COMPANY:'公司',ASSOCIATION:'協會'};
    list.innerHTML = apps.map(function(a){
      var typeLabel = typeMap[a.applicant_type]||a.applicant_type||'–';
      var dateStr = a.updated_at ? a.updated_at.slice(0,10) : '–';
      return '<div class="ck-app-card" style="border-color:#FCA5A5;opacity:0.9;">' +
        '<div class="cka-top">' +
          '<div>' +
            '<div class="cka-name" style="color:#991B1B;">'+escHtml(a.name_zh||'')+'</div>' +
            '<div class="cka-meta">'+escHtml(a.member_no)+' ｜ 電話：'+escHtml(a.phone||'')+'</div>' +
            '<div style="margin-top:6px;"><span class="ck-type-badge" style="background:#FEE2E2;color:#991B1B;">'+typeLabel+'</span></div>' +
          '</div>' +
          '<div style="font-size:12px;color:#9CA3AF;white-space:nowrap;">拒絕：'+dateStr+'</div>' +
        '</div>' +
        (a.review_notes ? '<div class="cka-notes" style="background:#FFF1F2;">原因：'+escHtml(a.review_notes)+'</div>' : '') +
      '</div>';
    }).join('');
  } catch(e) { list.innerHTML='<p style="color:#c00;">網絡錯誤</p>'; }
}

async function ckApproveApp(id) {
  if(!confirm('確認批准此 CoLinkery 申請？審批後申請人可立即登入。')) return;
  try {
    var res = await fetch('/api/admin/colinkery/approve/'+id, {method:'POST',credentials:'include'});
    var d = await res.json();
    if(!d.ok){ alert('批准失敗：'+(d.error||'未知錯誤')); return; }
    // 成功後顯示 WA 通知連結
    var confirmed = confirm('✅ 已批准！CoLinkery 號碼：'+d.holder_no+'。點擊確定用 WhatsApp 通知申請人。');
    if(confirmed) window.open(d.wa_notify_link,'_blank');
    loadCkAdminData(); // 刷新列表
  } catch(e) { alert('網絡錯誤：'+e.message); }
}

async function ckRejectApp(id) {
  var reason = prompt('請輸入拒絕原因（會顯示給申請人）：');
  if(reason===null) return; // 用戶取消
  try {
    var res = await fetch('/api/admin/colinkery/reject/'+id, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({reason: reason})
    });
    var d = await res.json();
    if(!d.ok){ alert('拒絕失敗：'+(d.error||'未知錯誤')); return; }
    var confirmed = confirm('✅ 已拒絕。點擊確定用 WhatsApp 通知申請人。');
    if(confirmed) window.open(d.wa_notify_link,'_blank');
    loadCkAdminData();
  } catch(e) { alert('網絡錯誤：'+e.message); }
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

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
// ── Job image upload helpers ─────────────────────────────────────────────────
function jobImgClear(){
  document.getElementById('job-image-url').value='';
  document.getElementById('jobImgPreviewWrap').style.display='none';
  document.getElementById('jobImgPlaceholder').style.display='';
  document.getElementById('jobImgFileInput').value='';
  var dz=document.getElementById('jobImgDropZone');
  dz.style.borderColor='#D1D5DB'; dz.style.background='#F9FAFB';
}
function jobImgSetPreview(url,name){
  document.getElementById('job-image-url').value=url;
  document.getElementById('jobImgPreview').src=url;
  document.getElementById('jobImgPreviewName').textContent=name||'';
  document.getElementById('jobImgPreviewWrap').style.display='';
  document.getElementById('jobImgPlaceholder').style.display='none';
  var dz=document.getElementById('jobImgDropZone');
  dz.style.borderColor='var(--brand)'; dz.style.background='#f0fff0';
}
function jobImgHandleDrop(e){
  e.preventDefault();
  var dz=document.getElementById('jobImgDropZone');
  dz.style.borderColor='#D1D5DB'; dz.style.background='#F9FAFB';
  var file=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
  if(file) jobImgHandleFile(file);
}
function jobImgHandleFile(file){
  if(!file||!file.type.startsWith('image/')){ alert('請選擇圖片檔案'); return; }
  var progress=document.getElementById('jobImgUploadProgress');
  var placeholder=document.getElementById('jobImgPlaceholder');
  var previewWrap=document.getElementById('jobImgPreviewWrap');
  progress.style.display=''; placeholder.style.display='none'; previewWrap.style.display='none';
  fetch('/api/admin/cloudinary-sign',{
    method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
    body:JSON.stringify({folder:'jobs'})
  }).then(function(r){return r.json();}).then(function(sig){
    if(!sig.ok){progress.style.display='none';placeholder.style.display='';alert('無法取得上傳簽名：'+(sig.error||'未知錯誤'));return;}
    var fd=new FormData();
    fd.append('file',file); fd.append('api_key',sig.api_key);
    fd.append('timestamp',sig.timestamp); fd.append('signature',sig.signature);
    fd.append('folder',sig.folder);
    return fetch('https://api.cloudinary.com/v1_1/'+sig.cloud_name+'/image/upload',{
      method:'POST',body:fd
    }).then(function(r2){return r2.json();}).then(function(res){
      progress.style.display='none';
      if(res.secure_url){ jobImgSetPreview(res.secure_url,file.name); }
      else{ placeholder.style.display=''; alert('上傳失敗：'+(res.error&&res.error.message||'未知錯誤')); }
    });
  }).catch(function(e){progress.style.display='none';placeholder.style.display='';alert('上傳錯誤：'+String(e));});
}

function openCreateJob(){
  document.getElementById('job-modal-title').innerHTML='<i class="fas fa-briefcase" style="margin-right:8px;color:var(--brand)"></i>新增工作';
  document.getElementById('job-id').value='';
  ['job-title','job-location','job-type','job-company','job-salary','job-description','job-requirement'].forEach(function(f){document.getElementById(f).value='';});
  jobImgClear();
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
    if(j.image_url){ jobImgSetPreview(j.image_url,''); } else { jobImgClear(); }
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
    image_url:document.getElementById('job-image-url').value.trim()||null,
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

// ═══════════════════════════════════════════════════════════════════════════════
// CoWorkery 後台 JS
// ═══════════════════════════════════════════════════════════════════════════════
var CW_API='/api/admin/coworkery';
var _cwActs={};var _cwActIdx=0;
function _cwa(fn){var k='_k'+(++_cwActIdx);_cwActs[k]=fn;return k;}
function _cwRun(el){var k=el.getAttribute('data-cwk');if(k&&_cwActs[k])_cwActs[k]();}
async function cwGet(url){var r=await fetch(url);return r.json();}
async function cwSend(url,method,body){
  var r=await fetch(url,{method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return r.json();
}
function cwEsc(s){return String(s??'').replace(/[&<>"']/g,function(m){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];});}
function cwCents(v){return '$'+((Number(v)||0)/100).toFixed(2);}
function cwMin(v){var m=Number(v)||0;return Math.floor(m/60)+'h'+(m%60)+'m';}

function cwTab(id){
  document.querySelectorAll('.cw-panel').forEach(function(p){p.style.display='none';});
  document.querySelectorAll('.cw-tab').forEach(function(t){t.classList.remove('active');});
  var el=document.getElementById(id);if(el)el.style.display='block';
  var tb=document.querySelector('.cw-tab[data-tab="'+id+'"]');if(tb)tb.classList.add('active');
  if(id==='cw-overview') cwLoadList();
  if(id==='cw-approval') cwLoadApproval();
  if(id==='cw-sessions') cwLoadSessions();
  if(id==='cw-assign')   cwLoadSessionOptions('cwAssignSession');
  if(id==='cw-payroll')  cwLoadSessionOptions('cwPayrollSession');
}

async function cwLoadList(){
  var q=encodeURIComponent(document.getElementById('cwSearch')?.value||'');
  var d=await cwGet(CW_API+'/list?q='+q);
  if(!d.ok){document.getElementById('cwListBox').innerHTML='\u8f09\u5165\u5931\u6557\uff1a'+cwEsc(d.error);return;}
  var s=d.stat||{};
  ['cwStatTotal','cwStatActive','cwStatPending','cwStatSusp'].forEach(function(id,i){
    var el=document.getElementById(id);if(el)el.textContent=[s.total,s.active,s.pending,s.suspended][i]??0;
  });
  document.getElementById('cwListBox').innerHTML=cwBuildTable(d.list,false);
}

function cwBuildTable(list,approvalMode){
  if(!list||!list.length)return '<p style="color:#888">\u6c92\u6709\u8cc7\u6599</p>';
  var cols=['\u6703\u54e1\u7de8\u865f','\u59d3\u540d','\u96fb\u8a71','\u5730\u5340','\u9280\u884c','\u6236\u53e3\u865f\u78bc','\u9810\u8a2d\u6642\u85aa','\u72c0\u614b','\u64cd\u4f5c'];
  var h='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#F3F4F6;text-align:left">';
  cols.forEach(function(c){h+='<th style="padding:8px 10px;font-weight:600;color:#374151;border-bottom:1px solid #E5E7EB;white-space:nowrap">'+c+'</th>';});
  h+='</tr></thead><tbody>';
  list.forEach(function(r){
    var bankCell=r.bank_name?cwEsc(r.bank_name):'<span style="color:#9ca3af">—</span>';
    var bankNoCell=r.bank_account_no?'<span style="font-family:monospace">'+cwEsc(r.bank_account_no)+'</span>':'<span style="color:#9ca3af">—</span>';
    h+='<tr style="border-bottom:1px solid #F3F4F6">'+
      '<td style="padding:8px 10px;font-family:monospace">'+cwEsc(r.cw_no)+'</td>'+
      '<td style="padding:8px 10px">'+cwEsc(r.name_zh)+'</td>'+
      '<td style="padding:8px 10px">'+cwEsc(r.phone)+'</td>'+
      '<td style="padding:8px 10px">'+cwEsc(r.district||'')+'</td>'+
      '<td style="padding:8px 10px">'+bankCell+'</td>'+
      '<td style="padding:8px 10px">'+bankNoCell+'</td>'+
      '<td style="padding:8px 10px">'+cwCents(r.default_hourly_rate)+'/h</td>'+
      '<td style="padding:8px 10px">'+cwBadge(r.status)+'</td>'+
      '<td style="padding:8px 10px">'+cwRowBtns(r,approvalMode)+'</td>'+
      '</tr>';
  });
  return h+'</tbody></table></div>';
}
function cwBadge(s){
  var m={ACTIVE:'#16a34a',PENDING:'#d97706',REJECTED:'#dc2626',SUSPENDED:'#6b7280'};
  return '<span style="padding:2px 8px;border-radius:10px;color:#fff;font-size:11px;background:'+(m[s]||'#999')+'">'+cwEsc(s)+'</span>';
}
function cwRowBtns(r,approvalMode){
  if(approvalMode){
    var k1=_cwa(function(){cwAction(r.cw_no,'APPROVE');});
    var k2=_cwa(function(){cwReject(r.cw_no);});
    return '<button class="btn btn-primary btn-sm" data-cwk="'+k1+'" onclick="_cwRun(this)">批准</button> '+
           '<button class="btn btn-danger btn-sm" data-cwk="'+k2+'" onclick="_cwRun(this)">拒絕</button>';
  }
  var kb=_cwa(function(){cwEditRate(r.cw_no,r.default_hourly_rate||0);});
  var b='<button class="btn btn-secondary btn-sm" data-cwk="'+kb+'" onclick="_cwRun(this)">改時薪</button>';
  if(r.status==='ACTIVE'){var ks=_cwa(function(){cwAction(r.cw_no,'SUSPEND');});b+=' <button class="btn btn-secondary btn-sm" data-cwk="'+ks+'" onclick="_cwRun(this)">停牌</button>';}
  if(r.status==='SUSPENDED'){var kr=_cwa(function(){cwAction(r.cw_no,'REACTIVATE');});b+=' <button class="btn btn-secondary btn-sm" data-cwk="'+kr+'" onclick="_cwRun(this)">復牌</button>';}
  if(r.id_front_key){var kf=_cwa(function(){cwViewFile(r.id_front_key);});b+=' <button class="btn btn-secondary btn-sm" data-cwk="'+kf+'" onclick="_cwRun(this)">證件</button>';}
  return b;
}
async function cwAction(cw_no,action){
  if(!confirm('\u78ba\u5b9a '+action+'?')) return;
  var d=await cwSend(CW_API+'/list','PATCH',{cw_no:cw_no,action:action});
  if(d.ok){cwLoadList();cwLoadApproval();}else alert('\u5931\u6557\uff1a'+d.error);
}
async function cwReject(cw_no){
  var reason=prompt('\u62d2\u7d55\u539f\u56e0?')||'';
  var d=await cwSend(CW_API+'/list','PATCH',{cw_no:cw_no,action:'REJECT',reject_reason:reason});
  if(d.ok){cwLoadList();cwLoadApproval();}else alert('\u5931\u6557\uff1a'+d.error);
}
async function cwEditRate(cw_no,cur){
  var v=prompt('\u9810\u8a2d\u6642\u85aa(\u5143/\u5c0f\u6642):',((cur||0)/100).toFixed(2));
  if(v===null)return;
  var d=await cwSend(CW_API+'/list','PATCH',{cw_no:cw_no,default_hourly_rate:Math.round(parseFloat(v)*100)||0});
  if(d.ok)cwLoadList();else alert('\u5931\u6557\uff1a'+d.error);
}
function cwViewFile(key){window.open(CW_API+'/files/'+key,'_blank');}

async function cwLoadApproval(){
  var d=await cwGet(CW_API+'/list?status=PENDING');
  document.getElementById('cwApprovalBox').innerHTML=d.ok?cwBuildTable(d.list,true):'\u8f09\u5165\u5931\u6557';
}

// ── 開卡 Modal 控制 ─────────────────────────────────────────────────────────
function cwOpenRegister(){
  // 清空所有欄位
  ['regMemberNo','regNameZh','regNameEn','regPhone','regDistrict','regHkid',
   'regAddress','regBankName','regBankAcctName','regBankAcctNo','regRate'].forEach(function(id){
    var e=document.getElementById(id); if(e) e.value='';
  });
  document.getElementById('regGender').value='';
  document.getElementById('regIdFront').value='';
  document.getElementById('regIdPreview').style.display='none';
  document.getElementById('regMemberHint').textContent='';
  document.getElementById('regMsg').textContent='';
  document.getElementById('regSubmitBtn').disabled=false;
  document.getElementById('cwRegModal').style.display='flex';
}
function cwCloseRegister(){ document.getElementById('cwRegModal').style.display='none'; }

// 查會員（防重複開卡提示）
async function cwCheckMember(){
  var no=document.getElementById('regMemberNo').value.trim();
  var hint=document.getElementById('regMemberHint');
  if(!no){ hint.textContent=''; return; }
  hint.style.color='#6b7280'; hint.textContent='\u67e5\u8a62\u4e2d\u2026';
  try{
    var d=await cwGet(CW_API+'/list?q='+encodeURIComponent(no));
    var existed=(d.list||[]).find(function(x){ return x.member_no===no; });
    if(existed){
      hint.style.color='#dc2626';
      hint.textContent='\u26a0 \u6b64\u6703\u54e1\u5df2\u6709 '+existed.cw_no;
    }else{
      hint.style.color='#16a34a';
      hint.textContent='\u2713 \u672a\u958b\u904e\u5361\uff0c\u53ef\u7e7c\u7e8c\uff08\u63d0\u4ea4\u6642\u7cfb\u7d71\u6703\u518d\u9a57\u8b49\u6703\u54e1\u8cc7\u683c\uff09';
    }
  }catch(e){ hint.style.color='#dc2626'; hint.textContent='\u67e5\u8a62\u5931\u6557'; }
}

// 身份證預覽
function cwPreviewId(){
  var f=document.getElementById('regIdFront').files[0];
  var img=document.getElementById('regIdPreview');
  if(!f){ img.style.display='none'; return; }
  img.src=URL.createObjectURL(f); img.style.display='block';
}

// 前端壓縮（≤1280px JPEG 0.8，與長者端同邏輯）
async function cwCompressImg(file){
  if(!file) return null;
  return new Promise(function(res){
    var img=new Image();
    img.onload=function(){
      var max=1280,w=img.width,h=img.height;
      if(w>max||h>max){ var r=Math.min(max/w,max/h); w=Math.round(w*r); h=Math.round(h*r); }
      var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      cv.toBlob(function(b){ res(b||file); },'image/jpeg',0.8);
    };
    img.onerror=function(){ res(file); };
    img.src=URL.createObjectURL(file);
  });
}

// 提交開卡（multipart/form-data，含身份證圖）
async function cwSubmitRegister(){
  var memberNo=document.getElementById('regMemberNo').value.trim();
  var nameZh=document.getElementById('regNameZh').value.trim();
  var phone=document.getElementById('regPhone').value.trim();
  var msg=document.getElementById('regMsg');
  if(!memberNo||!nameZh||!phone){
    msg.style.color='#dc2626'; msg.textContent='\u8acb\u586b\u5beb\u6703\u54e1\u7de8\u865f\u3001\u4e2d\u6587\u59d3\u540d\u3001\u96fb\u8a71'; return;
  }
  var btn=document.getElementById('regSubmitBtn');
  btn.disabled=true; msg.style.color='#6b7280'; msg.textContent='\u8655\u7406\u4e2d\u2026';
  try{
    var fd=new FormData();
    fd.append('member_no',memberNo);
    fd.append('name_zh',nameZh);
    fd.append('name_en',document.getElementById('regNameEn').value.trim());
    fd.append('phone',phone);
    fd.append('gender',document.getElementById('regGender').value);
    fd.append('district',document.getElementById('regDistrict').value.trim());
    fd.append('hkid_prefix',document.getElementById('regHkid').value.trim());
    fd.append('address',document.getElementById('regAddress').value.trim());
    fd.append('bank_name',document.getElementById('regBankName').value.trim());
    fd.append('bank_account_name',document.getElementById('regBankAcctName').value.trim());
    fd.append('bank_account_no',document.getElementById('regBankAcctNo').value.trim());
    var rate=parseFloat(document.getElementById('regRate').value)||0;
    fd.append('default_hourly_rate',String(Math.round(rate*100)));
    var idFile=document.getElementById('regIdFront').files[0];
    if(idFile){
      var compressed=await cwCompressImg(idFile);
      if(compressed) fd.append('id_front',compressed,'id_front.jpg');
    }
    var r=await fetch(CW_API+'/register',{method:'POST',body:fd});
    var d=await r.json();
    if(d.ok){
      msg.style.color='#16a34a'; msg.textContent='\u2705 \u958b\u5361\u6210\u529f\uff1a'+d.cw_no;
      setTimeout(function(){ cwCloseRegister(); cwLoadList(); },1200);
    }else{
      msg.style.color='#dc2626'; msg.textContent='\u274c '+(d.error||'\u958b\u5361\u5931\u6557');
      btn.disabled=false;
    }
  }catch(e){
    msg.style.color='#dc2626'; msg.textContent='\u274c \u7db2\u7d61\u932f\u8aa4\uff1a'+e;
    btn.disabled=false;
  }
}

var _cwSessions=[];
async function cwLoadSessionOptions(selId){
  var d=await cwGet(CW_API+'/sessions');if(!d.ok)return;
  _cwSessions=d.list||[];
  var sel=document.getElementById(selId);if(!sel)return;
  sel.innerHTML='<option value="">\u2014 \u9078\u64c7\u5834\u6b21 \u2014</option>'+
    _cwSessions.map(function(s){
      return '<option value="'+cwEsc(s.roadshow_code)+'">'+cwEsc(s.roadshow_code)+'\uff5c'+cwEsc(s.roadshow_name||'')+'</option>';
    }).join('');
}

async function cwLoadSessions(){
  var d=await cwGet(CW_API+'/sessions');
  if(!d.ok){document.getElementById('cwSessionsBox').innerHTML='載入失敗';return;}
  var cols=['場次碼','名稱','座標','半徑(m)','需求','時薪','車馬','膳食','品牌','操作'];
  var h='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#F3F4F6;text-align:left">';
  cols.forEach(function(c){h+='<th style="padding:8px 10px;font-weight:600;border-bottom:1px solid #E5E7EB;white-space:nowrap">'+c+'</th>';});
  h+='</tr></thead><tbody>';
  (d.list||[]).forEach(function(s){
    var hasGeo=s.latitude!=null&&s.longitude!=null;
    var ke=_cwa(function(){cwEditSession(s);});
    h+='<tr style="border-bottom:1px solid #F3F4F6">'+
      '<td style="padding:8px 10px;font-family:monospace">'+cwEsc(s.roadshow_code)+'</td>'+
      '<td style="padding:8px 10px">'+cwEsc(s.roadshow_name||'')+'</td>'+
      '<td style="padding:8px 10px">'+(hasGeo?s.latitude.toFixed(4)+','+s.longitude.toFixed(4):'<span style="color:#dc2626">未設</span>')+'</td>'+
      '<td style="padding:8px 10px">'+(s.geofence_radius||'-')+'</td>'+
      '<td style="padding:8px 10px">'+(s.headcount_needed||0)+'</td>'+
      '<td style="padding:8px 10px">'+cwCents(s.session_hourly_rate)+'</td>'+
      '<td style="padding:8px 10px">'+cwCents(s.transport_allowance)+'</td>'+
      '<td style="padding:8px 10px">'+cwCents(s.meal_allowance)+'</td>'+
      '<td style="padding:8px 10px">'+cwEsc(s.brand_ref||'')+'</td>'+
      '<td style="padding:8px 10px"><button class="btn btn-secondary btn-sm" data-cwk="'+ke+'" onclick="_cwRun(this)">設定</button></td>'+
      '</tr>';
  });
  document.getElementById('cwSessionsBox').innerHTML=h+'</tbody></table></div>';
}
function cwEditSession(s){
  var lat=prompt('\u7def\u5ea6 latitude:',s.latitude??'');if(lat===null)return;
  var lng=prompt('\u7d93\u5ea6 longitude:',s.longitude??'');if(lng===null)return;
  var radius=prompt('Geofence \u534a\u5f91(\u7c73):',s.geofence_radius??250);
  var head=prompt('\u9700\u6c42\u4eba\u6578:',s.headcount_needed??0);
  var rate=prompt('\u5834\u6b21\u6642\u85aa(\u5143/\u5c0f\u6642):',((s.session_hourly_rate||0)/100).toFixed(2));
  var tr=prompt('\u8eca\u99ac\u8cbb(\u5143/\u6b21):',((s.transport_allowance||0)/100).toFixed(2));
  var meal=prompt('\u81b3\u98df\u6d25\u8cbc(\u5143/\u6b21):',((s.meal_allowance||0)/100).toFixed(2));
  var brand=prompt('\u54c1\u724c\u65b9\u6a19\u8a18:',s.brand_ref||'');
  cwSend(CW_API+'/sessions','POST',{
    roadshow_code:s.roadshow_code,
    latitude:parseFloat(lat)||null,longitude:parseFloat(lng)||null,
    geofence_radius:parseInt(radius)||250,headcount_needed:parseInt(head)||0,
    session_hourly_rate:Math.round(parseFloat(rate)*100)||0,
    transport_allowance:Math.round(parseFloat(tr)*100)||0,
    meal_allowance:Math.round(parseFloat(meal)*100)||0,
    brand_ref:brand||null
  }).then(function(d){if(d.ok)cwLoadSessions();else alert('\u5931\u6557\uff1a'+d.error);});
}

async function cwLoadAssign(){
  var code=(document.getElementById('cwAssignSession')||{}).value||'';
  if(!code){document.getElementById('cwAssignBox').innerHTML='請先選擇場次';return;}
  var d=await cwGet(CW_API+'/assign?roadshow_code='+encodeURIComponent(code));
  if(!d.ok){document.getElementById('cwAssignBox').innerHTML='載入失敗';return;}
  var h='<h4 style="font-size:14px;font-weight:600;margin-bottom:8px">報名名單</h4>';
  if(!d.applications||!d.applications.length)h+='<p style="color:#888;margin-bottom:12px">暫無報名</p>';
  else{
    h+='<div style="overflow-x:auto;margin-bottom:12px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#F3F4F6">';
    ['報名名單 — CW編號','姓名','電話','地區','狀態','操作'].forEach(function(x){h+='<th style="padding:7px 9px;font-weight:600;border-bottom:1px solid #E5E7EB">'+x+'</th>';});
    h+='</tr></thead><tbody>';
    d.applications.forEach(function(a){
      var ka=_cwa(function(){cwAssign(code,a.cw_no);});
      h+='<tr style="border-bottom:1px solid #F3F4F6">'+
        '<td style="padding:7px 9px;font-family:monospace">'+cwEsc(a.cw_no)+'</td>'+
        '<td style="padding:7px 9px">'+cwEsc(a.name_zh)+'</td>'+
        '<td style="padding:7px 9px">'+cwEsc(a.phone)+'</td>'+
        '<td style="padding:7px 9px">'+cwEsc(a.district||'')+'</td>'+
        '<td style="padding:7px 9px">'+cwEsc(a.status)+'</td>'+
        '<td style="padding:7px 9px"><button class="btn btn-primary btn-sm" data-cwk="'+ka+'" onclick="_cwRun(this)">派更</button></td>'+
        '</tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='<h4 style="font-size:14px;font-weight:600;margin-bottom:8px">已派更</h4>';
  if(!d.assignments||!d.assignments.length)h+='<p style="color:#888;margin-bottom:12px">暫無派更</p>';
  else{
    h+='<div style="overflow-x:auto;margin-bottom:12px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#F3F4F6">';
    ['CW編號','姓名','特別時薪','操作'].forEach(function(x){h+='<th style="padding:7px 9px;font-weight:600;border-bottom:1px solid #E5E7EB">'+x+'</th>';});
    h+='</tr></thead><tbody>';
    d.assignments.forEach(function(a){
      var ku=_cwa(function(){cwUnassign(code,a.cw_no);});
      h+='<tr style="border-bottom:1px solid #F3F4F6">'+
        '<td style="padding:7px 9px;font-family:monospace">'+cwEsc(a.cw_no)+'</td>'+
        '<td style="padding:7px 9px">'+cwEsc(a.name_zh)+'</td>'+
        '<td style="padding:7px 9px">'+(a.assigned_hourly_rate?cwCents(a.assigned_hourly_rate)+'（特別）':'（沿用 fallback）')+'</td>'+
        '<td style="padding:7px 9px"><button class="btn btn-danger btn-sm" data-cwk="'+ku+'" onclick="_cwRun(this)">取消</button></td>'+
        '</tr>';
    });
    h+='</tbody></table></div>';
  }
  var km=_cwa(function(){cwManualAssign(code);});
  h+='<button class="btn btn-secondary" data-cwk="'+km+'" onclick="_cwRun(this)">＋ 直接派更（輸入CW編號）</button>';
  document.getElementById('cwAssignBox').innerHTML=h;
}
async function cwAssign(code,cw_no){
  var v=prompt('\u7279\u5225\u6642\u85aa(\u5143/\u5c0f\u6642,\u7559\u7a7a=fallback):','');
  var rate=(v===''||v===null)?0:Math.round(parseFloat(v)*100)||0;
  var d=await cwSend(CW_API+'/assign','POST',{roadshow_code:code,cw_no:cw_no,assigned_hourly_rate:rate});
  if(d.ok)cwLoadAssign();else alert('\u5931\u6557\uff1a'+d.error);
}
function cwManualAssign(code){var cw_no=prompt('CW\u7de8\u865f:');if(!cw_no)return;cwAssign(code,cw_no);}
async function cwUnassign(code,cw_no){
  if(!confirm('\u53d6\u6d88\u6b64\u6d3e\u66f4?'))return;
  var d=await cwSend(CW_API+'/assign','POST',{roadshow_code:code,cw_no:cw_no,remove:true});
  if(d.ok)cwLoadAssign();else alert('\u5931\u6557\uff1a'+d.error);
}

async function cwLoadPayroll(){
  var code=(document.getElementById('cwPayrollSession')||{}).value||'';
  var totEl=document.getElementById('cwPayrollTotals');
  var boxEl=document.getElementById('cwPayrollBox');
  if(!code){boxEl.innerHTML='請先選擇場次';totEl.textContent='';return;}
  var d=await cwGet(CW_API+'/payroll?roadshow_code='+encodeURIComponent(code));
  if(!d.ok){boxEl.innerHTML='載入失敗';return;}
  var t=d.totals||{};
  totEl.textContent='人數 '+(t.count||0)+'｜總工時 '+cwMin(t.total_minutes)+'｜總應付 '+cwCents(t.total_payable);
  if(!d.list||!d.list.length){boxEl.innerHTML='<p style="color:#888">尚未計算出粮，按「計算出粮」</p>';return;}
  var cols=['CW編號','姓名','工時','時薪','工資','車馬','膳食','總應付','狀態','操作'];
  var h='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#F3F4F6">';
  cols.forEach(function(c){h+='<th style="padding:7px 9px;font-weight:600;border-bottom:1px solid #E5E7EB;white-space:nowrap">'+c+'</th>';});
  h+='</tr></thead><tbody>';
  d.list.forEach(function(r){
    var btn='';
    if(r.status==='PENDING'){var kp=_cwa(function(){cwPayAction(code,r.cw_no,'APPROVE');});btn='<button class="btn btn-primary btn-sm" data-cwk="'+kp+'" onclick="_cwRun(this)">批准</button>';}
    if(r.status==='APPROVED'){var kd=_cwa(function(){cwPayAction(code,r.cw_no,'PAID');});btn='<button class="btn btn-primary btn-sm" data-cwk="'+kd+'" onclick="_cwRun(this)">標記已付</button>';}
    if(r.status==='PAID'){var kv=_cwa(function(){cwPayAction(code,r.cw_no,'REVERT');});btn='<button class="btn btn-secondary btn-sm" data-cwk="'+kv+'" onclick="_cwRun(this)">還原</button>';}
    h+='<tr style="border-bottom:1px solid #F3F4F6">'+
      '<td style="padding:7px 9px;font-family:monospace">'+cwEsc(r.cw_no)+'</td>'+
      '<td style="padding:7px 9px">'+cwEsc(r.name_zh)+'</td>'+
      '<td style="padding:7px 9px">'+cwMin(r.total_minutes)+'</td>'+
      '<td style="padding:7px 9px">'+cwCents(r.hourly_rate)+'</td>'+
      '<td style="padding:7px 9px">'+cwCents(r.wage_amount)+'</td>'+
      '<td style="padding:7px 9px">'+cwCents(r.transport_total)+'</td>'+
      '<td style="padding:7px 9px">'+cwCents(r.meal_total)+'</td>'+
      '<td style="padding:7px 9px"><b>'+cwCents(r.total_payable)+'</b></td>'+
      '<td style="padding:7px 9px">'+cwBadge(r.status)+'</td>'+
      '<td style="padding:7px 9px">'+btn+'</td>'+
      '</tr>';
  });
  boxEl.innerHTML=h+'</tbody></table></div>';
}
async function cwCalcPayroll(){
  var code=(document.getElementById('cwPayrollSession')||{}).value||'';
  if(!code){alert('\u8acb\u5148\u9078\u64c7\u5834\u6b21');return;}
  if(!confirm('\u8a08\u7b97\u6b64\u5834\u6b21\u51fa\u7cae\uff1f\uff08\u53ea\u8a08\u5df2\u4e0b\u73ed\u6253\u5361\u8005\uff09'))return;
  var d=await cwSend(CW_API+'/payroll/calculate','POST',{roadshow_code:code});
  if(d.ok){alert('\u5df2\u7522\u751f '+d.generated+' \u5f35\u7cae\u55ae');cwLoadPayroll();}else alert('\u5931\u6557\uff1a'+d.error);
}
async function cwPayAction(code,cw_no,action){
  var d=await cwSend(CW_API+'/payroll','PATCH',{roadshow_code:code,cw_no:cw_no,action:action});
  if(d.ok)cwLoadPayroll();else alert('\u5931\u6557\uff1a'+d.error);
}
function cwExportPayroll(){
  var code=(document.getElementById('cwPayrollSession')||{}).value||'';
  location.href=CW_API+'/payroll?export=csv'+(code?'&roadshow_code='+encodeURIComponent(code):'');
}

// ── Revenue / Partner Applications ──────────────────────────────────────────
var _revCurrentStatus = 'PENDING';

function loadRevStats() {
  fetch('/api/admin/rev/dashboard').then(function(r){return r.json();}).then(function(d){
    if(!d.ok) return;
    var st = d.stats || {};
    var el = document.getElementById('revStats');
    if(!el) return;
    el.innerHTML = [
      {label:'待審批申請', val: st.pending_applications||0, color:'#92400e', bg:'#FFFBEB'},
      {label:'已批准角色持有人', val: st.active_role_holders||0, color:'#065F46', bg:'#D1FAE5'},
      {label:'累計分成記錄', val: st.total_wallet_entries||0, color:'#1e40af', bg:'#DBEAFE'}
    ].map(function(s){
      return '<div style="background:'+s.bg+';border-radius:8px;padding:12px;text-align:center;">' +
        '<div style="font-size:24px;font-weight:900;color:'+s.color+'">'+s.val+'</div>' +
        '<div style="font-size:12px;color:#6B7280;margin-top:3px;">'+s.label+'</div>' +
      '</div>';
    }).join('');
  }).catch(function(){});
}

function loadRevApps(status, btnEl) {
  _revCurrentStatus = status;
  // Update filter buttons
  document.querySelectorAll('.rev-filter-btn').forEach(function(b){ b.classList.remove('active'); });
  if(btnEl) btnEl.classList.add('active');
  
  var list = document.getElementById('revAppList');
  list.innerHTML = '<div style="padding:30px;text-align:center;color:#6B7280;">載入中…</div>';
  
  fetch('/api/admin/rev/applications?status=' + status).then(function(r){return r.json();}).then(function(d){
    if(!d.ok || !d.applications || !d.applications.length) {
      list.innerHTML = '<div style="padding:30px;text-align:center;color:#6B7280;">暫無' + status + '申請</div>';
      return;
    }
    var roleLabel = {COLEADERY:'🌟 CoLeadery 領航者', COLINKERY:'🤝 CoLinkery 連結者'};
    var typeLabel = {INDIVIDUAL:'個人', GROUP:'小組', COMPANY:'公司'};
    list.innerHTML = d.applications.map(function(a){
      var roleClass = a.role === 'COLEADERY' ? 'CL' : 'CK';
      var date = (a.created_at||'').slice(0,10);
      return '<div class="app-card" onclick="openRevModal('+a.id+')">' +
        '<div class="ac-top">' +
          '<div class="ac-name">' + esc(a.name_zh||'') + (a.name_en ? ' / '+esc(a.name_en) : '') + '</div>' +
          '<span class="ac-role '+roleClass+'">' + (roleLabel[a.role]||a.role) + '</span>' +
        '</div>' +
        '<div class="ac-meta">' +
          '會員：' + esc(a.member_no) + ' (' + esc(a.member_name_zh||'') + ') &nbsp;｜&nbsp; ' +
          '類型：' + (typeLabel[a.applicant_type]||a.applicant_type) + ' &nbsp;｜&nbsp; ' +
          '申請日：' + date +
          (a.phone ? ' &nbsp;｜&nbsp; 📞 ' + esc(a.phone) : '') +
        '</div>' +
        (a.status !== 'PENDING' ? '<div class="ac-meta" style="margin-top:4px;"><span class="status-badge status-'+a.status+'">' + a.status + '</span>' + (a.review_notes ? ' ' + esc(a.review_notes) : '') + '</div>' : '') +
      '</div>';
    }).join('');
  }).catch(function(){
    list.innerHTML = '<div style="padding:20px;color:#DC2626;">載入失敗，請重試</div>';
  });
}

var _revApps = {};
function openRevModal(id) {
  fetch('/api/admin/rev/applications?status='+_revCurrentStatus).then(function(r){return r.json();}).then(function(d){
    var app = (d.applications||[]).find(function(a){return a.id===id;});
    if(!app) return;
    _revApps[id] = app;
    var roleLabel = {COLEADERY:'🌟 CoLeadery 領航者', COLINKERY:'🤝 CoLinkery 連結者'};
    var typeLabel = {INDIVIDUAL:'個人', GROUP:'小組', COMPANY:'公司'};
    var rows = [
      ['會員號碼', esc(app.member_no)],
      ['老有卡會員', esc(app.member_name_zh||'')],
      ['申請角色', roleLabel[app.role]||app.role],
      ['申請人類型', typeLabel[app.applicant_type]||app.applicant_type],
      ['中文姓名', esc(app.name_zh||'')],
      ['英文姓名', esc(app.name_en||'—')],
      ['聯絡電話', esc(app.phone||'—')],
      ['地區/地址', esc(app.address||'—')],
      ['身份證前7位', esc(app.id_prefix||'—')],
      ['公司名稱', esc(app.company_name||'—')],
      ['BR號碼', esc(app.company_br||'—')],
      ['小組人數', app.team_size ? String(app.team_size) : '—'],
      ['小組簡介', esc(app.team_notes||'—')],
      ['行業背景', esc(app.industry_background||'—')],
      ['銀行名稱', esc(app.bank_name||'—')],
      ['銀行戶口', esc(app.bank_acc_no||'—')],
      ['申請日期', (app.created_at||'').slice(0,16)],
      ['狀態', '<span class="status-badge status-'+app.status+'">'+app.status+'</span>'],
    ].filter(function(r){ return r[1] && r[1] !== '—'; });
    
    var html = '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
      rows.map(function(r){
        return '<tr style="border-bottom:1px solid #F3F4F6;">' +
          '<td style="padding:7px 10px;font-weight:700;color:#374151;width:40%;vertical-align:top;">'+r[0]+'</td>' +
          '<td style="padding:7px 10px;color:#111;word-break:break-all;">'+r[1]+'</td>' +
        '</tr>';
      }).join('') +
    '</table>';
    
    if(app.id_doc_r2_key) {
      html += '<a class="doc-link" href="/api/partner/doc/'+encodeURIComponent(app.id_doc_r2_key)+'" target="_blank">📎 查看上傳文件</a>';
    }
    
    if(app.status === 'PENDING') {
      html += '<div style="margin-top:16px;border-top:1.5px solid #E5E7EB;padding-top:14px;">' +
        '<div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:6px;">審核備注（可選）</div>' +
        '<textarea id="revNotes" class="review-notes" placeholder="審核備注（批准/拒絕原因，選填）" rows="2"></textarea>' +
        '<div class="review-actions">' +
          '<button class="btn-approve" data-rev-id="'+id+'" data-rev-action="APPROVED">✅ 批准</button>' +
          '<button class="btn-reject" data-rev-id="'+id+'" data-rev-action="REJECTED">❌ 拒絕</button>' +
        '</div>' +
        '<div id="revActionErr" style="color:#DC2626;font-size:13px;margin-top:8px;display:none;"></div>' +
      '</div>';
    }
    
    document.getElementById('revModalBody').innerHTML = html;
    document.getElementById('revModal').style.display = '';
  });
}

function closeRevModal() {
  document.getElementById('revModal').style.display = 'none';
}

// Event delegation for approve/reject buttons (avoids inline onclick quote issues)
document.getElementById('revModal').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-rev-action]');
  if (!btn) return;
  var id = parseInt(btn.getAttribute('data-rev-id'));
  var action = btn.getAttribute('data-rev-action');
  if (id && action) doRevAction(id, action);
});

function doRevAction(id, action) {
  var notes = (document.getElementById('revNotes')||{}).value||'';
  var errEl = document.getElementById('revActionErr');
  errEl.style.display='none';
  var btn = action==='APPROVED' ? document.querySelector('.btn-approve') : document.querySelector('.btn-reject');
  if(btn){ btn.disabled=true; btn.textContent='處理中…'; }
  fetch('/api/admin/rev/applications/'+id+'/review', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:action, review_notes:notes})
  }).then(function(r){return r.json();}).then(function(d){
    if(!d.ok){
      errEl.textContent = d.error||'操作失敗';
      errEl.style.display='';
      if(btn){ btn.disabled=false; btn.textContent=action==='APPROVED'?'✅ 批准':'❌ 拒絕'; }
      return;
    }
    closeRevModal();
    loadRevApps(_revCurrentStatus);
    loadRevStats();
    loadRevHolders(); // 批准後同步刷新「已認證持有人」列表
    alert(action==='APPROVED' ? '✅ 已批准！角色持有人記錄已建立。' : '申請已拒絕。');
  }).catch(function(){
    errEl.textContent='網絡錯誤，請重試';
    errEl.style.display='';
    if(btn){ btn.disabled=false; btn.textContent=action==='APPROVED'?'✅ 批准':'❌ 拒絕'; }
  });
}
// ── Rev Tab Switch ────────────────────────────────────────────────────────────
function revTabSwitch(tabId, btn) {
  document.querySelectorAll('.rev-tab-panel').forEach(function(p){ p.style.display='none'; });
  document.querySelectorAll('.rev-tab').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById(tabId).style.display='';
  btn.classList.add('active');
  if(tabId==='tab-holders') loadRevHolders();
  if(tabId==='tab-projects') loadProjects();
}

// ── Holders Tab ───────────────────────────────────────────────────────────────
function loadRevHolders() {
  fetch('/api/admin/rev/holders').then(function(r){return r.json();}).then(function(d){
    var el = document.getElementById('revHolderList');
    if(!d.ok || !d.holders.length){ el.innerHTML='<div style="color:#9CA3AF;text-align:center;padding:30px;">尚無已認證持有人</div>'; return; }
    el.innerHTML = d.holders.map(function(h){
      var roleLabel = h.role==='COLEADERY' ? '🌟 CoLeadery' : '🤝 CoLinkery';
      var roleColor = h.role==='COLEADERY' ? '#92400e' : '#0369a1';
      var roleBg = h.role==='COLEADERY' ? '#FFF3CD' : '#E0F2FE';
      var typeLabel = {INDIVIDUAL:'個人',GROUP:'小組',COMPANY:'公司'}[h.applicant_type] || h.applicant_type;
      var hasHkid  = h.id_prefix && h.id_prefix.length >= 3;
      var hasBank  = h.bank_name && h.bank_acc_no;
      var hasPhone = h.member_phone || h.app_phone;
      var kycOk    = hasHkid && hasBank;
      var kycStatus = kycOk
        ? '<span style="color:#065F46;font-weight:700;font-size:12px;">✅ KYC完成</span>'
        : '<span style="color:#DC2626;font-weight:700;font-size:12px;">⚠️ KYC不完整</span>';
      var missing = [];
      if(!hasHkid)  missing.push('HKID前7位');
      if(!hasBank)  missing.push('銀行資料');
      if(!hasPhone) missing.push('電話');
      var missingHtml = missing.length ? '<div style="font-size:12px;color:#DC2626;margin-top:3px;">缺：'+missing.join('、')+'</div>' : '';
      var infoHtml =
        '<span style="font-size:12px;background:#F3F4F6;padding:2px 7px;border-radius:5px;color:#374151;margin-right:4px;">'+typeLabel+'</span>'+
        (hasPhone ? '<span style="font-size:12px;background:#F3F4F6;padding:2px 7px;border-radius:5px;color:#374151;margin-right:4px;">📞 '+esc(hasPhone)+'</span>' : '')+
        (hasHkid  ? '<span style="font-size:12px;background:#F3F4F6;padding:2px 7px;border-radius:5px;color:#374151;margin-right:4px;">ID: '+esc(h.id_prefix)+'</span>' : '')+
        (hasBank  ? '<span style="font-size:12px;background:#F3F4F6;padding:2px 7px;border-radius:5px;color:#374151;margin-right:4px;">🏦 '+esc(h.bank_name)+' '+esc(h.bank_acc_no)+'</span>' : '')+
        (h.project_count > 0 ? '<span style="font-size:12px;background:#DBEAFE;padding:2px 7px;border-radius:5px;color:#1e40af;margin-right:4px;">📂 '+h.project_count+' 項目</span>' : '');
      return '<div class="proj-card holder-detail-card" data-holder-no="'+esc(h.holder_no)+'" style="cursor:pointer;">'+
        '<div class="proj-card-top">'+
          '<div>'+
            '<span style="font-size:16px;font-weight:700;color:#111;">'+esc(h.name_zh)+'</span>'+
            '<span style="font-size:12px;font-family:monospace;background:#F3F4F6;padding:2px 8px;border-radius:4px;color:#6B7280;margin-left:8px;">'+h.holder_no+'</span>'+
          '</div>'+
          '<div style="display:flex;gap:8px;align-items:center;">'+
            kycStatus+
            '<span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:'+roleBg+';color:'+roleColor+';">'+roleLabel+'</span>'+
          '</div>'+
        '</div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 4px;">'+infoHtml+'</div>'+
        missingHtml+
        '<div style="font-size:12px;color:#9CA3AF;margin-top:4px;">會員：'+h.member_no+' · 申請：'+h.created_at.slice(0,10)+
          ' · 狀態：<span style="font-weight:700;color:'+(h.status==='ACTIVE'?'#065F46':'#991B1B')+';">'+h.status+'</span></div>'+
      '</div>';
    }).join('');
  }).catch(function(){ document.getElementById('revHolderList').innerHTML='<div style="color:#DC2626;padding:20px;">載入失敗</div>'; });
}

// Event delegation for holder detail cards (avoids onclick with string params)
document.getElementById('revHolderList').addEventListener('click', function(e) {
  var card = e.target.closest('.holder-detail-card');
  if (!card) return;
  var holderNo = card.getAttribute('data-holder-no');
  if (holderNo) openHolderDetail(holderNo);
});

// 持有人詳情（項目參與）
function openHolderDetail(holderNo) {
  var modal = document.getElementById('holderDetailModal');
  var body  = document.getElementById('holderDetailBody');
  var titleEl = document.getElementById('holderDetailTitle');
  if(!modal) return;
  modal.style.display='';
  titleEl.textContent='載入中…';
  body.innerHTML='<div style="text-align:center;padding:30px;color:#9CA3AF;">載入中…</div>';
  fetch('/api/admin/rev/holder/'+encodeURIComponent(holderNo)+'/projects')
    .then(function(r){return r.json();}).then(function(d){
      titleEl.textContent='📂 '+holderNo+' 項目參與';
      if(!d.ok){ body.innerHTML='<div style="color:#DC2626;">'+esc(d.error||'載入失敗')+'</div>'; return; }
      var projects = d.projects||[];
      var teamMembers = d.team_members||[];
      var html = '';
      // GROUP team members
      if(teamMembers.length){
        html += '<div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:8px;">👥 團隊成員（GROUP申請）</div>'+
          '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px;">'+
          '<thead><tr style="background:#F9FAFB;">'+
            '<th style="padding:7px 8px;text-align:left;font-weight:700;">姓名</th>'+
            '<th style="padding:7px 8px;text-align:left;font-weight:700;">電話</th>'+
            '<th style="padding:7px 8px;text-align:center;font-weight:700;">分成%</th>'+
            '<th style="padding:7px 8px;text-align:center;font-weight:700;">確認狀態</th>'+
          '</tr></thead><tbody>'+
          teamMembers.map(function(tm){
            var confirmed = tm.confirmed
              ? '<span style="color:#065F46;font-weight:700;">✅ 已確認</span>'
              : '<span style="color:#D97706;">⏳ 待確認</span>';
            return '<tr style="border-bottom:1px solid #F3F4F6;">'+
              '<td style="padding:7px 8px;">'+esc(tm.name_zh)+'</td>'+
              '<td style="padding:7px 8px;font-family:monospace;">'+esc(tm.phone||'—')+'</td>'+
              '<td style="padding:7px 8px;text-align:center;font-weight:700;color:#8B0000;">'+tm.share_pct+'%</td>'+
              '<td style="padding:7px 8px;text-align:center;">'+confirmed+'</td>'+
            '</tr>';
          }).join('')+
          '</tbody></table>';
      }
      // Projects
      if(!projects.length){
        html += '<div style="color:#9CA3AF;text-align:center;padding:20px;">尚未參與任何項目</div>';
      } else {
        var stLbl = {DRAFT:'草稿',ACTIVE:'進行中',SETTLING:'結算中',SETTLED:'已結算',CLOSED:'已關閉'};
        var stColor = {DRAFT:'#9CA3AF',ACTIVE:'#065F46',SETTLING:'#D97706',SETTLED:'#1565C0',CLOSED:'#6B7280'};
        var stBg    = {DRAFT:'#F3F4F6',ACTIVE:'#D1FAE5',SETTLING:'#FEF3C7',SETTLED:'#DBEAFE',CLOSED:'#F3F4F6'};
        html += '<div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:8px;">📊 項目參與記錄</div>'+
          projects.map(function(proj){
            var share = Math.round((proj.team_share_bps||0)/100);
            var earned = 'HK$'+Math.round((proj.earned_cents||0)/100).toLocaleString();
            var st = proj.project_status||'DRAFT';
            return '<div style="background:#F9FAFB;border-radius:8px;padding:10px 12px;margin-bottom:8px;border-left:3px solid '+(stColor[st]||'#9CA3AF')+';">'+
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'+
                '<span style="font-weight:700;color:#1B5E20;">'+esc(proj.project_name)+'</span>'+
                '<span style="font-size:12px;background:'+(stBg[st]||'#F3F4F6')+';color:'+(stColor[st]||'#6B7280')+';padding:2px 8px;border-radius:6px;">'+(stLbl[st]||st)+'</span>'+
              '</div>'+
              '<div style="font-size:12px;color:#6B7280;">'+
                esc(proj.project_code)+' · '+esc(proj.scenario)+
                ' · 角色：<b>'+proj.role+'</b>'+
                ' · 團隊分帳：<b style="color:#8B0000;">'+share+'%</b>'+
                ' · 已結算：<b style="color:#065F46;">'+earned+'</b>'+
              '</div>'+
            '</div>';
          }).join('');
      }
      body.innerHTML = html;
    }).catch(function(e){ body.innerHTML='<div style="color:#DC2626;">載入失敗：'+(e.message||'')+'</div>'; });
}

// ── Projects Tab ──────────────────────────────────────────────────────────────
function loadProjects() {
  fetch('/api/admin/rev/projects').then(function(r){return r.json();}).then(function(d){
    var el = document.getElementById('projList');
    if(!d.ok || !d.projects.length){ el.innerHTML='<div style="color:#9CA3AF;text-align:center;padding:30px;">尚無項目，點擊「新增項目」開始</div>'; return; }
    el.innerHTML = d.projects.map(function(p){
      var stCls = 'proj-status-'+p.status;
      var stLabel = {DRAFT:'草稿',ACTIVE:'進行中',SETTLING:'結算中',SETTLED:'已結算',CLOSED:'已關閉'}[p.status]||p.status;
      return '<div class="proj-card" onclick="openProjModal('+p.id+')" style="cursor:pointer;">'+
        '<div class="proj-card-top">'+
          '<div>'+
            '<span class="proj-code">'+p.project_code+'</span>'+
            '<span class="proj-name" style="margin-left:8px;">'+p.name+'</span>'+
          '</div>'+
          '<span class="status-badge '+stCls+'" style="font-size:12px;padding:3px 10px;border-radius:12px;">'+stLabel+'</span>'+
        '</div>'+
        '<div style="font-size:13px;color:#6B7280;margin-top:4px;">'+p.scenario+' · '+(p.business_type||'—')+' · 建立：'+p.created_at.slice(0,10)+'</div>'+
      '</div>';
    }).join('');
  }).catch(function(){ document.getElementById('projList').innerHTML='<div style="color:#DC2626;padding:20px;">載入失敗</div>'; });
}

function openCreateProject() { document.getElementById('createProjModal').style.display=''; }
function closeCreateProjModal() { document.getElementById('createProjModal').style.display='none'; }

function submitCreateProject() {
  var name = document.getElementById('cpName').value.trim();
  var scenario = document.getElementById('cpScenario').value;
  var bizType = document.getElementById('cpBizType').value.trim();
  var notes = document.getElementById('cpNotes').value.trim();
  var errEl = document.getElementById('cpErr');
  if(!name){ errEl.textContent='請填寫項目名稱'; errEl.style.display=''; return; }
  errEl.style.display='none';
  fetch('/api/admin/rev/project', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name:name, scenario:scenario, business_type:bizType, notes:notes})
  }).then(function(r){return r.json();}).then(function(d){
    if(!d.ok){ errEl.textContent=d.error||'建立失敗'; errEl.style.display=''; return; }
    closeCreateProjModal();
    loadProjects();
    alert('✅ 項目 '+d.project_code+' 已建立！');
  }).catch(function(){ errEl.textContent='網絡錯誤'; errEl.style.display=''; });
}

function closeProjModal() { document.getElementById('projModal').style.display='none'; }

function openProjModal(projId) {
  document.getElementById('projModal').style.display='';
  document.getElementById('projModalTitle').textContent='載入中…';
  document.getElementById('projModalBody').innerHTML='<div style="text-align:center;padding:30px;color:#9CA3AF;">載入中…</div>';
  fetch('/api/admin/rev/project/'+projId+'/statement').then(function(r){return r.json();}).then(function(d){
    if(!d.ok){ document.getElementById('projModalBody').innerHTML='<div style="color:#DC2626;">'+d.error+'</div>'; return; }
    var p = d.project, s = d.shares||{}, sum = d.summary||{};
    document.getElementById('projModalTitle').textContent='📊 '+p.name;
    var stLabel = {DRAFT:'草稿',ACTIVE:'進行中',SETTLING:'結算中',SETTLED:'已結算',CLOSED:'已關閉'}[p.status]||p.status;
    var html = '';
    // 基本資料 + 狀態控制
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">'+
      '<span class="proj-code">'+p.project_code+'</span>'+
      '<span class="status-badge proj-status-'+p.status+'">'+stLabel+'</span>'+
      '<span style="font-size:12px;color:#6B7280;">'+p.scenario+'</span>'+
    '</div>';
    // 分成比例（互助基金15%和平台費15%為固定，其他可調整）
    if(s && s.pct_coleadery!=null){
      var canEdit = (p.status === 'DRAFT' || p.status === 'ACTIVE');
      var shareEditHtml = canEdit
        ? '<div style="margin-top:10px;background:#FFFBEB;border:1.5px solid #FEF08A;border-radius:8px;padding:12px;">'+
            '<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px;">✏️ 調整分成比例（互助基金15%、平台費15%固定不可改）</div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
              shareInputRow('🌟 CoLeadery %', 'adjCL', Math.round(s.pct_coleadery/100))+
              shareInputRow('🤝 CoLinkery %', 'adjCK', Math.round(s.pct_colinkery/100))+
              shareInputRow('🏠 CoOwnery池 %', 'adjCO', Math.round(s.pct_coownery/100))+
              shareInputRow('🛠 CoSupportery池 %', 'adjCS', Math.round(s.pct_cosupportery/100))+
              shareInputRow('🏦 特別帳戶 %', 'adjSA', Math.round(s.pct_special_account/100))+
            '</div>'+
            '<div style="font-size:12px;color:#6B7280;margin:6px 0;">互助基金：<b>15%</b>（固定）&nbsp;·&nbsp; 平台費：<b>15%</b>（固定）&nbsp;·&nbsp; 七方合計必須 = 100%</div>'+
            '<div id="adjShareMsg" style="font-size:13px;margin:4px 0;display:none;"></div>'+
            '<button class="btn btn-secondary btn-sm" onclick="submitShareAdj('+projId+')">💾 更新比例</button>'+
          '</div>'
        : '';
      html += '<div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:6px;">分成比例</div>'+
        '<div class="share-grid">'+
          shareRow('🌟 CoLeadery',s.pct_coleadery)+shareRow('🤝 CoLinkery',s.pct_colinkery)+
          shareRow('🏠 CoOwnery池',s.pct_coownery)+shareRow('🛠 CoSupportery池',s.pct_cosupportery)+
          shareRow('❤️ 互助基金',s.pct_mutual_fund)+shareRow('💼 平台費',s.pct_platform_fee)+
          shareRow('🏦 特別帳戶',s.pct_special_account)+
        '</div>'+
        shareEditHtml;
    }
    // 參與者（含 GROUP 成員展開）
    if(d.participants && d.participants.length){
      html += '<div style="font-size:14px;font-weight:700;color:#374151;margin:12px 0 6px;">參與者</div>'+
        '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">'+
        '<thead><tr style="background:#F9FAFB;">'+
          '<th style="padding:6px 8px;text-align:left;">角色</th>'+
          '<th style="padding:6px 8px;text-align:left;">姓名</th>'+
          '<th style="padding:6px 8px;text-align:left;">持有人編號</th>'+
          '<th style="padding:6px 8px;text-align:center;">整體分帳%</th>'+
          '<th style="padding:6px 8px;text-align:center;">狀態</th>'+
        '</tr></thead><tbody>'+
        d.participants.map(function(pp){
          var roleEmoji = pp.holder_role==='COLEADERY'?'🌟 CoLeadery':'🤝 CoLinkery';
          var share = Math.round((pp.team_share_bps||0)/100);
          var cs = pp.confirm_status==='CONFIRMED'?'<span style="color:#065F46;font-weight:700;">✅</span>':'<span style="color:#D97706;">⏳</span>';
          var typeTag = pp.applicant_type==='GROUP'
            ? '<span style="font-size:10px;background:#DBEAFE;color:#1e40af;padding:1px 5px;border-radius:4px;margin-left:4px;">小組</span>'
            : (pp.applicant_type==='COMPANY'?'<span style="font-size:10px;background:#FEF3C7;color:#92400e;padding:1px 5px;border-radius:4px;margin-left:4px;">公司</span>':'');
          var rows = '<tr style="border-bottom:1px solid #E5E7EB;background:#F9FAFB;">'+
            '<td style="padding:6px 8px;">'+roleEmoji+'</td>'+
            '<td style="padding:6px 8px;font-weight:600;">'+esc(pp.name_zh)+typeTag+'</td>'+
            '<td style="padding:6px 8px;font-family:monospace;font-size:12px;">'+esc(pp.holder_no)+'</td>'+
            '<td style="padding:6px 8px;text-align:center;font-weight:700;color:#8B0000;">'+share+'%</td>'+
            '<td style="padding:6px 8px;text-align:center;">'+cs+'</td>'+
          '</tr>';
          // 如為 GROUP，展開每個成員行
          if(pp.applicant_type==='GROUP' && pp.team_members && pp.team_members.length){
            pp.team_members.forEach(function(tm){
              var tmConfirm = tm.confirmed
                ? '<span style="color:#065F46;">✅</span>'
                : '<span style="color:#D97706;">⏳待確認</span>';
              rows += '<tr style="border-bottom:1px solid #F3F4F6;background:#fff;">'+
                '<td style="padding:4px 8px 4px 24px;color:#9CA3AF;font-size:12px;">└ 成員</td>'+
                '<td style="padding:4px 8px;font-size:12px;">'+esc(tm.name_zh)+'<span style="font-size:11px;color:#9CA3AF;margin-left:4px;">'+esc(tm.phone||'')+'</span></td>'+
                '<td style="padding:4px 8px;font-size:11px;color:#9CA3AF;">'+esc(tm.member_no||'—')+'</td>'+
                '<td style="padding:4px 8px;text-align:center;font-size:12px;font-weight:700;color:#1e40af;">'+tm.share_pct+'%</td>'+
                '<td style="padding:4px 8px;text-align:center;font-size:12px;">'+tmConfirm+'</td>'+
              '</tr>';
            });
          }
          return rows;
        }).join('')+
        '</tbody></table>';
    }
    // 損益彙總
    html += '<div style="font-size:14px;font-weight:700;color:#374151;margin:14px 0 8px;">💰 損益彙總</div>'+
      '<div style="background:#F9FAFB;border-radius:8px;padding:12px;">'+
      '<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;"><span>收入合計</span><span class="ledger-INCOME">HK$'+Math.round((sum.income||0)/100).toLocaleString()+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;"><span>支出合計</span><span class="ledger-cost">HK$'+Math.round((sum.costs||0)/100).toLocaleString()+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;border-top:1px solid #E5E7EB;padding-top:8px;margin-top:4px;"><span>淨利潤</span><span style="color:'+(sum.net_profit>=0?'#065F46':'#991B1B')+';">HK$'+Math.round((sum.net_profit||0)/100).toLocaleString()+'</span></div>'+
      '</div>';
    // 錄入賬目
    html += '<div style="font-size:14px;font-weight:700;color:#374151;margin:14px 0 8px;">📝 錄入賬目</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'+
        '<select id="ledType" style="padding:8px 10px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:13px;">'+
          '<option value="INCOME">收入 INCOME</option>'+
          '<option value="DIRECT_COST">支出 DIRECT_COST</option>'+
          '<option value="FIXED_DEDUCTION">固定扣除 FIXED_DEDUCTION</option>'+
        '</select>'+
        '<input id="ledAmt" type="number" placeholder="金額（港元）" style="padding:8px 10px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:13px;">'+
      '</div>'+
      '<input id="ledDesc" type="text" placeholder="描述（如：葵青場銷售收入 7月）" style="width:100%;padding:8px 10px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:13px;margin-bottom:8px;">'+
      '<button class="btn btn-primary btn-sm" onclick="submitLedger('+projId+')">➕ 錄入賬目</button>';
    // 賬目明細
    if(d.ledger && d.ledger.length){
      html += '<div style="font-size:14px;font-weight:700;color:#374151;margin:14px 0 6px;">📄 賬目明細</div>'+
        d.ledger.map(function(l){
          var isIncome = l.entry_type==='INCOME';
          var amtStr = (isIncome?'+':'-')+'HK$'+Math.round(l.amount_cents/100).toLocaleString();
          return '<div class="ledger-row"><span>'+l.entry_type+'<br><span style="color:#9CA3AF;font-size:11px;">'+l.description+'</span></span>'+
            '<span class="'+(isIncome?'ledger-INCOME':'ledger-cost')+'">'+amtStr+'</span></div>';
        }).join('');
    }
    // 添加參與者
    html += '<div style="font-size:14px;font-weight:700;color:#374151;margin:14px 0 8px;">👤 綁定參與者</div>'+
      '<div style="font-size:12px;color:#6B7280;margin-bottom:8px;background:#F9FAFB;padding:6px 10px;border-radius:6px;">'+
        '📌 每個項目只能綁定 <b>1 個 CoLeadery</b>（領航者，1:1）；CoLinkery 可綁定多個（連結者，1:N）'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center;">'+
        '<input id="ppHolderNo" type="text" placeholder="持有人編號 CL000001 / CK000001" style="padding:8px 10px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:13px;">'+
        '<select id="ppRole" style="padding:8px 10px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:13px;">'+
          '<option value="COLEADERY">🌟 CoLeadery（唯一）</option><option value="COLINKERY">🤝 CoLinkery（可多個）</option>'+
        '</select>'+
        '<button class="btn btn-secondary btn-sm" onclick="submitParticipant('+projId+')">綁定</button>'+
      '</div>'+
      '<div id="ppMsg" style="font-size:12px;margin-top:4px;"></div>';
    // 結算按鈕
    if(p.status==='ACTIVE'){
      html += '<div style="margin-top:16px;border-top:1.5px solid #E5E7EB;padding-top:14px;">'+
        '<button class="btn btn-primary" onclick="triggerSettle('+projId+')" style="background:#065F46;">💰 觸發結算</button>'+
        '<div style="font-size:12px;color:#6B7280;margin-top:6px;">結算後將按比例計算各方分潤並記入錢包</div>'+
      '</div>';
    }
    document.getElementById('projModalBody').innerHTML = html;
  }).catch(function(e){ document.getElementById('projModalBody').innerHTML='<div style="color:#DC2626;">載入失敗：'+e.message+'</div>'; });
}

function shareRow(label, bps){ return '<div class="share-row"><span>'+label+'</span><span style="font-weight:700;">'+Math.round((bps||0)/100)+'%</span></div>'; }

function shareInputRow(label, id, val) {
  return '<div>'+
    '<label style="font-size:12px;color:#6B7280;display:block;margin-bottom:3px;">'+label+'</label>'+
    '<input id="'+id+'" type="number" min="0" max="100" step="1" value="'+val+'" style="width:100%;padding:7px 10px;border:1.5px solid #D1D5DB;border-radius:7px;font-size:13px;">'+
  '</div>';
}

function submitShareAdj(projId) {
  var cl = parseFloat(document.getElementById('adjCL').value)||0;
  var ck = parseFloat(document.getElementById('adjCK').value)||0;
  var co = parseFloat(document.getElementById('adjCO').value)||0;
  var cs = parseFloat(document.getElementById('adjCS').value)||0;
  var sa = parseFloat(document.getElementById('adjSA').value)||0;
  var total = cl+ck+co+cs+sa+15+15;  // +互助基金15% +平台費15%
  var msgEl = document.getElementById('adjShareMsg');
  msgEl.style.display='';
  if(Math.abs(total-100)>0.01){
    msgEl.style.color='#DC2626';
    msgEl.textContent='合計目前：'+total+'%，必須剛好等於 100%（已含互助基金15%+平台費15%）';
    return;
  }
  msgEl.style.color='#888';
  msgEl.textContent='更新中…';
  fetch('/api/admin/rev/project/'+projId+'/shares',{
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pct_coleadery:cl,pct_colinkery:ck,pct_coownery:co,pct_cosupportery:cs,pct_special_account:sa})
  }).then(function(r){return r.json();}).then(function(d){
    if(!d.ok){ msgEl.style.color='#DC2626'; msgEl.textContent=d.error||'更新失敗'; return; }
    msgEl.style.color='#065F46'; msgEl.textContent='✅ 分成比例已更新！';
    setTimeout(function(){ openProjModal(projId); }, 800);
  }).catch(function(){ msgEl.style.color='#DC2626'; msgEl.textContent='網絡錯誤'; });
}

function submitLedger(projId) {
  var type = document.getElementById('ledType').value;
  var amt = parseFloat(document.getElementById('ledAmt').value)||0;
  var desc = document.getElementById('ledDesc').value.trim();
  if(!amt){ alert('請填寫金額'); return; }
  fetch('/api/admin/rev/ledger',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({project_id:projId,entry_type:type,description:desc,amount_cents:Math.round(amt*100)})
  }).then(function(r){return r.json();}).then(function(d){
    if(!d.ok){ alert(d.error||'錄入失敗'); return; }
    openProjModal(projId); // 重新載入
  }).catch(function(){ alert('網絡錯誤'); });
}

function submitParticipant(projId) {
  var holderNo = document.getElementById('ppHolderNo').value.trim();
  var role = document.getElementById('ppRole').value;
  var msgEl = document.getElementById('ppMsg');
  if(!holderNo){ msgEl.style.color='#DC2626'; msgEl.textContent='請填寫持有人編號'; return; }
  fetch('/api/admin/rev/project/'+projId+'/participants',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({holder_no:holderNo,role:role,team_share_bps:10000})
  }).then(function(r){return r.json();}).then(function(d){
    if(!d.ok){ msgEl.style.color='#DC2626'; msgEl.textContent=d.error||'綁定失敗'; return; }
    msgEl.style.color='#065F46'; msgEl.textContent='✅ 已綁定'+(d.warning?' · '+d.warning:'');
    openProjModal(projId);
  }).catch(function(){ msgEl.style.color='#DC2626'; msgEl.textContent='網絡錯誤'; });
}

function triggerSettle(projId) {
  if(!confirm('確認觸發結算？此操作將計算各方分潤並記入錢包，且會將項目狀態改為「結算中」。')) return;
  fetch('/api/admin/rev/project/'+projId+'/settle',{method:'POST'})
    .then(function(r){return r.json();}).then(function(d){
      if(!d.ok){ alert(d.error||'結算失敗'); return; }
      alert('✅ 結算完成！淨利潤：HK$'+Math.round(d.net_profit/100)+' · 共 '+d.entries_created+' 筆分潤記錄已建立');
      openProjModal(projId);
    }).catch(function(){ alert('網絡錯誤'); });
}
// ── End Revenue ──────────────────────────────────────────────────────────────
</script>
</body>
</html>`
}

// ─── CoWorkery 長者手機打卡頁 ──────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] coworkeryAppHtml — pure mechanical move

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
.topbar{background:var(--green-dark);color:#fff;padding:0 16px;display:flex;align-items:center;gap:10px;height:58px;position:sticky;top:0;z-index:100;}
.topbar-logo{height:40px;width:auto;object-fit:contain;flex-shrink:0;}
.topbar-spacer{flex:1;}
/* Hamburger menu button (left) */
.menu-btn{background:none;border:none;color:#fff;cursor:pointer;padding:8px;display:flex;flex-direction:column;justify-content:center;gap:5px;flex-shrink:0;-webkit-tap-highlight-color:transparent;}
.menu-btn span{display:block;width:24px;height:2.5px;background:#fff;border-radius:2px;}
/* Side drawer overlay */
.drawer-overlay{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.45);}
.drawer-overlay.open{display:block;}
.drawer{position:fixed;top:0;left:0;bottom:0;width:280px;max-width:85vw;background:#fff;z-index:9001;transform:translateX(-100%);transition:transform 0.28s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,0,0,0.18);}
.drawer.open{transform:translateX(0);}
.drawer-header{background:var(--green-dark);color:#fff;padding:20px 18px 16px;display:flex;align-items:center;justify-content:space-between;}
.drawer-header-title{font-size:18px;font-weight:900;letter-spacing:1px;}
.drawer-close{background:none;border:none;color:#fff;font-size:26px;cursor:pointer;line-height:1;padding:2px 6px;}
.drawer-body{flex:1;overflow-y:auto;padding:8px 0 20px;}
.drawer-section-title{font-size:11px;font-weight:700;color:#9CA3AF;letter-spacing:2px;text-transform:uppercase;padding:16px 20px 6px;}
.drawer-item{display:flex;align-items:center;gap:12px;padding:13px 20px;font-size:16px;font-weight:600;color:#111827;cursor:pointer;border:none;background:none;width:100%;text-align:left;-webkit-tap-highlight-color:transparent;}
.drawer-item:active{background:#F3F4F6;}
.drawer-item .di-icon{font-size:22px;width:28px;text-align:center;flex-shrink:0;}
.drawer-item .di-sub{font-size:12px;color:#6B7280;font-weight:400;margin-top:2px;}
.drawer-divider{height:1px;background:#E5E7EB;margin:8px 16px;}
.drawer-sub-item{display:flex;align-items:center;gap:12px;padding:11px 20px 11px 52px;font-size:15px;font-weight:600;color:#374151;cursor:pointer;border:none;background:none;width:100%;text-align:left;-webkit-tap-highlight-color:transparent;}
.drawer-sub-item:active{background:#F3F4F6;}
.drawer-sub-item .di-icon{font-size:20px;width:24px;text-align:center;flex-shrink:0;}

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
  <!-- 左：CoEldery 85 Logo -->
  <img src="/static/logo-coeldery85-white.png" alt="CoEldery 85" class="topbar-logo">
  <!-- 右：漢堡選單 -->
  <div class="topbar-spacer"></div>
  <button class="menu-btn" onclick="openDrawer()" aria-label="選單">
    <span></span><span></span><span></span>
  </button>
</div>

<!-- ── 側邊抽屜選單 ── -->
<div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>
<div class="drawer" id="sideDrawer">
  <div class="drawer-header">
    <div class="drawer-header-title">CoEldery 85 選單</div>
    <button class="drawer-close" onclick="closeDrawer()">&times;</button>
  </div>
  <div class="drawer-body">
    <!-- CoEldery 85 合作計劃 -->
    <div class="drawer-section-title">CoEldery 85 合作計劃</div>
    <button class="drawer-sub-item" id="drawerBtnCoLeadery" onclick="closeDrawer();drawerOpenCoLeadery()">
      <span class="di-icon">🌟</span>
      <div>
        <div>CoLeadery 領航者</div>
        <div class="di-sub">分享項目淨利潤</div>
      </div>
    </button>
    <button class="drawer-sub-item" id="drawerBtnCoLinkery" onclick="closeDrawer();drawerOpenCoLinkery()">
      <span class="di-icon">🤝</span>
      <div>
        <div>CoLinkery 連結者</div>
        <div class="di-sub">連接 B2B 商業客戶</div>
      </div>
    </button>
    <div class="drawer-divider"></div>
    <!-- 有用資訊 -->
    <div class="drawer-section-title">資訊</div>
    <button class="drawer-item" onclick="closeDrawer();openUsefulLinksPanel()">
      <span class="di-icon">ℹ️</span>
      <div>
        <div>有用資訊</div>
        <div class="di-sub">優惠、資源、連結</div>
      </div>
    </button>
    <div class="drawer-divider"></div>
    <!-- 產品測試 -->
    <div class="drawer-section-title">會員專屬活動</div>
    <button class="drawer-item" onclick="closeDrawer();openTestingPanel()" style="border:2px solid #ede9fe;border-radius:12px;background:linear-gradient(135deg,#faf5ff,#f5f3ff);">
      <span class="di-icon">🧪</span>
      <div>
        <div style="font-weight:800;color:#6d28d9;">產品測試計劃</div>
        <div class="di-sub">試用新品 → 填問卷 → 贏獎勵</div>
      </div>
    </button>
  </div>
</div>

<!-- ── Tab 面板：福利 ── -->
<div id="tabShop" style="display:none;padding:16px 14px 90px;">
  <!-- Category filter tabs -->
  <div id="appBnfCatTabs" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:14px;-webkit-overflow-scrolling:touch;scrollbar-width:none;">
    <div style="flex-shrink:0;padding:6px 16px;border-radius:20px;background:#1B4332;color:#fff;font-size:14px;font-weight:700;cursor:pointer;" data-cid="0" onclick="appBnfFilterCat(0,this)">全部</div>
  </div>
  <!-- Benefits list -->
  <div id="shopLoadingMsg" style="text-align:center;padding:50px 20px;font-size:18px;color:#6B7280;">載入中…</div>
  <div id="shopEmptyMsg" style="display:none;text-align:center;padding:50px 20px;">
    <div style="font-size:52px;margin-bottom:14px;">🎁</div>
    <div style="font-size:20px;font-weight:700;color:#555;">暫時未有福利，敬請期待 🙏</div>
  </div>
  <div id="appBnfList" style="display:flex;flex-direction:column;gap:14px;"></div>
</div>

<!-- Benefits Detail Panel (full screen overlay in app) -->
<div id="appBnfDetail" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:1100;overflow-y:auto;">
  <div style="position:sticky;top:0;background:#fff;padding:14px 16px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px;z-index:1;">
    <button onclick="appBnfCloseDetail()" style="background:#f5f5f5;border:none;border-radius:50%;width:38px;height:38px;font-size:20px;cursor:pointer;">←</button>
    <div style="font-size:17px;font-weight:800;color:#1B4332;">福利詳情</div>
  </div>
  <div id="appBnfDetailContent" style="padding:0 0 100px;"></div>
</div>

<!-- ── Tab 面板：消息 ── -->
<div id="tabNews" style="display:none;padding:18px 16px 90px;">
  <div style="font-size:26px;font-weight:900;color:#1a6b1a;margin-bottom:16px;letter-spacing:1px;">📢 最新消息</div>
  <div id="newsLoadingMsg" style="text-align:center;padding:50px 20px;font-size:20px;color:#6B7280;">載入中…</div>
  <div id="newsEmptyMsg" style="display:none;text-align:center;padding:50px 20px;">
    <div style="font-size:52px;margin-bottom:14px;">🙏</div>
    <div style="font-size:22px;font-weight:700;color:#555;">暫時未有消息 🙏</div>
  </div>
  <div id="newsCards" style="display:flex;flex-direction:column;gap:16px;"></div>
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
      <!-- 產品測試問卷快捷入口 -->
      <div id="testingShortcut" style="margin:14px 0 4px;display:none;">
        <button onclick="openTestingPanel()" style="width:100%;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:12px;padding:14px 18px;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:12px;box-shadow:0 3px 12px rgba(124,58,237,0.35);">
          <span style="font-size:26px;">🧪</span>
          <div style="text-align:left;flex:1;">
            <div>產品測試計劃</div>
            <div style="font-size:13px;font-weight:500;opacity:0.85;margin-top:2px;">查看我的試用 / 填寫問卷</div>
          </div>
          <span style="font-size:20px;">›</span>
        </button>
      </div>
      <!-- 換人 -->
      <div class="switch-wrap">
        <button class="switch-link" onclick="switchUser()">唔係你？換人</button>
      </div>
    </div>

  </div>
</div>

<!-- ── Tab 面板：心聲 ── -->
<div id="tabVoice" style="display:none;padding:18px 16px 90px;">
  <!-- 未登入提示 -->
  <div id="voiceNoLogin" style="display:none;text-align:center;padding:60px 20px;">
    <div style="font-size:52px;margin-bottom:16px;">🔐</div>
    <div style="font-size:22px;font-weight:700;color:#333;margin-bottom:14px;line-height:1.5;">請先登入 / 註冊會員<br>才可以使用心聲功能</div>
    <button onclick="switchTab('card')" style="min-height:55px;padding:14px 28px;background:#228B22;color:#fff;border:none;border-radius:10px;font-size:20px;font-weight:700;cursor:pointer;">
      💳 前往登入 / 查閱我的卡
    </button>
  </div>

  <!-- 已登入：列表頁 -->
  <div id="voiceListView" style="display:none;">
    <div style="font-size:26px;font-weight:900;color:#1a6b1a;margin-bottom:16px;letter-spacing:1px;">💬 我的心聲</div>
    <button onclick="openNewFeedbackForm()" style="display:block;width:100%;min-height:55px;padding:14px;background:#228B22;color:#fff;border:none;border-radius:10px;font-size:20px;font-weight:900;cursor:pointer;margin-bottom:20px;letter-spacing:1px;">
      ＋ 我要留言 / 提意見
    </button>
    <div id="voiceThreads" style="display:flex;flex-direction:column;gap:14px;">
      <div style="text-align:center;padding:30px;font-size:20px;color:#888;">載入中…</div>
    </div>
  </div>

  <!-- 新增意見表單 (hidden) -->
  <div id="voiceNewForm" style="display:none;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <button onclick="closeNewFeedbackForm()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#228B22;padding:0;line-height:1;">&#8592;</button>
      <div style="font-size:24px;font-weight:900;color:#1a6b1a;">提交意見</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div>
        <label style="font-size:20px;font-weight:700;color:#222;display:block;margin-bottom:8px;">主題 *</label>
        <input id="vSubject" type="text" maxlength="80" placeholder="簡短描述你的意見主題"
          style="width:100%;padding:14px;font-size:20px;border:2.5px solid #388e3c;border-radius:10px;font-family:inherit;min-height:55px;">
      </div>
      <div>
        <label style="font-size:20px;font-weight:700;color:#222;display:block;margin-bottom:8px;">內容 *</label>
        <textarea id="vContent" rows="5" placeholder="詳細說明你的意見或建議…"
          style="width:100%;padding:14px;font-size:20px;border:2.5px solid #388e3c;border-radius:10px;font-family:inherit;resize:vertical;line-height:1.6;"></textarea>
      </div>
      <button onclick="submitNewFeedback()" id="vSubmitBtn"
        style="width:100%;min-height:58px;padding:16px;background:#228B22;color:#fff;border:none;border-radius:10px;font-size:22px;font-weight:900;cursor:pointer;letter-spacing:1px;">
        📤 提交意見
      </button>
    </div>
  </div>

  <!-- Thread 詳情頁 (hidden) -->
  <div id="voiceThreadDetail" style="display:none;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <button onclick="closeVoiceThread()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#228B22;padding:0;line-height:1;">&#8592;</button>
      <div id="voiceDetailSubject" style="font-size:22px;font-weight:900;color:#1a6b1a;flex:1;"></div>
    </div>
    <div id="voiceMsgList" style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;"></div>
    <div id="voiceReplyBox" style="background:#fff;border:2px solid #388e3c;border-radius:10px;padding:16px;">
      <label style="font-size:20px;font-weight:700;color:#222;display:block;margin-bottom:8px;">繼續回覆</label>
      <textarea id="vReplyText" rows="3" placeholder="輸入你的回覆…"
        style="width:100%;padding:12px;font-size:20px;border:1.5px solid #ddd;border-radius:8px;font-family:inherit;resize:vertical;line-height:1.6;margin-bottom:10px;"></textarea>
      <button onclick="submitVoiceReply()" id="vReplyBtn"
        style="width:100%;min-height:55px;padding:14px;background:#228B22;color:#fff;border:none;border-radius:10px;font-size:20px;font-weight:900;cursor:pointer;">
        📤 發送
      </button>
    </div>
    <div id="voiceClosedNote" style="display:none;text-align:center;padding:14px;font-size:18px;color:#888;background:#f5f5f5;border-radius:8px;margin-top:10px;">
      🔒 此對話已關閉，如有需要請新開意見
    </div>
  </div>
</div>

<!-- ── Tab 面板：工作 ── -->
<div id="tabWork" style="display:none;padding-bottom:80px">
  <!-- 工作列表頁 -->
  <div id="jobListView">
    <div style="padding:16px 16px 8px;font-size:22px;font-weight:800;color:#111827">💼 工作市場</div>
    <!-- CoWorkery 打卡入口 -->
    <a href="/app/coworkery" style="display:block;margin:4px 12px 16px;padding:20px 20px 18px;background:linear-gradient(135deg,#0369a1 0%,#0284c7 100%);border-radius:16px;color:#fff;text-decoration:none;box-shadow:0 4px 16px rgba(3,105,161,0.25);-webkit-tap-highlight-color:transparent">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:40px;line-height:1">👷</div>
        <div>
          <div style="font-size:20px;font-weight:800;letter-spacing:0.5px;margin-bottom:3px">CoWorkery 打卡</div>
          <div style="font-size:15px;opacity:0.88">上班 / 下班打卡 · 人手管理</div>
        </div>
        <div style="margin-left:auto;font-size:26px;opacity:0.7">›</div>
      </div>
    </a>
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

<!-- ── 產品測試計劃 面板 ── -->
<div id="testing-panel" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,0.5);flex-direction:column;align-items:center;justify-content:flex-end">
  <div style="background:#f9fafb;width:100%;max-width:480px;border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,16px);max-height:92vh;display:flex;flex-direction:column">
    <div style="background:#7c3aed;color:#fff;border-radius:20px 20px 0 0;padding:16px 20px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-size:20px;font-weight:900;">🧪 產品測試計劃</div>
      <button onclick="closeTestingPanel()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#fff;padding:4px 8px;line-height:1">&times;</button>
    </div>
    <div style="overflow-y:auto;padding:14px 16px 16px;-webkit-overflow-scrolling:touch;flex:1;">
      <!-- Main view -->
      <div id="tst-panel-main">
        <!-- Join confirm (shown when arriving via QR) -->
        <div id="tst-join-confirm" style="display:none;margin-bottom:14px;"></div>
        <!-- Available campaigns to join -->
        <div id="tst-available-section" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:800;color:#5b21b6;margin-bottom:10px;">🎯 可參加的試用計劃</div>
          <div id="tst-available-list">
            <div style="text-align:center;padding:20px;color:#9ca3af;font-size:15px;">載入中…</div>
          </div>
        </div>
        <!-- My joined campaigns -->
        <div>
          <div style="font-size:14px;font-weight:800;color:#5b21b6;margin-bottom:10px;">📋 我的測試計劃</div>
          <div id="tst-my-list">
            <div style="text-align:center;padding:20px;color:#9ca3af;font-size:15px;">載入中…</div>
          </div>
        </div>
      </div>
      <!-- Survey view -->
      <div id="tst-panel-survey" style="display:none;"></div>
    </div>
  </div>
</div>

<!-- ── 底部 5-tab 導航列 ── -->
<nav class="bottom-tab-bar" id="bottomTabBar">
  <button class="tab-btn" id="tabBtnShop" onclick="switchTab('shop')">
    <span class="tab-icon">🎁</span>
    <span class="tab-label">福利</span>
  </button>
  <button class="tab-btn" id="tabBtnNews" onclick="switchTab('news')">
    <span class="tab-icon">📢</span>
    <span class="tab-label">消息</span>
  </button>
  <button class="tab-btn tab-card-btn active" id="tabBtnCard" onclick="switchTab('card')">
    <span class="tab-icon">💳</span>
    <span class="tab-label">我的卡</span>
  </button>
  <button class="tab-btn" id="tabBtnVoice" onclick="switchTab('voice')" style="position:relative;">
    <span class="tab-icon">💬</span>
    <span class="tab-label">心聲</span>
    <span id="voiceRedDot" style="display:none;position:absolute;top:8px;right:14px;width:10px;height:10px;background:#e53935;border-radius:50%;border:2px solid #fff;"></span>
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

// ── 接收 card iframe 的 postMessage ──
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'ce85_wa_clicked') {
    localStorage.setItem('ce85_wa_clicked', '1');
    showInstallBanner();
  }
  if (e.data && e.data.type === 'ce85_logout') {
    // 卡頁按登出 → 清除所有 session 並重新載入 /app 顯示輸入框
    localStorage.removeItem('ce85_member_no');
    localStorage.removeItem('ce85_wa_clicked');
    sessionStorage.removeItem('cw_session');
    window.location.reload();
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
        // 換新帳號登入時，清除舊的 CoWorkery 打卡 session
        sessionStorage.removeItem('cw_session');
        localStorage.setItem('ce85_member_no', memberNo);
        // 同時存 phone（電話號碼），方便跳轉申請頁/錢包頁時預填
        var inputVal = document.getElementById('phoneInput').value.trim();
        if (inputVal) localStorage.setItem('ce85_phone', inputVal);
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
      '<div id="testingShortcut" style="margin:14px 0 4px;">' +
        '<button onclick="openTestingPanel()" style="width:100%;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:12px;padding:14px 18px;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:12px;box-shadow:0 3px 12px rgba(124,58,237,0.35);">' +
          '<span style="font-size:26px;">🧪</span>' +
          '<div style="text-align:left;flex:1;">' +
            '<div>產品測試計劃</div>' +
            '<div style="font-size:13px;font-weight:500;opacity:0.85;margin-top:2px;">查看我的試用 / 填寫問卷</div>' +
          '</div>' +
          '<span style="font-size:20px;">›</span>' +
        '</button>' +
      '</div>' +
      '<div class="switch-wrap"><button class="switch-link" onclick="switchUser()">唔係你？換人</button></div>' +
    '</div>';
  // partnerEntrySection removed — CoLeadery / CoLinkery moved to ☰ side drawer menu
  wrap.innerHTML = iframeHtml + installHtml;
  // Pre-load partner status for drawer buttons
  loadDrawerPartnerStatus(memberNo);
  // 用戶已點過 WA 按鈕 → 立即展開安裝提示
  if (waClicked) {
    showInstallBanner();
  }
  // 處理產品測試 QR 掃描
  if(window._pendingTestingCode){
    var tc = window._pendingTestingCode;
    window._pendingTestingCode = null;
    setTimeout(function(){ testingHandleQRScan(tc); }, 400);
  }
}

// 查詢申請狀態並動態調整按鈕
function loadPartnerStatus(memberNo) {
  var p = localStorage.getItem('ce85_phone') || '';
  fetch('/api/partner/my-status?member_no=' + encodeURIComponent(memberNo))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      setupPartnerBtns(memberNo, p, d.coleadery || null, d.colinkery || null);
    })
    .catch(function() {
      // 查詢失敗時降級到普通申請入口
      setupPartnerBtns(memberNo, p, null, null);
    });
}

function setupPartnerBtns(memberNo, phone, clStatus, ckStatus) {
  var bpa = document.getElementById('btnPartnerApply');
  var bcl = document.getElementById('btnCoLinkery');

  // ── CoLeadery 按鈕 ──
  if (bpa) {
    if (clStatus === 'APPROVED') {
      // 已批准：進入錢包/工具
      bpa.querySelector('div:last-child').textContent = '領航者｜進入工具 →';
      bpa.style.background = 'linear-gradient(135deg,#1B5E20,#2E7D32)';
      bpa.addEventListener('click', function() {
        window.location.href = '/app/wallet?member=' + encodeURIComponent(memberNo) + (phone ? '&phone=' + encodeURIComponent(phone) : '');
      });
    } else if (clStatus === 'PENDING') {
      // 待審核：顯示狀態，仍可用其他類型申請
      bpa.querySelector('div:last-child').textContent = '審核中… ⏳';
      bpa.style.opacity = '0.85';
      bpa.style.background = 'linear-gradient(135deg,#78350F,#B45309)';
      bpa.addEventListener('click', function() {
        if (confirm('⏳ CoLeadery 申請審核中（3-5 工作天）。如想以不同類型再申請（如：個人→小組），請按確定前往申請頁。')) {
          window.location.href = '/app/partner-apply?member=' + encodeURIComponent(memberNo) + (phone ? '&phone=' + encodeURIComponent(phone) : '') + '&role=COLEADERY';
        }
      });
    } else {
      // 未申請：進入申請
      bpa.addEventListener('click', function() {
        window.location.href = '/app/partner-apply?member=' + encodeURIComponent(memberNo) + (phone ? '&phone=' + encodeURIComponent(phone) : '') + '&role=COLEADERY';
      });
    }
  }

  // ── CoLinkery 按鈕 ──
  if (bcl) {
    if (ckStatus === 'APPROVED') {
      // 已批准：進入 CoLinkery 工具
      bcl.querySelector('div:last-child').textContent = '連結者｜進入工具 →';
      bcl.style.background = 'linear-gradient(135deg,#0D47A1,#1565C0)';
      bcl.addEventListener('click', function() {
        window.location.href = '/colinkery/' + (phone ? '?phone=' + encodeURIComponent(phone) : '');
      });
    } else if (ckStatus === 'PENDING') {
      // 待審核：顯示狀態，仍可用其他類型申請
      bcl.querySelector('div:last-child').textContent = '審核中… ⏳';
      bcl.style.opacity = '0.85';
      bcl.style.background = 'linear-gradient(135deg,#0A2F6F,#1A4BA0)';
      bcl.addEventListener('click', function() {
        if (confirm('⏳ CoLinkery 申請審核中（3-5 工作天）。如想以不同類型再申請（如：個人→公司），請按確定前往申請頁。')) {
          window.location.href = '/app/partner-apply?member=' + encodeURIComponent(memberNo) + (phone ? '&phone=' + encodeURIComponent(phone) : '') + '&role=COLINKERY';
        }
      });
    } else {
      // 未申請：進入申請
      bcl.addEventListener('click', function() {
        window.location.href = '/app/partner-apply?member=' + encodeURIComponent(memberNo) + (phone ? '&phone=' + encodeURIComponent(phone) : '') + '&role=COLINKERY';
      });
    }
  }
}

// ── 換人（清除 localStorage + CoWorkery session）──
function switchUser() {
  if (confirm('確定要換人？將會清除記住的帳號。')) {
    localStorage.removeItem('ce85_member_no');
    localStorage.removeItem('ce85_wa_clicked');
    // 同時清除 CoWorkery 打卡 session，避免新帳號進入時仍用舊帳號打卡
    sessionStorage.removeItem('cw_session');
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

  // ── 產品測試 QR 掃描參數 ──────────────────────────────────────────────────
  var urlParams = new URLSearchParams(window.location.search);
  var testingCode = urlParams.get('testing');
  if(testingCode){
    // Clean URL
    window.history.replaceState({},'',window.location.origin+'/app');
    var _savedMemberNo = localStorage.getItem('ce85_member_no');
    if(_savedMemberNo){
      // 已登入：立即觸發 QR 掃描流程，不用等候 showCard()
      window._pendingTestingCode = null;
      setTimeout(function(){ testingHandleQRScan(testingCode); }, 800);
    } else {
      // 未登入：保留 code，登入後由 showCard() 觸發
      window._pendingTestingCode = testingCode;
      // 顯示提示 banner 告知用戶
      setTimeout(function(){
        var b=document.createElement('div');
        b.id='testingLoginBanner';
        b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9998;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 16px rgba(0,0,0,0.25);';
        b.innerHTML='<div style="font-size:28px;">&#129514;</div>'
          +'<div style="flex:1;"><div style="font-weight:800;font-size:15px;margin-bottom:2px;">試用計劃 QR 已掃描</div>'
          +'<div style="font-size:13px;opacity:0.9;">請輸入會員號碼登入，系統將自動跳轉至問卷</div></div>';
        document.body.appendChild(b);
      }, 300);
    }
  }

  // ── WA Quick Register Token 自動登入 ──────────────────────────────────────
  var waToken = urlParams.get('token');
  var waSource = urlParams.get('source');
  if (waToken && waSource === 'wa_quick_register') {
    // Show loading state
    var wrap = document.getElementById('mainWrap') || document.body;
    var loadEl = document.createElement('div');
    loadEl.id = 'tokenLoadingBanner';
    loadEl.style.cssText = 'position:fixed;inset:0;background:linear-gradient(160deg,#1a6b1a,#388e3c);display:flex;align-items:center;justify-content:center;z-index:9999;';
    loadEl.innerHTML = '<div style="text-align:center;color:#fff;padding:40px"><div style="font-size:48px;margin-bottom:16px">🎉</div><div style="font-size:22px;font-weight:900;margin-bottom:8px">歡迎加入 CoEldery 85！</div><div style="font-size:15px;opacity:0.85">正在驗證你的會員身份...</div></div>';
    document.body.appendChild(loadEl);

    fetch('/api/wa-token/verify', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ token: waToken })
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      document.body.removeChild(loadEl);
      // Clean URL (remove token params)
      var cleanUrl = window.location.origin + '/app';
      window.history.replaceState({}, '', cleanUrl);

      if (d.ok && d.member) {
        var m = d.member;
        localStorage.setItem('ce85_member_no', m.member_no);
        localStorage.setItem('ce85_wa_clicked', '1');
        if (m.phone) localStorage.setItem('ce85_phone', m.phone);

        // If profile incomplete → redirect to complete page
        if (m.registration_method === 'whatsapp_qr' && m.registration_status === 'incomplete') {
          try { sessionStorage.setItem('wa_member', JSON.stringify(m)); } catch(_){}
          window.location.href = '/qr-register/complete';
          return;
        }
        // Profile complete → show card normally
        showCard(m.member_no, true);
      } else {
        // Token invalid / expired
        var expiredBanner = document.createElement('div');
        expiredBanner.style.cssText = 'background:#FEE2E2;border:1.5px solid #EF4444;border-radius:12px;padding:20px 24px;margin:20px;text-align:center;';
        expiredBanner.innerHTML =
          '<div style="font-size:36px;margin-bottom:8px">⏰</div>' +
          '<div style="font-size:16px;font-weight:700;color:#B91C1C;margin-bottom:6px">' + (d.error||'登入連結已過期') + '</div>' +
          '<div style="font-size:13px;color:#666;margin-bottom:16px">請重新掃描QR碼或前往會員登記頁面</div>' +
          '<a href="/membership/join" style="background:#1a6b1a;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">重新登記</a>';
        var lookupCard = document.querySelector('.lookup-card');
        if (lookupCard) lookupCard.parentNode.insertBefore(expiredBanner, lookupCard);
      }
    })
    .catch(function(){
      if (document.getElementById('tokenLoadingBanner')) {
        document.body.removeChild(loadEl);
      }
    });
    return; // Don't run saved-member check while token is being verified
  }
  // ─────────────────────────────────────────────────────────────────────────

  var saved = localStorage.getItem('ce85_member_no');
  if (saved) {
    var savedWaClicked = localStorage.getItem('ce85_wa_clicked') === '1';
    // Verify member still exists before showing card
    fetch('/api/members/lookup?q=' + encodeURIComponent(saved))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok) {
          var latestWaClickedAt = data.wa_clicked_at || (data.member && data.member.wa_clicked_at) || null;
          if (latestWaClickedAt && !savedWaClicked) {
            localStorage.setItem('ce85_wa_clicked', '1');
            savedWaClicked = true;
          }
          showCard(saved, savedWaClicked);
          // 頁面載入時檢查心聲紅點
          setTimeout(function() { loadVoiceRedDot(); }, 500);
        } else {
          // Member no longer exists — clear localStorage and show login
          localStorage.removeItem('ce85_member_no');
          localStorage.removeItem('ce85_wa_clicked');
        }
      })
      .catch(function() {
        // Network error — still show cached card but don't crash
        showCard(saved, savedWaClicked);
        setTimeout(function() { loadVoiceRedDot(); }, 500);
      });
  }
})();

// ── 側邊抽屜選單 ──
function openDrawer(){
  document.getElementById('sideDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  // 載入合作計劃按鈕狀態（與原有 partnerEntry 邏輯一致）
  var memberNo = window.MEMBER_NO || '';
  if(memberNo){ loadDrawerPartnerStatus(memberNo); }
}
function closeDrawer(){
  document.getElementById('sideDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.style.overflow='';
}
// 載入 CoLeadery / CoLinkery 狀態並更新 drawer 按鈕
function loadDrawerPartnerStatus(memberNo){
  fetch('/api/partner/my-status?member_no='+encodeURIComponent(memberNo))
    .then(function(r){return r.json();})
    .then(function(d){ setupDrawerBtns(memberNo, d.coleadery||null, d.colinkery||null); })
    .catch(function(){ setupDrawerBtns(memberNo, null, null); });
}
function setupDrawerBtns(memberNo, clStatus, ckStatus){
  var phone = localStorage.getItem('ce85_phone')||'';
  var bCL = document.getElementById('drawerBtnCoLeadery');
  var bCK = document.getElementById('drawerBtnCoLinkery');
  if(bCL){
    var clSub = bCL.querySelector('.di-sub');
    if(clStatus==='APPROVED'){
      if(clSub) clSub.textContent='領航者｜進入工具 →';
      bCL.onclick=function(){ closeDrawer(); window.location.href='/coleadery/'+(phone?'?phone='+encodeURIComponent(phone):''); };
    } else if(clStatus==='PENDING'){
      if(clSub) clSub.textContent='⏳ 審核中（3-5 工作天）';
      bCL.onclick=function(){ closeDrawer(); if(confirm('⏳ CoLeadery 申請審核中。如想重新申請請按確定。')){ window.location.href='/app/partner-apply?role=COLEADERY&member='+memberNo; } };
    } else {
      bCL.onclick=function(){ closeDrawer(); drawerOpenCoLeadery(); };
    }
  }
  if(bCK){
    var ckSub = bCK.querySelector('.di-sub');
    if(ckStatus==='APPROVED'){
      if(ckSub) ckSub.textContent='連結者｜進入工具 →';
      bCK.onclick=function(){ closeDrawer(); window.location.href='/colinkery/'+(phone?'?phone='+encodeURIComponent(phone):''); };
    } else if(ckStatus==='PENDING'){
      if(ckSub) ckSub.textContent='⏳ 審核中（3-5 工作天）';
      bCK.onclick=function(){ closeDrawer(); if(confirm('⏳ CoLinkery 申請審核中。如想重新申請請按確定。')){ window.location.href='/app/partner-apply?role=COLINKERY&member='+memberNo; } };
    } else {
      bCK.onclick=function(){ closeDrawer(); drawerOpenCoLinkery(); };
    }
  }
}
function drawerOpenCoLeadery(){
  var memberNo = window.MEMBER_NO||'';
  window.location.href='/app/partner-apply?role=COLEADERY&member='+memberNo;
}
function drawerOpenCoLinkery(){
  var memberNo = window.MEMBER_NO||'';
  window.location.href='/app/partner-apply?role=COLINKERY&member='+memberNo;
}

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

// ── 產品測試計劃 ─────────────────────────────────────────────────────────────
var _testingPanel = null;
var _testingContext = null; // set when arriving via QR scan

function openTestingPanel(){
  var panel = document.getElementById('testing-panel');
  if(!panel) return;
  panel.style.display='flex';
  testingPanelShowMain();
}
function closeTestingPanel(){
  var panel = document.getElementById('testing-panel');
  if(panel) panel.style.display='none';
}

function testingPanelShowMain(){
  var el = document.getElementById('tst-panel-main');
  var el2 = document.getElementById('tst-panel-survey');
  if(el) el.style.display='block';
  if(el2) el2.style.display='none';
  var memberNo = window.MEMBER_NO||localStorage.getItem('ce85_member_no')||'';
  testingLoadAvailable(memberNo);
  testingLoadMyCampaigns();
}

function testingLoadAvailable(memberNo){
  var el = document.getElementById('tst-available-list');
  var sec = document.getElementById('tst-available-section');
  if(!el) return;
  if(!memberNo){
    if(sec) sec.style.display='none';
    return;
  }
  fetch('/api/testing/available/'+encodeURIComponent(memberNo))
  .then(function(r){return r.json();})
  .then(function(d){
    var camps=d.campaigns||[];
    // Only show campaigns not yet joined
    var notJoined=camps.filter(function(c){ return !c.participant_id; });
    if(notJoined.length===0){
      if(sec) sec.style.display='none';
      return;
    }
    if(sec) sec.style.display='block';
    el.innerHTML=notJoined.map(function(c){
      return '<div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:12px;border:2px solid #ddd6fe;">'+
        '<div style="font-size:17px;font-weight:800;color:#1f2937;margin-bottom:2px;">'+escHtml(c.product_name)+'</div>'+
        '<div style="font-size:14px;color:#6b7280;margin-bottom:10px;">由 '+escHtml(c.brand_name)+' 提供</div>'+
        (c.brand_description?'<div style="font-size:13px;color:#374151;background:#f5f3ff;border-radius:8px;padding:10px;margin-bottom:10px;line-height:1.6;">'+escHtml(c.brand_description)+'</div>':'')+
        '<button onclick="testingDirectJoin('+c.id+')" style="width:100%;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:10px;padding:12px;font-size:15px;font-weight:800;cursor:pointer;">✅ 加入試用並填問卷</button>'+
      '</div>';
    }).join('');
  }).catch(function(){
    if(sec) sec.style.display='none';
  });
}

function testingLoadMyCampaigns(){
  var memberNo = window.MEMBER_NO||localStorage.getItem('ce85_member_no')||'';
  var el = document.getElementById('tst-my-list');
  if(!el) return;
  if(!memberNo){ el.innerHTML='<div style="text-align:center;padding:24px;color:#9ca3af;font-size:16px;">請先登入查看您的測試計劃。</div>'; return; }
  el.innerHTML='<div style="text-align:center;padding:24px;color:#9ca3af;font-size:16px;">載入中…</div>';
  fetch('/api/testing/my-campaigns/'+encodeURIComponent(memberNo))
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.ok||(d.campaigns||[]).length===0){
      el.innerHTML='<div style="text-align:center;padding:24px;color:#9ca3af;font-size:16px;">您尚未參與任何產品測試計劃。<br>請掃描活動 QR 碼加入！</div>';
      return;
    }
    var TST_P_STATUS={registered:'已登記',sample_claimed:'已取樣品',survey_started:'填寫中',survey_submitted:'已提交問卷',reward_sent:'已收獎勵'};
    var html=d.campaigns.map(function(c){
      var statusColor={registered:'#374151',sample_claimed:'#c2410c',survey_started:'#1e40af',survey_submitted:'#166534',reward_sent:'#5b21b6'}[c.status]||'#374151';
      // canSurvey: campaign must be live AND participant status allows survey
      var campLive=(c.campaign_status==='live'||!c.campaign_status);
      var canSurvey=campLive && (c.status==='sample_claimed'||c.status==='survey_started'||c.status==='registered');
      var done=(c.status==='survey_submitted'||c.status==='reward_sent');
      var borderCol=canSurvey?'#7c3aed':done?'#bbf7d0':'#ede9fe';
      return '<div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin-bottom:12px;border:2px solid '+borderCol+';">'+
        (c.brand_logo_url?'<img src="'+escHtml(c.brand_logo_url)+'" alt="" style="height:36px;object-fit:contain;margin-bottom:10px;">':'')+
        '<div style="font-size:17px;font-weight:800;color:#1f2937;margin-bottom:3px;">'+escHtml(c.product_name)+'</div>'+
        '<div style="font-size:14px;color:#6b7280;margin-bottom:8px;">'+escHtml(c.brand_name)+'</div>'+
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:'+(canSurvey?'10':'0')+'px;">'+
          '<span style="font-size:14px;font-weight:700;color:'+statusColor+';">'+(TST_P_STATUS[c.status]||c.status)+'</span>'+
          (done?'<span style="font-size:13px;color:#166534;background:#dcfce7;border-radius:6px;padding:3px 9px;font-weight:700;">✅ 已完成</span>':'')+
        '</div>'+
        (canSurvey?'<button onclick="testingOpenSurvey('+c.campaign_id+','+c.participant_id+')" style="width:100%;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:10px;padding:13px;font-size:16px;font-weight:800;cursor:pointer;letter-spacing:0.5px;">📝 立即填寫問卷</button>':'')+
        (c.survey_deadline&&!done?'<div style="font-size:12px;color:#9ca3af;margin-top:8px;text-align:center;">問卷截止：'+escHtml(c.survey_deadline)+'</div>':'')+
      '</div>';
    }).join('');
    el.innerHTML=html;
  }).catch(function(){
    el.innerHTML='<div style="text-align:center;padding:24px;color:#ef4444;font-size:16px;">載入失敗</div>';
  });
}

// Called when QR scan brings user to /app?testing=CODE
function testingHandleQRScan(code){
  _testingContext = code;
  var memberNo = window.MEMBER_NO || localStorage.getItem('ce85_member_no') || '';
  // Remove login banner if showing
  var lb=document.getElementById('testingLoginBanner');
  if(lb && lb.parentNode) lb.parentNode.removeChild(lb);
  if(!memberNo){ openTestingPanel(); return; }
  // Fetch campaign info — API returns flat fields (campaign_id, campaign_name, etc.), not nested .campaign
  fetch('/api/testing/scan/'+encodeURIComponent(code))
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.ok){ openTestingPanel(); return; }
    // Build a campaign object from the flat API response
    var camp={
      id: d.campaign_id,
      campaign_id: d.campaign_id,
      campaign_name: d.campaign_name,
      brand_name: d.brand_name,
      brand_logo_url: d.brand_logo_url,
      brand_description: d.brand_description,
      product_name: d.product_name,
      product_image_url: d.product_image_url,
      testing_duration_days: d.testing_duration_days,
      survey_deadline: d.survey_deadline,
      qr_code_id: d.qr_code_id
    };
    _testingContext = {code:code, campaign:camp};
    // Check if already joined — if so go straight to survey
    fetch('/api/testing/my-campaigns/'+encodeURIComponent(memberNo))
    .then(function(r2){return r2.json();})
    .then(function(d2){
      openTestingPanel();
      var already=(d2.campaigns||[]).find(function(c){ return String(c.campaign_id)===String(camp.id); });
      if(already){
        if(already.survey_submitted_at){
          // Already submitted — show list
          testingLoadMyCampaigns();
        } else {
          // Joined but survey not yet submitted — go straight to survey
          testingOpenSurvey(already.campaign_id, already.participant_id);
        }
      } else {
        // First time — show join confirmation
        testingShowJoinConfirm(camp);
      }
    }).catch(function(){
      openTestingPanel();
      testingShowJoinConfirm(camp);
    });
  }).catch(function(){ openTestingPanel(); });
}

// Direct join from available list (no QR needed)
function testingDirectJoin(campaignId){
  var memberNo=window.MEMBER_NO||localStorage.getItem('ce85_member_no')||'';
  if(!memberNo){alert('請先登入會員');return;}
  var btn=event&&event.target;
  if(btn){btn.disabled=true;btn.textContent='處理中…';}
  fetch('/api/testing/join',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({campaign_id:campaignId,member_no:memberNo})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok){
      testingOpenSurvey(campaignId, d.participant_id);
    } else {
      if(btn){btn.disabled=false;btn.textContent='✅ 加入試用並填問卷';}
      alert(d.error||'加入失敗，請重試');
    }
  }).catch(function(){
    if(btn){btn.disabled=false;btn.textContent='✅ 加入試用並填問卷';}
    alert('網絡錯誤，請重試');
  });
}

function testingShowJoinConfirm(campaign){
  var el = document.getElementById('tst-join-confirm');
  var el2 = document.getElementById('tst-my-list');
  if(!el||!el2) return;
  el2.style.display='none';
  el.style.display='block';
  el.innerHTML='<div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);border:2px solid #7c3aed;text-align:center;">'+
    '<div style="font-size:40px;margin-bottom:10px;">🧪</div>'+
    (campaign.brand_logo_url?'<img src="'+escHtml(campaign.brand_logo_url)+'" alt="" style="height:40px;object-fit:contain;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;">':'')+
    '<div style="font-size:20px;font-weight:900;color:#1f2937;margin-bottom:4px;">'+escHtml(campaign.product_name)+'</div>'+
    '<div style="font-size:15px;color:#6b7280;margin-bottom:12px;">由 '+escHtml(campaign.brand_name)+' 提供</div>'+
    (campaign.brand_description?'<div style="font-size:14px;color:#374151;text-align:left;background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:14px;line-height:1.7;">'+escHtml(campaign.brand_description)+'</div>':'')+
    '<div style="font-size:14px;color:#6b7280;margin-bottom:16px;">測試期：'+tstEsc(String(campaign.testing_duration_days||14))+' 天</div>'+
    '<button onclick="testingJoinCampaign()" style="width:100%;background:#7c3aed;color:#fff;border:none;border-radius:12px;padding:14px;font-size:17px;font-weight:800;cursor:pointer;margin-bottom:10px;">✅ 確認加入並領取樣品</button>'+
    '<button onclick="testingCancelJoin()" style="width:100%;background:#f3f4f6;color:#374151;border:none;border-radius:12px;padding:12px;font-size:15px;font-weight:600;cursor:pointer;">取消</button>'+
  '</div>';
}

function testingCancelJoin(){
  var el=document.getElementById('tst-join-confirm');
  var el2=document.getElementById('tst-my-list');
  if(el) el.style.display='none';
  if(el2) el2.style.display='block';
  _testingContext=null;
}

function testingJoinCampaign(){
  var memberNo=window.MEMBER_NO||localStorage.getItem('ce85_member_no')||'';
  if(!memberNo){alert('請先登入');return;}
  var camp=_testingContext&&_testingContext.campaign;
  var campId=camp&&camp.id;
  var qrCodeId=camp&&camp.qr_code_id;
  if(!campId){alert('無效的活動碼');return;}
  fetch('/api/testing/join',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({campaign_id:campId, qr_code_id:qrCodeId||null, member_no:memberNo})
  }).then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('tst-join-confirm');
    if(el) el.style.display='none';
    var el2=document.getElementById('tst-my-list');
    if(el2) el2.style.display='block';
    if(d.ok){
      // 加入成功（或已加入）— 直接跳去填問卷
      if(campId && d.participant_id){
        testingOpenSurvey(campId, d.participant_id);
      } else {
        testingLoadMyCampaigns();
      }
    } else {
      alert(d.error||'加入失敗，請重試');
    }
    _testingContext=null;
  }).catch(function(){alert('網絡錯誤，請重試');});
}

function testingOpenSurvey(campaignId, participantId){
  var memberNo=window.MEMBER_NO||localStorage.getItem('ce85_member_no')||'';
  if(!memberNo){alert('請先登入');return;}
  var panelMain=document.getElementById('tst-panel-main');
  var panelSurvey=document.getElementById('tst-panel-survey');
  if(panelMain) panelMain.style.display='none';
  if(panelSurvey){
    panelSurvey.style.display='block';
    panelSurvey.innerHTML='<div style="text-align:center;padding:40px;color:#9ca3af;font-size:16px;">載入問卷中…</div>';
  }
  fetch('/api/testing/survey/'+campaignId+'?member_no='+encodeURIComponent(memberNo))
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.ok||!(d.questions||[]).length){
      panelSurvey.innerHTML='<div style="text-align:center;padding:40px;color:#ef4444;font-size:16px;">'+(d.error||'無法載入問卷')+'</div>'+
        '<button onclick="testingPanelShowMain()" style="display:block;margin:0 auto;background:#f3f4f6;border:none;border-radius:8px;padding:10px 20px;font-size:15px;font-weight:600;cursor:pointer;">返回</button>';
      return;
    }
    var qs=d.questions;

    // ── Group consecutive rating questions into one rating_grid block ──────────
    var groups=[]; // each item: {type:'single'|'rating_grid', questions:[...], displayNum:n}
    var displayNum=1;
    var i=0;
    while(i<qs.length){
      var q=qs[i];
      if(q.question_type==='rating'){
        // collect all consecutive rating questions
        var ratingGroup=[];
        while(i<qs.length && qs[i].question_type==='rating'){
          ratingGroup.push(qs[i]);
          i++;
        }
        groups.push({type:'rating_grid', questions:ratingGroup, displayNum:displayNum});
        displayNum++;
      } else {
        groups.push({type:'single', questions:[q], displayNum:displayNum});
        displayNum++;
        i++;
      }
    }

    // ── Build HTML ─────────────────────────────────────────────────────────────
    var html='<div style="background:#7c3aed;color:#fff;padding:16px 18px;border-radius:12px;margin-bottom:18px;">'+
      '<div style="font-size:11px;opacity:.8;margin-bottom:4px;">產品試用問卷</div>'+
      '<div style="font-size:18px;font-weight:800;">'+escHtml(d.campaign&&d.campaign.product_name||d.product_name||'')+'</div>'+
      (d.campaign&&d.campaign.brand_description?'<div style="font-size:12px;opacity:.8;margin-top:4px;">'+escHtml(d.campaign.brand_description)+'</div>':'')+
      '</div>';

    groups.forEach(function(g){
      if(g.type==='rating_grid'){
        // ── Rating grid: one card, table layout ──────────────────────────────
        var gridId='ratinggrid-'+g.questions[0].id;
        html+='<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 2px 6px rgba(0,0,0,0.08);" data-gridstart="'+g.questions[0].id+'" data-gridend="'+g.questions[g.questions.length-1].id+'">'+
          '<div style="font-size:15px;font-weight:800;color:#1f2937;margin-bottom:4px;">'+g.displayNum+'. 請為以下項目評分：<span style="color:#ef4444;font-size:12px;"> 必填</span></div>'+
          '<div style="font-size:12px;color:#6b7280;margin-bottom:12px;">1分＝非常不滿意　2分＝不滿意　3分＝一般　4分＝滿意　5分＝非常滿意</div>'+
          '<div style="overflow-x:auto;">'+
          '<table style="width:100%;border-collapse:collapse;" id="'+gridId+'">'+
          '<thead><tr>'+
            '<th style="text-align:left;padding:8px 6px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;min-width:110px;">評價項目</th>'+
            '<th style="text-align:center;padding:8px 4px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;width:36px;">1</th>'+
            '<th style="text-align:center;padding:8px 4px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;width:36px;">2</th>'+
            '<th style="text-align:center;padding:8px 4px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;width:36px;">3</th>'+
            '<th style="text-align:center;padding:8px 4px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;width:36px;">4</th>'+
            '<th style="text-align:center;padding:8px 4px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;width:36px;">5</th>'+
          '</tr></thead><tbody>';
        g.questions.forEach(function(rq){
          // strip "評分：" prefix for cleaner display
          var label=rq.title.replace(/^評分[：:]\s*/,'');
          html+='<tr data-qid="'+rq.id+'" data-qtype="rating" style="border-bottom:1px solid #f3f4f6;">'+
            '<td style="padding:10px 6px;font-size:14px;color:#374151;font-weight:600;">'+escHtml(label)+'</td>';
          for(var s=1;s<=5;s++){
            html+='<td style="text-align:center;padding:10px 4px;">'+
              '<button onclick="tstGridSetRating('+rq.id+','+s+',this)" data-qid="'+rq.id+'" data-star="'+s+'" '+
              'style="width:30px;height:30px;border-radius:50%;border:2px solid #d1d5db;background:#f9fafb;font-size:13px;font-weight:700;cursor:pointer;color:#9ca3af;transition:all .15s;">'+s+'</button>'+
            '</td>';
          }
          html+='<td style="display:none;"><span id="rating-val-'+rq.id+'" data-value=""></span></td>';
          html+='</tr>';
        });
        html+='</tbody></table></div></div>';

      } else {
        // ── Single question ────────────────────────────────────────────────────
        var q2=g.questions[0];
        html+='<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 2px 6px rgba(0,0,0,0.08);" data-qid="'+q2.id+'" data-qtype="'+q2.question_type+'">'+
          '<div style="font-size:15px;font-weight:800;color:#1f2937;margin-bottom:10px;">'+g.displayNum+'. '+escHtml(q2.title)+(q2.is_required?'  <span style="color:#ef4444;font-size:12px;">必填</span>':'')+'</div>';
        if(q2.description){
          html+='<div style="font-size:13px;color:#6b7280;margin-bottom:10px;">'+escHtml(q2.description)+'</div>';
        }
        if(q2.question_type==='single_choice'||q2.question_type==='multi_choice'){
          var opts=[];
          if(Array.isArray(q2.options)){ opts=q2.options; }
          else { try{ opts=JSON.parse(q2.options||'[]'); }catch(e){} }
          html+='<div id="choice-'+q2.id+'" data-multi="'+(q2.question_type==='multi_choice'?'1':'0')+'">';
          opts.forEach(function(opt){
            html+='<button onclick="tstToggleChoice('+q2.id+',this)" data-val="'+escHtml(opt)+'" style="display:block;width:100%;text-align:left;padding:11px 14px;margin-bottom:7px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;cursor:pointer;background:#fff;color:#374151;">'+
              '<span class="choice-dot" style="display:inline-block;width:18px;height:18px;border:2px solid #d1d5db;border-radius:50%;margin-right:10px;vertical-align:middle;flex-shrink:0;"></span>'+escHtml(opt)+
            '</button>';
          });
          html+='</div>';
        } else if(q2.question_type==='yes_no'){
          html+='<div style="display:flex;gap:10px;" id="yn-'+q2.id+'">'+
            '<button onclick="tstSetYN('+q2.id+',this)" data-val="\u662f" style="flex:1;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;background:#fff;">\u662f</button>'+
            '<button onclick="tstSetYN('+q2.id+',this)" data-val="\u5426" style="flex:1;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;background:#fff;">\u5426</button>'+
          '</div>';
        } else if(q2.question_type==='text'){
          // Q2 brand question: detect by title/description containing brand keywords
          var isBrandQ2=(q2.title&&q2.title.indexOf('\u54c1\u724c')>=0)||(q2.description&&q2.description.indexOf('\u5931\u7981')>=0);
          if(isBrandQ2){
            html+='<div style="margin-bottom:10px;">'+
              '<div style="font-size:13px;color:#6b7280;margin-bottom:6px;">\u54c1\u724c\u540d\u7a31\uff1a</div>'+
              '<input type="text" id="text-'+q2.id+'" placeholder="\u8acb\u8f38\u5165\u54c1\u724c\u540d\u7a31" '+
              'oninput="tstClearNoPrev('+q2.id+')" '+
              'style="width:100%;padding:11px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;font-family:inherit;box-sizing:border-box;">'+
            '</div>'+
            '<button id="noprev-'+q2.id+'" onclick="tstToggleNoPrev('+q2.id+')" data-active="0" '+
            'style="display:flex;align-items:center;width:100%;text-align:left;padding:11px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;cursor:pointer;background:#fff;color:#374151;">'+
              '<span class="choice-dot" id="noprev-dot-'+q2.id+'" style="display:inline-block;width:18px;height:18px;border:2px solid #d1d5db;border-radius:50%;margin-right:10px;flex-shrink:0;"></span>'+
              '\u904e\u5f80\u6c92\u6709\u4f7f\u7528\u5931\u7981\u8b77\u588a'+
            '</button>';
          } else {
            html+='<textarea id="text-'+q2.id+'" rows="3" placeholder="\u8acb\u8f38\u5165\u60a8\u7684\u56de\u7b54\u2026" style="width:100%;padding:11px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;font-family:inherit;resize:vertical;box-sizing:border-box;"></textarea>';
          }
        }
        html+='</div>';
      }
    });

    html+='<button id="tst-submit-btn" onclick="testingSubmitSurvey('+campaignId+','+participantId+')" style="width:100%;background:#7c3aed;color:#fff;border:none;border-radius:14px;padding:16px;font-size:17px;font-weight:800;cursor:pointer;margin-top:8px;">📤 提交問卷</button>'
      '<button onclick="testingPanelShowMain()" style="display:block;width:100%;margin-top:10px;background:transparent;border:none;color:#9ca3af;font-size:14px;cursor:pointer;">← 返回</button>';
    panelSurvey.innerHTML=html;
  }).catch(function(){
    panelSurvey.innerHTML='<div style="text-align:center;padding:40px;color:#ef4444;font-size:16px;">載入失敗</div>'+
      '<button onclick="testingPanelShowMain()" style="display:block;margin:0 auto;background:#f3f4f6;border:none;border-radius:8px;padding:10px 20px;font-size:15px;font-weight:600;cursor:pointer;">返回</button>';
  });
}

// Q2 brand question: toggle "no previous use" checkbox button
function tstToggleNoPrev(qid){
  var btn=document.getElementById('noprev-'+qid);
  var dot=document.getElementById('noprev-dot-'+qid);
  var inp=document.getElementById('text-'+qid);
  if(!btn) return;
  var nowActive=btn.getAttribute('data-active')==='1'?'0':'1';
  btn.setAttribute('data-active',nowActive);
  var on=(nowActive==='1');
  btn.style.borderColor=on?'#7c3aed':'#e5e7eb';
  btn.style.background=on?'#f5f3ff':'#fff';
  btn.style.color=on?'#5b21b6':'#374151';
  if(dot){dot.style.borderColor=on?'#7c3aed':'#d1d5db';dot.style.background=on?'#7c3aed':'';}
  if(inp){
    inp.disabled=on;
    inp.style.opacity=on?'0.4':'1';
    inp.style.background=on?'#f3f4f6':'#fff';
    if(on) inp.value='';
  }
}
// Q2 brand question: when user types, clear the "no previous use" state
function tstClearNoPrev(qid){
  var btn=document.getElementById('noprev-'+qid);
  var dot=document.getElementById('noprev-dot-'+qid);
  if(!btn||btn.getAttribute('data-active')==='0') return;
  btn.setAttribute('data-active','0');
  btn.style.borderColor='#e5e7eb';btn.style.background='#fff';btn.style.color='#374151';
  if(dot){dot.style.borderColor='#d1d5db';dot.style.background='';}
}

// Rating grid: tap a cell to select score for that row
function tstGridSetRating(qid, val, btn){
  // Highlight selected cell in this row
  var table=btn.closest('table');
  if(table){
    table.querySelectorAll('button[data-qid="'+qid+'"]').forEach(function(b){
      var s=parseInt(b.getAttribute('data-star'));
      if(s<=val){
        b.style.background='#7c3aed';b.style.borderColor='#7c3aed';b.style.color='#fff';
      } else {
        b.style.background='#f9fafb';b.style.borderColor='#d1d5db';b.style.color='#9ca3af';
      }
    });
  }
  var hidden=document.getElementById('rating-val-'+qid);
  if(hidden){ hidden.setAttribute('data-value',String(val)); }
}

function tstSetYN(qid, clickedBtn){
  var val=clickedBtn.getAttribute('data-val');
  var wrap=document.getElementById('yn-'+qid);
  if(!wrap)return;
  wrap.querySelectorAll('button').forEach(function(btn){
    var isThis=btn.getAttribute('data-val')===val;
    btn.setAttribute('data-active', isThis?'1':'0');
    btn.style.borderColor=isThis?'#7c3aed':'#e5e7eb';
    btn.style.background=isThis?'#ede9fe':'#fff';
    btn.style.color=isThis?'#5b21b6':'#374151';
  });
}

function tstToggleChoice(qid, btn){
  var wrap=document.getElementById('choice-'+qid);
  if(!wrap)return;
  var isMulti=wrap.getAttribute('data-multi')==='1';
  if(!isMulti){
    // single choice: deselect all first
    wrap.querySelectorAll('button').forEach(function(b){
      b.setAttribute('data-active','0');
      b.style.borderColor='#e5e7eb';b.style.background='#fff';b.style.color='#374151';
      var dot=b.querySelector('span.choice-dot');
      if(dot){dot.style.background='';dot.style.borderColor='#d1d5db';}
    });
  }
  var isActive=btn.getAttribute('data-active')==='1';
  var nowActive=isMulti?(isActive?'0':'1'):'1'; // single always activates
  btn.setAttribute('data-active',nowActive);
  var on=nowActive==='1';
  btn.style.borderColor=on?'#7c3aed':'#e5e7eb';
  btn.style.background=on?'#ede9fe':'#fff';
  btn.style.color=on?'#5b21b6':'#374151';
  var dot=btn.querySelector('span.choice-dot');
  if(dot){
    dot.style.borderColor=on?'#7c3aed':'#d1d5db';
    dot.style.background=on?'#7c3aed':'';
  }
}

function testingSubmitSurvey(campaignId, participantId){
  var memberNo=window.MEMBER_NO||localStorage.getItem('ce85_member_no')||'';
  if(!memberNo){alert('請先登入');return;}

  // Collect answers: <div data-qid> for single questions, <tr data-qid> for rating rows
  // Exclude <button data-qid> (rating grid buttons also have data-qid but are not answer containers)
  var allCards=document.querySelectorAll('#tst-panel-survey div[data-qid], #tst-panel-survey tr[data-qid]');
  var responses=[];
  var missingRequired=[];

  allCards.forEach(function(card){
    var qid=parseInt(card.getAttribute('data-qid'));
    var qtype=card.getAttribute('data-qtype');
    var answer='';
    var isRequired=false;

    if(qtype==='rating'){
      var hidden=document.getElementById('rating-val-'+qid);
      answer=hidden?String(hidden.getAttribute('data-value')||''):'';
      isRequired=true; // all rating rows required
    } else if(qtype==='yes_no'){
      var wrap=document.getElementById('yn-'+qid);
      if(wrap){
        var activeYN=wrap.querySelector('button[data-active="1"]');
        if(activeYN) answer=activeYN.getAttribute('data-val')||'';
      }
      isRequired=!!card.querySelector('[style*="ef4444"]');
    } else if(qtype==='single_choice'||qtype==='multi_choice'){
      var wrap2=document.getElementById('choice-'+qid);
      if(wrap2){
        var selected=[];
        wrap2.querySelectorAll('button[data-active="1"]').forEach(function(btn){selected.push(btn.getAttribute('data-val'));});
        answer=selected.join(',');
      }
      isRequired=!!card.querySelector('[style*="ef4444"]');
    } else if(qtype==='text'){
      // Check if this is the brand question with "no previous" checkbox
      var noprevBtn=document.getElementById('noprev-'+qid);
      if(noprevBtn&&noprevBtn.getAttribute('data-active')==='1'){
        answer='\u904e\u5f80\u6c92\u6709\u4f7f\u7528\u5931\u7981\u8b77\u588a';
      } else {
        var ta=document.getElementById('text-'+qid);
        answer=ta?ta.value.trim():'';
      }
      isRequired=!!card.querySelector('[style*="ef4444"]');
    }

    if(isRequired&&!answer){
      missingRequired.push(qid);
    }
    responses.push({question_id:qid,answer:answer});
  });

  if(missingRequired.length>0){
    // Scroll to first unanswered
    var first=document.querySelector('#tst-panel-survey [data-qid="'+missingRequired[0]+'"]');
    if(first) first.scrollIntoView({behavior:'smooth',block:'center'});
    alert('請完成所有必填題目（共 '+missingRequired.length+' 題未填）');
    return;
  }

  var submitBtn=document.getElementById('tst-submit-btn');
  if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='提交中…';}

  if(!participantId){
    if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='📤 提交問卷';}
    alert('錯誤：找不到參與者ID，請返回重新開啟問卷');
    return;
  }

  fetch('/api/testing/survey/submit',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({campaign_id:campaignId,participant_id:participantId,responses:responses})
  }).then(function(r){return r.json();}).then(function(d){
    var panelSurvey=document.getElementById('tst-panel-survey');
    if(d.ok){
      panelSurvey.innerHTML='<div style="text-align:center;padding:40px;">'+
        '<div style="font-size:56px;margin-bottom:16px;">🎉</div>'+
        '<div style="font-size:22px;font-weight:900;color:#166534;margin-bottom:10px;">問卷提交成功！</div>'+
        '<div style="font-size:16px;color:#374151;line-height:1.7;">感謝您完成產品試用問卷！<br>您的寶貴意見將有助我們持續改善產品。</div>'+
        (d.reward?'<div style="margin-top:16px;background:#fef3c7;border-radius:12px;padding:14px;font-size:15px;color:#92400e;font-weight:700;">🎁 獎勵：'+escHtml(d.reward)+'</div>':'')+
        '<button onclick="testingPanelShowMain()" style="margin-top:24px;background:#7c3aed;color:#fff;border:none;border-radius:12px;padding:13px 28px;font-size:16px;font-weight:700;cursor:pointer;">返回</button>'+
      '</div>';
    } else {
      var errBtn=document.getElementById('tst-submit-btn');
      if(errBtn){errBtn.disabled=false;errBtn.textContent='📤 提交問卷';}
      if(d.error&&d.error.indexOf('已提交')>=0){
        // Already submitted — show completion screen
        var panelSurveyDone=document.getElementById('tst-panel-survey');
        if(panelSurveyDone){
          panelSurveyDone.innerHTML='<div style="text-align:center;padding:40px;">'+
            '<div style="font-size:56px;margin-bottom:16px;">✅</div>'+
            '<div style="font-size:20px;font-weight:900;color:#166534;margin-bottom:10px;">您已提交過此問卷</div>'+
            '<div style="font-size:15px;color:#6b7280;">感謝您的參與！</div>'+
            '<button onclick="testingPanelShowMain()" style="margin-top:24px;background:#7c3aed;color:#fff;border:none;border-radius:12px;padding:13px 28px;font-size:16px;font-weight:700;cursor:pointer;">返回</button>'+
          '</div>';
        }
      } else {
        alert('提交失敗：'+(d.error||'未知錯誤'));
      }
    }
  }).catch(function(err){
    var errBtn=document.getElementById('tst-submit-btn');
    if(errBtn){errBtn.disabled=false;errBtn.textContent='📤 提交問卷';}
    alert('網絡錯誤：'+(err&&err.message?err.message:'請重試'));
  });
}

// ── 工作市場 ──
var _jobsLoaded = false;
var _currentJobId = null;

// ═══════════════════════════════════════════════════════════════════════════════
// ── 福利 Tab ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
var _appBnfCats = [];
var _appBnfCurrentCat = 0;
var _appBnfBenefits = [];

function appBnfInit(){
  // Load categories
  fetch('/api/benefits/categories')
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok) return;
      _appBnfCats=d.categories||[];
      var tabs=document.getElementById('appBnfCatTabs');
      if(!tabs) return;
      tabs.innerHTML='<div style="flex-shrink:0;padding:6px 16px;border-radius:20px;background:#1B4332;color:#fff;font-size:14px;font-weight:700;cursor:pointer;" data-cid="0" onclick="appBnfFilterCat(0,this)">全部</div>';
      _appBnfCats.forEach(function(c){
        tabs.innerHTML+='<div style="flex-shrink:0;padding:6px 16px;border-radius:20px;border:2px solid #e0e0e0;background:#fff;font-size:14px;font-weight:600;cursor:pointer;" data-cid="'+c.id+'" onclick="appBnfFilterCat('+c.id+',this)">'+escAppHtml(c.icon)+' '+escAppHtml(c.name)+'</div>';
      });
    });
  appBnfLoad(0);
}

function appBnfFilterCat(catId, el){
  _appBnfCurrentCat=catId;
  var tabs=document.getElementById('appBnfCatTabs');
  if(tabs) tabs.querySelectorAll('[data-cid]').forEach(function(t){
    var active=t.dataset.cid==catId;
    t.style.background=active?'#1B4332':'#fff';
    t.style.color=active?'#fff':'#333';
    t.style.border=active?'2px solid #1B4332':'2px solid #e0e0e0';
  });
  appBnfLoad(catId);
}

// 健康分類 ID (id=1 from migration 0030)
var MED_CARD_CAT_ID = 1;

// _appMedStatus: cached status for pin card badge ('PENDING','SENT','ISSUED','DECLINED',null)
var _appMedStatus=null;

function appBnfMedCardPinHtml(){
  // Hardcoded 醫健卡置頂卡片 — always shown in 全部(0) and 健康(1)
  // Right-side badge: null→免費申請(green), PENDING/SENT→審批中(orange), ISSUED→已啟用(green), DECLINED→未批准(red)
  // Badge is rendered server-side from cached _appMedStatus, then replaced async by appMedFetchPinStatus()
  var rightBadge='';
  if(_appMedStatus==='PENDING'||_appMedStatus==='SENT'){
    rightBadge='<span class="appMedBadge" style="font-size:11px;color:#F57F17;background:#FFFDE7;border:1px solid #FFE082;padding:2px 10px;border-radius:10px;font-weight:700;">⏳ 審批中</span>';
  } else if(_appMedStatus==='ISSUED'){
    rightBadge='<span class="appMedBadge" style="font-size:11px;color:#2E7D32;background:#E8F5E9;border:1px solid #A5D6A7;padding:2px 10px;border-radius:10px;font-weight:700;">✅ 已啟用</span>';
  } else if(_appMedStatus==='DECLINED'){
    rightBadge='<span class="appMedBadge" style="font-size:11px;color:#C62828;background:#FFEBEE;border:1px solid #EF9A9A;padding:2px 10px;border-radius:10px;font-weight:700;">❌ 未批准</span>';
  } else {
    // No status (not applied yet) — show green 免費申請 on right
    rightBadge='<span class="appMedBadge" style="font-size:11px;color:#2E7D32;background:#E8F5E9;border:1px solid #A5D6A7;padding:2px 10px;border-radius:10px;font-weight:700;">免費申請</span>';
  }
  var parts=[];
  parts.push('<div id="appMedPinCard" onclick="appBnfOpenMedCard()" style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.09);overflow:hidden;cursor:pointer;border:2px solid #1565C0;">');
  parts.push('<div style="height:90px;background:linear-gradient(135deg,#1565C0,#0D47A1);display:flex;align-items:center;justify-content:center;gap:14px;">');
  parts.push('<span style="font-size:44px;">🏥</span>');
  parts.push('<div style="color:#fff;"><div style="font-size:18px;font-weight:900;letter-spacing:0.5px;">免費醫健卡</div><div style="font-size:13px;opacity:0.85;margin-top:2px;">HMMP 醫療保障計劃</div></div>');
  parts.push('</div>');
  parts.push('<div style="padding:14px 16px;">');
  // Badge row: 💊健康 tag on left, right-side status badge floated right
  parts.push('<div data-badge-row="1" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">');
  parts.push('<span style="font-size:11px;font-weight:700;color:#1565C0;background:#E3F2FD;padding:2px 8px;border-radius:10px;">💊 健康</span>');
  parts.push(rightBadge);
  parts.push('</div>');
  parts.push('<div style="font-size:18px;font-weight:800;color:#1a1a1a;line-height:1.3;margin-bottom:6px;">香港商貿慈善基金醫健卡</div>');
  parts.push('<div style="font-size:14px;color:#555;line-height:1.5;margin-bottom:6px;">免費申請：專享網絡醫療優惠服務</div>');
  parts.push('<div style="margin-top:10px;display:flex;align-items:center;justify-content:flex-end;">');
  parts.push('<span style="font-size:13px;font-weight:700;color:#1565C0;">查看 / 申請 ›</span>');
  parts.push('</div></div></div>');
  return parts.join('');
}

// Fetch status badge async and update pin card after render
function appMedFetchPinStatus(){
  var memberNo=localStorage.getItem('ce85_member_no')||window.MEMBER_NO||'';
  if(!memberNo) return;
  fetch('/api/members/'+encodeURIComponent(memberNo)+'/medical-status')
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok) return;
      _appMedStatus=d.status||null;
      // Re-render pin card badge — replace the single .appMedBadge span in [data-badge-row]
      var card=document.getElementById('appMedPinCard');
      if(!card) return;
      var badgeRow=card.querySelector('[data-badge-row]');
      if(!badgeRow) return;
      // Remove ALL existing .appMedBadge elements (prevents duplicates on repeated fetch)
      badgeRow.querySelectorAll('.appMedBadge').forEach(function(b){b.remove();});
      // Build new badge based on status
      var span=document.createElement('span');
      span.className='appMedBadge';
      if(_appMedStatus==='PENDING'||_appMedStatus==='SENT'){
        span.style.cssText='font-size:11px;color:#F57F17;background:#FFFDE7;border:1px solid #FFE082;padding:2px 10px;border-radius:10px;font-weight:700;';
        span.textContent='⏳ 審批中';
      } else if(_appMedStatus==='ISSUED'){
        span.style.cssText='font-size:11px;color:#2E7D32;background:#E8F5E9;border:1px solid #A5D6A7;padding:2px 10px;border-radius:10px;font-weight:700;';
        span.textContent='✅ 已啟用';
      } else if(_appMedStatus==='DECLINED'){
        span.style.cssText='font-size:11px;color:#C62828;background:#FFEBEE;border:1px solid #EF9A9A;padding:2px 10px;border-radius:10px;font-weight:700;';
        span.textContent='❌ 未批准';
      } else {
        // No application — keep showing 免費申請
        span.style.cssText='font-size:11px;color:#2E7D32;background:#E8F5E9;border:1px solid #A5D6A7;padding:2px 10px;border-radius:10px;font-weight:700;';
        span.textContent='免費申請';
      }
      badgeRow.appendChild(span);
    }).catch(function(){});
}

function appBnfLoad(catId){
  var loading=document.getElementById('shopLoadingMsg'),empty=document.getElementById('shopEmptyMsg'),list=document.getElementById('appBnfList');
  if(loading) loading.style.display='block';
  if(empty) empty.style.display='none';
  if(list) list.innerHTML='';
  var url='/api/benefits'+(catId?'?category_id='+catId:'');
  fetch(url)
    .then(function(r){return r.json();})
    .then(function(d){
      if(loading) loading.style.display='none';
      var items=d.benefits||[];
      // Show medical card pinned card for 全部(0) or 健康(MED_CARD_CAT_ID)
      var showMed=(catId===0||catId===MED_CARD_CAT_ID);
      var showHmvod=(catId===0||catId===HMVOD_ENT_CAT_ID);
      if(!items.length && !showMed && !showHmvod){if(empty)empty.style.display='block';return;}
      _appBnfBenefits=items;
      if(list){
        var html=showMed?appBnfMedCardPinHtml():'';
        html+=showHmvod?appHmvodPinHtml():'';
        html+=items.map(function(b){return appBnfCardHtml(b);}).join('');
        list.innerHTML=html;
        // Async fetch status badges
        if(showMed) setTimeout(appMedFetchPinStatus,100);
        if(showHmvod) setTimeout(appHmvodFetchStatus,150);
      }
    })
    .catch(function(){if(loading)loading.style.display='none';if(empty)empty.style.display='block';});
}

// ── 醫健卡詳情 panel (in 福利 tab) ──────────────────────────────────────────
function appBnfOpenMedCard(){
  var panel=document.getElementById('appBnfDetail');
  var content=document.getElementById('appBnfDetailContent');
  if(!panel||!content) return;

  // Get member_no from localStorage (same as the rest of the PWA app)
  var memberNo=localStorage.getItem('ce85_member_no')||window.MEMBER_NO||'';

  if(!memberNo){
    // Not logged in to the app — show prompt to go to 我的卡 tab
    content.innerHTML=appBnfMedCardAuthHtml();
    panel.style.display='block';
    return;
  }

  // Show panel with loading state immediately
  content.innerHTML='<div style="text-align:center;padding:60px 20px;color:#888;font-size:16px;">載入中…</div>';
  panel.style.display='block';

  // Use the member_no-based API (no app_session cookie needed)
  fetch('/api/members/'+encodeURIComponent(memberNo)+'/medical-status')
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok){
        content.innerHTML=appBnfMedCardAuthHtml();
        return;
      }
      if(d.card_no){
        content.innerHTML=appBnfMedCardIssuedHtml(d);
      } else if(d.status){
        content.innerHTML=appBnfMedCardStatusHtml(d);
      } else {
        // No application yet — show apply form pre-filled with member name
        content.innerHTML=appBnfMedCardApplyHtml(d);
      }
    })
    .catch(function(){
      content.innerHTML='<div style="padding:40px 20px;text-align:center;color:#c00;">網絡錯誤，請稍後再試</div>';
    });
}

// MC Sample card image URL (hardcoded)
var MC_SAMPLE_IMG='/static/mc-sample.png';

function appBnfMedCardHeader(){
  // Simple compact header bar for issued/status/auth panels
  return '<div style="background:linear-gradient(135deg,#1565C0,#0D47A1);padding:18px 20px 14px;display:flex;align-items:center;gap:12px;"><span style="font-size:28px;">🏥</span><div style="color:#fff;"><div style="font-size:16px;font-weight:900;">免費醫健卡</div><div style="font-size:12px;opacity:0.8;margin-top:1px;">香港商貿慈善基金 · HMMP</div></div></div>';
}

function appBnfMedCardAuthHtml(){
  var parts=[];
  parts.push(appBnfMedCardHeader());
  parts.push('<div style="padding:30px 20px;text-align:center;">');
  parts.push('<div style="font-size:40px;margin-bottom:16px;">🔒</div>');
  parts.push('<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:10px;">請先登入會員卡</div>');
  parts.push('<div style="font-size:15px;color:#666;line-height:1.6;margin-bottom:24px;">登入後即可查看醫健卡狀態或提交申請。</div>');
  parts.push('<button onclick="appBnfCloseDetail();switchTab(&apos;card&apos;)" style="width:100%;padding:16px;background:#1565C0;color:#fff;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;">前往登入</button>');
  parts.push('</div>');
  return parts.join('');
}

function appBnfMedCardStatusHtml(d){
  var statusMap={'PENDING':'⏳ 審核中','SENT':'📮 已發送','ISSUED':'✅ 已發出','DECLINED':'❌ 未批准'};
  var colorMap={'PENDING':'#F57F17','SENT':'#1565C0','ISSUED':'#2E7D32','DECLINED':'#C62828'};
  var bgMap={'PENDING':'#FFFDE7','SENT':'#E3F2FD','ISSUED':'#E8F5E9','DECLINED':'#FFEBEE'};
  var st=d.status||'PENDING';
  var label=statusMap[st]||st;
  var color=colorMap[st]||'#555';
  var bg=bgMap[st]||'#f5f5f5';
  var parts=[];
  parts.push(appBnfMedCardHeader());
  parts.push('<div style="padding:28px 20px;">');
  parts.push('<div style="font-size:16px;color:#37474F;margin-bottom:14px;font-weight:700;">你的醫健卡申請狀態：</div>');
  parts.push('<div style="background:'+bg+';border-radius:12px;padding:18px 20px;text-align:center;margin-bottom:20px;">');
  parts.push('<div style="font-size:28px;font-weight:900;color:'+color+';">'+label+'</div>');
  parts.push('</div>');
  parts.push('<div style="font-size:15px;color:#546E7A;line-height:1.7;margin-bottom:20px;">如有查詢請 WhatsApp：<a href="https://wa.me/85254429749" target="_blank" style="color:#1565C0;font-weight:700;">📱 5442-9749</a></div>');
  parts.push('</div>');
  return parts.join('');
}

function appBnfMedCardIssuedHtml(d){
  // MC1.png layout: show card_image_url prominently at top, then green 查看醫生 button
  // MC2.png: doctor panel shown inline after clicking 查看醫生
  var nameEnFull=(d.name_en||'').trim().toUpperCase();
  var nameParts=nameEnFull.split(/\s+/).filter(function(p){return p.length>0;});
  var hasTwoParts=nameParts.length>=2;
  var surnamePart=hasTwoParts?nameParts[0]:'';
  var givenPart=hasTwoParts?nameParts.slice(1).join(' '):'';
  var cardNo=d.card_no||'';
  // Hidden data store for copy (avoids quote issues in onclick)
  var dataStore='<div id="appMedData" style="display:none;">'
    +'<span id="appMedData1">'+escAppHtml(cardNo)+'</span>'
    +'<span id="appMedData2">'+escAppHtml(surnamePart)+'</span>'
    +'<span id="appMedData3">'+escAppHtml(givenPart)+'</span>'
    +'<span id="appMedData4">'+escAppHtml(nameEnFull)+'</span>'
    +'</div>';

  var parts=[];
  parts.push(appBnfMedCardHeader());
  parts.push(dataStore);
  parts.push('<div style="padding:0 0 100px;">');

  // ── Card image ──
  if(d.card_image_url){
    parts.push('<div style="padding:16px 16px 0;">');
    parts.push('<img src="'+escAppHtml(d.card_image_url)+'" style="width:100%;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.15);display:block;" alt="醫健卡">');
    parts.push('</div>');
  } else {
    // No image yet — show card no prominently
    parts.push('<div style="padding:20px 16px 0;">');
    parts.push('<div style="background:#E3F2FD;border-radius:10px;padding:18px;text-align:center;">');
    parts.push('<div style="font-size:14px;color:#1565C0;font-weight:700;margin-bottom:8px;">你的醫健卡號碼</div>');
    parts.push('<div style="font-size:32px;font-weight:900;color:#0D47A1;letter-spacing:4px;font-family:monospace;">'+escAppHtml(cardNo)+'</div>');
    parts.push('<button onclick="appMedCopyById(1,this,&apos;複製卡號&apos;)" style="margin-top:12px;padding:10px 24px;background:#1565C0;color:#fff;border:0;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;">複製卡號</button>');
    parts.push('</div></div>');
  }

  // ── 查看醫生 green button ──
  parts.push('<div style="padding:16px;">');
  parts.push('<button onclick="appMedShowDoctorPanel()" id="appBtnMedDoctor" style="width:100%;min-height:58px;padding:14px;background:#2E7D32;color:#fff;border:0;border-radius:14px;font-size:20px;font-weight:900;cursor:pointer;letter-spacing:1px;">🩺 查看醫生</button>');
  parts.push('</div>');

  // ── Doctor panel (MC2.png) — hidden by default ──
  parts.push('<div id="appMedDoctorPanel" style="display:none;padding:0 16px 20px;">');
  // Card login info
  parts.push('<div style="background:#E8F5E9;border:1.5px solid #A5D6A7;border-radius:12px;padding:16px 18px;margin-bottom:16px;">');
  parts.push('<div style="font-size:16px;font-weight:900;color:#1B5E20;margin-bottom:14px;">🔐 HMMP 系統登入資料</div>');
  parts.push('<ol style="padding-left:20px;font-size:16px;line-height:2.2;color:#1B5E20;margin:0;">');
  parts.push('<li><span style="font-weight:700;">登入名稱：</span>你的醫健卡號碼<div style="display:flex;align-items:center;gap:10px;margin:4px 0 8px;flex-wrap:wrap;"><span style="font-size:20px;font-weight:900;letter-spacing:3px;color:#0D47A1;font-family:monospace;">'+escAppHtml(cardNo)+'</span><button onclick="appMedCopyById(1,this,&apos;複製&apos;)" style="padding:8px 14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer;">複製</button></div></li>');
  if(hasTwoParts){
    parts.push('<li><span style="font-weight:700;">姓氏：</span>'+escAppHtml(surnamePart)+'<div style="margin:4px 0 8px;"><button onclick="appMedCopyById(2,this,&apos;複製&apos;)" style="padding:8px 14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer;">複製</button></div></li>');
    parts.push('<li><span style="font-weight:700;">名稱：</span>'+escAppHtml(givenPart)+'<div style="margin:4px 0 8px;"><button onclick="appMedCopyById(3,this,&apos;複製&apos;)" style="padding:8px 14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer;">複製</button></div></li>');
  } else {
    parts.push('<li><span style="font-weight:700;">英文全名：</span>'+escAppHtml(nameEnFull)+'<div style="margin:4px 0 8px;"><button onclick="appMedCopyById(4,this,&apos;複製&apos;)" style="padding:8px 14px;background:#1565C0;color:#fff;border:0;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer;">複製</button></div></li>');
  }
  parts.push('<li><span style="font-weight:700;">電郵地址：</span><span style="color:#78909C;">不用填</span></li>');
  parts.push('<li><span style="font-weight:700;">按「登入」</span></li>');
  parts.push('</ol></div>');
  // Open doctor list link
  parts.push('<a href="https://www.hmmp.com.hk/DefaultDoctorList_cn.aspx" target="_blank" rel="noopener" style="display:block;width:100%;min-height:55px;padding:14px;background:#1565C0;color:#fff;border:0;border-radius:12px;font-size:18px;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;line-height:1.4;box-sizing:border-box;">🌐 開啟 HMMP 醫生名單網站</a>');
  parts.push('<div style="margin-top:12px;font-size:14px;color:#546E7A;line-height:1.6;text-align:center;">前往 HMMP 官網，使用上方登入資料查看網絡醫生名單。</div>');
  parts.push('</div>'); // end doctor panel

  parts.push('</div>'); // end padding div
  return parts.join('');
}

function appBnfMedCardApplyHtml(d){
  // MC Apply layout: Sample card image on top, form below
  // d may contain name_zh / name_en from member record for pre-fill
  var preNameZh=(d&&d.name_zh)||'';
  var preNameEn=(d&&d.name_en)||'';
  var parts=[];
  // No blue header — start directly with sample card image
  parts.push('<div style="padding:0 0 100px;">');

  // ── Sample card image (served from /static/mc-sample.png in the same deployment) ──
  parts.push('<img src="'+escAppHtml(MC_SAMPLE_IMG)+'" style="width:100%;display:block;" alt="醫健卡樣本">');

  // ── NGO description ──
  parts.push('<div style="padding:16px 16px 0;">');
  parts.push('<div style="font-size:15px;color:#546E7A;margin-bottom:16px;line-height:1.7;">由合作 NGO <strong>香港商貿慈善基金</strong>提供，免費申請。<br>申請後職員將以 WhatsApp 聯絡辦理。</div>');

  // ── Form card ──
  parts.push('<div style="background:#fff;border-radius:12px;border:1.5px solid #e0e0e0;padding:20px;margin-bottom:16px;">');
  parts.push('<div style="font-size:16px;font-weight:900;color:#1B4332;margin-bottom:16px;">📝 填寫申請資料</div>');
  // nameZh
  parts.push('<div style="margin-bottom:14px;">');
  parts.push('<label style="font-size:14px;font-weight:700;color:#444;display:block;margin-bottom:6px;">中文全名 <span style="color:#C62828;">✽ 必填</span>（與身份證相同）</label>');
  parts.push('<input id="appMfNameZh" type="text" placeholder="例：陳大文" value="'+escAppHtml(preNameZh)+'" style="width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:16px;box-sizing:border-box;font-family:inherit;">');
  parts.push('</div>');
  // nameEn
  parts.push('<div style="margin-bottom:14px;">');
  parts.push('<label style="font-size:14px;font-weight:700;color:#444;display:block;margin-bottom:6px;">英文全名 <span style="color:#C62828;">✽ 必填</span>（與身份證相同）</label>');
  parts.push('<input id="appMfNameEn" type="text" placeholder="例：CHAN TAI MAN" value="'+escAppHtml(preNameEn)+'" style="width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:16px;box-sizing:border-box;font-family:inherit;text-transform:uppercase;">');
  parts.push('</div>');
  // hkid
  parts.push('<div style="margin-bottom:14px;">');
  parts.push('<label style="font-size:14px;font-weight:700;color:#444;display:block;margin-bottom:6px;">身份證頭 4 位 <span style="color:#C62828;">✽ 必填</span></label>');
  parts.push('<input id="appMfHkid" type="text" placeholder="例：K608" maxlength="4" style="width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:20px;font-weight:700;box-sizing:border-box;text-transform:uppercase;letter-spacing:4px;font-family:monospace;">');
  parts.push('</div>');
  // consent
  parts.push('<div style="margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;">');
  parts.push('<input type="checkbox" id="appMfConsent" style="margin-top:3px;width:18px;height:18px;flex-shrink:0;">');
  parts.push('<label for="appMfConsent" style="font-size:13px;color:#555;line-height:1.6;">本人同意將以上個人資料（包括姓名及身份證頭4位）提供予<strong>香港商貿慈善基金</strong>，用於申請及發出醫健卡。本人明白 NGO 職員將以電話或 WhatsApp 與本人聯絡辦理手續，並同意接受聯絡。</label>');
  parts.push('</div>');
  // error
  parts.push('<div id="appMedErr" style="color:#C62828;font-size:14px;margin-bottom:10px;display:none;"></div>');
  // submit
  parts.push('<button id="appMedSubmitBtn" onclick="appMedSubmit()" style="width:100%;padding:16px;background:#1565C0;color:#fff;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;">提交申請</button>');
  parts.push('</div>');

  // disclaimer
  parts.push('<div style="background:#FFF8E1;border-radius:10px;padding:14px 16px;font-size:13px;color:#5D4037;line-height:1.7;margin-bottom:16px;">');
  parts.push('⚕️ 醫健卡資料必須與<strong>香港身份證完全一致</strong>，請確保中英文姓名及身份證號碼頭4位正確無誤。');
  parts.push('</div>');
  parts.push('</div>'); // end padding
  parts.push('</div>'); // end outer
  return parts.join('');
}

function appMedSubmit(){
  var nameZh=(document.getElementById('appMfNameZh')||{}).value||'';
  var nameEn=(document.getElementById('appMfNameEn')||{}).value||'';
  var hkid=(document.getElementById('appMfHkid')||{}).value||'';
  var consent=document.getElementById('appMfConsent')&&document.getElementById('appMfConsent').checked;
  var errEl=document.getElementById('appMedErr');
  var showErr=function(msg){if(errEl){errEl.textContent=msg;errEl.style.display='block';}};
  if(errEl) errEl.style.display='none';
  if(!nameZh.trim()){showErr('請填寫中文全名');return;}
  if(!nameEn.trim()){showErr('請填寫英文全名');return;}
  if(!hkid.trim()||hkid.trim().length<3){showErr('請填寫身份證頭4位（如 K608）');return;}
  if(!consent){showErr('請同意私隱條款，授權 NGO 聯絡你');return;}
  var btn=document.getElementById('appMedSubmitBtn');
  if(btn){btn.textContent='提交中…';btn.style.opacity='0.7';btn.onclick=null;}
  // Use localStorage member_no (same as rest of PWA app, no MEMBER_NO global needed)
  var memberNo=localStorage.getItem('ce85_member_no')||window.MEMBER_NO||'';
  if(!memberNo){showErr('請先查閱你的會員卡再申請');if(btn){btn.textContent='提交申請';btn.style.opacity='1';btn.onclick=appMedSubmit;}return;}
  fetch('/api/members/'+encodeURIComponent(memberNo)+'/medical',{
    method:'POST',credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({nameZh:nameZh.trim(),nameEn:nameEn.trim().toUpperCase(),hkid:hkid.trim().toUpperCase()})
  }).then(function(r){return r.json();})
  .then(function(d){
    if(d.ok||d.alreadyApplied){
      // Show success state
      var content=document.getElementById('appBnfDetailContent');
      if(content){
        var p=[];
        p.push(appBnfMedCardHeader());
        p.push('<div style="padding:40px 20px;text-align:center;">');
        p.push('<div style="font-size:52px;margin-bottom:16px;">✅</div>');
        p.push('<div style="font-size:20px;font-weight:800;color:#2E7D32;margin-bottom:12px;">醫健卡申請已提交！</div>');
        p.push('<div style="font-size:16px;color:#546E7A;line-height:1.7;">你的醫健卡申請已記錄，<strong>香港商貿慈善基金</strong>職員將會以<strong>電話或 WhatsApp</strong> 聯絡你安排發卡手續。如有查詢請致電或 WhatsApp：<strong>9888 5708</strong></div>');
        p.push('</div>');
        content.innerHTML=p.join('');
      }
    } else {
      if(btn){btn.textContent='提交申請';btn.style.opacity='1';btn.onclick=appMedSubmit;}
      showErr(d.error||'提交失敗，請稍後再試');
    }
  }).catch(function(){
    if(btn){btn.textContent='提交申請';btn.style.opacity='1';btn.onclick=appMedSubmit;}
    showErr('網絡錯誤，請稍後再試');
  });
}

function appBnfCardHtml(b){
  var imgHtml=b.image_url
    ?'<div style="border-radius:14px 14px 0 0;overflow:hidden;height:180px;background:#f5f5f5;"><img src="'+escAppHtml(b.image_url)+'" style="width:100%;height:100%;object-fit:cover;display:block;"></div>'
    :'<div style="border-radius:14px 14px 0 0;height:80px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);display:flex;align-items:center;justify-content:center;font-size:40px;">'+(b.category_icon||'🎁')+'</div>';
  var dateHtml=(b.start_date||b.end_date)?'<div style="font-size:14px;color:#888;margin-top:4px;">📅 '+(b.start_date||'')+(b.start_date&&b.end_date?' ~ ':'')+(b.end_date||'長期')+'</div>':'';
  return '<div onclick="appBnfOpenDetail('+b.id+')" style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.09);overflow:hidden;cursor:pointer;">'+
    imgHtml+
    '<div style="padding:14px 16px;">'+
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">'+
        '<span style="font-size:11px;font-weight:700;color:#388E3C;background:#E8F5E9;padding:2px 8px;border-radius:10px;">'+(b.category_icon||'')+' '+(b.category_name||'')+'</span>'+
        (b.end_date&&b.end_date<new Date().toISOString().slice(0,10)?'<span style="font-size:11px;color:#9e9e9e;background:#f5f5f5;padding:2px 8px;border-radius:10px;">已過期</span>':'<span style="font-size:11px;color:#2E7D32;background:#E8F5E9;padding:2px 8px;border-radius:10px;">有效</span>')+
      '</div>'+
      '<div style="font-size:18px;font-weight:800;color:#1a1a1a;line-height:1.3;margin-bottom:6px;">'+escAppHtml(b.title)+'</div>'+
      (b.description?'<div style="font-size:14px;color:#555;line-height:1.5;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">'+escAppHtml(b.description)+'</div>':'')+
      dateHtml+
      '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;">'+
        '<span style="font-size:13px;color:#888;">👥 '+b.claim_count+' 人已領取</span>'+
        '<span style="font-size:13px;font-weight:700;color:#1B4332;">查看詳情 ›</span>'+
      '</div>'+
    '</div></div>';
}

function appBnfOpenDetail(id){
  var b=_appBnfBenefits.find(function(x){return x.id==id;});
  if(!b) return;
  var panel=document.getElementById('appBnfDetail');
  var content=document.getElementById('appBnfDetailContent');
  if(!panel||!content) return;

  var imgHtml=b.image_url
    ?'<img src="'+escAppHtml(b.image_url)+'" style="width:100%;max-height:280px;object-fit:cover;display:block;">'
    :'<div style="height:120px;background:linear-gradient(135deg,#e8f5e9,#a5d6a7);display:flex;align-items:center;justify-content:center;font-size:60px;">'+(b.category_icon||'🎁')+'</div>';

  var extraHtml='';
  try{
    var ef=JSON.parse(b.extra_fields||'[]');
    if(ef.length){
      extraHtml='<div style="background:#f9fdf9;border-radius:10px;padding:14px 16px;margin:16px 0;">';
      ef.forEach(function(f){
        if(f.label) extraHtml+='<div style="margin-bottom:8px;"><span style="font-size:13px;font-weight:700;color:#555;">'+escAppHtml(f.label)+'：</span><span style="font-size:14px;color:#222;">'+escAppHtml(f.value||'')+'</span></div>';
      });
      extraHtml+='</div>';
    }
  }catch(e){}

  var claimBtn='<button id="appBnfClaimBtn" onclick="appBnfClaim('+b.id+')" style="width:100%;padding:16px;background:#1B4332;color:#fff;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;margin-top:16px;">🎁 申請領取</button>';

  content.innerHTML=
    imgHtml+
    '<div style="padding:18px 16px;">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">'+
        '<span style="font-size:13px;font-weight:700;color:#388E3C;background:#E8F5E9;padding:3px 10px;border-radius:12px;">'+(b.category_icon||'')+' '+(b.category_name||'')+'</span>'+
        (b.claim_count>0?'<span style="font-size:13px;color:#888;">👥 '+b.claim_count+' 人已領取</span>':'')+
      '</div>'+
      '<div style="font-size:22px;font-weight:900;color:#1a1a1a;line-height:1.3;margin-bottom:10px;">'+escAppHtml(b.title)+'</div>'+
      (b.description?'<div style="font-size:16px;color:#555;line-height:1.6;margin-bottom:12px;">'+escAppHtml(b.description)+'</div>':'')+
      ((b.start_date||b.end_date)?'<div style="font-size:14px;color:#888;margin-bottom:12px;">📅 有效期：'+(b.start_date||'即日')+(b.end_date?' 至 '+b.end_date:' 長期有效')+'</div>':'')+
      (b.benefit_content?'<div style="background:#f0f7f0;border-left:4px solid #1B4332;border-radius:0 10px 10px 0;padding:14px 16px;margin:14px 0;">'+
        '<div style="font-size:13px;font-weight:700;color:#1B4332;margin-bottom:6px;">🎁 福利內容</div>'+
        '<div style="font-size:15px;color:#333;white-space:pre-wrap;line-height:1.6;">'+escAppHtml(b.benefit_content)+'</div>'+
      '</div>':'')+
      extraHtml+
      claimBtn+
    '</div>';

  panel.style.display='block';
  // Check if already claimed
  appBnfCheckClaimed(b.id);
}

function appBnfCheckClaimed(id){
  fetch('/api/benefits/'+id+'/my-claim',{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      var btn=document.getElementById('appBnfClaimBtn');
      if(!btn) return;
      if(d.claimed){
        btn.textContent='✅ 已領取';
        btn.style.background='#4CAF50';
        btn.style.cursor='default';
        btn.onclick=null;
        if(d.claimed_at) btn.insertAdjacentHTML('afterend','<div style="text-align:center;font-size:13px;color:#888;margin-top:6px;">領取時間：'+(d.claimed_at+'').slice(0,16)+'</div>');
      }
    });
}

function appBnfClaim(id){
  var btn=document.getElementById('appBnfClaimBtn');
  if(btn){btn.textContent='處理中…';btn.style.opacity='0.7';btn.onclick=null;}
  fetch('/api/benefits/'+id+'/claim',{method:'POST',credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.code==='AUTH_REQUIRED'){
        if(btn){btn.textContent='🎁 申請領取';btn.style.opacity='1';btn.onclick=function(){appBnfClaim(id);};}
        alert('請先登入會員卡才可申領福利');
        appBnfCloseDetail();
        switchTab('card');
        return;
      }
      if(d.ok||d.already_claimed){
        if(btn){
          btn.textContent=d.already_claimed?'✅ 已領取':'✅ 成功領取！';
          btn.style.background='#4CAF50';btn.style.cursor='default';btn.onclick=null;
        }
        if(!d.already_claimed) alert('🎁 成功領取！');
        // Refresh claim count
        appBnfLoad(_appBnfCurrentCat);
      } else {
        if(btn){btn.textContent='🎁 申請領取';btn.style.opacity='1';btn.onclick=function(){appBnfClaim(id);};}
        alert(d.error||'領取失敗，請稍後再試');
      }
    })
    .catch(function(){
      if(btn){btn.textContent='🎁 申請領取';btn.style.opacity='1';btn.onclick=function(){appBnfClaim(id);};}
      alert('網絡錯誤，請稍後再試');
    });
}

function appBnfCloseDetail(){
  var panel=document.getElementById('appBnfDetail');
  if(panel) panel.style.display='none';
}

// ════════════════════════════════════════════════════════════════════════════════
// HMVod 免費1年會籍 福利卡片
// ════════════════════════════════════════════════════════════════════════════════
var HMVOD_ENT_CAT_ID = 2; // 娛樂 category id from migration 0030
var _hmvodApplied = null; // null=unknown, true=applied, false=not applied
var _hmvodWaNumber = ''; // loaded async

function appHmvodPinHtml(){
  var badgeHtml = _hmvodApplied
    ? '<span class="appHmvodBadge" style="font-size:11px;color:#1565C0;background:#E3F2FD;border:1px solid #90CAF9;padding:2px 10px;border-radius:10px;font-weight:700;">✅ 已申請</span>'
    : '<span class="appHmvodBadge" style="font-size:11px;color:#B71C1C;background:#FFEBEE;border:1px solid #EF9A9A;padding:2px 10px;border-radius:10px;font-weight:700;">🎁 免費申請</span>';
  var parts=[];
  parts.push('<div id="appHmvodPinCard" onclick="appHmvodOpen()" style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.1);overflow:hidden;cursor:pointer;border:2px solid #B71C1C;margin-bottom:14px;">');
  // Red gradient header
  parts.push('<div style="background:linear-gradient(135deg,#B71C1C,#D32F2F);padding:16px 18px;display:flex;align-items:center;gap:14px;">');
  parts.push('<div style="width:52px;height:52px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🎬</div>');
  parts.push('<div style="color:#fff;"><div style="font-size:18px;font-weight:900;letter-spacing:0.5px;">HMV On Demand</div><div style="font-size:12px;opacity:0.85;margin-top:2px;">免費1年串流會籍 · 無限睇</div></div>');
  parts.push('</div>');
  // Body
  parts.push('<div style="padding:14px 16px;">');
  parts.push('<div data-hmvod-badge-row="1" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">');
  parts.push('<span style="font-size:11px;font-weight:700;color:#B71C1C;background:#FFEBEE;padding:2px 8px;border-radius:10px;">🎭 娛樂</span>');
  parts.push(badgeHtml);
  parts.push('</div>');
  parts.push('<div style="font-size:17px;font-weight:800;color:#1a1a1a;line-height:1.3;margin-bottom:6px;">HMVod 免費1年影視串流會籍</div>');
  parts.push('<div style="font-size:14px;color:#555;line-height:1.5;margin-bottom:4px;">港劇、韓劇、電影、動漫無限收睇，全港最大華語串流平台。</div>');
  parts.push('<div style="font-size:13px;color:#B71C1C;font-weight:700;margin-bottom:6px;">🎁 路演現場申請 即享禮品一份！</div>');
  parts.push('<div style="margin-top:10px;display:flex;align-items:center;justify-content:flex-end;">');
  parts.push('<span style="font-size:13px;font-weight:700;color:#B71C1C;">立即申請 ›</span>');
  parts.push('</div></div></div>');
  return parts.join('');
}

function appHmvodFetchStatus(){
  var memberNo=localStorage.getItem('ce85_member_no')||window.MEMBER_NO||'';
  if(!memberNo) return;
  var phone=localStorage.getItem('ce85_phone')||'';
  if(!phone) return;
  fetch('/api/hmvod/check?phone='+encodeURIComponent(phone))
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok) return;
      _hmvodApplied=d.applied||false;
      // Update badge in pin card
      var card=document.getElementById('appHmvodPinCard');
      if(!card) return;
      var badgeRow=card.querySelector('[data-hmvod-badge-row]');
      if(!badgeRow) return;
      badgeRow.querySelectorAll('.appHmvodBadge').forEach(function(b){b.remove();});
      var span=document.createElement('span');
      span.className='appHmvodBadge';
      if(_hmvodApplied){
        span.style.cssText='font-size:11px;color:#1565C0;background:#E3F2FD;border:1px solid #90CAF9;padding:2px 10px;border-radius:10px;font-weight:700;';
        span.textContent='✅ 已申請';
      } else {
        span.style.cssText='font-size:11px;color:#B71C1C;background:#FFEBEE;border:1px solid #EF9A9A;padding:2px 10px;border-radius:10px;font-weight:700;';
        span.textContent='🎁 免費申請';
      }
      badgeRow.appendChild(span);
    }).catch(function(){});
}

function appHmvodOpen(){
  var panel=document.getElementById('appBnfDetail');
  var content=document.getElementById('appBnfDetailContent');
  if(!panel||!content) return;
  var memberNo=localStorage.getItem('ce85_member_no')||window.MEMBER_NO||'';
  if(!memberNo){
    content.innerHTML=appHmvodAuthHtml();
    panel.style.display='block';
    return;
  }
  content.innerHTML='<div style="text-align:center;padding:60px 20px;color:#888;">載入中…</div>';
  panel.style.display='block';
  // Load WA number + check status in parallel
  Promise.all([
    fetch('/api/hmvod/settings').then(function(r){return r.json();}),
    (function(){
      var phone=localStorage.getItem('ce85_phone')||'';
      return phone ? fetch('/api/hmvod/check?phone='+encodeURIComponent(phone)).then(function(r){return r.json();}) : Promise.resolve({ok:true,applied:false});
    })()
  ]).then(function(results){
    var settings=results[0], check=results[1];
    _hmvodWaNumber=settings.wa_number||'';
    _hmvodApplied=check.applied||false;
    content.innerHTML=appHmvodDetailHtml(_hmvodApplied);
  }).catch(function(){
    content.innerHTML=appHmvodDetailHtml(false);
  });
}

function appHmvodAuthHtml(){
  var parts=[];
  parts.push('<div style="background:linear-gradient(135deg,#B71C1C,#D32F2F);padding:18px 20px 14px;display:flex;align-items:center;gap:12px;">');
  parts.push('<span style="font-size:28px;">🎬</span><div style="color:#fff;"><div style="font-size:16px;font-weight:900;">HMVod 免費會籍</div></div></div>');
  parts.push('<div style="padding:30px 20px;text-align:center;">');
  parts.push('<div style="font-size:40px;margin-bottom:16px;">🔒</div>');
  parts.push('<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:10px;">請先登入會員卡</div>');
  parts.push('<div style="font-size:15px;color:#666;line-height:1.6;margin-bottom:24px;">登入後即可申請 HMVod 免費1年會籍。</div>');
  parts.push('<button onclick="appBnfCloseDetail();switchTab(&apos;card&apos;)" style="width:100%;padding:16px;background:#B71C1C;color:#fff;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;">前往登入</button>');
  parts.push('</div>');
  return parts.join('');
}

function appHmvodDetailHtml(alreadyApplied){
  var parts=[];
  // Header
  parts.push('<div style="background:linear-gradient(135deg,#B71C1C,#D32F2F);padding:18px 20px 14px;display:flex;align-items:center;gap:12px;">');
  parts.push('<span style="font-size:28px;">🎬</span><div style="color:#fff;"><div style="font-size:16px;font-weight:900;">HMVod 免費1年影視串流會籍</div><div style="font-size:12px;opacity:0.8;margin-top:1px;">Hong Kong #1 Chinese Streaming Platform</div></div></div>');
  parts.push('<div style="padding:0 0 100px;">');

  if(alreadyApplied){
    // Already applied
    parts.push('<div style="padding:28px 20px;text-align:center;">');
    parts.push('<div style="font-size:52px;margin-bottom:16px;">✅</div>');
    parts.push('<div style="font-size:20px;font-weight:900;color:#1565C0;margin-bottom:10px;">你已成功申請！</div>');
    parts.push('<div style="font-size:15px;color:#555;line-height:1.7;margin-bottom:20px;">你的 HMVod 免費1年會籍申請已登記。<br>我們的職員將盡快以 WhatsApp 發送驗証碼給你。</div>');
    parts.push('<div style="background:#E3F2FD;border-radius:12px;padding:16px 20px;font-size:14px;color:#1565C0;line-height:1.7;">如有查詢請 WhatsApp：<br><a href="https://wa.me/'+escAppHtml(_hmvodWaNumber)+'" target="_blank" style="color:#0D47A1;font-weight:700;font-size:16px;">📱 '+formatPhoneDisplay(_hmvodWaNumber)+'</a></div>');
    parts.push('</div>');
  } else {
    // Not yet applied — show promo + apply button
    // Promo banner
    parts.push('<div style="margin:16px;background:linear-gradient(135deg,#B71C1C,#7B1FA2);border-radius:14px;padding:20px;color:#fff;text-align:center;">');
    parts.push('<div style="font-size:36px;margin-bottom:8px;">🎬🍿</div>');
    parts.push('<div style="font-size:22px;font-weight:900;margin-bottom:6px;">免費1年串流會籍</div>');
    parts.push('<div style="font-size:15px;opacity:0.9;line-height:1.6;">港劇 · 韓劇 · 電影 · 動漫<br>無限收睇，隨時隨地</div>');
    parts.push('<div style="margin-top:14px;background:rgba(255,255,255,0.2);border-radius:8px;padding:10px;font-size:14px;font-weight:700;">市值 HK$228/年 · 會員完全免費</div>');
    parts.push('</div>');
    // Gift promo
    parts.push('<div style="margin:0 16px 16px;background:#FFF8E1;border:2px solid #FFD54F;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;">');
    parts.push('<span style="font-size:32px;">🎁</span>');
    parts.push('<div><div style="font-size:15px;font-weight:900;color:#F57F17;margin-bottom:4px;">路演現場申請 · 即享禮品</div><div style="font-size:13px;color:#795548;line-height:1.5;">凡於老有聯盟路演現場申請，可獲精美禮品一份！數量有限，先到先得。</div></div>');
    parts.push('</div>');
    // Features
    parts.push('<div style="margin:0 16px 16px;background:#fff;border-radius:12px;border:1.5px solid #e0e0e0;padding:16px;">');
    parts.push('<div style="font-size:15px;font-weight:900;color:#333;margin-bottom:12px;">會籍包含：</div>');
    var features=[['🎭','港劇/韓劇/台劇','全平台最齊港產及韓國劇集'],['🎬','最新電影','每月新增電影，院線同步上映'],['📺','動漫/兒童','適合全家大細一齊睇'],['📱','多裝置收睇','手機、平板、電視同步使用']];
    features.forEach(function(f){
      parts.push('<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><span style="font-size:24px;width:32px;text-align:center;">'+f[0]+'</span><div><div style="font-size:14px;font-weight:700;color:#333;">'+f[1]+'</div><div style="font-size:12px;color:#777;">'+f[2]+'</div></div></div>');
    });
    parts.push('</div>');
    // How it works
    parts.push('<div style="margin:0 16px 16px;background:#E8F5E9;border-radius:12px;padding:14px 16px;">');
    parts.push('<div style="font-size:14px;font-weight:900;color:#1B5E20;margin-bottom:10px;">📋 申請步驟</div>');
    parts.push('<div style="font-size:13px;color:#2E7D32;line-height:2;">1️⃣ 點擊「立即申請」發送 WhatsApp 給職員<br>2️⃣ 職員為你登記並取得驗証碼<br>3️⃣ 收到驗証碼後告知職員（或現場出示）<br>4️⃣ 完成！即享1年免費串流服務</div>');
    parts.push('</div>');
    // Apply button
    parts.push('<div style="padding:0 16px 16px;">');
    parts.push('<div id="appHmvodErr" style="color:#C62828;font-size:14px;margin-bottom:10px;display:none;"></div>');
    parts.push('<button id="appHmvodApplyBtn" onclick="appHmvodApply()" style="width:100%;min-height:58px;padding:14px;background:#B71C1C;color:#fff;border:0;border-radius:14px;font-size:20px;font-weight:900;cursor:pointer;letter-spacing:0.5px;">📱 立即申請 · 發送 WhatsApp</button>');
    parts.push('<div style="margin-top:10px;font-size:12px;color:#888;text-align:center;">每個電話號碼只限申請一次 · 完全免費</div>');
    parts.push('</div>');
  }
  parts.push('</div>');
  return parts.join('');
}

function formatPhoneDisplay(num){
  var n=String(num||'');
  // If starts with 852, format as 852-XXXX-XXXX
  if(n.startsWith('852')&&n.length>=11) return '(852) '+n.slice(3,7)+'-'+n.slice(7);
  if(n.length===8) return n.slice(0,4)+'-'+n.slice(4);
  return n;
}

function appHmvodApply(){
  var memberNo=localStorage.getItem('ce85_member_no')||'';
  var phone=localStorage.getItem('ce85_phone')||'';
  var errEl=document.getElementById('appHmvodErr');
  var btn=document.getElementById('appHmvodApplyBtn');
  function showErr(msg){ if(errEl){errEl.textContent=msg;errEl.style.display='block';} if(btn){btn.disabled=false;btn.textContent='📱 立即申請 · 發送 WhatsApp';} }
  if(!memberNo||!phone){ showErr('找不到會員資料，請重新登入'); return; }
  if(!_hmvodWaNumber){ showErr('系統錯誤：未能取得職員聯絡方式，請稍後再試'); return; }
  if(btn){btn.disabled=true;btn.textContent='處理中…';}
  var _nameZh='';
  // Step 1: get member name
  fetch('/api/members/'+encodeURIComponent(memberNo)+'/medical-status')
    .then(function(r){return r.json();})
    .then(function(md){
      _nameZh=md.name_zh||'';
      // Step 2: record application
      return fetch('/api/hmvod/apply',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({member_no:memberNo,name_zh:_nameZh,name_en:md.name_en||'',phone:phone})
      });
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok&&d.error==='ALREADY_APPLIED'){
        _hmvodApplied=true;
        var c=document.getElementById('appBnfDetailContent');
        if(c) c.innerHTML=appHmvodDetailHtml(true);
        return;
      }
      if(!d.ok){ showErr(d.message||'申請失敗，請稍後再試'); return; }
      _hmvodApplied=true;
      // Step 3: open WhatsApp with pre-filled message
      var nl=String.fromCharCode(10);
      var waMsg='你好，我是老有聯盟會員 '+_nameZh+'，會員卡號 '+memberNo+'，電話 '+phone+'。'+nl+nl+'我想申請 HMV On Demand 免費1年影視串流會籍，請協助登記，謝謝！';
      window.open('https://wa.me/'+_hmvodWaNumber+'?text='+encodeURIComponent(waMsg),'_blank');
      // Show success screen
      var c2=document.getElementById('appBnfDetailContent');
      if(c2) c2.innerHTML=appHmvodDetailHtml(true);
      appHmvodFetchStatus();
    })
    .catch(function(){ showErr('網絡錯誤，請稍後再試'); });
}

// ── 消息 内容 ─────────────────────────────────────────────────────────────────
var _newsLoaded = false;

function loadAppContents(section) {
  if(section==='shopping') { appBnfInit(); return; }
  // News section
  var prefix = 'news';
  var loadingEl = document.getElementById(prefix + 'LoadingMsg');
  var emptyEl   = document.getElementById(prefix + 'EmptyMsg');
  var cardsEl   = document.getElementById(prefix + 'Cards');
  if (loadingEl) loadingEl.style.display = 'block';
  if (emptyEl)   emptyEl.style.display   = 'none';
  if (cardsEl)   cardsEl.innerHTML       = '';
  fetch('/api/contents?section=news')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (loadingEl) loadingEl.style.display = 'none';
      var items = (d.ok && d.items) ? d.items : [];
      if (!items.length) { if (emptyEl) emptyEl.style.display = 'block'; return; }
      if (cardsEl) {
        cardsEl.innerHTML = items.map(function(item) {
          var dt = item.updated_at ? item.updated_at.slice(0,10) : '';
          var imgHtml = item.image_url
            ? '<div style="border-radius:14px 14px 0 0;overflow:hidden;background:#f9f9f9;"><img src="' + escAppHtml(item.image_url) + '" alt="' + escAppHtml(item.title) + '" style="width:100%;height:auto;display:block;"></div>'
            : '';
          return '<div style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.08);border-left:5px solid #228B22;overflow:hidden;">' +
            imgHtml + '<div style="padding:22px 20px;">' +
              '<div style="font-size:24px;font-weight:900;color:#1a6b1a;margin-bottom:10px;line-height:1.3;">' + escAppHtml(item.title) + '</div>' +
              (item.address ? '<div style="font-size:20px;color:#555;margin-bottom:10px;font-weight:600;">📍 地址：' + escAppHtml(item.address) + '</div>' : '') +
              '<div style="font-size:20px;color:#333;white-space:pre-wrap;line-height:1.7;margin-bottom:' + (dt ? '12px' : '0') + ';">' + escAppHtml(item.body) + '</div>' +
              (dt ? '<div style="font-size:16px;color:#aaa;margin-top:8px;">📅 ' + dt + '</div>' : '') +
            '</div></div>';
        }).join('');
      }
    })
    .catch(function() {
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
    });
}

function escAppHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── 心聲 (Voice / Feedback) ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
var _voiceMemberNo = null;
var _voiceCurrentThreadId = null;
var _voiceCurrentThreadStatus = null;

function initVoiceTab() {
  _voiceMemberNo = localStorage.getItem('ce85_member_no');
  if (!_voiceMemberNo) {
    document.getElementById('voiceNoLogin').style.display = 'block';
    document.getElementById('voiceListView').style.display = 'none';
    document.getElementById('voiceNewForm').style.display = 'none';
    document.getElementById('voiceThreadDetail').style.display = 'none';
    return;
  }
  document.getElementById('voiceNoLogin').style.display = 'none';
  showVoiceList();
}

function showVoiceList() {
  document.getElementById('voiceListView').style.display = 'block';
  document.getElementById('voiceNewForm').style.display = 'none';
  document.getElementById('voiceThreadDetail').style.display = 'none';
  loadVoiceThreads();
}

function loadVoiceThreads() {
  if (!_voiceMemberNo) return;
  var container = document.getElementById('voiceThreads');
  container.innerHTML = '<div style="text-align:center;padding:30px;font-size:20px;color:#888;">載入中…</div>';
  fetch('/api/feedback?m=' + encodeURIComponent(_voiceMemberNo))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var threads = (d.ok && d.threads) ? d.threads : [];
      // update red dot on tab
      var hasUnread = threads.some(function(t) { return t.has_unread_for_member; });
      var dot = document.getElementById('voiceRedDot');
      if (dot) dot.style.display = hasUnread ? 'block' : 'none';
      if (!threads.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px 20px;font-size:20px;color:#888;">暫無意見記錄，歡迎提交你的心聲！</div>';
        return;
      }
      container.innerHTML = threads.map(function(t) {
        var statusColor = t.status === 'replied' ? '#1565C0' : t.status === 'closed' ? '#888' : '#228B22';
        var statusLabel = t.status === 'replied' ? '✅ 已回覆' : t.status === 'closed' ? '🔒 已關閉' : '⏳ 等待回覆';
        var unreadBadge = t.has_unread_for_member ? '<span style="background:#e53935;color:#fff;border-radius:20px;font-size:14px;font-weight:700;padding:2px 9px;margin-left:8px;">新回覆</span>' : '';
        var dt = t.updated_at ? t.updated_at.slice(0,16).replace('T',' ') : '';
        return '<div onclick="openVoiceThread(' + t.id + ')" style="background:#fff;border-radius:14px;padding:18px 16px;box-shadow:0 2px 10px rgba(0,0,0,0.08);cursor:pointer;border-left:5px solid ' + statusColor + ';">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">' +
            '<div style="font-size:20px;font-weight:700;color:#111;flex:1;">' + escAppHtml(t.subject) + unreadBadge + '</div>' +
            '<span style="font-size:16px;font-weight:700;color:' + statusColor + ';">' + statusLabel + '</span>' +
          '</div>' +
          '<div style="font-size:16px;color:#888;margin-top:6px;">📅 ' + dt + '</div>' +
        '</div>';
      }).join('');
    })
    .catch(function() {
      container.innerHTML = '<div style="text-align:center;padding:30px;font-size:20px;color:#e53935;">載入失敗，請重試</div>';
    });
}

function openNewFeedbackForm() {
  document.getElementById('voiceListView').style.display = 'none';
  document.getElementById('voiceNewForm').style.display = 'block';
  document.getElementById('vSubject').value = '';
  document.getElementById('vContent').value = '';
}

function closeNewFeedbackForm() {
  document.getElementById('voiceNewForm').style.display = 'none';
  document.getElementById('voiceListView').style.display = 'block';
}

function submitNewFeedback() {
  var subject = document.getElementById('vSubject').value.trim();
  var content = document.getElementById('vContent').value.trim();
  if (!subject) { alert('請填寫主題'); return; }
  if (!content) { alert('請填寫內容'); return; }
  if (!_voiceMemberNo) { alert('請先登入'); return; }
  var btn = document.getElementById('vSubmitBtn');
  btn.disabled = true; btn.textContent = '提交中…';
  fetch('/api/feedback', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ member_no: _voiceMemberNo, subject: subject, content: content })
  }).then(function(r) { return r.json(); })
    .then(function(d) {
      btn.disabled = false; btn.textContent = '📤 提交意見';
      if (d.ok) {
        closeNewFeedbackForm();
        loadVoiceThreads();
      } else { alert('提交失敗：' + (d.error || '請稍後再試')); }
    })
    .catch(function() { btn.disabled = false; btn.textContent = '📤 提交意見'; alert('網絡錯誤，請稍後再試'); });
}

function openVoiceThread(threadId) {
  _voiceCurrentThreadId = threadId;
  document.getElementById('voiceListView').style.display = 'none';
  document.getElementById('voiceThreadDetail').style.display = 'block';
  document.getElementById('voiceMsgList').innerHTML = '<div style="text-align:center;padding:30px;font-size:20px;color:#888;">載入中…</div>';
  fetch('/api/feedback/' + threadId + '?m=' + encodeURIComponent(_voiceMemberNo))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.ok) {
        document.getElementById('voiceMsgList').innerHTML = '<div style="color:#e53935;padding:20px;font-size:18px;">載入失敗</div>';
        return;
      }
      _voiceCurrentThreadStatus = d.thread ? d.thread.status : 'new';
      document.getElementById('voiceDetailSubject').textContent = d.thread ? d.thread.subject : '';
      var msgs = d.messages || [];
      document.getElementById('voiceMsgList').innerHTML = msgs.length ? msgs.map(function(msg) {
        var isMember = msg.sender === 'member';
        var dt = msg.created_at ? msg.created_at.slice(0,16).replace('T',' ') : '';
        return '<div style="display:flex;flex-direction:column;align-items:' + (isMember ? 'flex-end' : 'flex-start') + ';gap:4px;">' +
          '<div style="max-width:88%;background:' + (isMember ? '#e8f5e9' : '#e3f2fd') + ';border-radius:12px;padding:14px 16px;">' +
            '<div style="font-size:16px;font-weight:700;color:' + (isMember ? '#1B5E20' : '#1565C0') + ';margin-bottom:6px;">' + (isMember ? '👤 我' : '🔧 管理員') + ' · ' + dt + '</div>' +
            '<div style="font-size:20px;color:#222;white-space:pre-wrap;line-height:1.6;">' + escAppHtml(msg.content) + '</div>' +
          '</div>' +
        '</div>';
      }).join('') : '<div style="text-align:center;padding:20px;font-size:18px;color:#888;">暫無訊息</div>';
      // update red dot since we just read it
      loadVoiceRedDot();
      // show/hide reply box
      var closed = _voiceCurrentThreadStatus === 'closed';
      document.getElementById('voiceReplyBox').style.display = closed ? 'none' : 'block';
      document.getElementById('voiceClosedNote').style.display = closed ? 'block' : 'none';
    })
    .catch(function() {
      document.getElementById('voiceMsgList').innerHTML = '<div style="color:#e53935;padding:20px;font-size:18px;">網絡錯誤，請稍後再試</div>';
    });
}

function closeVoiceThread() {
  _voiceCurrentThreadId = null;
  _voiceCurrentThreadStatus = null;
  document.getElementById('voiceThreadDetail').style.display = 'none';
  document.getElementById('voiceReplyBox').style.display = 'block';
  document.getElementById('voiceClosedNote').style.display = 'none';
  document.getElementById('vReplyText').value = '';
  showVoiceList();
}

function submitVoiceReply() {
  var content = document.getElementById('vReplyText').value.trim();
  if (!content) { alert('請輸入回覆內容'); return; }
  if (!_voiceMemberNo || !_voiceCurrentThreadId) { alert('錯誤，請重試'); return; }
  var btn = document.getElementById('vReplyBtn');
  btn.disabled = true; btn.textContent = '發送中…';
  fetch('/api/feedback/' + _voiceCurrentThreadId + '/reply', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ member_no: _voiceMemberNo, content: content })
  }).then(function(r) { return r.json(); })
    .then(function(d) {
      btn.disabled = false; btn.textContent = '📤 發送';
      if (d.ok) {
        document.getElementById('vReplyText').value = '';
        openVoiceThread(_voiceCurrentThreadId);
      } else { alert('發送失敗：' + (d.error || '請稍後再試')); }
    })
    .catch(function() { btn.disabled = false; btn.textContent = '📤 發送'; alert('網絡錯誤'); });
}

function loadVoiceRedDot() {
  if (!_voiceMemberNo) return;
  fetch('/api/feedback?m=' + encodeURIComponent(_voiceMemberNo))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var threads = (d.ok && d.threads) ? d.threads : [];
      var hasUnread = threads.some(function(t) { return t.has_unread_for_member; });
      var dot = document.getElementById('voiceRedDot');
      if (dot) dot.style.display = hasUnread ? 'block' : 'none';
    }).catch(function() {});
}

// switchTab 切到 work 時自動載入
var _origSwitchTab = switchTab;
switchTab = function(name) {
  _origSwitchTab(name);
  if (name === 'work' && !_jobsLoaded) { loadJobList(); }
  if (name === 'shop') { loadAppContents('shopping'); }
  if (name === 'news') { loadAppContents('news'); }
  if (name === 'voice') { initVoiceTab(); }
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
            ? '<div style="width:100%;border-radius:12px 12px 0 0;overflow:hidden;background:#F3F4F6"><img src="' + escHtml(j.image_url) + '" style="width:100%;height:auto;display:block;" loading="lazy" onerror="this.style.display=String.fromCharCode(110,111,110,101)"></div>'
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
        ? '<div style="width:100%;background:#F3F4F6;overflow:hidden"><img src="' + escHtml(j.image_url) + '" style="width:100%;height:auto;display:block;" onerror="this.parentNode.style.display=String.fromCharCode(110,111,110,101)"></div>'
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

// ── 醫健卡 panel 互動函數（appBnfMedCardIssuedHtml 用）──
function appMedTogglePanel(panelId){
  var panels=['medCardInfoPanel','medDoctorInfoPanel'];
  var btnMap={'medCardInfoPanel':'appBtnMedCard','medDoctorInfoPanel':'appBtnMedDoctor'};
  var activeCol={'medCardInfoPanel':'#1565C0','medDoctorInfoPanel':'#2E7D32'};
  panels.forEach(function(id){
    var el=document.getElementById(id);
    var btn=document.getElementById(btnMap[id]);
    var isTarget=(id===panelId);
    var isOpen=el&&el.style.display!=='none';
    if(isTarget){if(el)el.style.display=isOpen?'none':'block';if(btn)btn.style.background=isOpen?activeCol[id]:'#37474F';}
    else{if(el)el.style.display='none';if(btn)btn.style.background=activeCol[id];}
  });
}
// Copy value stored in hidden #appMedData{n} span; btn is the clicked element
function appMedCopyById(n,btn,origLabel){
  var src=document.getElementById('appMedData'+n);
  var txt=src?src.textContent:'';
  navigator.clipboard.writeText(txt).then(function(){
    if(btn){btn.textContent='已複製 ✓';btn.style.background='#2E7D32';setTimeout(function(){btn.textContent=origLabel;btn.style.background='#1565C0';},2000);}
  }).catch(function(){alert(txt);});
}
// Open card image url stored in data-url attr
function appMedOpenImg(btn){
  var url=btn&&btn.getAttribute('data-url');
  if(url) window.open(url,'_blank');
}
// Toggle 查看醫生 doctor panel (MC2.png)
function appMedShowDoctorPanel(){
  var panel=document.getElementById('appMedDoctorPanel');
  var btn=document.getElementById('appBtnMedDoctor');
  if(!panel) return;
  var isOpen=panel.style.display!=='none';
  panel.style.display=isOpen?'none':'block';
  if(btn){
    btn.style.background=isOpen?'#2E7D32':'#1B5E20';
    btn.textContent=isOpen?'🩺 查看醫生':'🩺 收起醫生資料';
  }
}
</script>
</body>
</html>`
}

// ════════════════════════════════════════════════════════════════════════════
// 分錢系統 前端頁面
// /app/partner-apply  — 角色申請頁（領航者/連結者）
// /app/wallet         — 錢包頁（分成記錄）
// ════════════════════════════════════════════════════════════════════════════

app.get('/app/partner-apply', (c) => {
  const memberNo = c.req.query('member') || ''
  const phone = c.req.query('phone') || ''
  const role = c.req.query('role') || ''
  return c.html(partnerApplyHtml(memberNo, phone, role))
})

app.get('/app/wallet', async (c) => {
  const memberNo = c.req.query('member') || ''
  const phone = c.req.query('phone') || ''
  return c.html(walletHtml(memberNo, phone))
})

app.get('/app/team-confirm', (c) => {
  const token = c.req.query('token') || ''
  return c.html(teamConfirmHtml(token))
})

// ── 申請頁 HTML ────────────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] partnerApplyHtml — pure mechanical move

// ── 團隊確認頁 HTML ────────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] teamConfirmHtml — pure mechanical move

// ── 錢包頁 HTML ────────────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage1] walletHtml — pure mechanical move


// 前台 role-holder route 走 /api/partner/*
// 公開查核 /verify/:token
// 公開影響力 /impact
// ════════════════════════════════════════════════════════════════════════════

// ── 工具：生成隨機 token（32位 hex）────────────────────────────────────────
function genToken(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// [MOVED to src/lib/revenue-utils.ts @ Wave2] sha256hex — pure mechanical move
// Note: sha256hex 本屬 Wave 1 純 leaf（原 revenue-utils 優先序 6），因 appendHashChain 依賴而於 Wave 2 提前搬。

// ── 工具：下一個 holder_no（CL000001 / CK000001）────────────────────────────
async function nextHolderNo(db: D1Database, role: 'COLEADERY' | 'COLINKERY'): Promise<string> {
  const row = await db.prepare(
    'UPDATE role_holder_counters SET next_val = next_val + 1 WHERE role = ? RETURNING next_val'
  ).bind(role).first<{ next_val: number }>()
  const n = row?.next_val ?? 1
  const prefix = role === 'COLEADERY' ? 'CL' : 'CK'
  return prefix + String(n).padStart(6, '0')
}

// ── 工具：下一個 partner_no（CP000001）──────────────────────────────────────
async function nextPartnerNo(db: D1Database): Promise<string> {
  const row = await db.prepare(
    'UPDATE co_partner_counter SET next_val = next_val + 1 WHERE id = 1 RETURNING next_val'
  ).bind().first<{ next_val: number }>()
  return 'CP' + String(row?.next_val ?? 1).padStart(6, '0')
}

// ── 工具：下一個 project_code（PRJ0001）─────────────────────────────────────
async function nextProjectCode(db: D1Database): Promise<string> {
  const row = await db.prepare(
    'UPDATE project_counter SET next_val = next_val + 1 WHERE id = 1 RETURNING next_val'
  ).bind().first<{ next_val: number }>()
  return 'PRJ' + String(row?.next_val ?? 1).padStart(4, '0')
}

// [MOVED to src/lib/revenue-utils.ts @ Wave2] appendHashChain — pure mechanical move

// ── 工具：驗證 project_shares 七方加總 = 10000 bps ──────────────────────────
function validateShares(s: Record<string, number>): boolean {
  const total = (s.pct_coleadery ?? 0) + (s.pct_colinkery ?? 0) +
    (s.pct_coownery ?? 0) + (s.pct_cosupportery ?? 0) +
    (s.pct_mutual_fund ?? 0) + (s.pct_platform_fee ?? 0) +
    (s.pct_special_account ?? 0)
  return total === 10000
}

// ── 章程標準範本預設比例（bps）──────────────────────────────────────────────
// 互助基金 1500bps (15%) + 平台費 1500bps (15%) = 3000bps 固定
// 可調整部分 = 7000bps
const SHARE_TEMPLATES: Record<string, Record<string, number>> = {
  PURE_B2C: {
    pct_coleadery: 1000, pct_colinkery: 2000, pct_coownery: 2500,
    pct_cosupportery: 1500, pct_mutual_fund: 1500, pct_platform_fee: 1500, pct_special_account: 0
  },
  B2C_TO_B2B: {
    pct_coleadery: 1000, pct_colinkery: 1000, pct_coownery: 1500,
    pct_cosupportery: 3000, pct_mutual_fund: 1500, pct_platform_fee: 1500, pct_special_account: 500
  },
  PURE_B2B: {
    pct_coleadery: 1000, pct_colinkery: 1000, pct_coownery: 0,
    pct_cosupportery: 0, pct_mutual_fund: 1500, pct_platform_fee: 1500, pct_special_account: 4000
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerRevenueRoutes(app: Hono<{ Bindings: Bindings }>) {

  // ════════════════════════════════════════════════════════════
  // 角色申請（前台，無需 admin auth）
  // ════════════════════════════════════════════════════════════

  // 會員電話號碼查詢（用於推薦人驗證）
  app.get('/api/member/lookup', async (c) => {
    const phone = c.req.query('phone')
    if (!phone) return c.json({ ok: false, error: '缺少 phone' }, 400)
    const db = c.env.DB
    const m = await db.prepare(
      'SELECT member_no, name_zh, name_en FROM members WHERE phone = ? LIMIT 1'
    ).bind(phone).first<{ member_no: string; name_zh: string; name_en: string }>()
    if (!m) return c.json({ ok: false, error: '找不到會員' })
    return c.json({ ok: true, member_no: m.member_no, name_zh: m.name_zh || '', name_en: m.name_en || '' })
  })

  // ── 查詢會員的角色申請狀態（CoLeadery / CoLinkery）──
  app.get('/api/partner/my-status', async (c) => {
    const member_no = c.req.query('member_no')
    if (!member_no) return c.json({ ok: false, coleadery: null, colinkery: null })
    const db = c.env.DB
    try {
      // 查詢最新的 COLEADERY 申請
      const clRow = await db.prepare(`
        SELECT status FROM role_applications
        WHERE member_no=? AND role='COLEADERY'
        ORDER BY created_at DESC LIMIT 1
      `).bind(member_no).first<{ status: string }>()
      // 查詢最新的 COLINKERY 申請
      const ckRow = await db.prepare(`
        SELECT status FROM role_applications
        WHERE member_no=? AND role='COLINKERY'
        ORDER BY created_at DESC LIMIT 1
      `).bind(member_no).first<{ status: string }>()
      // 同時檢查 colinkery_account_status（舊路徑）
      const memberRow = await db.prepare(`
        SELECT colinkery_account_status FROM members WHERE member_no=? LIMIT 1
      `).bind(member_no).first<{ colinkery_account_status: string }>()
      const ckLegacyApproved = memberRow?.colinkery_account_status === 'active'
      return c.json({
        ok: true,
        coleadery: clRow?.status || null,
        colinkery: ckLegacyApproved ? 'APPROVED' : (ckRow?.status || null)
      })
    } catch {
      return c.json({ ok: true, coleadery: null, colinkery: null })
    }
  })

  // 驗證是否為老有卡會員
  app.post('/api/partner/check', async (c) => {
    const { phone } = await c.req.json()
    if (!phone) return c.json({ ok: false, error: '請提供電話號碼' })
    const db = c.env.DB
    const digits = String(phone).replace(/\D/g, '')
    const m = await db.prepare(
      'SELECT member_no, name_zh, name_en, phone, tier FROM members WHERE phone = ? AND status = ? LIMIT 1'
    ).bind(digits, 'ACTIVE').first<{ member_no: string; name_zh: string; name_en: string; phone: string; tier: string }>()
    if (!m) return c.json({ ok: false, error: '找不到此電話號碼對應的老有卡會員，請確認電話號碼或先登記老有卡。' })
    // ── 55 歲資格限制（創始人 Simon Wong 91477341 豁免）──
    const FOUNDER_PHONE = '91477341'
    const isFounder = digits === FOUNDER_PHONE
    if (!isFounder) {
      const mAge = await db.prepare(
        'SELECT birth_year FROM members WHERE member_no = ? LIMIT 1'
      ).bind(m.member_no).first<{ birth_year: number | null }>()
      const currentYear = new Date().getFullYear()
      if (!mAge?.birth_year || (currentYear - mAge.birth_year) < 55) {
        return c.json({ ok: false, error: '申請資格限 55 歲或以上人士。如有疑問請聯絡 CoEldery 85。' })
      }
    }
    // 檢查是否已有申請
    const existing = await db.prepare(
      'SELECT status, role FROM role_applications WHERE member_no = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(m.member_no).first<{ status: string; role: string }>()
    // 取 member_kyc 個人正式資料（若存在）
    const kyc = await db.prepare(
      'SELECT id, id_prefix, bank_name, bank_acc_no, swift_code, email, referral_phone, referral_name, status FROM member_kyc WHERE member_no = ? LIMIT 1'
    ).bind(m.member_no).first<{ id: number; id_prefix: string; bank_name: string; bank_acc_no: string; swift_code: string; email: string; referral_phone: string; referral_name: string; status: string }>()
    return c.json({
      ok: true, member_no: m.member_no, name_zh: m.name_zh, name_en: m.name_en || '', phone: m.phone, existing,
      kyc_id: kyc?.id || null,
      kyc: kyc ? {
        id_prefix: kyc.id_prefix,
        bank_name: kyc.bank_name,
        bank_acc_no: kyc.bank_acc_no,
        swift_code: kyc.swift_code || '',
        email: kyc.email || '',
        referral_phone: kyc.referral_phone || '',
        referral_name: kyc.referral_name || '',
        status: kyc.status
      } : null
    })
  })

  // ── 提交 / 更新個人正式資料（KYC）────────────────────────────────────────────
  app.post('/api/partner/kyc', async (c) => {
    const body = await c.req.json()
    const { member_no, id_prefix, email, referral_phone, referral_name,
            bank_name, bank_acc_no, swift_code, update_only } = body
    if (!member_no) return c.json({ ok: false, error: '缺少 member_no' }, 400)
    const db = c.env.DB
    // 驗證會員存在
    const m = await db.prepare('SELECT member_no FROM members WHERE member_no = ? LIMIT 1').bind(member_no).first<{ member_no: string }>()
    if (!m) return c.json({ ok: false, error: '找不到會員' }, 404)
    // 驗證 HKID 格式（1 letter + 3 digits）
    if (id_prefix && !/^[A-Z][0-9]{3}$/.test(id_prefix))
      return c.json({ ok: false, error: '身份證號碼格式錯誤（需為1個英文字母+3位數字）' }, 400)
    // 驗證電郵
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return c.json({ ok: false, error: '電郵地址格式錯誤' }, 400)
    // 驗證推薦人（首次必填）
    const existing = await db.prepare('SELECT id FROM member_kyc WHERE member_no = ? LIMIT 1').bind(member_no).first<{ id: number }>()
    if (!existing && referral_phone) {
      const refMember = await db.prepare('SELECT member_no, name_zh FROM members WHERE phone = ? LIMIT 1').bind(referral_phone).first<{ member_no: string; name_zh: string }>()
      if (!refMember) return c.json({ ok: false, error: '找不到推薦人（電話未登記為會員）' }, 400)
    }
    if (existing) {
      // 更新：可更新銀行、email、swift（HKID 鎖定）
      if (!bank_name) return c.json({ ok: false, error: '請選擇銀行' }, 400)
      if (!bank_acc_no) return c.json({ ok: false, error: '請填寫銀行戶口號碼' }, 400)
      await db.prepare(
        'UPDATE member_kyc SET bank_name=?, bank_acc_no=?, swift_code=?, email=COALESCE(NULLIF(?,\'\'),email) WHERE member_no=?'
      ).bind(bank_name, bank_acc_no, swift_code||'', email||'', member_no).run()
    } else {
      // 首次提交：全部必填
      if (!id_prefix) return c.json({ ok: false, error: '請填寫身份證號碼首4位' }, 400)
      if (!email) return c.json({ ok: false, error: '請填寫電郵地址' }, 400)
      if (!referral_phone) return c.json({ ok: false, error: '請填寫推薦人電話' }, 400)
      if (!bank_name) return c.json({ ok: false, error: '請選擇銀行' }, 400)
      if (!bank_acc_no) return c.json({ ok: false, error: '請填寫銀行戶口號碼' }, 400)
      await db.prepare(
        'INSERT INTO member_kyc (member_no, id_prefix, email, referral_phone, referral_name, bank_name, bank_acc_no, swift_code) VALUES (?,?,?,?,?,?,?,?)'
      ).bind(member_no, id_prefix, email, referral_phone, referral_name||'', bank_name, bank_acc_no, swift_code||'').run()
    }
    return c.json({ ok: true })
  })

  // 提交申請
  app.post('/api/partner/apply', async (c) => {
    const body = await c.req.json()
    const { member_no, role, applicant_type, name_zh, name_en, id_prefix,
            id_doc_r2_key, address, phone, bank_name, bank_acc_no,
            company_name, company_br, industry_background,
            team_size, team_notes, group_members } = body
    if (!member_no || !role || !applicant_type || !name_zh)
      return c.json({ ok: false, error: '缺少必填欄位' }, 400)
    if (!['COLEADERY', 'COLINKERY'].includes(role))
      return c.json({ ok: false, error: '角色無效' }, 400)
    if (!['INDIVIDUAL', 'GROUP', 'COMPANY', 'ASSOCIATION'].includes(applicant_type))
      return c.json({ ok: false, error: '申請人類型無效' }, 400)
    const password = body.password || ''
    if (!password || password.length < 8)
      return c.json({ ok: false, error: '請設定登入密碼（至少 8 位）' }, 400)
    const db = c.env.DB
    try {
    // 必須先有 KYC 個人正式資料
    const kyc = await db.prepare('SELECT id_prefix, id_doc_r2_key, bank_name, bank_acc_no FROM member_kyc WHERE member_no = ? LIMIT 1').bind(member_no).first<{ id_prefix: string; id_doc_r2_key: string; bank_name: string; bank_acc_no: string }>()
    if (!kyc) return c.json({ ok: false, error: '請先完成第二步個人正式資料登記（身份證及銀行資料）' }, 400)
    // 雜湊密碼
    const passwordHashPending = await pbkdf2Hash(password)
    // 使用 KYC 資料（覆蓋前端傳來的值）
    const kycIdPrefix = kyc.id_prefix || id_prefix || ''
    const kycDocKey = kyc.id_doc_r2_key || id_doc_r2_key || ''
    const kycBankName = bank_name || kyc.bank_name || ''  // 前端可傳最新銀行名
    const kycBankAcc = bank_acc_no || kyc.bank_acc_no || ''
    // 允許同一會員同一角色多次申請（不同團隊），但限制同一個 PENDING 的 GROUP 申請不能完全重複
    // 不再強制每人只能有一個 PENDING（因為可以與不同夥伴組成不同團隊）
    const insertResult = await db.prepare(`
      INSERT INTO role_applications
        (member_no, role, applicant_type, name_zh, name_en, id_prefix, id_doc_r2_key,
         address, phone, bank_name, bank_acc_no, company_name, company_br,
         industry_background, team_size, team_notes, password_hash_pending)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      member_no, role, applicant_type,
      name_zh, name_en || '', kycIdPrefix, kycDocKey,
      address || '', phone || '', kycBankName, kycBankAcc,
      company_name || '', company_br || '', industry_background || '',
      team_size || null, team_notes || '', passwordHashPending
    ).run()
    const appId = insertResult.meta.last_row_id as number

    // GROUP 申請：為每位團隊成員生成邀請 token（申請人自己自動確認，不需邀請）
    const invites: { member_no: string; name_zh: string; phone: string; share_pct: number; token: string }[] = []
    if (applicant_type === 'GROUP' && Array.isArray(group_members) && group_members.length > 0) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const now = new Date().toISOString()
      for (const gm of group_members) {
        if (!gm.member_no) continue
        const isSelf = gm.member_no === member_no
        if (isSelf) {
          // 申請人自己：直接插入已確認記錄（confirmed = 1），無需邀請
          const selfToken = genToken()
          await db.prepare(`
            INSERT INTO team_invites (token, app_id, member_no, name_zh, phone, share_pct, confirmed, confirmed_at, expires_at)
            VALUES (?,?,?,?,?,?,1,?,?)
          `).bind(selfToken, appId, gm.member_no, gm.name_zh || '', gm.phone || '', gm.share_pct || 0, now, expiresAt).run()
          // 不加入 invites（不需 WA 邀請）
        } else {
          const token = genToken()
          await db.prepare(`
            INSERT INTO team_invites (token, app_id, member_no, name_zh, phone, share_pct, expires_at)
            VALUES (?,?,?,?,?,?,?)
          `).bind(token, appId, gm.member_no, gm.name_zh || '', gm.phone || '', gm.share_pct || 0, expiresAt).run()
          invites.push({ member_no: gm.member_no, name_zh: gm.name_zh || '', phone: gm.phone || '', share_pct: gm.share_pct || 0, token })
        }
      }
    }

    return c.json({ ok: true, app_id: appId, invites })
    } catch (err: any) {
      console.error('[partner/apply] DB error:', err)
      return c.json({ ok: false, error: '提交失敗：' + (err?.message || '資料庫錯誤，請重試') }, 500)
    }
  })

  // ── 查詢團隊邀請資訊（供 team-confirm 頁面用）──────────────────────────────
  app.get('/api/team-invite', async (c) => {
    const token = c.req.query('token')
    if (!token) return c.json({ ok: false, error: '缺少 token' }, 400)
    const db = c.env.DB
    const invite = await db.prepare(`
      SELECT ti.id, ti.token, ti.app_id, ti.member_no, ti.name_zh, ti.phone,
             ti.share_pct, ti.confirmed, ti.confirmed_at, ti.expires_at,
             ra.role, ra.name_zh as applicant_name
      FROM team_invites ti
      JOIN role_applications ra ON ra.id = ti.app_id
      WHERE ti.token = ? LIMIT 1
    `).bind(token).first<{
      id: number; token: string; app_id: number; member_no: string;
      name_zh: string; phone: string; share_pct: number;
      confirmed: number; confirmed_at: string | null; expires_at: string;
      role: string; applicant_name: string;
    }>()
    if (!invite) return c.json({ ok: false, error: '邀請不存在或已失效' }, 404)
    // 檢查是否過期（confirmed = 0 才檢查）
    if (invite.confirmed === 0 && new Date(invite.expires_at) < new Date()) {
      return c.json({ ok: false, error: '邀請已過期' }, 410)
    }
    return c.json({ ok: true, invite })
  })

  // ── 確認 / 拒絕團隊邀請 ────────────────────────────────────────────────────
  app.post('/api/team-confirm', async (c) => {
    const body = await c.req.json()
    const { token, phone, action } = body
    if (!token || !phone || !action) return c.json({ ok: false, error: '缺少必填欄位' }, 400)
    if (!['confirm', 'reject'].includes(action)) return c.json({ ok: false, error: '操作無效' }, 400)
    const phoneClean = String(phone).replace(/\D/g, '')
    if (phoneClean.length < 8) return c.json({ ok: false, error: '電話號碼無效' }, 400)
    const db = c.env.DB
    const invite = await db.prepare(
      'SELECT id, member_no, phone, confirmed, expires_at FROM team_invites WHERE token = ? LIMIT 1'
    ).bind(token).first<{ id: number; member_no: string; phone: string; confirmed: number; expires_at: string }>()
    if (!invite) return c.json({ ok: false, error: '邀請不存在或已失效' }, 404)
    if (invite.confirmed !== 0) return c.json({ ok: false, error: '此邀請已被處理' }, 409)
    if (new Date(invite.expires_at) < new Date()) return c.json({ ok: false, error: '邀請已過期' }, 410)
    // 驗證電話是否與邀請的成員一致
    const member = await db.prepare(
      'SELECT member_no FROM members WHERE member_no = ? AND phone = ? LIMIT 1'
    ).bind(invite.member_no, phoneClean).first<{ member_no: string }>()
    if (!member) {
      // 嘗試不含區號
      const memberByPhone = await db.prepare(
        'SELECT member_no FROM members WHERE phone = ? AND member_no = ? LIMIT 1'
      ).bind(phoneClean, invite.member_no).first<{ member_no: string }>()
      if (!memberByPhone) return c.json({ ok: false, error: '電話號碼與邀請成員不符，請確認你的登記電話' }, 403)
    }
    const confirmedVal = action === 'confirm' ? 1 : -1
    const now = new Date().toISOString()
    await db.prepare(
      'UPDATE team_invites SET confirmed = ?, confirmed_at = ? WHERE id = ?'
    ).bind(confirmedVal, now, invite.id).run()
    return c.json({ ok: true, action })
  })

  // 上傳身份證至 R2
  app.post('/api/partner/upload', async (c) => {
    if (!c.env.FILES) return c.json({ ok: false, error: '文件上傳服務未設定' }, 503)
    const form = await c.req.formData()
    const file = form.get('file') as File | null
    if (!file || !(file instanceof File)) return c.json({ ok: false, error: '請選擇文件' }, 400)
    if (file.size > 5 * 1024 * 1024) return c.json({ ok: false, error: '文件不可超過 5MB' }, 400)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const key = `partner-id/${genToken()}.${ext}`
    await c.env.FILES.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || 'image/jpeg' }
    })
    return c.json({ ok: true, key })
  })

  // 查詢申請狀態
  app.get('/api/partner/my-status', async (c) => {
    const phone = c.req.query('phone')?.replace(/\D/g, '')
    if (!phone) return c.json({ ok: false, error: '請提供電話' }, 400)
    const db = c.env.DB
    const m = await db.prepare(
      'SELECT member_no FROM members WHERE phone = ? LIMIT 1'
    ).bind(phone).first<{ member_no: string }>()
    if (!m) return c.json({ ok: false, error: '找不到會員' }, 404)
    const apps = await db.prepare(
      'SELECT role, status, created_at, reviewed_at FROM role_applications WHERE member_no = ? ORDER BY created_at DESC'
    ).bind(m.member_no).all()
    const holder = await db.prepare(
      'SELECT holder_no, role, status FROM role_holders WHERE member_no = ? ORDER BY created_at DESC'
    ).bind(m.member_no).all()
    return c.json({ ok: true, applications: apps.results, holders: holder.results })
  })

  // 我的錢包（role holder 專用，用電話驗證身份）
  // ── 查看上傳文件（R2）────────────────────────────────────────
  app.get('/api/partner/doc/:key', async (c) => {
    const rawKey = c.req.param('key')
    const key = decodeURIComponent(rawKey)
    if (!key || !key.startsWith('partner-id/')) return c.json({ error: '無效的文件路徑' }, 400)
    if (!c.env.FILES) return c.json({ error: 'R2 未設定' }, 503)
    const obj = await c.env.FILES.get(key)
    if (!obj) return c.json({ error: '文件不存在' }, 404)
    const contentType = obj.httpMetadata?.contentType || 'application/octet-stream'
    return new Response(obj.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600'
      }
    })
  })

  // ── Admin：查看文件（帶管理員身份驗證）───────────────────────
  app.get('/api/admin/doc/:key', async (c) => {
    const rawKey = c.req.param('key')
    const key = decodeURIComponent(rawKey)
    if (!key) return c.json({ error: '無效的文件路徑' }, 400)
    if (!c.env.FILES) return c.json({ error: 'R2 未設定' }, 503)
    const obj = await c.env.FILES.get(key)
    if (!obj) return c.json({ error: '文件不存在 (key: ' + key + ')' }, 404)
    const contentType = obj.httpMetadata?.contentType || 'application/octet-stream'
    return new Response(obj.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=300'
      }
    })
  })

  app.get('/api/partner/wallet', async (c) => {
    const phone = c.req.query('phone')?.replace(/\D/g, '')
    if (!phone) return c.json({ ok: false, error: '請提供電話' }, 400)
    const db = c.env.DB
    const m = await db.prepare(
      'SELECT member_no FROM members WHERE phone = ? LIMIT 1'
    ).bind(phone).first<{ member_no: string }>()
    if (!m) return c.json({ ok: false, error: '找不到會員' }, 404)
    const holders = await db.prepare(
      'SELECT holder_no, role, applicant_type, name_zh FROM role_holders WHERE member_no = ? AND status = ?'
    ).bind(m.member_no, 'ACTIVE').all<{ holder_no: string; role: string; applicant_type: string; name_zh: string }>()
    if (!holders.results.length) return c.json({ ok: false, error: '你尚未持有任何認證角色' }, 403)
    const holderNos = holders.results.map(h => h.holder_no)
    const placeholders = holderNos.map(() => '?').join(',')
    // 拉所有 wallet_entries 屬於此人
    const entries = await db.prepare(
      `SELECT w.*, p.project_code, p.name as project_name
       FROM wallet_entries w
       JOIN projects p ON p.id = w.project_id
       WHERE w.holder_no IN (${placeholders})
       ORDER BY w.created_at DESC`
    ).bind(...holderNos).all()
    // 拉此人參與的所有項目（含團隊成員資料）
    // 取此人所有 holder_no 參與的每個項目每個角色（不 GROUP BY，逐行取）
    const participantRows = await db.prepare(
      `SELECT pp.project_id, pp.role, pp.holder_no, pp.team_share_bps, pp.confirm_status,
              p.project_code, p.name as project_name, p.status as project_status, p.scenario,
              ps.pct_coleadery, ps.pct_colinkery
       FROM project_participants pp
       JOIN projects p ON p.id = pp.project_id
       LEFT JOIN project_shares ps ON ps.project_id = pp.project_id
       WHERE pp.holder_no IN (${placeholders})
       ORDER BY p.created_at DESC, pp.role`
    ).bind(...holderNos).all<any>()
    // 按 project_id 合併：同一項目的所有「我的角色」聚合成一個 myRoles 陣列
    const projectMap: Record<number, any> = {}
    for (const row of participantRows.results as any[]) {
      if (!projectMap[row.project_id]) {
        projectMap[row.project_id] = {
          project_id: row.project_id,
          project_code: row.project_code,
          project_name: row.project_name,
          project_status: row.project_status,
          scenario: row.scenario,
          pct_coleadery: row.pct_coleadery,
          pct_colinkery: row.pct_colinkery,
          confirm_status: row.confirm_status,
          myRoles: []
        }
      }
      projectMap[row.project_id].myRoles.push({
        role: row.role,
        holder_no: row.holder_no,
        team_share_bps: row.team_share_bps
      })
    }
    // ── 額外查：此人作為小組成員（team_invites.member_no）參與的項目 ──────────
    // 小組申請批准後，小組成員不在 project_participants，但在 team_invites 裡有 member_no
    // 需透過：team_invites → role_applications → role_holders → project_participants 找到項目
    const teamInviteRows = await db.prepare(`
      SELECT ti.share_pct, ti.confirmed,
             ra.role as app_role,
             pp.project_id, pp.holder_no, pp.team_share_bps, pp.confirm_status,
             p.project_code, p.name as project_name, p.status as project_status, p.scenario,
             ps.pct_coleadery, ps.pct_colinkery
      FROM team_invites ti
      JOIN role_applications ra ON ra.id = ti.app_id
      JOIN role_holders rh ON rh.member_no = ra.member_no AND rh.role = ra.role AND rh.applicant_type = 'GROUP'
      JOIN project_participants pp ON pp.holder_no = rh.holder_no
      JOIN projects p ON p.id = pp.project_id
      LEFT JOIN project_shares ps ON ps.project_id = pp.project_id
      WHERE ti.member_no = ?
        AND ra.status = 'APPROVED'
        AND ra.applicant_type = 'GROUP'
      ORDER BY p.created_at DESC
    `).bind(m.member_no).all<any>()

    for (const row of teamInviteRows.results as any[]) {
      if (!projectMap[row.project_id]) {
        // 新項目：此人只以小組成員身份參與
        projectMap[row.project_id] = {
          project_id: row.project_id,
          project_code: row.project_code,
          project_name: row.project_name,
          project_status: row.project_status,
          scenario: row.scenario,
          pct_coleadery: row.pct_coleadery,
          pct_colinkery: row.pct_colinkery,
          confirm_status: row.confirm_status,
          myRoles: []
        }
      }
      // 以小組成員身份的分成：team_share_bps（小組整體）× share_pct（本人在小組中的比例）
      const myEffectiveBps = Math.round((row.team_share_bps || 0) * (row.share_pct || 0) / 100)
      // 避免重複加入同一角色
      const alreadyHas = projectMap[row.project_id].myRoles.some((r: any) =>
        r.role === row.app_role && r.as_group_member === true
      )
      if (!alreadyHas) {
        projectMap[row.project_id].myRoles.push({
          role: row.app_role,
          holder_no: row.holder_no,
          team_share_bps: myEffectiveBps,
          as_group_member: true,   // 標記：以小組成員身份
          group_share_pct: row.share_pct
        })
      }
    }

    const participantProjects = { results: Object.values(projectMap) }
    // 每個項目：取同項目所有其他成員
    const projectIds = Object.keys(projectMap).map(Number)
    let projectTeams: Record<number, any[]> = {}
    if (projectIds.length > 0) {
      const pidPlaceholders = projectIds.map(() => '?').join(',')
      const allTeamRows = await db.prepare(
        `SELECT pp.project_id, pp.holder_no, pp.role, pp.team_share_bps, rh.name_zh, rh.applicant_type
         FROM project_participants pp
         JOIN role_holders rh ON rh.holder_no = pp.holder_no
         WHERE pp.project_id IN (${pidPlaceholders})
         ORDER BY pp.project_id, pp.role`
      ).bind(...projectIds).all<any>()
      for (const row of allTeamRows.results as any[]) {
        if (!projectTeams[row.project_id]) projectTeams[row.project_id] = []
        projectTeams[row.project_id].push(row)
      }
      // 為 GROUP holder 查詢其 team_invites 成員（含個人 share_pct）
      const groupHolderNos = (allTeamRows.results as any[])
        .filter((r: any) => r.applicant_type === 'GROUP')
        .map((r: any) => r.holder_no)
      const uniqueGroupHolders = [...new Set(groupHolderNos)]
      const groupMembersMap: Record<string, any[]> = {}
      for (const hn of uniqueGroupHolders) {
        // 只取該 holder 對應的最新 APPROVED GROUP application 的 team_invites
        const holderInfo = await db.prepare(
          'SELECT member_no, role FROM role_holders WHERE holder_no = ? LIMIT 1'
        ).bind(hn).first<{ member_no: string; role: string }>()
        if (holderInfo) {
          const latestApp = await db.prepare(`
            SELECT id FROM role_applications
            WHERE member_no = ? AND role = ? AND status = 'APPROVED' AND applicant_type = 'GROUP'
            ORDER BY id DESC LIMIT 1
          `).bind(holderInfo.member_no, holderInfo.role).first<{ id: number }>()
          if (latestApp) {
            const gm = await db.prepare(`
              SELECT ti.name_zh, ti.phone, ti.share_pct, ti.confirmed
              FROM team_invites ti
              WHERE ti.app_id = ?
              ORDER BY ti.id ASC
            `).bind(latestApp.id).all<any>()
            groupMembersMap[hn] = gm.results
          } else {
            groupMembersMap[hn] = []
          }
        }
      }
      // 把 group_members 附到 team 裡每個 GROUP 行
      for (const row of projectTeams[Object.keys(projectTeams)[0]] ? Object.values(projectTeams).flat() : []) {
        if ((row as any).applicant_type === 'GROUP') {
          (row as any).group_members = groupMembersMap[(row as any).holder_no] || []
        }
      }
    }
    // 彙整項目資料（附上 team）
    const projects = (participantProjects.results as any[]).map((pp: any) => ({
      ...pp,
      team: projectTeams[pp.project_id] || []
    }))
    // 彙總
    const summary = { total_posted: 0, total_pending_payout: 0, total_paid: 0 }
    for (const e of entries.results as any[]) {
      if (e.status === 'POSTED') summary.total_posted += e.amount_cents
      if (e.status === 'PENDING_PAYOUT') summary.total_pending_payout += e.amount_cents
      if (e.status === 'PAID') summary.total_paid += e.amount_cents
    }
    return c.json({ ok: true, holders: holders.results, entries: entries.results, summary, projects })
  })

  // 我的錢包：單項目損益明細（可見版）
  app.get('/api/partner/project/:id/statement', async (c) => {
    const phone = c.req.query('phone')?.replace(/\D/g, '')
    const projectId = parseInt(c.req.param('id'))
    if (!phone || isNaN(projectId)) return c.json({ ok: false, error: '參數錯誤' }, 400)
    const db = c.env.DB
    const m = await db.prepare('SELECT member_no FROM members WHERE phone = ? LIMIT 1').bind(phone).first<{ member_no: string }>()
    if (!m) return c.json({ ok: false, error: '找不到會員' }, 404)
    // 確認此人係此項目參與者
    const isParticipant = await db.prepare(
      `SELECT pp.id FROM project_participants pp
       JOIN role_holders rh ON rh.holder_no = pp.holder_no
       WHERE pp.project_id = ? AND rh.member_no = ? LIMIT 1`
    ).bind(projectId, m.member_no).first()
    if (!isParticipant) return c.json({ ok: false, error: '你不是此項目參與者' }, 403)
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first()
    const shares = await db.prepare('SELECT * FROM project_shares WHERE project_id = ?').bind(projectId).first()
    // 損益帳（CoPartnery 依 disclosure_level 遮蔽名稱）
    const ledger = await db.prepare(`
      SELECT l.entry_type, l.description, l.amount_cents, l.created_at,
             CASE WHEN cp.disclosure_level = 'PUBLIC' THEN cp.name
                  WHEN cp.disclosure_level = 'GENERIC' THEN '合作夥伴'
                  ELSE NULL END as partner_display
      FROM project_ledger l
      LEFT JOIN co_partners cp ON cp.id = l.co_partner_id
      WHERE l.project_id = ?
      ORDER BY l.created_at
    `).bind(projectId).all()
    const walletEntries = await db.prepare(`
      SELECT w.role_or_pool, w.amount_cents, w.status, w.paid_at, w.hash, w.created_at
      FROM wallet_entries w
      JOIN role_holders rh ON rh.holder_no = w.holder_no
      WHERE w.project_id = ? AND rh.member_no = ?
      ORDER BY w.created_at DESC
    `).bind(projectId, m.member_no).all()
    return c.json({ ok: true, project, shares, ledger: ledger.results, wallet: walletEntries.results })
  })

  // ════════════════════════════════════════════════════════════
  // 公開查核頁（授權卡 QR）
  // ════════════════════════════════════════════════════════════

  app.get('/verify/:token', async (c) => {
    const token = c.req.param('token')
    const db = c.env.DB
    const card = await db.prepare(`
      SELECT ac.*, rh.name_zh, rh.role, rh.status as holder_status
      FROM authorization_cards ac
      JOIN role_holders rh ON rh.holder_no = ac.holder_no
      WHERE ac.token = ?
    `).bind(token).first<any>()

    const now = new Date().toISOString()
    // 自動過期
    if (card && card.status === 'VALID' && card.expires_at && card.expires_at < now) {
      await db.prepare("UPDATE authorization_cards SET status = 'EXPIRED' WHERE token = ?").bind(token).run()
      if (card) card.status = 'EXPIRED'
    }

    const roleLabel = (r: string) => r === 'COLEADERY' ? '已認證領航者 CoLeadery' : '已認證連結者 CoLinkery'
    const cardTypeLabel = (t: string) => t === 'NEGOTIATION' ? '洽商授權卡' : '項目授權卡'
    const statusColor = (s: string) => s === 'VALID' ? '#2E7D32' : '#C62828'
    const statusLabel = (s: string) => s === 'VALID' ? '✅ 有效' : s === 'EXPIRED' ? '⏰ 已過期' : '❌ 已撤銷'

    // 姓氏遮蔽（只顯示姓氏）
    const surname = card ? (card.name_zh?.charAt(0) || '') + '先生/女士' : ''

    return c.html(`<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CoEldery 85 授權卡查核</title>
<style>
body{background:#F5F5F5;font-family:"Noto Serif TC",serif;margin:0;padding:20px 16px;color:#111;}
.wrap{max-width:420px;margin:0 auto;}
.header{background:linear-gradient(135deg,#8B0000,#C62828);color:#fff;padding:20px;border-radius:10px 10px 0 0;text-align:center;}
.header h1{margin:0;font-size:22px;letter-spacing:2px;}
.header p{margin:4px 0 0;font-size:14px;opacity:0.85;}
.card{background:#fff;border-radius:0 0 10px 10px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,.12);}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F0F0F0;}
.row:last-child{border-bottom:none;}
.label{font-size:14px;color:#777;}
.value{font-size:16px;font-weight:700;text-align:right;}
.status-badge{font-size:18px;font-weight:900;padding:4px 12px;border-radius:6px;}
.disclaimer{margin-top:16px;background:#FFF3E0;border:1.5px solid #FF8F00;border-radius:8px;padding:12px 14px;font-size:14px;color:#E65100;line-height:1.6;}
.invalid-box{background:#fff;border-radius:10px;padding:40px 20px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.12);}
.footer{text-align:center;margin-top:16px;font-size:13px;color:#999;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>CoEldery 85</h1>
    <p>電子授權卡查核系統</p>
  </div>
  ${!card ? `
  <div class="invalid-box">
    <div style="font-size:48px;margin-bottom:12px;">❌</div>
    <div style="font-size:20px;font-weight:900;color:#C62828;">此卡不存在或連結無效</div>
    <div style="font-size:15px;color:#666;margin-top:8px;">如有疑問請聯絡 CoEldery 85</div>
  </div>` : card.status !== 'VALID' ? `
  <div class="invalid-box">
    <div style="font-size:48px;margin-bottom:12px;">${card.status === 'EXPIRED' ? '⏰' : '❌'}</div>
    <div style="font-size:20px;font-weight:900;color:#C62828;">此卡已${card.status === 'EXPIRED' ? '過期' : '撤銷'}</div>
    <div style="font-size:15px;color:#666;margin-top:8px;">此授權卡已失效，請向持卡人索取最新授權卡。</div>
  </div>` : `
  <div class="card">
    <div class="row">
      <span class="label">持卡人</span>
      <span class="value">${surname}（${card.holder_no}）</span>
    </div>
    <div class="row">
      <span class="label">認證角色</span>
      <span class="value" style="color:#8B0000;">${roleLabel(card.role)}</span>
    </div>
    <div class="row">
      <span class="label">卡類型</span>
      <span class="value">${cardTypeLabel(card.card_type)}</span>
    </div>
    <div class="row">
      <span class="label">卡狀態</span>
      <span class="status-badge" style="color:${statusColor(card.status)}">${statusLabel(card.status)}</span>
    </div>
    ${card.expires_at ? `
    <div class="row">
      <span class="label">有效期至</span>
      <span class="value">${card.expires_at.slice(0, 10)}</span>
    </div>` : ''}
    <div class="disclaimer">
      ⚠️ <strong>重要聲明</strong>：此人僅獲授權進行洽商，<strong>無權代表公司簽約、作出財務承諾或代收款項</strong>。如有疑問請聯絡 CoEldery 85 核實。
    </div>
  </div>`}
  <div class="footer">coeldery85.com · ${new Date().toLocaleDateString('zh-HK')}</div>
</div>
</body>
</html>`)
  })

  // ════════════════════════════════════════════════════════════
  // 公開影響力頁 /impact
  // ════════════════════════════════════════════════════════════

  app.get('/impact', async (c) => {
    const db = c.env.DB
    // 匿名匯總數據
    const totalPosted = await db.prepare(
      "SELECT COALESCE(SUM(amount_cents),0) as total FROM wallet_entries WHERE status IN ('POSTED','PENDING_PAYOUT','PAID')"
    ).first<{ total: number }>()
    const totalPaid = await db.prepare(
      "SELECT COALESCE(SUM(amount_cents),0) as total FROM wallet_entries WHERE status = 'PAID'"
    ).first<{ total: number }>()
    const activeProjects = await db.prepare(
      "SELECT COUNT(*) as cnt FROM projects WHERE status IN ('ACTIVE','SETTLING','SETTLED')"
    ).first<{ cnt: number }>()
    const holderCount = await db.prepare(
      "SELECT COUNT(*) as cnt FROM role_holders WHERE status = 'ACTIVE'"
    ).first<{ cnt: number }>()
    const partnerCount = await db.prepare(
      "SELECT COUNT(*) as cnt FROM co_partners"
    ).first<{ cnt: number }>()
    // 項目列表（匿名版）
    const projects = await db.prepare(`
      SELECT p.project_code, p.name, p.scenario, p.business_type, p.status,
             COUNT(DISTINCT pp.holder_no) as participant_count,
             COALESCE(SUM(CASE WHEN w.status IN ('POSTED','PENDING_PAYOUT','PAID') THEN w.amount_cents ELSE 0 END),0) as total_returned
      FROM projects p
      LEFT JOIN project_participants pp ON pp.project_id = p.id
      LEFT JOIN wallet_entries w ON w.project_id = p.id
      WHERE p.status != 'DRAFT'
      GROUP BY p.id
      ORDER BY total_returned DESC
    `).all<any>()

    const fmt = (cents: number) => 'HK$' + (cents / 100).toLocaleString('zh-HK', { minimumFractionDigits: 0 })
    const scenarioLabel = (s: string) => ({ PURE_B2C: '純零售', B2C_TO_B2B: '零售延伸B2B', PURE_B2B: '純B2B' }[s] || s)

    return c.html(`<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CoEldery 85 · 影響力</title>
<style>
body{background:#F0EBD8;font-family:"Noto Serif TC",serif;margin:0;padding:20px 16px;color:#111;}
.wrap{max-width:480px;margin:0 auto;}
.hero{background:linear-gradient(135deg,#8B0000,#C62828);color:#fff;padding:28px 20px;border-radius:12px;text-align:center;margin-bottom:20px;}
.hero h1{margin:0 0 6px;font-size:26px;letter-spacing:3px;}
.hero p{margin:0;font-size:15px;opacity:0.85;}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;}
.stat{background:#fff;border-radius:10px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08);}
.stat-num{font-size:26px;font-weight:900;color:#8B0000;}
.stat-label{font-size:13px;color:#777;margin-top:4px;}
.section-title{font-size:18px;font-weight:900;color:#8B0000;margin:0 0 12px;border-left:4px solid #C62828;padding-left:10px;}
.project-card{background:#fff;border-radius:10px;padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);}
.project-name{font-size:17px;font-weight:700;margin-bottom:6px;}
.project-meta{font-size:13px;color:#666;display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;}
.project-stats{display:flex;justify-content:space-between;font-size:14px;}
.badge{background:#FFEBEE;color:#C62828;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;}
.disclaimer{background:#FFF8E1;border:1px solid #FFD54F;border-radius:8px;padding:12px 14px;font-size:13px;color:#795548;margin-top:16px;line-height:1.6;}
.footer{text-align:center;margin-top:20px;font-size:13px;color:#999;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <h1>老有卡 CoEldery 85</h1>
    <p>項目淨利潤 85% 回流長者社群</p>
  </div>
  <div class="stats">
    <div class="stat">
      <div class="stat-num">${fmt(totalPosted?.total ?? 0)}</div>
      <div class="stat-label">已計算回流長者社群</div>
    </div>
    <div class="stat">
      <div class="stat-num">${fmt(totalPaid?.total ?? 0)}</div>
      <div class="stat-label">已實際出款</div>
    </div>
    <div class="stat">
      <div class="stat-num">${activeProjects?.cnt ?? 0}</div>
      <div class="stat-label">進行中項目</div>
    </div>
    <div class="stat">
      <div class="stat-num">${holderCount?.cnt ?? 0}</div>
      <div class="stat-label">正享受分成人士</div>
    </div>
  </div>
  ${partnerCount?.cnt ? `<p style="text-align:center;font-size:15px;color:#555;margin-bottom:16px;">合作夥伴：<strong style="color:#8B0000;">${partnerCount.cnt}</strong> 間</p>` : ''}

  ${projects.results.length ? `
  <div class="section-title">項目一覽</div>
  ${(projects.results as any[]).map(p => `
  <div class="project-card">
    <div class="project-name">${p.name}</div>
    <div class="project-meta">
      <span class="badge">${scenarioLabel(p.scenario)}</span>
      ${p.business_type ? `<span>${p.business_type}</span>` : ''}
    </div>
    <div class="project-stats">
      <span>👥 參與 ${p.participant_count} 人</span>
      <span>💰 已回流 ${fmt(p.total_returned)}</span>
    </div>
  </div>`).join('')}` : `
  <div style="text-align:center;color:#999;padding:30px 0;font-size:16px;">項目即將上線，敬請期待</div>`}

  <div class="disclaimer">
    ⚠️ 以上數據為根據項目當前記錄之匯總，成果分享屬非保證收益，不顯示任何個人金額。實際以正式結算為準。
  </div>
  <div class="footer">coeldery85.com · ${new Date().toLocaleDateString('zh-HK')}</div>
  <div style="text-align:center;margin-top:20px;padding-bottom:20px;">
    <a href="javascript:history.back()" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:#8B0000;color:#fff;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 12px rgba(139,0,0,0.3);">← 返回</a>
  </div>
</div>
</body>
</html>`)
  })

  // ════════════════════════════════════════════════════════════
  // Admin 後台 API（/api/admin/rev/* — 自動受 middleware 保護）
  // ════════════════════════════════════════════════════════════

  // ── 角色申請：列表 ────────────────────────────────────────────
  app.get('/api/admin/rev/applications', async (c) => {
    const db = c.env.DB
    const status = c.req.query('status') || 'PENDING'
    const rows = await db.prepare(`
      SELECT ra.*, m.name_zh as member_name_zh
      FROM role_applications ra
      JOIN members m ON m.member_no = ra.member_no
      WHERE ra.status = ?
      ORDER BY ra.created_at DESC
    `).bind(status).all()
    return c.json({ ok: true, applications: rows.results })
  })

  // ── 角色申請：審批 ────────────────────────────────────────────
  app.post('/api/admin/rev/applications/:id/review', async (c) => {
    const id = parseInt(c.req.param('id'))
    const { action, review_notes } = await c.req.json()
    if (!['APPROVED', 'REJECTED'].includes(action))
      return c.json({ ok: false, error: 'action 必須為 APPROVED 或 REJECTED' }, 400)
    const db = c.env.DB
    try {
    const app_ = await db.prepare(
      'SELECT * FROM role_applications WHERE id = ?'
    ).bind(id).first<any>()
    if (!app_) return c.json({ ok: false, error: '申請不存在' }, 404)
    if (app_.status !== 'PENDING') return c.json({ ok: false, error: '此申請已處理，狀態：' + app_.status }, 409)

    await db.prepare(
      "UPDATE role_applications SET status = ?, review_notes = ?, reviewed_at = datetime('now') WHERE id = ?"
    ).bind(action, review_notes || '', id).run()

    let holder_no = null
    if (action === 'APPROVED') {
      // ── holder_no 分配邏輯 ──────────────────────────────────────
      // INDIVIDUAL / COMPANY：同一人同角色同類型只能有一個 holder，重複批准時複用
      // GROUP：每次批准都是全新小組，永遠新建新 holder_no（一人可有無限個小組）
      // ────────────────────────────────────────────────────────────
      let existingHolder: { holder_no: string } | null = null
      if (app_.applicant_type !== 'GROUP') {
        // INDIVIDUAL / COMPANY：查有無同類型的既有 holder
        existingHolder = await db.prepare(
          'SELECT holder_no FROM role_holders WHERE member_no = ? AND role = ? AND applicant_type = ? LIMIT 1'
        ).bind(app_.member_no, app_.role, app_.applicant_type).first<{ holder_no: string }>()
      }
      // GROUP 的 existingHolder 永遠是 null → 強制新建

      if (existingHolder) {
        // 複用既有 INDIVIDUAL/COMPANY holder：只更新 name（不改 applicant_type）
        holder_no = existingHolder.holder_no
        await db.prepare(`
          UPDATE role_holders SET name_zh=?, name_en=?, status='ACTIVE'
          WHERE holder_no=?
        `).bind(app_.name_zh, app_.name_en || '', holder_no).run()
      } else {
        // 新建 holder（首次 INDIVIDUAL/COMPANY，或任何 GROUP 申請）
        holder_no = await nextHolderNo(db, app_.role as 'COLEADERY' | 'COLINKERY')
        await db.prepare(`
          INSERT INTO role_holders (holder_no, member_no, role, applicant_type, name_zh, name_en)
          VALUES (?,?,?,?,?,?)
        `).bind(holder_no, app_.member_no, app_.role, app_.applicant_type, app_.name_zh, app_.name_en || '').run()

        // 每個新 holder 都發一張授權卡
        const token = genToken()
        const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        await db.prepare(`
          INSERT INTO authorization_cards (token, holder_no, card_type, expires_at)
          VALUES (?, ?, 'NEGOTIATION', ?)
        `).bind(token, holder_no, expires).run()

        const cardRow = await db.prepare('SELECT id FROM authorization_cards WHERE token = ?').bind(token).first<{ id: number }>()
        if (cardRow) {
          await appendHashChain(db, 'CARD_ISSUED', cardRow.id, `${holder_no}|${token}|${expires}`)
        }
      }

      // ── 批准後啟用對應工具帳號 ─────────────────────────────────────────────
      if (app_.role === 'COLINKERY') {
        // CoLinkery：把 password_hash_pending 複製到 password_hash，並啟用帳號
        const pwdHashPending = app_.password_hash_pending
        if (pwdHashPending) {
          await db.prepare(`
            UPDATE members SET password_hash=?, colinkery_account_status='active'
            WHERE member_no=?
          `).bind(pwdHashPending, app_.member_no).run()
        } else {
          // 沒有密碼（舊申請），只啟用帳號狀態
          await db.prepare(`
            UPDATE members SET colinkery_account_status='active'
            WHERE member_no=?
          `).bind(app_.member_no).run()
        }
      } else if (app_.role === 'COLEADERY') {
        // CoLeadery：啟用 coleadery_account_status（若欄位存在）；同時把密碼存入 members
        const pwdHashPending = app_.password_hash_pending
        if (pwdHashPending) {
          await db.prepare(`
            UPDATE members SET coleadery_password_hash=?
            WHERE member_no=?
          `).bind(pwdHashPending, app_.member_no).run().catch(() => {
            // 欄位不存在時靜默忽略
          })
        }
      }
    }
    return c.json({ ok: true, holder_no })
    } catch (err: any) {
      console.error('[review] DB error:', err)
      return c.json({ ok: false, error: '審核失敗：' + (err?.message || '資料庫錯誤') }, 500)
    }
  })

  // ── CoPartnery：建立 ──────────────────────────────────────────
  app.post('/api/admin/rev/partner', async (c) => {
    const body = await c.req.json()
    const { name, partner_type, contact, terms_notes, disclosure_level } = body
    if (!name || !partner_type) return c.json({ ok: false, error: '缺少必填欄位' }, 400)
    if (!['SUPPLIER', 'BRAND', 'RETAIL'].includes(partner_type))
      return c.json({ ok: false, error: 'partner_type 無效' }, 400)
    const db = c.env.DB
    const partner_no = await nextPartnerNo(db)
    await db.prepare(`
      INSERT INTO co_partners (partner_no, name, partner_type, contact, terms_notes, disclosure_level)
      VALUES (?,?,?,?,?,?)
    `).bind(partner_no, name, partner_type, contact || '', terms_notes || '', disclosure_level || 'GENERIC').run()
    return c.json({ ok: true, partner_no })
  })

  // ── CoPartnery：列表 ─────────────────────────────────────────
  app.get('/api/admin/rev/partners', async (c) => {
    const rows = await c.env.DB.prepare('SELECT * FROM co_partners ORDER BY created_at DESC').all()
    return c.json({ ok: true, partners: rows.results })
  })

  // ── 項目：建立 ────────────────────────────────────────────────
  app.post('/api/admin/rev/project', async (c) => {
    const body = await c.req.json()
    const { name, scenario, stage, business_type, notes,
            pct_coleadery, pct_colinkery, pct_coownery, pct_cosupportery,
            pct_mutual_fund, pct_platform_fee, pct_special_account } = body
    if (!name || !scenario) return c.json({ ok: false, error: '缺少必填欄位' }, 400)
    if (!['PURE_B2C', 'B2C_TO_B2B', 'PURE_B2B'].includes(scenario))
      return c.json({ ok: false, error: 'scenario 無效' }, 400)
    const db = c.env.DB
    // 決定分成比例（用傳入值或章程範本預設）
    const template = SHARE_TEMPLATES[scenario]
    const shares = {
      pct_coleadery:    pct_coleadery    ?? template.pct_coleadery,
      pct_colinkery:    pct_colinkery    ?? template.pct_colinkery,
      pct_coownery:     pct_coownery     ?? template.pct_coownery,
      pct_cosupportery: pct_cosupportery ?? template.pct_cosupportery,
      pct_mutual_fund:  pct_mutual_fund  ?? template.pct_mutual_fund,
      pct_platform_fee: pct_platform_fee ?? template.pct_platform_fee,
      pct_special_account: pct_special_account ?? template.pct_special_account,
    }
    // 強制驗證加總 = 10000 bps
    if (!validateShares(shares))
      return c.json({ ok: false, error: `七方比例加總必須等於 100%（目前：${Object.values(shares).reduce((a,b)=>a+b,0)/100}%）` }, 400)
    // 特殊結構標記
    const special_flag = (shares.pct_coleadery > 1000 || shares.pct_cosupportery > 4000) ? 1 : 0

    const project_code = await nextProjectCode(db)
    const proj = await db.prepare(`
      INSERT INTO projects (project_code, name, scenario, stage, business_type, notes)
      VALUES (?,?,?,?,?,?) RETURNING id
    `).bind(project_code, name, scenario, stage || 'STARTUP', business_type || '', notes || '').first<{ id: number }>()
    if (!proj) return c.json({ ok: false, error: '建立項目失敗' }, 500)

    await db.prepare(`
      INSERT INTO project_shares
        (project_id, pct_coleadery, pct_colinkery, pct_coownery, pct_cosupportery,
         pct_mutual_fund, pct_platform_fee, pct_special_account, special_flag)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).bind(
      proj.id, shares.pct_coleadery, shares.pct_colinkery, shares.pct_coownery,
      shares.pct_cosupportery, shares.pct_mutual_fund, shares.pct_platform_fee,
      shares.pct_special_account, special_flag
    ).run()

    return c.json({ ok: true, project_id: proj.id, project_code, special_flag })
  })

  // ── 項目：更新基本資料 ────────────────────────────────────────
  app.put('/api/admin/rev/project/:id', async (c) => {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const { name, stage, business_type, notes, status } = body
    const db = c.env.DB
    await db.prepare(`
      UPDATE projects SET name = COALESCE(?, name), stage = COALESCE(?, stage),
        business_type = COALESCE(?, business_type), notes = COALESCE(?, notes),
        status = COALESCE(?, status)
      WHERE id = ?
    `).bind(name || null, stage || null, business_type || null, notes || null, status || null, id).run()
    return c.json({ ok: true })
  })

  // ── 項目：更新分成比例 ────────────────────────────────────────
  app.post('/api/admin/rev/project/:id/shares', async (c) => {
    const id = parseInt(c.req.param('id'))
    const shares = await c.req.json()
    if (!validateShares(shares))
      return c.json({ ok: false, error: `七方比例加總必須等於 100%（目前：${Object.values(shares as Record<string,number>).reduce((a,b)=>a+b,0)/100}%）` }, 400)
    const special_flag = ((shares.pct_coleadery ?? 0) > 1000 || (shares.pct_cosupportery ?? 0) > 4000) ? 1 : 0
    const db = c.env.DB
    await db.prepare(`
      UPDATE project_shares SET
        pct_coleadery=?, pct_colinkery=?, pct_coownery=?, pct_cosupportery=?,
        pct_mutual_fund=?, pct_platform_fee=?, pct_special_account=?,
        special_flag=?, updated_at=datetime('now')
      WHERE project_id=?
    `).bind(
      shares.pct_coleadery, shares.pct_colinkery, shares.pct_coownery, shares.pct_cosupportery,
      shares.pct_mutual_fund, shares.pct_platform_fee, shares.pct_special_account,
      special_flag, id
    ).run()
    return c.json({ ok: true, special_flag })
  })

  // ── 項目：綁定參與者 ─────────────────────────────────────────
  // 規則：每項目只能有 1 個 CoLeadery（1:1），CoLinkery 可多個（1:N）
  app.post('/api/admin/rev/project/:id/participants', async (c) => {
    const project_id = parseInt(c.req.param('id'))
    const { holder_no, role, team_share_bps } = await c.req.json()
    if (!holder_no || !role) return c.json({ ok: false, error: '缺少必填欄位' }, 400)
    const db = c.env.DB
    // 驗證 holder 存在且角色匹配
    const holder = await db.prepare('SELECT role FROM role_holders WHERE holder_no = ? AND status = ?').bind(holder_no, 'ACTIVE').first<{ role: string }>()
    if (!holder) return c.json({ ok: false, error: '找不到此角色持有人' }, 404)
    if (holder.role !== role) return c.json({ ok: false, error: `此持有人角色為 ${holder.role}，不符合 ${role}` }, 400)
    // CoLeadery 每個項目最多一個（1:1）
    if (role === 'COLEADERY') {
      const existingCL = await db.prepare(
        "SELECT holder_no FROM project_participants WHERE project_id = ? AND role = 'COLEADERY' AND holder_no != ? LIMIT 1"
      ).bind(project_id, holder_no).first<{ holder_no: string }>()
      if (existingCL) {
        return c.json({ ok: false, error: `此項目已綁定 CoLeadery（${existingCL.holder_no}）。每項目只能有一個 CoLeadery。如需更換，請先移除現有 CoLeadery。` }, 409)
      }
    }
    // 加入（或更新）
    await db.prepare(`
      INSERT INTO project_participants (project_id, holder_no, role, team_share_bps)
      VALUES (?,?,?,?)
      ON CONFLICT(project_id, holder_no, role) DO UPDATE SET team_share_bps = excluded.team_share_bps
    `).bind(project_id, holder_no, role, team_share_bps ?? 10000).run()
    // 驗證同角色加總 = 10000
    const sum = await db.prepare(
      'SELECT COALESCE(SUM(team_share_bps),0) as total FROM project_participants WHERE project_id = ? AND role = ?'
    ).bind(project_id, role).first<{ total: number }>()
    if (sum && sum.total !== 10000)
      return c.json({ ok: true, warning: `⚠️ ${role} 團隊分帳比例加總目前為 ${sum.total / 100}%，需調整至 100%` })
    return c.json({ ok: true })
  })

  // ── 項目：綁定 CoPartnery ─────────────────────────────────────
  app.post('/api/admin/rev/project/:id/bind-partner', async (c) => {
    // CoPartnery 綁定記錄於 project_ledger（PARTNER_SETTLEMENT 類型），
    // 此 endpoint 只是驗證 partner 存在並返回資料，實際交易透過 /ledger 錄入
    const project_id = parseInt(c.req.param('id'))
    const { co_partner_id } = await c.req.json()
    const db = c.env.DB
    const partner = await db.prepare('SELECT * FROM co_partners WHERE id = ?').bind(co_partner_id).first()
    if (!partner) return c.json({ ok: false, error: '找不到此合作夥伴' }, 404)
    return c.json({ ok: true, partner })
  })

  // ── 損益：錄入單筆 ────────────────────────────────────────────
  app.post('/api/admin/rev/ledger', async (c) => {
    const body = await c.req.json()
    const { project_id, entry_type, description, amount_cents, co_partner_id } = body
    if (!project_id || !entry_type || amount_cents == null)
      return c.json({ ok: false, error: '缺少必填欄位' }, 400)
    if (!['INCOME', 'DIRECT_COST', 'PARTNER_SETTLEMENT', 'FIXED_DEDUCTION'].includes(entry_type))
      return c.json({ ok: false, error: 'entry_type 無效' }, 400)
    const db = c.env.DB
    await db.prepare(`
      INSERT INTO project_ledger (project_id, entry_type, description, amount_cents, co_partner_id)
      VALUES (?,?,?,?,?)
    `).bind(project_id, entry_type, description || '', parseInt(amount_cents), co_partner_id || null).run()
    return c.json({ ok: true })
  })

  // ── 損益：項目損益表 ─────────────────────────────────────────
  app.get('/api/admin/rev/project/:id/statement', async (c) => {
    const id = parseInt(c.req.param('id'))
    const db = c.env.DB
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first()
    if (!project) return c.json({ ok: false, error: '項目不存在' }, 404)
    const shares = await db.prepare('SELECT * FROM project_shares WHERE project_id = ?').bind(id).first()
    const ledger = await db.prepare(`
      SELECT l.*, cp.name as partner_name, cp.partner_type, cp.disclosure_level
      FROM project_ledger l
      LEFT JOIN co_partners cp ON cp.id = l.co_partner_id
      WHERE l.project_id = ?
      ORDER BY l.created_at
    `).bind(id).all()
    const participants = await db.prepare(`
      SELECT pp.*, rh.name_zh, rh.role as holder_role, rh.applicant_type
      FROM project_participants pp
      JOIN role_holders rh ON rh.holder_no = pp.holder_no
      WHERE pp.project_id = ?
      ORDER BY rh.role, pp.created_at
    `).bind(id).all()
    // 對每個 GROUP holder 取其 team_invites 成員資料
    const participantResults = participants.results as any[]
    const groupHolderNos = participantResults
      .filter((pp: any) => pp.applicant_type === 'GROUP')
      .map((pp: any) => pp.holder_no)
    let groupTeamMap: Record<string, any[]> = {}
    if (groupHolderNos.length > 0) {
      for (const hn of groupHolderNos) {
        const members = await db.prepare(`
          SELECT ti.name_zh, ti.phone, ti.share_pct, ti.confirmed, ti.member_no
          FROM team_invites ti
          JOIN role_applications ra ON ra.id = ti.app_id
          JOIN role_holders rh ON rh.member_no = ra.member_no AND rh.role = ra.role
          WHERE rh.holder_no = ?
          ORDER BY ti.share_pct DESC
        `).bind(hn).all<any>()
        groupTeamMap[hn] = members.results
      }
    }
    const walletEntries = await db.prepare(`
      SELECT w.*, rh.name_zh as holder_name
      FROM wallet_entries w
      LEFT JOIN role_holders rh ON rh.holder_no = w.holder_no
      WHERE w.project_id = ?
      ORDER BY w.created_at DESC
    `).bind(id).all()
    // 計算淨利潤
    let income = 0, costs = 0
    for (const e of ledger.results as any[]) {
      if (e.entry_type === 'INCOME') income += e.amount_cents
      else costs += e.amount_cents
    }
    const net_profit = income - costs
    // 將 team_members 附加到每個 participant
    const participantsWithTeam = participantResults.map((pp: any) => ({
      ...pp,
      team_members: groupTeamMap[pp.holder_no] || []
    }))
    return c.json({
      ok: true, project, shares, ledger: ledger.results,
      participants: participantsWithTeam, wallet: walletEntries.results,
      summary: { income, costs, net_profit }
    })
  })

  // ── 觸發結算 ──────────────────────────────────────────────────
  app.post('/api/admin/rev/project/:id/settle', async (c) => {
    const id = parseInt(c.req.param('id'))
    const db = c.env.DB
    const project = await db.prepare("SELECT * FROM projects WHERE id = ? AND status = 'ACTIVE'").bind(id).first<any>()
    if (!project) return c.json({ ok: false, error: '項目不存在或狀態非 ACTIVE' }, 404)
    const shares = await db.prepare('SELECT * FROM project_shares WHERE project_id = ?').bind(id).first<any>()
    if (!shares) return c.json({ ok: false, error: '此項目尚未設定分成比例' }, 400)
    // 計算淨利潤
    const ledger = await db.prepare('SELECT entry_type, amount_cents FROM project_ledger WHERE project_id = ?').bind(id).all<{ entry_type: string; amount_cents: number }>()
    let income = 0, costs = 0
    for (const e of ledger.results) {
      if (e.entry_type === 'INCOME') income += e.amount_cents
      else costs += e.amount_cents
    }
    const net_profit = income - costs
    if (net_profit <= 0) return c.json({ ok: false, error: `淨利潤為 ${net_profit / 100} HKD，無法結算` }, 400)

    // 取各角色參與者
    const participants = await db.prepare(
      "SELECT * FROM project_participants WHERE project_id = ? AND confirm_status = 'CONFIRMED'"
    ).bind(id).all<any>()

    const entries: any[] = []

    // CoLeadery 份額 → 按 team_share_bps 拆分
    const leaderAmount = Math.floor(net_profit * shares.pct_coleadery / 10000)
    const leaders = participants.results.filter((p: any) => p.role === 'COLEADERY')
    for (const p of leaders) {
      const amt = Math.floor(leaderAmount * p.team_share_bps / 10000)
      if (amt > 0) entries.push({ holder_no: p.holder_no, role_or_pool: 'COLEADERY', amount_cents: amt, status: 'POSTED' })
    }

    // CoLinkery 份額 → 按 team_share_bps 拆分
    const linkerAmount = Math.floor(net_profit * shares.pct_colinkery / 10000)
    const linkers = participants.results.filter((p: any) => p.role === 'COLINKERY')
    for (const p of linkers) {
      const amt = Math.floor(linkerAmount * p.team_share_bps / 10000)
      if (amt > 0) entries.push({ holder_no: p.holder_no, role_or_pool: 'COLINKERY', amount_cents: amt, status: 'POSTED' })
    }

    // 各池（已預留未分配）
    const pools: Array<{ key: keyof typeof shares; pool: string }> = [
      { key: 'pct_coownery',      pool: 'COOWNERY_POOL' },
      { key: 'pct_cosupportery',  pool: 'COSUPPORTERY_POOL' },
      { key: 'pct_mutual_fund',   pool: 'MUTUAL_FUND' },
      { key: 'pct_platform_fee',  pool: 'PLATFORM_FEE' },
      { key: 'pct_special_account', pool: 'SPECIAL_ACCOUNT' },
    ]
    for (const { key, pool } of pools) {
      const amt = Math.floor(net_profit * (shares[key] as number) / 10000)
      if (amt > 0) entries.push({ holder_no: null, role_or_pool: pool, amount_cents: amt, status: 'RESERVED' })
    }

    // 批次寫入 wallet_entries + 哈希鏈
    for (const e of entries) {
      const row = await db.prepare(`
        INSERT INTO wallet_entries (project_id, holder_no, role_or_pool, amount_cents, status)
        VALUES (?,?,?,?,?) RETURNING id
      `).bind(id, e.holder_no, e.role_or_pool, e.amount_cents, e.status).first<{ id: number }>()
      if (row) {
        const hash = await appendHashChain(db, 'SETTLEMENT', row.id,
          `${id}|${e.holder_no ?? 'pool'}|${e.role_or_pool}|${e.amount_cents}`)
        await db.prepare('UPDATE wallet_entries SET hash = ? WHERE id = ?').bind(hash, row.id).run()
      }
    }

    // 更新項目狀態
    await db.prepare("UPDATE projects SET status = 'SETTLING' WHERE id = ?").bind(id).run()

    return c.json({ ok: true, net_profit, entries_created: entries.length, entries })
  })

  // ── 出款狀態推進（批次支援）────────────────────────────────────
  app.post('/api/admin/rev/wallet/status', async (c) => {
    const { ids, new_status, paid_at } = await c.req.json()
    if (!Array.isArray(ids) || !ids.length || !new_status)
      return c.json({ ok: false, error: '缺少必填欄位' }, 400)
    const validStatuses = ['POSTED', 'PENDING_PAYOUT', 'PAID']
    if (!validStatuses.includes(new_status)) return c.json({ ok: false, error: 'new_status 無效' }, 400)
    const db = c.env.DB
    const paidAtVal = new_status === 'PAID' ? (paid_at || new Date().toISOString()) : null
    for (const wid of ids) {
      await db.prepare(
        'UPDATE wallet_entries SET status = ?, paid_at = COALESCE(?, paid_at) WHERE id = ?'
      ).bind(new_status, paidAtVal, wid).run()
      const rec_type = new_status === 'POSTED' ? 'WALLET_POSTED' : new_status === 'PENDING_PAYOUT' ? 'WALLET_PAYOUT' : 'WALLET_PAID'
      await appendHashChain(db, rec_type, wid, `${wid}|${new_status}|${paidAtVal ?? ''}`)
    }
    return c.json({ ok: true, updated: ids.length })
  })

  // ── 授權卡：撤銷 ─────────────────────────────────────────────
  app.post('/api/admin/rev/card/:id/revoke', async (c) => {
    const id = parseInt(c.req.param('id'))
    const db = c.env.DB
    await db.prepare("UPDATE authorization_cards SET status = 'REVOKED' WHERE id = ?").bind(id).run()
    await appendHashChain(db, 'CARD_REVOKED', id, `${id}|REVOKED`)
    return c.json({ ok: true })
  })

  // ── 授權卡：列表（按 holder）────────────────────────────────────
  app.get('/api/admin/rev/cards', async (c) => {
    const holder_no = c.req.query('holder_no')
    const db = c.env.DB
    const rows = holder_no
      ? await db.prepare('SELECT * FROM authorization_cards WHERE holder_no = ? ORDER BY created_at DESC').bind(holder_no).all()
      : await db.prepare('SELECT ac.*, rh.name_zh FROM authorization_cards ac JOIN role_holders rh ON rh.holder_no = ac.holder_no ORDER BY ac.created_at DESC LIMIT 100').all()
    return c.json({ ok: true, cards: rows.results })
  })

  // ── Admin 儀表板 ──────────────────────────────────────────────
  app.get('/api/admin/rev/dashboard', async (c) => {
    const db = c.env.DB
    const [totalPosted, totalPaid, activeProjects, holderCount, partnerCount,
           pendingApplications, byRole, topProjects] = await Promise.all([
      db.prepare("SELECT COALESCE(SUM(amount_cents),0) as v FROM wallet_entries WHERE status IN ('POSTED','PENDING_PAYOUT','PAID')").first<{v:number}>(),
      db.prepare("SELECT COALESCE(SUM(amount_cents),0) as v FROM wallet_entries WHERE status='PAID'").first<{v:number}>(),
      db.prepare("SELECT COUNT(*) as v FROM projects WHERE status IN ('ACTIVE','SETTLING','SETTLED')").first<{v:number}>(),
      db.prepare("SELECT COUNT(*) as v FROM role_holders WHERE status='ACTIVE'").first<{v:number}>(),
      db.prepare('SELECT COUNT(*) as v FROM co_partners').first<{v:number}>(),
      db.prepare("SELECT COUNT(*) as v FROM role_applications WHERE status='PENDING'").first<{v:number}>(),
      db.prepare(`
        SELECT rh.role, COUNT(DISTINCT rh.id) as holders,
               COALESCE(SUM(CASE WHEN we.status IN ('POSTED','PENDING_PAYOUT','PAID') THEN we.amount_cents ELSE 0 END),0) as total_cents
        FROM role_holders rh
        LEFT JOIN wallet_entries we ON we.holder_no = rh.holder_no
        WHERE rh.status='ACTIVE'
        GROUP BY rh.role
      `).all(),
      db.prepare(`
        SELECT p.project_code, p.name, p.status,
               COUNT(DISTINCT pp.holder_no) as participants,
               COALESCE(SUM(CASE WHEN we.status IN ('POSTED','PENDING_PAYOUT','PAID') THEN we.amount_cents ELSE 0 END),0) as returned_cents
        FROM projects p
        LEFT JOIN project_participants pp ON pp.project_id = p.id
        LEFT JOIN wallet_entries we ON we.project_id = p.id
        GROUP BY p.id
        ORDER BY returned_cents DESC
        LIMIT 10
      `).all(),
    ])
    return c.json({
      ok: true,
      overview: {
        total_returned_cents: totalPosted?.v ?? 0,
        total_paid_cents: totalPaid?.v ?? 0,
        active_projects: activeProjects?.v ?? 0,
        holder_count: holderCount?.v ?? 0,
        partner_count: partnerCount?.v ?? 0,
        pending_applications: pendingApplications?.v ?? 0,
      },
      by_role: byRole.results,
      top_projects: topProjects.results,
    })
  })

  // ── 項目列表 ─────────────────────────────────────────────────
  app.get('/api/admin/rev/projects', async (c) => {
    const db = c.env.DB
    const status = c.req.query('status')
    const rows = status
      ? await db.prepare('SELECT p.*, ps.pct_coleadery, ps.pct_colinkery, ps.special_flag FROM projects p LEFT JOIN project_shares ps ON ps.project_id = p.id WHERE p.status = ? ORDER BY p.created_at DESC').bind(status).all()
      : await db.prepare('SELECT p.*, ps.pct_coleadery, ps.pct_colinkery, ps.special_flag FROM projects p LEFT JOIN project_shares ps ON ps.project_id = p.id ORDER BY p.created_at DESC').all()
    return c.json({ ok: true, projects: rows.results })
  })

  // ── role_holders 列表（含申請資料 + 項目參與）─────────────────
  app.get('/api/admin/rev/holders', async (c) => {
    const role = c.req.query('role')
    const db = c.env.DB
    // 用 subquery 取最新 APPROVED application，避免多筆 APPROVED 導致重複行
    const baseQuery = `
          SELECT rh.*,
                 ra.id_prefix, ra.bank_name, ra.bank_acc_no, ra.phone as app_phone,
                 ra.applicant_type as app_type, ra.name_en as app_name_en,
                 ra.address, ra.company_name, ra.team_size, ra.team_notes,
                 m.phone as member_phone, m.name_zh as member_name_zh,
                 (SELECT COUNT(*) FROM project_participants pp WHERE pp.holder_no = rh.holder_no) as project_count
          FROM role_holders rh
          LEFT JOIN role_applications ra ON ra.id = (
            SELECT id FROM role_applications
            WHERE member_no = rh.member_no AND role = rh.role AND status = 'APPROVED'
            ORDER BY id DESC LIMIT 1
          )
          LEFT JOIN members m ON m.member_no = rh.member_no`
    const rows = role
      ? await db.prepare(baseQuery + ` WHERE rh.role = ? ORDER BY rh.created_at DESC`).bind(role).all()
      : await db.prepare(baseQuery + ` ORDER BY rh.created_at DESC`).all()
    return c.json({ ok: true, holders: rows.results })
  })

  // ── role_holders：取單一 holder 的項目參與詳情 ────────────────
  app.get('/api/admin/rev/holder/:holderNo/projects', async (c) => {
    const holderNo = c.req.param('holderNo')
    const db = c.env.DB
    const projects = await db.prepare(`
      SELECT pp.*, p.project_code, p.name as project_name, p.status as project_status,
             p.scenario, ps.pct_coleadery, ps.pct_colinkery,
             COALESCE((
               SELECT SUM(w.amount_cents) FROM wallet_entries w
               WHERE w.holder_no = pp.holder_no AND w.project_id = pp.project_id
               AND w.status IN ('POSTED','PENDING_PAYOUT','PAID')
             ), 0) as earned_cents
      FROM project_participants pp
      JOIN projects p ON p.id = pp.project_id
      LEFT JOIN project_shares ps ON ps.project_id = pp.project_id
      WHERE pp.holder_no = ?
      ORDER BY p.created_at DESC
    `).bind(holderNo).all()
    // Also get GROUP team members — only from the latest APPROVED GROUP application for this holder
    // Must join via role_holders to find member_no/role, then pick ONLY the latest APPROVED GROUP app
    const holderRow = await db.prepare(
      'SELECT member_no, role FROM role_holders WHERE holder_no = ? LIMIT 1'
    ).bind(holderNo).first<{ member_no: string; role: string }>()

    let teamMembers: any[] = []
    if (holderRow) {
      // Find the latest APPROVED GROUP application for this holder
      const latestGroupApp = await db.prepare(`
        SELECT id FROM role_applications
        WHERE member_no = ? AND role = ? AND status = 'APPROVED' AND applicant_type = 'GROUP'
        ORDER BY id DESC LIMIT 1
      `).bind(holderRow.member_no, holderRow.role).first<{ id: number }>()

      if (latestGroupApp) {
        const rows = await db.prepare(`
          SELECT ti.name_zh, ti.phone, ti.share_pct, ti.confirmed, ti.confirmed_at
          FROM team_invites ti
          WHERE ti.app_id = ?
          ORDER BY ti.id ASC
        `).bind(latestGroupApp.id).all()
        teamMembers = rows.results
      }
    }
    return c.json({ ok: true, projects: projects.results, team_members: teamMembers })
  })

  // ── 項目分成比例更新（互助基金15%+平台費15%鎖定）────────────────
  app.patch('/api/admin/rev/project/:id/shares', async (c) => {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const db = c.env.DB
    const existing = await db.prepare('SELECT * FROM project_shares WHERE project_id = ?').bind(id).first<any>()
    if (!existing) return c.json({ ok: false, error: '此項目尚未設定分成比例' }, 404)
    // 互助基金 1500bps (15%) 和平台費 1500bps (15%) 為固定值，不得修改
    const pct_coleadery    = typeof body.pct_coleadery    === 'number' ? Math.round(body.pct_coleadery * 100)    : existing.pct_coleadery
    const pct_colinkery    = typeof body.pct_colinkery    === 'number' ? Math.round(body.pct_colinkery * 100)    : existing.pct_colinkery
    const pct_coownery     = typeof body.pct_coownery     === 'number' ? Math.round(body.pct_coownery * 100)     : existing.pct_coownery
    const pct_cosupportery = typeof body.pct_cosupportery === 'number' ? Math.round(body.pct_cosupportery * 100) : existing.pct_cosupportery
    const pct_special_account = typeof body.pct_special_account === 'number' ? Math.round(body.pct_special_account * 100) : existing.pct_special_account
    const pct_mutual_fund  = 1500  // 固定 15%
    const pct_platform_fee = 1500  // 固定 15%
    const shares = { pct_coleadery, pct_colinkery, pct_coownery, pct_cosupportery,
                     pct_mutual_fund, pct_platform_fee, pct_special_account }
    if (!validateShares(shares))
      return c.json({ ok: false, error: `七方比例加總必須等於 100%（目前：${Object.values(shares).reduce((a,b)=>a+b,0)/100}%）` }, 400)
    await db.prepare(`
      UPDATE project_shares SET
        pct_coleadery=?, pct_colinkery=?, pct_coownery=?, pct_cosupportery=?,
        pct_mutual_fund=1500, pct_platform_fee=1500, pct_special_account=?,
        updated_at=DATETIME('now')
      WHERE project_id=?
    `).bind(pct_coleadery, pct_colinkery, pct_coownery, pct_cosupportery, pct_special_account, id).run()
    return c.json({ ok: true })
  })

}

// ── 呼叫 registerRevenueRoutes ──────────────────────────────────
registerRevenueRoutes(app)

// ═══════════════════════════════════════════════════════════════════════════════
// CoLinkery PWA — 後端 API 及前端頁面
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PBKDF2 工具函數 ──────────────────────────────────────────────────────────
async function pbkdf2Hash(password: string): Promise<string> {
  const iter = 100000
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const hashArr = new Uint8Array(bits)
  const saltB64 = btoa(String.fromCharCode(...salt))
  const hashB64 = btoa(String.fromCharCode(...hashArr))
  return `pbkdf2$${iter}$${saltB64}$${hashB64}`
}

async function pbkdf2Verify(password: string, stored: string): Promise<boolean> {
  try {
    const [, iterStr, saltB64, hashB64] = stored.split('$')
    const iter = parseInt(iterStr, 10)
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
    const expectedHash = Uint8Array.from(atob(hashB64), c => c.charCodeAt(0))
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
      keyMaterial, 256
    )
    const derived = new Uint8Array(bits)
    if (derived.length !== expectedHash.length) return false
    let diff = 0
    for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expectedHash[i]
    return diff === 0
  } catch { return false }
}

// ─── CoLinkery Session Helpers ────────────────────────────────────────────────
function makeCsrpnToken(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// [MOVED to src/lib/colinkery-auth.ts @ Wave2] verifyColinkerySess — pure mechanical move

// [MOVED to src/lib/colinkery-auth.ts @ Wave2] requireColinkery — pure mechanical move

// ─── CoLinkery 申請 ───────────────────────────────────────────────────────────
app.post('/api/colinkery/apply', async (c) => {
  const db = c.env.DB
  const contentType = c.req.header('content-type') || ''
  let phone = '', name_zh = '', applicant_type = '', password = '', bank_info = '', agree_terms = ''
  let docFile: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await c.req.formData()
    phone = (form.get('phone') as string || '').trim()
    name_zh = (form.get('name_zh') as string || '').trim()
    applicant_type = (form.get('applicant_type') as string || '').toUpperCase()
    password = (form.get('password') as string || '')
    bank_info = (form.get('bank_info') as string || '').trim()
    agree_terms = (form.get('agree_terms') as string || '')
    docFile = form.get('doc_file') as File | null
  } else {
    const body = await c.req.json<any>()
    phone = (body.phone || '').trim()
    name_zh = (body.name_zh || '').trim()
    applicant_type = (body.applicant_type || '').toUpperCase()
    password = body.password || ''
    bank_info = (body.bank_info || '').trim()
    agree_terms = body.agree_terms ? 'on' : ''
  }

  if (!phone || !name_zh || !applicant_type || !password)
    return c.json({ ok: false, error: '請填寫所有必填欄位' }, 400)
  if (!['INDIVIDUAL', 'GROUP', 'COMPANY', 'ASSOCIATION'].includes(applicant_type))
    return c.json({ ok: false, error: '申請身份類型無效' }, 400)
  if (password.length < 8)
    return c.json({ ok: false, error: '密碼最少 8 位' }, 400)
  if (agree_terms !== 'on' && agree_terms !== 'true' && agree_terms !== '1')
    return c.json({ ok: false, error: '請同意合作條款' }, 400)

  // 找成員
  const member = await db.prepare(`SELECT member_no, name_zh, colinkery_account_status FROM members WHERE phone=?`).bind(phone).first<{ member_no: string; name_zh: string; colinkery_account_status: string | null }>()
  if (!member) return c.json({ ok: false, error: '電話號碼未登記為會員，請先加入老有聯盟85' }, 400)

  // 檢查有否已有進行中申請
  const existApp = await db.prepare(
    `SELECT id FROM role_applications WHERE member_no=? AND role='COLINKERY' AND status='PENDING'`
  ).bind(member.member_no).first()
  if (existApp) return c.json({ ok: false, error: '你已有進行中的 CoLinkery 申請' }, 400)

  if (member.colinkery_account_status === 'active')
    return c.json({ ok: false, error: '你已是 CoLinkery 連結者' }, 400)

  // 上傳文件到 R2
  let docR2Key = ''
  if (docFile && c.env.FILES) {
    docR2Key = `colinkery-docs/${member.member_no}/${Date.now()}_${docFile.name || 'doc'}`
    await c.env.FILES.put(docR2Key, await docFile.arrayBuffer(), { httpMetadata: { contentType: docFile.type || 'application/octet-stream' } })
  }

  // Hash password
  const passwordHashPending = await pbkdf2Hash(password)

  // 取下一個 CL 號碼
  let holderNo = ''
  try {
    const counterRow = await db.prepare(`UPDATE role_counters SET next_val=next_val+1 WHERE role='COLINKERY' RETURNING next_val`).first<{ next_val: number }>()
    if (counterRow) holderNo = 'CK' + String(counterRow.next_val).padStart(6, '0')
  } catch { /* counter may not exist yet */ }

  await db.prepare(`
    INSERT INTO role_applications (member_no, role, applicant_type, name_zh, notes, status, review_notes, password_hash_pending)
    VALUES (?, 'COLINKERY', ?, ?, ?, 'PENDING', '', ?)
  `).bind(member.member_no, applicant_type, name_zh, `銀行/收款: ${bank_info}; 文件: ${docR2Key}`, passwordHashPending).run()

  // 更新 colinkery_account_status → password_pending
  await db.prepare(`UPDATE members SET colinkery_account_status='password_pending' WHERE member_no=?`).bind(member.member_no).run()

  return c.json({ ok: true, message: '申請已收到，審核約需 3-5 個工作天，批准後可用你設定的密碼登入' })
})

// ─── CoLinkery 登入 ───────────────────────────────────────────────────────────
app.post('/api/colinkery/login', async (c) => {
  const { phone, password } = await c.req.json<{ phone: string; password: string }>()
  if (!phone || !password) return c.json({ ok: false, error: '請輸入電話及密碼' }, 400)

  const db = c.env.DB
  const member = await db.prepare(
    `SELECT member_no, name_zh, colinkery_account_status, password_hash FROM members WHERE phone=?`
  ).bind(phone.trim()).first<{ member_no: string; name_zh: string; colinkery_account_status: string | null; password_hash: string | null }>()

  if (!member) return c.json({ ok: false, error: '電話或密碼不正確' }, 401)

  if (member.colinkery_account_status === 'password_pending')
    return c.json({ ok: false, error: '帳戶審核中，請耐心等候 3-5 個工作天' }, 403)

  if (member.colinkery_account_status !== 'active')
    return c.json({ ok: false, error: '電話或密碼不正確' }, 401)

  if (!member.password_hash) return c.json({ ok: false, error: '電話或密碼不正確' }, 401)

  const valid = await pbkdf2Verify(password, member.password_hash)
  if (!valid) return c.json({ ok: false, error: '電話或密碼不正確' }, 401)

  const token = makeCsrpnToken(32)
  const expiresAt = sessionExpiry(30 * 24)  // 30-day persistent session
  await db.prepare(`INSERT INTO colinkery_sessions (token, member_no, expires_at) VALUES (?,?,?)`).bind(token, member.member_no, expiresAt).run()

  setCookie(c, 'colinkery_session', token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 30 * 24 * 3600 })
  return c.json({ ok: true, member_no: member.member_no, name_zh: member.name_zh })
})

// ─── CoLinkery 登出 ───────────────────────────────────────────────────────────
app.post('/api/colinkery/logout', async (c) => {
  const token = getCookie(c, 'colinkery_session')
  if (token) await c.env.DB.prepare(`DELETE FROM colinkery_sessions WHERE token=?`).bind(token).run()
  deleteCookie(c, 'colinkery_session', { path: '/' })
  return c.json({ ok: true })
})

// ─── CoLinkery 狀態查詢 ───────────────────────────────────────────────────────
app.get('/api/colinkery/my-status', async (c) => {
  const phone = c.req.query('phone')
  if (!phone) return c.json({ ok: false, error: '請提供電話' }, 400)
  const db = c.env.DB
  const member = await db.prepare(
    `SELECT member_no, name_zh, colinkery_account_status FROM members WHERE phone=?`
  ).bind(phone.trim()).first<{ member_no: string; name_zh: string; colinkery_account_status: string | null }>()
  if (!member) return c.json({ ok: false, error: '電話號碼未登記' }, 404)

  const app2 = await db.prepare(
    `SELECT applicant_type, status, review_notes, created_at FROM role_applications WHERE member_no=? AND role='COLINKERY' ORDER BY created_at DESC LIMIT 1`
  ).bind(member.member_no).first<{ applicant_type: string; status: string; review_notes: string; created_at: string }>()

  return c.json({ ok: true, colinkery_account_status: member.colinkery_account_status || 'none', application: app2 || null, name_zh: member.name_zh })
})

// ─── CoLinkery 忘記密碼（生成 OTP，Admin 待發）─────────────────────────────
app.post('/api/colinkery/forgot-password', async (c) => {
  const { phone } = await c.req.json<{ phone: string }>()
  if (!phone) return c.json({ ok: false, error: '請輸入電話' }, 400)
  const db = c.env.DB
  const member = await db.prepare(
    `SELECT member_no, name_zh FROM members WHERE phone=? AND colinkery_account_status='active'`
  ).bind(phone.trim()).first<{ member_no: string; name_zh: string }>()
  if (!member) return c.json({ ok: false, error: '電話號碼不存在或帳戶未啟用' }, 404)

  // 生成 6 位 OTP
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  const otp = String(((arr[0] << 16) | (arr[1] << 8) | arr[2]) % 1000000).padStart(6, '0')
  const otpId = makeCsrpnToken(16)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)

  await db.prepare(
    `INSERT INTO colinkery_otp (otp_id, member_no, otp_code, purpose, expires_at) VALUES (?,?,?,'reset_password',?)`
  ).bind(otpId, member.member_no, otp, expiresAt).run()

  return c.json({ ok: true, message: '重設碼將由職員以 WhatsApp 發送給你，請稍候（約 15 分鐘內）' })
})

// ─── CoLinkery 重設密碼 ───────────────────────────────────────────────────────
app.post('/api/colinkery/reset-password', async (c) => {
  const { phone, otp_code, new_password } = await c.req.json<{ phone: string; otp_code: string; new_password: string }>()
  if (!phone || !otp_code || !new_password) return c.json({ ok: false, error: '請填寫所有欄位' }, 400)
  if (new_password.length < 8) return c.json({ ok: false, error: '密碼最少 8 位' }, 400)
  const db = c.env.DB

  const member = await db.prepare(`SELECT member_no FROM members WHERE phone=? AND colinkery_account_status='active'`).bind(phone.trim()).first<{ member_no: string }>()
  if (!member) return c.json({ ok: false, error: '電話號碼不存在或帳戶未啟用' }, 404)

  const otpRow = await db.prepare(
    `SELECT otp_id FROM colinkery_otp WHERE member_no=? AND otp_code=? AND purpose='reset_password' AND used=0 AND expires_at > datetime('now')`
  ).bind(member.member_no, otp_code.trim()).first<{ otp_id: string }>()
  if (!otpRow) return c.json({ ok: false, error: '重設碼無效或已過期，請重新申請' }, 400)

  const newHash = await pbkdf2Hash(new_password)
  await db.prepare(`UPDATE members SET password_hash=? WHERE member_no=?`).bind(newHash, member.member_no).run()
  await db.prepare(`UPDATE colinkery_otp SET used=1 WHERE otp_id=?`).bind(otpRow.otp_id).run()

  return c.json({ ok: true, message: '密碼已更新，請用新密碼登入' })
})

// ─── OCR API Key Debug (admin only — checks if key works with a simple text request) ───
app.get('/api/colinkery/ocr-test', requireColinkery(), async (c) => {
  const apiKey = c.env.OPENROUTER_API_KEY
  if (!apiKey) return c.json({ ok: false, error: 'OPENROUTER_API_KEY not set in env' })
  const keyPrefix = apiKey.substring(0, 20) + '...'
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'CoLinkery OCR Test',
        'HTTP-Referer': 'https://coeldery85.com'
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Say "OK" only.' }]
      })
    })
    const data = await resp.json() as any
    return c.json({ ok: true, key_prefix: keyPrefix, http_status: resp.status, response: data })
  } catch(err: any) {
    return c.json({ ok: false, key_prefix: keyPrefix, error: err?.message })
  }
})

// ─── 名片 OCR ─────────────────────────────────────────────────────────────────
app.post('/api/colinkery/cards/ocr', requireColinkery(), async (c) => {
  const db = c.env.DB
  const memberNo = c.get('clMemberNo') as string
  let r2Key = ''
  try {
  const form = await c.req.formData()
  const imgFile = form.get('image') as File | null
  if (!imgFile) return c.json({ ok: false, error: '請上傳名片圖片' }, 400)

  // 存入 R2
  r2Key = `b2b-cards/${memberNo}/${Date.now()}_${imgFile.name || 'card.jpg'}`
  const imgArrayBuffer = await imgFile.arrayBuffer()
  if (c.env.FILES) {
    await c.env.FILES.put(r2Key, imgArrayBuffer.slice(0), { httpMetadata: { contentType: imgFile.type || 'image/jpeg' } })
  }

  // OCR via OpenRouter — free model: nvidia/nemotron-nano-12b-v2-vl:free
  // Fallback: google/gemma-3-27b-it:free
  const apiKey = c.env.OPENROUTER_API_KEY
  if (!apiKey) return c.json({ ok: true, r2_key: r2Key, ocr_failed: true, parsed: {}, debug: ['OPENROUTER_API_KEY not set'] })

  // Convert to base64 safely (btoa spread fails on large images in Workers — use chunked approach)
  const uint8 = new Uint8Array(imgArrayBuffer)
  let base64 = ''
  const CHUNK = 8192
  for (let i = 0; i < uint8.length; i += CHUNK) {
    base64 += String.fromCharCode(...uint8.subarray(i, i + CHUNK))
  }
  base64 = btoa(base64)
  const mimeType = imgFile.type || 'image/jpeg'
  const dataUrl = `data:${mimeType};base64,${base64}`

  const prompt = `You are a business card OCR specialist. Extract ALL text from this business card image with maximum detail.
Return ONLY a raw JSON object (no markdown, no code fences, no explanation) with these EXACT fields:
{
  "name_zh": "Person's Chinese full name only (e.g. 陳大文). Empty string if not present.",
  "name_en": "Person's English full name only (e.g. David Chan). Empty string if not present.",
  "company_zh": "Company/organisation Chinese name only (e.g. 大中華有限公司). Empty string if not present.",
  "company_en": "Company/organisation English name only (e.g. Greater China Ltd). Empty string if not present.",
  "department_zh": "Department or division in Chinese (e.g. 市場部). Empty string if not present.",
  "department_en": "Department or division in English (e.g. Marketing Department). Empty string if not present.",
  "title_zh": "Job title in Chinese (e.g. 總經理). Empty string if not present.",
  "title_en": "Job title in English (e.g. General Manager). Empty string if not present.",
  "phone": "Office or direct landline phone number(s). Comma-separate if multiple.",
  "mobile": "Mobile or cell phone number(s). Comma-separate if multiple.",
  "fax": "Fax number if present. Empty string if not present.",
  "email": "Email address. Comma-separate if multiple.",
  "website": "Website URL (e.g. www.example.com). Empty string if not present.",
  "address_zh": "Full address in Chinese. Empty string if not present.",
  "address_en": "Full address in English. Empty string if not present.",
  "wechat": "WeChat ID if present. Empty string if not present.",
  "whatsapp": "WhatsApp number if explicitly labelled. Empty string if not present.",
  "linkedin": "LinkedIn URL or username if present. Empty string if not present.",
  "telegram": "Telegram handle if present. Empty string if not present.",
  "industry_en": "Inferred industry in English (e.g. Retail, F&B, Manufacturing, Finance, Real Estate, Technology, Healthcare, Logistics, Education, Hospitality, etc.)",
  "industry_zh": "Same inferred industry in Chinese (e.g. 零售, 飲食, 製造, 金融, 地產, 科技, 醫療, 物流, 教育, 酒店等)"
}
RULES:
- Use empty string "" for any missing field — never use null.
- Keep Chinese text in Chinese fields, English text in English fields.
- If a field has both languages on the card, split them accordingly.
- For phone/fax/mobile: include country/area code if shown (e.g. +852 2345 6789).
- Extract every piece of information visible on the card.
- The card may be in Chinese only, English only, or bilingual — extract all text found.`

  // Free vision models on OpenRouter (verified 2026-08-05)
  // gemma-4-26b: MoE model, fast for vision, works reliably
  // nemotron-nano-12b-v2-vl: OCR-optimised, may timeout on large images (mitigated by client-side resize)
  // nemotron-3-nano-omni: multimodal, good fallback
  const models = [
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
  ]

  const debugLog: string[] = []

  for (const model of models) {
    try {
      // 20s per-model timeout (Worker hard limit is 30s total)
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 20000)
      let resp: Response
      try {
        resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'CoLinkery OCR',
            'HTTP-Referer': 'https://coeldery85.com'
          },
          body: JSON.stringify({
            model,
            max_tokens: 512,
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: dataUrl } },
              { type: 'text', text: prompt }
            ]}]
          })
        })
      } finally {
        clearTimeout(timer)
      }
      const httpStatus = resp.status
      const data = await resp.json() as any
      // Log for debug
      debugLog.push(`${model}: HTTP ${httpStatus}, error=${JSON.stringify(data?.error)}, choices=${data?.choices?.length}`)
      // Check for API-level error (rate limit, model unavailable etc.)
      if (data?.error) continue
      const raw = data?.choices?.[0]?.message?.content || ''
      if (!raw) continue
      // Strip markdown code fences if model wraps output
      const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        // Model returned text but not JSON — still save the raw text for manual entry assistance
        debugLog.push(`${model}: no JSON in response, raw="${raw.substring(0,100)}"`)
        continue
      }
      const parsed = JSON.parse(jsonMatch[0])
      return c.json({ ok: true, r2_key: r2Key, parsed, ocr_raw: raw, ocr_model: model })
    } catch(err: any) {
      debugLog.push(`${model}: exception ${err?.message || String(err)}`)
      continue
    }
  }
  // All models failed — return debug info so frontend can show useful error
  return c.json({ ok: true, r2_key: r2Key, ocr_failed: true, parsed: {}, debug: debugLog })
  } catch(err: any) {
    return c.json({ ok: true, r2_key: r2Key, ocr_failed: true, parsed: {}, debug: [`outer exception: ${err?.message || String(err)}`] })
  }
})

// ─── 名片 CRUD ────────────────────────────────────────────────────────────────
app.post('/api/colinkery/cards', requireColinkery(), async (c) => {
  const db = c.env.DB
  const memberNo = c.get('clMemberNo') as string
  const body = await c.req.json<any>()
  const cardId = makeCsrpnToken(16)
  await db.prepare(`
    INSERT INTO business_cards (
      card_id, owner_member_no, image_r2_key,
      name_zh, name_en,
      company_zh, company_en, company,
      department_zh, department_en,
      title_zh, title_en, title,
      phone, mobile, fax, email, website,
      address_zh, address_en, address,
      wechat, whatsapp, linkedin, telegram,
      industry_zh, industry_en, industry,
      notes, ocr_raw
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    cardId, memberNo, body.image_r2_key || '',
    body.name_zh || '', body.name_en || '',
    body.company_zh || body.company || '', body.company_en || body.company || '', body.company || body.company_zh || body.company_en || '',
    body.department_zh || '', body.department_en || '',
    body.title_zh || body.title || '', body.title_en || body.title || '', body.title || body.title_zh || body.title_en || '',
    body.phone || '', body.mobile || '', body.fax || '', body.email || '', body.website || '',
    body.address_zh || body.address || '', body.address_en || body.address || '', body.address || body.address_zh || body.address_en || '',
    body.wechat || '', body.whatsapp || '', body.linkedin || '', body.telegram || '',
    body.industry_zh || body.industry || '', body.industry_en || body.industry || '', body.industry || body.industry_zh || body.industry_en || '',
    body.notes || '', body.ocr_raw || ''
  ).run()
  return c.json({ ok: true, card_id: cardId })
})

app.get('/api/colinkery/cards', requireColinkery(), async (c) => {
  const db = c.env.DB
  const memberNo = c.get('clMemberNo') as string
  const q = c.req.query('q') || ''
  let sql = `SELECT * FROM business_cards WHERE owner_member_no=?`
  const params: any[] = [memberNo]
  if (q) { sql += ` AND (name_zh LIKE ? OR name_en LIKE ? OR company_zh LIKE ? OR company_en LIKE ? OR company LIKE ? OR phone LIKE ? OR mobile LIKE ? OR email LIKE ? OR whatsapp LIKE ?)`; const lk = `%${q}%`; params.push(lk,lk,lk,lk,lk,lk,lk,lk,lk) }
  sql += ` ORDER BY created_at DESC LIMIT 100`
  const rows = await db.prepare(sql).bind(...params).all()
  return c.json({ ok: true, cards: rows.results })
})

app.get('/api/colinkery/cards/:id', requireColinkery(), async (c) => {
  const db = c.env.DB
  const memberNo = c.get('clMemberNo') as string
  const card = await db.prepare(`SELECT * FROM business_cards WHERE card_id=? AND owner_member_no=?`).bind(c.req.param('id'), memberNo).first()
  if (!card) return c.json({ ok: false, error: '名片不存在' }, 404)
  return c.json({ ok: true, card })
})

app.put('/api/colinkery/cards/:id', requireColinkery(), async (c) => {
  const db = c.env.DB
  const memberNo = c.get('clMemberNo') as string
  const body = await c.req.json<any>()
  const card = await db.prepare(`SELECT card_id FROM business_cards WHERE card_id=? AND owner_member_no=?`).bind(c.req.param('id'), memberNo).first()
  if (!card) return c.json({ ok: false, error: '名片不存在' }, 404)
  await db.prepare(`
    UPDATE business_cards SET name_zh=?, name_en=?, company=?, title=?, phone=?, mobile=?, email=?, address=?, industry=?, updated_at=datetime('now')
    WHERE card_id=?
  `).bind(body.name_zh || '', body.name_en || '', body.company || '', body.title || '', body.phone || '', body.mobile || '', body.email || '', body.address || '', body.industry || '', c.req.param('id')).run()
  return c.json({ ok: true })
})

// ─── 交棒（生成 b2b_token 連結）─────────────────────────────────────────────
app.post('/api/colinkery/handover', requireColinkery(), async (c) => {
  const db = c.env.DB
  const memberNo = c.get('clMemberNo') as string
  const { card_id } = await c.req.json<{ card_id: string }>()
  if (!card_id) return c.json({ ok: false, error: '請提供名片' }, 400)

  const card = await db.prepare(`SELECT * FROM business_cards WHERE card_id=? AND owner_member_no=?`).bind(card_id, memberNo).first<any>()
  if (!card) return c.json({ ok: false, error: '名片不存在' }, 404)

  const member = await db.prepare(`SELECT name_zh FROM members WHERE member_no=?`).bind(memberNo).first<{ name_zh: string }>()

  // 建立 b2b_lead (production schema: PK = 'id', not 'lead_id')
  const leadId = makeCsrpnToken(16)
  await db.prepare(`
    INSERT INTO b2b_leads (id, card_id, referral_member_no, colinkery_name, buyer_name, buyer_company, buyer_title, buyer_phone, buyer_email, buyer_industry, source)
    VALUES (?,?,?,?,?,?,?,?,?,?,'card_handover')
  `).bind(leadId, card_id, memberNo, member?.name_zh || '', card.name_zh || '', card.company || '', card.title || '', card.phone || card.mobile || '', card.email || '', card.industry || '').run()

  // 生成 CSPRNG token（≥32 bytes，不可枚舉）
  // production b2b_tokens schema: PK='id', token=separate column, lead_id=FK
  const tokenId = makeCsrpnToken(16)
  const tokenVal = makeCsrpnToken(40)
  const expiresAt = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  await db.prepare(`INSERT INTO b2b_tokens (id, token, lead_id, referral_member_no, expires_at, active) VALUES (?,?,?,?,?,1)`).bind(tokenId, tokenVal, leadId, memberNo, expiresAt).run()

  // Audit log (production schema: PK='id' TEXT, entity_id, entity_type, payload, actor, action)
  const auditId = makeCsrpnToken(16)
  await db.prepare(`INSERT INTO b2b_audit_log (id, entity_type, entity_id, action, actor) VALUES (?,?,?,?,?)`).bind(auditId, 'b2b_lead', leadId, 'handover_created', memberNo).run()

  const catalogUrl = `https://coeldery85.org/b2b?token=${tokenVal}`
  return c.json({ ok: true, lead_id: leadId, catalog_url: catalogUrl, buyer_name: card.name_zh || '', buyer_company: card.company || '' })
})

// ─── CoLinkery 成績統計 ───────────────────────────────────────────────────────
app.get('/api/colinkery/stats', requireColinkery(), async (c) => {
  const db = c.env.DB
  const memberNo = c.get('clMemberNo') as string

  try {
    const totals = await db.prepare(`
      SELECT
        COUNT(*) as total_leads,
        SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) as won_count,
        SUM(CASE WHEN commission_status='paid' THEN commission_amount_cents ELSE 0 END) as paid_cents,
        SUM(CASE WHEN commission_status='accrued' THEN commission_amount_cents ELSE 0 END) as accrued_cents
      FROM b2b_leads WHERE referral_member_no=?
    `).bind(memberNo).first<any>()

    const recentWon = await db.prepare(`
      SELECT id as lead_id, buyer_name, buyer_company, commission_amount_cents, commission_status, updated_at
      FROM b2b_leads WHERE referral_member_no=? AND status='won'
      ORDER BY updated_at DESC LIMIT 10
    `).bind(memberNo).all()

    return c.json({
      ok: true,
      total_leads: totals?.total_leads || 0,
      won_count: totals?.won_count || 0,
      paid_cents: totals?.paid_cents || 0,
      accrued_cents: totals?.accrued_cents || 0,
      recent_won: recentWon.results
    })
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message || String(err) }, 500)
  }
})

// ─── Admin CoLinkery：待審批 + 待發 OTP ───────────────────────────────────────
app.get('/api/admin/colinkery/pending', async (c) => {
  const token = getSessionToken(c)
  if (!await verifySession(c.env.DB, token)) return c.json({ ok: false, error: '未授權' }, 401)
  const db = c.env.DB

  const apps = await db.prepare(`
    SELECT ra.id, ra.member_no, ra.applicant_type, ra.name_zh, ra.notes, ra.review_notes, ra.created_at,
           m.phone, m.colinkery_account_status
    FROM role_applications ra
    JOIN members m ON m.member_no = ra.member_no
    WHERE ra.role='COLINKERY' AND ra.status='PENDING'
    ORDER BY ra.created_at ASC
  `).all()

  const otps = await db.prepare(`
    SELECT o.otp_id, o.member_no, o.otp_code, o.expires_at, o.created_at,
           m.name_zh, m.phone
    FROM colinkery_otp o
    JOIN members m ON m.member_no = o.member_no
    WHERE o.used=0 AND o.expires_at > datetime('now')
    ORDER BY o.created_at DESC
  `).all()

  return c.json({ ok: true, applications: apps.results, pending_otps: otps.results })
})

// ─── Admin CoLinkery：批准申請 ────────────────────────────────────────────────
app.post('/api/admin/colinkery/approve/:id', async (c) => {
  const token = getSessionToken(c)
  if (!await verifySession(c.env.DB, token)) return c.json({ ok: false, error: '未授權' }, 401)
  const db = c.env.DB
  const appId = parseInt(c.req.param('id'), 10)

  const appRow = await db.prepare(
    `SELECT * FROM role_applications WHERE id=? AND role='COLINKERY' AND status='PENDING'`
  ).bind(appId).first<any>()
  if (!appRow) return c.json({ ok: false, error: '申請不存在' }, 404)

  // 取下一個 CK 號碼
  let holderNo = 'CK000001'
  try {
    const cr = await db.prepare(`UPDATE role_counters SET next_val=next_val+1 WHERE role='COLINKERY' RETURNING next_val`).first<{ next_val: number }>()
    if (cr) holderNo = 'CK' + String(cr.next_val).padStart(6, '0')
  } catch { /* fallback */ }

  // 批次操作：若有 password_hash_pending 就同時寫入 password_hash，否則只改 status
  const batchOps = [
    db.prepare(`UPDATE role_applications SET status='APPROVED', reviewed_at=datetime('now') WHERE id=?`).bind(appId),
    db.prepare(`INSERT OR IGNORE INTO role_holders (member_no, role, applicant_type, holder_no, name_zh, status) VALUES (?,?,?,?,?,'ACTIVE')`).bind(appRow.member_no, 'COLINKERY', appRow.applicant_type, holderNo, appRow.name_zh || ''),
    db.prepare(`INSERT INTO b2b_audit_log (action, old_value, new_value, actor) VALUES ('approve_colinkery',?,?,?)`).bind(appRow.member_no, holderNo, 'admin')
  ]
  if (appRow.password_hash_pending) {
    batchOps.push(db.prepare(`UPDATE members SET password_hash=?, colinkery_account_status='active' WHERE member_no=?`).bind(appRow.password_hash_pending, appRow.member_no))
  } else {
    batchOps.push(db.prepare(`UPDATE members SET colinkery_account_status='active' WHERE member_no=?`).bind(appRow.member_no))
  }
  await db.batch(batchOps)

  // 取成員電話，生成 wa.me 連結
  const member = await db.prepare(`SELECT phone, name_zh FROM members WHERE member_no=?`).bind(appRow.member_no).first<{ phone: string; name_zh: string }>()
  const phoneDigits = (member?.phone || '').replace(/\D/g, '')
  const fullPhone = phoneDigits.startsWith('852') ? phoneDigits : '852' + phoneDigits
  const waMsg = encodeURIComponent(`你好${member?.name_zh ? '，' + member.name_zh : ''}！你的 CoLinkery 連結者帳戶已批准啟用，可用電話號碼 + 你設定的密碼登入 coeldery85.com/colinkery`)
  const waLink = `https://wa.me/${fullPhone}?text=${waMsg}`

  return c.json({ ok: true, holder_no: holderNo, wa_notify_link: waLink })
})

// ─── Admin CoLinkery：拒絕申請 ────────────────────────────────────────────────
app.post('/api/admin/colinkery/reject/:id', async (c) => {
  const token = getSessionToken(c)
  if (!await verifySession(c.env.DB, token)) return c.json({ ok: false, error: '未授權' }, 401)
  const db = c.env.DB
  const appId = parseInt(c.req.param('id'), 10)
  const { reason } = await c.req.json<{ reason: string }>()

  const appRow = await db.prepare(`SELECT member_no FROM role_applications WHERE id=? AND role='COLINKERY' AND status='PENDING'`).bind(appId).first<{ member_no: string }>()
  if (!appRow) return c.json({ ok: false, error: '申請不存在' }, 404)

  await db.batch([
    db.prepare(`UPDATE role_applications SET status='REJECTED', review_notes=?, reviewed_at=datetime('now') WHERE id=?`).bind(reason || '', appId),
    db.prepare(`UPDATE members SET colinkery_account_status='none' WHERE member_no=?`).bind(appRow.member_no),
    db.prepare(`INSERT INTO b2b_audit_log (action, old_value, new_value, actor) VALUES ('reject_colinkery',?,'REJECTED',?)`).bind(appRow.member_no, 'admin')
  ])

  const member = await db.prepare(`SELECT phone, name_zh FROM members WHERE member_no=?`).bind(appRow.member_no).first<{ phone: string; name_zh: string }>()
  const phoneDigits = (member?.phone || '').replace(/\D/g, '')
  const fullPhone = phoneDigits.startsWith('852') ? phoneDigits : '852' + phoneDigits
  const waMsg = encodeURIComponent(`你好${member?.name_zh ? '，' + member.name_zh : ''}，很抱歉，你的 CoLinkery 申請未獲批准。原因：${reason || ''}。如有疑問請 WhatsApp 聯絡我們。`)
  const waLink = `https://wa.me/${fullPhone}?text=${waMsg}`

  return c.json({ ok: true, wa_notify_link: waLink })
})

// ─── Admin CoLinkery：已批准列表 ──────────────────────────────────────────────
app.get('/api/admin/colinkery/approved', async (c) => {
  const token = getSessionToken(c)
  if (!await verifySession(c.env.DB, token)) return c.json({ ok: false, error: '未授權' }, 401)
  const db = c.env.DB

  const holders = await db.prepare(`
    SELECT rh.member_no, rh.holder_no, rh.applicant_type, rh.created_at AS approved_at,
           m.phone, m.name_zh
    FROM role_holders rh
    JOIN members m ON m.member_no = rh.member_no
    WHERE rh.role='COLINKERY' AND rh.status='ACTIVE'
    ORDER BY rh.created_at DESC
  `).all()

  return c.json({ ok: true, holders: holders.results })
})

// ─── Admin CoLinkery：已拒絕列表 ──────────────────────────────────────────────
app.get('/api/admin/colinkery/rejected', async (c) => {
  const token = getSessionToken(c)
  if (!await verifySession(c.env.DB, token)) return c.json({ ok: false, error: '未授權' }, 401)
  const db = c.env.DB

  const apps = await db.prepare(`
    SELECT ra.id, ra.member_no, ra.applicant_type, ra.name_zh, ra.review_notes, ra.reviewed_at AS updated_at,
           m.phone
    FROM role_applications ra
    JOIN members m ON m.member_no = ra.member_no
    WHERE ra.role='COLINKERY' AND ra.status='REJECTED'
    ORDER BY ra.reviewed_at DESC
    LIMIT 50
  `).all()

  return c.json({ ok: true, applications: apps.results })
})

// ─── CoLinkery PWA 靜態資源 ───────────────────────────────────────────────────
app.get('/colinkery-manifest.json', (c) => {
  return c.json({
    name: 'CoLinkery 連結者',
    short_name: 'CoLinkery',
    description: '老有聯盟 85 CoLinkery 連結者工具',
    start_url: '/colinkery/',
    display: 'standalone',
    background_color: '#FAF8F3',
    theme_color: '#1B5E20',
    orientation: 'portrait-primary',
    icons: [
      { src: '/static/cl-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/static/cl-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  })
})

app.get('/colinkery-sw.js', (c) => {
  const sw = `
const CACHE = 'colinkery-v3';
const OFFLINE = ['/colinkery/'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match('/colinkery/'))));
});`
  return new Response(sw, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store, no-cache' } })
})

// ─── CoLinkery PWA 前端頁面 ────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] colinkerypwaHtml — pure mechanical move

app.get('/colinkery', (c) => c.redirect('/colinkery/', 301))
app.get('/colinkery/', (c) => c.html(colinkerypwaHtml()))
app.get('/colinkery/*', (c) => c.html(colinkerypwaHtml()))

// ─── Admin CoLinkery UI（整合進現有 admin shell via JS）──────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] adminColinkerySectionHtml — pure mechanical move

// ─── 將 CoLinkery 審批頁面注入現有 admin shell ──────────────────────────────
app.get('/admin/colinkery', async (c) => {
  const token = getSessionToken(c)
  if (!await verifySession(c.env.DB, token)) return c.redirect('/membership/admin', 302)
  return c.html(`<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CoLinkery 審批 — Admin</title>
<style>
*{box-sizing:border-box;}body{font-family:sans-serif;background:#F3F4F6;margin:0;padding:16px;}
h1{font-size:20px;font-weight:700;margin-bottom:16px;}
a{color:#1B5E20;text-decoration:none;}
a:hover{text-decoration:underline;}
</style>
</head>
<body>
<div><a href="/admin">← 返回 Admin</a></div>
<h1>🤝 CoLinkery 管理</h1>
${adminColinkerySectionHtml()}
</body>
</html>`)
})

// ─── B2B 採購目錄頁 ─────────────────────────────────────────────────────────
app.get('/b2b', (c) => {
  const ref = c.req.query('ref') || ''
  const waMsg = encodeURIComponent('你好！我想了解 CoEldery 85 企業採購平台' + (ref ? '（由連結者 ' + ref + ' 介紹）' : '') + '，請問可以提供更多資料嗎？')
  return c.html(`<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>CoEldery 85 老有聯盟 · 企業採購平台</title>
<meta name="description" content="CoEldery 85 老有聯盟 B2B 採購平台。一站式社企採購，85% 回流長者社群，可提供 ESG 報告。">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#F0EBD8;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-size:16px;color:#111;min-height:100vh;}
.topbar{background:#1a6b1a;color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px;}
.topbar img{width:40px;height:40px;border-radius:8px;}
.topbar-brand{font-size:19px;font-weight:900;letter-spacing:.5px;}
.topbar-sub{font-size:13px;opacity:.8;margin-top:2px;}
.wrap{max-width:640px;margin:0 auto;padding:20px 16px 80px;}
.ref-bar{background:#e8f5e9;border-left:4px solid #2e7d32;border-radius:8px;padding:10px 14px;font-size:14px;color:#1b5e20;margin-bottom:16px;font-weight:500;}
.hero{background:#fff;border-radius:14px;padding:24px 20px;margin-bottom:16px;box-shadow:0 4px 16px rgba(0,0,0,.07);text-align:center;}
.hero h1{font-size:24px;font-weight:900;color:#1a6b1a;margin-bottom:8px;line-height:1.35;}
.hero p{font-size:15px;color:#444;line-height:1.75;margin-bottom:14px;}
.badge{display:inline-block;background:#e8f5e9;color:#1a6b1a;font-size:13px;font-weight:700;padding:5px 12px;border-radius:20px;margin:3px;}
.card{background:#fff;border-radius:14px;padding:20px 18px;margin-bottom:14px;box-shadow:0 2px 10px rgba(0,0,0,.06);}
.card h2{font-size:17px;font-weight:900;color:#1a6b1a;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
/* Product card */
.product{border:1px solid #e8f5e9;border-radius:12px;padding:16px;margin-bottom:12px;background:#fafff8;}
.product-name{font-size:17px;font-weight:900;color:#1b5e20;margin-bottom:4px;}
.product-name-en{font-size:13px;color:#666;margin-bottom:10px;}
.product-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.product-tag{background:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;}
.product-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#555;margin-bottom:6px;}
.product-row strong{color:#1b5e20;}
.product-moq{font-size:13px;color:#888;background:#f5f5f5;padding:6px 10px;border-radius:8px;margin-top:8px;}
.product-note{font-size:13px;color:#e65100;font-weight:700;margin-top:6px;}
/* ESG section */
.esg-row{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;}
.esg-icon{font-size:26px;flex-shrink:0;}
.esg-text h3{font-size:15px;font-weight:700;color:#222;margin-bottom:3px;}
.esg-text p{font-size:14px;color:#555;line-height:1.6;}
/* CTA */
.cta{display:block;width:100%;padding:16px;background:#228B22;color:#fff;border:none;border-radius:12px;
  font-size:18px;font-weight:900;cursor:pointer;text-align:center;text-decoration:none;
  letter-spacing:.5px;margin-top:10px;transition:background .15s;}
.cta:active,.cta:hover{background:#1a6b1a;}
.cta-wa{background:#25D366;}
.cta-wa:active,.cta-wa:hover{background:#1da851;}
/* How it works */
.step{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;}
.step-num{min-width:32px;height:32px;background:#1a6b1a;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;flex-shrink:0;}
.step-body h3{font-size:15px;font-weight:700;color:#222;margin-bottom:3px;}
.step-body p{font-size:14px;color:#555;line-height:1.6;}
.footer{text-align:center;color:#999;font-size:13px;margin-top:24px;padding-top:16px;border-top:1px solid #ddd;}
</style>
</head>
<body>
<div class="topbar">
  <img src="/icon-192.png" alt="CoEldery 85">
  <div>
    <div class="topbar-brand">CoEldery 85 老有聯盟</div>
    <div class="topbar-sub">企業社責採購平台</div>
  </div>
</div>
<div class="wrap">
  ${ref ? `<div class="ref-bar">🤝 由連結者 <strong>${ref}</strong> 為您介紹</div>` : ''}

  <div class="hero">
    <div style="font-size:44px;margin-bottom:10px;">🌿</div>
    <h1>一份採購，直接支持<br>香港長者社群</h1>
    <p>CoEldery 85 老有聯盟是香港社企採購平台。每筆訂單 <strong>85% 收益</strong>回流長者社群，同時為貴司提供 ESG 採購數據。</p>
    <span class="badge">🌟 社企認證</span>
    <span class="badge">📊 ESG 報告</span>
    <span class="badge">🤝 零風險合作</span>
    <span class="badge">🇭🇰 香港製造</span>
  </div>

  <!-- Product Catalogue -->
  <div class="card">
    <h2>📦 採購目錄</h2>

    <!-- Product 1: 竹漿紙巾 -->
    <div class="product">
      <div class="product-name">竹漿紙巾（廁紙）</div>
      <div class="product-name-en">Bamboo Pulp Toilet Paper</div>
      <div class="product-tags">
        <span class="product-tag">🌿 環保認證</span>
        <span class="product-tag">🌿 無添加</span>
        <span class="product-tag">🌿 社企支持</span>
        <span class="product-tag">🌿 低碳生產</span>
      </div>
      <div class="product-row"><span>規格</span><strong>每包 20 卷 · 3 層竹漿</strong></div>
      <div class="product-row"><span>交貨期</span><strong>下單後 7 個工作天</strong></div>
      <div class="product-row"><span>產地</span><strong>香港社企生產</strong></div>
      <div class="product-moq">📦 起訂量及批發報價：WhatsApp 查詢（視乎訂量提供階梯式折扣）</div>
      <div class="product-note">✅ 適合寫字樓、酒店、餐廳、物業管理等大量消耗場所</div>
    </div>

    <div style="background:#f8fdf8;border-radius:10px;padding:14px;font-size:14px;color:#555;text-align:center;margin-top:4px;">
      📋 更多產品陸續上架 · 如有特定採購需要歡迎查詢
    </div>
  </div>

  <!-- ESG Value -->
  <div class="card">
    <h2>📊 為何選擇我們？</h2>
    <div class="esg-row">
      <div class="esg-icon">🌿</div>
      <div class="esg-text"><h3>ESG 採購報告</h3><p>每筆訂單自動生成 ESG 社會效益報告，可直接用於企業年報及 ESG 披露。</p></div>
    </div>
    <div class="esg-row">
      <div class="esg-icon">👴</div>
      <div class="esg-text"><h3>85% 回流長者社群</h3><p>收益直接支持香港退休長者社群的培訓、就業及社區活動。</p></div>
    </div>
    <div class="esg-row">
      <div class="esg-icon">💼</div>
      <div class="esg-text"><h3>誠信推介 · 零廣告費</h3><p>由具行業背景的長者連結者親身推介，成交後才計佣金，零前期費用。</p></div>
    </div>
  </div>

  <!-- How it works -->
  <div class="card">
    <h2>🔄 採購流程</h2>
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body"><h3>WhatsApp 查詢</h3><p>告知採購需求及數量，我們即日回覆報價。</p></div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body"><h3>確認訂單</h3><p>確認規格及交貨安排，系統自動生成採購單及 ESG 證明。</p></div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body"><h3>送貨上門</h3><p>下單後 7 個工作天內送達，港九新界均可安排。</p></div>
    </div>
  </div>

  <!-- CTA -->
  <div class="card">
    <h2>📞 立即查詢採購報價</h2>
    <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:14px;">WhatsApp 我們的採購團隊，告知您的採購需求，即日提供報價單。</p>
    <a class="cta cta-wa" href="https://wa.me/85254429749?text=${waMsg}" target="_blank">
      💬 WhatsApp 查詢報價
    </a>
    <p style="font-size:13px;color:#888;text-align:center;margin-top:10px;">WhatsApp：5442-9749 · 辦公時間回覆</p>
  </div>

  <div class="footer">
    <p>CoEldery 85 老有聯盟 · 香港社企採購平台</p>
    <p style="margin-top:4px;"><a href="https://coeldery85.com" style="color:#1a6b1a;">coeldery85.com</a> · <a href="https://coeldery85.org" style="color:#1a6b1a;">coeldery85.org</a></p>
  </div>
</div>
</body>
</html>`)
})

// ═══════════════════════════════════════════════════════════════════════════════
// ── WhatsApp QR Quick Registration System ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helper: generate a secure random hex token ───────────────────────────────
async function generateToken(len = 32): Promise<string> {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2,'0')).join('')
}

// ── Helper: generate unique member_no (CE85-XXXXXX) ─────────────────────────
async function genMemberNoQR(db: D1Database): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const num = Math.floor(100000 + Math.random() * 900000)
    const candidate = `CE85-${num}`
    const existing = await db.prepare('SELECT id FROM members WHERE member_no = ?').bind(candidate).first()
    if (!existing) return candidate
  }
  // fallback: use counter
  const row = await db.prepare('UPDATE counter SET next_val = next_val + 1 WHERE id = 1 RETURNING next_val').first<{ next_val: number }>()
  const n = (row?.next_val ?? 1).toString().padStart(6,'0')
  return `CE85-${n}`
}

// ── Helper: Hong Kong districts list ────────────────────────────────────────
// [MOVED to src/lib/constants.ts @ Wave3/Stage0] HK_DISTRICTS — pure mechanical move

// ── GET /qr-register — Mini form page ────────────────────────────────────────
app.get('/qr-register', (c) => {
  const source = (c.req.query('source') || 'online_website').replace(/[^a-z0-9_\-]/gi, '').slice(0, 100)
  return c.html(qrRegisterHtml(source))
})

// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] qrRegisterHtml — pure mechanical move

// ── GET /api/qr-sources — public list of active sources (for QR gen) ─────────
app.get('/api/qr-sources', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare(
      "SELECT source_id, display_name, event_date, location FROM qr_sources WHERE status='active' ORDER BY created_at DESC"
    ).all<{ source_id: string; display_name: string; event_date: string; location: string }>()
    return c.json({ ok: true, sources: rows.results || [] })
  } catch (_) {
    return c.json({ ok: true, sources: [] })
  }
})

// ── POST /webhooks/whatsapp — Meta WhatsApp Cloud API webhook ────────────────
// GET /webhooks/whatsapp — webhook verification challenge
app.get('/webhooks/whatsapp', (c) => {
  const mode      = c.req.query('hub.mode')
  const token     = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')
  const verifyToken = c.env.WHATSAPP_VERIFY_TOKEN || 'coeldery85_wa_webhook_verify'
  if (mode === 'subscribe' && token === verifyToken) {
    return c.text(challenge || '', 200)
  }
  return c.text('Forbidden', 403)
})

app.post('/webhooks/whatsapp', async (c) => {
  const db = c.env.DB
  let body: any
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false }, 400) }

  // Extract message from WhatsApp Cloud API payload
  const entry   = body?.entry?.[0]
  const changes = entry?.changes?.[0]
  const value   = changes?.value
  const msg     = value?.messages?.[0]

  if (!msg || msg.type !== 'text') return c.json({ ok: true }) // ignore non-text

  const fromNumber  = msg.from || ''          // e.g. "85298765432"
  const messageId   = msg.id || ''
  const msgText     = (msg.text?.body || '').trim()

  // ── Parse message format: 姓名:NAME\n年份:YEAR\nSource:SOURCE ──────────────
  let parsedName: string | null = null
  let parsedYear: number | null = null
  let parsedSource: string | null = null

  const nameMatch   = msgText.match(/姓名[:：]\s*(.+)/u)
  const yearMatch   = msgText.match(/年份[:：]\s*(\d{4})/u)
  const sourceMatch = msgText.match(/Source[:：]\s*([^\s\n]+)/i)

  if (nameMatch)   parsedName   = nameMatch[1].trim().slice(0, 100)
  if (yearMatch)   parsedYear   = parseInt(yearMatch[1], 10)
  if (sourceMatch) parsedSource = sourceMatch[1].trim().replace(/[^a-z0-9_\-]/gi,'').slice(0, 100)

  // Insert webhook log
  const logInsert = db.prepare(
    `INSERT INTO whatsapp_webhook_logs
      (message_id, from_number, message_content, parsed_name, parsed_year, parsed_source, validation_result, response_status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 'pending')`
  ).bind(messageId, fromNumber, msgText, parsedName, parsedYear, parsedSource)

  let logId: number | null = null
  try {
    const lr = await logInsert.run()
    logId = lr.meta?.last_row_id ?? null
  } catch (_) { /* log insert failure non-fatal */ }

  async function updateLog(validationResult: string, membNo: string | null, responseStatus: string, errMsg: string | null) {
    if (!logId) return
    try {
      await db.prepare(
        `UPDATE whatsapp_webhook_logs SET validation_result=?, member_no=?, response_status=?, error_message=?, processed_at=datetime('now') WHERE id=?`
      ).bind(validationResult, membNo, responseStatus, errMsg, logId).run()
    } catch (_) { /* ignore */ }
  }

  // Helper: send WA reply via Cloud API
  async function sendReply(toNum: string, text: string): Promise<boolean> {
    const phoneId  = c.env.WHATSAPP_PHONE_ID
    const apiToken = c.env.WHATSAPP_API_TOKEN
    if (!phoneId || !apiToken) return false
    try {
      const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: toNum, type: 'text', text: { body: text } })
      })
      return resp.ok
    } catch (_) { return false }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear()

  // Validate phone (HK 8-digit, prefixed with 852)
  const hkPhone = fromNumber.startsWith('852') ? fromNumber.slice(3) : fromNumber
  const phoneValid = /^\d{8}$/.test(hkPhone)

  if (!parsedName || !parsedYear) {
    await updateLog('format_error', null, 'sent', 'Missing name or year')
    await sendReply(fromNumber,
      '抱歉，格式不正確 🙏\n\n請重新輸入以下格式：\n姓名:[你的名字]\n年份:[出生年份]\n\n例如：\n姓名:李大文\n年份:1960')
    return c.json({ ok: true })
  }

  if (parsedYear < 1920 || parsedYear > 2011) {
    await updateLog('invalid_year', null, 'sent', `Year out of range: ${parsedYear}`)
    await sendReply(fromNumber, `出生年份 ${parsedYear} 不在有效範圍內（1920-2011）\n請重新傳送正確的出生年份。`)
    return c.json({ ok: true })
  }

  if (!phoneValid) {
    await updateLog('invalid_phone', null, 'sent', `Invalid phone: ${fromNumber}`)
    await sendReply(fromNumber, '系統無法識別你的電話號碼，請確保使用香港 WhatsApp 號碼登記。')
    return c.json({ ok: true })
  }

  // ── Check duplicate ───────────────────────────────────────────────────────
  let existing: { member_no: string } | null = null
  try {
    existing = await db.prepare('SELECT member_no FROM members WHERE phone = ? LIMIT 1').bind(hkPhone).first<{ member_no: string }>()
  } catch (_) { /* ignore */ }

  if (existing) {
    const loginUrl = `https://coeldery85.com/app`
    await updateLog('duplicate_phone', existing.member_no, 'sent', null)
    await sendReply(fromNumber,
      `你已是 CoEldery 85 會員！🎉\n\n會員號碼：${existing.member_no}\n\n📱 點擊此連結查看你的會員卡：\n${loginUrl}`)
    return c.json({ ok: true })
  }

  // ── Create member ─────────────────────────────────────────────────────────
  const age        = currentYear - parsedYear
  const tier       = age >= 55 ? 'PRIMARY' : 'FAMILY'
  const tierLabel  = tier === 'PRIMARY' ? '主卡（55+）' : '家庭卡'
  const expiresAt  = `${currentYear + 2}-12-31`
  const memberNo   = await genMemberNoQR(db)
  const roadshowSrc = parsedSource || 'online_website'

  try {
    await db.prepare(
      `INSERT INTO members
        (member_no, tier, name_zh, phone, birth_year, roadshow, source, status,
         registration_method, registration_status, roadshow_source, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'whatsapp_qr', 'ACTIVE',
               'whatsapp_qr', 'incomplete', ?, ?)`
    ).bind(memberNo, tier, parsedName, hkPhone, parsedYear, roadshowSrc, roadshowSrc, expiresAt).run()
  } catch (dbErr: any) {
    await updateLog('db_error', null, 'failed', String(dbErr))
    await sendReply(fromNumber, '系統暫時出現問題，請稍後再試或WhatsApp我們：5442-9749 🙏')
    return c.json({ ok: true })
  }

  // ── Generate one-time login token ─────────────────────────────────────────
  let loginToken = ''
  try {
    loginToken = await generateToken(32)
    const expiresTokenAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().replace('T',' ').slice(0,19)
    await db.prepare(
      `INSERT INTO wa_login_tokens (token, member_no, phone, purpose, expires_at)
       VALUES (?, ?, ?, 'app_login', ?)`
    ).bind(loginToken, memberNo, hkPhone, expiresTokenAt).run()
  } catch (_) { loginToken = '' }

  const appLink = loginToken
    ? `https://coeldery85.com/app?token=${loginToken}&source=wa_quick_register`
    : `https://coeldery85.com/app`

  // ── Send confirmation reply ───────────────────────────────────────────────
  const confirmMsg =
    `🎉 歡迎加入 CoEldery 85 老有聯盟！\n\n` +
    `你的會員卡已準備就緒！\n\n` +
    `會員號碼：${memberNo}\n` +
    `姓名：${parsedName}\n` +
    `會員類型：${tierLabel}\n` +
    `出生年份：${parsedYear}\n\n` +
    `📱 點擊此連結查看你的會員卡並完成登記：\n${appLink}\n\n` +
    (loginToken ? `⏰ 此連結將在24小時後過期\n` : '') +
    `🔒 只有你的 WhatsApp 號碼能存取此連結`

  const sent = await sendReply(fromNumber, confirmMsg)
  await updateLog('success', memberNo, sent ? 'sent' : 'failed', null)

  return c.json({ ok: true })
})

// ── POST /api/wa-token/verify — validate token and return member ──────────────
app.post('/api/wa-token/verify', async (c) => {
  const db = c.env.DB
  let body: { token?: string }
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效請求' }, 400) }

  const token = (body.token || '').trim()
  if (!token || token.length < 10) return c.json({ ok: false, error: '無效連結' })

  // Look up token
  let row: { id: number; member_no: string; phone: string; used: number; expires_at: string } | null = null
  try {
    row = await db.prepare(
      'SELECT id, member_no, phone, used, expires_at FROM wa_login_tokens WHERE token = ? LIMIT 1'
    ).bind(token).first<{ id: number; member_no: string; phone: string; used: number; expires_at: string }>()
  } catch (_) { return c.json({ ok: false, error: '系統錯誤' }) }

  if (!row) return c.json({ ok: false, error: '連結無效或已過期', expired: true })
  if (row.used) return c.json({ ok: false, error: '此連結已被使用，請重新掃描QR碼登記', expired: true })

  // Check expiry
  const now = new Date()
  const exp = new Date(row.expires_at.replace(' ', 'T') + 'Z')
  if (now > exp) {
    return c.json({ ok: false, error: '登入連結已過期（超過24小時），請重新掃描QR碼', expired: true })
  }

  // Mark token as used
  try {
    await db.prepare("UPDATE wa_login_tokens SET used=1, used_at=datetime('now') WHERE id=?").bind(row.id).run()
  } catch (_) { /* non-fatal */ }

  // Fetch member
  let member: any = null
  try {
    member = await db.prepare(
      `SELECT member_no, tier, name_zh, phone, gender, birth_year, district,
              registration_method, registration_status, status, expires_at
       FROM members WHERE member_no = ? LIMIT 1`
    ).bind(row.member_no).first()
  } catch (_) { return c.json({ ok: false, error: '無法讀取會員資料' }) }

  if (!member) return c.json({ ok: false, error: '找不到會員資料' })
  if (member.status !== 'ACTIVE') return c.json({ ok: false, error: '此會員帳戶已停用' })

  return c.json({ ok: true, member })
})

// ── POST /api/member/complete-profile — fill in gender + district ────────────
app.post('/api/member/complete-profile', async (c) => {
  const db = c.env.DB
  let body: { member_no?: string; gender?: string; district?: string }
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效請求' }, 400) }

  const memberNo = (body.member_no || '').trim()
  const gender   = (body.gender || '').trim()
  const district = (body.district || '').trim()

  if (!memberNo) return c.json({ ok: false, error: '缺少會員號碼' })
  if (!gender)   return c.json({ ok: false, error: '請選擇性別' })
  if (!district) return c.json({ ok: false, error: '請選擇居住地區' })

  const validGenders = ['M','F','Other','Prefer not to say']
  if (!validGenders.includes(gender)) return c.json({ ok: false, error: '無效性別選項' })
  if (!HK_DISTRICTS.includes(district)) return c.json({ ok: false, error: '無效地區選項' })

  try {
    await db.prepare(
      `UPDATE members SET gender=?, district=?, registration_status='complete', updated_at=datetime('now') WHERE member_no=?`
    ).bind(gender, district, memberNo).run()
  } catch (_) {
    // updated_at column may not exist; try without it
    try {
      await db.prepare(
        `UPDATE members SET gender=?, district=?, registration_status='complete' WHERE member_no=?`
      ).bind(gender, district, memberNo).run()
    } catch (e2: any) {
      return c.json({ ok: false, error: '更新失敗' })
    }
  }

  return c.json({ ok: true })
})

// ── GET /qr-register/complete — supplement info page (after token login) ─────
app.get('/qr-register/complete', (c) => {
  return c.html(qrCompleteHtml())
})

// [MOVED to src/lib/html-templates.ts @ Wave3/Stage3] qrCompleteHtml — pure mechanical move

// ── Admin: GET /api/admin/qr-sources — list all QR sources with stats ────────
app.get('/api/admin/qr-sources', async (c) => {
  const db = c.env.DB
  // Auth handled by /api/admin/* middleware (session cookie)

  try {
    const sources = await db.prepare(
      `SELECT qs.*, 
        (SELECT COUNT(*) FROM members m WHERE m.roadshow_source = qs.source_id) as member_count
       FROM qr_sources qs ORDER BY qs.created_at DESC`
    ).all<any>()
    return c.json({ ok: true, sources: sources.results || [] })
  } catch (_) {
    return c.json({ ok: true, sources: [] })
  }
})

// ── Admin: POST /api/admin/qr-sources — create new QR source ─────────────────
app.post('/api/admin/qr-sources', async (c) => {
  const db = c.env.DB
  // Auth handled by /api/admin/* middleware (session cookie)

  let body: { source_id?: string; display_name?: string; event_date?: string; location?: string; notes?: string }
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效請求' }, 400) }

  const sourceId   = (body.source_id || '').replace(/[^a-z0-9_\-]/gi,'').trim().toLowerCase()
  const displayName = (body.display_name || '').trim()
  if (!sourceId || !displayName) return c.json({ ok: false, error: '缺少 source_id 或 display_name' })

  try {
    await db.prepare(
      `INSERT INTO qr_sources (source_id, display_name, event_date, location, notes)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(sourceId, displayName, body.event_date||null, body.location||null, body.notes||'').run()
    return c.json({ ok: true })
  } catch (e: any) {
    if (String(e).includes('UNIQUE')) return c.json({ ok: false, error: '此 source_id 已存在' })
    return c.json({ ok: false, error: '建立失敗' })
  }
})

// ── Admin: PATCH /api/admin/qr-sources/:id — toggle status ───────────────────
app.patch('/api/admin/qr-sources/:id', async (c) => {
  const db = c.env.DB
  // Auth handled by /api/admin/* middleware (session cookie)

  const id = c.req.param('id')
  let body: { status?: string }
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效請求' }, 400) }
  const status = body.status === 'inactive' ? 'inactive' : 'active'

  try {
    await db.prepare('UPDATE qr_sources SET status=? WHERE source_id=?').bind(status, id).run()
    return c.json({ ok: true })
  } catch (_) { return c.json({ ok: false, error: '更新失敗' }) }
})

// ── Admin: PUT /api/admin/qr-sources/:id — edit QR source ────────────────────
app.put('/api/admin/qr-sources/:id', async (c) => {
  const db = c.env.DB
  // Auth handled by /api/admin/* middleware (session cookie)

  const id = c.req.param('id')
  let body: { display_name?: string; event_date?: string; location?: string; notes?: string }
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效請求' }, 400) }

  const displayName = (body.display_name || '').trim()
  if (!displayName) return c.json({ ok: false, error: '缺少顯示名稱' })

  try {
    const result = await db.prepare(
      `UPDATE qr_sources SET display_name=?, event_date=?, location=?, notes=? WHERE source_id=?`
    ).bind(displayName, body.event_date||null, body.location||null, body.notes||null, id).run()
    if ((result.meta?.changes ?? 0) === 0) return c.json({ ok: false, error: '找不到此 QR 來源' })
    return c.json({ ok: true })
  } catch (_) { return c.json({ ok: false, error: '更新失敗' }) }
})

// ── Admin: DELETE /api/admin/qr-sources/:id — delete QR source ───────────────
app.delete('/api/admin/qr-sources/:id', async (c) => {
  const db = c.env.DB
  // Auth handled by /api/admin/* middleware (session cookie)

  const id = c.req.param('id')
  try {
    // Check if any members registered via this source
    const usage = await db.prepare(
      'SELECT COUNT(*) as cnt FROM members WHERE roadshow_source=?'
    ).bind(id).first<{ cnt: number }>()
    if ((usage?.cnt ?? 0) > 0) {
      return c.json({ ok: false, error: `此 QR 來源已有 ${usage?.cnt} 名會員登記，無法刪除。可改為「暫停」。` })
    }
    await db.prepare('DELETE FROM qr_sources WHERE source_id=?').bind(id).run()
    return c.json({ ok: true })
  } catch (_) { return c.json({ ok: false, error: '刪除失敗' }) }
})

// ── Admin: GET /api/admin/qr-sources/:id/stats — stats for one source ────────
app.get('/api/admin/qr-sources/:id/stats', async (c) => {
  const db = c.env.DB
  // Auth handled by /api/admin/* middleware (session cookie)

  const sourceId = c.req.param('id')
  try {
    const total = await db.prepare(
      'SELECT COUNT(*) as cnt FROM members WHERE roadshow_source=?'
    ).bind(sourceId).first<{ cnt: number }>()

    const byGender = await db.prepare(
      `SELECT gender, COUNT(*) as cnt FROM members WHERE roadshow_source=? GROUP BY gender`
    ).bind(sourceId).all<{ gender: string; cnt: number }>()

    const byTier = await db.prepare(
      `SELECT tier, COUNT(*) as cnt FROM members WHERE roadshow_source=? GROUP BY tier`
    ).bind(sourceId).all<{ tier: string; cnt: number }>()

    const byDistrict = await db.prepare(
      `SELECT district, COUNT(*) as cnt FROM members WHERE roadshow_source=? AND district != '' GROUP BY district ORDER BY cnt DESC LIMIT 10`
    ).bind(sourceId).all<{ district: string; cnt: number }>()

    const byStatus = await db.prepare(
      `SELECT registration_status, COUNT(*) as cnt FROM members WHERE roadshow_source=? GROUP BY registration_status`
    ).bind(sourceId).all<{ registration_status: string; cnt: number }>()

    const avgYear = await db.prepare(
      `SELECT AVG(birth_year) as avg_year, MIN(birth_year) as min_year, MAX(birth_year) as max_year
       FROM members WHERE roadshow_source=? AND birth_year > 0`
    ).bind(sourceId).first<{ avg_year: number; min_year: number; max_year: number }>()

    return c.json({
      ok: true,
      total: total?.cnt || 0,
      by_gender: byGender.results || [],
      by_tier: byTier.results || [],
      by_district: byDistrict.results || [],
      by_status: byStatus.results || [],
      avg_birth_year: avgYear?.avg_year ? Math.round(avgYear.avg_year) : null,
      birth_year_range: { min: avgYear?.min_year, max: avgYear?.max_year }
    })
  } catch (_) { return c.json({ ok: false, error: '查詢失敗' }) }
})

// ── Admin: POST /api/admin/qr-test-webhook — simulate WhatsApp message ────────
app.post('/api/admin/qr-test-webhook', async (c) => {
  const db = c.env.DB
  // Auth handled by /api/admin/* middleware (session cookie)

  let body: { phone?: string; name?: string; year?: number; source?: string }
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效請求' }, 400) }

  const phone  = (body.phone || '').replace(/\D/g, '').slice(0, 8)
  const name   = (body.name  || '').trim().slice(0, 100)
  const year   = Number(body.year)
  const source = (body.source || 'online_website').replace(/[^a-z0-9_\-]/gi, '').slice(0, 100)

  if (!/^\d{8}$/.test(phone))           return c.json({ ok: false, error: '請輸入8位香港電話號碼' })
  if (!name)                             return c.json({ ok: false, error: '缺少姓名' })
  if (!year || year < 1920 || year > 2011) return c.json({ ok: false, error: '出生年份不在有效範圍（1920-2011）' })

  // Check duplicate phone
  const existing = await db.prepare('SELECT member_no FROM members WHERE phone=? LIMIT 1').bind(phone).first<{ member_no: string }>()
  if (existing) {
    return c.json({ ok: false, error: `此電話號碼 ${phone} 已登記為會員 ${existing.member_no}` })
  }

  // Create member (same logic as webhook)
  const currentYear = new Date().getFullYear()
  const age         = currentYear - year
  const tier        = age >= 55 ? 'PRIMARY' : 'FAMILY'
  const expiresAt   = `${currentYear + 2}-12-31`
  const memberNo    = await genMemberNoQR(db)

  try {
    await db.prepare(
      `INSERT INTO members
        (member_no, tier, name_zh, phone, birth_year, roadshow, source, status,
         registration_method, registration_status, roadshow_source, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'whatsapp_qr', 'ACTIVE',
               'whatsapp_qr', 'incomplete', ?, ?)`
    ).bind(memberNo, tier, name, phone, year, source, source, expiresAt).run()
  } catch (e: any) {
    return c.json({ ok: false, error: '建立會員失敗', detail: String(e) })
  }

  // Generate login token
  let loginToken = ''
  try {
    loginToken = await generateToken(32)
    const expiresTokenAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().replace('T',' ').slice(0, 19)
    await db.prepare(
      `INSERT INTO wa_login_tokens (token, member_no, phone, purpose, expires_at)
       VALUES (?, ?, ?, 'app_login', ?)`
    ).bind(loginToken, memberNo, phone, expiresTokenAt).run()
  } catch (_) { loginToken = '' }

  const appLink = loginToken
    ? `https://coeldery85.com/app?token=${loginToken}&source=wa_quick_register`
    : `https://coeldery85.com/app`

  // Write a test log entry
  try {
    await db.prepare(
      `INSERT INTO whatsapp_webhook_logs
        (message_id, from_number, message_content, parsed_name, parsed_year, parsed_source, validation_result, response_status, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, 'success', 'test_mode', datetime('now'))`
    ).bind('test_'+memberNo, '852'+phone, '姓名:'+name+'\n年份:'+year+'\nSource:'+source,
            name, year, source).run()
  } catch (_) { /* non-fatal */ }

  return c.json({
    ok: true,
    member: { member_no: memberNo, tier, name_zh: name, phone, birth_year: year, roadshow_source: source },
    app_link: appLink,
    message: `會員 ${memberNo} 已成功建立，這是測試記錄，請測試完畢後手動刪除。`
  })
})

// ── Admin: GET /api/admin/webhook-logs — paginated webhook logs ───────────────
app.get('/api/admin/webhook-logs', async (c) => {
  const db = c.env.DB
  // Auth handled by /api/admin/* middleware (session cookie)

  const page   = Math.max(1, parseInt(c.req.query('page') || '1'))
  const limit  = 50
  const offset = (page - 1) * limit
  const status = c.req.query('status') || ''
  const source = c.req.query('source') || ''

  let where = '1=1'
  const params: any[] = []
  if (status) { where += ' AND validation_result=?'; params.push(status) }
  if (source) { where += ' AND parsed_source=?'; params.push(source) }

  try {
    const rows = await db.prepare(
      `SELECT * FROM whatsapp_webhook_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all<any>()
    const countRow = await db.prepare(
      `SELECT COUNT(*) as cnt FROM whatsapp_webhook_logs WHERE ${where}`
    ).bind(...params).first<{ cnt: number }>()

    return c.json({ ok: true, logs: rows.results || [], total: countRow?.cnt || 0, page, limit })
  } catch (_) { return c.json({ ok: true, logs: [], total: 0, page, limit }) }
})

// ── GET /admin/qr — Admin QR Management Page ─────────────────────────────────
app.get('/admin/qr', (c) => {
  return c.html(adminQrHtml())
})

// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] adminQrHtml — pure mechanical move

// ══════════════════════════════════════════════════════════════════════════════
// ─── brandFormHtml — standalone brand submission page ────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] brandFormHtml — pure mechanical move

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Benefits APIs ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/benefits/categories — public
app.get('/api/benefits/categories', async (c) => {
  const db = (c.env as any).DB as D1Database
  const { results } = await db.prepare(
    `SELECT id,name,icon,sort_order FROM benefit_categories WHERE is_active=1 ORDER BY sort_order`
  ).all()
  return c.json({ ok: true, categories: results })
})

// GET /api/benefits?category_id=&page= — public (member app)
app.get('/api/benefits', async (c) => {
  const db = (c.env as any).DB as D1Database
  const catId = c.req.query('category_id') || ''
  const page  = Math.max(1, parseInt(c.req.query('page') || '1'))
  const limit = 20
  const offset = (page - 1) * limit
  const now = new Date().toISOString().slice(0, 10)
  let sql = `SELECT b.id,b.category_id,b.title,b.description,b.image_url,
               b.start_date,b.end_date,b.benefit_content,b.extra_fields,
               b.claim_limit,b.total_quota,b.sort_order,
               bc.name AS category_name, bc.icon AS category_icon,
               (SELECT COUNT(*) FROM benefit_claims WHERE benefit_id=b.id) AS claim_count
             FROM benefits b JOIN benefit_categories bc ON bc.id=b.category_id
             WHERE b.status='active' AND (b.end_date IS NULL OR b.end_date >= '${now}')`
  if (catId) sql += ` AND b.category_id=${parseInt(catId)}`
  sql += ` ORDER BY b.sort_order DESC, b.created_at DESC LIMIT ${limit} OFFSET ${offset}`
  const { results } = await db.prepare(sql).all()
  return c.json({ ok: true, benefits: results })
})

// GET /api/benefits/:id — public detail
app.get('/api/benefits/:id', async (c) => {
  const db = (c.env as any).DB as D1Database
  const id = parseInt(c.req.param('id'))
  const row = await db.prepare(
    `SELECT b.*,bc.name AS category_name,bc.icon AS category_icon,
       (SELECT COUNT(*) FROM benefit_claims WHERE benefit_id=b.id) AS claim_count
     FROM benefits b JOIN benefit_categories bc ON bc.id=b.category_id
     WHERE b.id=?`
  ).bind(id).first()
  if (!row) return c.json({ ok: false, error: '找不到福利' }, 404)
  return c.json({ ok: true, benefit: row })
})

// POST /api/benefits/:id/claim — member claim (requires member auth via phone session)
app.post('/api/benefits/:id/claim', async (c) => {
  const db = (c.env as any).DB as D1Database
  // Get member from session cookie
  const sessionId = getCookie(c, 'app_session') || ''
  if (!sessionId) return c.json({ ok: false, error: '請先登入', code: 'AUTH_REQUIRED' }, 401)
  const sess = await db.prepare(`SELECT member_no FROM app_sessions WHERE session_id=? AND expires_at>datetime('now')`).bind(sessionId).first() as any
  if (!sess) return c.json({ ok: false, error: '登入已過期', code: 'AUTH_REQUIRED' }, 401)
  const memberNo = sess.member_no as string

  const benefitId = parseInt(c.req.param('id'))
  // Check benefit exists and active
  const benefit = await db.prepare(
    `SELECT id,title,claim_limit,total_quota,status,end_date FROM benefits WHERE id=?`
  ).bind(benefitId).first() as any
  if (!benefit || benefit.status !== 'active') return c.json({ ok: false, error: '此福利不可領取' }, 400)
  if (benefit.end_date && benefit.end_date < new Date().toISOString().slice(0, 10))
    return c.json({ ok: false, error: '此福利已過期' }, 400)

  // Check total quota
  if (benefit.total_quota > 0) {
    const total = await db.prepare(`SELECT COUNT(*) as cnt FROM benefit_claims WHERE benefit_id=?`).bind(benefitId).first() as any
    if (total.cnt >= benefit.total_quota) return c.json({ ok: false, error: '此福利已額滿' }, 400)
  }

  // Check already claimed
  const existing = await db.prepare(`SELECT id FROM benefit_claims WHERE benefit_id=? AND member_no=?`).bind(benefitId, memberNo).first()
  if (existing) return c.json({ ok: false, error: '您已領取此福利', already_claimed: true }, 400)

  // Insert claim
  await db.prepare(`INSERT INTO benefit_claims (benefit_id,member_no) VALUES (?,?)`).bind(benefitId, memberNo).run()
  return c.json({ ok: true, message: '成功領取！' })
})

// GET /api/benefits/:id/my-claim — check if current member claimed
app.get('/api/benefits/:id/my-claim', async (c) => {
  const db = (c.env as any).DB as D1Database
  const sessionId = getCookie(c, 'app_session') || ''
  if (!sessionId) return c.json({ ok: true, claimed: false })
  const sess = await db.prepare(`SELECT member_no FROM app_sessions WHERE session_id=? AND expires_at>datetime('now')`).bind(sessionId).first() as any
  if (!sess) return c.json({ ok: true, claimed: false })
  const row = await db.prepare(`SELECT id,claimed_at FROM benefit_claims WHERE benefit_id=? AND member_no=?`).bind(parseInt(c.req.param('id')), sess.member_no).first()
  return c.json({ ok: true, claimed: !!row, claimed_at: row ? (row as any).claimed_at : null })
})

// ── Admin Benefits APIs ──────────────────────────────────────────────────────

// GET /api/admin/benefits — list all
app.get('/api/admin/benefits', async (c) => {
  const db = (c.env as any).DB as D1Database
  if (!await verifySession(c, db)) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  const catId = c.req.query('category_id') || ''
  let sql = `SELECT b.*,bc.name AS category_name,bc.icon AS category_icon,
               (SELECT COUNT(*) FROM benefit_claims WHERE benefit_id=b.id) AS claim_count
             FROM benefits b JOIN benefit_categories bc ON bc.id=b.category_id`
  if (catId) sql += ` WHERE b.category_id=${parseInt(catId)}`
  sql += ` ORDER BY b.sort_order DESC, b.created_at DESC`
  const { results } = await db.prepare(sql).all()
  return c.json({ ok: true, benefits: results })
})

// POST /api/admin/benefits — create
app.post('/api/admin/benefits', async (c) => {
  const db = (c.env as any).DB as D1Database
  if (!await verifySession(c, db)) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  const body = await c.req.json() as any
  const { category_id, title, description='', image_url='', start_date='', end_date='',
          benefit_content='', claim_limit=0, total_quota=0, extra_fields='[]', status='active', sort_order=0 } = body
  if (!title || !category_id) return c.json({ ok: false, error: '請填寫標題及分類' }, 400)
  const r = await db.prepare(
    `INSERT INTO benefits (category_id,title,description,image_url,start_date,end_date,benefit_content,claim_limit,total_quota,extra_fields,status,sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(category_id,title,description,image_url||null,start_date||null,end_date||null,benefit_content,claim_limit,total_quota,
     typeof extra_fields==='string'?extra_fields:JSON.stringify(extra_fields),status,sort_order).run()
  return c.json({ ok: true, id: r.meta.last_row_id })
})

// PUT /api/admin/benefits/:id — update
app.put('/api/admin/benefits/:id', async (c) => {
  const db = (c.env as any).DB as D1Database
  if (!await verifySession(c, db)) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json() as any
  const { category_id, title, description='', image_url, start_date, end_date,
          benefit_content='', claim_limit=0, total_quota=0, extra_fields='[]', status='active', sort_order=0 } = body
  if (!title || !category_id) return c.json({ ok: false, error: '請填寫標題及分類' }, 400)
  await db.prepare(
    `UPDATE benefits SET category_id=?,title=?,description=?,image_url=?,start_date=?,end_date=?,
     benefit_content=?,claim_limit=?,total_quota=?,extra_fields=?,status=?,sort_order=?,updated_at=datetime('now')
     WHERE id=?`
  ).bind(category_id,title,description,image_url||null,start_date||null,end_date||null,benefit_content,
     claim_limit,total_quota,typeof extra_fields==='string'?extra_fields:JSON.stringify(extra_fields),status,sort_order,id).run()
  return c.json({ ok: true })
})

// DELETE /api/admin/benefits/:id
app.delete('/api/admin/benefits/:id', async (c) => {
  const db = (c.env as any).DB as D1Database
  if (!await verifySession(c, db)) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  await db.prepare(`DELETE FROM benefits WHERE id=?`).bind(parseInt(c.req.param('id'))).run()
  return c.json({ ok: true })
})

// GET /api/admin/benefits/:id/claims — claim records with member info
app.get('/api/admin/benefits/:id/claims', async (c) => {
  const db = (c.env as any).DB as D1Database
  if (!await verifySession(c, db)) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  const { results } = await db.prepare(
    `SELECT bc.id,bc.member_no,bc.claimed_at,bc.notes,
       m.name_zh,m.phone
     FROM benefit_claims bc LEFT JOIN members m ON m.member_no=bc.member_no
     WHERE bc.benefit_id=? ORDER BY bc.claimed_at DESC`
  ).bind(parseInt(c.req.param('id'))).all()
  return c.json({ ok: true, claims: results })
})

// GET /api/admin/benefits/claims/summary — all claims summary
app.get('/api/admin/benefits/claims/summary', async (c) => {
  const db = (c.env as any).DB as D1Database
  if (!await verifySession(c, db)) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  const { results } = await db.prepare(
    `SELECT b.id AS benefit_id,b.title,bc_cat.name AS category_name,bc_cat.icon,
       COUNT(bc.id) AS claim_count,
       MAX(bc.claimed_at) AS last_claimed_at
     FROM benefits b
     JOIN benefit_categories bc_cat ON bc_cat.id=b.category_id
     LEFT JOIN benefit_claims bc ON bc.benefit_id=b.id
     GROUP BY b.id ORDER BY claim_count DESC`
  ).all()
  return c.json({ ok: true, summary: results })
})

// POST /api/admin/benefits/upload-image — Cloudinary upload
app.post('/api/admin/benefits/upload-image', async (c) => {
  const db = (c.env as any).DB as D1Database
  if (!await verifySession(c, db)) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  const env = c.env as any
  const cloudName = env.CLOUDINARY_CLOUD_NAME
  const apiKey    = env.CLOUDINARY_API_KEY
  const apiSecret = env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return c.json({ ok: false, error: 'Cloudinary 未設定' }, 500)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ ok: false, error: '請選擇圖片' }, 400)

  const ts = Math.floor(Date.now() / 1000)
  const folder = 'benefits'
  const paramsToSign = `folder=${folder}&timestamp=${ts}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(apiSecret)
  const msgData = encoder.encode(paramsToSign)
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const sigHex = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')

  // Actually use SHA-1 for Cloudinary (it requires SHA-1)
  async function sha1(str: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str))
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
  }
  const signature = await sha1(paramsToSign + apiSecret)

  const cfForm = new FormData()
  cfForm.append('file', file)
  cfForm.append('folder', folder)
  cfForm.append('timestamp', String(ts))
  cfForm.append('api_key', apiKey)
  cfForm.append('signature', signature)

  const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST', body: cfForm
  })
  const result = await resp.json() as any
  if (!resp.ok || !result.secure_url) return c.json({ ok: false, error: result.error?.message || '上傳失敗' }, 500)
  return c.json({ ok: true, url: result.secure_url })
})

// GET /api/admin/benefit-categories — manage categories
app.get('/api/admin/benefit-categories', async (c) => {
  const db = (c.env as any).DB as D1Database
  if (!await verifySession(c, db)) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  const { results } = await db.prepare(`SELECT * FROM benefit_categories ORDER BY sort_order`).all()
  return c.json({ ok: true, categories: results })
})

// GET /api/members/:no/medical-status — lookup by member_no (used by PWA app, no extra auth needed)
// member_no is already known by the client from localStorage after they looked up their own card
app.get('/api/members/:no/medical-status', async (c) => {
  const db = (c.env as any).DB as D1Database
  const memberNo = c.req.param('no')
  if (!memberNo) return c.json({ ok: false, error: 'missing member_no' }, 400)

  const member = await db.prepare(
    `SELECT name_zh, name_en FROM members WHERE member_no=?`
  ).bind(memberNo).first() as any
  if (!member) return c.json({ ok: false, error: '找不到會員' }, 404)

  let app_row: any = null
  try {
    app_row = await db.prepare(
      `SELECT status, card_no, card_image_url FROM medical_card_applications WHERE member_no=? LIMIT 1`
    ).bind(memberNo).first()
  } catch (_) {
    try {
      app_row = await db.prepare(
        `SELECT status, card_no, NULL AS card_image_url FROM medical_card_applications WHERE member_no=? LIMIT 1`
      ).bind(memberNo).first()
    } catch (__) {
      try {
        app_row = await db.prepare(
          `SELECT status, NULL AS card_no, NULL AS card_image_url FROM medical_card_applications WHERE member_no=? LIMIT 1`
        ).bind(memberNo).first()
      } catch (___) {}
    }
  }

  return c.json({
    ok: true,
    member_no: memberNo,
    name_zh: member?.name_zh || '',
    name_en: member?.name_en || '',
    status:         app_row ? (app_row as any).status        : null,
    card_no:        app_row ? (app_row as any).card_no       : null,
    card_image_url: app_row ? (app_row as any).card_image_url : null,
  })
})

// GET /api/member/medical-card — member's own medical card status (app_session auth)
app.get('/api/member/medical-card', async (c) => {
  const db = (c.env as any).DB as D1Database
  const sessionId = getCookie(c, 'app_session') || ''
  if (!sessionId) return c.json({ ok: false, error: 'AUTH_REQUIRED', code: 'AUTH_REQUIRED' }, 401)
  const sess = await db.prepare(
    `SELECT member_no FROM app_sessions WHERE session_id=? AND expires_at>datetime('now')`
  ).bind(sessionId).first() as any
  if (!sess) return c.json({ ok: false, error: 'AUTH_REQUIRED', code: 'AUTH_REQUIRED' }, 401)
  const memberNo = sess.member_no

  // Get member name info for HMMP login display
  const member = await db.prepare(
    `SELECT name_zh, name_en FROM members WHERE member_no=?`
  ).bind(memberNo).first() as any

  // Get medical card application (defensive: card_no / card_image_url may not exist yet)
  let app_row: any = null
  try {
    app_row = await db.prepare(
      `SELECT status, card_no, card_image_url FROM medical_card_applications WHERE member_no=? LIMIT 1`
    ).bind(memberNo).first()
  } catch (_) {
    try {
      app_row = await db.prepare(
        `SELECT status, card_no, NULL AS card_image_url FROM medical_card_applications WHERE member_no=? LIMIT 1`
      ).bind(memberNo).first()
    } catch (__) {
      try {
        app_row = await db.prepare(
          `SELECT status, NULL AS card_no, NULL AS card_image_url FROM medical_card_applications WHERE member_no=? LIMIT 1`
        ).bind(memberNo).first()
      } catch (___) {}
    }
  }

  return c.json({
    ok: true,
    member_no: memberNo,
    name_zh: member?.name_zh || '',
    name_en: member?.name_en || '',
    status:        app_row ? (app_row as any).status       : null,
    card_no:       app_row ? (app_row as any).card_no      : null,
    card_image_url:app_row ? (app_row as any).card_image_url : null,
  })
})

// ════════════════════════════════════════════════════════════════════════════════
// HMVod API
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/hmvod/settings — get WA number for staff (public, used by PWA to build WA link)
app.get('/api/hmvod/settings', async (c) => {
  const db = (c.env as any).DB as D1Database
  const row = await db.prepare(`SELECT value FROM app_settings WHERE key='hmvod_wa_number'`).first() as any
  return c.json({ ok: true, wa_number: row?.value || '' })
})

// PUT /api/admin/hmvod/settings — update WA number (admin only)
app.put('/api/admin/hmvod/settings', async (c) => {
  const db = (c.env as any).DB as D1Database
  const sessionId = getSessionToken(c) || ''
  if (!sessionId) return c.json({ ok: false, error: 'AUTH_REQUIRED' }, 401)
  const sess = await db.prepare(`SELECT id FROM admin_sessions WHERE token=? AND expires_at>datetime('now')`).bind(sessionId).first()
  if (!sess) return c.json({ ok: false, error: 'AUTH_REQUIRED' }, 401)
  const { wa_number } = await c.req.json() as any
  if (!wa_number) return c.json({ ok: false, error: 'missing wa_number' }, 400)
  const clean = String(wa_number).replace(/\D/g, '')
  await db.prepare(`INSERT INTO app_settings(key,value,label,updated_at) VALUES('hmvod_wa_number',?,?,datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
    .bind(clean, 'HMVod 職員 WhatsApp 號碼').run()
  return c.json({ ok: true, wa_number: clean })
})

// POST /api/hmvod/apply — record application (called when member taps send WA)
app.post('/api/hmvod/apply', async (c) => {
  const db = (c.env as any).DB as D1Database
  let body: any = {}
  try { body = await c.req.json() } catch (_) {}
  const { member_no, name_zh, name_en, phone } = body
  if (!member_no || !phone) return c.json({ ok: false, error: 'missing fields' }, 400)

  // Check if already applied by phone
  const existing = await db.prepare(
    `SELECT id FROM hmvod_applications WHERE phone=? LIMIT 1`
  ).bind(String(phone)).first() as any
  if (existing) return c.json({ ok: false, error: 'ALREADY_APPLIED', message: '此電話號碼已申請過' })

  await db.prepare(
    `INSERT INTO hmvod_applications(member_no,name_zh,name_en,phone,status,created_at,updated_at)
     VALUES(?,?,?,?,'PENDING',datetime('now'),datetime('now'))`
  ).bind(String(member_no), String(name_zh||''), String(name_en||''), String(phone)).run()
  return c.json({ ok: true })
})

// GET /api/hmvod/check — check if member already applied
app.get('/api/hmvod/check', async (c) => {
  const db = (c.env as any).DB as D1Database
  const phone = c.req.query('phone') || ''
  if (!phone) return c.json({ ok: true, applied: false })
  const row = await db.prepare(`SELECT id,status,created_at FROM hmvod_applications WHERE phone=? LIMIT 1`).bind(phone).first() as any
  return c.json({ ok: true, applied: !!row, status: row?.status || null, created_at: row?.created_at || null })
})

// GET /api/admin/hmvod/applications — list all (admin)
app.get('/api/admin/hmvod/applications', async (c) => {
  const db = (c.env as any).DB as D1Database
  const sessionId = getSessionToken(c) || ''
  if (!sessionId) return c.json({ ok: false, error: 'AUTH_REQUIRED' }, 401)
  const sess = await db.prepare(`SELECT id FROM admin_sessions WHERE token=? AND expires_at>datetime('now')`).bind(sessionId).first()
  if (!sess) return c.json({ ok: false, error: 'AUTH_REQUIRED' }, 401)
  const rows = await db.prepare(
    `SELECT id,member_no,name_zh,name_en,phone,status,notes,created_at,updated_at
     FROM hmvod_applications ORDER BY created_at DESC`
  ).all() as any
  return c.json({ ok: true, applications: rows.results || [] })
})

// PUT /api/admin/hmvod/applications/:id — update status/notes (admin)
app.put('/api/admin/hmvod/applications/:id', async (c) => {
  const db = (c.env as any).DB as D1Database
  const sessionId = getSessionToken(c) || ''
  if (!sessionId) return c.json({ ok: false, error: 'AUTH_REQUIRED' }, 401)
  const sess = await db.prepare(`SELECT id FROM admin_sessions WHERE token=? AND expires_at>datetime('now')`).bind(sessionId).first()
  if (!sess) return c.json({ ok: false, error: 'AUTH_REQUIRED' }, 401)
  const id = c.req.param('id')
  let body: any = {}
  try { body = await c.req.json() } catch (_) {}
  const { status, notes } = body
  await db.prepare(
    `UPDATE hmvod_applications SET status=?,notes=?,updated_at=datetime('now') WHERE id=?`
  ).bind(String(status||'PENDING'), String(notes||''), id).run()
  return c.json({ ok: true })
})

// ─── Family Tree API (FAMILY_TREE_API_KEY Bearer auth) ────────────────────────
// 共用鑑權 helper（inline，不修改任何現有函數）
function getFamilyTreeApiKey(c: any): string | undefined {
  return (c.req.header('Authorization') || '').replace('Bearer ', '') || undefined
}

// 1. POST /api/member/verify — 跨 app 驗證會員身份
app.post('/api/member/verify', async (c) => {
  const db = (c.env as any).DB as D1Database
  const apiKey = getFamilyTreeApiKey(c)
  if (!apiKey || apiKey !== (c.env as any).FAMILY_TREE_API_KEY) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  let body: { member_no?: string } = {}
  try { body = await c.req.json() } catch (_) {}
  const memberNo = (body.member_no || '').trim()
  if (!memberNo) return c.json({ ok: false, error: '缺少 member_no' }, 400)
  const member = await db.prepare(
    `SELECT member_no, status, expires_at, member_type FROM members WHERE member_no = ?`
  ).bind(memberNo).first<{ member_no: string; status: string; expires_at: string; member_type: string }>()
  if (!member) return c.json({ ok: false, error: 'not found' }, 404)
  return c.json({ ok: true, member_no: member.member_no, status: member.status, expires_at: member.expires_at, member_type: member.member_type })
})

// 2. POST /api/family-tree/members — 新增純節點成員
app.post('/api/family-tree/members', async (c) => {
  const db = (c.env as any).DB as D1Database
  const apiKey = getFamilyTreeApiKey(c)
  if (!apiKey || apiKey !== (c.env as any).FAMILY_TREE_API_KEY) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  let body: {
    name_zh?: string; managed_by?: string;
    name_en?: string; gender?: string; birth_year?: number;
    deceased_date?: string; relation?: string; district?: string;
  } = {}
  try { body = await c.req.json() } catch (_) {}

  // 驗證必填
  if (!body.name_zh?.trim()) return c.json({ ok: false, error: '缺少必填欄位 name_zh' }, 400)
  if (!body.managed_by?.trim()) return c.json({ ok: false, error: '缺少必填欄位 managed_by' }, 400)

  // 驗證代管人存在
  const managedByNo = body.managed_by.trim()
  const guardian = await db.prepare(`SELECT member_no FROM members WHERE member_no = ?`).bind(managedByNo).first()
  if (!guardian) return c.json({ ok: false, error: `代管人 ${managedByNo} 不存在` }, 400)

  const memberNo = await nextMemberNo(db)
  const now = new Date().toISOString()
  const deceasedDate = body.deceased_date?.trim() || null
  const statusVal = deceasedDate ? 'INACTIVE' : 'ACTIVE'

  await db.prepare(`
    INSERT INTO members
      (member_no, tier, name_zh, name_en, phone, gender, birth_year,
       district, relation, kyc_status, role, expires_at, created_at,
       source, status, member_type, managed_by, deceased_date)
    VALUES (?, 'FAMILY', ?, ?, '', ?, ?, ?, ?, 'DONE', 'CoExplorery', '2099-12-31', ?, 'family-tree', ?, 'NODE_ONLY', ?, ?)
  `).bind(
    memberNo,
    body.name_zh.trim(),
    body.name_en?.trim() || '',
    body.gender || '',
    body.birth_year ?? null,
    body.district?.trim() || '',
    body.relation?.trim() || '',
    now,
    statusVal,
    managedByNo,
    deceasedDate
  ).run()

  return c.json({ ok: true, member_no: memberNo, member_type: 'NODE_ONLY' }, 201)
})

// 3. PATCH /api/family-tree/members/:no — 更新純節點成員 / 升級為正式會員
app.patch('/api/family-tree/members/:no', async (c) => {
  const db = (c.env as any).DB as D1Database
  const apiKey = getFamilyTreeApiKey(c)
  if (!apiKey || apiKey !== (c.env as any).FAMILY_TREE_API_KEY) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  const no = c.req.param('no')
  const existing = await db.prepare(
    `SELECT member_no, phone, member_type FROM members WHERE member_no = ?`
  ).bind(no).first<{ member_no: string; phone: string; member_type: string }>()
  if (!existing) return c.json({ ok: false, error: 'not found' }, 404)

  let body: {
    name_zh?: string; name_en?: string; gender?: string; birth_year?: number | null;
    district?: string; deceased_date?: string | null; managed_by?: string;
    member_type?: string; phone?: string; status?: string;
  } = {}
  try { body = await c.req.json() } catch (_) {}

  // 升級 guard：member_type → REGISTERED
  if (body.member_type === 'REGISTERED') {
    const phoneToUse = (body.phone || existing.phone || '').replace(/\D/g, '')
    if (!phoneToUse) return c.json({ ok: false, error: '升級需有效電話' }, 400)
    const phoneCheck = validateHKPhone(phoneToUse)
    if (!phoneCheck.ok) return c.json({ ok: false, error: phoneCheck.error || '升級需有效電話' }, 400)
    // 檢查電話是否已屬其他 REGISTERED 成員
    const conflict = await db.prepare(
      `SELECT member_no FROM members WHERE phone = ? AND member_type = 'REGISTERED' AND member_no != ?`
    ).bind(phoneToUse, no).first()
    if (conflict) return c.json({ ok: false, error: '此電話已屬其他會員' }, 409)
    // 確保 phone 也加入更新
    if (!body.phone) body.phone = phoneToUse
  }

  // 驗證 managed_by（若有傳）
  if (body.managed_by) {
    const g = await db.prepare(`SELECT member_no FROM members WHERE member_no = ?`).bind(body.managed_by).first()
    if (!g) return c.json({ ok: false, error: `代管人 ${body.managed_by} 不存在` }, 400)
  }

  // 若 deceased_date 有值且未明確傳 status，自動設 INACTIVE
  if (body.deceased_date && body.status === undefined) {
    body.status = 'INACTIVE'
  }

  // 組合 UPDATE 欄位（只更新有傳入的）
  const allowed: (keyof typeof body)[] = [
    'name_zh', 'name_en', 'gender', 'birth_year', 'district',
    'deceased_date', 'managed_by', 'member_type', 'phone', 'status'
  ]
  const fields: string[] = []
  const vals: any[] = []
  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`)
      vals.push(body[key])
    }
  }
  if (!fields.length) return c.json({ ok: false, error: '沒有資料需要更新' }, 400)

  await db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE member_no = ?`)
    .bind(...vals, no).run()

  return c.json({ ok: true })
})

// 4. GET /api/family-tree/members/:no — 讀取成員完整資料
app.get('/api/family-tree/members/:no', async (c) => {
  const db = (c.env as any).DB as D1Database
  const apiKey = getFamilyTreeApiKey(c)
  if (!apiKey || apiKey !== (c.env as any).FAMILY_TREE_API_KEY) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  const no = c.req.param('no')
  const member = await db.prepare(`
    SELECT member_no, name_zh, name_en, gender, birth_year,
           district, tier, member_type, managed_by, deceased_date,
           status, expires_at
    FROM members WHERE member_no = ?
  `).bind(no).first()
  if (!member) return c.json({ ok: false, error: 'not found' }, 404)
  return c.json({ ok: true, member })
})

// ═══════════════════════════════════════════════════════════════════════════════
export default app
