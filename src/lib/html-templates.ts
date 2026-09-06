export function dashboardHtml() {
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

export function comingSoonHtml(en: string, zh: string) {
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

export function adminColinkerySectionHtml(): string {
  return `
<!-- CoLinkery 審批 section — 由 admin shell JS 動態注入 -->
<div id="cl-admin-pending-wrap">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <h2 style="font-size:18px;font-weight:700;">🤝 CoLinkery 申請審批</h2>
    <button onclick="loadClPending()" style="background:#1B5E20;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:14px;">重新整理</button>
  </div>
  <div id="cl-pending-list"><p style="color:#888;">載入中…</p></div>
  <h2 style="font-size:18px;font-weight:700;margin:24px 0 12px;">📱 CoLinkery 待發 OTP（忘記密碼）</h2>
  <div id="cl-otp-list"><p style="color:#888;">載入中…</p></div>
</div>
<script>
async function loadClPending(){
  try{
    var res = await fetch('/api/admin/colinkery/pending',{credentials:'include'});
    var d = await res.json();
    if(!d.ok){ document.getElementById('cl-pending-list').innerHTML='<p style="color:#c00;">'+d.error+'</p>'; return; }

    var apps = d.applications||[];
    var html = apps.length===0 ? '<p style="color:#888;">目前無待審批申請</p>' : apps.map(function(a){
      var typeMap={INDIVIDUAL:'個人',GROUP:'小組',COMPANY:'公司',ASSOCIATION:'協會'};
      return '<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 6px rgba(0,0,0,.08);">' +
        '<div style="font-size:15px;font-weight:700;">'+a.name_zh+' （'+a.member_no+'）</div>' +
        '<div style="font-size:13px;color:#666;">電話：'+a.phone+' ｜ 身份：'+(typeMap[a.applicant_type]||a.applicant_type)+'</div>' +
        '<div style="font-size:13px;color:#888;margin-top:4px;">'+a.notes+'</div>' +
        '<div style="font-size:12px;color:#aaa;">申請時間：'+a.created_at+'</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">' +
          '<button onclick="approveClApp('+a.id+')" style="background:#1B5E20;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:14px;">✅ 批准</button>' +
          '<button onclick="rejectClApp('+a.id+')" style="background:#C62828;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:14px;">❌ 拒絕</button>' +
        '</div>' +
      '</div>';
    }).join('');
    document.getElementById('cl-pending-list').innerHTML = html;

    var otps = d.pending_otps||[];
    var otpHtml = otps.length===0 ? '<p style="color:#888;">目前無待發 OTP</p>' : otps.map(function(o){
      var phoneDigits = (o.phone||'').replace(/\\D/g,'');
      var fullPhone = phoneDigits.startsWith('852')?phoneDigits:'852'+phoneDigits;
      var msg = encodeURIComponent('你好'+o.name_zh+'！你的 CoLinkery 密碼重設碼為：'+o.otp_code+'，請於 10 分鐘內使用。');
      var waLink = 'https://wa.me/'+fullPhone+'?text='+msg;
      return '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 1px 6px rgba(0,0,0,.08);">' +
        '<div style="font-size:15px;font-weight:700;">'+o.name_zh+' （'+o.member_no+'）</div>' +
        '<div style="font-size:13px;color:#666;">電話：'+o.phone+'</div>' +
        '<div style="font-size:20px;font-weight:900;color:#1B5E20;letter-spacing:4px;margin:8px 0;">'+o.otp_code+'</div>' +
        '<div style="font-size:12px;color:#aaa;">到期：'+o.expires_at+'</div>' +
        '<a href="'+waLink+'" target="_blank" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;border-radius:8px;padding:8px 16px;font-size:14px;margin-top:8px;">💬 WhatsApp 發送 OTP</a>' +
      '</div>';
    }).join('');
    document.getElementById('cl-otp-list').innerHTML = otpHtml;
  } catch(e){ document.getElementById('cl-pending-list').innerHTML='<p style="color:#c00;">網絡錯誤</p>'; }
}

async function approveClApp(id){
  if(!confirm('確認批准此 CoLinkery 申請？')) return;
  try{
    var res = await fetch('/api/admin/colinkery/approve/'+id,{method:'POST',credentials:'include'});
    var d = await res.json();
    if(!d.ok){ alert(d.error||'批准失敗'); return; }
    alert('✅ 已批准！Holder No: '+d.holder_no+'\\n\\n點擊確定後可用以下連結 WhatsApp 通知申請人：\\n'+d.wa_notify_link);
    // Open wa link
    window.open(d.wa_notify_link,'_blank');
    loadClPending();
  } catch(e){ alert('網絡錯誤'); }
}

async function rejectClApp(id){
  var reason = prompt('請輸入拒絕原因（會顯示給申請人）：');
  if(reason===null) return;
  try{
    var res = await fetch('/api/admin/colinkery/reject/'+id,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reason})});
    var d = await res.json();
    if(!d.ok){ alert(d.error||'拒絕失敗'); return; }
    alert('✅ 已拒絕。\\n點擊確定後可用以下連結通知申請人：\\n'+d.wa_notify_link);
    window.open(d.wa_notify_link,'_blank');
    loadClPending();
  } catch(e){ alert('網絡錯誤'); }
}

// 自動載入
loadClPending();
<\/script>`
}

export function qrRegisterHtml(source: string) {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>快速加入 CoEldery 85</title>
<meta name="theme-color" content="#1a6b1a">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:linear-gradient(160deg,#1a6b1a 0%,#388e3c 45%,#2e7d32 100%);min-height:100vh;
  font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
  display:flex;align-items:center;justify-content:center;padding:20px;}
.card{background:#fff;border-radius:24px;padding:36px 28px 32px;max-width:420px;width:100%;
  box-shadow:0 20px 60px rgba(0,0,0,0.25);}
.logo-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;}
.logo-badge{background:#1a6b1a;color:#fff;font-size:28px;font-weight:900;border-radius:12px;
  padding:6px 14px;letter-spacing:1px;line-height:1.2;}
.logo-text{font-size:18px;font-weight:700;color:#1a6b1a;}
h1{font-size:22px;font-weight:900;color:#1a6b1a;text-align:center;margin:14px 0 4px;line-height:1.35;}
.subtitle{font-size:14px;color:#666;text-align:center;margin-bottom:28px;line-height:1.5;}
.field{margin-bottom:22px;}
.field label{display:block;font-size:15px;font-weight:700;color:#222;margin-bottom:8px;}
.field label span{color:#c62828;}
.field input,.field select{width:100%;padding:14px 16px;font-size:18px;
  border:2px solid #388e3c;border-radius:12px;font-family:inherit;color:#111;
  background:#fff;outline:none;transition:border-color 0.2s;}
.field input:focus,.field select:focus{border-color:#1a6b1a;box-shadow:0 0 0 3px rgba(56,142,60,0.15);}
.field input::placeholder{color:#bbb;}
.btn{width:100%;padding:16px;font-size:18px;font-weight:900;color:#fff;
  background:linear-gradient(135deg,#1a6b1a,#388e3c);border:none;border-radius:14px;
  cursor:pointer;letter-spacing:1px;margin-top:4px;transition:opacity 0.2s;
  -webkit-tap-highlight-color:transparent;}
.btn:active{opacity:0.85;}
.btn:disabled{opacity:0.5;cursor:not-allowed;}
.error-box{background:#FEE2E2;border:1.5px solid #EF4444;border-radius:10px;
  padding:12px 16px;font-size:14px;color:#B91C1C;margin-bottom:18px;display:none;}
.steps{background:#F0FDF4;border-radius:12px;padding:16px 18px;margin-top:22px;}
.steps h3{font-size:13px;font-weight:700;color:#166534;margin-bottom:10px;letter-spacing:0.5px;}
.step-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;}
.step-row:last-child{margin-bottom:0;}
.step-num{background:#1a6b1a;color:#fff;font-size:11px;font-weight:900;
  border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
.step-txt{font-size:13px;color:#166534;line-height:1.5;}
.privacy{font-size:12px;color:#888;text-align:center;margin-top:16px;line-height:1.6;}
.source-badge{display:inline-block;background:#E8F5E9;color:#2e7d32;font-size:11px;
  font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:16px;letter-spacing:0.5px;}
</style>
</head>
<body>
<div class="card">
  <div class="logo-row">
    <div class="logo-badge">85</div>
    <div class="logo-text">CoEldery<br>老有聯盟</div>
  </div>
  <h1>快速加入 CoEldery 85</h1>
  <p class="subtitle">兩步完成登記，立即獲得數碼會員卡</p>

  <div id="errorBox" class="error-box"></div>

  <div class="field">
    <label>姓名 <span>✽</span></label>
    <input type="text" id="fieldName" placeholder="請輸入你的姓名" maxlength="50" autocomplete="name">
  </div>
  <div class="field">
    <label>出生年份 <span>✽</span></label>
    <input type="number" id="fieldYear" placeholder="例如：1960" min="1920" max="2011" inputmode="numeric">
  </div>

  <button class="btn" id="submitBtn" onclick="doSubmit()">
    📱 快速登記（WhatsApp 確認）
  </button>

  <div class="steps">
    <h3>📋 登記步驟</h3>
    <div class="step-row"><div class="step-num">1</div><div class="step-txt">填寫以上資料後點擊「快速登記」</div></div>
    <div class="step-row"><div class="step-num">2</div><div class="step-txt">WhatsApp 自動開啟，預填訊息已準備好</div></div>
    <div class="step-row"><div class="step-num">3</div><div class="step-txt">點擊 WhatsApp 的「發送」按鈕</div></div>
    <div class="step-row"><div class="step-num">4</div><div class="step-txt">系統即時確認，並發送你的數碼會員卡連結</div></div>
  </div>

  <p class="privacy">🔒 你的個人資料受香港個人資料（私隱）條例保護<br>僅用於 CoEldery 85 會員服務</p>
</div>

<script>
var SOURCE = '${source.replace(/'/g,"\\'")}';

function showError(msg){
  var b=document.getElementById('errorBox');
  b.textContent=msg; b.style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
}
function hideError(){ document.getElementById('errorBox').style.display='none'; }

function doSubmit(){
  hideError();
  var name = document.getElementById('fieldName').value.trim();
  var yearStr = document.getElementById('fieldYear').value.trim();
  var year = parseInt(yearStr, 10);

  if (!name || name.length < 1 || name.length > 50){
    showError('請輸入有效的姓名（1-50字）'); return;
  }
  if (!yearStr || isNaN(year) || year < 1920 || year > 2011){
    showError('請輸入有效的出生年份（1920 - 2011）'); return;
  }

  var text = '姓名:' + name + '\\n年份:' + year + '\\nSource:' + SOURCE;
  var url = 'https://wa.me/85254429749?text=' + encodeURIComponent(text);

  // Update button state (keep in sync context for iOS Safari)
  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 正在開啟 WhatsApp...';

  // Must open URL synchronously within the user gesture for iOS Safari
  window.location.href = url;

  // Re-enable button after a delay (in case user returns)
  setTimeout(function(){
    btn.disabled = false;
    btn.textContent = '📱 快速登記（WhatsApp 確認）';
  }, 3000);
}

// Allow Enter key to submit
document.addEventListener('keydown', function(e){
  if (e.key === 'Enter') doSubmit();
});
</script>
</body>
</html>`
}

export function adminQrHtml() {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR 碼管理 — CoEldery 85 Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Noto Sans TC",sans-serif;background:#f5f5f5;color:#111;}
.topbar{background:#1a6b1a;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;}
.topbar h1{font-size:18px;font-weight:900;}
.topbar a{color:#fff;font-size:13px;opacity:0.8;text-decoration:none;}
.main{max-width:1100px;margin:0 auto;padding:20px;}
.tabs{display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid #ddd;}
.tab{padding:10px 20px;cursor:pointer;font-weight:700;font-size:14px;border:none;background:none;color:#666;border-bottom:3px solid transparent;margin-bottom:-2px;}
.tab.active{color:#1a6b1a;border-bottom-color:#1a6b1a;}
.panel{display:none;} .panel.active{display:block;}
.card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.07);margin-bottom:16px;}
.card h2{font-size:16px;font-weight:900;color:#1a6b1a;margin-bottom:16px;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;}
.qr-card{background:#fff;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,0.07);border-left:4px solid #1a6b1a;}
.qr-card.inactive{border-left-color:#ccc;opacity:0.7;}
.qr-card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.qr-card-name{font-size:16px;font-weight:900;color:#111;}
.qr-badge{font-size:11px;font-weight:700;padding:3px 8px;border-radius:10px;white-space:nowrap;}
.badge-active{background:#D1FAE5;color:#065F46;}
.badge-inactive{background:#F3F4F6;color:#6B7280;}
.qr-meta{font-size:13px;color:#666;margin-bottom:12px;line-height:1.7;}
.qr-meta span{margin-right:12px;}
.qr-count{font-size:28px;font-weight:900;color:#1a6b1a;}
.qr-count-label{font-size:12px;color:#888;}
.btn-row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
.btn{padding:7px 14px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;}
.btn-green{background:#1a6b1a;color:#fff;}
.btn-blue{background:#1d4ed8;color:#fff;}
.btn-gray{background:#e5e7eb;color:#374151;}
.btn-red{background:#dc2626;color:#fff;}
.btn-orange{background:#ea580c;color:#fff;}
input,select,textarea{width:100%;padding:10px 12px;font-size:14px;border:1.5px solid #d1d5db;border-radius:8px;font-family:inherit;margin-bottom:10px;outline:none;}
input:focus,select:focus{border-color:#1a6b1a;}
.form-label{font-size:13px;font-weight:700;color:#374151;margin-bottom:4px;display:block;}
.form-row{margin-bottom:12px;}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:16px;}
.stat-box{background:#f9fafb;border-radius:10px;padding:14px;text-align:center;}
.stat-num{font-size:28px;font-weight:900;color:#1a6b1a;}
.stat-lbl{font-size:12px;color:#6b7280;margin-top:2px;}
table{width:100%;border-collapse:collapse;font-size:13px;}
th{background:#f9fafb;padding:10px 12px;text-align:left;font-weight:700;color:#374151;border-bottom:2px solid #e5e7eb;}
td{padding:9px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top;}
tr:hover td{background:#fafafa;}
.status-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;}
.s-success{background:#D1FAE5;color:#065F46;}
.s-format_error,.s-db_error{background:#FEE2E2;color:#991B1B;}
.s-invalid_year,.s-invalid_phone{background:#FEF3C7;color:#92400E;}
.s-duplicate_phone{background:#DBEAFE;color:#1E40AF;}
.s-pending{background:#F3F4F6;color:#6B7280;}
.qr-code-img{border:2px solid #e5e7eb;border-radius:8px;display:block;}
.copy-input{font-size:12px;font-family:monospace;background:#f9fafb;border-color:#e5e7eb;}
.login-section{background:#FEF9C3;border:1.5px solid #FCD34D;border-radius:10px;padding:16px;margin-bottom:20px;}
.login-section h3{font-size:14px;font-weight:900;color:#92400E;margin-bottom:8px;}
.err{color:#dc2626;font-size:13px;margin-bottom:8px;}
#loginSection{margin:80px auto;max-width:360px;background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 4px 20px rgba(0,0,0,0.12);}
</style>
</head>
<body>

<div id="loginSection">
  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:36px">🔐</div>
    <h2 style="font-size:20px;font-weight:900;color:#1a6b1a;margin-top:8px">QR 管理系統</h2>
    <p style="font-size:13px;color:#666;margin-top:4px">CoEldery 85 Admin</p>
  </div>
  <p id="loginErr" class="err" style="display:none"></p>
  <input type="password" id="pwInput" placeholder="管理員密碼" onkeydown="if(event.key==='Enter')doLogin()">
  <button class="btn btn-green" style="width:100%;padding:12px;font-size:15px" onclick="doLogin()">登入</button>
</div>

<div id="adminBody" style="display:none">
<div class="topbar">
  <h1>🔖 QR 碼管理系統</h1>
  <div style="display:flex;gap:16px;align-items:center;">
    <span id="topbarInfo" style="font-size:13px;opacity:0.85"></span>
    <a href="/membership/admin">會員後台</a>
  </div>
</div>

<div class="main">
  <div class="tabs">
    <button class="tab active" onclick="showTab('qrcodes')">🔖 QR 碼管理</button>
    <button class="tab" onclick="showTab('create')">➕ 新增 QR 碼</button>
    <button class="tab" onclick="showTab('logs')">📋 Webhook 日誌</button>
    <button class="tab" onclick="showTab('stats')">📊 統計分析</button>
  </div>

  <!-- QR Codes Panel -->
  <div id="panel-qrcodes" class="panel active">
    <div class="card">
      <h2>🔖 所有 QR 碼</h2>
      <div id="qrGrid" class="grid">
        <p style="color:#888">載入中...</p>
      </div>
    </div>
  </div>

  <!-- Create Panel -->
  <div id="panel-create" class="panel">
    <div class="card" style="max-width:500px">
      <h2>➕ 新增 QR 碼 / Roadshow</h2>
      <div class="form-row">
        <label class="form-label">Source ID <span style="color:#dc2626">✽</span> <small style="color:#888">(英文、數字、底線，如：roadshow_tkl_sep2026)</small></label>
        <input type="text" id="newSourceId" placeholder="roadshow_xxx_sep2026">
      </div>
      <div class="form-row">
        <label class="form-label">顯示名稱 <span style="color:#dc2626">✽</span></label>
        <input type="text" id="newDisplayName" placeholder="例如：旺角 Roadshow">
      </div>
      <div class="form-row">
        <label class="form-label">活動日期</label>
        <input type="date" id="newEventDate">
      </div>
      <div class="form-row">
        <label class="form-label">地點</label>
        <input type="text" id="newLocation" placeholder="例如：旺角朗豪坊廣場">
      </div>
      <div class="form-row">
        <label class="form-label">備註</label>
        <input type="text" id="newNotes" placeholder="（可選）">
      </div>
      <p id="createErr" class="err" style="display:none"></p>
      <p id="createOk" style="color:#1a6b1a;font-size:13px;font-weight:700;display:none">✅ QR 碼已建立！</p>
      <button class="btn btn-green" onclick="doCreate()" style="padding:11px 24px;font-size:15px">建立 QR 碼</button>
    </div>
  </div>

  <!-- Logs Panel -->
  <div id="panel-logs" class="panel">
    <div class="card">
      <h2>📋 WhatsApp Webhook 日誌</h2>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <select id="logFilterStatus" onchange="loadLogs()" style="width:auto;margin:0">
          <option value="">全部狀態</option>
          <option value="success">成功</option>
          <option value="format_error">格式錯誤</option>
          <option value="invalid_year">年份無效</option>
          <option value="duplicate_phone">重複電話</option>
          <option value="db_error">系統錯誤</option>
        </select>
        <select id="logFilterSource" onchange="loadLogs()" style="width:auto;margin:0">
          <option value="">全部來源</option>
        </select>
        <button class="btn btn-gray" onclick="loadLogs()">刷新</button>
      </div>
      <div id="logsTable"><p style="color:#888">載入中...</p></div>
      <div id="logsPager" style="margin-top:12px;display:flex;gap:8px;align-items:center;"></div>
    </div>
  </div>

  <!-- Stats Panel -->
  <div id="panel-stats" class="panel">
    <div class="card">
      <h2>📊 快速登記統計</h2>
      <div style="margin-bottom:16px">
        <label class="form-label" style="display:inline;margin-right:8px">選擇 QR 來源：</label>
        <select id="statsSourceSelect" onchange="loadStats()" style="width:auto;display:inline;margin:0">
          <option value="">── 請選擇 ──</option>
        </select>
      </div>
      <div id="statsContent"><p style="color:#888;font-size:14px">請選擇一個 QR 來源以查看統計</p></div>
    </div>
  </div>
</div>
</div>

<script>
// Simple QR code SVG generation (datamatrix-like using qr.js CDN)
var ADMIN_PW = '';
var logPage = 1;

function doLogin(){
  var pw = document.getElementById('pwInput').value.trim();
  if (!pw){ document.getElementById('loginErr').textContent='請輸入密碼'; document.getElementById('loginErr').style.display='block'; return; }
  fetch('/api/admin/qr-sources?pw='+encodeURIComponent(pw))
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.ok){
      ADMIN_PW = pw;
      document.getElementById('loginSection').style.display='none';
      document.getElementById('adminBody').style.display='block';
      loadAll();
    } else {
      document.getElementById('loginErr').textContent='密碼錯誤';
      document.getElementById('loginErr').style.display='block';
    }
  });
}

function loadAll(){ loadQRCodes(); loadLogsSourceFilter(); }

function showTab(tab){
  document.querySelectorAll('.tab').forEach(function(t,i){ t.classList.toggle('active', ['qrcodes','create','logs','stats'][i]===tab); });
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
  document.getElementById('panel-'+tab).classList.add('active');
  if(tab==='logs') loadLogs();
  if(tab==='stats') loadStatsSourceFilter();
}

function loadQRCodes(){
  fetch('/api/admin/qr-sources?pw='+encodeURIComponent(ADMIN_PW))
  .then(function(r){return r.json();})
  .then(function(d){
    var html='';
    (d.sources||[]).forEach(function(s){
      var url='https://coeldery85.com/qr-register?source='+encodeURIComponent(s.source_id);
      var qrUrl='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(url);
      html += '<div class="qr-card'+(s.status==='inactive'?' inactive':'')+'">' +
        '<div class="qr-card-header">' +
          '<div class="qr-card-name">'+s.display_name+'</div>' +
          '<span class="qr-badge '+(s.status==='active'?'badge-active':'badge-inactive')+'">'+(s.status==='active'?'✅ 啟用':'⏸ 暫停')+'</span>' +
        '</div>' +
        '<div class="qr-meta">' +
          (s.event_date?'<span>📅 '+s.event_date+'</span>':'')+
          (s.location?'<span>📍 '+s.location+'</span>':'')+
        '</div>' +
        '<div style="display:flex;align-items:center;gap:16px;margin-bottom:10px">' +
          '<img src="'+qrUrl+'" width="90" height="90" class="qr-code-img">' +
          '<div><div class="qr-count">'+s.member_count+'</div><div class="qr-count-label">已登記會員</div></div>' +
        '</div>' +
        '<input class="copy-input" value="'+url+'" readonly onclick="this.select()">' +
        '<div class="btn-row">' +
          '<a class="btn btn-blue" href="'+qrUrl+'" target="_blank">🖼 下載QR</a>' +
          '<button class="btn btn-green" onclick="copyLink(\''+url+'\')">📋 複製連結</button>' +
          '<button class="btn btn-gray" onclick="viewStats(\''+s.source_id+'\')">📊 統計</button>' +
          '<button class="btn '+(s.status==='active'?'btn-orange':'btn-green')+'" onclick="toggleStatus(\''+s.source_id+'\',\''+s.status+'\')">'+
            (s.status==='active'?'⏸ 暫停':'▶ 啟用')+'</button>' +
        '</div>' +
      '</div>';
    });
    document.getElementById('qrGrid').innerHTML = html || '<p style="color:#888">尚無QR碼，請先新增</p>';
  });
}

function copyLink(url){
  navigator.clipboard.writeText(url).then(function(){alert('已複製連結！');}).catch(function(){});
}

function toggleStatus(sourceId, currentStatus){
  var newStatus = currentStatus==='active'?'inactive':'active';
  fetch('/api/admin/qr-sources/'+encodeURIComponent(sourceId), {
    method:'PATCH',
    headers:{'Content-Type':'application/json','x-admin-password':ADMIN_PW},
    body:JSON.stringify({status:newStatus})
  }).then(function(){loadQRCodes();});
}

function doCreate(){
  var sourceId = document.getElementById('newSourceId').value.trim().toLowerCase().replace(/[^a-z0-9_\\-]/g,'');
  var displayName = document.getElementById('newDisplayName').value.trim();
  var eventDate = document.getElementById('newEventDate').value;
  var location = document.getElementById('newLocation').value.trim();
  var notes = document.getElementById('newNotes').value.trim();
  document.getElementById('createErr').style.display='none';
  document.getElementById('createOk').style.display='none';
  if(!sourceId||!displayName){ document.getElementById('createErr').textContent='請填寫 Source ID 和顯示名稱'; document.getElementById('createErr').style.display='block'; return; }
  fetch('/api/admin/qr-sources',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-admin-password':ADMIN_PW},
    body:JSON.stringify({source_id:sourceId,display_name:displayName,event_date:eventDate||null,location:location||null,notes:notes})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok){ document.getElementById('createOk').style.display='block'; document.getElementById('newSourceId').value=''; document.getElementById('newDisplayName').value=''; loadQRCodes(); }
    else { document.getElementById('createErr').textContent=d.error||'建立失敗'; document.getElementById('createErr').style.display='block'; }
  });
}

function loadLogsSourceFilter(){
  fetch('/api/qr-sources').then(function(r){return r.json();}).then(function(d){
    var sel=document.getElementById('logFilterSource');
    (d.sources||[]).forEach(function(s){ sel.innerHTML+='<option value="'+s.source_id+'">'+s.display_name+'</option>'; });
  });
}

function loadLogs(){
  var status=document.getElementById('logFilterStatus').value;
  var source=document.getElementById('logFilterSource').value;
  var url='/api/admin/webhook-logs?pw='+encodeURIComponent(ADMIN_PW)+'&page='+logPage;
  if(status) url+='&status='+encodeURIComponent(status);
  if(source) url+='&source='+encodeURIComponent(source);
  fetch(url).then(function(r){return r.json();}).then(function(d){
    var rows=(d.logs||[]);
    var html='<table><thead><tr><th>時間</th><th>電話</th><th>姓名</th><th>年份</th><th>來源</th><th>狀態</th><th>會員號</th></tr></thead><tbody>';
    rows.forEach(function(l){
      var statusMap={'success':'成功','format_error':'格式錯誤','invalid_year':'年份無效','duplicate_phone':'重複電話','db_error':'系統錯誤','pending':'處理中','invalid_phone':'電話無效'};
      html+='<tr>'+
        '<td style="white-space:nowrap">'+((l.created_at||'').substring(0,16))+'</td>'+
        '<td>'+maskPhone(l.from_number||'')+'</td>'+
        '<td>'+(l.parsed_name||'<span style="color:#ccc">—</span>')+'</td>'+
        '<td>'+(l.parsed_year||'<span style="color:#ccc">—</span>')+'</td>'+
        '<td style="font-size:12px">'+(l.parsed_source||'<span style="color:#ccc">—</span>')+'</td>'+
        '<td><span class="status-badge s-'+(l.validation_result||'pending')+'">'+(statusMap[l.validation_result]||l.validation_result)+'</span></td>'+
        '<td>'+(l.member_no||'<span style="color:#ccc">—</span>')+'</td>'+
      '</tr>';
    });
    html+='</tbody></table>';
    document.getElementById('logsTable').innerHTML=html;
    document.getElementById('logsPager').innerHTML=
      '<button class="btn btn-gray" onclick="logPage=Math.max(1,logPage-1);loadLogs()" '+(logPage<=1?'disabled':'')+'>上一頁</button>'+
      '<span style="font-size:13px;color:#666">第 '+logPage+' 頁 · 共 '+(d.total||0)+' 條</span>'+
      '<button class="btn btn-gray" onclick="logPage++;loadLogs()" '+((logPage*50>=(d.total||0))?'disabled':'')+'>下一頁</button>';
  });
}

function maskPhone(p){ if(p.length>=8) return p.substring(0,4)+'****'+p.substring(p.length-2); return p; }

function loadStatsSourceFilter(){
  fetch('/api/qr-sources').then(function(r){return r.json();}).then(function(d){
    var sel=document.getElementById('statsSourceSelect');
    sel.innerHTML='<option value="">── 請選擇 ──</option>';
    (d.sources||[]).forEach(function(s){ sel.innerHTML+='<option value="'+s.source_id+'">'+s.display_name+'</option>'; });
  });
}

function viewStats(sourceId){
  showTab('stats');
  document.getElementById('statsSourceSelect').value=sourceId;
  loadStats();
}

function loadStats(){
  var sourceId=document.getElementById('statsSourceSelect').value;
  if(!sourceId){ document.getElementById('statsContent').innerHTML='<p style="color:#888;font-size:14px">請選擇一個 QR 來源以查看統計</p>'; return; }
  fetch('/api/admin/qr-sources/'+encodeURIComponent(sourceId)+'/stats?pw='+encodeURIComponent(ADMIN_PW))
  .then(function(r){return r.json();}).then(function(d){
    if(!d.ok){ document.getElementById('statsContent').innerHTML='<p style="color:#dc2626">查詢失敗</p>'; return; }
    var gMap={'M':'男','F':'女','Other':'其他','Prefer not to say':'不說','':'未填'};
    var tMap={'PRIMARY':'主卡（55+）','FAMILY':'家庭卡'};
    var sMap={'incomplete':'未完整','complete':'已完整'};
    var currentYear=new Date().getFullYear();
    var avgAge=d.avg_birth_year?currentYear-d.avg_birth_year:null;

    var html='<div class="stat-grid">'+
      '<div class="stat-box"><div class="stat-num">'+d.total+'</div><div class="stat-lbl">總登記人數</div></div>'+
      (avgAge?'<div class="stat-box"><div class="stat-num">'+avgAge+'</div><div class="stat-lbl">平均年齡</div></div>':'')+
    '</div>';

    html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-top:16px">';

    html+='<div><h3 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">📊 會員類型</h3>';
    (d.by_tier||[]).forEach(function(r){ html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px"><span>'+(tMap[r.tier]||r.tier)+'</span><strong>'+r.cnt+'</strong></div>'; });
    html+='</div>';

    html+='<div><h3 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">⚧ 性別分佈</h3>';
    (d.by_gender||[]).forEach(function(r){ html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px"><span>'+(gMap[r.gender||'']||r.gender)+'</span><strong>'+r.cnt+'</strong></div>'; });
    html+='</div>';

    html+='<div><h3 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">✅ 完成率</h3>';
    (d.by_status||[]).forEach(function(r){ html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px"><span>'+(sMap[r.registration_status]||r.registration_status)+'</span><strong>'+r.cnt+'</strong></div>'; });
    html+='</div>';

    if((d.by_district||[]).length>0){
      html+='<div><h3 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">🗺 地區分佈（Top 10）</h3>';
      (d.by_district||[]).forEach(function(r){ html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px"><span>'+(r.district||'未填')+'</span><strong>'+r.cnt+'</strong></div>'; });
      html+='</div>';
    }

    html+='</div>';
    document.getElementById('statsContent').innerHTML=html;
  });
}

document.getElementById('pwInput').addEventListener('keydown',function(e){ if(e.key==='Enter') doLogin(); });
</script>
</body>
</html>`
}

export function walletHtml(prefillMember: string, prefillPhone = ''): string {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>我的錢包 · CoEldery 85</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#F0EBD8;min-height:100vh;font-family:"Noto Sans TC","PingFang TC",sans-serif;font-size:18px;line-height:1.6;color:#111;}
.topbar{background:linear-gradient(135deg,#1B5E20,#2E7D32);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:12px;}
.topbar .back{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:4px 8px;border-radius:6px;}
.topbar .title{font-size:20px;font-weight:900;letter-spacing:1px;}
.wrap{max-width:480px;margin:0 auto;padding:18px 16px 40px;}
/* Login */
.login-card{background:#fff;border-radius:14px;padding:28px 20px;box-shadow:0 2px 10px rgba(0,0,0,.08);margin-bottom:16px;}
.login-card h2{font-size:22px;font-weight:900;color:#1B5E20;margin-bottom:12px;}
.login-card p{font-size:17px;color:#555;margin-bottom:18px;line-height:1.6;}
input.big-in{width:100%;padding:13px 14px;font-size:18px;border:2px solid #a5d6a7;border-radius:8px;font-family:inherit;outline:none;}
input.big-in:focus{border-color:#1B5E20;}
.big-btn{display:block;width:100%;padding:16px;margin-top:14px;background:#2E7D32;color:#fff;border:none;border-radius:10px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;}
.big-btn:disabled{background:#a5d6a7;cursor:not-allowed;}
.err{margin-top:10px;padding:10px 14px;background:#ffebee;border:2px solid #c62828;border-radius:8px;color:#c62828;font-size:16px;font-weight:700;display:none;}
.err.show{display:block;}
/* Summary */
.summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
.sum-card{background:#fff;border-radius:12px;padding:14px 12px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.07);}
.sum-num{font-size:22px;font-weight:900;color:#1B5E20;}
.sum-label{font-size:13px;color:#777;margin-top:4px;}
/* Entries */
.section-title{font-size:18px;font-weight:900;color:#1B5E20;margin:16px 0 10px;border-left:4px solid #2E7D32;padding-left:10px;}
.entry-card{background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.07);}
.entry-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.entry-project{font-size:15px;font-weight:700;color:#1B5E20;}
.entry-role{font-size:13px;color:#888;}
.entry-amount{font-size:20px;font-weight:900;color:#1B5E20;}
.entry-meta{display:flex;justify-content:space-between;align-items:center;margin-top:6px;}
.status-badge{font-size:12px;font-weight:700;padding:3px 8px;border-radius:5px;}
.status-POSTED{background:#E8F5E9;color:#1B5E20;}
.status-PENDING_PAYOUT{background:#FFF3E0;color:#E65100;}
.status-PAID{background:#E3F2FD;color:#1565C0;}
.status-RESERVED{background:#F3E5F5;color:#6A1B9A;}
.status-PENDING_CONFIRM{background:#FAFAFA;color:#777;}
.hash-text{font-size:11px;color:#bbb;word-break:break-all;margin-top:6px;font-family:monospace;}
.empty-box{text-align:center;padding:50px 20px;color:#999;}
.empty-box .icon{font-size:52px;margin-bottom:14px;}
.loading-box{text-align:center;padding:50px 20px;font-size:18px;color:#888;}
/* Project cards */
.proj-card-w{background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:4px solid #2E7D32;}
.proj-card-w.draft{border-left-color:#9CA3AF;}
.proj-card-w.settling{border-left-color:#D97706;}
.proj-card-w.settled{border-left-color:#1565C0;}
.proj-card-w.closed{border-left-color:#6B7280;}
.proj-title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;}
.proj-name-w{font-size:16px;font-weight:800;color:#1B5E20;}
.proj-code-w{font-size:12px;font-family:monospace;background:#F3F4F6;padding:2px 7px;border-radius:4px;color:#6B7280;}
.proj-status-w{font-size:12px;font-weight:700;padding:3px 9px;border-radius:10px;}
.ps-DRAFT{background:#F3F4F6;color:#6B7280;}
.ps-ACTIVE{background:#D1FAE5;color:#065F46;}
.ps-SETTLING{background:#FEF3C7;color:#D97706;}
.ps-SETTLED{background:#DBEAFE;color:#1565C0;}
.ps-CLOSED{background:#F3F4F6;color:#6B7280;}
.team-row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 6px;}
.team-chip{font-size:12px;background:#F0FDF4;border:1px solid #BBF7D0;color:#166534;padding:3px 9px;border-radius:8px;font-weight:600;}
.team-chip.me{background:#ECFDF5;border-color:#6EE7B7;color:#065F46;}
.my-share-row{font-size:13px;color:#374151;margin-top:4px;}
.my-share-row strong{color:#8B0000;}
/* Role group blocks */
.role-section{margin:10px 0 4px;}
.role-section-header{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
.role-section-label{font-size:13px;font-weight:700;color:#1B5E20;}
.role-section-pool{font-size:12px;color:#6B7280;background:#F3F4F6;padding:2px 8px;border-radius:10px;}
.role-members-row{display:flex;flex-wrap:wrap;gap:6px;}
.member-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;background:#F0FDF4;border:1.5px solid #BBF7D0;color:#166534;padding:4px 11px;border-radius:20px;line-height:1.4;}
.member-chip .chip-name{font-weight:700;}
.member-chip .chip-pct{color:#059669;font-weight:700;}
.role-divider{border:none;border-top:1px solid #F0F0F0;margin:8px 0 0;}
</style>
</head>
<body>
<div class="topbar">
  <button class="back" onclick="goBack()">&#8592;</button>
  <span class="title">&#x1F4B0; \u6211\u7684\u9322\u5305</span>
</div>
<div class="wrap">

  <!-- 電話登入 -->
  <div id="loginSection" class="login-card">
    <h2>&#x1F511; \u9a57\u8b49\u8eab\u4efd</h2>
    <p>\u8acb\u8f38\u5165\u4f60\u7684\u6703\u54e1\u96fb\u8a71\u865f\u78bc\u4f86\u67e5\u770b\u9322\u5305</p>
    <input class="big-in" type="tel" id="walletPhone" inputmode="numeric" placeholder="\u96fb\u8a71\u865f\u78bc">
    <button class="big-btn" id="walletLoginBtn" onclick="loadWallet()">\uD83D\uDD0D \u67e5\u770b\u9322\u5305</button>
    <div class="err" id="walletErr"></div>
  </div>

  <!-- 錢包內容 -->
  <div id="walletContent" style="display:none;">
    <!-- 角色徽章 -->
    <div id="holdersRow" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;"></div>
    <!-- 彙總 -->
    <div class="summary-grid" id="summaryGrid"></div>
    <!-- 關聯項目 -->
    <div class="section-title" id="projSectionTitle" style="display:none;">\uD83D\uDCC2 \u95dc\u806f\u9805\u76ee</div>
    <div id="projList"></div>
    <!-- 分成記錄 -->
    <div class="section-title">\uD83D\uDCB0 \u5206\u6210\u8a18\u9304</div>
    <div id="entriesList"></div>
  </div>

  <div id="loadingBox" class="loading-box" style="display:none;">\u8f09\u5165\u4e2d\u2026</div>
  <div id="emptyBox" class="empty-box" style="display:none;">
    <div class="icon">&#x1F4BC;</div>
    <div>\u5c1a\u672a\u6709\u5206\u6210\u8a18\u9304\u3002<br>\u5be9\u6838\u901a\u904e\u5f8c\u5c07\u9677\u5c55\u793a\u5206\u6210\u8a18\u9304\u3002</div>
  </div>

</div>
<script>
var memberNo = '${prefillMember}';
var walletPhone = '';

function goBack() {
  window.location.href = '/app' + (memberNo ? '?member=' + encodeURIComponent(memberNo) : '');
}

// 預填電話：優先用 server 傳入的 prefillPhone，其次 sessionStorage
(function init() {
  var p = '${prefillPhone}' || sessionStorage.getItem('ce85_phone') || '';
  if (p) {
    document.getElementById('walletPhone').value = p;
    // 自動觸發載入
    setTimeout(function() { loadWallet(); }, 100);
  }
})();

function loadWallet() {
  var phone = document.getElementById('walletPhone').value.trim();
  if (!phone) {
    showErr('\u8acb\u8f38\u5165\u96fb\u8a71\u865f\u78bc');
    return;
  }
  walletPhone = phone;
  sessionStorage.setItem('ce85_phone', phone);
  document.getElementById('walletLoginBtn').disabled = true;
  document.getElementById('walletLoginBtn').textContent = '\u8f09\u5165\u4e2d\u2026';
  document.getElementById('loadingBox').style.display = '';
  document.getElementById('loginSection').style.display = 'none';

  fetch('/api/partner/wallet?phone=' + encodeURIComponent(phone))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      document.getElementById('loadingBox').style.display = 'none';
      document.getElementById('walletLoginBtn').disabled = false;
      document.getElementById('walletLoginBtn').textContent = '\uD83D\uDD0D \u67e5\u770b\u9322\u5305';
      if (!d.ok) {
        document.getElementById('loginSection').style.display = '';
        showErr(d.error || '\u67e5\u8a62\u5931\u6557');
        return;
      }
      renderWallet(d);
    }).catch(function() {
      document.getElementById('loadingBox').style.display = 'none';
      document.getElementById('loginSection').style.display = '';
      document.getElementById('walletLoginBtn').disabled = false;
      document.getElementById('walletLoginBtn').textContent = '\uD83D\uDD0D \u67e5\u770b\u9322\u5305';
      showErr('\u7db2\u7d61\u932f\u8aa4\uff0c\u8acb\u91cd\u8a66');
    });
}

function renderWallet(d) {
  document.getElementById('walletContent').style.display = '';

  // Holders badges
  var holdersRow = document.getElementById('holdersRow');
  holdersRow.innerHTML = '';
  (d.holders || []).forEach(function(h) {
    var span = document.createElement('div');
    span.style.cssText = 'background:#1B5E20;color:#fff;padding:6px 14px;border-radius:20px;font-size:14px;font-weight:700;';
    var roleLabel = h.role === 'COLEADERY' ? '\uD83C\uDF1F CoLeadery \u9818\u822a\u8005' : '\uD83E\uDD1D CoLinkery \u9023\u7d50\u8005';
    var typeLabel = h.applicant_type === 'GROUP' ? ' (\u5c0f\u7d44)' : h.applicant_type === 'COMPANY' ? ' (\u516c\u53f8)' : '';
    span.textContent = roleLabel + ' \u00b7 ' + h.holder_no + typeLabel;
    holdersRow.appendChild(span);
  });

  // Summary
  var s = d.summary || {};
  var fmt = function(c) { return 'HK$' + ((c || 0) / 100).toLocaleString('zh-HK', { minimumFractionDigits: 0 }); };
  document.getElementById('summaryGrid').innerHTML =
    '<div class="sum-card"><div class="sum-num">' + fmt(s.total_posted) + '</div><div class="sum-label">\u5df2\u5165\u5e33 (POSTED)</div></div>' +
    '<div class="sum-card"><div class="sum-num">' + fmt(s.total_pending_payout) + '</div><div class="sum-label">\u5f85\u51fa\u6b3e</div></div>' +
    '<div class="sum-card"><div class="sum-num">' + fmt(s.total_paid) + '</div><div class="sum-label">\u5df2\u5be6\u969b\u51fa\u6b3e</div></div>' +
    '<div class="sum-card"><div class="sum-num">' + fmt((s.total_posted||0) + (s.total_pending_payout||0) + (s.total_paid||0)) + '</div><div class="sum-label">\u7d2f\u8a08\u5206\u6210</div></div>';

  // Projects
  var projList = document.getElementById('projList');
  var projects = d.projects || [];
  var projTitleEl = document.getElementById('projSectionTitle');
  if (projects.length) {
    projTitleEl.style.display = '';
    var myHolderNos = (d.holders || []).map(function(h) { return h.holder_no; });
    var projStatusLabels = {DRAFT:'\u8349\u7a3f',ACTIVE:'\u9032\u884c\u4e2d',SETTLING:'\u7d50\u7b97\u4e2d',SETTLED:'\u5df2\u7d50\u7b97',CLOSED:'\u5df2\u95dc\u9589'};
    var roleLabelsShort = {COLEADERY:'\uD83C\uDF1F CoLeadery',COLINKERY:'\uD83E\uDD1D CoLinkery'};
    projList.innerHTML = projects.map(function(proj) {
      var stLabel = projStatusLabels[proj.project_status] || proj.project_status;
      var stKey = proj.project_status || 'DRAFT';
      var team = proj.team || [];

      // 按 role 分組 team（COLEADERY / COLINKERY 各一組）
      var roleOrder = ['COLEADERY', 'COLINKERY'];
      var roleIcons = {COLEADERY: '🌟', COLINKERY: '🤝'};
      var roleFullLabels = {COLEADERY: 'CoLeadery 領航者', COLINKERY: 'CoLinkery 連結者'};

      // 建立 role → participants 的 map
      var teamByRole = {};
      team.forEach(function(tm) {
        if (!teamByRole[tm.role]) teamByRole[tm.role] = [];
        teamByRole[tm.role].push(tm);
      });

      // 我的角色 set，方便判斷 isMyRole
      var myRoles = proj.myRoles || [];
      var myRoleSet = {};
      myRoles.forEach(function(mr) { myRoleSet[mr.role] = true; });

      // 生成每個角色的區塊 HTML（只顯示有參與者的角色）
      var roleSectionsHtml = '';
      var hasAnyRole = false;
      roleOrder.forEach(function(role) {
        var participants = teamByRole[role];
        if (!participants || participants.length === 0) return;
        hasAnyRole = true;

        // 計算角色池佔項目收益 %
        var poolBps = role === 'COLEADERY' ? (proj.pct_coleadery || 0) : (proj.pct_colinkery || 0);
        var poolPct = Math.round(poolBps / 100);
        var poolLabel = poolPct > 0 ? '佔項目收益 ' + poolPct + '%' : '';

        // 展開成員 chips
        var memberChips = [];
        participants.forEach(function(tm) {
          var tmShare = Math.round((tm.team_share_bps || 0) / 100);
          if (tm.applicant_type === 'GROUP' && tm.group_members && tm.group_members.length > 0) {
            // GROUP holder → 展開每個小組成員
            tm.group_members.forEach(function(gm) {
              memberChips.push(
                '<span class="member-chip">' +
                  '<span class="chip-name">' + escHtml(gm.name_zh) + '</span>' +
                  '<span style="color:#9CA3AF;margin:0 2px;">·</span>' +
                  '<span class="chip-pct">' + gm.share_pct + '%</span>' +
                '</span>'
              );
            });
          } else {
            // INDIVIDUAL / COMPANY → 直接顯示 holder 名
            memberChips.push(
              '<span class="member-chip">' +
                '<span class="chip-name">' + escHtml(tm.name_zh) + '</span>' +
                '<span style="color:#9CA3AF;margin:0 2px;">·</span>' +
                '<span class="chip-pct">' + tmShare + '%</span>' +
              '</span>'
            );
          }
        });

        var isMyRole = myRoleSet[role] ? true : false;
        roleSectionsHtml +=
          '<div class="role-section">' +
            '<div class="role-section-header">' +
              (isMyRole ? '<span style="font-size:10px;font-weight:700;color:#065F46;background:#D1FAE5;border-radius:4px;padding:1px 6px;margin-right:4px;">我的角色</span>' : '') +
              '<span class="role-section-label">' + roleIcons[role] + ' ' + roleFullLabels[role] + '</span>' +
              (poolLabel ? '<span class="role-section-pool">' + poolLabel + '</span>' : '') +
            '</div>' +
            '<div class="role-members-row">' + memberChips.join('') + '</div>' +
          '</div>';
      });

      return '<div class="proj-card-w ' + stKey.toLowerCase() + '">' +
        '<div class="proj-title-row">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
            '<span class="proj-name-w">' + escHtml(proj.project_name) + '</span>' +
            '<span class="proj-code-w">' + escHtml(proj.project_code) + '</span>' +
          '</div>' +
          '<span class="proj-status-w ps-' + stKey + '">' + stLabel + '</span>' +
        '</div>' +
        (hasAnyRole ? roleSectionsHtml : '') +
        (proj.confirm_status === 'PENDING' ? '<div style="font-size:12px;color:#D97706;margin-top:6px;">⚠️ 尚待確認參與</div>' : '') +
      '</div>';
    }).join('');
  } else {
    projTitleEl.style.display = 'none';
    projList.innerHTML = '';
  }

  // Entries
  var list = document.getElementById('entriesList');
  var entries = d.entries || [];
  if (!entries.length) {
    document.getElementById('emptyBox').style.display = '';
    list.innerHTML = '';
    return;
  }
  var statusLabels = {
    PENDING_CONFIRM: '\u5f85\u78ba\u8a8d',
    POSTED: '\u5df2\u5165\u5e33',
    PENDING_PAYOUT: '\u5f85\u51fa\u6b3e',
    PAID: '\u5df2\u51fa\u6b3e',
    RESERVED: '\u6c60\u985e\u9810\u7559'
  };
  var roleLabels = {
    COLEADERY: '\uD83C\uDF1F CoLeadery \u9818\u822a\u8005\u4efd\u984d',
    COLINKERY: '\uD83E\uDD1D CoLinkery \u9023\u7d50\u8005\u4efd\u984d',
    COOWNERY_POOL: '\uD83C\uDFE0 CoOwnery \u6c60',
    COSUPPORTERY_POOL: '\uD83E\uDD1D CoSupportery \u6c60',
    MUTUAL_FUND: '\uD83D\uDCB3 \u4e92\u52a9\u57fa\u91d1',
    PLATFORM_FEE: '\uD83D\uDCBC \u5e73\u53f0\u8cbb',
    SPECIAL_ACCOUNT: '\uD83C\uDF1F \u7279\u5225\u8cc7\u91d1'
  };
  list.innerHTML = entries.map(function(e) {
    var statusClass = 'status-' + (e.status || 'PENDING_CONFIRM');
    var statusText = statusLabels[e.status] || e.status;
    var roleText = roleLabels[e.role_or_pool] || e.role_or_pool;
    var dateStr = e.created_at ? e.created_at.slice(0,10) : '';
    var paidStr = e.paid_at ? ' \u00b7 \u51fa\u6b3e: ' + e.paid_at.slice(0,10) : '';
    var hashStr = e.hash ? '<div class="hash-text">\u5b58\u8b49: ' + e.hash + '</div>' : '';
    return '<div class="entry-card">' +
      '<div class="entry-header">' +
        '<div><div class="entry-project">' + (e.project_name||'\u9805\u76ee') + ' <span style="font-size:13px;color:#aaa;">' + (e.project_code||'') + '</span></div>' +
        '<div class="entry-role">' + roleText + '</div></div>' +
        '<div class="entry-amount">' + fmt(e.amount_cents) + '</div>' +
      '</div>' +
      '<div class="entry-meta">' +
        '<span class="status-badge ' + statusClass + '">' + statusText + '</span>' +
        '<span style="font-size:13px;color:#999;">' + dateStr + paidStr + '</span>' +
      '</div>' +
      hashStr +
    '</div>';
  }).join('');
}

function showErr(msg) {
  var el = document.getElementById('walletErr');
  el.textContent = msg;
  el.classList.add('show');
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
</script>
</body>
</html>`
}

export function teamConfirmHtml(token: string): string {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>團隊邀請確認 · CoEldery 85</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#F0EBD8;min-height:100vh;font-family:"Noto Sans TC","PingFang TC",sans-serif;font-size:18px;line-height:1.6;color:#111;}
.topbar{background:linear-gradient(135deg,#8B0000,#C62828);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:12px;}
.topbar .title{font-size:20px;font-weight:900;letter-spacing:1px;}
.wrap{max-width:480px;margin:0 auto;padding:18px 16px 40px;}
.card{background:#fff;border-radius:14px;padding:24px 20px;box-shadow:0 2px 10px rgba(0,0,0,.08);margin-bottom:16px;}
.card h2{font-size:20px;font-weight:900;color:#8B0000;margin-bottom:12px;}
.info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:16px;}
.info-row:last-child{border-bottom:none;}
.info-label{color:#6B7280;}
.info-val{font-weight:700;color:#111;}
.big-btn{display:block;width:100%;padding:16px;margin-top:12px;border:none;border-radius:10px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;}
.btn-confirm{background:#1B5E20;color:#fff;}
.btn-reject{background:#9CA3AF;color:#fff;margin-top:8px;}
.big-btn:disabled{opacity:.5;cursor:not-allowed;}
.phone-row{display:flex;gap:8px;margin-top:14px;}
.phone-in{flex:1;padding:13px 14px;font-size:18px;border:2px solid #a5d6a7;border-radius:8px;font-family:inherit;outline:none;}
.phone-in:focus{border-color:#1B5E20;}
.err{margin-top:10px;padding:10px 14px;background:#ffebee;border:2px solid #c62828;border-radius:8px;color:#c62828;font-size:15px;font-weight:700;display:none;}
.err.show{display:block;}
.ok-box{text-align:center;padding:40px 20px;}
.ok-icon{font-size:56px;margin-bottom:14px;}
.ok-title{font-size:22px;font-weight:900;color:#1B5E20;margin-bottom:8px;}
.ok-text{font-size:16px;color:#555;}
.rej-box{text-align:center;padding:40px 20px;}
.rej-icon{font-size:56px;margin-bottom:14px;}
.rej-title{font-size:22px;font-weight:900;color:#6B7280;margin-bottom:8px;}
.loading-box{text-align:center;padding:50px 20px;font-size:18px;color:#888;}
.field-group{margin-bottom:14px;}
.field-group label{display:block;font-size:15px;font-weight:700;color:#374151;margin-bottom:6px;}
.field-group input,.field-group select{width:100%;padding:11px 13px;border:1.5px solid #D1D5DB;border-radius:8px;font-size:16px;font-family:inherit;outline:none;}
.field-group input:focus,.field-group select:focus{border-color:#8B0000;}
.field-group .hint{font-size:13px;color:#9CA3AF;margin-top:4px;}
.upload-area{border:2px dashed #C62828;border-radius:10px;padding:16px;text-align:center;cursor:pointer;background:#FFF9F9;margin-top:6px;}
.upload-status{font-size:14px;color:#666;margin-top:6px;min-height:20px;}
.upload-status.ok{color:#2E7D32;font-weight:700;}
</style>
</head>
<body>
<div class="topbar">
  <div class="title">CoEldery 85 · 團隊確認</div>
</div>
<div class="wrap">
  <div id="loadingBox" class="card loading-box">⏳ 載入邀請資訊中…</div>
  <div id="mainBox" style="display:none;">
    <div class="card" id="inviteCard">
      <h2>📋 團隊加入邀請</h2>
      <div id="inviteDetails"></div>
    </div>
    <!-- 步驟1：驗證身份 -->
    <div class="card" id="stepVerify">
      <div style="font-size:16px;font-weight:700;color:#374151;margin-bottom:10px;">第一步：輸入你的電話號碼驗證身份</div>
      <div class="phone-row">
        <input type="tel" id="confirmPhone" class="phone-in" placeholder="電話號碼" maxlength="8" inputmode="numeric">
      </div>
      <div class="err" id="verifyErr"></div>
      <button class="big-btn btn-confirm" id="btnVerify" style="margin-top:12px;" onclick="doVerify()">🔍 驗證身份</button>
    </div>
    <!-- 步驟2：個人正式資料（KYC） -->
    <div class="card" id="stepKyc" style="display:none;">
      <h2>📋 第二步：個人正式資料</h2>
      <div id="kycStatusNote" style="display:none;background:#DCFCE7;border:1.5px solid #4CAF50;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:14px;color:#1B4332;"></div>
      <div id="kycNewNote" style="display:none;background:#FFF9E6;border:1.5px solid #FFB300;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:14px;color:#795548;">
        ⚠️ 加入團隊前需先登記個人正式資料，資料將用於身份核實及分成結算。
      </div>
      <!-- 身份核實提示 -->
      <div style="background:#FFF3E0;border:1.5px solid #FF9800;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:13px;color:#E65100;">
        🪪 <strong>身份核實說明：</strong>請親身出示 HKID 予管理員核實，分成款項於核實後方可發放。
      </div>
      <!-- HKID（1 letter + 3 digits） -->
      <div class="field-group" id="kycIdGroup">
        <label>身份證號碼首 4 位 <span style="color:#C62828;">*</span></label>
        <input type="text" id="tcKycId" placeholder="例: A123" maxlength="4" autocapitalize="characters" oninput="this.value=this.value.toUpperCase()">
        <div class="hint" id="tcKycIdHint">填寫 HKID 首 1 個英文字母及後 3 位數字，例：A123</div>
      </div>
      <!-- 電郵 -->
      <div class="field-group">
        <label>電郵地址 <span style="color:#C62828;">*</span></label>
        <input type="text" id="tcKycEmail" placeholder="your@email.com" inputmode="email" autocorrect="off" autocapitalize="none">
        <div class="hint">用於接收分成結算通知</div>
      </div>
      <!-- 推薦人 -->
      <div class="field-group">
        <label>推薦人電話號碼 <span style="color:#C62828;" id="tcRefReq">*</span></label>
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <input type="tel" id="tcRefPhone" placeholder="推薦人電話" maxlength="8" inputmode="numeric" style="flex:1;" oninput="lookupTcReferral()">
          <div id="tcRefStatus" style="min-width:28px;padding-top:11px;font-size:18px;"></div>
        </div>
        <div class="hint">推薦人必須已是 CoEldery 85 會員</div>
        <div id="tcRefFound" style="display:none;background:#DCFCE7;border-radius:6px;padding:8px 12px;font-size:14px;color:#1B4332;margin-top:6px;"></div>
      </div>
      <!-- 銀行 -->
      <div class="field-group">
        <label>銀行名稱 <span style="color:#C62828;">*</span></label>
        <select id="tcKycBank" onchange="autoFillTcSwift()">
          <option value="">請揀選銀行</option>
          <option>匯豐銀行 (HSBC)</option>
          <option>恒生銀行 (Hang Seng)</option>
          <option>中國銀行 (Bank of China)</option>
          <option>渣打銀行 (Standard Chartered)</option>
          <option>中信銀行（中信銀行國際）</option>
          <option>東亞銀行 (Bank of East Asia)</option>
          <option>星展銀行 (DBS)</option>
          <option>花旗銀行 (Citibank)</option>
          <option>ZA Bank（衆安銀行）</option>
          <option>Mox Bank</option>
          <option>WeLab Bank（匯立銀行）</option>
          <option>Livi Bank</option>
          <option>其他</option>
        </select>
      </div>
      <div class="field-group">
        <label>銀行戶口號碼 <span style="color:#C62828;">*</span></label>
        <input type="text" id="tcKycAcc" placeholder="銀行戶口號碼" inputmode="numeric">
        <div class="hint">分成款項將存入此戶口</div>
      </div>
      <div class="field-group">
        <label>SWIFT / BIC 代碼</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" id="tcKycSwift" placeholder="例: HSBCHKHH" maxlength="11" autocapitalize="characters" style="flex:1;" oninput="this.value=this.value.toUpperCase()">
          <div id="tcSwiftNote" style="font-size:13px;color:#1B5E20;min-width:60px;"></div>
        </div>
        <div class="hint">選擇銀行後自動填入</div>
      </div>
      <div class="err" id="kycErr"></div>
      <button class="big-btn btn-confirm" id="btnKycNext" style="margin-top:12px;" onclick="doKycNext()">下一步 →</button>
    </div>
    <!-- 步驟3：確認/拒絕 -->
    <div class="card" id="stepAction" style="display:none;">
      <h2>✅ 第三步：確認加入</h2>
      <div style="font-size:15px;color:#555;margin-bottom:14px;line-height:1.6;">個人資料已登記，請確認是否加入團隊。</div>
      <div class="err" id="confirmErr"></div>
      <button class="big-btn btn-confirm" id="btnConfirm" onclick="doAction('confirm')">✅ 確認加入</button>
      <button class="big-btn btn-reject" id="btnReject" onclick="doAction('reject')">❌ 拒絕邀請</button>
    </div>
  </div>
  <div id="doneBox" style="display:none;"></div>
  <div id="expiredBox" class="card" style="display:none;text-align:center;padding:40px 20px;">
    <div style="font-size:48px;margin-bottom:14px;">⏰</div>
    <div style="font-size:20px;font-weight:900;color:#6B7280;margin-bottom:8px;">邀請已過期或無效</div>
    <div style="font-size:15px;color:#9CA3AF;">請聯絡申請人重新發送邀請。</div>
  </div>
</div>
<script>
var TOKEN = '${token}';
var inviteData = null;
var tcMemberNo = '';
var tcKycDone = false;
var tcKycDocKey = ''; // kept for legacy compat
var tcRefMemberNo = '';

var TC_SWIFT_MAP = {
  '匯豐銀行 (HSBC)': 'HSBCHKHH',
  '恒生銀行 (Hang Seng)': 'HASEHKHH',
  '中國銀行 (Bank of China)': 'BKCHHKHHXXX',
  '渣打銀行 (Standard Chartered)': 'SCBLHKHHXXX',
  '中信銀行（中信銀行國際）': 'KWHKHKHH',
  '東亞銀行 (Bank of East Asia)': 'BEASHKHH',
  '星展銀行 (DBS)': 'DHBKHKHH',
  '花旗銀行 (Citibank)': 'CITIHKHX',
  'ZA Bank（衆安銀行）': 'ICBKHKHH',
  'Mox Bank': 'MOXBHKHH',
  'WeLab Bank（匯立銀行）': 'WLABHKHH',
  'Livi Bank': 'LIVIHKHH'
};
function autoFillTcSwift() {
  var bank = document.getElementById('tcKycBank').value;
  var el = document.getElementById('tcKycSwift');
  var noteEl = document.getElementById('tcSwiftNote');
  if (!el) return;
  if (TC_SWIFT_MAP[bank]) {
    el.value = TC_SWIFT_MAP[bank]; el.readOnly = true; el.style.background = '#F3F4F6';
    if (noteEl) { noteEl.textContent = '✅ 自動填入'; noteEl.style.color = '#1B5E20'; }
  } else {
    el.value = ''; el.readOnly = false; el.style.background = '';
    if (noteEl) { noteEl.textContent = bank ? '請手動輸入' : ''; }
  }
}
var _tcRefTimer = null;
function lookupTcReferral() {
  var phone = document.getElementById('tcRefPhone').value.replace(/\D/g,'');
  var statusEl = document.getElementById('tcRefStatus');
  var foundEl = document.getElementById('tcRefFound');
  foundEl.style.display = 'none'; tcRefMemberNo = '';
  if (phone.length < 8) { statusEl.textContent = ''; return; }
  statusEl.textContent = '🔍';
  clearTimeout(_tcRefTimer);
  _tcRefTimer = setTimeout(function() {
    fetch('/api/member/lookup?phone=' + encodeURIComponent(phone))
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.ok && d.member_no) {
          tcRefMemberNo = d.member_no;
          statusEl.textContent = '✅';
          foundEl.style.display = '';
          foundEl.style.background = '#DCFCE7'; foundEl.style.color = '#1B4332';
          foundEl.textContent = '✅ ' + (d.name_zh || d.member_no);
        } else {
          tcRefMemberNo = '';
          statusEl.textContent = '❌';
          foundEl.style.display = '';
          foundEl.style.background = '#FFEBEE'; foundEl.style.color = '#C62828';
          foundEl.textContent = '找不到此電話的會員';
        }
      }).catch(function() { statusEl.textContent = '❌'; });
  }, 600);
}

function showErr(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; el.classList.add('show'); }
}
function clearErr(id) {
  var el = document.getElementById(id);
  if (el) { el.style.display = 'none'; el.classList.remove('show'); }
}

// 載入邀請資訊
fetch('/api/team-invite?token=' + encodeURIComponent(TOKEN))
  .then(function(r) { return r.json(); })
  .then(function(d) {
    document.getElementById('loadingBox').style.display = 'none';
    if (!d.ok) {
      document.getElementById('expiredBox').style.display = '';
      return;
    }
    inviteData = d.invite;
    var roleLabel = inviteData.role === 'COLEADERY' ? 'CoLeadery 領航者' : 'CoLinkery 連結者';
    var det = document.getElementById('inviteDetails');
    det.innerHTML =
      '<div class="info-row"><span class="info-label">角色</span><span class="info-val">' + roleLabel + '</span></div>' +
      '<div class="info-row"><span class="info-label">申請人</span><span class="info-val">' + escHtml(inviteData.applicant_name) + '</span></div>' +
      '<div class="info-row"><span class="info-label">你的分成</span><span class="info-val" style="color:#8B0000;font-size:20px;">' + inviteData.share_pct + '%</span></div>' +
      '<div class="info-row"><span class="info-label">邀請有效期</span><span class="info-val" style="font-size:14px;">' + inviteData.expires_at.replace('T',' ').slice(0,16) + '</span></div>';
    if (inviteData.confirmed !== 0) {
      document.getElementById('mainBox').style.display = 'none';
      var doneBox = document.getElementById('doneBox');
      if (inviteData.confirmed === 1) {
        doneBox.innerHTML = '<div class="card ok-box"><div class="ok-icon">✅</div><div class="ok-title">已確認加入！</div><div class="ok-text">你已成功確認加入團隊。</div></div>';
      } else {
        doneBox.innerHTML = '<div class="card rej-box"><div class="rej-icon">❌</div><div class="rej-title">已拒絕邀請</div><div class="rej-text" style="font-size:16px;color:#6B7280;">你已拒絕此邀請。</div></div>';
      }
      doneBox.style.display = '';
    } else {
      document.getElementById('mainBox').style.display = '';
    }
  })
  .catch(function() {
    document.getElementById('loadingBox').style.display = 'none';
    document.getElementById('expiredBox').style.display = '';
  });

// 步驟1：驗證身份
function doVerify() {
  clearErr('verifyErr');
  var phone = document.getElementById('confirmPhone').value.replace(/\D/g,'');
  if (phone.length < 8) { showErr('verifyErr', '請輸入有效的香港電話號碼'); return; }
  var btn = document.getElementById('btnVerify');
  btn.disabled = true; btn.textContent = '驗證中…';
  fetch('/api/partner/check', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ phone: phone })
  }).then(function(r){return r.json();}).then(function(d){
    btn.disabled = false; btn.textContent = '🔍 驗證身份';
    if (!d.ok) { showErr('verifyErr', d.error || '驗證失敗'); return; }
    if (inviteData && d.member_no !== inviteData.member_no) {
      showErr('verifyErr', '電話號碼與邀請成員不符，請確認你的登記電話'); return;
    }
    tcMemberNo = d.member_no;
    document.getElementById('stepVerify').style.display = 'none';
    document.getElementById('stepKyc').style.display = '';
    // 預填 KYC 資料
    tcKycDone = !!d.kyc_id;
    if (d.kyc_id && d.kyc) {
      var kyc = d.kyc;
      document.getElementById('kycStatusNote').style.display = '';
      document.getElementById('kycStatusNote').textContent = '✅ 已登記個人正式資料：HKID ' + (kyc.id_prefix||'已登記') + '，銀行：' + (kyc.bank_name||'已登記');
      document.getElementById('kycNewNote').style.display = 'none';
      // 預填且鎖定 HKID
      var idEl = document.getElementById('tcKycId');
      idEl.value = kyc.id_prefix || '';
      idEl.readOnly = true; idEl.style.background = '#F3F4F6';
      document.getElementById('tcKycIdHint').textContent = '✅ 已登記身份證';
      // 預填 email
      if (kyc.email) { var em = document.getElementById('tcKycEmail'); if(em) em.value = kyc.email; }
      // 預填推薦人（已有則鎖定）
      if (kyc.referral_phone) {
        var rp = document.getElementById('tcRefPhone');
        if (rp) { rp.value = kyc.referral_phone; rp.readOnly = true; rp.style.background = '#F3F4F6'; }
        var rf = document.getElementById('tcRefFound');
        if (rf) { rf.style.display=''; rf.style.background='#DCFCE7'; rf.style.color='#1B4332'; rf.textContent='✅ 推薦人：' + (kyc.referral_name||kyc.referral_phone); }
        var rs = document.getElementById('tcRefStatus'); if(rs) rs.textContent='✅';
        var rreq = document.getElementById('tcRefReq'); if(rreq) rreq.style.display='none';
        tcRefMemberNo = kyc.referral_phone;
      }
      // 預填銀行
      var bkSel = document.getElementById('tcKycBank');
      for (var i=0;i<bkSel.options.length;i++) {
        if (bkSel.options[i].text===kyc.bank_name){bkSel.selectedIndex=i;break;}
      }
      autoFillTcSwift();
      document.getElementById('tcKycAcc').value = kyc.bank_acc_no || '';
      if (kyc.swift_code) { var sw = document.getElementById('tcKycSwift'); if(sw) sw.value=kyc.swift_code; }
    } else {
      document.getElementById('kycStatusNote').style.display = 'none';
      document.getElementById('kycNewNote').style.display = '';
    }
  }).catch(function(){ btn.disabled=false; btn.textContent='🔍 驗證身份'; showErr('verifyErr','網絡錯誤，請重試'); });
}

// 步驟2：KYC 提交
function doKycNext() {
  clearErr('kycErr');
  var idPrefix = document.getElementById('tcKycId').value.trim().toUpperCase();
  // 清除不可見字符
  var emailRaw2 = document.getElementById('tcKycEmail').value;
  var email = emailRaw2.replace(/\u00A0/g,'').replace(/\u200B/g,'').replace(/\uFEFF/g,'').trim();
  console.log('[KYC-TC debug] email:', JSON.stringify(email));
  var refPhone = document.getElementById('tcRefPhone').value.replace(/\D/g,'');
  var bank = document.getElementById('tcKycBank').value;
  var acc = document.getElementById('tcKycAcc').value.trim();
  var swift = document.getElementById('tcKycSwift').value.trim().toUpperCase();

  // 驗證 HKID 格式
  if (!idPrefix || !/^[A-Z][0-9]{3}$/.test(idPrefix)) {
    showErr('kycErr','請填寫正確的身份證號碼首4位（1個英文字母 + 3位數字，例：A123）'); return;
  }
  if (!email || email.indexOf('@') < 1 || email.lastIndexOf('.') < email.indexOf('@') + 2) {
    showErr('kycErr','請填寫有效的電郵地址（例：name@domain.com）'); return;
  }
  if (!tcKycDone && (!refPhone || refPhone.length < 8)) {
    showErr('kycErr','請填寫推薦人電話號碼'); return;
  }
  if (!tcKycDone && !tcRefMemberNo) {
    showErr('kycErr','推薦人未能驗證，請確認電話號碼'); return;
  }
  if (!bank) { showErr('kycErr','請選擇銀行'); return; }
  if (!acc) { showErr('kycErr','請填寫銀行戶口號碼'); return; }

  var btn = document.getElementById('btnKycNext');
  btn.disabled = true; btn.textContent = '提交中…';
  fetch('/api/partner/kyc', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      member_no: tcMemberNo, id_prefix: idPrefix,
      email: email, referral_phone: refPhone,
      bank_name: bank, bank_acc_no: acc, swift_code: swift,
      update_only: tcKycDone
    })
  }).then(function(r){return r.json();}).then(function(d){
    btn.disabled=false; btn.textContent='下一步 →';
    if (d.ok) { tcKycDone=true; document.getElementById('stepKyc').style.display='none'; document.getElementById('stepAction').style.display=''; }
    else { showErr('kycErr', d.error||'提交失敗'); }
  }).catch(function(){ btn.disabled=false; btn.textContent='下一步 →'; showErr('kycErr','網絡錯誤'); });
}

// 步驟3：確認/拒絕
function doAction(action) {
  clearErr('confirmErr');
  var btnC = document.getElementById('btnConfirm');
  var btnR = document.getElementById('btnReject');
  btnC.disabled = true; btnR.disabled = true;
  btnC.textContent = '處理中…'; btnR.textContent = '處理中…';
  var phone = document.getElementById('confirmPhone').value.replace(/\\D/g,'');
  fetch('/api/team-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: TOKEN, phone: phone, action: action })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) {
      document.getElementById('mainBox').style.display = 'none';
      var doneBox = document.getElementById('doneBox');
      if (action === 'confirm') {
        doneBox.innerHTML = '<div class="card ok-box"><div class="ok-icon">✅</div><div class="ok-title">確認成功！</div><div class="ok-text">你已確認加入團隊，分成比例 <strong style="color:#8B0000;">' + (inviteData ? inviteData.share_pct : '') + '%</strong> 已記錄。<br><br>我們會在審核通過後通知你。</div></div>';
      } else {
        doneBox.innerHTML = '<div class="card rej-box"><div class="rej-icon">❌</div><div class="rej-title">已拒絕邀請</div><div class="ok-text" style="color:#6B7280;">你已拒絕此次團隊邀請。</div></div>';
      }
      doneBox.style.display = '';
    } else {
      btnC.disabled = false; btnR.disabled = false;
      btnC.textContent = '✅ 確認加入'; btnR.textContent = '❌ 拒絕邀請';
      showErr('confirmErr', d.error || '操作失敗，請重試');
    }
  }).catch(function() {
    btnC.disabled = false; btnR.disabled = false;
    btnC.textContent = '✅ 確認加入'; btnR.textContent = '❌ 拒絕邀請';
    showErr('confirmErr', '網絡錯誤，請重試');
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
</script>
</body>
</html>`
}

export function coworkeryAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>CoWorkery 打卡 - 老有聯盟85</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,"PingFang HK","Microsoft JhengHei",sans-serif;background:#f4f6f8;color:#1f2937;font-size:18px;line-height:1.6}
  .wrap{max-width:480px;margin:0 auto;padding:16px;min-height:100vh}
  .card{background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
  h1{font-size:22px;color:#0369a1;margin-bottom:4px}
  .sub{color:#6b7280;font-size:15px}
  label{display:block;font-weight:600;margin:12px 0 6px}
  input,select{width:100%;padding:14px;font-size:18px;border:2px solid #d1d5db;border-radius:12px}
  input:focus,select:focus{outline:none;border-color:#0284c7}
  .btn{display:block;width:100%;padding:18px;font-size:20px;font-weight:700;border:none;border-radius:14px;cursor:pointer;margin-top:14px;color:#fff}
  .btn-in{background:#16a34a}
  .btn-out{background:#dc2626}
  .btn-login{background:#0284c7}
  .btn:disabled{background:#9ca3af;cursor:not-allowed}
  .msg{padding:14px;border-radius:12px;margin:12px 0;font-size:16px;display:none;white-space:pre-line}
  .msg.err{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;display:block}
  .msg.ok{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;display:block}
  .msg.info{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;display:block}
  .hide{display:none}
  .shift{border:2px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px}
  .shift.sel{border-color:#0284c7;background:#f0f9ff}
  .shift b{font-size:19px}
  .selfie-preview{width:100%;border-radius:12px;margin-top:10px;display:none}
  .status-line{font-size:16px;color:#374151;margin-top:8px;min-height:24px}
  .back-bar{display:flex;align-items:center;gap:8px;color:#0369a1;font-size:17px;font-weight:600;margin-bottom:12px;cursor:pointer;text-decoration:none}
  .back-bar svg{flex-shrink:0}
  .tab-bar{display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px}
  .tab-btn{flex:1;padding:12px 4px;font-size:15px;font-weight:600;border:none;background:transparent;color:#6b7280;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px}
  .tab-btn.active{color:#0284c7;border-bottom-color:#0284c7}
  .apply-section{display:none}
  .apply-section.show{display:block}
  input[type=file]{padding:8px;font-size:15px}
</style>
</head>
<body>
<div class="wrap">

  <!-- 頂部返回／登出掣 -->
  <button onclick="window.location.href='/app'" class="back-bar" style="background:none;border:none;cursor:pointer;margin-bottom:12px">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    返回
  </button>

  <div class="card">
    <h1>👷 CoWorkery 打卡</h1>
    <div class="sub">老有聯盟85 · 工作打卡系統</div>
  </div>

  <!-- 分頁切換 -->
  <div class="tab-bar" id="mainTabBar">
    <button class="tab-btn active" onclick="cwSwitchTab('login')">🔑 打卡登入</button>
    <button class="tab-btn" onclick="cwSwitchTab('apply')">📝 申請加入</button>
  </div>

  <!-- 登入區 -->
  <div class="apply-section show" id="tabLogin">
  <div class="card" id="loginCard">
    <label for="cwNo">CW 編號</label>
    <input id="cwNo" placeholder="例如 CW000001" autocomplete="off" autocapitalize="characters">
    <label for="cwPhone">登記電話</label>
    <input id="cwPhone" inputmode="numeric" placeholder="8 位數字電話" autocomplete="off">
    <button class="btn btn-login" onclick="cwLogin()">登入</button>
    <div class="msg" id="loginMsg"></div>
  </div>
  </div>

  <!-- 申請加入區 -->
  <div class="apply-section" id="tabApply">
  <div class="card" id="applyCard">
    <h2 style="font-size:18px;font-weight:700;color:#0369a1;margin-bottom:4px">申請成為 CoWorkery</h2>
    <div class="sub" style="margin-bottom:16px">管理員審批後會以電話通知你</div>

    <!-- Loading state -->
    <div id="apAutoLoading" style="text-align:center;padding:20px;color:#6b7280;font-size:15px">
      ⏳ 正在讀取你的會員資料…
    </div>

    <!-- Auto-filled (logged in) state -->
    <div id="apAutoFilled" style="display:none">
      <div id="apMemberBanner" style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:14px 16px;margin-bottom:16px">
        <div style="font-size:13px;color:#1d4ed8;font-weight:600;margin-bottom:6px">✅ 已自動填入你的會員資料</div>
        <div style="font-size:16px;font-weight:700" id="apBannerName"></div>
        <div style="font-size:14px;color:#374151;margin-top:2px" id="apBannerInfo"></div>
      </div>

      <label for="apDistrictAuto">居住地區</label>
      <select id="apDistrictAuto" style="margin-bottom:8px;font-size:16px">
        <option value="">— 請選擇 —</option>
        <option>中西區</option><option>灣仔</option><option>東區</option><option>南區</option>
        <option>油尖旺</option><option>深水埗</option><option>九龍城</option><option>黃大仙</option>
        <option>觀塘</option><option>葵青</option><option>荃灣</option><option>屯門</option>
        <option>元朗</option><option>北區</option><option>大埔</option><option>沙田</option>
        <option>西貢</option><option>離島</option>
      </select>

      <label>出糧銀行資料 <span style="font-size:13px;color:#6b7280;font-weight:400">（可選，審批後補填亦可）</span></label>
      <select id="apBankName" style="margin-bottom:8px;font-size:16px">
        <option value="">— 選擇銀行 —</option>
        <option>恒生銀行</option><option>滙豐銀行</option><option>中國銀行(香港)</option>
        <option>渣打銀行</option><option>東亞銀行</option><option>工商銀行</option>
        <option>建設銀行</option><option>農業銀行</option><option>招商銀行</option>
        <option>花旗銀行</option><option>大新銀行</option><option>創興銀行</option>
        <option>永隆銀行</option><option>轉數快/FPS</option><option>其他</option>
      </select>
      <input id="apBankNo" placeholder="戶口號碼（例如 123-456789-001）" autocomplete="off" inputmode="numeric" style="font-size:16px">

      <button class="btn btn-login" onclick="cwApply()" style="margin-top:20px;font-size:18px">提交申請</button>
      <div class="msg" id="applyMsg"></div>
    </div>

    <!-- Manual (not logged in) state -->
    <div id="apManual" style="display:none">
      <div style="background:#fef3c7;border:1.5px solid #fcd34d;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:14px;color:#92400e">
        ⚠️ 未偵測到登入狀態，請手動填寫資料
      </div>

      <label for="apMemberNo">會員編號 <span style="color:#dc2626">*</span></label>
      <input id="apMemberNo" placeholder="例如 85-00001" autocomplete="off">

      <label for="apPhone">登記電話 <span style="color:#dc2626">*</span></label>
      <input id="apPhone" inputmode="numeric" placeholder="8 位數字電話" autocomplete="off">

      <label for="apName">中文姓名 <span style="color:#dc2626">*</span></label>
      <input id="apName" placeholder="請輸入全名" autocomplete="off">

      <label for="apDistrict">居住地區</label>
      <select id="apDistrict">
        <option value="">— 請選擇 —</option>
        <option>中西區</option><option>灣仔</option><option>東區</option><option>南區</option>
        <option>油尖旺</option><option>深水埗</option><option>九龍城</option><option>黃大仙</option>
        <option>觀塘</option><option>葵青</option><option>荃灣</option><option>屯門</option>
        <option>元朗</option><option>北區</option><option>大埔</option><option>沙田</option>
        <option>西貢</option><option>離島</option>
      </select>

      <label>出糧銀行資料（可選）</label>
      <select id="apBankNameManual" style="margin-bottom:8px">
        <option value="">— 選擇銀行 —</option>
        <option>恒生銀行</option><option>滙豐銀行</option><option>中國銀行(香港)</option>
        <option>渣打銀行</option><option>東亞銀行</option><option>工商銀行</option>
        <option>建設銀行</option><option>農業銀行</option><option>招商銀行</option>
        <option>花旗銀行</option><option>大新銀行</option><option>創興銀行</option>
        <option>永隆銀行</option><option>轉數快/FPS</option><option>其他</option>
      </select>
      <input id="apBankNoManual" placeholder="戶口號碼（例如 123-456789-001）" autocomplete="off" inputmode="numeric">

      <button class="btn btn-login" onclick="cwApply()" style="margin-top:18px">提交申請</button>
      <div class="msg" id="applyMsgManual"></div>
    </div>
  </div>
  </div>

  <!-- 主區（登入後顯示）-->
  <div id="mainCard" class="hide">
    <div class="card">
      <div class="sub">你好，<b id="cwName"></b></div>
      <label for="shiftSelect">選擇今日場次</label>
      <select id="shiftSelect" onchange="cwPickShift()"><option value="">載入中…</option></select>
      <div class="status-line" id="shiftStatus"></div>
    </div>

    <div class="card" id="clockCard">
      <div class="msg info" id="geoMsg">📍 打卡時會取得你的位置，請允許定位權限</div>

      <label>自拍（可選）</label>
      <input type="file" accept="image/*" capture="user" id="selfieInput" onchange="cwPreviewSelfie()">
      <img class="selfie-preview" id="selfiePreview" alt="自拍預覽">

      <button class="btn btn-in"  id="btnIn"  onclick="cwClock('in')"  disabled>🟢 打卡上班</button>
      <button class="btn btn-out" id="btnOut" onclick="cwClock('out')" disabled>🔴 打卡下班</button>
      <div class="msg" id="clockMsg"></div>
    </div>

    <div class="card">
      <button class="btn" style="background:#6b7280" onclick="cwLogout()">登出</button>
    </div>
  </div>

</div>
<script>
var API='/api/coworkery'
var CW={cw_no:'',phone:'',name:''}
var _apMember=null  // cached member data for apply form

function cwSwitchTab(tab){
  ['login','apply'].forEach(function(t){
    var el=document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1))
    if(el)el.classList.toggle('show',t===tab)
  })
  document.querySelectorAll('.tab-btn').forEach(function(b,i){
    b.classList.toggle('active',(tab==='login'&&i===0)||(tab==='apply'&&i===1))
  })
  if(tab==='apply') cwAutoFillApply()
}

// ── 自動填入申請表（從 localStorage 讀取 member_no，再 call API 取資料）──
async function cwAutoFillApply(){
  var memberNo=localStorage.getItem('ce85_member_no')||''
  var loading=document.getElementById('apAutoLoading')
  var autoDiv=document.getElementById('apAutoFilled')
  var manualDiv=document.getElementById('apManual')

  if(!memberNo){
    if(loading)loading.style.display='none'
    if(manualDiv)manualDiv.style.display='block'
    return
  }

  // ── 先查 CoWorkery 申請狀態 ──────────────────────────────────────────────
  try{
    var sr=await fetch(API+'/my-status?member_no='+encodeURIComponent(memberNo))
    var sd=await sr.json()
    if(sd.ok&&sd.found){
      // 已有申請記錄 → 顯示狀態，唔需要再顯示申請表
      if(loading)loading.style.display='none'
      var statusMap={
        ACTIVE:  {icon:'✅',color:'#15803d',bg:'#f0fdf4',border:'#bbf7d0',txt:'已批准，你的 CW 編號為：'},
        PENDING: {icon:'⏳',color:'#92400e',bg:'#fffbeb',border:'#fcd34d',txt:'申請審批中，請耐心等候'},
        REJECTED:{icon:'❌',color:'#991b1b',bg:'#fef2f2',border:'#fecaca',txt:'申請已被拒絕'},
        SUSPENDED:{icon:'⛔',color:'#374151',bg:'#f9fafb',border:'#e5e7eb',txt:'帳戶已被暫停，請聯絡管理員'}
      }
      var st=statusMap[sd.status]||{icon:'❓',color:'#374151',bg:'#f9fafb',border:'#e5e7eb',txt:sd.status}
      var cwNoSpan=sd.status==='ACTIVE'?'<b style="font-family:monospace;font-size:20px">'+sd.cw_no+'</b>':''
      var activeHint=sd.status==='ACTIVE'?'<div style="font-size:14px;color:#374151;margin-top:4px">可前往「🔑 打卡登入」tab 開始使用</div>':''
      var rejectNote=sd.status==='REJECTED'&&sd.reject_reason?'<div style="font-size:13px;color:#991b1b;margin-top:4px">原因：'+sd.reject_reason+'</div>':''
      var districtLine=sd.district?'<div style="font-size:14px;color:#374151;margin-top:2px">地區：'+sd.district+'</div>':''
      var statusHtml='<div style="background:'+st.bg+';border:1.5px solid '+st.border+';border-radius:12px;padding:16px;margin-top:4px"><div style="font-size:18px;font-weight:700;color:'+st.color+';margin-bottom:6px">'+st.icon+' '+st.txt+' '+cwNoSpan+'</div><div style="font-size:14px;color:#374151">姓名：'+sd.name_zh+'</div>'+districtLine+activeHint+rejectNote+'</div>'
      var applyCard=document.getElementById('apAutoFilled')
      if(applyCard){
        applyCard.innerHTML=statusHtml
        applyCard.style.display='block'
      }

      // 如已批准 → 自動填入打卡登入欄（只在欄位為空時填入，避免覆蓋用戶手動輸入的新帳號）
      if(sd.status==='ACTIVE'){
        var cwNoEl=document.getElementById('cwNo')
        var cwPhoneEl=document.getElementById('cwPhone')
        var cwNoVal=(cwNoEl?cwNoEl.value:'').trim()
        var cwPhoneVal=(cwPhoneEl?cwPhoneEl.value:'').trim()
        // 只有兩欄均空時才自動填入，避免從新登入的用戶被舊帳號覆蓋
        if(!cwNoVal&&!cwPhoneVal){
          if(cwNoEl)cwNoEl.value=sd.cw_no
          if(cwPhoneEl)cwPhoneEl.value=sd.phone
        }
      }
      return
    }
  }catch(e){}

  // ── 無申請記錄 → 顯示申請表，用會員資料自動填入 ────────────────────────
  if(_apMember){
    // already loaded member data previously
    if(loading)loading.style.display='none'
    if(autoDiv)autoDiv.style.display='block'
    return
  }
  try{
    var r=await fetch('/api/members/'+encodeURIComponent(memberNo))
    var d=await r.json()
    if(d.ok&&d.member){
      var m=d.member
      _apMember=m
      var bannerName=document.getElementById('apBannerName')
      var bannerInfo=document.getElementById('apBannerInfo')
      if(bannerName)bannerName.textContent=m.name_zh+' ('+m.member_no+')'
      if(bannerInfo)bannerInfo.textContent='電話：'+m.phone+(m.district?' ｜ 地區：'+m.district:'')
      // 自動選擇地區
      var distEl=document.getElementById('apDistrictAuto')
      if(distEl&&m.district)distEl.value=m.district
      if(loading)loading.style.display='none'
      if(autoDiv)autoDiv.style.display='block'
    } else {
      if(loading)loading.style.display='none'
      if(manualDiv)manualDiv.style.display='block'
    }
  }catch(e){
    if(loading)loading.style.display='none'
    if(manualDiv)manualDiv.style.display='block'
  }
}

async function cwApply(){
  var isAuto=_apMember!==null
  var memberNo, phone, name_zh, district, bankName, bankNo
  var msgId=isAuto?'applyMsg':'applyMsgManual'
  if(isAuto){
    memberNo=_apMember.member_no
    phone=_apMember.phone
    name_zh=_apMember.name_zh
    district=(document.getElementById('apDistrictAuto').value||_apMember.district||'')||null
    bankName=(document.getElementById('apBankName').value||'').trim()||null
    bankNo=(document.getElementById('apBankNo').value||'').trim()||null
  } else {
    memberNo=(document.getElementById('apMemberNo').value||'').trim()
    phone=(document.getElementById('apPhone').value||'').trim()
    name_zh=(document.getElementById('apName').value||'').trim()
    district=(document.getElementById('apDistrict').value||'')||null
    bankName=(document.getElementById('apBankNameManual').value||'').trim()||null
    bankNo=(document.getElementById('apBankNoManual').value||'').trim()||null
    if(!memberNo||!phone||!name_zh){showMsg(msgId,'err','請填寫會員編號、電話及姓名');return}
  }
  // Validate: if one bank field filled, require the other
  if(bankName&&!bankNo){showMsg(msgId,'err','請填寫戶口號碼');return}
  if(bankNo&&!bankName){showMsg(msgId,'err','請選擇銀行名稱');return}
  showMsg(msgId,'info','提交中…')
  try{
    var payload={member_no:memberNo,phone:phone,name_zh:name_zh,district:district,
      bank_name:bankName,bank_account_name:name_zh,bank_account_no:bankNo,
      bank_account:bankName&&bankNo?bankName+' '+bankNo:null}
    var r=await fetch(API+'/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    var d=await r.json()
    if(d.ok){
      showMsg(msgId,'ok','申請已提交！管理員審批後會電話通知你，請耐心等候。')
      document.querySelectorAll('#tabApply .btn-login').forEach(function(b){b.disabled=true})
    } else {
      showMsg(msgId,'err',d.error||'提交失敗，請重試')
    }
  }catch(e){showMsg(msgId,'err','網絡錯誤，請重試')}
}

function showMsg(el,type,text){
  var e=document.getElementById(el)
  e.className='msg '+type
  e.textContent=text
}
function hideMsg(el){var e=document.getElementById(el);if(e)e.className='msg'}

// ── 登入（以 my-shifts 兼任驗證）──
async function cwLogin(){
  var cw_no=document.getElementById('cwNo').value.trim().toUpperCase()
  var phone=document.getElementById('cwPhone').value.trim()
  if(!cw_no||!phone){showMsg('loginMsg','err','請輸入 CW 編號與電話');return}
  showMsg('loginMsg','info','驗證中…')
  try{
    var r=await fetch(API+'/my-shifts?cw_no='+encodeURIComponent(cw_no)+'&phone='+encodeURIComponent(phone))
    var d=await r.json()
    if(!d.ok){showMsg('loginMsg','err',d.error||'驗證失敗');return}
    CW={cw_no:cw_no,phone:phone,name:d.name||cw_no}
    sessionStorage.setItem('cw_session',JSON.stringify(CW))
    document.getElementById('cwName').textContent=CW.name
    document.getElementById('loginCard').classList.add('hide')
    document.getElementById('mainCard').classList.remove('hide')
    fillShifts(d.shifts||[])
  }catch(e){showMsg('loginMsg','err','網絡錯誤，請重試')}
}

function fillShifts(shifts){
  window._cwShifts=shifts
  var sel=document.getElementById('shiftSelect')
  if(!shifts.length){
    sel.innerHTML='<option value="">今日暫無派更場次</option>'
    cwPickShift()
    return
  }
  sel.innerHTML='<option value="">— 請選擇場次 —</option>'+
    shifts.map(function(s){
      var label=s.roadshow_code+'｜'+(s.name||'')+'（'+s.start_date+'～'+s.end_date+'）'
      return '<option value="'+s.roadshow_code+'">'+label+'</option>'
    }).join('')
  // 若只有一個場次，自動選中
  if(shifts.length===1){sel.value=shifts[0].roadshow_code}
  cwPickShift()
}

function cwPickShift(){
  var code=document.getElementById('shiftSelect').value
  var s=(window._cwShifts||[]).find(function(x){return x.roadshow_code===code})
  var btnIn=document.getElementById('btnIn')
  var btnOut=document.getElementById('btnOut')
  hideMsg('clockMsg')
  if(!s){
    document.getElementById('shiftStatus').textContent=''
    btnIn.disabled=true;btnOut.disabled=true
    return
  }
  if(s.clock_out_at){
    document.getElementById('shiftStatus').textContent='✅ 此場次已完成打卡（上班 + 下班）'
    btnIn.disabled=true;btnOut.disabled=true
  }else if(s.clock_in_at){
    document.getElementById('shiftStatus').textContent='🟢 已打卡上班：'+s.clock_in_at+'，可打卡下班'
    btnIn.disabled=true;btnOut.disabled=false
  }else{
    document.getElementById('shiftStatus').textContent='尚未打卡，請先打卡上班'
    btnIn.disabled=false;btnOut.disabled=true
  }
}

function cwPreviewSelfie(){
  var f=document.getElementById('selfieInput').files[0]
  if(!f)return
  var img=document.getElementById('selfiePreview')
  img.src=URL.createObjectURL(f)
  img.style.display='block'
}

// ── 取得定位（Promise）──
function getPos(){
  return new Promise(function(resolve,reject){
    if(!navigator.geolocation){reject('此裝置不支援定位');return}
    navigator.geolocation.getCurrentPosition(
      function(p){resolve({lat:p.coords.latitude,lng:p.coords.longitude})},
      function(e){
        if(e.code===1) reject('定位權限被拒絕，請於瀏覽器設定開啟')
        else reject('未能取得定位，請到戶外或開啟 GPS 後重試')
      },
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    )
  })
}

// ── 前端壓縮圖片（≤1280px JPEG 0.8 quality）──
function compress(file){
  return new Promise(function(res){
    if(!file){res(null);return}
    var img=new Image()
    img.onload=function(){
      var max=1280,w=img.width,h=img.height
      if(w>max||h>max){var ratio=Math.min(max/w,max/h);w=Math.round(w*ratio);h=Math.round(h*ratio)}
      var cv=document.createElement('canvas');cv.width=w;cv.height=h
      cv.getContext('2d').drawImage(img,0,0,w,h)
      cv.toBlob(function(b){res(b||file)},'image/jpeg',0.8)
    }
    img.onerror=function(){res(file)}
    img.src=URL.createObjectURL(file)
  })
}

// ── 打卡（上班/下班）──
async function cwClock(type){
  var code=document.getElementById('shiftSelect').value
  if(!code){showMsg('clockMsg','err','請先選擇場次');return}
  var btnIn=document.getElementById('btnIn'),btnOut=document.getElementById('btnOut')
  btnIn.disabled=true;btnOut.disabled=true
  showMsg('clockMsg','info','📍 正在取得定位，請稍候…')
  try{
    var pos=await getPos()
    showMsg('clockMsg','info','上傳中，請稍候…')
    var fd=new FormData()
    fd.append('cw_no',CW.cw_no)
    fd.append('phone',CW.phone)
    fd.append('roadshow_code',code)
    fd.append('lat',String(pos.lat))
    fd.append('lng',String(pos.lng))
    var selfie=document.getElementById('selfieInput').files[0]
    if(selfie){
      var c=await compress(selfie)
      if(c) fd.append('selfie',c,'selfie.jpg')
    }
    var r=await fetch(API+'/clock-'+type,{method:'POST',body:fd})
    var d=await r.json()
    if(!d.ok){
      showMsg('clockMsg','err','❌ '+(d.error||'打卡失敗'))
    }else if(type==='in'){
      showMsg('clockMsg','ok','✅ 上班打卡成功！距場地約 '+d.dist+' 米')
      await refreshShifts()
    }else{
      var hrs=Math.floor((d.worked_minutes||0)/60)
      var mins=(d.worked_minutes||0)%60
      var m='✅ 下班打卡成功！本次工時 '+hrs+' 小時 '+mins+' 分'
      if(d.flag==='OVER_WEEKLY') m+='\\n⚠️ 提醒：你本週工時已超過 20 小時'
      showMsg('clockMsg','ok',m)
      await refreshShifts()
    }
  }catch(e){showMsg('clockMsg','err','❌ '+String(e))}
  finally{cwPickShift()}
}

async function refreshShifts(){
  try{
    var r=await fetch(API+'/my-shifts?cw_no='+encodeURIComponent(CW.cw_no)+'&phone='+encodeURIComponent(CW.phone))
    var d=await r.json()
    if(d.ok){
      var cur=document.getElementById('shiftSelect').value
      fillShifts(d.shifts||[])
      if(cur) document.getElementById('shiftSelect').value=cur
    }
  }catch(e){}
}

function cwLogout(){
  sessionStorage.removeItem('cw_session')
  CW={cw_no:'',phone:'',name:''}
  _apMember=null
  var cwNoEl=document.getElementById('cwNo')
  var cwPhoneEl=document.getElementById('cwPhone')
  if(cwNoEl)cwNoEl.value=''
  if(cwPhoneEl)cwPhoneEl.value=''
  hideMsg('loginMsg')
  hideMsg('clockMsg')
  document.getElementById('mainCard').classList.add('hide')
  document.getElementById('loginCard').classList.remove('hide')
  cwSwitchTab('login')
  // 清除 auto-fill 狀態，重新查詢（因為打卡登出不代表換帳號）
  cwAutoFillApply()
}

// 純返回 /app，不清除任何 session
function cwFullLogout(){
  window.location.href='/app'
}

// ── 自動復原 sessionStorage ──
(function(){
  var saved=sessionStorage.getItem('cw_session')
  if(saved){
    try{
      var s=JSON.parse(saved)
      if(s&&s.cw_no&&s.phone){
        document.getElementById('cwNo').value=s.cw_no
        document.getElementById('cwPhone').value=s.phone
        cwLogin()
        return
      }
    }catch(e){}
  }
  // 未登入 → 嘗試以會員身份自動查詢申請狀態，預填 CW 編號及電話
  cwAutoFillApply()
})()
</script>
</body>
</html>`
}

export function brandFormHtml(token: string) {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>產品測試 — 品牌資料提交</title>
<meta name="theme-color" content="#7c3aed">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:linear-gradient(160deg,#4c1d95 0%,#7c3aed 50%,#5b21b6 100%);
  min-height:100vh;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
  padding:24px 16px 48px;}
.wrap{max-width:700px;margin:0 auto;}
.brand-header{text-align:center;color:#fff;margin-bottom:28px;}
.brand-header h1{font-size:26px;font-weight:900;margin-bottom:6px;}
.brand-header p{font-size:14px;opacity:0.85;line-height:1.6;}
.card{background:#fff;border-radius:20px;padding:28px 24px;margin-bottom:20px;
  box-shadow:0 8px 32px rgba(0,0,0,0.18);}
.card h2{font-size:16px;font-weight:800;color:#5b21b6;margin-bottom:18px;
  padding-bottom:10px;border-bottom:2px solid #ede9fe;display:flex;align-items:center;gap:8px;}
.field{margin-bottom:16px;}
label{display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:5px;}
input[type=text],input[type=url],textarea,select{
  width:100%;padding:10px 13px;border:1.5px solid #d1d5db;border-radius:10px;
  font-size:14px;font-family:inherit;color:#111;background:#fafafa;transition:border 0.2s;}
input[type=text]:focus,input[type=url]:focus,textarea:focus{
  border-color:#7c3aed;outline:none;background:#fff;}
textarea{resize:vertical;min-height:80px;line-height:1.6;}
.hint{font-size:12px;color:#6b7280;margin-top:4px;}
.required{color:#ef4444;}
.section-title{font-size:13px;font-weight:700;color:#374151;margin:14px 0 8px;
  border-left:3px solid #7c3aed;padding-left:8px;}
.wa-tip{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 12px;
  font-size:12px;color:#166534;line-height:1.6;margin-bottom:12px;}
.media-add-btn{background:#ede9fe;color:#5b21b6;border:none;border-radius:8px;
  padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;margin-top:6px;}
.media-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;
  margin-bottom:8px;position:relative;}
.media-item input{margin-bottom:6px;}
.media-remove{position:absolute;top:10px;right:10px;background:none;border:none;
  color:#ef4444;cursor:pointer;font-size:18px;line-height:1;}
.q-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px;}
.q-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.q-card-hd span{font-size:13px;font-weight:700;color:#374151;}
.q-remove{background:none;border:none;color:#ef4444;cursor:pointer;font-size:20px;}
.add-q-btn{background:#ede9fe;color:#5b21b6;border:none;border-radius:8px;padding:8px 14px;
  font-size:13px;font-weight:600;cursor:pointer;width:100%;margin-top:4px;}
.reward-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.submit-btn{width:100%;padding:16px;background:linear-gradient(135deg,#7c3aed,#4c1d95);
  color:#fff;border:none;border-radius:14px;font-size:17px;font-weight:800;
  cursor:pointer;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(124,58,237,0.4);
  margin-top:8px;transition:opacity 0.2s;}
.submit-btn:disabled{opacity:0.5;cursor:not-allowed;}
.msg{padding:14px 16px;border-radius:10px;font-size:14px;font-weight:600;
  margin-bottom:16px;display:none;}
.msg.ok{background:#f0fdf4;color:#166534;border:1px solid #86efac;}
.msg.err{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;}
.token-err{background:#fef2f2;border:1px solid #fca5a5;border-radius:14px;padding:32px 24px;
  text-align:center;color:#991b1b;}
.token-err h2{font-size:20px;font-weight:800;margin-bottom:8px;}
.token-err p{font-size:14px;color:#7f1d1d;line-height:1.6;}
.options-wrap{margin-top:6px;}
.opt-item{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.opt-item input{flex:1;}
.opt-item button{background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;}
.add-opt-btn{background:#f3f4f6;border:none;border-radius:6px;padding:5px 10px;
  font-size:12px;color:#374151;cursor:pointer;margin-top:4px;}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand-header">
    <div style="font-size:38px;margin-bottom:10px;">🧪</div>
    <h1>產品測試計劃<br>品牌資料提交</h1>
    <p>請填寫品牌及產品資料，提交後將交由 CoEldery 85 審核。</p>
  </div>

  <div id="tokenErrWrap" style="display:none;">
    <div class="token-err">
      <div style="font-size:40px;margin-bottom:12px;">⛔</div>
      <h2>連結無效或已過期</h2>
      <p>此品牌提交連結無效或已過期（有效期 30 天）。<br>請聯絡 CoEldery 85 管理員重新獲取連結。</p>
    </div>
  </div>

  <div id="successWrap" style="display:none;">
    <div class="card" style="text-align:center;padding:40px 24px;">
      <div style="font-size:52px;margin-bottom:16px;">🎉</div>
      <h2 style="font-size:22px;font-weight:900;color:#166534;margin-bottom:8px;border:none;">提交成功！</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;">感謝您提交品牌及產品資料。<br>我們將在審核後通知您結果，通常需要 2-3 個工作天。</p>
    </div>
  </div>

  <div id="mainForm">
    <div id="msgBox" class="msg"></div>

    <!-- 品牌基本資料 -->
    <div class="card">
      <h2>🏢 品牌基本資料</h2>
      <div class="field">
        <label>品牌名稱 <span class="required">*</span></label>
        <input type="text" id="fBrandName" placeholder="例：XX 護膚品牌">
      </div>
      <div class="field">
        <label>品牌標誌 URL（Cloudinary 或直接連結）</label>
        <input type="url" id="fBrandLogo" placeholder="https://...">
        <div class="hint">建議尺寸：正方形，最小 200×200px</div>
      </div>
      <div class="field">
        <label>品牌描述 <span class="required">*</span></label>
        <textarea id="fBrandDesc" rows="3" placeholder="簡短介紹品牌背景、理念、目標客群等…"></textarea>
      </div>
    </div>

    <!-- 測試產品 -->
    <div class="card">
      <h2>🛍 測試產品資料</h2>
      <div class="field">
        <label>產品名稱 <span class="required">*</span></label>
        <input type="text" id="fProductName" placeholder="例：XX 深層保濕面霜">
      </div>
      <div class="field">
        <label>產品圖片 / 媒體內容</label>
        <div class="hint" style="margin-bottom:8px;">可新增多張圖片或影片連結（支援 Cloudinary / YouTube / 直接圖片 URL）</div>
        <div id="mediaList"></div>
        <button class="media-add-btn" onclick="addMediaItem()">＋ 新增圖片/影片</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field">
          <label>測試週數 <span class="required">*</span></label>
          <select id="fDuration">
            <option value="7">1 週（7 天）</option>
            <option value="14" selected>2 週（14 天）</option>
            <option value="21">3 週（21 天）</option>
            <option value="28">4 週（28 天）</option>
          </select>
        </div>
        <div class="field">
          <label>問卷截止日期 <span class="required">*</span></label>
          <input type="text" id="fSurveyDeadline" placeholder="例：2025-09-30">
        </div>
      </div>
    </div>

    <!-- WhatsApp 訊息範本 -->
    <div class="card">
      <h2>💬 WhatsApp 訊息範本</h2>
      <div class="wa-tip">
        💡 以下訊息將由 CoEldery 85 以 WhatsApp 發送給測試參與者。可使用變數：<br>
        <strong>{{member_name}}</strong> 會員姓名 ／ <strong>{{product_name}}</strong> 產品名稱 ／ <strong>{{brand_name}}</strong> 品牌名稱 ／ <strong>{{survey_link}}</strong> 問卷連結
      </div>
      <div class="field">
        <label>歡迎訊息（領取樣品後發送）</label>
        <textarea id="fWaWelcome" rows="4" placeholder="例：您好 {{member_name}}！感謝您參與 {{brand_name}} 的 {{product_name}} 試用計劃。請於測試期間記錄您的使用感受，測試完成後請填寫問卷：{{survey_link}}"></textarea>
      </div>
      <div class="field">
        <label>第一次提醒（測試中期）</label>
        <textarea id="fWaReminder1" rows="3" placeholder="例：您好 {{member_name}}！提醒您記得繼續使用 {{product_name}} 並記錄感受。問卷連結：{{survey_link}}"></textarea>
      </div>
      <div class="field">
        <label>第二次提醒（截止前）</label>
        <textarea id="fWaReminder2" rows="3" placeholder="例：{{member_name}} 您好！{{product_name}} 的問卷即將截止，請盡快填寫：{{survey_link}}"></textarea>
      </div>
      <div class="field">
        <label>完成感謝訊息</label>
        <textarea id="fWaComplete" rows="3" placeholder="例：感謝 {{member_name}} 完成 {{product_name}} 試用問卷！您的意見對我們非常寶貴。感謝參與！"></textarea>
      </div>
    </div>

    <!-- 問卷題目 -->
    <div class="card">
      <h2>📋 問卷題目</h2>
      <div id="questionList"></div>
      <button class="add-q-btn" onclick="addQuestion()">＋ 新增題目</button>
    </div>

    <!-- 獎勵設定 -->
    <div class="card">
      <h2>🎁 完成獎勵設定</h2>
      <div class="field">
        <label>獎勵名稱 <span class="required">*</span></label>
        <input type="text" id="fRewardName" placeholder="例：精美禮品一份">
      </div>
      <div class="field">
        <label>獎勵描述</label>
        <textarea id="fRewardDesc" rows="2" placeholder="例：完成問卷後可領取 XX 品牌護膚品禮盒一套"></textarea>
      </div>
      <div class="reward-row">
        <div class="field">
          <label>獎勵類型</label>
          <select id="fRewardType">
            <option value="product">實物產品</option>
            <option value="coupon">優惠券</option>
            <option value="cash">現金</option>
            <option value="points">積分</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="field">
          <label>獎勵數量</label>
          <input type="text" id="fRewardQty" placeholder="例：50">
        </div>
      </div>
      <div class="field">
        <label>配送備注</label>
        <textarea id="fRewardNotes" rows="2" placeholder="例：獎品將於活動結束後 14 日內寄出"></textarea>
      </div>
    </div>

    <button class="submit-btn" id="submitBtn" onclick="submitForm()">提交品牌資料</button>
  </div>
</div>

<script>
var TOKEN = ${JSON.stringify(token)};
var qCount = 0;
var mediaCount = 0;

// Validate token on load
window.addEventListener('load', function(){
  if(!TOKEN){
    document.getElementById('tokenErrWrap').style.display='block';
    document.getElementById('mainForm').style.display='none';
    return;
  }
  fetch('/api/testing/brand-form/'+TOKEN)
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok){
        document.getElementById('tokenErrWrap').style.display='block';
        document.getElementById('mainForm').style.display='none';
      } else {
        // Pre-fill if data exists
        if(d.campaign){
          var c=d.campaign;
          if(c.brand_name) document.getElementById('fBrandName').value=c.brand_name;
          if(c.brand_logo_url) document.getElementById('fBrandLogo').value=c.brand_logo_url;
          if(c.brand_description) document.getElementById('fBrandDesc').value=c.brand_description;
          if(c.product_name) document.getElementById('fProductName').value=c.product_name;
          if(c.testing_duration_days) document.getElementById('fDuration').value=String(c.testing_duration_days);
          if(c.survey_deadline) document.getElementById('fSurveyDeadline').value=c.survey_deadline;
          if(c.wa_template_welcome) document.getElementById('fWaWelcome').value=c.wa_template_welcome;
          if(c.wa_template_reminder1) document.getElementById('fWaReminder1').value=c.wa_template_reminder1;
          if(c.wa_template_reminder2) document.getElementById('fWaReminder2').value=c.wa_template_reminder2;
          if(c.wa_template_complete) document.getElementById('fWaComplete').value=c.wa_template_complete;
          if(c.reward_name) document.getElementById('fRewardName').value=c.reward_name;
          if(c.reward_description) document.getElementById('fRewardDesc').value=c.reward_description;
          if(c.reward_type) document.getElementById('fRewardType').value=c.reward_type;
          if(c.quantity_available) document.getElementById('fRewardQty').value=String(c.quantity_available);
          if(c.delivery_notes) document.getElementById('fRewardNotes').value=c.delivery_notes;
          // Pre-fill media
          if(c.media_content){
            try{
              var mc=JSON.parse(c.media_content);
              mc.forEach(function(m){ addMediaItemWithValue(m.url||'', m.caption||''); });
            }catch(e){}
          }
          // Pre-fill questions
          if(c.questions){
            c.questions.forEach(function(q){ addQuestionWithValue(q); });
          }
        }
      }
    })
    .catch(function(){
      document.getElementById('tokenErrWrap').style.display='block';
      document.getElementById('mainForm').style.display='none';
    });
});

function showMsg(text, type){
  var el=document.getElementById('msgBox');
  el.textContent=text; el.className='msg '+(type||'err');
  el.style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
}

function addMediaItem(){ addMediaItemWithValue('',''); }
function addMediaItemWithValue(url, caption){
  mediaCount++;
  var id='media'+mediaCount;
  var div=document.createElement('div');
  div.className='media-item'; div.id=id;
  div.innerHTML='<input type="url" placeholder="圖片或影片 URL（https://…）" value="'+escHtml(url)+'" style="margin-bottom:6px;">'+
    '<input type="text" placeholder="說明文字（選填）" value="'+escHtml(caption)+'">'+
    '<button class="media-remove" onclick="document.getElementById(\''+id+'\').remove()">✕</button>';
  document.getElementById('mediaList').appendChild(div);
}

function addQuestion(){ addQuestionWithValue(null); }
function addQuestionWithValue(q){
  qCount++;
  var id='q'+qCount;
  var type=(q&&q.question_type)||'rating';
  var title=(q&&q.title)||'';
  var div=document.createElement('div');
  div.className='q-card'; div.id=id;
  div.innerHTML='<div class="q-card-hd"><span>題目 #'+qCount+'</span>'+
    '<button class="q-remove" onclick="document.getElementById(\''+id+'\').remove()">✕</button></div>'+
    '<div class="field"><label>題型</label>'+
    '<select class="qtype-sel" onchange="updateQType(\''+id+'\',this.value)">'+
    '<option value="rating"'+(type==='rating'?' selected':'')+'>評分（1-5 星）</option>'+
    '<option value="yes_no"'+(type==='yes_no'?' selected':'')+'>是 / 否</option>'+
    '<option value="single_choice"'+(type==='single_choice'?' selected':'')+'>單選題</option>'+
    '<option value="multi_choice"'+(type==='multi_choice'?' selected':'')+'>多選題</option>'+
    '<option value="text"'+(type==='text'?' selected':'')+'>文字回答</option>'+
    '</select></div>'+
    '<div class="field"><label>題目內容 <span class="required">*</span></label>'+
    '<input type="text" class="qtitle-inp" value="'+escHtml(title)+'" placeholder="例：您對產品的整體評分？"></div>'+
    '<div class="qopts-wrap"></div>';
  document.getElementById('questionList').appendChild(div);
  updateQType(id, type, q);
}

function updateQType(qid, type, prefill){
  var wrap=document.querySelector('#'+qid+' .qopts-wrap');
  if(type==='single_choice'||type==='multi_choice'){
    var opts=(prefill&&prefill.options)?prefill.options:[];
    if(!opts.length) opts=['',''];
    var html='<div class="options-wrap" id="opts'+qid+'">';
    opts.forEach(function(o,i){
      html+='<div class="opt-item"><input type="text" placeholder="選項 '+(i+1)+'" value="'+escHtml(o)+'">'+
        '<button onclick="this.parentElement.remove()">✕</button></div>';
    });
    html+='</div><button class="add-opt-btn" onclick="addOpt(\'opts'+qid+'\')">＋ 新增選項</button>';
    wrap.innerHTML=html;
  } else {
    wrap.innerHTML='';
  }
}

function addOpt(wrapId){
  var wrap=document.getElementById(wrapId);
  var cnt=wrap.querySelectorAll('.opt-item').length+1;
  var div=document.createElement('div'); div.className='opt-item';
  div.innerHTML='<input type="text" placeholder="選項 '+cnt+'"><button onclick="this.parentElement.remove()">✕</button>';
  wrap.appendChild(div);
}

function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function collectMedia(){
  var items=document.querySelectorAll('#mediaList .media-item');
  var result=[];
  items.forEach(function(item){
    var inputs=item.querySelectorAll('input');
    var url=inputs[0]?inputs[0].value.trim():'';
    var caption=inputs[1]?inputs[1].value.trim():'';
    if(url) result.push({url:url,caption:caption});
  });
  return result;
}

function collectQuestions(){
  var cards=document.querySelectorAll('#questionList .q-card');
  var result=[];
  var order=0;
  cards.forEach(function(card){
    var type=card.querySelector('.qtype-sel').value;
    var title=card.querySelector('.qtitle-inp').value.trim();
    if(!title) return;
    order++;
    var q={question_type:type,title:title,question_order:order,is_required:1,options:[],min_value:1,max_value:5};
    if(type==='single_choice'||type==='multi_choice'){
      card.querySelectorAll('.opt-item input').forEach(function(inp){
        var v=inp.value.trim(); if(v) q.options.push(v);
      });
    }
    result.push(q);
  });
  return result;
}

function submitForm(){
  var btn=document.getElementById('submitBtn');
  var brandName=document.getElementById('fBrandName').value.trim();
  var brandDesc=document.getElementById('fBrandDesc').value.trim();
  var productName=document.getElementById('fProductName').value.trim();
  var deadline=document.getElementById('fSurveyDeadline').value.trim();
  var rewardName=document.getElementById('fRewardName').value.trim();
  if(!brandName||!brandDesc||!productName||!deadline||!rewardName){
    showMsg('請填寫所有必填欄位（品牌名稱、描述、產品名稱、截止日期、獎勵名稱）','err');
    return;
  }
  var payload={
    brand_name:brandName,
    brand_logo_url:document.getElementById('fBrandLogo').value.trim()||null,
    brand_description:brandDesc,
    product_name:productName,
    testing_duration_days:parseInt(document.getElementById('fDuration').value)||14,
    survey_deadline:deadline,
    wa_template_welcome:document.getElementById('fWaWelcome').value.trim(),
    wa_template_reminder1:document.getElementById('fWaReminder1').value.trim(),
    wa_template_reminder2:document.getElementById('fWaReminder2').value.trim(),
    wa_template_complete:document.getElementById('fWaComplete').value.trim(),
    media_content:collectMedia(),
    questions:collectQuestions(),
    reward:{
      reward_name:rewardName,
      reward_description:document.getElementById('fRewardDesc').value.trim(),
      reward_type:document.getElementById('fRewardType').value,
      quantity_available:parseInt(document.getElementById('fRewardQty').value)||0,
      delivery_notes:document.getElementById('fRewardNotes').value.trim()
    }
  };
  btn.disabled=true; btn.textContent='提交中…';
  fetch('/api/testing/brand-form/'+TOKEN+'/submit',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.ok){
      document.getElementById('mainForm').style.display='none';
      document.getElementById('successWrap').style.display='block';
      window.scrollTo({top:0,behavior:'smooth'});
    } else {
      showMsg(d.error||'提交失敗，請重試','err');
      btn.disabled=false; btn.textContent='提交品牌資料';
    }
  })
  .catch(function(){
    showMsg('網絡錯誤，請重試','err');
    btn.disabled=false; btn.textContent='提交品牌資料';
  });
}
</script>
</body>
</html>`
}
