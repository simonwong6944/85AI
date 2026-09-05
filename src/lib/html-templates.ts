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
