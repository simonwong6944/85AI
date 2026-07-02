import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// ─── CORS for API ────────────────────────────────────────────────────────────
app.use('/api/*', cors())

// ─── Static assets ───────────────────────────────────────────────────────────
app.use('/shared.css', serveStatic({ root: './public' }))
app.use('/vendor/*', serveStatic({ root: './public' }))
app.use('/assets/*', serveStatic({ root: './public' }))

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
    const phoneClean = body.phone.replace(/\D/g, '')
    if (phoneClean.length < 8) return c.json({ ok: false, error: '電話號碼格式不正確' }, 400)

    // Check duplicate phone for same tier
    const existing = await db.prepare(
      'SELECT member_no FROM members WHERE phone = ? AND tier = ?'
    ).bind(phoneClean, body.tier || 'PRIMARY').first<{ member_no: string }>()
    if (existing) {
      return c.json({ ok: false, error: `此電話已登記，會員編號：${existing.member_no}` }, 409)
    }

    // Find parent for FAMILY tier
    let parentNo = ''
    let parentName = body.parentName || ''
    if (body.tier === 'FAMILY') {
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
    const expires = expiryDate(3)
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
      memberNo, body.tier || 'PRIMARY',
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
    if (body.applyMedical && body.medNameZh && body.medNameEn && body.medHkid) {
      await db.prepare(`
        INSERT INTO medical_card_applications
          (member_no, name_zh_full, name_en_full, hkid_prefix, phone)
        VALUES (?,?,?,?,?)
      `).bind(
        memberNo,
        body.medNameZh.trim(),
        body.medNameEn.trim().toUpperCase(),
        body.medHkid.trim().toUpperCase(),
        phoneClean
      ).run()
      medicalApplied = true
    }

    return c.json({
      ok: true,
      memberNo,
      nameZh: body.nameZh.trim(),
      nameEn: body.nameEn?.trim() || '',
      tier: body.tier || 'PRIMARY',
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
  const phone = c.req.query('phone')?.replace(/\D/g, '')
  if (!phone) return c.json({ ok: false, error: 'Missing phone' }, 400)
  const db = c.env.DB
  const row = await db.prepare(
    'SELECT member_no, name_zh, name_en, tier, role, expires_at, kyc_status FROM members WHERE phone = ? ORDER BY created_at LIMIT 1'
  ).bind(phone).first()
  if (!row) return c.json({ ok: false, error: '查無此電話號碼' }, 404)
  return c.json({ ok: true, member: row })
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
  const exportCsv = c.req.query('export') === 'csv'
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params: (string | number)[] = []
  if (tier) { where += ' AND tier = ?'; params.push(tier) }
  if (status) { where += ' AND status = ?'; params.push(status) }
  // no-op: deletion disabled by policy, all records visible
  if (source) { where += ' AND source = ?'; params.push(source) }
  if (district) { where += ' AND district = ?'; params.push(district) }
  if (search) {
    where += ' AND (name_zh LIKE ? OR name_en LIKE ? OR member_no LIKE ? OR phone LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const countRow = await db.prepare(
    `SELECT COUNT(*) as total FROM members ${where}`
  ).bind(...params).first<{ total: number }>()

  // CSV export — return all matching rows
  if (exportCsv) {
    const rows = await db.prepare(
      `SELECT member_no, tier, status, name_zh, name_en, phone, gender, birth_year,
              district, role, kyc_status, source, referrer_no, roadshow, roadshow_location,
              expires_at, created_at, notes, admin_notes
       FROM members ${where} ORDER BY created_at DESC`
    ).bind(...params).all()
    const header = 'member_no,tier,status,name_zh,name_en,phone,gender,birth_year,district,role,kyc_status,source,referrer_no,roadshow,roadshow_location,expires_at,created_at'
    const csv = header + '\n' + rows.results.map((m: any) =>
      [m.member_no,m.tier,m.status,m.name_zh,m.name_en,m.phone,m.gender,m.birth_year,
       m.district,m.role,m.kyc_status,m.source,m.referrer_no,m.roadshow,m.roadshow_location,
       m.expires_at,m.created_at].map((v: any) => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')
    ).join('\n')
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="members_${new Date().toISOString().slice(0,10)}.csv"`
    }})
  }

  const rows = await db.prepare(
    `SELECT member_no, tier, status, name_zh, name_en, phone, gender, district,
            role, kyc_status, source, referrer_no, roadshow, roadshow_location,
            expires_at, created_at, notes, admin_notes
     FROM members ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
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
  const [bySource, byDistrict, byMonth] = await Promise.all([
    db.prepare("SELECT source, COUNT(*) as cnt FROM members GROUP BY source ORDER BY cnt DESC").all(),
    db.prepare("SELECT district, COUNT(*) as cnt FROM members WHERE district!='' GROUP BY district ORDER BY cnt DESC LIMIT 10").all(),
    db.prepare("SELECT strftime('%Y-%m',created_at) as month, COUNT(*) as cnt FROM members GROUP BY month ORDER BY month DESC LIMIT 12").all(),
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
      byMonth: byMonth.results
    }
  })
})

// ─── API: Update member (admin) ───────────────────────────────────────────────
app.patch('/api/admin/members/:no', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const body = await c.req.json<{
    kyc_status?: string; role?: string; notes?: string; admin_notes?: string;
    status?: string; name_zh?: string; name_en?: string; phone?: string;
    gender?: string; birth_year?: number; district?: string;
    source?: string; referrer_no?: string; roadshow_location?: string; expires_at?: string;
  }>()
  const allowed = ['kyc_status','role','notes','admin_notes','status',
    'name_zh','name_en','phone','gender','birth_year','district',
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

  const rows = await db.prepare(`
    SELECT m.id, m.member_no, m.name_zh_full, m.name_en_full, m.hkid_prefix,
           m.phone, m.status, m.applied_at, m.sent_at, m.notes,
           mb.name_zh as member_name_zh, mb.district
    FROM medical_card_applications m
    LEFT JOIN members mb ON mb.member_no = m.member_no
    ${where}
    ORDER BY m.applied_at DESC
  `).bind(...params).all()

  if (exportCsv) {
    const header = 'ID,會員編號,中文全名,英文全名,HKID頭4位,電話,狀態,申請日期,傳送日期,備註'
    const lines = (rows.results as any[]).map(r =>
      [r.id, r.member_no, r.name_zh_full, r.name_en_full, r.hkid_prefix,
       r.phone, r.status, r.applied_at, r.sent_at||'', r.notes||'']
      .map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')
    )
    return new Response([header, ...lines].join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
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

// ─── Root: 85 AI Technology Limited Dashboard ────────────────────────────────
app.get('/', (c) => c.html(dashboardHtml()))

// ─── Membership module: /membership/* ────────────────────────────────────────
app.get('/membership',          (c) => c.html(homeHtml()))
app.get('/membership/login',    (c) => c.html(homeHtml()))
app.get('/membership/join',     (c) => c.html(signupMainHtml()))
app.get('/membership/join-family', (c) => c.html(signupSubHtml()))
app.get('/membership/admin',    (c) => c.html(adminHtml()))
app.get('/membership/card/:no', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const row = await db.prepare('SELECT * FROM members WHERE member_no = ?').bind(no).first<any>()
  if (!row) return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>查無此會員</h2><p>${no}</p><a href="/membership/join">立即登記</a></body></html>`, 404)
  return c.html(memberProfileHtml(row))
})

// ─── Future modules (placeholder) ────────────────────────────────────────────
app.get('/accounting',  (c) => c.html(comingSoonHtml('Accounting', '財務管理')))
app.get('/governance',  (c) => c.html(comingSoonHtml('Governance', '治理管理')))
app.get('/events',      (c) => c.html(comingSoonHtml('Events', '活動管理')))
app.get('/volunteers',  (c) => c.html(comingSoonHtml('Volunteers', '義工管理')))

// ─── Legacy redirects (old URLs → new URLs, keeps old links working) ──────────
app.get('/login',       (c) => c.redirect('/membership', 301))
app.get('/join',        (c) => c.redirect('/membership/join', 301))
app.get('/join-family', (c) => c.redirect('/membership/join-family', 301))
app.get('/admin',       (c) => c.redirect('/membership/admin', 301))
app.get('/member/:no',  (c) => c.redirect(`/membership/card/${c.req.param('no')}`, 301))
app.get('/poster',      (c) => c.redirect('/', 301))
app.get('/sop',         (c) => c.redirect('/', 301))

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
body{background:#F0EBD8;min-height:100vh;padding:20px 16px;font-size:16px;}
.container{max-width:420px;margin:0 auto;}
.brand-strip{display:flex;align-items:center;gap:12px;margin-bottom:24px;}
.brand-strip .mark{width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.brand-strip .mark img{width:44px;height:44px;object-fit:contain;}
.brand-strip .name .zh{font-family:"Noto Serif TC",serif;font-size:16px;color:var(--forest-deep);font-weight:700;letter-spacing:2px;line-height:1;}
.brand-strip .name .en{font-size:11px;color:var(--grey-2);letter-spacing:2px;margin-top:4px;}
.header-card{background:linear-gradient(135deg,#0d3e12 0%,#1B5E20 100%);color:#fff;padding:24px 22px;border-radius:4px;margin-bottom:20px;position:relative;overflow:hidden;}
.header-card::before{content:"85";position:absolute;right:-20px;bottom:-60px;font-family:"Noto Serif TC",serif;font-size:200px;font-weight:900;color:var(--ferrari);opacity:0.22;line-height:1;}
.header-card .tag{display:inline-block;background:var(--ferrari);color:#fff;padding:3px 10px;font-size:11px;letter-spacing:3px;font-weight:700;margin-bottom:12px;position:relative;z-index:2;}
.header-card h1{font-family:"Noto Serif TC",serif;font-size:30px;font-weight:900;letter-spacing:3px;line-height:1.2;margin-bottom:8px;position:relative;z-index:2;}
.header-card p{font-size:13px;opacity:0.9;line-height:1.6;position:relative;z-index:2;}
.form-card{background:#fff;padding:24px 22px;border-radius:4px;margin-bottom:16px;}
.form-card .step-note{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#FFF3B0;border-left:3px solid var(--ferrari);font-size:13px;color:var(--grey-1);margin-bottom:20px;line-height:1.5;}
.field{margin-bottom:18px;}
.field .label-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.field label{font-family:"Noto Serif TC",serif;font-size:15px;color:var(--forest-deep);font-weight:700;letter-spacing:1px;}
.field .req{color:var(--ferrari);font-size:12px;font-weight:700;}
.field .opt{color:var(--grey-3);font-size:11px;}
.field input,.field select{width:100%;padding:14px;border:2px solid var(--line);border-radius:4px;font-size:17px;font-family:inherit;color:var(--ink);background:#fff;transition:border 0.2s;}
.field input:focus,.field select:focus{outline:0;border-color:var(--forest);}
.field .hint{font-size:11px;color:var(--grey-3);margin-top:4px;line-height:1.5;}
.section-divider{padding:14px 0 10px;font-family:"Noto Serif TC",serif;font-size:13px;color:var(--grey-2);letter-spacing:3px;border-top:1px dashed var(--line);margin-top:8px;}
.gender-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.gender-row .g-btn{padding:12px 4px;border:2px solid var(--line);background:#fff;text-align:center;cursor:pointer;font-size:14px;font-family:inherit;color:var(--grey-1);border-radius:4px;font-weight:500;}
.gender-row .g-btn.active{border-color:var(--forest);background:var(--forest-pale);color:var(--forest-deep);font-weight:700;}
.consent{padding:14px;background:var(--forest-pale);border-radius:4px;font-size:12px;color:var(--grey-1);line-height:1.7;margin-bottom:20px;}
.consent label{display:flex;gap:10px;cursor:pointer;}
.consent input{width:20px;height:20px;margin-top:2px;flex-shrink:0;accent-color:var(--forest);}
.consent a{color:var(--forest);text-decoration:underline;}
/* Medical card opt-in block */
.medical-block{border:2px solid #1565C0;border-radius:6px;overflow:hidden;margin-bottom:20px;}
.medical-header{background:linear-gradient(135deg,#1565C0 0%,#1976D2 100%);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;user-select:none;}
.medical-header .mh-left{display:flex;align-items:center;gap:10px;}
.medical-header .mh-icon{font-size:24px;line-height:1;}
.medical-header .mh-title{font-family:"Noto Serif TC",serif;font-size:15px;font-weight:700;letter-spacing:1px;}
.medical-header .mh-sub{font-size:11px;opacity:0.85;margin-top:2px;letter-spacing:0.5px;}
.medical-header .mh-badge{background:#FFD600;color:#1A237E;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;letter-spacing:1px;white-space:nowrap;}
.medical-cta{background:#E8F0FE;padding:0;cursor:pointer;border-bottom:1px solid #C5CAE9;transition:background 0.15s;}
.medical-cta:hover{background:#D3E2FC;}
.medical-cta label{display:flex;align-items:center;gap:0;cursor:pointer;width:100%;}
.medical-cta-check{display:flex;align-items:center;justify-content:center;background:#1565C0;width:56px;height:64px;flex-shrink:0;}
.medical-cta-check input[type=checkbox]{width:24px;height:24px;accent-color:#fff;cursor:pointer;}
.medical-cta-text{flex:1;padding:14px 14px 14px 16px;}
.medical-cta-main{font-size:15px;color:#0D47A1;font-weight:700;font-family:"Noto Serif TC",serif;letter-spacing:0.5px;margin-bottom:4px;}
.medical-cta-sub{font-size:12px;color:#5C6BC0;line-height:1.5;}
.medical-cta-arrow{font-size:20px;color:#1565C0;padding-right:14px;flex-shrink:0;transition:transform 0.2s;}
.medical-cta-arrow.open{transform:rotate(180deg);}
.medical-extra{display:block;padding:16px;background:#fff;}
.medical-extra.show{display:block;}
.medical-extra .notice{background:#FFF8E1;border-left:3px solid #F9A825;padding:10px 12px;font-size:12px;color:#5D4037;line-height:1.6;margin-bottom:16px;border-radius:0 4px 4px 0;}
.medical-extra .field label{color:#1565C0;}
.medical-extra .field input{border-color:#90CAF9;}
.medical-extra .field input:focus{border-color:#1565C0;}
.medical-privacy{background:#E3F2FD;border-radius:4px;padding:12px 14px;font-size:11px;color:#37474F;line-height:1.8;margin-top:12px;}
.medical-privacy label{display:flex;gap:8px;cursor:pointer;align-items:flex-start;}
.medical-privacy input{width:18px;height:18px;flex-shrink:0;margin-top:1px;accent-color:#1565C0;}
.submit-btn{width:100%;padding:18px;background:var(--forest);color:#fff;border:0;border-radius:4px;font-size:18px;font-family:"Noto Serif TC",sans-serif;font-weight:700;letter-spacing:4px;cursor:pointer;box-shadow:0 4px 0 var(--forest-deep);transition:all 0.1s;}
.submit-btn:active{transform:translateY(2px);box-shadow:0 2px 0 var(--forest-deep);}
.submit-btn:disabled{background:var(--grey-3);box-shadow:0 4px 0 var(--grey-2);cursor:not-allowed;}
.footer-links{text-align:center;margin-top:20px;font-size:11px;color:var(--grey-3);line-height:1.8;}
.footer-links a{color:var(--forest);text-decoration:none;}
.success{display:none;text-align:center;}
.success.show{display:block;}
.success-icon{width:80px;height:80px;background:var(--forest);color:#fff;border-radius:50%;margin:20px auto 24px;display:flex;align-items:center;justify-content:center;font-size:44px;animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1);}
@keyframes pop{0%{transform:scale(0);}100%{transform:scale(1);}}
.success h1{font-family:"Noto Serif TC",serif;font-size:28px;color:var(--forest-deep);margin-bottom:6px;letter-spacing:3px;}
.success .welcome{font-size:14px;color:var(--grey-2);margin-bottom:24px;}
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
.action-btn{padding:14px 8px;background:#fff;border:2px solid var(--forest);color:var(--forest-deep);font-family:"Noto Serif TC",serif;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;border-radius:4px;text-align:center;}
.action-btn.red{border-color:var(--ferrari);color:var(--ferrari);}
.wa-link{display:block;width:100%;padding:16px;background:var(--forest);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:15px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:12px;}
.err-msg{background:var(--ferrari-pale);border:1px solid var(--ferrari);color:var(--ferrari-deep);padding:12px 16px;border-radius:4px;font-size:13px;margin-bottom:16px;display:none;}
.err-msg.show{display:block;}
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

  <!-- Form Section -->
  <div id="formSection">
    <div class="header-card">
      <div class="tag">◆ 免費入會</div>
      <h1>申請老有卡</h1>
      <p>55歲或以上長者 · 免費登記成為會員<br>即刻攞數碼會員卡</p>
    </div>

    <div class="err-msg" id="errMsg"></div>

    <form id="signupForm" onsubmit="return false;">

      <!-- ── 醫健卡 opt-in ── -->
      <div class="medical-block">
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
        <div class="medical-cta" id="medCta" style="background:#C8D8FA" onclick="document.getElementById('applyMedical').click();toggleMedical(document.getElementById('applyMedical'))">
          <label onclick="event.preventDefault()">
            <div class="medical-cta-check">
              <input type="checkbox" id="applyMedical" onchange="toggleMedical(this)" onclick="event.stopPropagation()" checked>
            </div>
            <div class="medical-cta-text">
              <div class="medical-cta-main">✅ 已勾選申請免費醫健卡</div>
              <div class="medical-cta-sub">一次登記，同時擁有老有卡 + 醫健卡 · NGO 職員以 WhatsApp 聯絡辦理</div>
            </div>
            <div class="medical-cta-arrow open" id="medArrow">▼</div>
          </label>
        </div>
        <div class="medical-extra" id="medicalExtra">
          <div class="notice">
            ⚕️ 醫健卡資料必須與<strong>香港身份證完全一致</strong>，請確保中英文姓名及身份證號碼頭4位正確無誤。
          </div>
          <div class="field">
            <div class="label-row">
              <label for="medNameZh">中文全名 <span style="font-size:10px;font-weight:400;color:#888;">（與身份證相同）</span></label>
              <span class="req">✽ 必填</span>
            </div>
            <input id="medNameZh" type="text" placeholder="例：陳大文" oninput="syncNameFromMedical()">
          </div>
          <div class="field">
            <div class="label-row">
              <label for="medNameEn">英文全名 <span style="font-size:10px;font-weight:400;color:#888;">（與身份證相同）</span></label>
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
            <label for="nameZh">中文姓名</label>
            <span class="req">✽ 必填</span>
          </div>
          <input id="nameZh" type="text" placeholder="例：陳大文" autocomplete="name" oninput="syncNameFromMain()">
        </div>

        <div class="field">
          <div class="label-row">
            <label for="nameEn">英文姓名</label>
            <span class="req">✽ 必填</span>
          </div>
          <input id="nameEn" type="text" placeholder="例：CHAN TAI MAN" autocomplete="name" style="text-transform:uppercase;" oninput="syncNameFromMain()">
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
            <button type="button" class="g-btn" data-v="X" onclick="setGender('X',this)">其他</button>
          </div>
        </div>

        <div class="field">
          <div class="label-row"><label for="birthYear">出生年份</label><span class="req">✽ 必填</span></div>
          <input id="birthYear" type="number" placeholder="例：1960" inputmode="numeric" min="1920" max="1972">
          <div class="hint">請填寫 1972 年或以前（55歲或以上）</div>
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
        立即登記（兩卡同申）
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
      <div class="gc-tier">PRIMARY MEMBER</div>
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

    <!-- Card image preview (rendered canvas) -->
    <div id="cardImgWrap" style="display:none;margin:0 auto 16px;max-width:340px;">
      <img id="cardImg" style="width:100%;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.18);" alt="會員卡">
    </div>

    <!-- Medical card notice (shown if applied) -->
    <div id="medSuccessNotice" style="display:none;background:#E3F2FD;border:1.5px solid #1565C0;border-radius:6px;padding:14px 16px;margin-bottom:16px;text-align:left;">
      <div style="font-size:15px;font-weight:700;color:#0D47A1;margin-bottom:6px;">🏥 醫健卡申請已提交</div>
      <div style="font-size:13px;color:#1A237E;line-height:1.7;">
        你的醫健卡申請已記錄，<strong>香港商貿慈善基金</strong>職員將會以<strong>電話或 WhatsApp</strong> 聯絡你安排發卡手續。<br>
        <span style="font-size:11px;color:#5C6BC0;">如有查詢請致電：9888 5708 或瀏覽 hmmp.com.hk</span>
      </div>
    </div>

    <div class="action-row">
      <button class="action-btn" id="saveImgBtn" onclick="saveCardImage()">💾 儲存卡圖</button>
      <button class="action-btn red" onclick="window.location.href='/membership/join-family'">家人申請</button>
    </div>

    <button class="wa-link" id="waImgBtn" onclick="shareCardToWA()" style="width:100%;border:0;cursor:pointer;">
      📱 WhatsApp 分享會員卡圖片
    </button>

    <div class="footer-links">
      <a id="myPageLink" href="#" style="color:var(--forest);font-weight:700;">🪪 查看我的會員頁</a><br>
      <a href="/membership/login" style="color:var(--forest);">🔐 下次用電話登入</a><br>
      <a href="/membership/join">重新登記</a> · <a href="/">返回首頁</a>
    </div>
  </div>
</div>

<script>
var selectedGender = '';
function setGender(v, btn) {
  selectedGender = v;
  document.querySelectorAll('.g-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function syncNameFromMain() {
  // When user types in main form nameZh/nameEn, sync to medical card fields if medical is checked
  if (!document.getElementById('applyMedical').checked) return;
  var zh = document.getElementById('nameZh').value.trim();
  var en = document.getElementById('nameEn').value.trim().toUpperCase();
  if (zh) document.getElementById('medNameZh').value = zh;
  if (en) document.getElementById('medNameEn').value = en;
}

function syncNameFromMedical() {
  // When user types in medical card nameZh/nameEn, sync to main form fields
  var zh = document.getElementById('medNameZh').value.trim();
  var en = document.getElementById('medNameEn').value.trim().toUpperCase();
  if (zh) document.getElementById('nameZh').value = zh;
  if (en) document.getElementById('nameEn').value = en;
}

function toggleMedical(cb) {
  var extra = document.getElementById('medicalExtra');
  var arrow = document.getElementById('medArrow');
  var cta = document.querySelector('.medical-cta');
  if (cb.checked) {
    extra.classList.add('show');
    if(arrow) arrow.classList.add('open');
    if(cta) cta.style.background='#C8D8FA';
    // Pre-fill medical fields from main form
    var zh = document.getElementById('nameZh').value.trim();
    var en = document.getElementById('nameEn').value.trim().toUpperCase();
    if (zh) document.getElementById('medNameZh').value = zh;
    if (en) document.getElementById('medNameEn').value = en;
    document.getElementById('submitBtn').textContent = '立即登記（兩卡同申）';
    extra.scrollIntoView({behavior:'smooth', block:'nearest'});
  } else {
    extra.classList.remove('show');
    if(arrow) arrow.classList.remove('open');
    if(cta) cta.style.background='';
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
  var phone = document.getElementById('phone').value.replace(/\D/g,'');
  var consent = document.getElementById('consent').checked;
  var applyMedical = document.getElementById('applyMedical').checked;

  var nameEn = document.getElementById('nameEn').value.trim().toUpperCase();
  var birthYear = parseInt(document.getElementById('birthYear').value || '0');
  var district = document.getElementById('district').value;
  if (!nameZh) { showErr('請填寫中文姓名'); return; }
  if (!nameEn) { showErr('請填寫英文姓名（與身份證相同）'); return; }
  if (phone.length !== 8) { showErr('請填寫正確的 8 位香港電話'); return; }
  if (!selectedGender) { showErr('請選擇性別'); return; }
  if (!birthYear || birthYear > 1972) { showErr('請填寫出生年份（1972年或以前，即55歲或以上）'); return; }
  if (birthYear < 1920) { showErr('請填寫正確的出生年份'); return; }
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
        tier: 'PRIMARY',
        nameZh: nameZh,
        phone: phone,
        nameEn: nameEn,
        gender: selectedGender,
        birthYear: birthYear.toString(),
        district: district,
        roadshow: params.get('rs') || 'walk-in',
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
  // Build card image after short delay (let DOM paint)
  setTimeout(function(){ renderCardImage(data, 'PRIMARY'); }, 100);
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
body{background:#F0EBD8;min-height:100vh;padding:20px 16px;font-size:16px;}
.container{max-width:420px;margin:0 auto;}
.brand-strip{display:flex;align-items:center;gap:12px;margin-bottom:24px;}
.brand-strip .mark{width:44px;height:44px;background:var(--ferrari-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Noto Serif TC",serif;font-weight:900;font-size:18px;border-radius:6px;}
.brand-strip .name .zh{font-family:"Noto Serif TC",serif;font-size:16px;color:var(--ferrari-deep);font-weight:700;letter-spacing:2px;line-height:1;}
.brand-strip .name .en{font-size:11px;color:var(--grey-2);letter-spacing:2px;margin-top:4px;}
.header-card{background:linear-gradient(135deg,var(--ferrari-deep) 0%,var(--ferrari) 100%);color:#fff;padding:24px 22px;border-radius:4px;margin-bottom:20px;position:relative;overflow:hidden;}
.header-card::before{content:"家";position:absolute;right:-10px;bottom:-40px;font-family:"Noto Serif TC",serif;font-size:180px;font-weight:900;color:rgba(255,255,255,0.1);line-height:1;}
.header-card .tag{display:inline-block;background:rgba(255,255,255,0.2);color:#fff;padding:3px 10px;font-size:11px;letter-spacing:3px;font-weight:700;margin-bottom:12px;position:relative;z-index:2;}
.header-card h1{font-family:"Noto Serif TC",serif;font-size:28px;font-weight:900;letter-spacing:3px;line-height:1.2;margin-bottom:8px;position:relative;z-index:2;}
.header-card p{font-size:13px;opacity:0.9;line-height:1.6;position:relative;z-index:2;}
.form-card{background:#fff;padding:24px 22px;border-radius:4px;margin-bottom:16px;}
.field{margin-bottom:18px;}
.field .label-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.field label{font-family:"Noto Serif TC",serif;font-size:15px;color:var(--ferrari-deep);font-weight:700;letter-spacing:1px;}
.field .req{color:var(--ferrari);font-size:12px;font-weight:700;}
.field input,.field select{width:100%;padding:14px;border:2px solid var(--line);border-radius:4px;font-size:17px;font-family:inherit;color:var(--ink);background:#fff;transition:border 0.2s;}
.field input:focus,.field select:focus{outline:0;border-color:var(--ferrari);}
.field .hint{font-size:11px;color:var(--grey-3);margin-top:4px;line-height:1.5;}
.consent{padding:14px;background:var(--ferrari-pale);border-radius:4px;font-size:12px;color:var(--grey-1);line-height:1.7;margin-bottom:20px;}
.consent label{display:flex;gap:10px;cursor:pointer;}
.consent input{width:20px;height:20px;margin-top:2px;flex-shrink:0;accent-color:var(--ferrari);}
.submit-btn{width:100%;padding:18px;background:var(--ferrari);color:#fff;border:0;border-radius:4px;font-size:18px;font-family:"Noto Serif TC",sans-serif;font-weight:700;letter-spacing:4px;cursor:pointer;box-shadow:0 4px 0 var(--ferrari-deep);transition:all 0.1s;}
.submit-btn:disabled{background:var(--grey-3);box-shadow:0 4px 0 var(--grey-2);cursor:not-allowed;}
.footer-links{text-align:center;margin-top:20px;font-size:11px;color:var(--grey-3);line-height:1.8;}
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
.wa-link{display:block;width:100%;padding:16px;background:var(--ferrari);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:15px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:12px;}
.err-msg{background:var(--ferrari-pale);border:1px solid var(--ferrari);color:var(--ferrari-deep);padding:12px 16px;border-radius:4px;font-size:13px;margin-bottom:16px;display:none;}
.err-msg.show{display:block;}
</style>`) + `
<body>
<div class="container">
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
          <div class="label-row"><label for="nameZh">你的中文姓名</label><span class="req">✽ 必填</span></div>
          <input id="nameZh" type="text" placeholder="例：陳小明">
        </div>
        <div class="field">
          <div class="label-row"><label for="phone">你的 WhatsApp 電話</label><span class="req">✽ 必填</span></div>
          <input id="phone" type="tel" placeholder="例：91234567" inputmode="numeric" maxlength="8">
        </div>
        <div class="field">
          <div class="label-row"><label for="nameEn">英文姓名</label><span style="color:var(--grey-3);font-size:11px;">選填</span></div>
          <input id="nameEn" type="text" placeholder="例：CHAN SIU MING" style="text-transform:uppercase;">
        </div>
        <div class="field">
          <div class="label-row"><label for="parentPhone">長輩的 WhatsApp 電話</label><span class="req">✽ 必填</span></div>
          <input id="parentPhone" type="tel" placeholder="長輩已登記的電話" inputmode="numeric" maxlength="8">
          <div class="hint">長輩需先持有主卡，才可申請家庭同行卡</div>
        </div>
        <div class="field">
          <div class="label-row"><label for="relation">你與長輩的關係</label><span style="color:var(--grey-3);font-size:11px;">選填</span></div>
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
    <p style="font-size:14px;color:var(--grey-2);margin-bottom:24px;">家庭同行卡已發出</p>

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

    <!-- Rendered JPEG preview -->
    <div id="cardImgWrap" style="display:none;margin:0 auto 16px;max-width:340px;">
      <img id="cardImg" style="width:100%;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.18);" alt="家庭同行卡">
    </div>

    <div class="action-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <button class="action-btn" style="padding:14px 8px;background:#fff;border:2px solid var(--ferrari);color:var(--ferrari-deep);font-family:'Noto Serif TC',serif;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;" onclick="saveCardImage()">💾 儲存卡圖</button>
      <button class="action-btn" style="padding:14px 8px;background:#fff;border:2px solid var(--ferrari);color:var(--ferrari-deep);font-family:'Noto Serif TC',serif;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;" onclick="window.location.href='/membership/join'">← 返回主卡</button>
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
      document.getElementById('parentLinkedInfo').textContent = m.name_zh + '　' + m.member_no;
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

function showErr(msg){var el=document.getElementById('errMsg');el.textContent=msg;el.classList.add('show');el.scrollIntoView({behavior:'smooth'});}
async function submitForm(){
  document.getElementById('errMsg').classList.remove('show');
  var nameZh=document.getElementById('nameZh').value.trim();
  var phone=document.getElementById('phone').value.replace(/\D/g,'');
  var linkedParentNo=document.getElementById('linkedParentNo').value.trim();
  var parentPhone=document.getElementById('parentPhone').value.replace(/\D/g,'');
  if(!nameZh){showErr('請填寫中文姓名');return;}
  if(phone.length!==8){showErr('請填寫正確的 8 位電話');return;}
  if(!linkedParentNo && parentPhone.length!==8){showErr('請填寫長輩的 8 位電話');return;}
  if(!document.getElementById('consent').checked){showErr('請同意私隱政策');return;}
  var btn=document.getElementById('submitBtn');
  btn.disabled=true;btn.textContent='處理中…';
  var params=new URLSearchParams(location.search);
  var payload={tier:'FAMILY',nameZh,phone,nameEn:document.getElementById('nameEn').value.trim().toUpperCase(),relation:document.getElementById('relation').value,roadshow:params.get('rs')||'walk-in'};
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
    setTimeout(function(){renderCardImage(data,'FAMILY');},100);
  }catch(e){showErr('網絡錯誤，請再試一次');btn.disabled=false;btn.textContent='申請家庭同行卡';}
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
.wrap{max-width:1280px;margin:0 auto;padding:24px;}
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
</style>`) + `
<body>
<div class="topbar">
  <div class="logo">CoEldery <em>85</em></div>
  <div class="nav-tabs">
    <div class="nav-tab active" onclick="switchTab('dashboard',this)">📊 Dashboard</div>
    <div class="nav-tab" onclick="switchTab('members',this)">👥 會員管理</div>
    <div class="nav-tab" onclick="switchTab('medical',this)">🏥 醫健卡申請</div>
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
    <div class="chart-card" style="margin-bottom:24px;">
      <div class="chart-title">📈 每月新增會員趨勢（近12個月）</div>
      <div id="chartMonth" style="display:flex;align-items:flex-end;gap:6px;height:120px;padding-top:8px;"></div>
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
      <button class="btn btn-green" onclick="loadMembers(1)">🔍 搜尋</button>
      <button class="btn btn-grey" onclick="clearFilters()">清除</button>
      <button class="btn btn-blue" onclick="exportCsv()" title="匯出 CSV">⬇ CSV</button>
    </div>
    <div class="table-wrap">
      <div class="table-meta">
        <span class="count" id="searchCount">載入中…</span>
      </div>
      <div style="overflow-x:auto;">
      <table>
        <thead><tr>
          <th>會員編號</th><th>狀態</th><th>類型</th><th>中文姓名</th><th>電話</th>
          <th>地區</th><th>角色</th><th>KYC</th><th>來源</th><th>介紹人</th>
          <th>有效日期</th><th>登記時間</th><th>操作</th>
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

<script>
var currentPage=1, totalPages=1;
var srcLabel={'walk-in':'Walk-in','roadshow':'Roadshow','referral':'會員介紹','whatsapp':'WhatsApp','social':'社交媒體','institution':'機構轉介','online':'網上登記'};

// ── Tab switching
function switchTab(t, el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+t).classList.add('active');
  if(el) el.classList.add('active');
  if(t==='dashboard') loadStats();
  if(t==='members') loadMembers(1);
  if(t==='medical') loadMedical();
}

// ── Stats + Charts
async function loadStats(){
  var r=await fetch('/api/admin/stats'); var d=await r.json(); if(!d.ok)return;
  var s=d.stats;
  document.getElementById('sTotal').textContent=s.total;
  document.getElementById('sActive').textContent='活躍：'+s.active+' / 停用：'+s.inactive;
  document.getElementById('sPrimary').textContent=s.primary;
  document.getElementById('sFamily').textContent=s.family;
  document.getElementById('sPending').textContent=s.pending;
  document.getElementById('sToday').textContent=s.todayNew;
  document.getElementById('sMonth').textContent=s.monthNew;
  // Source bars
  var max=Math.max(1,...(s.bySource||[]).map(x=>x.cnt));
  document.getElementById('chartSource').innerHTML=(s.bySource||[]).map(x=>\`
    <div class="bar-row">
      <div class="bar-label">\${srcLabel[x.source]||x.source}</div>
      <div class="bar-track"><div class="bar-fill" style="width:\${Math.round(x.cnt/max*100)}%"></div></div>
      <div class="bar-val">\${x.cnt}</div>
    </div>\`).join('');
  // District bars
  var maxD=Math.max(1,...(s.byDistrict||[]).map(x=>x.cnt));
  document.getElementById('chartDistrict').innerHTML=(s.byDistrict||[]).map(x=>\`
    <div class="bar-row">
      <div class="bar-label">\${x.district||'未填'}</div>
      <div class="bar-track"><div class="bar-fill red" style="width:\${Math.round(x.cnt/maxD*100)}%"></div></div>
      <div class="bar-val">\${x.cnt}</div>
    </div>\`).join('');
  // Monthly trend
  var months=[...(s.byMonth||[])].reverse();
  var maxM=Math.max(1,...months.map(x=>x.cnt));
  document.getElementById('chartMonth').innerHTML=months.map(x=>{
    var h=Math.round(x.cnt/maxM*100);
    return \`<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px;">
      <div style="font-size:10px;color:#aaa;font-family:'Space Grotesk',sans-serif;">\${x.cnt}</div>
      <div style="width:100%;background:var(--forest);border-radius:3px 3px 0 0;height:\${h}px;"></div>
      <div style="font-size:9px;color:#aaa;transform:rotate(-45deg);white-space:nowrap;">\${x.month}</div>
    </div>\`;
  }).join('');
}

// ── Members list
async function loadMembers(page){
  currentPage=page||1;
  var p=new URLSearchParams({page:currentPage,limit:50});
  var s=document.getElementById('search').value.trim();
  var t=document.getElementById('filterTier').value;
  var st=document.getElementById('filterStatus').value;
  var src=document.getElementById('filterSource').value;
  if(s)p.set('search',s); if(t)p.set('tier',t);
  if(st)p.set('status',st); if(src)p.set('source',src);
  var r=await fetch('/api/admin/members?'+p); var d=await r.json(); if(!d.ok)return;
  totalPages=Math.ceil(d.total/50)||1;
  document.getElementById('searchCount').textContent='共 '+d.total+' 筆記錄';
  window._members=d.members;
  document.getElementById('membersTbody').innerHTML=d.members.map(function(m,i){ return \`
    <tr class="\${m.status==='INACTIVE'?'inactive':''}">
      <td><a href="/membership/card/\${m.member_no}" target="_blank" style="color:var(--forest);font-weight:700;">\${m.member_no}</a></td>
      <td><span class="badge badge-\${(m.status||'active').toLowerCase()}">\${m.status||'ACTIVE'}</span></td>
      <td><span class="badge badge-\${m.tier==='PRIMARY'?'primary':'family'}">\${m.tier==='PRIMARY'?'主卡':'家庭'}</span></td>
      <td>\${m.name_zh}</td>
      <td><a href="tel:+852\${m.phone}" style="color:inherit;">\${m.phone}</a></td>
      <td>\${m.district||'—'}</td>
      <td style="font-size:11px;">\${m.role||'CoExplorery'}</td>
      <td><span class="badge badge-\${m.kyc_status==='DONE'?'done':'pending'}">\${m.kyc_status}</span></td>
      <td style="font-size:11px;">\${srcLabel[m.source]||m.source||'—'}</td>
      <td style="font-size:11px;">\${m.referrer_no||'—'}</td>
      <td>\${(m.expires_at||'').slice(0,10)}</td>
      <td style="font-size:11px;">\${(m.created_at||'').slice(0,16).replace('T',' ')}</td>
      <td>
        <button class="act-btn act-edit" onclick="openEdit(\${i})">編輯</button>
        \${m.kyc_status!=='DONE'?'<button class="act-btn act-kyc" onclick="approveKyc('+i+')">KYC\u2713</button>':''}
        \${m.status==='ACTIVE'?'<button class="act-btn act-deact" onclick="deactivateMember('+i+')">\u505c\u7528</button>':
          m.status==='INACTIVE'?'<button class="act-btn act-react" onclick="reactivateMember('+i+')">\u555f\u7528</button>':''}
      </td>
    </tr>\`;}).join('');
  renderPagination();
}

function renderPagination(){
  var el=document.getElementById('pagination');
  var pages=[]; for(var i=1;i<=Math.min(totalPages,20);i++)pages.push(i);
  el.innerHTML=pages.map(p=>\`<button class="\${p===currentPage?'active':''}" onclick="loadMembers(\${p})">\${p}</button>\`).join('');
}

// ── Actions
async function approveKyc(i){
  var no=window._members[i].member_no;
  if(!confirm('確認標記 '+no+' KYC 為 DONE？'))return;
  await fetch('/api/admin/members/'+no,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kyc_status:'DONE'})});
  loadMembers(currentPage);
}
async function deactivateMember(i){
  var no=window._members[i].member_no;
  if(!confirm('確認停用會員 '+no+'？'))return;
  await fetch('/api/admin/members/'+no,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'INACTIVE'})});
  loadMembers(currentPage);
}
async function reactivateMember(i){
  var no=window._members[i].member_no;
  if(!confirm('確認重新啟用 '+no+'？'))return;
  await fetch('/api/admin/members/'+no,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'ACTIVE'})});
  loadMembers(currentPage);
}

// ── Edit modal
function openEdit(i){
  var m=window._members[i];
  document.getElementById('editNo').value=m.member_no;
  document.getElementById('eNameZh').value=m.name_zh||'';
  document.getElementById('eNameEn').value=m.name_en||'';
  document.getElementById('ePhone').value=m.phone||'';
  document.getElementById('eGender').value=m.gender||'';
  document.getElementById('eDistrict').value=m.district||'';
  document.getElementById('eRole').value=m.role||'CoExplorery';
  document.getElementById('eKyc').value=m.kyc_status||'PENDING';
  document.getElementById('eStatus').value=m.status||'ACTIVE';
  document.getElementById('eSource').value=m.source||'walk-in';
  document.getElementById('eReferrer').value=m.referrer_no||'';
  document.getElementById('eExpires').value=(m.expires_at||'').slice(0,10);
  document.getElementById('eRoadshowLoc').value=m.roadshow_location||'';
  document.getElementById('eNotes').value=m.notes||'';
  document.getElementById('eAdminNotes').value=m.admin_notes||'';
  document.getElementById('editModal').classList.add('show');
}
function closeModal(){ document.getElementById('editModal').classList.remove('show'); }
document.getElementById('editModal').addEventListener('click',function(e){ if(e.target===this)closeModal(); });

async function saveEdit(){
  var no=document.getElementById('editNo').value;
  var body={
    name_zh:document.getElementById('eNameZh').value,
    name_en:document.getElementById('eNameEn').value,
    phone:document.getElementById('ePhone').value,
    gender:document.getElementById('eGender').value,
    district:document.getElementById('eDistrict').value,
    role:document.getElementById('eRole').value,
    kyc_status:document.getElementById('eKyc').value,
    status:document.getElementById('eStatus').value,
    source:document.getElementById('eSource').value,
    referrer_no:document.getElementById('eReferrer').value,
    expires_at:document.getElementById('eExpires').value,
    roadshow_location:document.getElementById('eRoadshowLoc').value,
    notes:document.getElementById('eNotes').value,
    admin_notes:document.getElementById('eAdminNotes').value
  };
  var r=await fetch('/api/admin/members/'+no,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  var d=await r.json();
  if(d.ok){closeModal();loadMembers(currentPage);}
  else alert('儲存失敗：'+(d.error||'未知錯誤'));
}

// deleteMember() removed — no data deletion policy

function clearFilters(){
  document.getElementById('search').value='';
  document.getElementById('filterTier').value='';
  document.getElementById('filterStatus').value='';
  document.getElementById('filterSource').value='';
  loadMembers(1);
}

function exportCsv(){
  var p=new URLSearchParams({export:'csv',limit:9999});
  var s=document.getElementById('search').value.trim();
  var t=document.getElementById('filterTier').value;
  var st=document.getElementById('filterStatus').value;
  var src=document.getElementById('filterSource').value;
  if(s)p.set('search',s); if(t)p.set('tier',t);
  if(st)p.set('status',st); if(src)p.set('source',src);
  window.open('/api/admin/members?'+p,'_blank');
}

document.getElementById('search').addEventListener('keydown',function(e){if(e.key==='Enter')loadMembers(1);});

// ── Medical Card Tab
var medStatusLabel={'PENDING':'⏳ 待傳送','SENT':'📤 已傳送','ISSUED':'✅ 已發卡','DECLINED':'❌ 已拒絕'};
var medStatusColor={'PENDING':'#F57F17','SENT':'#1565C0','ISSUED':'#2E7D32','DECLINED':'#B71C1C'};

async function loadMedical(){
  var st=document.getElementById('medFilterStatus').value;
  var url='/api/admin/medical'+(st?'?status='+encodeURIComponent(st):'');
  var r=await fetch(url); var d=await r.json(); if(!d.ok)return;
  document.getElementById('medicalCount').textContent='共 '+d.total+' 筆申請';
  window._medical=d.applications;
  document.getElementById('medicalTbody').innerHTML=d.applications.map(function(m,i){
    var col=medStatusColor[m.status]||'#888';
    var lbl=medStatusLabel[m.status]||m.status;
    return \`<tr>
      <td style="font-size:11px;color:#aaa;">#\${m.id}</td>
      <td><a href="/membership/card/\${m.member_no}" target="_blank" style="color:var(--forest);font-weight:700;">\${m.member_no}</a></td>
      <td style="font-weight:700;">\${m.name_zh_full}</td>
      <td style="font-size:12px;letter-spacing:1px;">\${m.name_en_full}</td>
      <td style="font-family:monospace;font-size:15px;font-weight:700;letter-spacing:4px;">\${m.hkid_prefix}</td>
      <td><a href="tel:+852\${m.phone}">\${m.phone}</a></td>
      <td><span style="color:\${col};font-weight:700;font-size:12px;">\${lbl}</span></td>
      <td style="font-size:11px;">\${(m.applied_at||'').slice(0,16).replace('T',' ')}</td>
      <td>
        \${m.status==='PENDING'?'<button class="act-btn act-kyc" onclick="markMedSent('+i+')">標記已傳送</button>':''}
        \${m.status==='SENT'?'<button class="act-btn act-react" onclick="markMedIssued('+i+')">標記已發卡</button>':''}
      </td>
    </tr>\`;
  }).join('');
}

async function markMedSent(i){
  var m=window._medical[i];
  if(!confirm('確認已將申請 #'+m.id+' ('+m.name_zh_full+') 資料傳送給 NGO？'))return;
  var now=new Date().toISOString().slice(0,19).replace('T',' ');
  await fetch('/api/admin/medical/'+m.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'SENT',sent_at:now})});
  loadMedical();
}
async function markMedIssued(i){
  var m=window._medical[i];
  if(!confirm('確認 #'+m.id+' ('+m.name_zh_full+') 醫健卡已成功發出？'))return;
  await fetch('/api/admin/medical/'+m.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'ISSUED'})});
  loadMedical();
}

// Init: load dashboard
loadStats();
</script>
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
function memberProfileHtml(m: any) {
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

  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${m.name_zh} · 老有卡 · CoEldery 85</title>
<link rel="stylesheet" href="/shared.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Noto+Serif+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&family=Montserrat:wght@700;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#F0EBD8;min-height:100vh;font-size:16px;font-family:"Noto Sans TC",sans-serif;}
.topbar{background:${accentDark};color:#fff;padding:14px 20px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10;}
.topbar .mark{width:36px;height:36px;background:${accentMid};border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:"Noto Serif TC",serif;font-weight:900;font-size:16px;}
.topbar .title{font-family:"Noto Serif TC",serif;font-size:16px;font-weight:700;letter-spacing:2px;}
.topbar .no{font-family:"Space Grotesk",monospace;font-size:12px;opacity:0.7;margin-top:2px;}
.wrap{max-width:480px;margin:0 auto;padding:20px 16px 40px;}

/* ── Card canvas area ── */
.card-wrap{margin-bottom:16px;text-align:center;}
.card-wrap canvas{display:none;}
.card-wrap img#cardImg{width:100%;max-width:420px;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,0.2);}
.card-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
.card-btn{padding:13px 8px;background:#fff;border:2px solid ${accentMid};color:${accentDark};font-family:"Noto Serif TC",serif;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;border-radius:6px;text-align:center;text-decoration:none;display:block;}
.card-btn.primary{background:${accentDark};color:#fff;border-color:${accentDark};}
.card-btn.wa{background:#25D366;border-color:#25D366;color:#fff;grid-column:1/-1;font-size:15px;}

/* ── Info sections ── */
.section{background:#fff;border-radius:8px;padding:20px;margin-bottom:14px;}
.section-title{font-family:"Noto Serif TC",serif;font-size:13px;color:${accentMid};letter-spacing:3px;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #eee;}
.info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f5f5f5;}
.info-row:last-child{border-bottom:none;}
.info-label{font-size:12px;color:#999;letter-spacing:1px;}
.info-value{font-size:15px;color:#333;font-weight:500;text-align:right;}
.info-value.big{font-family:"Space Grotesk",monospace;font-size:18px;font-weight:700;color:${accentDark};}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;}
.badge.green{background:#E8F5E9;color:${forestDeep};}
.badge.red{background:#FFEBEE;color:${ferrariDeep};}
.badge.grey{background:#f5f5f5;color:#666;}
.badge.yellow{background:#FFF9C4;color:#795548;}

/* ── Family cards list ── */
.family-card{background:#fff9f9;border:1px solid #FFCDD2;border-radius:8px;padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.family-card .fc-name{font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;color:${ferrariDeep};}
.family-card .fc-no{font-family:"Space Grotesk",monospace;font-size:12px;color:#999;}
.family-card .fc-link{padding:6px 14px;background:${ferrari};color:#fff;border-radius:4px;font-size:12px;font-weight:700;text-decoration:none;}
.add-family-btn{width:100%;padding:15px;background:#fff;border:2px dashed ${ferrari};color:${ferrari};font-family:"Noto Serif TC",serif;font-size:14px;font-weight:700;letter-spacing:2px;cursor:pointer;border-radius:8px;text-align:center;text-decoration:none;display:block;margin-top:4px;}

/* ── Edit form ── */
.edit-section{display:none;}
.edit-section.open{display:block;}
.field{margin-bottom:16px;}
.field label{display:block;font-family:"Noto Serif TC",serif;font-size:13px;color:${accentDark};font-weight:700;letter-spacing:1px;margin-bottom:6px;}
.field input,.field select{width:100%;padding:12px 14px;border:2px solid #e0e0e0;border-radius:6px;font-size:16px;font-family:inherit;color:#333;background:#fff;transition:border 0.2s;}
.field input:focus,.field select:focus{outline:0;border-color:${accentMid};}
.save-btn{width:100%;padding:16px;background:${accentDark};color:#fff;border:0;border-radius:6px;font-size:17px;font-family:"Noto Serif TC",serif;font-weight:700;letter-spacing:3px;cursor:pointer;margin-top:8px;}
.cancel-btn{width:100%;padding:12px;background:transparent;border:2px solid #ccc;color:#999;border-radius:6px;font-size:14px;font-family:inherit;cursor:pointer;margin-top:8px;}
.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:30px;font-size:14px;opacity:0;transition:opacity 0.3s;z-index:100;pointer-events:none;}
.toast.show{opacity:1;}
.toggle-edit-btn{background:none;border:none;color:${accentMid};font-size:13px;font-family:"Noto Serif TC",serif;cursor:pointer;font-weight:700;letter-spacing:1px;text-decoration:underline;padding:0;}
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
  <div class="card-wrap">
    <canvas id="offCanvas"></canvas>
    <img id="cardImg" alt="會員卡" style="opacity:0;transition:opacity 0.3s;">
  </div>

  <!-- ── 卡片操作 ── -->
  <div class="card-actions">
    <button class="card-btn" onclick="saveCardImage()">💾 儲存卡圖</button>
    <button class="card-btn" onclick="shareCardToWA()">📤 分享</button>
    <button class="card-btn wa" onclick="shareCardToWA()">
      📱 WhatsApp 分享會員卡
    </button>
  </div>

  <!-- ── 會員資料 ── -->
  <div class="section">
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
      <span>◆ 會員資料</span>
      <button class="toggle-edit-btn" onclick="toggleEdit()">✏️ 編輯</button>
    </div>

    <!-- 顯示模式 -->
    <div id="viewMode">
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
      <div style="text-align:center;color:#aaa;padding:10px;font-size:13px;">載入中…</div>
    </div>
    <a href="/membership/join-family?parent=${m.member_no}" class="add-family-btn">＋ 為家人申請家庭同行卡</a>
  </div>` : ''}

  <!-- ── 底部連結 ── -->
  <div style="text-align:center;margin-top:20px;font-size:12px;color:#aaa;line-height:2;">
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

// ── QR + Card render on load ──────────────────────────────────────────────────
window.addEventListener('load', function(){
  renderCardImage(MEMBER_DATA, MEMBER_DATA.tier);
  ${isPrimary ? 'loadFamily();' : ''}
});

function showToast(msg, dur) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, dur || 2000);
}

// ── Edit toggle ───────────────────────────────────────────────────────────────
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
      el.innerHTML = '<div style="text-align:center;color:#aaa;padding:10px;font-size:13px;">暫無家庭同行卡</div>';
      return;
    }
    el.innerHTML = data.family.map(function(f){
      return '<div class="family-card">' +
        '<div><div class="fc-name">'+f.name_zh+'</div><div class="fc-no">'+f.member_no+'</div></div>' +
        '<a href="/membership/card/'+f.member_no+'" class="fc-link">查看</a>' +
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
</script>
</body></html>`
}

// ─── Home HTML (統一登入/登記入口) ───────────────────────────────────────────────
function homeHtml() {
  return htmlHead('老有聯盟 CoEldery 85', `<style>
body{background:#F0EBD8;min-height:100vh;padding:20px 16px;font-size:16px;}
.container{max-width:420px;margin:0 auto;}
/* Hero */
.hero{text-align:center;padding:28px 0 20px;}
.hero-logo{display:inline-flex;align-items:center;gap:0;margin-bottom:14px;}
.hero-logo .l-co{font-family:"Noto Serif TC",serif;font-size:26px;font-weight:900;color:var(--forest-deep);letter-spacing:1px;}
.hero-logo .l-85{font-family:"Noto Serif TC",serif;font-size:36px;font-weight:900;color:var(--ferrari);line-height:1;margin:0 4px;}
.hero-logo .l-org{font-family:"Noto Serif TC",serif;font-size:14px;font-weight:700;color:var(--forest-deep);letter-spacing:3px;border-left:2px solid var(--line);padding-left:10px;margin-left:6px;line-height:1.2;}
.hero-sub{font-size:12px;color:var(--grey-3);letter-spacing:3px;}
/* Tabs */
.tab-bar{display:grid;grid-template-columns:1fr 1fr;border-radius:6px 6px 0 0;overflow:hidden;margin-bottom:0;}
.tab-btn{padding:14px 8px;text-align:center;font-family:"Noto Serif TC",serif;font-size:15px;font-weight:700;letter-spacing:2px;cursor:pointer;border:none;transition:all 0.2s;}
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
.field label{display:block;font-family:"Noto Serif TC",serif;font-size:14px;color:var(--grey-1);font-weight:700;letter-spacing:1px;margin-bottom:7px;}
.field input,.field select{width:100%;padding:14px;border:2px solid var(--line);border-radius:4px;font-size:17px;font-family:inherit;color:var(--ink);background:#fff;transition:border 0.2s;}
.field input:focus,.field select:focus{outline:0;border-color:var(--forest);}
.field .hint{font-size:11px;color:var(--grey-3);margin-top:5px;line-height:1.5;}
.field .g-row{display:flex;gap:8px;}
.field .g-btn{flex:1;padding:12px 4px;border:2px solid var(--line);border-radius:4px;font-size:14px;font-family:"Noto Serif TC",serif;font-weight:700;cursor:pointer;background:#fff;color:var(--grey-1);transition:all 0.15s;}
.field .g-btn.active{border-color:var(--forest);background:var(--forest-pale);color:var(--forest-deep);}
.optional{font-size:11px;color:var(--grey-3);font-weight:400;margin-left:4px;}
.section-divider{padding:10px 0 8px;font-size:12px;color:var(--grey-3);letter-spacing:3px;border-top:1px dashed var(--line);margin-top:4px;}
/* Buttons */
.submit-btn{width:100%;padding:18px;background:var(--forest-deep);color:#fff;border:0;border-radius:4px;font-size:18px;font-family:"Noto Serif TC",sans-serif;font-weight:700;letter-spacing:4px;cursor:pointer;box-shadow:0 4px 0 var(--forest);transition:all 0.1s;margin-top:4px;}
.submit-btn:disabled{background:var(--grey-3);box-shadow:0 4px 0 var(--grey-2);cursor:not-allowed;}
.submit-btn.red{background:var(--ferrari);box-shadow:0 4px 0 var(--ferrari-deep);}
/* Consent */
.consent{padding:12px 14px;background:var(--forest-pale);border-radius:4px;font-size:12px;color:var(--grey-1);line-height:1.7;margin-bottom:18px;}
.consent label{display:flex;gap:10px;cursor:pointer;align-items:flex-start;}
.consent input{width:18px;height:18px;margin-top:2px;flex-shrink:0;accent-color:var(--forest);}
/* Error */
.err-msg{background:var(--ferrari-pale);border:1px solid var(--ferrari);color:var(--ferrari-deep);padding:12px 16px;border-radius:4px;font-size:13px;margin-bottom:16px;display:none;}
.err-msg.show{display:block;}
/* Login result */
.result-block{background:#E8F5E9;border:2px solid var(--forest);border-radius:6px;padding:20px;margin-bottom:14px;display:none;}
.result-block.show{display:block;}
.rb-name{font-family:"Noto Serif TC",serif;font-size:28px;font-weight:900;color:var(--forest-deep);}
.rb-no{font-family:"Space Grotesk",monospace;font-size:14px;color:var(--grey-2);margin-bottom:14px;}
.rb-go{display:block;width:100%;padding:15px;background:var(--forest-deep);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:16px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:8px;}
.rb-family-title{font-family:"Noto Serif TC",serif;font-size:12px;color:var(--ferrari-deep);letter-spacing:2px;font-weight:700;margin:14px 0 8px;padding-top:12px;border-top:1px solid #c8e6c9;}
.fc-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e0f0e0;}
.fc-row:last-child{border-bottom:none;}
.fc-row .fn{font-family:"Noto Serif TC",serif;font-size:16px;font-weight:700;color:var(--ferrari-deep);}
.fc-row .fno{font-size:11px;color:#aaa;}
.fc-row a{padding:5px 12px;background:var(--ferrari);color:#fff;border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;}
/* Footer */
.footer-links{text-align:center;margin-top:6px;font-size:11px;color:var(--grey-3);line-height:2;}
.footer-links a{color:var(--forest);text-decoration:none;}
.footer-note{text-align:center;margin-top:20px;font-size:11px;color:var(--grey-3);line-height:2;}
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
      <p style="font-size:13px;color:var(--grey-2);margin-bottom:20px;">你的老有卡已發出</p>
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
        <div id="cardEn" style="font-size:13px;font-weight:700;color:#0d3e12;margin-top:6px;letter-spacing:1px;"></div>
      </div>
      <div style="position:absolute;bottom:14px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div><div style="font-size:9px;color:#aaa;letter-spacing:2px;">MEMBER NO.</div><div id="cardNo" style="font-family:'Space Grotesk',monospace;font-size:15px;font-weight:700;color:#0d3e12;"></div></div>
        <div style="width:42px;height:42px;background:#fff;padding:2px;border:1.5px solid var(--forest);border-radius:3px;"><canvas id="cardQr" style="width:100%;height:100%;"></canvas></div>
      </div>
    </div>
    <!-- Canvas JPEG -->
    <div id="cardImgWrap" style="display:none;margin:0 auto 16px;max-width:340px;">
      <img id="cardImg" style="width:100%;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.18);" alt="老有卡">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <button class="action-btn" onclick="saveCardImage()">💾 儲存卡圖</button>
      <button class="action-btn red" onclick="window.location.href='/membership/join-family'">家人申請</button>
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

// ── LOGIN ────────────────────────────────────────────────────────────────────
async function doLogin(){
  document.getElementById('errMsg').classList.remove('show');
  var phone=document.getElementById('loginPhone').value.replace(/\D/g,'');
  if(phone.length!==8){showErr('請輸入正確的 8 位電話號碼');return;}
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
  var phone=document.getElementById('phone').value.replace(/\D/g,'');
  if(!nameZh){showErr('請填寫中文姓名');return;}
  if(phone.length!==8){showErr('請填寫正確的 8 位香港電話');return;}
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
body{background:#F0EBD8;min-height:100vh;padding:20px 16px;font-size:16px;}
.container{max-width:420px;margin:0 auto;}
.brand-strip{display:flex;align-items:center;gap:12px;margin-bottom:24px;}
.brand-strip .mark{width:44px;height:44px;background:var(--forest-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Noto Serif TC",serif;font-weight:900;font-size:18px;border-radius:6px;}
.brand-strip .name .zh{font-family:"Noto Serif TC",serif;font-size:16px;color:var(--forest-deep);font-weight:700;letter-spacing:2px;}
.brand-strip .name .en{font-size:11px;color:var(--grey-2);letter-spacing:2px;margin-top:4px;}
.header-card{background:linear-gradient(135deg,var(--forest-deep) 0%,var(--forest) 100%);color:#fff;padding:28px 22px;border-radius:4px;margin-bottom:20px;position:relative;overflow:hidden;}
.header-card::before{content:"老";position:absolute;right:-10px;bottom:-40px;font-family:"Noto Serif TC",serif;font-size:180px;font-weight:900;color:rgba(255,255,255,0.08);line-height:1;}
.header-card h1{font-family:"Noto Serif TC",serif;font-size:28px;font-weight:900;letter-spacing:3px;margin-bottom:8px;position:relative;z-index:2;}
.header-card p{font-size:13px;opacity:0.85;line-height:1.6;position:relative;z-index:2;}
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
.footer-links{text-align:center;margin-top:20px;font-size:12px;color:var(--grey-3);line-height:2;}
.footer-links a{color:var(--forest);text-decoration:none;font-weight:700;}
.result-card{background:#fff;border-radius:8px;padding:24px 20px;border-left:4px solid var(--forest);display:none;margin-bottom:16px;}
.result-card.show{display:block;}
.rc-name{font-family:"Noto Serif TC",serif;font-size:32px;font-weight:900;color:var(--forest-deep);margin-bottom:4px;}
.rc-no{font-family:"Space Grotesk",monospace;font-size:16px;color:var(--grey-2);margin-bottom:16px;}
.rc-go-btn{display:block;width:100%;padding:16px;background:var(--forest-deep);color:#fff;text-align:center;font-family:"Noto Serif TC",serif;font-size:17px;font-weight:700;letter-spacing:3px;border-radius:4px;text-decoration:none;margin-bottom:10px;}
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
  var phone=document.getElementById('phone').value.replace(/\D/g,'');
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

export default app
