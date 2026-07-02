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
      parentPhone?: string; parentName?: string; relation?: string;
      roadshow?: string;
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
    if (body.tier === 'FAMILY' && body.parentPhone) {
      const parent = await db.prepare(
        'SELECT member_no, name_zh FROM members WHERE phone = ? AND tier = ?'
      ).bind(body.parentPhone.replace(/\D/g, ''), 'PRIMARY').first<{ member_no: string; name_zh: string }>()
      if (parent) {
        parentNo = parent.member_no
        parentName = parent.name_zh
      }
    }

    const memberNo = await nextMemberNo(db)
    const expires = expiryDate(3)
    const now = new Date().toISOString()
    const roadshow = body.roadshow || 'walk-in'

    await db.prepare(`
      INSERT INTO members
        (member_no, tier, name_zh, phone, name_en, gender, birth_year,
         district, id_prefix, parent_no, parent_name, relation,
         roadshow, kyc_status, role, expires_at, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      memberNo, body.tier || 'PRIMARY',
      body.nameZh.trim(), phoneClean,
      body.nameEn?.trim() || '', body.gender || '',
      body.birthYear ? parseInt(body.birthYear) : null,
      body.district || '', body.idPrefix || '',
      parentNo, parentName, body.relation || '',
      roadshow, 'PENDING', 'CoExplorery',
      expires, now
    ).run()

    // Log roadshow entry
    if (roadshow !== 'walk-in') {
      await db.prepare(
        'INSERT INTO roadshow_log (roadshow_code, member_no) VALUES (?,?)'
      ).bind(roadshow, memberNo).run()
    }

    return c.json({
      ok: true,
      memberNo,
      nameZh: body.nameZh.trim(),
      nameEn: body.nameEn?.trim() || '',
      tier: body.tier || 'PRIMARY',
      expiresAt: expires,
      role: 'CoExplorery'
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
  const limit = parseInt(c.req.query('limit') || '50')
  const tier = c.req.query('tier')
  const roadshow = c.req.query('roadshow')
  const search = c.req.query('search')
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params: (string | number)[] = []
  if (tier) { where += ' AND tier = ?'; params.push(tier) }
  if (roadshow) { where += ' AND roadshow = ?'; params.push(roadshow) }
  if (search) {
    where += ' AND (name_zh LIKE ? OR member_no LIKE ? OR phone LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  const countRow = await db.prepare(
    `SELECT COUNT(*) as total FROM members ${where}`
  ).bind(...params).first<{ total: number }>()

  const rows = await db.prepare(
    `SELECT member_no, tier, name_zh, name_en, phone, role, kyc_status, roadshow, expires_at, created_at
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
  const [total, primary, family, pending] = await Promise.all([
    db.prepare('SELECT COUNT(*) as n FROM members').first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE tier='PRIMARY'").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE tier='FAMILY'").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) as n FROM members WHERE kyc_status='PENDING'").first<{ n: number }>(),
  ])
  const roadshows = await db.prepare(
    "SELECT roadshow, COUNT(*) as cnt FROM members WHERE roadshow != 'walk-in' GROUP BY roadshow ORDER BY cnt DESC"
  ).all()
  return c.json({
    ok: true,
    stats: {
      total: total?.n ?? 0,
      primary: primary?.n ?? 0,
      family: family?.n ?? 0,
      pending: pending?.n ?? 0,
      roadshows: roadshows.results
    }
  })
})

// ─── API: Update member (admin) ───────────────────────────────────────────────
app.patch('/api/admin/members/:no', async (c) => {
  const no = c.req.param('no')
  const db = c.env.DB
  const body = await c.req.json<{ kyc_status?: string; role?: string; notes?: string }>()
  const fields: string[] = []
  const vals: string[] = []
  if (body.kyc_status) { fields.push('kyc_status = ?'); vals.push(body.kyc_status) }
  if (body.role) { fields.push('role = ?'); vals.push(body.role) }
  if (body.notes !== undefined) { fields.push('notes = ?'); vals.push(body.notes) }
  if (!fields.length) return c.json({ ok: false, error: 'Nothing to update' }, 400)
  await db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE member_no = ?`)
    .bind(...vals, no).run()
  return c.json({ ok: true })
})

// ─── Pages ────────────────────────────────────────────────────────────────────
app.get('/', (c) => c.redirect('/join'))

app.get('/join', (c) => c.html(signupMainHtml()))
app.get('/join-family', (c) => c.html(signupSubHtml()))
app.get('/admin', (c) => c.html(adminHtml()))
app.get('/poster', (c) => c.html(posterHtml()))
app.get('/sop', (c) => c.html(sopHtml()))

// ─── HTML Pages ───────────────────────────────────────────────────────────────
function htmlHead(title: string, extra = '') {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${title} · CoEldery 85</title>
<link rel="stylesheet" href="/shared.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Noto+Serif+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
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
.brand-strip .mark{width:44px;height:44px;background:var(--forest-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Noto Serif TC",serif;font-weight:900;font-size:18px;border-radius:6px;}
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
    <div class="mark">老</div>
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
      <div class="form-card">
        <div class="step-note">
          <strong>★ 必填資料</strong>：只需中文姓名同 WhatsApp 電話，30秒完成
        </div>

        <div class="field">
          <div class="label-row">
            <label for="nameZh">中文姓名</label>
            <span class="req">✽ 必填</span>
          </div>
          <input id="nameZh" type="text" placeholder="例：陳大文" autocomplete="name">
        </div>

        <div class="field">
          <div class="label-row">
            <label for="phone">WhatsApp 電話</label>
            <span class="req">✽ 必填</span>
          </div>
          <input id="phone" type="tel" placeholder="例：91234567" inputmode="numeric" maxlength="8">
          <div class="hint">只限香港 8 位電話號碼</div>
        </div>

        <div class="section-divider">
          選填資料
          <span class="optnote">可以之後補填</span>
        </div>

        <div class="field">
          <div class="label-row"><label for="nameEn">英文姓名</label><span class="opt">選填</span></div>
          <input id="nameEn" type="text" placeholder="例：CHAN TAI MAN" autocomplete="name" style="text-transform:uppercase;">
        </div>

        <div class="field">
          <div class="label-row"><label>性別</label><span class="opt">選填</span></div>
          <div class="gender-row">
            <button type="button" class="g-btn" data-v="M" onclick="setGender('M',this)">男 M</button>
            <button type="button" class="g-btn" data-v="F" onclick="setGender('F',this)">女 F</button>
            <button type="button" class="g-btn" data-v="X" onclick="setGender('X',this)">其他</button>
          </div>
        </div>

        <div class="field">
          <div class="label-row"><label for="birthYear">出生年份</label><span class="opt">選填</span></div>
          <input id="birthYear" type="number" placeholder="例：1960" inputmode="numeric" min="1920" max="1972">
          <div class="hint">主卡建議 1972 年或以前（55歲+）</div>
        </div>

        <div class="field">
          <div class="label-row"><label for="district">居住地區</label><span class="opt">選填</span></div>
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
        <a href="/join-family">家庭同行卡申請 →</a><br>
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

    <div class="action-row">
      <button class="action-btn" id="saveImgBtn" onclick="saveCardImage()">💾 儲存卡圖</button>
      <button class="action-btn red" onclick="window.location.href='/join-family'">家人申請</button>
    </div>

    <button class="wa-link" id="waImgBtn" onclick="shareCardToWA()" style="width:100%;border:0;cursor:pointer;">
      📱 WhatsApp 分享會員卡圖片
    </button>

    <div class="footer-links">
      <a href="/join">重新登記</a> · <a href="/">返回首頁</a>
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

function showErr(msg) {
  var el = document.getElementById('errMsg');
  el.textContent = msg;
  el.classList.add('show');
  el.scrollIntoView({behavior:'smooth'});
}

async function submitForm() {
  document.getElementById('errMsg').classList.remove('show');
  var nameZh = document.getElementById('nameZh').value.trim();
  var phone = document.getElementById('phone').value.replace(/\\D/g,'');
  var consent = document.getElementById('consent').checked;

  if (!nameZh) { showErr('請填寫中文姓名'); return; }
  if (phone.length !== 8) { showErr('請填寫正確的 8 位香港電話'); return; }
  if (!consent) { showErr('請同意私隱政策'); return; }

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
        nameEn: document.getElementById('nameEn').value.trim().toUpperCase(),
        gender: selectedGender,
        birthYear: document.getElementById('birthYear').value || '',
        district: document.getElementById('district').value,
        roadshow: params.get('rs') || 'walk-in'
      })
    });
    var data = await res.json();
    if (!data.ok) { showErr(data.error || '登記失敗，請再試一次'); btn.disabled=false; btn.textContent='立即登記'; return; }
    showSuccess(data);
  } catch(e) {
    showErr('網絡錯誤，請再試一次');
    btn.disabled=false; btn.textContent='立即登記';
  }
}

function showSuccess(data) {
  document.getElementById('formSection').style.display='none';
  document.getElementById('cardZh').textContent = data.nameZh;
  document.getElementById('cardEn').textContent = data.nameEn || '';
  document.getElementById('cardNo').textContent = data.memberNo;
  var cardUrl = location.origin + '/member/' + data.memberNo;
  try { QRCode.toCanvas(document.getElementById('cardQr'), cardUrl, {width:40,margin:0,color:{dark:'#0d3e12',light:'#ffffff'},errorCorrectionLevel:'H'}); } catch(e) { console.warn('QR error (non-fatal):', e); }
  document.getElementById('successSection').classList.add('show');
  window.scrollTo(0,0);
  // Build card image after short delay (let DOM paint)
  setTimeout(function(){ renderCardImage(data, 'PRIMARY'); }, 100);
}

// ── Draw member card onto an off-screen canvas and return a Blob URL ──────────
function renderCardImage(data, tier) {
  var DPR = 2; // retina quality
  var W = 680, H = 464; // 340x232 × 2
  var canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');

  var isPrimary = (tier !== 'FAMILY');
  var forestDeep='#0d3e12', forest='#2E7D32', forestLight='#4CAF50', forestPale='#E8F5E9';
  var ferrari='#C62828', ferrariDeep='#7f0000', ferrariPale='#FFEBEE';
  var cardBg1 = isPrimary ? '#FAF7F0' : '#FFF5F5';
  var cardBg2 = isPrimary ? '#F0EBD8' : '#FFE8E8';
  var accentDark = isPrimary ? forestDeep : ferrariDeep;
  var accentMid  = isPrimary ? forest    : ferrari;
  var accentLight= isPrimary ? forestPale: ferrariPale;
  var qrDark     = isPrimary ? forestDeep: '#a80000';

  // Background gradient (simple two-stop)
  var grad = ctx.createLinearGradient(0,0,W*Math.cos(Math.PI*150/180),H*Math.sin(Math.PI*150/180));
  grad.addColorStop(0, cardBg1); grad.addColorStop(1, cardBg2);
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

  // Top stripe: primary/family split
  if(isPrimary){
    ctx.fillStyle=forest; ctx.fillRect(0,0,W*0.45,10);
    ctx.fillStyle=ferrari; ctx.fillRect(W*0.45,0,W,10);
  } else {
    ctx.fillStyle=ferrari; ctx.fillRect(0,0,W,10);
  }

  // Border
  ctx.strokeStyle='#E5DEC8'; ctx.lineWidth=2;
  ctx.strokeRect(1,1,W-2,H-2);

  // Brand label (top-left)
  ctx.fillStyle=accentDark;
  ctx.font='bold '+(26*DPR/2)+'px "Noto Serif TC",serif';
  ctx.fillText(isPrimary?'老有卡':'老有卡 家庭同行', 36, 50);

  // Badge top-right
  if(isPrimary){
    var badgeW=260, badgeH=44, badgeX=W-badgeW-36, badgeY=26;
    ctx.fillStyle=forestPale; ctx.strokeStyle=forest; ctx.lineWidth=2;
    ctx.beginPath(); ctx.rect(badgeX,badgeY,badgeW,badgeH); ctx.fill(); ctx.stroke();
    ctx.fillStyle=ferrari; ctx.font='bold 18px sans-serif'; ctx.fillText('◆', badgeX+10, badgeY+30);
    ctx.fillStyle=forestDeep; ctx.font='bold 20px "Noto Serif TC",serif';
    ctx.fillText('CoExplorery 探索者', badgeX+34, badgeY+30);
    // Tier label below badge
    ctx.fillStyle=ferrari; ctx.font='bold 20px "Noto Serif TC",serif';
    ctx.textAlign='right';
    ctx.fillText('PRIMARY MEMBER', W-36, badgeY+badgeH+30);
    ctx.textAlign='left';
  } else {
    var badgeW=140, badgeH=40, badgeX=W-badgeW-36, badgeY=28;
    ctx.fillStyle=ferrariPale; ctx.strokeStyle=ferrari; ctx.lineWidth=2;
    ctx.beginPath(); ctx.rect(badgeX,badgeY,badgeW,badgeH); ctx.fill(); ctx.stroke();
    ctx.fillStyle=ferrariDeep; ctx.font='bold 20px "Noto Serif TC",serif'; ctx.textAlign='center';
    ctx.fillText('FAMILY', badgeX+badgeW/2, badgeY+28);
    ctx.textAlign='left';
  }

  // Name block
  var nameY = isPrimary ? 290 : 280;
  ctx.fillStyle='#999'; ctx.font='22px "Noto Serif TC",serif';
  ctx.letterSpacing='8px';
  ctx.fillText('MEMBER NAME · 姓名', 36, nameY);
  ctx.letterSpacing='0px';

  // Chinese name (big)
  ctx.fillStyle=accentDark;
  var zhName = data.nameZh || '';
  var zhFontSize = zhName.length <= 3 ? 88 : zhName.length <= 4 ? 72 : 56;
  ctx.font = 'bold '+zhFontSize+'px "Noto Serif TC",serif';
  ctx.fillText(zhName, 36, nameY + zhFontSize + 8);

  // English name
  if(data.nameEn){
    ctx.fillStyle=accentDark; ctx.font='bold 30px "Noto Serif TC",serif';
    ctx.fillText(data.nameEn, 36, nameY + zhFontSize + 50);
  }

  // Footer: member no
  ctx.fillStyle='#999'; ctx.font='20px "Noto Serif TC",serif';
  ctx.fillText('MEMBER NO.', 36, H-60);
  ctx.fillStyle=accentDark; ctx.font='bold 34px "Space Grotesk",monospace';
  ctx.fillText(data.memberNo || '', 36, H-28);

  // QR code in bottom-right
  var qrSize = 92;
  var qrX = W - qrSize - 36, qrY = H - qrSize - 28;
  // White background + border
  ctx.fillStyle='#fff'; ctx.fillRect(qrX-6,qrY-6,qrSize+12,qrSize+12);
  ctx.strokeStyle=accentMid; ctx.lineWidth=3;
  ctx.strokeRect(qrX-6,qrY-6,qrSize+12,qrSize+12);
  // Draw QR modules
  try {
    var qr = qrcode(0,'H');
    qr.addData(location.origin+'/member/'+(data.memberNo||''));
    qr.make();
    var mc = qr.getModuleCount();
    var cell = Math.floor(qrSize/mc);
    ctx.fillStyle=qrDark;
    for(var row=0;row<mc;row++){
      for(var col=0;col<mc;col++){
        if(qr.isDark(row,col)) ctx.fillRect(qrX+col*cell, qrY+row*cell, cell, cell);
      }
    }
  } catch(e){ console.warn('QR img error',e); }

  // Convert to JPEG blob and show preview
  canvas.toBlob(function(blob){
    if(!blob){ console.warn('canvas.toBlob failed'); return; }
    window._cardBlob = blob;
    window._cardFileName = 'CoEldery85_' + (data.memberNo||'card') + '.jpg';
    var url = URL.createObjectURL(blob);
    var img = document.getElementById('cardImg');
    if(img){ img.src = url; }
    var wrap = document.getElementById('cardImgWrap');
    if(wrap){ wrap.style.display='block'; }
    // Hide the CSS card, show the rendered image instead
    var cssCard = document.getElementById('genCard');
    if(cssCard){ cssCard.style.display='none'; }
  }, 'image/jpeg', 0.95);
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
        <a href="/join">← 我係長者，申請主卡</a>
      </div>
    </form>
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
      <button class="action-btn" style="padding:14px 8px;background:#fff;border:2px solid var(--ferrari);color:var(--ferrari-deep);font-family:'Noto Serif TC',serif;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;" onclick="window.location.href='/join'">← 返回主卡</button>
    </div>

    <button class="wa-link" onclick="shareCardToWA()" style="width:100%;border:0;cursor:pointer;">📱 WhatsApp 分享會員卡圖片</button>
    <div class="footer-links"><a href="/join">← 返回主卡登記</a></div>
  </div>
</div>

<script>
function showErr(msg){var el=document.getElementById('errMsg');el.textContent=msg;el.classList.add('show');el.scrollIntoView({behavior:'smooth'});}
async function submitForm(){
  document.getElementById('errMsg').classList.remove('show');
  var nameZh=document.getElementById('nameZh').value.trim();
  var phone=document.getElementById('phone').value.replace(/\D/g,'');
  var parentPhone=document.getElementById('parentPhone').value.replace(/\D/g,'');
  if(!nameZh){showErr('請填寫中文姓名');return;}
  if(phone.length!==8){showErr('請填寫正確的 8 位電話');return;}
  if(parentPhone.length!==8){showErr('請填寫長輩的 8 位電話');return;}
  if(!document.getElementById('consent').checked){showErr('請同意私隱政策');return;}
  var btn=document.getElementById('submitBtn');
  btn.disabled=true;btn.textContent='處理中…';
  var params=new URLSearchParams(location.search);
  try{
    var res=await fetch('/api/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tier:'FAMILY',nameZh,phone,nameEn:document.getElementById('nameEn').value.trim().toUpperCase(),parentPhone,relation:document.getElementById('relation').value,roadshow:params.get('rs')||'walk-in'})});
    var data=await res.json();
    if(!data.ok){showErr(data.error||'申請失敗，請再試一次');btn.disabled=false;btn.textContent='申請家庭同行卡';return;}
    document.getElementById('formSection').style.display='none';
    document.getElementById('cardZh').textContent=data.nameZh;
    document.getElementById('cardEn').textContent=data.nameEn||'';
    document.getElementById('cardNo').textContent=data.memberNo;
    var cardUrl=location.origin+'/member/'+data.memberNo;
    try { QRCode.toCanvas(document.getElementById('cardQr'),cardUrl,{width:40,margin:0,color:{dark:'#a80000',light:'#ffffff'},errorCorrectionLevel:'H'}); } catch(e) { console.warn('QR error (non-fatal):',e); }
    document.getElementById('successSection').classList.add('show');
    window.scrollTo(0,0);
    setTimeout(function(){ renderCardImage(data, 'FAMILY'); }, 100);
  }catch(e){showErr('網絡錯誤，請再試一次');btn.disabled=false;btn.textContent='申請家庭同行卡';}
}

function renderCardImage(data, tier) {
  var W=680, H=464;
  var canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  var ctx=canvas.getContext('2d');
  var isPrimary=(tier!=='FAMILY');
  var forestDeep='#0d3e12',forest='#2E7D32',forestPale='#E8F5E9';
  var ferrari='#C62828',ferrariDeep='#7f0000',ferrariPale='#FFEBEE';
  var accentDark=isPrimary?forestDeep:ferrariDeep;
  var accentMid=isPrimary?forest:ferrari;
  var qrDark=isPrimary?forestDeep:'#a80000';
  var bg1=isPrimary?'#FAF7F0':'#FFF5F5', bg2=isPrimary?'#F0EBD8':'#FFE8E8';
  var grad=ctx.createLinearGradient(0,0,W*0.5,H);
  grad.addColorStop(0,bg1); grad.addColorStop(1,bg2);
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  if(isPrimary){ctx.fillStyle=forest;ctx.fillRect(0,0,W*0.45,10);ctx.fillStyle=ferrari;ctx.fillRect(W*0.45,0,W,10);}
  else{ctx.fillStyle=ferrari;ctx.fillRect(0,0,W,10);}
  ctx.strokeStyle='#E5DEC8';ctx.lineWidth=2;ctx.strokeRect(1,1,W-2,H-2);
  ctx.fillStyle=accentDark;ctx.font='bold 26px "Noto Serif TC",serif';
  ctx.fillText(isPrimary?'老有卡':'老有卡 家庭同行',36,50);
  if(isPrimary){
    var bW=260,bH=44,bX=W-bW-36,bY=26;
    ctx.fillStyle=forestPale;ctx.strokeStyle=forest;ctx.lineWidth=2;ctx.beginPath();ctx.rect(bX,bY,bW,bH);ctx.fill();ctx.stroke();
    ctx.fillStyle=ferrari;ctx.font='bold 18px sans-serif';ctx.fillText('◆',bX+10,bY+30);
    ctx.fillStyle=forestDeep;ctx.font='bold 20px "Noto Serif TC",serif';ctx.fillText('CoExplorery 探索者',bX+34,bY+30);
    ctx.fillStyle=ferrari;ctx.font='bold 20px "Noto Serif TC",serif';ctx.textAlign='right';ctx.fillText('PRIMARY MEMBER',W-36,bY+bH+30);ctx.textAlign='left';
  }else{
    var bW=140,bH=40,bX=W-bW-36,bY=28;
    ctx.fillStyle=ferrariPale;ctx.strokeStyle=ferrari;ctx.lineWidth=2;ctx.beginPath();ctx.rect(bX,bY,bW,bH);ctx.fill();ctx.stroke();
    ctx.fillStyle=ferrariDeep;ctx.font='bold 20px "Noto Serif TC",serif';ctx.textAlign='center';ctx.fillText('FAMILY',bX+bW/2,bY+28);ctx.textAlign='left';
  }
  var nameY=isPrimary?290:280;
  ctx.fillStyle='#999';ctx.font='22px "Noto Serif TC",serif';ctx.fillText('MEMBER NAME · 姓名',36,nameY);
  ctx.fillStyle=accentDark;
  var zh=data.nameZh||'';
  var zhSz=zh.length<=3?88:zh.length<=4?72:56;
  ctx.font='bold '+zhSz+'px "Noto Serif TC",serif';ctx.fillText(zh,36,nameY+zhSz+8);
  if(data.nameEn){ctx.fillStyle=accentDark;ctx.font='bold 30px "Noto Serif TC",serif';ctx.fillText(data.nameEn,36,nameY+zhSz+50);}
  ctx.fillStyle='#999';ctx.font='20px "Noto Serif TC",serif';ctx.fillText('MEMBER NO.',36,H-60);
  ctx.fillStyle=accentDark;ctx.font='bold 34px "Space Grotesk",monospace';ctx.fillText(data.memberNo||'',36,H-28);
  var qrSz=92,qrX=W-qrSz-36,qrY2=H-qrSz-28;
  ctx.fillStyle='#fff';ctx.fillRect(qrX-6,qrY2-6,qrSz+12,qrSz+12);
  ctx.strokeStyle=accentMid;ctx.lineWidth=3;ctx.strokeRect(qrX-6,qrY2-6,qrSz+12,qrSz+12);
  try{var qr=qrcode(0,'H');qr.addData(location.origin+'/member/'+(data.memberNo||''));qr.make();var mc=qr.getModuleCount(),cell=Math.floor(qrSz/mc);ctx.fillStyle=qrDark;for(var r=0;r<mc;r++){for(var c2=0;c2<mc;c2++){if(qr.isDark(r,c2))ctx.fillRect(qrX+c2*cell,qrY2+r*cell,cell,cell);}}}catch(e){console.warn('QR img err',e);}
  canvas.toBlob(function(blob){
    if(!blob)return;
    window._cardBlob=blob;
    window._cardFileName='CoEldery85_'+(data.memberNo||'card')+'.jpg';
    var url=URL.createObjectURL(blob);
    var img=document.getElementById('cardImg');if(img)img.src=url;
    var wrap=document.getElementById('cardImgWrap');if(wrap)wrap.style.display='block';
    var cssCard=document.getElementById('genCard');if(cssCard)cssCard.style.display='none';
  },'image/jpeg',0.95);
}

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
  return htmlHead('後台管理', `<style>
body{background:#f4f4f0;padding:0;}
.topbar{background:var(--forest-deep);color:#fff;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;}
.topbar .logo{font-family:"Noto Serif TC",serif;font-size:18px;font-weight:700;letter-spacing:2px;}
.topbar .logo em{color:var(--ferrari);font-style:normal;}
.wrap{max-width:1200px;margin:0 auto;padding:32px 24px;}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;}
.stat-card{background:#fff;padding:20px;border-left:4px solid var(--forest);}
.stat-card.red{border-left-color:var(--ferrari);}
.stat-card .n{font-family:"Space Grotesk",sans-serif;font-size:36px;font-weight:700;color:var(--forest-deep);}
.stat-card.red .n{color:var(--ferrari);}
.stat-card .lbl{font-size:12px;color:var(--grey-2);letter-spacing:2px;margin-top:4px;}
.filters{background:#fff;padding:16px 20px;margin-bottom:20px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;}
.filters input,.filters select{padding:8px 12px;border:1px solid var(--line);font-size:13px;font-family:inherit;color:var(--ink);}
.filters button{padding:8px 20px;background:var(--forest);color:#fff;border:0;font-size:13px;cursor:pointer;font-family:inherit;}
.table-wrap{background:#fff;overflow-x:auto;}
table{width:100%;border-collapse:collapse;font-size:13px;}
th{background:var(--forest-deep);color:#fff;padding:10px 12px;text-align:left;font-family:"Noto Serif TC",serif;font-size:12px;letter-spacing:1px;white-space:nowrap;}
td{padding:10px 12px;border-bottom:1px solid var(--line);color:var(--grey-1);white-space:nowrap;}
tr:hover td{background:var(--forest-pale);}
.badge{display:inline-block;padding:2px 8px;font-size:10px;font-weight:700;letter-spacing:1px;}
.badge.primary{background:var(--forest-pale);color:var(--forest-deep);}
.badge.family{background:var(--ferrari-pale);color:var(--ferrari-deep);}
.badge.pending{background:#FFF3B0;color:#7a5a1a;}
.badge.done{background:var(--forest-pale);color:var(--forest-deep);}
.pagination{padding:16px;display:flex;gap:8px;justify-content:center;}
.pagination button{padding:6px 14px;border:1px solid var(--line);background:#fff;cursor:pointer;font-family:inherit;font-size:13px;}
.pagination button.active{background:var(--forest);color:#fff;border-color:var(--forest);}
.search-count{font-size:12px;color:var(--grey-2);padding:8px 20px;}
@media(max-width:768px){.stats-grid{grid-template-columns:1fr 1fr;}.filters{flex-direction:column;}}
</style>`) + `
<body>
<div class="topbar">
  <div class="logo">CoEldery <em>85</em> · 後台管理</div>
  <div style="font-size:12px;opacity:0.7;">admin.coeldery85.com</div>
</div>
<div class="wrap">
  <div class="stats-grid" id="statsGrid">
    <div class="stat-card"><div class="n" id="sTotal">—</div><div class="lbl">總會員數</div></div>
    <div class="stat-card"><div class="n" id="sPrimary">—</div><div class="lbl">主卡</div></div>
    <div class="stat-card"><div class="n" id="sFamily">—</div><div class="lbl">家庭同行卡</div></div>
    <div class="stat-card red"><div class="n" id="sPending">—</div><div class="lbl">待 KYC</div></div>
  </div>

  <div class="filters">
    <input id="search" type="text" placeholder="搜尋：姓名 / 會員編號 / 電話" style="flex:1;min-width:200px;">
    <select id="filterTier">
      <option value="">全部類型</option>
      <option value="PRIMARY">主卡</option>
      <option value="FAMILY">家庭同行</option>
    </select>
    <select id="filterKyc">
      <option value="">全部 KYC</option>
      <option value="PENDING">PENDING</option>
      <option value="DONE">DONE</option>
    </select>
    <button onclick="loadMembers(1)">搜尋</button>
    <button onclick="clearFilters()" style="background:var(--grey-3);">清除</button>
  </div>

  <div class="search-count" id="searchCount"></div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>會員編號</th><th>類型</th><th>中文姓名</th><th>電話</th>
          <th>角色</th><th>KYC</th><th>Roadshow</th><th>有效日期</th><th>登記時間</th><th>操作</th>
        </tr>
      </thead>
      <tbody id="membersTbody"></tbody>
    </table>
  </div>
  <div class="pagination" id="pagination"></div>
</div>

<script>
var currentPage = 1;
var totalPages = 1;

async function loadStats(){
  var r = await fetch('/api/admin/stats');
  var d = await r.json();
  if(d.ok){
    document.getElementById('sTotal').textContent = d.stats.total;
    document.getElementById('sPrimary').textContent = d.stats.primary;
    document.getElementById('sFamily').textContent = d.stats.family;
    document.getElementById('sPending').textContent = d.stats.pending;
  }
}

async function loadMembers(page){
  currentPage = page || 1;
  var search = document.getElementById('search').value.trim();
  var tier = document.getElementById('filterTier').value;
  var kyc = document.getElementById('filterKyc').value;
  var params = new URLSearchParams({page:currentPage,limit:50});
  if(search) params.set('search',search);
  if(tier) params.set('tier',tier);
  if(kyc) params.set('kyc_status',kyc);
  var r = await fetch('/api/admin/members?'+params.toString());
  var d = await r.json();
  if(!d.ok) return;
  totalPages = Math.ceil(d.total/50)||1;
  document.getElementById('searchCount').textContent = '共 '+d.total+' 筆記錄';
  var tbody = document.getElementById('membersTbody');
  tbody.innerHTML = d.members.map(m => \`
    <tr>
      <td><strong>\${m.member_no}</strong></td>
      <td><span class="badge \${m.tier==='PRIMARY'?'primary':'family'}">\${m.tier==='PRIMARY'?'主卡':'家庭'}</span></td>
      <td>\${m.name_zh}</td>
      <td>\${m.phone}</td>
      <td>\${m.role||'CoExplorery'}</td>
      <td><span class="badge \${m.kyc_status==='DONE'?'done':'pending'}">\${m.kyc_status}</span></td>
      <td>\${m.roadshow||'walk-in'}</td>
      <td>\${(m.expires_at||'').slice(0,10)}</td>
      <td>\${(m.created_at||'').slice(0,16).replace('T',' ')}</td>
      <td><button onclick="approveKyc('\${m.member_no}')" style="padding:4px 8px;background:var(--forest);color:#fff;border:0;cursor:pointer;font-size:11px;">KYC ✓</button></td>
    </tr>
  \`).join('');
  renderPagination();
}

function renderPagination(){
  var el = document.getElementById('pagination');
  var pages = [];
  for(var i=1;i<=totalPages;i++) pages.push(i);
  el.innerHTML = pages.map(p => \`<button class="\${p===currentPage?'active':''}" onclick="loadMembers(\${p})">\${p}</button>\`).join('');
}

async function approveKyc(no){
  if(!confirm('確認標記 '+no+' 的 KYC 為 DONE？')) return;
  await fetch('/api/admin/members/'+no,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kyc_status:'DONE'})});
  loadMembers(currentPage);
}

function clearFilters(){
  document.getElementById('search').value='';
  document.getElementById('filterTier').value='';
  document.getElementById('filterKyc').value='';
  loadMembers(1);
}

document.getElementById('search').addEventListener('keydown',function(e){if(e.key==='Enter')loadMembers(1);});

loadStats();
loadMembers(1);
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
    <div style="margin-top:8px;font-size:14px;opacity:0.9;">WhatsApp 技術支援：<strong>9147-7341</strong><br>後台管理：<a href="/admin" style="color:#FFD86B;">coeldery85.com/admin</a></div>
  </div>
</div>
</body></html>`
}

export default app
