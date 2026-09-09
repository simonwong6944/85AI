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
import { HK_DISTRICTS, HANDOFF_TOKEN_TTL_SECONDS, SESSION_DAYS } from './lib/constants'
import { dashboardHtml, comingSoonHtml, adminColinkerySectionHtml, qrRegisterHtml, adminQrHtml, walletHtml, teamConfirmHtml, coworkeryAppHtml, brandFormHtml, memberProfileHtml, colinkerypwaHtml, partnerApplyHtml, qrCompleteHtml, signupSubHtml, signupMainHtml, adminHtml, pwaAppHtml, newAdminShellHtml } from './lib/html-templates'

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
  FAMILY_TREE_API_KEY?: string    // HMAC-SHA256 signing secret for family-tree handoff token（Cloudflare Secret）
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
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage4] signupMainHtml — pure mechanical move


// ─── Signup Sub HTML ──────────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage4] signupSubHtml — pure mechanical move

// ─── Admin HTML ───────────────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage4] adminHtml — pure mechanical move

// ─── Member Profile HTML ──────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] memberProfileHtml — pure mechanical move

// ─── New /admin Shell (Login-protected) ──────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage5] newAdminShellHtml — pure mechanical move (final template, 5 script blocks)

// ─── CoWorkery 長者手機打卡頁 ──────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] coworkeryAppHtml — pure mechanical move

// ─── PWA App HTML ─────────────────────────────────────────────────────────────
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage5] pwaAppHtml — pure mechanical move (HIGH-RISK large inline JS app, single commit)

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
// [MOVED to src/lib/html-templates.ts @ Wave3/Stage2] walletHtml — pure mechanical move


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

  /* ── 建立 app_session（httpOnly cookie）── */
  const sessionId = makeToken()                              // 32-byte opaque hex token
  const expiresAt = sessionExpiry(SESSION_DAYS * 24)         // SESSION_DAYS 天；常數唯一定義於 constants.ts
  try {
    await db.prepare(
      `INSERT INTO app_sessions (session_id, member_no, expires_at) VALUES (?, ?, ?)`
    ).bind(sessionId, member.member_no, expiresAt).run()
  } catch (_) { /* non-fatal：session 建立失敗不阻礙登入，只影響 handoff */ }
  setCookie(c, 'app_session', sessionId, {
    httpOnly: true,
    secure:   true,
    sameSite: 'Lax',
    path:     '/',
    maxAge:   SESSION_DAYS * 24 * 3600,
    // 不設 domain → host-only cookie
  })

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
  await db.prepare(`DELETE FROM benefits WHERE id=?`).bind(parseInt(c.req.param('id'))).run()
  return c.json({ ok: true })
})

// GET /api/admin/benefits/:id/claims — claim records with member info
app.get('/api/admin/benefits/:id/claims', async (c) => {
  const db = (c.env as any).DB as D1Database
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
// body: { phone: string (必需), member_no?: string (optional 精準查) }
// normalize：剝非數字 → 若長度>8 且以 852 開頭則剝前綴 → 取尾 8 位
function normalizePhone(raw: string): string {
  let s = raw.replace(/\D/g, '')
  if (s.length > 8 && s.startsWith('852')) s = s.slice(3)
  return s.slice(-8)
}
app.post('/api/member/verify', async (c) => {
  const db = (c.env as any).DB as D1Database
  const apiKey = getFamilyTreeApiKey(c)
  if (!apiKey || apiKey !== (c.env as any).FAMILY_TREE_API_KEY) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  let body: { member_no?: string; phone?: string } = {}
  try { body = await c.req.json() } catch (_) {}
  const memberNo = (body.member_no || '').trim()
  const phoneRaw = (body.phone    || '').trim()
  // phone 必需；member_no optional
  if (!phoneRaw) return c.json({ ok: false, error: '缺少 phone' }, 400)
  const phoneNorm = normalizePhone(phoneRaw)

  // 統一 401 防列舉：查無、NODE_ONLY、phone 不夾、撞多筆，全部同一 body
  const FAIL = { ok: false, error: '驗證失敗' } as const

  type MemberRow = {
    member_no: string; status: string; expires_at: string; member_type: string
    name_zh: string; tier: string; gender: string; birth_year: number | null; phone: string
  }

  let member: MemberRow | null = null

  if (memberNo) {
    // 有 member_no → 精準查，再比對 phone
    member = await db.prepare(
      `SELECT member_no, status, expires_at, member_type, name_zh, tier, gender, birth_year, phone
       FROM members WHERE member_no = ?`
    ).bind(memberNo).first<MemberRow>()
    if (!member) return c.json(FAIL, 401)
    if (member.member_type === 'NODE_ONLY') return c.json(FAIL, 401)
    if (!member.phone) return c.json(FAIL, 401)
    if (normalizePhone(member.phone) !== phoneNorm) return c.json(FAIL, 401)
  } else {
    // 只有 phone → 查所有結果，filter NODE_ONLY
    const rows = await db.prepare(
      `SELECT member_no, status, expires_at, member_type, name_zh, tier, gender, birth_year, phone
       FROM members WHERE phone = ?`
    ).bind(phoneNorm).all<MemberRow>()
    const candidates = (rows.results ?? []).filter(
      (r) => r.member_type !== 'NODE_ONLY' && r.phone
    )
    if (candidates.length === 0) return c.json(FAIL, 401)
    if (candidates.length > 1) {
      // 撞多筆：記 log 畀跟進，對外一律 401
      console.error(`[verify] phone 撞多筆 phone=${phoneNorm} count=${candidates.length}`)
      return c.json(FAIL, 401)
    }
    member = candidates[0]
    // 再比對 normalizePhone（DB 應已存純8位，double-check）
    if (normalizePhone(member.phone) !== phoneNorm) return c.json(FAIL, 401)
  }

  return c.json({
    ok:          true,
    member_no:   member.member_no,
    name_zh:     member.name_zh,
    gender:      member.gender   ?? '',
    birth_year:  member.birth_year ?? null,
    tier:        member.tier,
    status:      member.status,
    member_type: member.member_type,
  })
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

// 5. GET /api/family-tree/members/:no/children — 查直屬子節點 (mode=self) 或整棵樹 (mode=root)
// mode=self（預設）：WHERE parent_no=:no OR managed_by=:no，回直屬子節點
// mode=root：往上爬至 root，再 BFS 往下展開整棵樹（含 root 節點本身）
app.get('/api/family-tree/members/:no/children', async (c) => {
  const db = (c.env as any).DB as D1Database
  const apiKey = getFamilyTreeApiKey(c)
  if (!apiKey || apiKey !== (c.env as any).FAMILY_TREE_API_KEY) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  const no  = c.req.param('no')
  const mode = (c.req.query('mode') || 'self') === 'root' ? 'root' : 'self'

  // ── 共用欄位（明確排除 phone / password_hash / kyc / id_prefix / 銀行）──
  const SELECT_COLS = `member_no, name_zh, tier, relation, member_type, managed_by,
                       deceased_date, status, parent_no`

  // ── 確認起點 member_no 存在 ───────────────────────────────────────────────
  const anchor = await db.prepare(
    `SELECT member_no, parent_no FROM members WHERE member_no = ? LIMIT 1`
  ).bind(no).first<{ member_no: string; parent_no: string | null }>()
  if (!anchor) return c.json({ ok: false, error: 'not found' }, 404)

  // ─────────────────────────────────────────────────────────────────────────
  // mode=self：一條 query 取直屬子節點
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'self') {
    const rows = await db.prepare(
      `SELECT ${SELECT_COLS} FROM members WHERE parent_no = ? OR managed_by = ? ORDER BY member_no`
    ).bind(no, no).all()
    return c.json({ ok: true, mode: 'self', parent: no, nodes: rows.results })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // mode=root：第一步往上尋根，第二步 BFS 往下展開
  // ─────────────────────────────────────────────────────────────────────────

  // 第一步：往上爬至 root（最多 20 層，Set 防 cycle）
  const MAX_ANCESTORS = 20
  const visited = new Set<string>()
  let cur = anchor.member_no
  let curParent: string | null = anchor.parent_no || null
  visited.add(cur)

  for (let i = 0; i < MAX_ANCESTORS && curParent; i++) {
    if (visited.has(curParent)) break       // cycle 保護
    visited.add(curParent)
    const row = await db.prepare(
      `SELECT member_no, parent_no FROM members WHERE member_no = ? LIMIT 1`
    ).bind(curParent).first<{ member_no: string; parent_no: string | null }>()
    if (!row) break                          // parent 查唔到，停
    cur = row.member_no
    curParent = row.parent_no || null
  }
  const rootNo = cur   // 爬到最頂或超出 20 層，用當前節點做 root

  // 第二步：BFS 由 root 往下（深度上限 20、節點上限 500、Set 防 cycle）
  const MAX_DEPTH  = 20
  const MAX_NODES  = 500
  const seen       = new Set<string>()
  const nodes: any[] = []
  let truncated    = false

  // 先把 root 本身加入 nodes
  const rootRow = await db.prepare(
    `SELECT ${SELECT_COLS} FROM members WHERE member_no = ? LIMIT 1`
  ).bind(rootNo).first()
  if (rootRow) {
    nodes.push(rootRow)
    seen.add(rootNo)
  }

  // BFS queue：每個元素是 { memberNos: string[], depth: number }
  let queue: string[] = [rootNo]

  for (let depth = 0; depth < MAX_DEPTH && queue.length > 0; depth++) {
    if (nodes.length >= MAX_NODES) { truncated = true; break }

    // 組 IN 清單（去重）
    const batch = [...new Set(queue)]
    queue = []

    // SQLite IN clause placeholder
    const placeholders = batch.map(() => '?').join(',')
    const childRows = await db.prepare(
      `SELECT ${SELECT_COLS} FROM members
       WHERE parent_no IN (${placeholders}) OR managed_by IN (${placeholders})
       ORDER BY member_no`
    ).bind(...batch, ...batch).all<Record<string, unknown>>()

    for (const row of childRows.results) {
      const mno = row.member_no as string
      if (seen.has(mno)) continue            // 防重複/cycle
      seen.add(mno)
      nodes.push(row)
      queue.push(mno)
      if (nodes.length >= MAX_NODES) { truncated = true; break }
    }
    if (truncated) break
  }

  return c.json({ ok: true, mode: 'root', root: rootNo, nodes, truncated })
})

// 6. POST /api/family-tree/lookup-by-phone — 以電話查會員（供家庭樹系統使用）
// body: { phone: string }
// 成功（有會員）→ 200 { ok:true, is_member:true, member_no, name_zh, status, member_type }
// 成功（查無）  → 200 { ok:true, is_member:false }
// 格式錯 / 空  → 400 { ok:false, error: <validateHKPhone 錯誤訊息> }
// key 錯       → 401 { ok:false, error:'Unauthorized' }
app.post('/api/family-tree/lookup-by-phone', async (c) => {
  const db = (c.env as any).DB as D1Database
  const apiKey = getFamilyTreeApiKey(c)
  if (!apiKey || apiKey !== (c.env as any).FAMILY_TREE_API_KEY) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  let body: { phone?: string } = {}
  try { body = await c.req.json() } catch (_) {}
  const phoneRaw = (body.phone || '').trim()
  if (!phoneRaw) return c.json({ ok: false, error: '請填寫電話號碼' }, 400)

  // normalize：剝非數字 → 若長度>8 且以 852 開頭剝前綴 → 取尾 8 位
  // 必須先 normalize 再餵 validateHKPhone（後者只接受 8 位）
  const phoneNorm = normalizePhone(phoneRaw)
  const phoneCheck = validateHKPhone(phoneNorm)
  if (!phoneCheck.ok) return c.json({ ok: false, error: phoneCheck.error }, 400)

  try {
    const member = await db.prepare(
      `SELECT member_no, name_zh, status, member_type
       FROM members WHERE phone = ? LIMIT 1`
    ).bind(phoneNorm).first<{
      member_no: string; name_zh: string; status: string; member_type: string
    }>()
    if (!member) return c.json({ ok: true, is_member: false })
    return c.json({
      ok:          true,
      is_member:   true,
      member_no:   member.member_no,
      name_zh:     member.name_zh,
      status:      member.status,
      member_type: member.member_type,
    })
  } catch (e) {
    console.error('[lookup-by-phone] DB error:', e)
    return c.json({ ok: false, error: 'Internal server error' }, 500)
  }
})

// ─── POST /api/family-tree/handoff — 簽發短期 handoff token 俾家族樹 sub-app ──
//
// 認人：讀 app_session cookie → 查 app_sessions → 取 member_no。
// 簽名：HMAC-SHA256（Web Crypto），secret = FAMILY_TREE_API_KEY（Cloudflare Secret）。
// Payload（JSON）：{ member_no, exp }，exp = 當前時間（秒）+ HANDOFF_TOKEN_TTL_SECONDS。
// 格式：base64url(payload) + '.' + base64url(signature)（輕量自定義，唔用 JWT library）。
// 家族樹 sub-app 用相同 key 驗 HMAC，確認 exp 未過期，即可信任 member_no。
//
// 錯誤：401 未登入 / session 過期；503 FAMILY_TREE_API_KEY 未設定。
app.post('/api/family-tree/handoff', async (c) => {
  const db = (c.env as any).DB as D1Database

  /* ── 1. 驗 app_session cookie → 取 member_no ── */
  const sessionId = getCookie(c, 'app_session') || ''
  if (!sessionId) {
    return c.json({ ok: false, error: '請先登入', code: 'AUTH_REQUIRED' }, 401)
  }
  const sess = await db.prepare(
    `SELECT member_no FROM app_sessions WHERE session_id=? AND expires_at>datetime('now')`
  ).bind(sessionId).first() as { member_no: string } | null
  if (!sess) {
    return c.json({ ok: false, error: '登入已過期，請重新登入', code: 'AUTH_REQUIRED' }, 401)
  }
  const memberNo = sess.member_no

  /* ── 2. 確認 FAMILY_TREE_API_KEY 已設（Cloudflare Secret） ── */
  const secret = (c.env as any).FAMILY_TREE_API_KEY as string | undefined
  if (!secret) {
    // Key 未設定 → 服務不可用；唔 hardcode fallback
    console.error('[handoff] FAMILY_TREE_API_KEY 未設定，請於 Cloudflare Secret 配置')
    return c.json({ ok: false, error: '服務暫不可用', code: 'CONFIG_ERROR' }, 503)
  }

  /* ── 3. 組 payload，exp = now + TTL（秒） ── */
  const now = Math.floor(Date.now() / 1000)
  const exp = now + HANDOFF_TOKEN_TTL_SECONDS
  const payloadJson = JSON.stringify({ member_no: memberNo, exp })

  /* ── 4. HMAC-SHA256 簽名（Web Crypto，edge runtime 相容） ── */
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(payloadJson))

  /* ── 5. base64url encode（無 padding）── */
  const b64url = (buf: ArrayBuffer): string =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const payloadB64  = b64url(enc.encode(payloadJson).buffer as ArrayBuffer)
  const signatureB64 = b64url(sigBuffer)
  const token = `${payloadB64}.${signatureB64}`

  return c.json({ ok: true, token })
})

// ─── POST /api/session/init — 以 localStorage member_no 建立 app_session cookie ─
//
// ⚠️  暫時方案（Temporary measure）：
//     此 endpoint 由 client 自報 member_no；安全性依賴 member 存在校驗，
//     無法防止已知 member_no 的惡意方偽冒。
//     待 WhatsApp Business API 上線後，應改為：
//       (1) 後端驗 WA OTP / magic-link；
//       (2) 由後端查出 member_no，不接受 client 自報。
//     屆時此 endpoint 可廢棄並移除。
//
// 流程：讀 body.member_no → SELECT 驗存在 → INSERT app_sessions → setCookie app_session
// 錯誤：400 缺 member_no；401 member 不存在；500 DB 錯誤
app.post('/api/session/init', async (c) => {
  const db = (c.env as any).DB as D1Database

  /* ── 1. 讀 body ── */
  let body: { member_no?: string }
  try { body = await c.req.json() } catch (_) { return c.json({ ok: false, error: '無效請求' }, 400) }

  const memberNo = (body.member_no || '').trim()
  if (!memberNo) return c.json({ ok: false, error: '缺少 member_no' }, 400)

  /* ── 2. 驗 member 存在（只查存在，不拿多餘資料）── */
  let exists: { x: number } | null = null
  try {
    exists = await db.prepare(
      `SELECT 1 AS x FROM members WHERE member_no = ? LIMIT 1`
    ).bind(memberNo).first<{ x: number }>()
  } catch (_) { return c.json({ ok: false, error: '系統錯誤' }, 500) }

  if (!exists) return c.json({ ok: false, error: '會員不存在' }, 401)

  /* ── 3. 建立 app_session ── */
  const sessionId = makeToken()                        // 32-byte opaque hex（來自 auth.ts）
  const expiresAt = sessionExpiry(SESSION_DAYS * 24)   // SESSION_DAYS 來自 constants.ts，唯一定義點
  try {
    await db.prepare(
      `INSERT INTO app_sessions (session_id, member_no, expires_at) VALUES (?, ?, ?)`
    ).bind(sessionId, memberNo, expiresAt).run()
  } catch (_) { return c.json({ ok: false, error: 'Session 建立失敗' }, 500) }

  setCookie(c, 'app_session', sessionId, {
    httpOnly: true,
    secure:   true,
    sameSite: 'Lax',
    path:     '/',
    maxAge:   SESSION_DAYS * 24 * 3600,
    // 不設 domain → host-only cookie（只送 coeldery85.com，不帶 subdomain）
  })

  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
export default app
