import { HK_DISTRICTS } from './constants'
import { htmlHead } from './html-shared'
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

export function memberProfileHtml(m: any, medStatus: string | null = null, medCardNo: string | null = null, medCardImageUrl: string | null = null) {
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
  </div>` : `
  <!-- ── 家庭卡：連結／申請主卡 ── -->
  <div class="section">
    <div class="section-title">◆ 主卡連結</div>
    ${m.parent_no ? `
    <div style="background:#f0f7f0;border:1.5px solid #4caf50;border-radius:8px;padding:14px 16px;font-size:20px;color:#1B5E20;font-weight:700;">
      ✅ 已綁定主卡：${m.parent_name || ''}（${m.parent_no}）
    </div>` : `
    <p style="font-size:18px;color:#555;margin:0 0 14px;line-height:1.6;">此家庭卡未連結主卡，請選擇以下方式：</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
      <button id="tabLink" onclick="switchFamTab('link')"
        style="padding:13px 6px;background:#C62828;color:#fff;border:2px solid #C62828;border-radius:6px;font-size:17px;font-weight:700;cursor:pointer;min-height:55px;">
        📱 綁定已有主卡
      </button>
      <button id="tabNew" onclick="switchFamTab('new')"
        style="padding:13px 6px;background:#fff;color:#C62828;border:2px solid #C62828;border-radius:6px;font-size:17px;font-weight:700;cursor:pointer;min-height:55px;">
        ➕ 為長輩開主卡
      </button>
    </div>

    <!-- Panel A: 綁定已有主卡 -->
    <div id="panelLink" style="display:block;">
      <p style="font-size:16px;color:#444;margin:0 0 10px;">輸入長輩的香港電話，系統自動搜尋其主卡並連結。</p>
      <input id="lpPhone" type="tel" inputmode="numeric" maxlength="8" placeholder="長輩電話（8位）"
        style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:20px;border:2px solid #FFCDD2;border-radius:6px;margin-bottom:10px;">
      <div id="linkErr" style="display:none;color:#C62828;font-size:17px;font-weight:700;margin-bottom:8px;"></div>
      <button id="linkSubmitBtn" onclick="submitLinkParent()"
        style="width:100%;padding:14px;background:#C62828;color:#fff;border:0;border-radius:6px;font-size:20px;font-weight:700;cursor:pointer;min-height:55px;">
        🔗 確認綁定主卡
      </button>
    </div>

    <!-- Panel B: 為長輩開主卡 -->
    <div id="panelNew" style="display:none;margin-top:4px;">
      <p style="font-size:16px;color:#444;margin:0 0 10px;">為長輩（須年滿55歲）登記新主卡，完成後自動連結此家庭卡。</p>
      <input id="npNameZh" type="text" placeholder="長輩中文姓名"
        style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:20px;border:2px solid #FFCDD2;border-radius:6px;margin-bottom:10px;">
      <input id="npPhone" type="tel" inputmode="numeric" maxlength="8" placeholder="長輩電話（8位）"
        style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:20px;border:2px solid #FFCDD2;border-radius:6px;margin-bottom:10px;">
      <select id="npBirthYear"
        style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:20px;border:2px solid #FFCDD2;border-radius:6px;margin-bottom:10px;background:#fff;">
        <option value="">長輩出生年份（1971或之前）</option>
        ${(()=>{const o=[];for(let y=new Date().getFullYear()-55;y>=1930;y--){o.push(`<option value="${y}">${y}年</option>`);}return o.join('');})()}
      </select>
      <select id="npGender"
        style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:20px;border:2px solid #FFCDD2;border-radius:6px;margin-bottom:10px;background:#fff;">
        <option value="">性別（選填）</option>
        <option value="M">男 M</option>
        <option value="F">女 F</option>
      </select>
      <div id="newErr" style="display:none;color:#C62828;font-size:17px;font-weight:700;margin-bottom:8px;"></div>
      <button id="newSubmitBtn" onclick="submitAddParent()"
        style="width:100%;padding:14px;background:#C62828;color:#fff;border:0;border-radius:6px;font-size:20px;font-weight:700;cursor:pointer;min-height:55px;">
        ➕ 為長輩開主卡並連結
      </button>
    </div>

    <div id="famLinkSuccess" style="display:none;background:#E8F5E9;border:1.5px solid #4CAF50;border-radius:8px;padding:14px 16px;font-size:20px;color:#1B5E20;margin-top:14px;line-height:1.7;font-weight:700;"></div>
    `}
  </div>`}

  <!-- ── 醫健卡已移至「福利」Tab → 健康分類置頂 ── -->

  <!-- ── 醫健卡已移至「福利」Tab → 健康分類置頂 (commit 4ff1927) ── -->

  <!-- ── 底部連結 ── -->
  <div style="text-align:center;margin-top:20px;font-size:18px;line-height:2.4;">
    <div>
      <button onclick="ceLogout()" style="background:none;border:none;cursor:pointer;color:${accentMid};font-size:18px;font-family:inherit;text-decoration:underline;padding:0;">
        ← 登出
      </button>
    </div>
    <div style="color:#aaa;font-size:16px;">
      如有疑問 WhatsApp：<a href="https://wa.me/85254429749?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E6%9F%A5%E8%A9%A2%E6%9C%89%E9%97%9C%E8%80%81%E6%9C%89%E5%8D%A1%E7%9A%84%E8%B3%87%E8%A8%8A%E3%80%82" target="_blank" style="color:${accentMid};font-weight:700;">📱 5442-9749</a>
    </div>
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
      var waNum=(s.settings&&s.settings.admin_whatsapp)?s.settings.admin_whatsapp:'85254429749';
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
function switchFamTab(tab) {
  var tl=document.getElementById('tabLink'), tn=document.getElementById('tabNew');
  var pl=document.getElementById('panelLink'), pn=document.getElementById('panelNew');
  if(!tl||!tn||!pl||!pn) return;
  if(tab==='link'){
    pl.style.display='block'; pn.style.display='none';
    tl.style.background='#C62828'; tl.style.color='#fff';
    tn.style.background='#fff'; tn.style.color='#C62828';
  } else {
    pl.style.display='none'; pn.style.display='block';
    tn.style.background='#C62828'; tn.style.color='#fff';
    tl.style.background='#fff'; tl.style.color='#C62828';
  }
}
async function submitLinkParent() {
  var phone = document.getElementById('lpPhone').value.replace(/[^0-9]/g,'');
  var errEl = document.getElementById('linkErr');
  errEl.style.display='none';
  if (phone.length !== 8) { errEl.textContent='請填寫正確8位電話'; errEl.style.display='block'; return; }
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
      s.style.display='block';
      document.getElementById('tabLink').style.display='none';
      document.getElementById('tabNew').style.display='none';
      document.getElementById('panelLink').style.display='none';
      document.getElementById('panelNew').style.display='none';
    } else { errEl.textContent=data.error||'綁定失敗'; errEl.style.display='block'; btn.disabled=false; btn.textContent='確認綁定'; }
  } catch(e) { errEl.textContent='網絡錯誤，請重試'; errEl.style.display='block'; btn.disabled=false; btn.textContent='確認綁定'; }
}
async function submitAddParent() {
  var nameZh = document.getElementById('npNameZh').value.trim();
  var phone = document.getElementById('npPhone').value.replace(/[^0-9]/g,'');
  var birthYear = document.getElementById('npBirthYear').value;
  var gender = document.getElementById('npGender').value;
  var errEl = document.getElementById('newErr');
  errEl.style.display='none';
  if (!nameZh) { errEl.textContent='請填寫中文姓名'; errEl.style.display='block'; return; }
  if (!birthYear) { errEl.textContent='請填寫出生年份'; errEl.style.display='block'; return; }
  if (phone.length !== 8) { errEl.textContent='請填寫正確8位電話'; errEl.style.display='block'; return; }
  var btn = document.getElementById('newSubmitBtn');
  btn.disabled=true; btn.textContent='開卡中…';
  try {
    var res = await fetch('/api/members/'+MEMBER_NO+'/add-parent', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ nameZh: nameZh, phone: phone, birthYear: birthYear, gender: gender||undefined })
    });
    var data = await res.json();
    if (data.ok) {
      var s = document.getElementById('famLinkSuccess');
      s.innerHTML = '✅ 已成功為長輩開主卡！<br><strong>主卡編號：'+data.parent_no+'</strong>';
      s.style.display='block';
      document.getElementById('tabLink').style.display='none';
      document.getElementById('tabNew').style.display='none';
      document.getElementById('panelLink').style.display='none';
      document.getElementById('panelNew').style.display='none';
    } else { errEl.textContent=data.error||'開卡失敗'; errEl.style.display='block'; btn.disabled=false; btn.textContent='為長輩開主卡'; }
  } catch(e) { errEl.textContent='網絡錯誤，請重試'; errEl.style.display='block'; btn.disabled=false; btn.textContent='為長輩開主卡'; }
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
function ceLogout() {
  localStorage.removeItem('ce85_member_no');
  localStorage.removeItem('ce85_wa_clicked');
  sessionStorage.removeItem('cw_session');
  // 如果係在 /app 的 iframe 內，通知 parent 登出；否則直接跳轉
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({type:'ce85_logout'}, '*');
  } else {
    window.location.href = '/app';
  }
}
</script>
</body></html>`
}

export function colinkerypwaHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="CoLinkery">
<meta name="theme-color" content="#1B5E20">
<title>CoLinkery 連結者</title>
<link rel="manifest" href="/colinkery-manifest.json">
<link rel="apple-touch-icon" href="/static/cl-icon-192.png">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
:root{--green:#1B5E20;--green2:#228B22;--green3:#2E7D32;--pale:#E8F5E9;--red:#C62828;--warm:#FAF8F3;--text:#1A1A1A;--muted:#6B7280;--border:#E5E7EB;--chip:#F0FDF4;--chip-border:#BBF7D0;}
html,body{height:100%;background:var(--warm);font-family:'Noto Sans TC',sans-serif;color:var(--text);font-size:18px;line-height:1.6;overscroll-behavior:none;}
#app{min-height:100vh;display:flex;flex-direction:column;}
/* Nav */
.cl-nav{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--green);color:#fff;position:sticky;top:0;z-index:100;min-height:56px;}
.cl-nav-title{font-size:18px;font-weight:700;}
.cl-nav-back{background:none;border:none;color:#fff;font-size:24px;cursor:pointer;padding:4px 8px;min-width:44px;min-height:44px;display:flex;align-items:center;}
/* Page containers */
.page{display:none;flex-direction:column;flex:1;padding-bottom:80px;}
.page.active{display:flex;}
/* Bottom nav */
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--border);display:flex;z-index:99;padding-bottom:env(safe-area-inset-bottom);}
.bottom-nav button{flex:1;border:none;background:none;padding:8px 4px;font-size:11px;color:var(--muted);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:56px;font-family:inherit;}
.bottom-nav button.active{color:var(--green);}
.bottom-nav button .icon{font-size:22px;}
/* Cards */
.cl-card{background:#fff;border-radius:16px;padding:20px;margin:12px 16px;box-shadow:0 2px 12px rgba(0,0,0,.08);}
/* Buttons */
.btn-primary{display:block;width:100%;min-height:56px;background:var(--green);color:#fff;border:none;border-radius:14px;font-size:18px;font-weight:700;cursor:pointer;font-family:inherit;padding:0 20px;line-height:1.4;}
.btn-primary:active{opacity:.85;}
.btn-secondary{display:block;width:100%;min-height:56px;background:#fff;color:var(--green);border:2px solid var(--green);border-radius:14px;font-size:18px;font-weight:700;cursor:pointer;font-family:inherit;padding:0 20px;line-height:1.4;}
.btn-outline{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border:1.5px solid var(--border);border-radius:10px;font-size:16px;background:#fff;cursor:pointer;font-family:inherit;gap:6px;}
/* Form */
.form-group{margin-bottom:18px;}
.form-label{display:block;font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px;}
.form-input{width:100%;min-height:52px;border:2px solid var(--border);border-radius:12px;padding:12px 16px;font-size:18px;font-family:inherit;background:#fff;color:var(--text);transition:border .2s;outline:none;}
.form-input:focus{border-color:var(--green);}
.form-hint{font-size:14px;color:var(--muted);margin-top:4px;}
select.form-input{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%236B7280' viewBox='0 0 20 20'%3E%3Cpath d='M5 7l5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
/* Alert */
.alert{padding:14px 16px;border-radius:12px;font-size:16px;margin:0 16px 12px;}
.alert-red{background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;}
.alert-green{background:var(--pale);border:1px solid #86EFAC;color:var(--green);}
.alert-yellow{background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;}
/* Stats */
.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px 16px;}
.stat-card{background:#fff;border-radius:14px;padding:14px 10px;text-align:center;box-shadow:0 1px 8px rgba(0,0,0,.06);}
.stat-num{font-size:26px;font-weight:900;color:var(--green);}
.stat-lbl{font-size:13px;color:var(--muted);margin-top:2px;}
/* Card chip */
.card-chip{background:var(--chip);border:1px solid var(--chip-border);border-radius:10px;padding:12px 14px;margin:0 16px 10px;}
/* Loading */
.spinner{display:inline-block;width:36px;height:36px;border:4px solid #E5E7EB;border-top-color:var(--green);border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-overlay{position:fixed;inset:0;background:rgba(255,255,255,.8);display:flex;align-items:center;justify-content:center;z-index:999;flex-direction:column;gap:12px;font-size:16px;color:var(--muted);}
/* Camera */
.camera-wrap{position:relative;width:100%;border-radius:12px;overflow:hidden;background:#111;touch-action:none;}
#camera-preview{width:100%;max-height:62vh;object-fit:cover;display:block;cursor:pointer;}
#camera-canvas{display:none;}
#camera-focus-ring{
  position:absolute;width:72px;height:72px;
  border:3px solid #fff;border-radius:50%;
  box-shadow:0 0 0 1px rgba(0,0,0,.5);
  pointer-events:none;display:none;
  transform:translate(-50%,-50%);
  transition:opacity .3s;
}
#camera-tap-hint{
  position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
  background:rgba(0,0,0,.55);color:#fff;border-radius:20px;
  padding:6px 16px;font-size:13px;pointer-events:none;
  white-space:nowrap;
}
/* Onboarding overlay */
.onboard-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;display:flex;align-items:center;justify-content:center;}
.onboard-box{background:#fff;border-radius:20px;padding:28px 20px;margin:20px;max-width:400px;width:100%;text-align:center;}
.onboard-icon{font-size:56px;margin-bottom:12px;}
.onboard-title{font-size:20px;font-weight:700;color:var(--green);margin-bottom:10px;}
.onboard-desc{font-size:16px;color:var(--muted);line-height:1.6;margin-bottom:20px;}
/* Share link box */
.share-box{background:var(--pale);border-radius:12px;padding:14px;font-size:15px;color:var(--green3);word-break:break-all;border:1px solid #A7F3D0;margin-bottom:14px;}
/* Commission item */
.comm-item{padding:14px 0;border-bottom:1px solid var(--border);}
.comm-item:last-child{border-bottom:none;}
/* Responsive tweaks */
@media(min-width:480px){
  .page{max-width:480px;margin:0 auto;}
  .bottom-nav{max-width:480px;left:50%;transform:translateX(-50%);}
}
/* Onboard step dots */
.step-dots{display:flex;gap:6px;justify-content:center;margin-top:16px;}
.step-dot{width:8px;height:8px;border-radius:50%;background:#E5E7EB;}
.step-dot.active{background:var(--green);}
/* Role badge */
.role-badge{display:inline-block;background:var(--green);color:#fff;font-size:13px;font-weight:700;padding:3px 10px;border-radius:20px;}
/* Industry tag */
.ind-tag{display:inline-block;background:#F3F4F6;border-radius:8px;padding:3px 10px;font-size:14px;color:var(--muted);margin:2px;}
/* PWA install banner */
.pwa-banner{background:var(--green3);color:#fff;padding:12px 16px;font-size:15px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.pwa-banner button{background:#fff;color:var(--green);border:none;border-radius:8px;padding:6px 14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}
</style>
</head>
<body>
<div id="app">
  <!-- Loading overlay -->
  <div class="loading-overlay" id="loading-overlay" style="display:none">
    <div class="spinner"></div>
    <span id="loading-text">載入中…</span>
  </div>

  <!-- Onboarding overlay -->
  <div class="onboard-overlay" id="onboard-overlay" style="display:none">
    <div class="onboard-box">
      <div class="onboard-icon" id="ob-icon">👋</div>
      <div class="onboard-title" id="ob-title">歡迎加入 CoLinkery！</div>
      <div class="onboard-desc" id="ob-desc">你係老有聯盟 85 的連結者，用你的人脈連結企業採購，讓長者社群受惠。</div>
      <button class="btn-primary" id="ob-next-btn" onclick="onboardNext()">繼續</button>
      <div class="step-dots" id="ob-dots"></div>
    </div>
  </div>

  <!-- PWA install banner (Android) -->
  <div class="pwa-banner" id="pwa-banner" style="display:none">
    <span>💡 加至主畫面，下次更快開啟</span>
    <button onclick="triggerInstall()">加入</button>
  </div>

  <!-- ① 登入頁 -->
  <div class="page active" id="page-login">
    <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:16px 20px 32px;color:#fff;text-align:center;">
      <div style="text-align:left;margin-bottom:12px;">
        <a href="/app" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.18);border-radius:20px;padding:6px 14px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">
          ← 老有卡 App
        </a>
      </div>
      <div style="font-size:48px;margin-bottom:8px;">🤝</div>
      <div style="font-size:24px;font-weight:900;">CoLinkery</div>
      <div style="font-size:16px;opacity:.85;margin-top:4px;">老有聯盟 85 · 連結者工具</div>
    </div>
    <div style="padding:24px 16px;">
      <div class="form-group">
        <label class="form-label">電話號碼</label>
        <input type="tel" class="form-input" id="login-phone" placeholder="例：52345678" autocomplete="username">
      </div>
      <div class="form-group">
        <label class="form-label">密碼</label>
        <input type="password" class="form-input" id="login-pw" placeholder="請輸入密碼" autocomplete="current-password">
      </div>
      <div id="login-err" class="alert alert-red" style="display:none;margin:0 0 14px;"></div>
      <button class="btn-primary" onclick="doLogin()" style="margin-bottom:14px;">登入</button>
      <button class="btn-secondary" onclick="window.location.href='/app/partner-apply?role=COLINKERY'" style="margin-bottom:14px;">申請成為 CoLinkery 連結者</button>
      <button class="btn-outline" style="width:100%;margin-bottom:14px;" onclick="showPage('page-forgot')">忘記密碼？</button>
      <p style="text-align:center;font-size:14px;color:var(--muted);">申請後 3-5 工作天審核，批准後可登入</p>
    </div>
  </div>

  <!-- ② 申請頁 (展示后由 showPage 觸發 redirect，不在此處直接執行) -->
  <div class="page" id="page-apply">
    <div class="cl-nav">
      <button class="cl-nav-back" onclick="showPage('page-login')">←</button>
      <div class="cl-nav-title">申請成為 CoLinkery</div>
      <div style="width:44px"></div>
    </div>
    <div style="padding:32px 16px;text-align:center;">
      <div style="font-size:40px;margin-bottom:16px;">🤝</div>
      <div style="font-size:17px;font-weight:700;color:var(--green);margin-bottom:8px;">正在跳轉至申請頁面…</div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:24px;">如未自動跳轉，請點擊下方按鈕</div>
      <button class="btn-primary" onclick="window.location.href='/app/partner-apply?role=COLINKERY'">前往申請表格</button>
    </div>
  </div>

  <!-- ③ 申請狀態頁（未登入時查閱）-->
  <div class="page" id="page-status-check">
    <div class="cl-nav">
      <button class="cl-nav-back" onclick="showPage('page-login')">←</button>
      <div class="cl-nav-title">申請狀態</div>
      <div style="width:44px"></div>
    </div>
    <div style="padding:16px;">
      <div class="form-group">
        <label class="form-label">電話號碼</label>
        <input type="tel" class="form-input" id="status-phone" placeholder="請輸入電話查詢申請狀態">
      </div>
      <button class="btn-primary" onclick="checkStatus()">查詢</button>
      <div id="status-result" style="margin-top:16px;"></div>
    </div>
  </div>

  <!-- ④ 忘記密碼 -->
  <div class="page" id="page-forgot">
    <div class="cl-nav">
      <button class="cl-nav-back" onclick="showPage('page-login')">←</button>
      <div class="cl-nav-title">重設密碼</div>
      <div style="width:44px"></div>
    </div>
    <div style="padding:16px;">
      <div id="forgot-step1" >
        <div class="cl-card" style="margin:0 0 16px;">
          <p style="font-size:16px;color:var(--muted);line-height:1.6;">輸入你的電話號碼，職員會以 WhatsApp 發送 6 位重設碼給你（約 15 分鐘內）。</p>
        </div>
        <div class="form-group">
          <label class="form-label">電話號碼</label>
          <input type="tel" class="form-input" id="forgot-phone" placeholder="例：52345678">
        </div>
        <div id="forgot-err" class="alert alert-red" style="display:none;"></div>
        <button class="btn-primary" onclick="doForgotStep1()">申請重設碼</button>
      </div>
      <div id="forgot-step2" style="display:none;">
        <div class="alert alert-green" style="margin:0 0 16px;">✅ 重設碼申請已收到！職員將以 WhatsApp 發送 6 位數字給你，請稍候（約 15 分鐘內）。</div>
        <div class="form-group">
          <label class="form-label">6 位重設碼</label>
          <input type="text" class="form-input" id="forgot-otp" placeholder="輸入 WhatsApp 收到的重設碼" maxlength="6" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label">新密碼</label>
          <input type="password" class="form-input" id="forgot-newpw" placeholder="最少 8 位">
        </div>
        <div class="form-group">
          <label class="form-label">確認新密碼</label>
          <input type="password" class="form-input" id="forgot-newpw2" placeholder="再輸入一次">
        </div>
        <div id="forgot-err2" class="alert alert-red" style="display:none;"></div>
        <button class="btn-primary" onclick="doForgotStep2()">確認重設密碼</button>
      </div>
    </div>
  </div>

  <!-- ⑤ Dashboard -->
  <div class="page" id="page-dashboard">
    <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:16px 16px 20px;color:#fff;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <a href="/app" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.18);border:none;border-radius:20px;padding:6px 14px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;-webkit-tap-highlight-color:transparent;">
          ← 老有卡 App
        </a>
        <div style="font-size:13px;opacity:.7;">CoLinkery</div>
      </div>
      <div style="font-size:15px;opacity:.8;">歡迎回來</div>
      <div style="font-size:22px;font-weight:900;margin:4px 0;" id="dash-name">—</div>
      <div class="role-badge" style="margin-top:6px;">🤝 CoLinkery 連結者</div>
    </div>
    <div id="dash-stats" class="stat-row" style="margin-top:16px;">
      <div class="stat-card"><div class="stat-num" id="stat-leads">-</div><div class="stat-lbl">名片引薦</div></div>
      <div class="stat-card"><div class="stat-num" id="stat-won">-</div><div class="stat-lbl">促成交易</div></div>
      <div class="stat-card"><div class="stat-num" id="stat-comm">-</div><div class="stat-lbl">固定佣金(元)</div></div>
    </div>
    <div style="padding:0 16px 16px;">
      <button class="btn-primary" onclick="showPage('page-camera')" style="font-size:20px;min-height:64px;margin-bottom:12px;">📷 影名片開始</button>
      <button class="btn-secondary" onclick="showPage('page-cards')" style="margin-bottom:10px;">📋 名片庫</button>
      <button class="btn-secondary" onclick="showPage('page-share')" style="margin-bottom:10px;">🔗 分享我的引薦連結</button>
    </div>
    <!-- PWA install prompt (shown after login if not already installed) -->
    <div id="pwa-install-card" style="display:none;margin:0 16px 16px;">
      <div style="background:linear-gradient(135deg,#1a6b1a,#2d9e2d);border-radius:14px;padding:18px 16px;color:#fff;position:relative;">
        <button onclick="document.getElementById('pwa-install-card').style.display='none';localStorage.setItem('cl_pwa_dismissed','1');"
          style="position:absolute;top:10px;right:12px;background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:28px;height:28px;font-size:16px;cursor:pointer;line-height:1;">✕</button>
        <div style="font-size:22px;margin-bottom:8px;">📲 安裝 CoLinkery App</div>
        <div style="font-size:15px;opacity:.9;margin-bottom:14px;line-height:1.5;">安裝後可離線使用，並從主畫面直接開啟，體驗更流暢！</div>
        <!-- Android install button (shown when beforeinstallprompt fires) -->
        <button id="pwa-install-android-btn" onclick="triggerInstall()" style="display:none;width:100%;background:#fff;color:#1a6b1a;border:none;border-radius:10px;padding:14px;font-size:17px;font-weight:900;cursor:pointer;margin-bottom:8px;">
          ⬇️ 立即安裝到主畫面
        </button>
        <!-- iOS Safari instructions -->
        <div id="pwa-install-ios" style="display:none;background:rgba(255,255,255,.15);border-radius:10px;padding:12px 14px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:8px;">iPhone / iPad 步驟：</div>
          <div style="font-size:14px;line-height:1.8;">
            1️⃣ 點擊 Safari 底部 <strong>分享</strong> 按鈕 <span style="font-size:18px;">⬆️</span><br>
            2️⃣ 向下滾動，選「<strong>加入主畫面</strong>」<br>
            3️⃣ 點「<strong>新增</strong>」完成
          </div>
        </div>
        <!-- Fallback for other browsers -->
        <div id="pwa-install-other" style="display:none;font-size:14px;opacity:.85;line-height:1.6;">
          在瀏覽器選單中選擇「<strong>加至主畫面</strong>」或「<strong>安裝應用程式</strong>」即可。
        </div>
      </div>
    </div>
  </div>

  <!-- ⑥ 影名片 / OCR -->
  <div class="page" id="page-camera">
    <div class="cl-nav">
      <button class="cl-nav-back" onclick="showPage('page-dashboard')">←</button>
      <div class="cl-nav-title">📷 影名片</div>
      <div style="width:44px"></div>
    </div>
    <div style="padding:16px;overflow-y:auto;">
      <div id="camera-area">
        <div class="camera-wrap" id="camera-wrap" onclick="onCameraTap(event)">
          <video id="camera-preview" autoplay playsinline muted></video>
          <canvas id="camera-canvas"></canvas>
          <div id="camera-focus-ring"></div>
          <div id="camera-tap-hint">👆 點擊對焦並自動拍攝</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="btn-primary" onclick="capturePhoto()" style="flex:1;">📸 立即拍攝</button>
          <label class="btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;min-height:56px;font-size:18px;font-weight:700;">
            🖼 選相片<input type="file" accept="image/*" id="file-input" style="display:none;" onchange="handleFileSelect(event)">
          </label>
        </div>
        <p style="font-size:13px;color:var(--muted);text-align:center;margin-top:8px;">📌 名片橫放效果最佳 · 確保文字清晰不反光</p>
      </div>
      <div id="ocr-loading" style="display:none;text-align:center;padding:30px 0;">
        <div class="spinner" style="margin:0 auto 12px;"></div>
        <div style="font-size:16px;color:var(--muted);">AI 讀取名片資料中…</div>
      </div>
      <div id="card-form" style="display:none;">
        <div class="alert alert-green" id="ocr-ok-msg" style="display:none;">✅ AI 已自動讀取，請確認資料</div>
        <div class="alert alert-yellow" id="ocr-fail-msg" style="display:none;">⚠️ AI 未能讀取，請手動填入名片資料</div>
        <div id="ocr-debug-msg" style="display:none;font-size:12px;color:#999;padding:4px 0;word-break:break-all;"></div>
        <div class="cl-card" style="margin:0 0 12px;">
          <img id="captured-preview" style="width:100%;border-radius:8px;margin-bottom:12px;max-height:200px;object-fit:contain;" src="" alt="名片預覽">
        </div>
        <!-- === 姓名 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:4px 0 8px;padding-top:4px;border-top:1px solid #eee;">👤 姓名</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label class="form-label">中文姓名</label><input type="text" class="form-input" id="cf-name-zh" placeholder="例：陳大文"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">英文姓名</label><input type="text" class="form-input" id="cf-name-en" placeholder="e.g. David Chan"></div>
        </div>
        <!-- === 公司 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:4px;border-top:1px solid #eee;">🏢 公司 <span style="color:var(--red)">*</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label class="form-label">公司（中文）</label><input type="text" class="form-input" id="cf-company-zh" placeholder="例：大中華有限公司"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">Company (EN)</label><input type="text" class="form-input" id="cf-company-en" placeholder="e.g. Greater China Ltd"></div>
        </div>
        <!-- === 部門 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:4px;border-top:1px solid #eee;">🗂 部門</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label class="form-label">部門（中文）</label><input type="text" class="form-input" id="cf-dept-zh" placeholder="例：市場部"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">Department (EN)</label><input type="text" class="form-input" id="cf-dept-en" placeholder="e.g. Marketing Dept"></div>
        </div>
        <!-- === 職銜 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:4px;border-top:1px solid #eee;">💼 職銜</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label class="form-label">職銜（中文）</label><input type="text" class="form-input" id="cf-title-zh" placeholder="例：總經理"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">Title (EN)</label><input type="text" class="form-input" id="cf-title-en" placeholder="e.g. General Manager"></div>
        </div>
        <!-- === 聯絡方式 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:4px;border-top:1px solid #eee;">📞 聯絡方式</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label class="form-label">公司電話</label><input type="tel" class="form-input" id="cf-phone" placeholder="例：+852 2345 6789"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">手機</label><input type="tel" class="form-input" id="cf-mobile" placeholder="例：+852 9123 4567"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">傳真 Fax</label><input type="tel" class="form-input" id="cf-fax" placeholder="例：+852 2345 6780"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">WhatsApp</label><input type="tel" class="form-input" id="cf-whatsapp" placeholder="例：+852 9123 4567"></div>
        </div>
        <div class="form-group"><label class="form-label">電郵 Email</label><input type="email" class="form-input" id="cf-email" placeholder="例：info@company.com"></div>
        <div class="form-group"><label class="form-label">網站 Website</label><input type="url" class="form-input" id="cf-website" placeholder="例：www.company.com"></div>
        <!-- === 社交媒體 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:4px;border-top:1px solid #eee;">📱 社交媒體</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label class="form-label">WeChat 微信</label><input type="text" class="form-input" id="cf-wechat" placeholder="WeChat ID"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">LinkedIn</label><input type="text" class="form-input" id="cf-linkedin" placeholder="linkedin.com/in/..."></div>
          <div class="form-group" style="margin:0 0 0;grid-column:1/-1;"><label class="form-label">Telegram</label><input type="text" class="form-input" id="cf-telegram" placeholder="@username"></div>
        </div>
        <!-- === 地址 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:4px;border-top:1px solid #eee;">📍 地址</div>
        <div class="form-group"><label class="form-label">地址（中文）</label><input type="text" class="form-input" id="cf-address-zh" placeholder="例：香港九龍旺角彌敦道XXX號"></div>
        <div class="form-group"><label class="form-label">Address (EN)</label><input type="text" class="form-input" id="cf-address-en" placeholder="e.g. XXX Nathan Rd, Mong Kok, Kowloon, HK"></div>
        <!-- === 行業 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:4px;border-top:1px solid #eee;">🏭 行業</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label class="form-label">行業（中文）</label><input type="text" class="form-input" id="cf-industry-zh" placeholder="例：零售、飲食、製造"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">Industry (EN)</label><input type="text" class="form-input" id="cf-industry-en" placeholder="e.g. Retail, F&B, Mfg"></div>
        </div>
        <!-- === 備註 === -->
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:4px;border-top:1px solid #eee;">📝 備註</div>
        <div class="form-group"><label class="form-label">備註 Notes</label><textarea class="form-input" id="cf-notes" placeholder="任何補充備註…" rows="3" style="resize:vertical;"></textarea></div>
        <div id="card-save-err" class="alert alert-red" style="display:none;"></div>
        <button class="btn-primary" onclick="saveCardAndHandover()">確認 → 交棒給 CoEldery 85</button>
        <button class="btn-outline" onclick="saveCardOnly()" style="width:100%;margin-top:10px;">只儲存名片</button>
      </div>
    </div>
  </div>

  <!-- ⑦ 名片庫 -->
  <div class="page" id="page-cards">
    <div class="cl-nav">
      <button class="cl-nav-back" onclick="showPage('page-dashboard')">←</button>
      <div class="cl-nav-title">📋 名片庫</div>
      <div style="width:44px"></div>
    </div>
    <div style="padding:12px 16px;">
      <input type="text" class="form-input" id="cards-search" placeholder="🔍 搜尋姓名、公司、電話…" oninput="searchCards()" style="margin-bottom:12px;">
    </div>
    <div id="cards-list" style="padding:0 16px;"></div>
    <div id="card-detail-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;overflow-y:auto;">
      <div style="background:#fff;margin:20px 12px;border-radius:16px;padding:20px;padding-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:18px;font-weight:700;" id="detail-title">名片詳情</h3>
          <button class="btn-outline" onclick="closeCardDetail()" style="min-height:36px;padding:0 12px;font-size:14px;">關閉</button>
        </div>
        <div id="detail-body"></div>
        <!-- WA action buttons -->
        <div id="detail-wa-btns" style="display:none;gap:8px;margin-top:14px;">
          <button id="detail-wa-link-btn" style="flex:1;background:#25D366;color:#fff;border:none;border-radius:10px;padding:12px 8px;font-size:14px;font-weight:700;cursor:pointer;">💬+🔗 發目錄 + WA</button>
          <button id="detail-wa-only-btn" style="flex:1;background:#128C7E;color:#fff;border:none;border-radius:10px;padding:12px 8px;font-size:14px;font-weight:700;cursor:pointer;">💬 只發 WA 訊息</button>
        </div>
        <button class="btn-primary" id="detail-handover-btn" onclick="handoverFromDetail()" style="margin-top:10px;">🤝 請 CoEldery 85 安排對接</button>
      </div>
    </div>
  </div>

  <!-- ⑧ 交棒完成頁 -->
  <div class="page" id="page-handover">
    <div class="cl-nav">
      <button class="cl-nav-back" onclick="showPage('page-dashboard')">←</button>
      <div class="cl-nav-title">🤝 交棒成功</div>
      <div style="width:44px"></div>
    </div>
    <div style="padding:20px 16px;text-align:center;">
      <div style="font-size:64px;margin-bottom:16px;">🎉</div>
      <div style="font-size:20px;font-weight:700;color:var(--green);margin-bottom:8px;">交棒成功！</div>
      <div style="font-size:16px;color:var(--muted);margin-bottom:20px;" id="handover-buyer">系統已為買家生成專屬目錄連結</div>
      <div class="share-box" id="handover-url" style="text-align:left;"></div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn-primary" onclick="copyHandoverUrl()">📋 複製連結</button>
        <button class="btn-primary" onclick="waHandoverUrl()" style="background:#25D366;">💬 WhatsApp 發給買家</button>
        <button class="btn-outline" onclick="emailHandoverUrl()" style="width:100%;">📧 Email 發給買家</button>
      </div>
      <div class="alert alert-green" style="margin:16px 0 0;text-align:left;">
        ✅ 接下來由 CoEldery 85 系統跟進：<br>
        • 買家在目錄揀選有興趣產品<br>
        • 系統自動生成報價單並發給買家<br>
        • 成交後固定佣金計回你的帳戶
      </div>
    </div>
  </div>

  <!-- ⑨ 分享引薦連結 -->
  <div class="page" id="page-share">
    <div class="cl-nav">
      <button class="cl-nav-back" onclick="showPage('page-dashboard')">←</button>
      <div class="cl-nav-title">🔗 分享引薦連結</div>
      <div style="width:44px"></div>
    </div>
    <div style="padding:16px;">
      <div class="cl-card" style="margin:0 0 16px;">
        <p style="font-size:16px;color:var(--text);margin-bottom:10px;">將以下連結分享給有意了解 CoEldery 85 企業採購平台的聯絡人：</p>
        <div class="share-box" id="share-link-box"></div>
        <div style="font-size:14px;color:var(--muted);margin-bottom:12px;">連結帶有你的引薦 ID，方便系統追蹤。</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn-primary" onclick="copyShareLink()">📋 複製連結</button>
          <button class="btn-primary" onclick="waShareLink()" style="background:#25D366;">💬 WhatsApp 分享</button>
          <button class="btn-outline" onclick="emailShareLink()" style="width:100%;">📧 Email 分享</button>
        </div>
      </div>
      <div class="cl-card" style="margin:0;background:var(--pale);">
        <p style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:6px;">📋 預載分享文案</p>
        <div id="share-text-preview" style="font-size:14px;color:var(--text);line-height:1.6;white-space:pre-wrap;background:#fff;border-radius:8px;padding:12px;"></div>
        <button class="btn-outline" onclick="copyShareText()" style="width:100%;margin-top:10px;">📋 複製文案</button>
      </div>
    </div>
  </div>

  <!-- ⑩ 成績 -->
  <div class="page" id="page-results">
    <div class="cl-nav">
      <div style="width:44px"></div>
      <div class="cl-nav-title">📊 我的成績</div>
      <div style="width:44px"></div>
    </div>
    <div id="results-content" style="padding:16px;"></div>
  </div>

  <!-- Bottom Nav（登入後顯示）-->
  <nav class="bottom-nav" id="bottom-nav" style="display:none;">
    <button onclick="showPage('page-dashboard')" id="nav-home" class="active"><span class="icon">🏠</span>主頁</button>
    <button onclick="showPage('page-camera')" id="nav-camera"><span class="icon">📷</span>影名片</button>
    <button onclick="showPage('page-cards')" id="nav-cards"><span class="icon">📋</span>名片庫</button>
    <button onclick="showPage('page-results')" id="nav-results"><span class="icon">📊</span>成績</button>
  </nav>
</div>

<script>
// ── 狀態 ──────────────────────────────────────────────────────────────────────
var STATE = {
  memberNo: null, nameZh: null,
  currentCard: null,       // 剛拍攝/選取的名片圖片 R2 key
  lastHandoverUrl: null, lastHandoverBuyer: null,
  cameraStream: null,
  focusTimer: null,        // tap-to-focus auto-capture timer
  allCards: [],
  deferredPrompt: null
};

// ── 工具 ──────────────────────────────────────────────────────────────────────
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function showLoading(txt){ document.getElementById('loading-overlay').style.display='flex'; document.getElementById('loading-text').textContent=txt||'載入中…'; }
function hideLoading(){ document.getElementById('loading-overlay').style.display='none'; }
function goApply(){ window.location.href='/app/partner-apply?role=COLINKERY'; }

function showPage(id){
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  var el = document.getElementById(id);
  if(el) el.classList.add('active');
  // Update bottom nav active state
  var navMap = {
    'page-dashboard':'nav-home','page-camera':'nav-camera',
    'page-cards':'nav-cards','page-results':'nav-results'
  };
  document.querySelectorAll('.bottom-nav button').forEach(function(b){ b.classList.remove('active'); });
  var navId = navMap[id];
  if(navId){ var nb = document.getElementById(navId); if(nb) nb.classList.add('active'); }
  // Stop camera if leaving camera page
  if(id !== 'page-camera') stopCamera();
  // Auto-init pages
  if(id==='page-camera') resetAndInitCamera();
  if(id==='page-cards') loadCards();
  if(id==='page-results') loadResults();
  if(id==='page-share') initSharePage();
  if(id==='page-dashboard') loadStats();
  if(id==='page-apply') { window.location.href='/app/partner-apply?role=COLINKERY'; return; }
  window.scrollTo(0,0);
}

function showAlert(id, msg, type){
  var el = document.getElementById(id);
  if(!el) return;
  el.textContent = msg;
  el.className = 'alert alert-'+(type||'red');
  el.style.display = 'block';
}
function hideAlert(id){ var el=document.getElementById(id); if(el) el.style.display='none'; }

// ── 初始化：檢查登入狀態 ────────────────────────────────────────────────────
(function init(){
  // 1. Try localStorage persistent session (survives tab close & PWA restart)
  var saved = localStorage.getItem('cl_member');
  // 2. Fallback: legacy sessionStorage (old sessions before this update)
  if(!saved) saved = sessionStorage.getItem('cl_member');
  if(saved){
    try{
      var d = JSON.parse(saved);
      STATE.memberNo = d.member_no;
      STATE.nameZh = d.name_zh;
      // Migrate to localStorage if still in sessionStorage
      localStorage.setItem('cl_member', JSON.stringify(d));
      sessionStorage.removeItem('cl_member');
      afterLogin();
    } catch(e){
      localStorage.removeItem('cl_member');
      sessionStorage.removeItem('cl_member');
    }
  } else {
    // 從會員卡跳過來：?action=apply&phone=xxxxxxxx → 直接跳轉新申請頁
    var params = new URLSearchParams(window.location.search);
    var action = params.get('action');
    var prefillPhone = params.get('phone') || '';
    if(action === 'apply'){
      var applyUrl = '/app/partner-apply?role=COLINKERY';
      if(prefillPhone) applyUrl += '&phone=' + encodeURIComponent(prefillPhone);
      window.location.href = applyUrl;
    } else {
      // Pre-fill phone: URL param takes priority, then saved phone
      var savedPhone = localStorage.getItem('cl_saved_phone') || '';
      var loginPhoneEl = document.getElementById('login-phone');
      if(prefillPhone){
        if(loginPhoneEl) loginPhoneEl.value = prefillPhone;
      } else if(savedPhone && loginPhoneEl){
        loginPhoneEl.value = savedPhone;
      }
      if(prefillPhone || savedPhone){
        var loginPwEl = document.getElementById('login-pw');
        if(loginPwEl) loginPwEl.focus();
      }
    }
  }
  // Register service worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/colinkery-sw.js').catch(function(){});
  }
  // PWA install prompt (Android)
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    STATE.deferredPrompt = e;
    // If user already logged in and card is waiting for prompt, show it now
    if(STATE.showInstallCardWhenReady){
      STATE.showInstallCardWhenReady = false;
      var card = document.getElementById('pwa-install-card');
      if(card && !localStorage.getItem('cl_pwa_dismissed')){
        document.getElementById('pwa-install-android-btn').style.display = 'block';
        card.style.display = 'block';
      }
    }
  });
})();

function triggerInstall(){
  if(STATE.deferredPrompt){
    STATE.deferredPrompt.prompt();
    STATE.deferredPrompt.userChoice.then(function(r){
      STATE.deferredPrompt = null;
      // Hide install card after user responds
      var card = document.getElementById('pwa-install-card');
      if(card) card.style.display = 'none';
      if(r.outcome === 'accepted'){
        localStorage.setItem('cl_pwa_dismissed','1');
      }
    });
  }
}

// ── 登出 ──────────────────────────────────────────────────────────────────────
async function doClLogout(){
  if(!confirm('確認登出？')) return;
  // Clear local state
  localStorage.removeItem('cl_member');
  sessionStorage.removeItem('cl_member');
  STATE.memberNo = null;
  STATE.nameZh = null;
  // Call server to invalidate cookie
  try{ await fetch('/api/colinkery/logout',{method:'POST',credentials:'include'}); } catch(e){}
  // Reset UI
  document.getElementById('bottom-nav').style.display = 'none';
  showPage('page-login');
  // Keep phone pre-filled for convenience
  var savedPhone = localStorage.getItem('cl_saved_phone') || '';
  if(savedPhone){
    var el = document.getElementById('login-phone');
    if(el) el.value = savedPhone;
    var pwEl = document.getElementById('login-pw');
    if(pwEl){ pwEl.value=''; pwEl.focus(); }
  }
}

// ── 登入 ──────────────────────────────────────────────────────────────────────
async function doLogin(){
  var phone = document.getElementById('login-phone').value.trim();
  var pw = document.getElementById('login-pw').value;
  if(!phone||!pw){ showAlert('login-err','請填寫電話及密碼'); return; }
  hideAlert('login-err');
  showLoading('登入中…');
  try{
    var res = await fetch('/api/colinkery/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:phone,password:pw})});
    var d = await res.json();
    hideLoading();
    if(!d.ok){ showAlert('login-err', d.error||'登入失敗'); return; }
    STATE.memberNo = d.member_no;
    STATE.nameZh = d.name_zh;
    // Persist session in localStorage (survives tab close & PWA restart)
    localStorage.setItem('cl_member', JSON.stringify({member_no:d.member_no,name_zh:d.name_zh}));
    // Remember phone for next login
    localStorage.setItem('cl_saved_phone', phone);
    afterLogin();
  } catch(e){ hideLoading(); showAlert('login-err','網絡錯誤，請稍後再試'); }
}

function afterLogin(){
  document.getElementById('dash-name').textContent = STATE.nameZh || STATE.memberNo;
  document.getElementById('bottom-nav').style.display = 'flex';
  showPage('page-dashboard');
  // Check if first-time onboarding
  if(!localStorage.getItem('cl_onboarded_'+STATE.memberNo)){
    startOnboarding();
  }
  // PWA install prompt — show after login if not dismissed and not already installed
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if(!localStorage.getItem('cl_pwa_dismissed') && !isStandalone){
    setTimeout(function(){
      var card = document.getElementById('pwa-install-card');
      if(!card) return;
      var ua = navigator.userAgent;
      var isIos = /iphone|ipad|ipod/i.test(ua);
      var isAndroid = /android/i.test(ua);
      // Reset sub-sections
      document.getElementById('pwa-install-ios').style.display = 'none';
      document.getElementById('pwa-install-android-btn').style.display = 'none';
      document.getElementById('pwa-install-other').style.display = 'none';
      if(isIos){
        document.getElementById('pwa-install-ios').style.display = 'block';
      } else if(isAndroid && STATE.deferredPrompt){
        document.getElementById('pwa-install-android-btn').style.display = 'block';
      } else if(isAndroid){
        // Android but beforeinstallprompt not yet fired — mark flag so it shows when prompt fires
        STATE.showInstallCardWhenReady = true;
        return; // wait for beforeinstallprompt
      } else {
        document.getElementById('pwa-install-other').style.display = 'block';
      }
      card.style.display = 'block';
    }, 2000);
  }
}

// ── Onboarding ────────────────────────────────────────────────────────────────
var OB_STEPS = [
  {icon:'👋',title:'歡迎加入 CoLinkery！',desc:'你係老有聯盟 85 的連結者，用你的人脈連結企業採購，讓長者社群受惠。'},
  {icon:'📷',title:'第一步：影名片',desc:'遇到企業採購決策人？立即影低佢的名片，AI 自動讀取聯絡資料。'},
  {icon:'🤝',title:'第二步：交棒',desc:'一撳「交棒」，系統為買家生成專屬報價目錄連結，由你轉發給對方。'},
  {icon:'🎉',title:'第三步：系統跟進',desc:'其後嘅報價、跟單、物流全由 CoEldery 85 處理。成交後固定佣金直接計入你的帳戶。'},
  {icon:'📱',title:'加至主畫面',desc:'點擊「加至主畫面」，下次開啟更方便，使用體驗更像 App！'}
];
var obStep = 0;
function startOnboarding(){
  obStep = 0;
  renderOnboardStep();
  document.getElementById('onboard-overlay').style.display='flex';
}
function renderOnboardStep(){
  var s = OB_STEPS[obStep];
  document.getElementById('ob-icon').textContent = s.icon;
  document.getElementById('ob-title').textContent = s.title;
  document.getElementById('ob-desc').textContent = s.desc;
  document.getElementById('ob-next-btn').textContent = obStep < OB_STEPS.length-1 ? '繼續' : '開始影名片！';
  var dots = document.getElementById('ob-dots');
  dots.innerHTML = OB_STEPS.map(function(_,i){ return '<div class="step-dot'+(i===obStep?' active':'')+'"></div>'; }).join('');
}
function onboardNext(){
  obStep++;
  if(obStep >= OB_STEPS.length){
    document.getElementById('onboard-overlay').style.display='none';
    localStorage.setItem('cl_onboarded_'+STATE.memberNo,'1');
    showPage('page-camera');
    return;
  }
  renderOnboardStep();
}

// ── 申請 ──────────────────────────────────────────────────────────────────────
async function doApply(){
  var phone = document.getElementById('apply-phone').value.trim();
  var name = document.getElementById('apply-name').value.trim();
  var type = document.getElementById('apply-type').value;
  var bank = document.getElementById('apply-bank').value.trim();
  var docFile = document.getElementById('apply-doc').files[0];
  var pw = document.getElementById('apply-pw').value;
  var pw2 = document.getElementById('apply-pw2').value;
  var agree = document.getElementById('apply-agree').checked;
  hideAlert('apply-err'); hideAlert('apply-ok');
  if(!phone||!name||!type||!pw){ showAlert('apply-err','請填寫所有必填欄位'); return; }
  if(pw !== pw2){ showAlert('apply-err','兩次密碼不一致'); return; }
  if(pw.length < 8){ showAlert('apply-err','密碼最少 8 位'); return; }
  if(!agree){ showAlert('apply-err','請同意合作條款'); return; }
  if((type==='COMPANY'||type==='ASSOCIATION') && !docFile){ showAlert('apply-err','公司/協會身份需要上傳登記文件'); return; }
  showLoading('提交申請中…');
  try{
    var fd = new FormData();
    fd.append('phone',phone); fd.append('name_zh',name); fd.append('applicant_type',type);
    fd.append('bank_info',bank); fd.append('password',pw); fd.append('agree_terms','on');
    if(docFile) fd.append('doc_file',docFile);
    var res = await fetch('/api/colinkery/apply',{method:'POST',body:fd});
    var d = await res.json();
    hideLoading();
    if(!d.ok){ showAlert('apply-err',d.error||'申請失敗'); return; }
    showAlert('apply-ok', d.message || '申請已提交！審核約需 3-5 個工作天。', 'green');
    // Clear form
    document.getElementById('apply-phone').value=''; document.getElementById('apply-name').value='';
    document.getElementById('apply-pw').value=''; document.getElementById('apply-pw2').value='';
  } catch(e){ hideLoading(); showAlert('apply-err','網絡錯誤，請稍後再試'); }
}

// ── 狀態查詢 ──────────────────────────────────────────────────────────────────
async function checkStatus(){
  var phone = document.getElementById('status-phone').value.trim();
  if(!phone) return;
  showLoading('查詢中…');
  try{
    var res = await fetch('/api/colinkery/my-status?phone='+encodeURIComponent(phone));
    var d = await res.json();
    hideLoading();
    var html = '';
    if(!d.ok){ html='<div class="alert alert-red">'+esc(d.error)+'</div>'; }
    else {
      var stMap={'none':'未申請','password_pending':'審核中（3-5 工作天）','active':'已啟用','suspended':'已暫停'};
      html = '<div class="cl-card"><div style="font-size:16px;font-weight:700;margin-bottom:8px;">'+esc(d.name_zh)+'</div>';
      html += '<div>帳戶狀態：<strong>'+(stMap[d.colinkery_account_status]||d.colinkery_account_status)+'</strong></div>';
      if(d.application){
        html += '<div style="margin-top:8px;font-size:14px;color:var(--muted);">申請身份：'+esc(d.application.applicant_type)+'</div>';
        if(d.application.status==='REJECTED'&&d.application.review_notes){
          html += '<div class="alert alert-red" style="margin-top:8px;">拒絕原因：'+esc(d.application.review_notes)+'</div>';
          html += '<button class="btn-secondary" onclick="goApply()" style="margin-top:8px;">重新申請</button>';
        }
      }
      html += '</div>';
    }
    document.getElementById('status-result').innerHTML = html;
  } catch(e){ hideLoading(); document.getElementById('status-result').innerHTML='<div class="alert alert-red">網絡錯誤</div>'; }
}

// ── 忘記密碼 ──────────────────────────────────────────────────────────────────
var forgotPhone = '';
async function doForgotStep1(){
  forgotPhone = document.getElementById('forgot-phone').value.trim();
  if(!forgotPhone){ showAlert('forgot-err','請輸入電話'); return; }
  hideAlert('forgot-err');
  showLoading('申請重設碼…');
  try{
    var res = await fetch('/api/colinkery/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:forgotPhone})});
    var d = await res.json();
    hideLoading();
    if(!d.ok){ showAlert('forgot-err',d.error||'申請失敗'); return; }
    document.getElementById('forgot-step1').style.display='none';
    document.getElementById('forgot-step2').style.display='block';
  } catch(e){ hideLoading(); showAlert('forgot-err','網絡錯誤'); }
}
async function doForgotStep2(){
  var otp = document.getElementById('forgot-otp').value.trim();
  var pw = document.getElementById('forgot-newpw').value;
  var pw2 = document.getElementById('forgot-newpw2').value;
  hideAlert('forgot-err2');
  if(!otp||!pw){ showAlert('forgot-err2','請填寫所有欄位'); return; }
  if(pw!==pw2){ showAlert('forgot-err2','兩次密碼不一致'); return; }
  if(pw.length<8){ showAlert('forgot-err2','密碼最少 8 位'); return; }
  showLoading('重設密碼中…');
  try{
    var res = await fetch('/api/colinkery/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:forgotPhone,otp_code:otp,new_password:pw})});
    var d = await res.json();
    hideLoading();
    if(!d.ok){ showAlert('forgot-err2',d.error||'重設失敗'); return; }
    alert('✅ 密碼已更新！請用新密碼登入。');
    showPage('page-login');
  } catch(e){ hideLoading(); showAlert('forgot-err2','網絡錯誤'); }
}

// ── Stats ──────────────────────────────────────────────────────────────────────
async function loadStats(){
  if(!STATE.memberNo) return;
  try{
    var res = await fetch('/api/colinkery/stats', { credentials: 'include' });
    var d = await res.json();
    if(d.ok){
      document.getElementById('stat-leads').textContent = d.total_leads;
      document.getElementById('stat-won').textContent = d.won_count;
      var comm = Math.round((d.paid_cents + d.accrued_cents)/100);
      document.getElementById('stat-comm').textContent = comm.toLocaleString();
    }
  } catch(e){}
}

// ── Camera ────────────────────────────────────────────────────────────────────
// Reset camera page UI and (re)start camera stream
function resetAndInitCamera(){
  // Always show camera-area, hide card-form and ocr-loading
  var camArea = document.getElementById('camera-area');
  if(camArea) camArea.style.display='';
  var cardForm = document.getElementById('card-form');
  if(cardForm) cardForm.style.display='none';
  var ocrLoad = document.getElementById('ocr-loading');
  if(ocrLoad) ocrLoad.style.display='none';
  // Show hint again
  var hint = document.getElementById('camera-tap-hint');
  if(hint){ hint.style.display='block'; hint.style.opacity='1'; }
  // Restart stream if needed
  if(!STATE.cameraStream) initCamera();
}

async function initCamera(){
  if(STATE.cameraStream) return;
  try{
    // Request rear camera, high res for OCR
    var stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:'environment'},
        width:{ideal:1920}, height:{ideal:1080},
        focusMode:{ideal:'continuous'}
      }
    });
    STATE.cameraStream = stream;
    var video = document.getElementById('camera-preview');
    video.srcObject = stream;
    video.play();
    // Show hint briefly then fade
    var hint = document.getElementById('camera-tap-hint');
    if(hint){ setTimeout(function(){ hint.style.opacity='0'; setTimeout(function(){ hint.style.display='none'; },600); }, 3000); }
  } catch(e){
    // Camera not available — show file picker only
    document.getElementById('camera-area').innerHTML =
      '<p style="color:var(--muted);text-align:center;padding:20px;">相機不可用，請選擇相片</p>' +
      '<label class="btn-primary" style="display:flex;align-items:center;justify-content:center;cursor:pointer;min-height:56px;">🖼 選擇名片相片' +
      '<input type="file" accept="image/*" id="file-input" style="display:none;" onchange="handleFileSelect(event)"></label>';
  }
}
function stopCamera(){
  if(STATE.cameraStream){
    STATE.cameraStream.getTracks().forEach(function(t){ t.stop(); });
    STATE.cameraStream = null;
  }
  // Clear any pending auto-capture timer
  if(STATE.focusTimer){ clearTimeout(STATE.focusTimer); STATE.focusTimer = null; }
}

// Tap-to-focus: show focus ring, attempt hardware focus, then auto-capture after 0.8s
function onCameraTap(e){
  var wrap = document.getElementById('camera-wrap');
  var ring = document.getElementById('camera-focus-ring');
  var video = document.getElementById('camera-preview');
  if(!wrap||!ring||!video||!STATE.cameraStream) return;

  var rect = wrap.getBoundingClientRect();
  var x = (e.clientX||e.touches&&e.touches[0].clientX||rect.width/2) - rect.left;
  var y = (e.clientY||e.touches&&e.touches[0].clientY||rect.height/2) - rect.top;

  // Show focus ring at tap position
  ring.style.left = x+'px';
  ring.style.top  = y+'px';
  ring.style.display='block';
  ring.style.opacity='1';
  ring.style.transform='translate(-50%,-50%) scale(1.3)';
  setTimeout(function(){ ring.style.transform='translate(-50%,-50%) scale(1)'; },150);

  // Try hardware focus via constraint
  try{
    var track = STATE.cameraStream.getVideoTracks()[0];
    var relX = x/rect.width;
    var relY = y/rect.height;
    track.applyConstraints({advanced:[{pointsOfInterest:[{x:relX,y:relY}],focusMode:'manual'}]}).catch(function(){
      // Not supported on this device — silent fail, still auto-capture
    });
  } catch(_){}

  // Cancel previous timer, set new auto-capture after 0.8s
  if(STATE.focusTimer) clearTimeout(STATE.focusTimer);
  STATE.focusTimer = setTimeout(function(){
    // Fade out ring before capture
    ring.style.opacity='0';
    setTimeout(function(){ ring.style.display='none'; },300);
    capturePhoto();
  }, 800);
}

// Resize image to max 900px before sending to OCR (reduces timeout risk significantly)
function resizeAndProcess(blob, name){
  var MAX = 900;
  var img = new Image();
  var url = URL.createObjectURL(blob);
  img.onload = function(){
    URL.revokeObjectURL(url);
    var w = img.naturalWidth, h = img.naturalHeight;
    if(w <= MAX && h <= MAX){
      // Already small enough
      processImageBlob(blob, name, 'image/jpeg');
      return;
    }
    var scale = Math.min(MAX/w, MAX/h);
    var rw = Math.round(w*scale), rh = Math.round(h*scale);
    var c = document.createElement('canvas');
    c.width = rw; c.height = rh;
    c.getContext('2d').drawImage(img, 0, 0, rw, rh);
    c.toBlob(function(resized){
      processImageBlob(resized, name, 'image/jpeg');
    }, 'image/jpeg', 0.88);
  };
  img.onerror = function(){ URL.revokeObjectURL(url); processImageBlob(blob, name, 'image/jpeg'); };
  img.src = url;
}
function capturePhoto(){
  var video = document.getElementById('camera-preview');
  var canvas = document.getElementById('camera-canvas');
  if(!video.videoWidth) return; // not ready
  var MAX = 900;
  var w = video.videoWidth, h = video.videoHeight;
  var scale = (w > MAX || h > MAX) ? Math.min(MAX/w, MAX/h) : 1;
  canvas.width = Math.round(w*scale);
  canvas.height = Math.round(h*scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(function(blob){ processImageBlob(blob, 'photo.jpg', 'image/jpeg'); }, 'image/jpeg', 0.88);
}
function handleFileSelect(e){
  var file = e.target.files[0];
  if(!file) return;
  resizeAndProcess(file, 'card.jpg');
}
async function processImageBlob(blob, name, type){
  document.getElementById('ocr-loading').style.display='block';
  document.getElementById('card-form').style.display='none';
  document.getElementById('camera-area').style.display='none';
  hideAlert('ocr-ok-msg'); hideAlert('ocr-fail-msg');

  // Show preview
  var url = URL.createObjectURL(blob);
  document.getElementById('captured-preview').src = url;

  var fd = new FormData();
  fd.append('image', blob, name);
  var r2Key = '';
  var parsed = {};
  try{
    var res = await fetch('/api/colinkery/cards/ocr',{method:'POST',body:fd,credentials:'include'});
    var d = await res.json();
    if(d.ok){
      r2Key = d.r2_key || '';
      parsed = d.parsed || {};
      if(!d.ocr_failed && Object.keys(parsed).length > 0){
        document.getElementById('ocr-ok-msg').style.display='block';
      } else {
        document.getElementById('ocr-fail-msg').style.display='block';
        // Show debug info if available (helps diagnose API issues)
        if(d.debug && d.debug.length){
          var dbgEl = document.getElementById('ocr-debug-msg');
          if(dbgEl){ dbgEl.textContent = d.debug.join(' | '); dbgEl.style.display='block'; }
        }
      }
    } else {
      document.getElementById('ocr-fail-msg').style.display='block';
    }
  } catch(e){ document.getElementById('ocr-fail-msg').style.display='block'; }

  STATE.currentCard = {r2_key: r2Key, blob: blob};
  // Fill form — support both new bilingual fields and legacy single-lang fallbacks
  var s = function(id, val){ var el = document.getElementById(id); if(el) el.value = val || ''; };
  s('cf-name-zh', parsed.name_zh);
  s('cf-name-en', parsed.name_en);
  s('cf-company-zh', parsed.company_zh || parsed.company);
  s('cf-company-en', parsed.company_en || parsed.company);
  s('cf-dept-zh', parsed.department_zh);
  s('cf-dept-en', parsed.department_en);
  s('cf-title-zh', parsed.title_zh || parsed.title);
  s('cf-title-en', parsed.title_en || parsed.title);
  s('cf-phone', parsed.phone);
  s('cf-mobile', parsed.mobile);
  s('cf-fax', parsed.fax);
  s('cf-whatsapp', parsed.whatsapp);
  s('cf-email', parsed.email);
  s('cf-website', parsed.website);
  s('cf-wechat', parsed.wechat);
  s('cf-linkedin', parsed.linkedin);
  s('cf-telegram', parsed.telegram);
  s('cf-address-zh', parsed.address_zh || parsed.address);
  s('cf-address-en', parsed.address_en || parsed.address);
  s('cf-industry-zh', parsed.industry_zh || parsed.industry);
  s('cf-industry-en', parsed.industry_en || parsed.industry);
  s('cf-notes', '');

  document.getElementById('ocr-loading').style.display='none';
  document.getElementById('card-form').style.display='block';
}
function getCardFormData(){
  var g = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  var czh = g('cf-company-zh'), cen = g('cf-company-en');
  var tzh = g('cf-title-zh'), ten = g('cf-title-en');
  var azh = g('cf-address-zh'), aen = g('cf-address-en');
  var izh = g('cf-industry-zh'), ien = g('cf-industry-en');
  return {
    image_r2_key: STATE.currentCard ? STATE.currentCard.r2_key : '',
    name_zh: g('cf-name-zh'),
    name_en: g('cf-name-en'),
    company_zh: czh, company_en: cen,
    company: czh || cen,
    department_zh: g('cf-dept-zh'), department_en: g('cf-dept-en'),
    title_zh: tzh, title_en: ten,
    title: tzh || ten,
    phone: g('cf-phone'), mobile: g('cf-mobile'), fax: g('cf-fax'),
    whatsapp: g('cf-whatsapp'), email: g('cf-email'), website: g('cf-website'),
    wechat: g('cf-wechat'), linkedin: g('cf-linkedin'), telegram: g('cf-telegram'),
    address_zh: azh, address_en: aen,
    address: azh || aen,
    industry_zh: izh, industry_en: ien,
    industry: izh || ien,
    notes: g('cf-notes')
  };
}
async function saveCardOnly(){
  var data = getCardFormData();
  if(!data.company_zh && !data.company_en){ showAlert('card-save-err','請填寫公司名稱（中文或英文）'); return; }
  showLoading('儲存名片中…');
  try{
    var res = await fetch('/api/colinkery/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'include'});
    var d = await res.json();
    hideLoading();
    if(!d.ok){ showAlert('card-save-err',d.error||'儲存失敗'); return; }
    alert('✅ 名片已儲存！');
    showPage('page-dashboard');
  } catch(e){ hideLoading(); showAlert('card-save-err','網絡錯誤'); }
}
async function saveCardAndHandover(){
  var data = getCardFormData();
  if(!data.company_zh && !data.company_en){ showAlert('card-save-err','請填寫公司名稱（中文或英文）'); return; }
  showLoading('儲存並交棒中…');
  try{
    // 先存名片
    var r1 = await fetch('/api/colinkery/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'include'});
    var d1 = await r1.json();
    if(!d1.ok){ hideLoading(); showAlert('card-save-err',d1.error||'儲存失敗'); return; }
    // 交棒
    var r2 = await fetch('/api/colinkery/handover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({card_id:d1.card_id}),credentials:'include'});
    var d2 = await r2.json();
    hideLoading();
    if(!d2.ok){ showAlert('card-save-err',d2.error||'交棒失敗'); return; }
    STATE.lastHandoverUrl = d2.catalog_url;
    STATE.lastHandoverBuyer = d2.buyer_name ? d2.buyer_name + (d2.buyer_company ? '（'+d2.buyer_company+'）' : '') : d2.buyer_company;
    document.getElementById('handover-buyer').textContent = '買家：' + (STATE.lastHandoverBuyer||'—');
    document.getElementById('handover-url').textContent = d2.catalog_url;
    showPage('page-handover');
  } catch(e){ hideLoading(); showAlert('card-save-err','網絡錯誤'); }
}

// ── 名片庫 ────────────────────────────────────────────────────────────────────
async function loadCards(){
  var q = (document.getElementById('cards-search')||{}).value || '';
  showLoading('載入名片庫…');
  try{
    var url = '/api/colinkery/cards' + (q ? '?q='+encodeURIComponent(q) : '');
    var res = await fetch(url, { credentials: 'include' });
    var d = await res.json();
    hideLoading();
    STATE.allCards = d.cards || [];
    renderCards(STATE.allCards);
  } catch(e){ hideLoading(); }
}
function searchCards(){
  var q = document.getElementById('cards-search').value.toLowerCase();
  var filtered = STATE.allCards.filter(function(c){
    return (c.name_zh||'').toLowerCase().includes(q) || (c.name_en||'').toLowerCase().includes(q) ||
           (c.company_zh||'').toLowerCase().includes(q) || (c.company_en||'').toLowerCase().includes(q) ||
           (c.company||'').toLowerCase().includes(q) || (c.phone||'').includes(q) ||
           (c.mobile||'').includes(q) || (c.whatsapp||'').includes(q) ||
           (c.email||'').toLowerCase().includes(q);
  });
  renderCards(filtered);
}
function renderCards(cards){
  var list = document.getElementById('cards-list');
  if(!cards||!cards.length){ list.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--muted);">暫無名片，影名片開始！</div>'; return; }
  list.innerHTML = cards.map(function(c){
    var companyZh = c.company_zh || c.company || '';
    var companyEn = c.company_en || (c.company_zh ? '' : c.company) || '';
    var nameZh = c.name_zh || '';
    var nameEn = c.name_en || '';
    var titleLine = c.title_zh || c.title_en || c.title || '';
    // Contact for WA buttons
    var waNum = c.whatsapp || c.mobile || c.phone || '';
    var displayName = nameZh || nameEn || companyZh || companyEn || '—';
    return '<div class="card-chip" style="padding:14px 16px;margin-bottom:10px;border-radius:14px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);border:1px solid #f0f0f0;">' +
      // Top: company names
      '<div style="font-size:15px;font-weight:800;color:#1B5E20;margin-bottom:2px;">' +
        (companyZh ? esc(companyZh) : '') +
        (companyZh && companyEn ? '<span style="color:#ccc;margin:0 5px;">|</span>' : '') +
        (companyEn ? '<span style="font-size:14px;font-weight:700;color:#2E7D32;">'+esc(companyEn)+'</span>' : '') +
      '</div>' +
      // Name row
      '<div style="font-size:16px;font-weight:700;color:#111;margin:4px 0 2px;">' +
        (nameZh ? esc(nameZh) : '') +
        (nameZh && nameEn ? '<span style="color:#ccc;margin:0 6px;">·</span>' : '') +
        (nameEn ? '<span style="font-size:15px;">'+esc(nameEn)+'</span>' : '') +
        (!nameZh && !nameEn ? '<span style="color:var(--muted);">—</span>' : '') +
      '</div>' +
      // Title row
      (titleLine ? '<div style="font-size:13px;color:var(--muted);margin-bottom:8px;">'+esc(titleLine)+'</div>' : '<div style="margin-bottom:8px;"></div>') +
      // Action buttons row — use data-* to avoid inline quote escaping issues
      '<div style="display:flex;gap:8px;">' +
        (waNum ?
          '<button class="wa-link-btn" data-wa="'+esc(waNum)+'" data-name="'+esc(displayName)+'" style="flex:1;background:#25D366;color:#fff;border:none;border-radius:10px;padding:10px 6px;font-size:13px;font-weight:700;cursor:pointer;">💬+🔗 發目錄</button>' +
          '<button class="wa-only-btn" data-wa="'+esc(waNum)+'" style="flex:1;background:#128C7E;color:#fff;border:none;border-radius:10px;padding:10px 6px;font-size:13px;font-weight:700;cursor:pointer;">💬 WA 訊息</button>' +
          '<button class="card-detail-btn" data-cid="'+esc(c.card_id)+'" style="flex:0 0 44px;background:#f5f5f5;color:#444;border:none;border-radius:10px;padding:10px 6px;font-size:18px;cursor:pointer;">⋯</button>'
        :
          '<button class="card-detail-btn" data-cid="'+esc(c.card_id)+'" style="flex:1;background:#f5f5f5;color:#444;border:none;border-radius:10px;padding:10px 6px;font-size:14px;font-weight:700;cursor:pointer;">詳情 ⋯</button>'
        ) +
      '</div>' +
    '</div>';
  }).join('');
  // Event delegation — replace onclick handler each render
  var list2 = document.getElementById('cards-list');
  list2.onclick = function(ev){
    var t = ev.target;
    if(!t) return;
    if(t.classList.contains('wa-link-btn')){ ev.stopPropagation(); waSendWithLink(t.dataset.wa, t.dataset.name||''); }
    else if(t.classList.contains('wa-only-btn')){ ev.stopPropagation(); waSendOnly(t.dataset.wa); }
    else if(t.classList.contains('card-detail-btn')){ openCardDetail(t.dataset.cid); }
  };
}

// WA Button 1: Send catalog link + greeting message
function waSendWithLink(waNum, displayName){
  var memberNo = STATE.memberNo || '';
  var catalogUrl = 'https://coeldery85.com/b2b?ref=' + encodeURIComponent(memberNo);
  var msg = '你好' + (displayName ? ' ' + displayName : '') + '！\\n\\n我係老有聯盟 85 的連結者，呢個係 CoEldery 85 為你準備的企業採購目錄，裡面有竹漿環保紙巾等優質產品：\\n\\n' + catalogUrl + '\\n\\n如有興趣，歡迎點擊了解更多，或直接聯絡我！';
  var phone = waNum.replace(/[^0-9+]/g,'');
  if(!phone.startsWith('+')) phone = '+852' + phone;
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var url = isIos ? 'whatsapp://send?phone='+encodeURIComponent(phone)+'&text='+encodeURIComponent(msg) : 'https://wa.me/'+phone.replace('+','')+'?text='+encodeURIComponent(msg);
  window.open(url, '_blank');
}

// WA Button 2: Send WA message only (no link)
function waSendOnly(waNum){
  var memberNo = STATE.memberNo || '';
  var nameZh = STATE.nameZh || '';
  var msg = '你好！我係老有聯盟 85 的連結者' + (nameZh ? ' ' + nameZh : '') + '，想了解一下貴公司的採購需求，有唔有方便嘅時間傾下？\uD83D\uDE0A';
  var phone = waNum.replace(/[^0-9+]/g,'');
  if(!phone.startsWith('+')) phone = '+852' + phone;
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var url = isIos ? 'whatsapp://send?phone='+encodeURIComponent(phone)+'&text='+encodeURIComponent(msg) : 'https://wa.me/'+phone.replace('+','')+'?text='+encodeURIComponent(msg);
  window.open(url, '_blank');
}

function openCardDetail(cardId){
  var card = STATE.allCards.find(function(c){ return c.card_id===cardId; });
  if(!card) return;
  var rows = [];
  var addRow = function(label, val){ if(val && val.trim()) rows.push('<div style="margin-bottom:10px;"><div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">'+label+'</div><div style="font-size:15px;font-weight:600;color:#111;">'+esc(val)+'</div></div>'); };
  var addPair = function(labelZh, valZh, labelEn, valEn){
    if(valZh||valEn){
      rows.push('<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
        (valZh ? '<div><div style="font-size:12px;font-weight:700;color:var(--muted);">'+labelZh+'</div><div style="font-size:15px;font-weight:600;">'+esc(valZh)+'</div></div>' : '<div></div>') +
        (valEn ? '<div><div style="font-size:12px;font-weight:700;color:var(--muted);">'+labelEn+'</div><div style="font-size:15px;font-weight:600;">'+esc(valEn)+'</div></div>' : '<div></div>') +
        '</div>');
    }
  };
  var sep = function(label){ rows.push('<div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;padding:8px 0 4px;border-top:1px solid #eee;margin-top:4px;">'+label+'</div>'); };

  sep('👤 姓名');
  addPair('中文姓名', card.name_zh, 'EN Name', card.name_en);
  sep('🏢 公司');
  addPair('公司（中）', card.company_zh||card.company, 'Company (EN)', card.company_en||(card.company_zh?'':card.company) );
  sep('🗂 部門 / 職銜');
  addPair('部門（中）', card.department_zh, 'Department (EN)', card.department_en);
  addPair('職銜（中）', card.title_zh||card.title, 'Title (EN)', card.title_en||(card.title_zh?'':card.title));
  sep('📞 聯絡方式');
  addRow('公司電話', card.phone);
  addRow('手機', card.mobile);
  addRow('傳真 Fax', card.fax);
  addRow('WhatsApp', card.whatsapp);
  addRow('電郵 Email', card.email);
  addRow('網站 Website', card.website);
  sep('📱 社交媒體');
  addRow('WeChat 微信', card.wechat);
  addRow('LinkedIn', card.linkedin);
  addRow('Telegram', card.telegram);
  sep('📍 地址');
  addRow('地址（中文）', card.address_zh||(!card.address_en ? card.address : ''));
  addRow('Address (EN)', card.address_en||(!card.address_zh ? card.address : ''));
  sep('🏭 行業');
  addPair('行業（中）', card.industry_zh||card.industry, 'Industry (EN)', card.industry_en||(card.industry_zh?'':card.industry));
  if(card.notes){ sep('📝 備註'); addRow('Notes', card.notes); }

  var displayName = card.name_zh || card.name_en || '';
  document.getElementById('detail-title').textContent = displayName || (card.company_zh||card.company||'名片詳情');
  document.getElementById('detail-body').innerHTML = rows.join('');

  // WA buttons in modal
  var waNum = card.whatsapp || card.mobile || card.phone || '';
  var waBtns = document.getElementById('detail-wa-btns');
  if(waBtns){
    if(waNum){
      waBtns.style.display='flex';
      var btn1 = document.getElementById('detail-wa-link-btn');
      var btn2 = document.getElementById('detail-wa-only-btn');
      if(btn1) btn1.onclick = function(){ waSendWithLink(waNum, displayName); };
      if(btn2) btn2.onclick = function(){ waSendOnly(waNum); };
    } else {
      waBtns.style.display='none';
    }
  }
  document.getElementById('detail-handover-btn').dataset.cardId = cardId;
  document.getElementById('card-detail-modal').style.display = 'block';
}
function closeCardDetail(){ document.getElementById('card-detail-modal').style.display='none'; }
async function handoverFromDetail(){
  var cardId = document.getElementById('detail-handover-btn').dataset.cardId;
  closeCardDetail();
  showLoading('交棒中…');
  try{
    var res = await fetch('/api/colinkery/handover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({card_id:cardId}),credentials:'include'});
    var d = await res.json();
    hideLoading();
    if(!d.ok){ alert(d.error||'交棒失敗'); return; }
    STATE.lastHandoverUrl = d.catalog_url;
    STATE.lastHandoverBuyer = d.buyer_name ? d.buyer_name + (d.buyer_company?' ('+d.buyer_company+')':'') : d.buyer_company;
    document.getElementById('handover-buyer').textContent = '買家：' + (STATE.lastHandoverBuyer||'—');
    document.getElementById('handover-url').textContent = d.catalog_url;
    showPage('page-handover');
  } catch(e){ hideLoading(); alert('網絡錯誤'); }
}

// ── 交棒完成 ──────────────────────────────────────────────────────────────────
function copyHandoverUrl(){ if(STATE.lastHandoverUrl){ navigator.clipboard.writeText(STATE.lastHandoverUrl).then(function(){ alert('✅ 連結已複製'); }).catch(function(){ prompt('複製連結：',STATE.lastHandoverUrl); }); } }
function waHandoverUrl(){
  if(!STATE.lastHandoverUrl) return;
  var msg = '你好！這是 CoEldery 85 為你準備的企業採購目錄，請點擊查閱及選擇有興趣的產品：\\n'+STATE.lastHandoverUrl;
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var url = isIos ? 'whatsapp://send?text='+encodeURIComponent(msg) : 'https://wa.me/?text='+encodeURIComponent(msg);
  window.open(url,'_blank');
}
function emailHandoverUrl(){
  if(!STATE.lastHandoverUrl) return;
  var sub = encodeURIComponent('CoEldery 85 企業採購目錄');
  var body = encodeURIComponent('你好，\\n\\n特此發上 CoEldery 85 為你準備的企業採購目錄連結：\\n'+STATE.lastHandoverUrl+'\\n\\n如有查詢，歡迎聯絡。');
  window.open('mailto:?subject='+sub+'&body='+body);
}

// ── 分享頁 ────────────────────────────────────────────────────────────────────
function initSharePage(){
  var link = 'https://coeldery85.com/b2b?ref='+encodeURIComponent(STATE.memberNo||'');
  document.getElementById('share-link-box').textContent = link;
  var text = '你好！我係老有聯盟 85 的連結者，我哋係一個由退休長者組成的企業採購平台。\\n\\n如果你有企業採購需要，歡迎了解更多：\\n'+link;
  document.getElementById('share-text-preview').textContent = text;
}
function copyShareLink(){ var t=document.getElementById('share-link-box').textContent; navigator.clipboard.writeText(t).then(function(){ alert('✅ 連結已複製'); }).catch(function(){ prompt('複製連結：',t); }); }
function waShareLink(){ var t='你好！我係老有聯盟 85 的連結者，我哋係一個由退休長者組成的企業採購平台。如果你有企業採購需要，歡迎了解更多：\\n'+(document.getElementById('share-link-box').textContent||''); var isIos=/iphone|ipad|ipod/i.test(navigator.userAgent); window.open(isIos?'whatsapp://send?text='+encodeURIComponent(t):'https://wa.me/?text='+encodeURIComponent(t),'_blank'); }
function emailShareLink(){ var sub=encodeURIComponent('老有聯盟 85 企業採購平台'); var body=encodeURIComponent(document.getElementById('share-text-preview').textContent||''); window.open('mailto:?subject='+sub+'&body='+body); }
function copyShareText(){ var t=document.getElementById('share-text-preview').textContent; navigator.clipboard.writeText(t).then(function(){ alert('✅ 文案已複製'); }).catch(function(){ prompt('複製文案：',t); }); }

// ── 成績頁 ────────────────────────────────────────────────────────────────────
async function loadResults(){
  if(!STATE.memberNo) return;
  var cont = document.getElementById('results-content');
  cont.innerHTML = '<div style="text-align:center;padding:40px 0;"><div class="spinner"></div></div>';
  try{
    var res = await fetch('/api/colinkery/stats', { credentials: 'include' });
    var d = await res.json();
    if(!d.ok){ cont.innerHTML='<div class="alert alert-red">載入失敗</div>'; return; }
    var paid = Math.round((d.paid_cents||0)/100);
    var accrued = Math.round((d.accrued_cents||0)/100);
    var html = '<div class="stat-row" style="padding:0 0 16px;">' +
      '<div class="stat-card"><div class="stat-num">'+d.total_leads+'</div><div class="stat-lbl">名片引薦</div></div>' +
      '<div class="stat-card"><div class="stat-num">'+d.won_count+'</div><div class="stat-lbl">促成交易</div></div>' +
      '<div class="stat-card"><div class="stat-num">'+paid.toLocaleString()+'</div><div class="stat-lbl">已收固定佣金(元)</div></div>' +
    '</div>';
    if(accrued > 0){
      html += '<div class="alert alert-yellow" style="margin:0 0 16px;">💰 待發固定佣金：HK$'+accrued.toLocaleString()+'（成交已確認，待付款）</div>';
    }
    html += '<h3 style="font-size:16px;font-weight:700;margin-bottom:10px;">最近成交記錄</h3>';
    if(!d.recent_won||!d.recent_won.length){
      html += '<div style="text-align:center;color:var(--muted);padding:20px 0;">尚無成交記錄</div>';
    } else {
      html += d.recent_won.map(function(w){
        var comm = Math.round((w.commission_amount_cents||0)/100);
        var stLabel = w.commission_status==='paid'?'✅ 已付':'⏳ 待付';
        return '<div class="comm-item"><div style="font-weight:700;">'+esc(w.buyer_name||w.buyer_company||'—')+'</div>' +
               '<div style="font-size:14px;color:var(--muted);">'+esc(w.buyer_company||'')+'</div>' +
               '<div style="font-size:15px;color:var(--green);font-weight:700;margin-top:4px;">固定佣金：HK$'+comm.toLocaleString()+'　'+stLabel+'</div>' +
               '</div>';
      }).join('');
    }
    cont.innerHTML = html;
  } catch(e){ cont.innerHTML='<div class="alert alert-red">網絡錯誤</div>'; }
}
</script>
</body>
</html>`
}

export function partnerApplyHtml(prefillMember: string, prefillPhone = '', prefillRole = ''): string {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${prefillRole === 'COLINKERY' ? '申請成為 CoLinkery 連結者' : prefillRole === 'COLEADERY' ? '申請成為 CoLeadery 領航者' : '申請成為合作夥伴'}</title>
<!-- REDESIGNED v3: Step1=基本資料+密碼, Step2=KYC, Step3=角色, Step4=類型, Step5=動態欄位, Step6=聲明 -->
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#F0EBD8;min-height:100vh;font-family:"Noto Sans TC","PingFang TC",sans-serif;font-size:18px;line-height:1.6;color:#111;}
.topbar{background:linear-gradient(135deg,#8B0000,#C62828);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:12px;}
.topbar .back{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:4px 8px;border-radius:6px;}
.topbar .title{font-size:20px;font-weight:900;letter-spacing:1px;}
.wrap{max-width:480px;margin:0 auto;padding:20px 16px 80px;}
.section{background:#fff;border-radius:14px;padding:22px 18px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.07);}
.section-title{font-size:18px;font-weight:900;color:#8B0000;margin-bottom:16px;border-left:4px solid #C62828;padding-left:10px;}
.field-group{margin-bottom:16px;}
label{display:block;font-size:16px;font-weight:700;color:#333;margin-bottom:6px;}
.req{color:#C62828;margin-left:3px;}
input,select,textarea{width:100%;padding:12px 14px;font-size:17px;border:2px solid #ddd;border-radius:8px;
  font-family:inherit;color:#111;background:#fff;outline:none;-webkit-appearance:none;}
input:focus,select:focus,textarea:focus{border-color:#C62828;box-shadow:0 0 0 3px rgba(198,40,40,.12);}
.hint{font-size:14px;color:#888;margin-top:5px;line-height:1.4;}
.role-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;}
.role-card{border:2.5px solid #ddd;border-radius:12px;padding:14px 12px;cursor:pointer;text-align:center;transition:all 0.15s;background:#fff;position:relative;}
.role-card.selected{border-color:#8B0000;background:#FFF5F5;}
.role-card.selected::after{content:'\u2714';position:absolute;top:6px;right:8px;font-size:14px;color:#8B0000;font-weight:900;}
.role-card .role-icon{font-size:28px;margin-bottom:6px;}
.role-card .role-name{font-size:16px;font-weight:900;color:#8B0000;}
.role-card .role-desc{font-size:13px;color:#666;margin-top:4px;line-height:1.4;}
.type-group{display:flex;flex-direction:column;gap:8px;}
.type-radio{display:flex;align-items:center;gap:10px;padding:12px 14px;border:2px solid #ddd;border-radius:8px;cursor:pointer;position:relative;}
.type-radio.selected{border-color:#8B0000;background:#FFF5F5;}
.type-radio.selected::after{content:'\u2714';position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:16px;color:#8B0000;font-weight:900;}
/* Custom radio button (cross-browser, iOS safe) */
.type-radio input[type=radio]{-webkit-appearance:none;appearance:none;width:20px;height:20px;border:2px solid #9CA3AF;border-radius:50%;flex-shrink:0;background:#fff;position:relative;cursor:pointer;transition:all 0.15s;}
.type-radio input[type=radio]:checked{border-color:#8B0000;background:#8B0000;}
.type-radio input[type=radio]:checked::after{content:'';position:absolute;width:8px;height:8px;background:#fff;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);}
.upload-area{border:2px dashed #C62828;border-radius:10px;padding:18px;text-align:center;cursor:pointer;background:#FFF9F9;}
.upload-area:hover{background:#FFF0F0;}
.upload-status{font-size:15px;color:#666;margin-top:8px;min-height:22px;}
.upload-status.ok{color:#2E7D32;font-weight:700;}
.step-indicator{display:flex;gap:6px;justify-content:center;margin-bottom:20px;}
.step-dot{width:10px;height:10px;border-radius:50%;background:#ddd;transition:background 0.15s;}
.step-dot.active{background:#8B0000;}
.step-dot.done{background:#C62828;}
.nav-btns{display:flex;gap:10px;position:fixed;bottom:0;left:0;right:0;padding:12px 16px;background:#fff;border-top:1.5px solid #eee;z-index:99;max-width:480px;margin:0 auto;}
.btn-back{flex:1;padding:14px;background:#f5f5f5;color:#555;border:none;border-radius:10px;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit;}
.btn-next{flex:2;padding:14px;background:#8B0000;color:#fff;border:none;border-radius:10px;font-size:17px;font-weight:900;cursor:pointer;font-family:inherit;letter-spacing:1px;}
.btn-next:disabled{background:#ccc;cursor:not-allowed;}
.err-box{background:#FFEBEE;border:2px solid #C62828;border-radius:8px;padding:12px 14px;font-size:16px;color:#C62828;font-weight:700;display:none;margin-bottom:12px;}
.err-box.show{display:block;}
.success-box{text-align:center;padding:40px 20px;}
.success-box .s-icon{font-size:64px;margin-bottom:16px;}
.success-box .s-title{font-size:24px;font-weight:900;color:#2E7D32;margin-bottom:10px;}
.success-box .s-text{font-size:17px;color:#555;line-height:1.7;}
.declaration-box{background:#FFF9E6;border:1.5px solid #FF8F00;border-radius:10px;padding:14px;font-size:15px;color:#5D4037;line-height:1.7;}
/* Custom checkbox (cross-browser, iOS safe) */
.check-row{display:flex;align-items:flex-start;gap:10px;margin-top:12px;cursor:pointer;}
.check-row input[type=checkbox]{-webkit-appearance:none;appearance:none;width:22px;height:22px;min-width:22px;border:2.5px solid #9CA3AF;border-radius:5px;background:#fff;cursor:pointer;position:relative;flex-shrink:0;margin-top:2px;transition:all 0.15s;}
.check-row input[type=checkbox]:checked{border-color:#8B0000;background:#8B0000;}
.check-row input[type=checkbox]:checked::after{content:'';position:absolute;left:5px;top:1px;width:7px;height:12px;border:2.5px solid #fff;border-top:none;border-left:none;transform:rotate(45deg);}
</style>
</head>
<body>
<div class="topbar">
  <button class="back" onclick="goBack()">&#8592;</button>
  <span class="title">${prefillRole === 'COLINKERY' ? '🤝 申請 CoLinkery 連結者' : prefillRole === 'COLEADERY' ? '🌟 申請 CoLeadery 領航者' : '🌟 申請合作夥伴'}</span>
</div>
<div class="wrap">

  <!-- Step indicator -->
  <div class="step-indicator" id="stepDots"></div>

  <!-- Step 1: 基本資料 + 密碼 -->
  <div id="step1" class="section">
    <div class="section-title">&#x1F464; 第一步：基本資料及設定密碼</div>
    <!-- 會員驗證狀態卡片 -->
    <div id="s1MemberCard" style="display:none;background:#DCFCE7;border:1.5px solid #4CAF50;border-radius:10px;padding:12px 14px;margin-bottom:16px;">
      <div style="font-size:15px;font-weight:800;color:#1B4332;margin-bottom:2px;">✅ 已確認老有卡會員</div>
      <div id="s1MemberInfo" style="font-size:14px;color:#1B4332;"></div>
    </div>
    <!-- 電話（預填後可改，改了要重新驗證） -->
    <div class="field-group">
      <label>老有卡登記電話 <span class="req">*</span></label>
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <input type="tel" id="applyPhone" inputmode="numeric" placeholder="輸入已登記的電話號碼" maxlength="20" style="flex:1;" oninput="onPhoneChange()">
        <div id="s1PhoneStatus" style="font-size:20px;padding-top:10px;min-width:28px;"></div>
      </div>
      <div class="hint">系統自動搜尋你的會員資料並預填以下資料</div>
    </div>
    <!-- 中文姓名 -->
    <div class="field-group">
      <label>中文姓名 <span class="req">*</span></label>
      <input type="text" id="applyNameZh" placeholder="請使用身份證上的漢字姓名">
      <div class="hint">請使用身份證上的漢字姓名</div>
    </div>
    <!-- 英文姓名 -->
    <div class="field-group">
      <label>英文姓名</label>
      <input type="text" id="applyNameEn" placeholder="English Name (as on HKID)">
    </div>
    <!-- 聯絡電話（預填，通常等同登記電話） -->
    <div class="field-group">
      <label>聯絡電話 <span class="req">*</span></label>
      <input type="tel" id="applyContactPhone" inputmode="numeric" placeholder="用於聯絡的電話號碼">
    </div>
    <!-- 地區 -->
    <div class="field-group">
      <label>地區</label>
      <select id="applyDistrict">
        <option value="">請揀選地區（可選）</option>
        <optgroup label="港島">
          <option>中西區</option><option>灣仔區</option><option>南區</option><option>東區</option>
        </optgroup>
        <optgroup label="九龍">
          <option>油尖旺區</option><option>深水埗區</option>
          <option>九龍城區</option><option>黃大仙區</option><option>觀塘區</option>
        </optgroup>
        <optgroup label="新界">
          <option>葵青區</option><option>荃灣區</option><option>屯門區</option>
          <option>元朗區</option><option>北區</option><option>大埔區</option>
          <option>西貢區</option><option>沙田區</option><option>離島區</option>
        </optgroup>
      </select>
    </div>
    <!-- 密碼設定 -->
    <div style="background:#EEF2FF;border:1.5px solid #6366F1;border-radius:10px;padding:14px 16px;margin-top:6px;">
      <div style="font-size:15px;font-weight:800;color:#3730A3;margin-bottom:8px;">&#x1F512; 設定工具登入密碼</div>
      <div style="font-size:13px;color:#4338CA;margin-bottom:12px;line-height:1.5;">批准後用此密碼登入 CoLeadery／CoLinkery 工具。請設定一個只有你知道的密碼。</div>
      <div class="field-group" style="margin-bottom:10px;">
        <label style="font-size:15px;">登入密碼 <span class="req">*</span></label>
        <div style="position:relative;">
          <input type="password" id="applyPassword" placeholder="至少 8 位，英文+數字更安全" autocomplete="new-password" style="padding-right:44px;" oninput="updateStep1Btn()">
          <button type="button" onclick="togglePwd('applyPassword','eyePwd')" id="eyePwd" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:20px;cursor:pointer;color:#888;">&#x1F441;</button>
        </div>
        <div class="hint">最少 8 個字符，建議包含英文字母及數字</div>
      </div>
      <div class="field-group" style="margin-bottom:0;">
        <label style="font-size:15px;">確認密碼 <span class="req">*</span></label>
        <div style="position:relative;">
          <input type="password" id="applyPasswordConfirm" placeholder="再輸入一次密碼" autocomplete="new-password" style="padding-right:44px;" oninput="updateStep1Btn()">
          <button type="button" onclick="togglePwd('applyPasswordConfirm','eyePwd2')" id="eyePwd2" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:20px;cursor:pointer;color:#888;">&#x1F441;</button>
        </div>
        <div id="pwdMatchHint" style="font-size:13px;margin-top:5px;min-height:18px;"></div>
      </div>
    </div>
    <div class="err-box" id="s1Err"></div>
  </div>

  <!-- Step 2: 個人正式資料（KYC） -->
  <div id="step2" class="section" style="display:none;">
    <div class="section-title">&#x1F4CB; 第二步：個人正式資料</div>
    <div id="s2KycDone" style="display:none;background:#DCFCE7;border:1.5px solid #4CAF50;border-radius:8px;padding:14px;margin-bottom:14px;">
      <div style="font-size:15px;font-weight:700;color:#1B4332;margin-bottom:6px;">✅ 已登記個人正式資料</div>
      <div style="font-size:14px;color:#1B4332;" id="s2KycSummary"></div>
      <div style="font-size:13px;color:#555;margin-top:6px;">資料可在下方更新（如需更改銀行戶口）</div>
    </div>
    <div id="s2KycNew" style="display:none;background:#FFF9E6;border:1.5px solid #FFB300;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:14px;color:#795548;">
      ⚠️ 首次申請需要填寫個人正式資料，資料將用於身份核實及分成結算。
    </div>
    <!-- 身份核實提示 -->
    <div style="background:#FFF3E0;border:1.5px solid #FF9800;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:14px;color:#E65100;">
      🪪 <strong>身份核實說明：</strong>申請人須親身出示香港身份證（HKID）予系統管理員核實年齡及身份。分成款項將在核實後方可發放。
    </div>
    <!-- HKID（1 個英文字母 + 3 位數字） -->
    <div class="field-group">
      <label>身份證號碼首 4 位 <span class="req">*</span></label>
      <input type="text" id="kycIdPrefix" placeholder="例: A123" maxlength="4" autocapitalize="characters" oninput="this.value=this.value.toUpperCase()">
      <div class="hint" id="kycIdHint">填寫 HKID 首 1 個英文字母及後 3 位數字，例：A123（即 A123456(7) 的首4位）</div>
    </div>
    <!-- 電郵 -->
    <div class="field-group">
      <label>電郵地址 <span class="req">*</span></label>
      <input type="text" id="kycEmail" placeholder="your@email.com" inputmode="email" autocomplete="email" autocorrect="off" autocapitalize="none">
      <div class="hint">用於接收申請通知及分成結算通知</div>
    </div>
    <!-- 推薦人 -->
    <div class="field-group">
      <label>推薦人電話號碼 <span class="req">*</span></label>
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <input type="tel" id="kycRefPhone" placeholder="推薦人電話" maxlength="8" inputmode="numeric" style="flex:1;" oninput="lookupReferral()">
        <div id="kycRefStatus" style="min-width:28px;padding-top:11px;font-size:18px;"></div>
      </div>
      <div class="hint">推薦人必須已是 CoEldery 85 會員</div>
      <div id="kycRefFound" style="display:none;background:#DCFCE7;border-radius:6px;padding:8px 12px;font-size:14px;color:#1B4332;margin-top:6px;"></div>
      <div id="kycRefName" style="display:none;">
        <input type="text" id="kycRefNameInput" placeholder="推薦人姓名（自動填入）" readonly style="background:#F3F4F6;margin-top:6px;">
      </div>
    </div>
    <!-- 銀行資料 -->
    <div class="field-group">
      <label>銀行名稱 <span class="req">*</span></label>
      <select id="kycBankName" onchange="autoFillSwift()">
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
      <label>銀行戶口號碼 <span class="req">*</span></label>
      <input type="text" id="kycBankAcc" placeholder="銀行戶口號碼" inputmode="numeric">
      <div class="hint">分成款項將存入此戶口</div>
    </div>
    <div class="field-group">
      <label>SWIFT / BIC 代碼</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="kycSwift" placeholder="例: HSBCHKHH" maxlength="11" autocapitalize="characters" style="flex:1;" oninput="this.value=this.value.toUpperCase()">
        <div id="kycSwiftNote" style="font-size:13px;color:#1B5E20;min-width:60px;"></div>
      </div>
      <div class="hint">選擇銀行後自動填入；如銀行不在列表可手動輸入。用於跨境匯款驗證。</div>
    </div>
    <div class="err-box" id="s2Err"></div>
  </div>

  <!-- Step 3: 選擇角色 -->
  <div id="step3" class="section" style="display:none;">
    <div class="section-title">&#x1F3AF; \u7b2c\u4e09\u6b65\uff1a\u64c7\u9078\u7533\u8acb\u89d2\u8272</div>
    <div class="role-grid">
      <div class="role-card" id="roleCardCL" onclick="selectRole('COLEADERY')">
        <div class="role-icon">&#x1F31F;</div>
        <div class="role-name">CoLeadery</div>
        <div class="role-desc">\u9818\u822a\u8005<br>\u5c0e\u5165\u9879\u76ee\u3001\u5f15\u5c0e\u9577\u8005\u53c3\u8207</div>
      </div>
      <div class="role-card" id="roleCardCK" onclick="selectRole('COLINKERY')">
        <div class="role-icon">&#x1F91D;</div>
        <div class="role-name">CoLinkery</div>
        <div class="role-desc">\u9023\u7d50\u8005<br>\u9023\u63a5\u5546\u696d\u5ba2\u6236\u3001\u6cfd\u5c55\u5408\u4f5c</div>
      </div>
    </div>
    <div id="roleDesc" style="margin-top:12px;padding:12px;background:#FFF5F5;border-radius:8px;font-size:15px;color:#555;display:none;line-height:1.6;"></div>
    <div class="err-box" id="s3Err"></div>
  </div>

  <!-- Step 4: 申請人類型 -->
  <div id="step4" class="section" style="display:none;">
    <div id="s4RoleBanner" style="display:none;background:#EEF2FF;border:1.5px solid #6366F1;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:14px;color:#3730A3;font-weight:600;"></div>
    <div class="section-title">&#x1F4CB; \u7b2c\u56db\u6b65\uff1a\u7533\u8acb\u4eba\u985e\u578b</div>
    <div class="type-group">
      <label class="type-radio" id="typeInd" onclick="selectType('INDIVIDUAL')">
        <input type="radio" name="applyType" value="INDIVIDUAL">
        <div>
          <div style="font-size:17px;font-weight:700;">\uD83D\uDC64 \u500b\u4eba</div>
          <div style="font-size:14px;color:#666;margin-top:3px;">\u4e2a\u4eba\u540d\u7fa9\u7533\u8acb\uff0c\u63d0\u4f9b\u8eab\u4efd\u8b49\u6587\u4ef6</div>
        </div>
      </label>
      <label class="type-radio" id="typeGrp" onclick="selectType('GROUP')">
        <input type="radio" name="applyType" value="GROUP">
        <div>
          <div style="font-size:17px;font-weight:700;">\uD83D\uDC65 \u5c0f\u7d44</div>
          <div style="font-size:14px;color:#666;margin-top:3px;">\u5c0e\u9818\u5c0f\u7d44\u9818\u822a\uff0c\u586b\u5beb\u5c0f\u7d44\u8cc7\u6599</div>
        </div>
      </label>
      <label class="type-radio" id="typeCo" onclick="selectType('COMPANY')">
        <input type="radio" name="applyType" value="COMPANY">
        <div>
          <div style="font-size:17px;font-weight:700;">\uD83C\uDFE2 \u516c\u53f8</div>
          <div style="font-size:14px;color:#666;margin-top:3px;">\u4ee5\u516c\u53f8\u540d\u7fa9\u7533\u8acb\uff0c\u63d0\u4f9b BR \u767b\u8a18\u8b49\u660e</div>
        </div>
      </label>
      <label class="type-radio" id="typeAssoc" onclick="selectType('ASSOCIATION')">
        <input type="radio" name="applyType" value="ASSOCIATION">
        <div>
          <div style="font-size:17px;font-weight:700;">&#x1F3DB;&#xFE0F; \u5354\u6703/\u5546\u6703</div>
          <div style="font-size:14px;color:#666;margin-top:3px;">\u4ee5\u5354\u6703\u6216\u5546\u6703\u540d\u7fa9\u7533\u8acb\uff0c\u63d0\u4f9b\u793e\u5718\u767b\u8a18\u8b49</div>
        </div>
      </label>
    </div>
    <div class="err-box" id="s4Err"></div>
  </div>

  <!-- Step 5: 按類型動態欄位（INDIVIDUAL=無, GROUP=小組, COMPANY=公司, ASSOCIATION=協會） -->
  <div id="step5" class="section" style="display:none;">
    <div class="section-title">&#x270D;&#xFE0F; 第五步：填寫申請資料</div>

    <!-- 個人：只顯示 KYC 已提交提示 + CoLinkery 行業背景 -->
    <div id="s5IndividualNote" style="display:none;">
      <div style="background:#DCFCE7;border:1.5px solid #4CAF50;border-radius:8px;padding:12px 14px;font-size:15px;color:#1B4332;margin-bottom:14px;">
        ✅ 個人申請資料已完整！<br>
        <span style="font-size:13px;font-weight:400;">你的基本資料及 KYC 資料已在前兩步填妥。</span>
      </div>
    </div>

    <!-- 小組欄位組 -->
    <div id="s5GroupFields" style="display:none;">
      <div class="field-group">
        <label>小組人數 <span class="req">*</span></label>
        <input type="number" id="applyTeamSize" min="2" max="20" placeholder="預期參與人數（2-20）" oninput="buildGroupMemberRows()">
      </div>
      <div id="fieldGroupMembers">
        <div style="background:#FFF8E1;border:1px solid #FFD54F;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:13px;color:#795548;">
          💡 請填寫每位成員電話號碼，系統會自動驗證是否為會員及符合55歲資格。分成百分比合計必須等於100%。
        </div>
        <div id="groupMemberRows"></div>
        <div id="groupPercentSum" style="text-align:right;font-size:14px;font-weight:700;margin-top:6px;color:#555;"></div>
      </div>
      <div class="field-group">
        <label>小組簡介</label>
        <textarea id="applyTeamNotes" rows="3" placeholder="請簡述小組的背景、意向及主要成員構成"></textarea>
      </div>
    </div>

    <!-- 公司欄位組 -->
    <div id="s5CompanyFields" style="display:none;">
      <div class="field-group">
        <label>公司名稱 <span class="req">*</span></label>
        <input type="text" id="applyCompanyName" placeholder="注冊公司名稱（中英文）">
      </div>
      <div class="field-group">
        <label>BR 商業登記號碼</label>
        <input type="text" id="applyCompanyBR" placeholder="商業登記証 BR 號碼">
      </div>
      <div class="field-group">
        <label>公司文件上傳（可選）</label>
        <div class="upload-area" onclick="document.getElementById('fileInput').click()">
          <div style="font-size:28px;margin-bottom:6px;">📎</div>
          <div style="font-size:15px;color:#8B0000;font-weight:700;">點擊上傳 BR 或公司文件</div>
          <div style="font-size:13px;color:#888;margin-top:4px;">支援 PDF、JPG、PNG，最大 5MB</div>
        </div>
        <input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png" style="display:none;" onchange="handleFileSelect(this)">
        <div class="upload-status" id="uploadStatus"></div>
      </div>
    </div>

    <!-- 協會/商會欄位組 -->
    <div id="s5AssocFields" style="display:none;">
      <div class="field-group">
        <label>協會/商會名稱 <span class="req">*</span></label>
        <input type="text" id="applyAssocName" placeholder="登記協會或商會名稱（中英文）">
      </div>
      <div class="field-group">
        <label>社團登記證號碼</label>
        <input type="text" id="applyAssocRegNo" placeholder="社團登記證號碼（如有）">
      </div>
      <div class="field-group">
        <label>協會文件上傳（可選）</label>
        <div class="upload-area" onclick="document.getElementById('fileInputAssoc').click()">
          <div style="font-size:28px;margin-bottom:6px;">📎</div>
          <div style="font-size:15px;color:#8B0000;font-weight:700;">點擊上傳社團登記證或相關文件</div>
          <div style="font-size:13px;color:#888;margin-top:4px;">支援 PDF、JPG、PNG，最大 5MB</div>
        </div>
        <input type="file" id="fileInputAssoc" accept=".pdf,.jpg,.jpeg,.png" style="display:none;" onchange="handleFileSelect(this)">
        <div class="upload-status" id="uploadStatusAssoc"></div>
      </div>
    </div>

    <!-- CoLinkery 行業背景（任何類型 + COLINKERY 角色均顯示） -->
    <div id="s5IndustryField" style="display:none;">
      <div class="field-group">
        <label>行業背景 / 市場資源</label>
        <textarea id="applyIndustry" rows="3" placeholder="請簡述你的行業背景及可帶來的合作資源或客户網絡"></textarea>
      </div>
    </div>

    <div class="err-box" id="s5Err"></div>
  </div>

  <!-- Step 6: 聲明確認（密碼已在 Step 1 設定） -->
  <div id="step6" class="section" style="display:none;">
    <div class="section-title">&#x1F4DC; 第六步：確認申請聲明</div>

    <!-- 申請摘要 -->
    <div id="s6Summary" style="background:#F0F4FF;border:1.5px solid #6366F1;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
      <div style="font-size:14px;font-weight:800;color:#3730A3;margin-bottom:8px;">📋 申請摘要</div>
      <div id="s6SummaryContent" style="font-size:14px;color:#374151;line-height:1.9;"></div>
    </div>

    <!-- 聲明 -->
    <div class="declaration-box">
      <strong>申請聲明</strong><br><br>
      本人理解並同意以下條款：<br>
      1. 申請成為 CoEldery 85 認證角色持有人屬自願參與，非就業關係。<br>
      2. 終止前將遵守 CoEldery 85 章程標準，隨時更新至最新版本。<br>
      3. 授權持渴望結構查驗本人資料供審核之用。<br>
      4. 絕不以窗口名義簽約、承諾財務回報或代收款項。<br>
      5. 項目分成為非保證收益，實際以正式結算為準。<br>
      6. 已於第一步設定的登入密碼將於批准後啟用，請妥善保管。
    </div>
    <label class="check-row" id="declarationCheck">
      <input type="checkbox" id="agreeCheck" onchange="updateDeclareBtn()">
      <span style="font-size:16px;line-height:1.5;">本人已閱讀並同意上述聲明指引</span>
    </label>
    <div class="err-box" id="s6Err"></div>
  </div>

  <!-- Success -->
  <div id="stepSuccess" class="section" style="display:none;">
    <div class="success-box">
      <div class="s-icon">&#x1F4EC;</div>
      <div class="s-title" id="successTitle">\u7533\u8acb\u5df2\u63d0\u4ea4\uff01</div>
      <!-- 審核狀態卡片 -->
      <div id="successStatusCard" style="background:#FFF8E1;border:1.5px solid #FFB300;border-radius:12px;padding:16px 18px;margin:16px 0;text-align:left;">
        <div style="font-size:15px;font-weight:800;color:#E65100;margin-bottom:10px;">&#x23F3; 等待審核中</div>
        <div id="successDetail" style="font-size:14px;color:#555;line-height:1.8;"></div>
      </div>
      <div class="s-text" style="font-size:14px;color:#666;line-height:1.7;">審核期間如有疑問，請透過 WhatsApp 聯絡我們。<br>批准後你的工具頁面會立即開通，屆時可用你設定的密碼登入。</div>
      <div id="teamInviteSection"></div>
      <!-- 再次以不同類型申請 -->
      <div id="btnApplyAnother" style="display:none;margin-top:16px;padding:14px;background:#F0F4FF;border:1.5px solid #6366F1;border-radius:10px;text-align:left;">
        <div style="font-size:14px;font-weight:800;color:#3730A3;margin-bottom:6px;">🔁 想以不同方式申請？</div>
        <div style="font-size:13px;color:#4338CA;margin-bottom:10px;line-height:1.5;">除個人申請外，你可以同時以小組、公司或協會名義再次申請，各申請獨立審核。</div>
        <button onclick="applyAgain()" style="padding:10px 20px;background:#6366F1;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">➕ 以不同類型再次申請</button>
      </div>
      <button onclick="goBack()" style="margin-top:14px;padding:14px 32px;background:#8B0000;color:#fff;border:none;border-radius:10px;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit;width:100%;">返回我的卡</button>
    </div>
  </div>

</div>

<!-- 底部按鈕 -->
<div class="nav-btns" id="navBtns">
  <button class="btn-back" id="btnBack" onclick="prevStep()">\u8fd4\u56de</button>
  <button class="btn-next" id="btnNext" onclick="nextStep()">\u4e0b\u4e00\u6b65</button>
</div>

<script>
var TOTAL_STEPS = 6;
var currentStep = 1;
var selectedRole = '';
var selectedType = '';
var memberNo = '${prefillMember}';
var prefillPhone = '${prefillPhone}';
var prefillRole = '${prefillRole}';  // 預選角色（從 URL ?role= 傳入）
var uploadedKey = '';       // 公司/協會上傳文件 key
var selfName = '';          // 申請人中文姓名（Step 1 驗證後填入）
var selfPhone = '';         // 申請人電話（Step 1 驗證後填入）
var kycDone = false;        // 是否已有 KYC 記錄
var kycRefMemberNo = '';    // 推薦人 member_no（驗證後填入）
var s1Verified = false;     // Step 1 電話已驗證

// SWIFT code 自動對照表（香港主要銀行）
var SWIFT_MAP = {
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

function autoFillSwift() {
  var bank = document.getElementById('kycBankName').value;
  var swiftEl = document.getElementById('kycSwift');
  var noteEl = document.getElementById('kycSwiftNote');
  if (!swiftEl) return;
  if (SWIFT_MAP[bank]) {
    swiftEl.value = SWIFT_MAP[bank];
    swiftEl.readOnly = true;
    swiftEl.style.background = '#F3F4F6';
    if (noteEl) { noteEl.textContent = '✅ 自動填入'; noteEl.style.color = '#1B5E20'; }
  } else {
    swiftEl.value = '';
    swiftEl.readOnly = false;
    swiftEl.style.background = '';
    if (noteEl) { noteEl.textContent = bank ? '請手動輸入' : ''; noteEl.style.color = '#888'; }
  }
}

var _refLookupTimer = null;
function lookupReferral() {
  var phone = document.getElementById('kycRefPhone').value.replace(/\D/g,'');
  var statusEl = document.getElementById('kycRefStatus');
  var foundEl = document.getElementById('kycRefFound');
  var nameDiv = document.getElementById('kycRefName');
  var nameInput = document.getElementById('kycRefNameInput');
  foundEl.style.display = 'none'; nameDiv.style.display = 'none';
  kycRefMemberNo = '';
  if (phone.length < 8) { statusEl.textContent = ''; return; }
  statusEl.textContent = '🔍';
  clearTimeout(_refLookupTimer);
  _refLookupTimer = setTimeout(function() {
    fetch('/api/member/lookup?phone=' + encodeURIComponent(phone))
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.ok && d.member_no) {
          kycRefMemberNo = d.member_no;
          statusEl.textContent = '✅';
          foundEl.style.display = '';
          foundEl.textContent = '✅ ' + (d.name_zh || d.name_en || d.member_no) + '（' + d.member_no + '）';
          nameDiv.style.display = '';
          if (nameInput) nameInput.value = d.name_zh || d.name_en || '';
        } else {
          kycRefMemberNo = '';
          statusEl.textContent = '❌';
          foundEl.style.display = '';
          foundEl.style.background = '#FFEBEE'; foundEl.style.color = '#C62828'; foundEl.style.borderColor = '#C62828';
          foundEl.textContent = '找不到此電話的會員，請確認推薦人已登記為 CoEldery 85 會員';
          nameDiv.style.display = 'none';
        }
      }).catch(function() { statusEl.textContent = '❌'; });
  }, 600);
}

// Init step dots
function initDots() {
  var d = document.getElementById('stepDots');
  d.innerHTML = '';
  for (var i = 1; i <= TOTAL_STEPS; i++) {
    var dot = document.createElement('div');
    dot.className = 'step-dot' + (i === currentStep ? ' active' : (i < currentStep ? ' done' : ''));
    dot.id = 'dot' + i;
    d.appendChild(dot);
  }
}
initDots();

// 預填電話並自動驗證（優先用 phone 參數，否則嘗試 sessionStorage）
(function() {
  var p = prefillPhone || sessionStorage.getItem('ce85_phone') || '';
  if (p) {
    document.getElementById('applyPhone').value = p;
    // 畫面 render 後才呼叫，確保 DOM 就緒
    setTimeout(function() { autoVerifyPhone(); }, 200);
  }
})();

// 密碼即時一致性檢查
document.addEventListener('DOMContentLoaded', function() {
  var p1 = document.getElementById('applyPassword');
  var p2 = document.getElementById('applyPasswordConfirm');
  function checkPwdMatch() {
    var hint = document.getElementById('pwdMatchHint');
    if (!hint) return;
    if (!p2 || !p2.value) { hint.textContent = ''; return; }
    if (p1.value === p2.value && p1.value.length >= 8) {
      hint.textContent = '✅ 密碼一致';
      hint.style.color = '#1B5E20';
    } else if (p1.value !== p2.value) {
      hint.textContent = '❌ 密碼不一致';
      hint.style.color = '#C62828';
    } else {
      hint.textContent = '';
    }
    updateStep1Btn();
  }
  if (p1) p1.addEventListener('input', checkPwdMatch);
  if (p2) p2.addEventListener('input', checkPwdMatch);
});

function goBack() {
  window.location.href = '/app' + (memberNo ? '?member=' + encodeURIComponent(memberNo) : '');
}

function updateDots() {
  for (var i = 1; i <= TOTAL_STEPS; i++) {
    var dot = document.getElementById('dot' + i);
    if (!dot) continue;
    dot.className = 'step-dot' + (i === currentStep ? ' active' : (i < currentStep ? ' done' : ''));
  }
}

function showStep(n) {
  // 如果有預選角色，Step 3（角色選擇）跳過
  if (n === 3 && prefillRole) {
    if (!selectedRole) selectRole(prefillRole);
    showStep(4);
    return;
  }
  for (var i = 1; i <= TOTAL_STEPS; i++) {
    var el = document.getElementById('step' + i);
    if (el) el.style.display = (i === n) ? '' : 'none';
  }
  // 隱藏/顯示 Step 3 進度點（有 prefillRole 時隱藏）
  var dot3 = document.getElementById('dot3');
  if (dot3) dot3.style.display = prefillRole ? 'none' : '';
  // Step 4：有預選角色時顯示確認 banner
  var s4Banner = document.getElementById('s4RoleBanner');
  if (s4Banner) {
    if (n === 4 && prefillRole) {
      var rl = prefillRole === 'COLINKERY' ? '🤝 CoLinkery 連結者' : '🌟 CoLeadery 領航者';
      s4Banner.textContent = '已選擇角色：' + rl;
      s4Banner.style.display = '';
    } else {
      s4Banner.style.display = 'none';
    }
  }
  var btnBack = document.getElementById('btnBack');
  var btnNext = document.getElementById('btnNext');
  btnBack.style.display = n === 1 ? 'none' : '';
  btnNext.textContent = n === TOTAL_STEPS ? '提交申請' : '下一步';
  if (n === TOTAL_STEPS) {
    btnNext.disabled = !document.getElementById('agreeCheck').checked;
    // 填入申請摘要
    renderStep6Summary();
  } else if (n === 1) {
    updateStep1Btn();
  } else {
    btnNext.disabled = false;
  }
  currentStep = n;
  updateDots();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 更新 Step 1 下一步按鈕狀態（需電話已驗證 + 密碼齊全）
function updateStep1Btn() {
  var pwd = (document.getElementById('applyPassword') || {}).value || '';
  var pwd2 = (document.getElementById('applyPasswordConfirm') || {}).value || '';
  var name = (document.getElementById('applyNameZh') || {}).value || '';
  var phone = (document.getElementById('applyContactPhone') || {}).value || '';
  // 如果在 Step 1 才更新按鈕
  if (currentStep !== 1) return;
  var ok = s1Verified && pwd.length >= 8 && pwd === pwd2 && name.trim() && phone.trim();
  var btn = document.getElementById('btnNext');
  if (btn) btn.disabled = !ok;
}

// Step 6 摘要渲染
function renderStep6Summary() {
  var el = document.getElementById('s6SummaryContent');
  if (!el) return;
  var roleMap = { COLEADERY: '🌟 CoLeadery 領航者', COLINKERY: '🤝 CoLinkery 連結者' };
  var typeMap = { INDIVIDUAL: '👤 個人', GROUP: '👥 小組', COMPANY: '🏢 公司', ASSOCIATION: '🏛️ 協會/商會' };
  var nameZh = (document.getElementById('applyNameZh') || {}).value || '';
  var phone = (document.getElementById('applyContactPhone') || {}).value || '';
  var role = roleMap[selectedRole] || selectedRole;
  var type = typeMap[selectedType] || selectedType;
  var extra = '';
  if (selectedType === 'GROUP') {
    var sz = (document.getElementById('applyTeamSize') || {}).value || '';
    if (sz) extra = '<br>小組人數：<strong>' + sz + ' 人</strong>';
  } else if (selectedType === 'COMPANY') {
    var co = (document.getElementById('applyCompanyName') || {}).value || '';
    if (co) extra = '<br>公司名稱：<strong>' + co + '</strong>';
  } else if (selectedType === 'ASSOCIATION') {
    var an = (document.getElementById('applyAssocName') || {}).value || '';
    if (an) extra = '<br>協會名稱：<strong>' + an + '</strong>';
  }
  el.innerHTML =
    '申請角色：<strong>' + role + '</strong><br>' +
    '申請類型：<strong>' + type + '</strong><br>' +
    '申請人：<strong>' + (nameZh || '—') + '</strong><br>' +
    '聯絡電話：<strong>' + (phone || '—') + '</strong>' +
    extra + '<br>' +
    '<span style="color:#6366F1;font-size:13px;">🔒 登入密碼已於第一步設定</span>';
}

function nextStep() {
  clearErrors();
  if (currentStep === 1) {
    // Step 1: 驗證電話 + 密碼 + 基本資料
    validateStep1(function(ok) { if (ok) showStep(2); });
    return;
  }
  if (currentStep === 2) {
    submitKyc(function(ok) { if (ok) showStep(3); });
    return;
  }
  if (currentStep === 3) {
    if (!selectedRole) { showErr('s3Err', '請擇選角色'); return; }
    showStep(4); return;
  }
  if (currentStep === 4) {
    if (!selectedType) { showErr('s4Err', '請擇選申請人類型'); return; }
    updateStep5Fields();
    showStep(5); return;
  }
  if (currentStep === 5) {
    if (!validateStep5()) return;
    showStep(6); return;
  }
  if (currentStep === 6) {
    submitApplication();
    return;
  }
}

function prevStep() {
  if (currentStep > 1) {
    // 有預選角色時，Step 4 後退跳回 Step 2（跳過 Step 3）
    if (currentStep === 4 && prefillRole) {
      showStep(2);
    } else {
      showStep(currentStep - 1);
    }
  }
}

// 電話欄位改動時重置驗證狀態
function onPhoneChange() {
  s1Verified = false;
  var statusEl = document.getElementById('s1PhoneStatus');
  if (statusEl) statusEl.textContent = '';
  var card = document.getElementById('s1MemberCard');
  if (card) card.style.display = 'none';
  updateStep1Btn();
  // Debounce 自動驗證
  clearTimeout(window._phoneVerifyTimer);
  window._phoneVerifyTimer = setTimeout(function() { autoVerifyPhone(); }, 700);
}

// 自動靜默驗證電話（預填後或輸入後觸發，不打擾用戶）
function autoVerifyPhone() {
  var phone = (document.getElementById('applyPhone') || {}).value;
  if (!phone) return;
  phone = phone.trim().replace(/\D/g,'');
  if (phone.length < 8) return;
  var statusEl = document.getElementById('s1PhoneStatus');
  if (statusEl) statusEl.textContent = '🔍';
  fetch('/api/partner/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) {
      s1Verified = true;
      memberNo = d.member_no;
      selfName = d.name_zh || '';
      selfPhone = d.phone || phone;
      sessionStorage.setItem('ce85_phone', phone);
      // 顯示會員卡片
      var card = document.getElementById('s1MemberCard');
      var info = document.getElementById('s1MemberInfo');
      if (card) card.style.display = '';
      if (info) info.textContent = d.name_zh + '（' + d.member_no + '）';
      if (statusEl) statusEl.textContent = '✅';
      // 預填姓名和電話
      var nameZhEl = document.getElementById('applyNameZh');
      var nameEnEl = document.getElementById('applyNameEn');
      var contactPhEl = document.getElementById('applyContactPhone');
      if (nameZhEl && !nameZhEl.value && d.name_zh) nameZhEl.value = d.name_zh;
      if (nameEnEl && !nameEnEl.value && d.name_en) nameEnEl.value = d.name_en;
      if (contactPhEl && !contactPhEl.value && d.phone) contactPhEl.value = d.phone;
      // 預填 KYC（Step 2）
      kycDone = !!d.kyc_id;
      if (d.kyc_id) {
        var kyc = d.kyc;
        document.getElementById('s2KycDone').style.display = '';
        document.getElementById('s2KycNew').style.display = 'none';
        var summary = document.getElementById('s2KycSummary');
        if (summary) summary.textContent = '身份證：' + (kyc.id_prefix || '已登錄') + '　銀行：' + (kyc.bank_name || '已登錄') + '　戶口：' + (kyc.bank_acc_no || '已登錄');
        var kycIdEl = document.getElementById('kycIdPrefix');
        if (kycIdEl) {
          kycIdEl.value = kyc.id_prefix || '';
          kycIdEl.readOnly = true;
          kycIdEl.style.background = '#F3F4F6';
          var kycIdHint = document.getElementById('kycIdHint');
          if (kycIdHint) kycIdHint.textContent = '✅ 已登錄身份證，如需更改請聯絡管理員';
        }
        if (kyc.email) { var emailEl = document.getElementById('kycEmail'); if (emailEl) emailEl.value = kyc.email; }
        if (kyc.referral_phone) {
          var refPhEl = document.getElementById('kycRefPhone');
          if (refPhEl) { refPhEl.value = kyc.referral_phone; refPhEl.readOnly = true; refPhEl.style.background = '#F3F4F6'; }
          var refNameEl = document.getElementById('kycRefNameInput');
          if (refNameEl && kyc.referral_name) { refNameEl.value = kyc.referral_name; document.getElementById('kycRefName').style.display = ''; }
          document.getElementById('kycRefFound').style.display = '';
          document.getElementById('kycRefFound').textContent = '✅ 推薦人：' + (kyc.referral_name || kyc.referral_phone);
          document.getElementById('kycRefStatus').textContent = '✅';
          kycRefMemberNo = kyc.referral_phone;
        }
        if (kyc.bank_name) {
          var kycBankSel = document.getElementById('kycBankName');
          for (var oi = 0; oi < kycBankSel.options.length; oi++) {
            if (kycBankSel.options[oi].text === kyc.bank_name) { kycBankSel.selectedIndex = oi; break; }
          }
          autoFillSwift();
        }
        if (kyc.bank_acc_no) document.getElementById('kycBankAcc').value = kyc.bank_acc_no;
        if (kyc.swift_code) { var swEl = document.getElementById('kycSwift'); if (swEl) swEl.value = kyc.swift_code; }
      } else {
        document.getElementById('s2KycDone').style.display = 'none';
        document.getElementById('s2KycNew').style.display = '';
      }
      updateStep1Btn();
    } else {
      s1Verified = false;
      if (statusEl) statusEl.textContent = '❌';
      var card2 = document.getElementById('s1MemberCard');
      if (card2) card2.style.display = 'none';
      updateStep1Btn();
    }
  }).catch(function() {
    if (statusEl) statusEl.textContent = '';
  });
}

// Step 1 驗證（用戶點下一步時）
function validateStep1(cb) {
  var phone = (document.getElementById('applyPhone') || {}).value.trim();
  var name = (document.getElementById('applyNameZh') || {}).value.trim();
  var contactPhone = (document.getElementById('applyContactPhone') || {}).value.trim();
  var pwd = (document.getElementById('applyPassword') || {}).value || '';
  var pwd2 = (document.getElementById('applyPasswordConfirm') || {}).value || '';

  if (!phone) { showErr('s1Err', '請輸入老有卡登記電話號碼'); return; }
  if (!s1Verified) {
    // 尚未驗證，嘗試即時驗證
    var btn = document.getElementById('btnNext');
    btn.disabled = true; btn.textContent = '驗證中…';
    fetch('/api/partner/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.replace(/\D/g,'') })
    }).then(function(r) { return r.json(); }).then(function(d) {
      btn.disabled = false; btn.textContent = '下一步';
      if (!d.ok) { showErr('s1Err', d.error || '找不到此電話的會員，請確認電話號碼'); return; }
      // 驗證成功，填入資料
      s1Verified = true; memberNo = d.member_no; selfName = d.name_zh||''; selfPhone = d.phone||phone;
      sessionStorage.setItem('ce85_phone', phone);
      var card = document.getElementById('s1MemberCard');
      var info = document.getElementById('s1MemberInfo');
      if (card) card.style.display = '';
      if (info) info.textContent = d.name_zh + '（' + d.member_no + '）';
      // 繼續驗證其他欄位
      doStep1Validation(cb);
    }).catch(function() {
      btn.disabled = false; btn.textContent = '下一步';
      showErr('s1Err', '網絡錯誤，請稍後再試');
    });
    return;
  }
  doStep1Validation(cb);
}

function doStep1Validation(cb) {
  var name = (document.getElementById('applyNameZh') || {}).value.trim();
  var contactPhone = (document.getElementById('applyContactPhone') || {}).value.trim();
  var pwd = (document.getElementById('applyPassword') || {}).value || '';
  var pwd2 = (document.getElementById('applyPasswordConfirm') || {}).value || '';
  if (!name) { showErr('s1Err', '請填寫中文姓名'); return; }
  if (!contactPhone) { showErr('s1Err', '請填寫聯絡電話'); return; }
  if (!pwd || pwd.length < 8) { showErr('s1Err', '請設定登入密碼（至少 8 位）'); return; }
  if (pwd !== pwd2) { showErr('s1Err', '兩次輸入的密碼不一致'); return; }
  if (cb) cb(true);
}

function selectRole(r) {
  selectedRole = r;
  document.getElementById('roleCardCL').classList.toggle('selected', r === 'COLEADERY');
  document.getElementById('roleCardCK').classList.toggle('selected', r === 'COLINKERY');
  var desc = document.getElementById('roleDesc');
  desc.style.display = '';
  if (r === 'COLEADERY') {
    desc.innerHTML = '<strong>🌟 CoLeadery 領航者</strong>：負責導入項目、引導長者參與、建立基層客戶網絡。適合具有社區聯絡或能直接帶領長者參與項目的人士。<br>分成展示：項目淨利潤的 <strong>10%</strong>（標準層級）';
  } else {
    desc.innerHTML = '<strong>🤝 CoLinkery 連結者</strong>：連接商業客戶、拓展 B2B 合作機會。適合擁有商業人脈或客戶資源的人士。<br>分成展示：項目淨利潤的 <strong>10-20%</strong>（圖多結構）';
  }
}

function selectType(t) {
  selectedType = t;
  var keys  = ['Ind',        'Grp',   'Co',      'Assoc'];
  var types = ['INDIVIDUAL', 'GROUP', 'COMPANY', 'ASSOCIATION'];
  keys.forEach(function(k, i) {
    var el = document.getElementById('type' + k);
    if (!el) return;
    el.classList.toggle('selected', t === types[i]);
    el.querySelector('input').checked = (t === types[i]);
  });
}

// ── Step 2: KYC 提交 ──────────────────────────────────────────────────────────
function submitKyc(cb) {
  var idPrefix = document.getElementById('kycIdPrefix').value.trim().toUpperCase();
  // 清除不可見字符（zero-width space、non-breaking space）
  var emailRaw = document.getElementById('kycEmail').value;
  var email = emailRaw.replace(/\u00A0/g,'').replace(/\u200B/g,'').replace(/\uFEFF/g,'').trim();
  console.log('[KYC debug] email:', JSON.stringify(email));
  var refPhone = document.getElementById('kycRefPhone').value.replace(/\D/g,'');
  var refName = document.getElementById('kycRefNameInput') ? document.getElementById('kycRefNameInput').value.trim() : '';
  var bankName = document.getElementById('kycBankName').value;
  var bankAcc = document.getElementById('kycBankAcc').value.trim();
  var swiftCode = document.getElementById('kycSwift').value.trim().toUpperCase();

  // 驗證 HKID 格式：1 letter + 3 digits
  if (!idPrefix || !/^[A-Z][0-9]{3}$/.test(idPrefix)) {
    showErr('s2Err', '請填寫正確的身份證號碼首4位（1個英文字母 + 3位數字，例：A123）'); return;
  }
  // 電郵格式：只檢查是否含有 @ 及 . (更寬鬆)
  if (!email || email.indexOf('@') < 1 || email.lastIndexOf('.') < email.indexOf('@') + 2) {
    showErr('s2Err', '請填寫有效的電郵地址（例：name@domain.com）'); return;
  }
  // 推薦人
  if (!kycDone) {
    if (!refPhone || refPhone.length < 8) { showErr('s2Err', '請填寫推薦人電話號碼'); return; }
    if (!kycRefMemberNo) { showErr('s2Err', '推薦人未能驗證，請確認其電話號碼已登記為 CoEldery 85 會員'); return; }
  }
  if (!bankName) { showErr('s2Err', '請選擇銀行'); return; }
  if (!bankAcc) { showErr('s2Err', '請填寫銀行戶口號碼'); return; }

  var btn = document.getElementById('btnNext');
  btn.disabled = true; btn.textContent = '提交中…';
  var payload = {
    member_no: memberNo,
    id_prefix: idPrefix,
    email: email,
    referral_phone: refPhone,
    referral_name: refName,
    bank_name: bankName,
    bank_acc_no: bankAcc,
    swift_code: swiftCode,
    update_only: kycDone
  };
  fetch('/api/partner/kyc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) { return r.json(); }).then(function(d) {
    btn.disabled = false; btn.textContent = '下一步';
    if (d.ok) { kycDone = true; if (cb) cb(true); }
    else { showErr('s2Err', d.error || '提交失敗'); }
  }).catch(function() {
    btn.disabled = false; btn.textContent = '下一步';
    showErr('s2Err', '網絡錯誤，請重試');
  });
}

function updateStep5Fields() {
  var isInd   = selectedType === 'INDIVIDUAL';
  var isCo    = selectedType === 'COMPANY';
  var isAssoc = selectedType === 'ASSOCIATION';
  var isGrp   = selectedType === 'GROUP';
  var isCK    = selectedRole === 'COLINKERY';

  // 各欄位組顯示/隱藏
  var indNote = document.getElementById('s5IndividualNote');
  var grpFields = document.getElementById('s5GroupFields');
  var coFields = document.getElementById('s5CompanyFields');
  var assocFields = document.getElementById('s5AssocFields');
  var industryField = document.getElementById('s5IndustryField');

  if (indNote) indNote.style.display = isInd ? '' : 'none';
  if (grpFields) grpFields.style.display = isGrp ? '' : 'none';
  if (coFields) coFields.style.display = isCo ? '' : 'none';
  if (assocFields) assocFields.style.display = isAssoc ? '' : 'none';
  if (industryField) industryField.style.display = isCK ? '' : 'none';

  // 小組：初始化成員列表
  if (isGrp) {
    var sz = parseInt((document.getElementById('applyTeamSize') || {}).value) || 0;
    if (sz >= 2) buildGroupMemberRows();
  }
}

function validateStep5() {
  // INDIVIDUAL：基本資料已在 Step 1，Step 5 通常無需額外驗證
  if (selectedType === 'INDIVIDUAL') return true;

  if (selectedType === 'COMPANY') {
    var coName = (document.getElementById('applyCompanyName') || {}).value;
    if (!coName || !coName.trim()) { showErr('s5Err', '請填寫公司名稱'); return false; }
  }

  if (selectedType === 'ASSOCIATION') {
    var anEl = document.getElementById('applyAssocName');
    if (!anEl || !anEl.value.trim()) { showErr('s5Err', '請填寫協會/商會名稱'); return false; }
  }

  if (selectedType === 'GROUP') {
    var n = parseInt((document.getElementById('applyTeamSize') || {}).value) || 0;
    if (n < 2) { showErr('s5Err', '小組至少需要 2 人'); return false; }
    var rows = document.querySelectorAll('.gm-row');
    var total = 0; var unverified = 0;
    rows.forEach(function(row) {
      var mn = row.getAttribute('data-member-no');
      var isSelf = row.getAttribute('data-is-self') === 'true';
      if (!mn && !isSelf) unverified++;
      total += parseFloat(row.querySelector('.gm-pct').value) || 0;
    });
    if (unverified > 0) { showErr('s5Err', '有 ' + unverified + ' 位成員未驗證，請檢查電話號碼'); return false; }
    if (Math.abs(total - 100) > 0.01) { showErr('s5Err', '分成百分比合計必須等於 100%，現為 ' + total.toFixed(1) + '%'); return false; }
  }

  return true;
}

// ── Group member rows ──────────────────────────────────────────────────────
function buildGroupMemberRows() {
  var n = parseInt(document.getElementById('applyTeamSize').value) || 0;
  var container = document.getElementById('fieldGroupMembers');
  var rowsDiv = document.getElementById('groupMemberRows');
  if (n < 2) { container.style.display = 'none'; rowsDiv.innerHTML = ''; return; }
  container.style.display = '';
  // 清空重建（確保 row 1 為自己）
  rowsDiv.innerHTML = '';
  for (var i = 0; i < n; i++) {
    var idx = i + 1;
    var div = document.createElement('div');
    div.className = 'gm-row';
    if (i === 0) {
      // 第一行 = 申請人自己，pre-filled 並鎖定
      div.setAttribute('data-member-no', memberNo);
      div.setAttribute('data-name', selfName);
      div.setAttribute('data-phone', selfPhone);
      div.setAttribute('data-is-self', 'true');
      div.style.cssText = 'background:#ECFDF5;border:1.5px solid #4CAF50;border-radius:8px;padding:12px;margin-bottom:8px;';
      div.innerHTML = '<div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#1B4332;">成員 1（申請人本人）</div>' +
        '<div style="display:flex;gap:8px;align-items:flex-start;">' +
          '<div style="flex:1;">' +
            '<input type="tel" class="gm-phone" value="' + selfPhone + '" readonly' +
              ' style="width:100%;padding:9px 11px;border:1.5px solid #4CAF50;border-radius:6px;font-size:14px;background:#F0FDF4;color:#1B4332;">' +
            '<div class="gm-status" style="font-size:12px;margin-top:4px;color:#1B4332;">✅ 申請人本人（自動確認，毋須邀請）</div>' +
            '<div class="gm-name" style="font-size:13px;font-weight:600;color:#1B4332;margin-top:2px;">' + selfName + '（' + memberNo + '）</div>' +
          '</div>' +
          '<div style="width:90px;">' +
            '<input type="number" class="gm-pct" placeholder="分成%" min="1" max="99" step="0.5" style="width:100%;padding:9px 11px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:14px;" oninput="updatePercentSum()">' +
            '<div style="font-size:11px;color:#9CA3AF;text-align:center;margin-top:2px;">分成%</div>' +
          '</div>' +
        '</div>';
    } else {
      // 其他成員行
      div.setAttribute('data-member-no', '');
      div.setAttribute('data-name', '');
      div.style.cssText = 'background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:8px;padding:12px;margin-bottom:8px;';
      div.innerHTML = '<div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#374151;">成員 ' + idx + '</div>' +
        '<div style="display:flex;gap:8px;align-items:flex-start;">' +
          '<div style="flex:1;">' +
            '<input type="tel" class="gm-phone" placeholder="香港電話號碼" style="width:100%;padding:9px 11px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:14px;" oninput="debounceVerifyMember(this, ' + i + ')">' +
            '<div class="gm-status" style="font-size:12px;margin-top:4px;min-height:18px;"></div>' +
            '<div class="gm-name" style="font-size:13px;font-weight:600;color:#1B4332;margin-top:2px;"></div>' +
          '</div>' +
          '<div style="width:90px;">' +
            '<input type="number" class="gm-pct" placeholder="分成%" min="1" max="99" step="0.5" style="width:100%;padding:9px 11px;border:1.5px solid #D1D5DB;border-radius:6px;font-size:14px;" oninput="updatePercentSum()">' +
            '<div style="font-size:11px;color:#9CA3AF;text-align:center;margin-top:2px;">分成%</div>' +
          '</div>' +
        '</div>';
    }
    rowsDiv.appendChild(div);
  }
  updatePercentSum();
}

var _gmTimers = {};
function debounceVerifyMember(input, idx) {
  clearTimeout(_gmTimers[idx]);
  _gmTimers[idx] = setTimeout(function() { verifyGroupMember(input, idx); }, 600);
}

function verifyGroupMember(input, idx) {
  var row = input.closest('.gm-row');
  var statusEl = row.querySelector('.gm-status');
  var nameEl = row.querySelector('.gm-name');
  var phone = input.value.replace(/\D/g, '');
  row.setAttribute('data-member-no', '');
  row.setAttribute('data-name', '');
  nameEl.textContent = '';
  if (phone.length < 8) { statusEl.textContent = ''; statusEl.style.color = '#9CA3AF'; return; }
  statusEl.textContent = '驗證中…'; statusEl.style.color = '#9CA3AF';
  input.style.borderColor = '#D1D5DB';
  fetch('/api/partner/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) {
      row.setAttribute('data-member-no', d.member_no);
      row.setAttribute('data-name', d.name_zh || '');
      row.setAttribute('data-phone', phone);
      nameEl.textContent = d.name_zh ? ('✓ ' + d.name_zh + '（' + d.member_no + '）') : '';
      statusEl.textContent = '✅ 會員驗證通過';
      statusEl.style.color = '#1B4332';
      input.style.borderColor = '#4CAF50';
    } else {
      statusEl.textContent = '❌ ' + (d.error || '未找到符合資格會員');
      statusEl.style.color = '#DC2626';
      input.style.borderColor = '#F87171';
    }
  }).catch(function() {
    statusEl.textContent = '網絡錯誤，請重試'; statusEl.style.color = '#DC2626';
  });
}

function updatePercentSum() {
  var rows = document.querySelectorAll('.gm-row');
  var total = 0;
  rows.forEach(function(row) { total += parseFloat(row.querySelector('.gm-pct').value) || 0; });
  var sumEl = document.getElementById('groupPercentSum');
  if (total === 0) { sumEl.textContent = ''; return; }
  var diff = Math.abs(total - 100);
  if (diff < 0.01) {
    sumEl.innerHTML = '<span style="color:#1B4332;">✅ 分成合計：100%</span>';
  } else {
    sumEl.innerHTML = '<span style="color:#DC2626;">⚠️ 分成合計：' + total.toFixed(1) + '%（需為100%）</span>';
  }
}
// ── End Group member rows ───────────────────────────────────────────────────

function handleFileSelect(input) {
  var file = input.files[0];
  if (!file) return;
  // 找最近的 upload-status（公司或協會各自的顯示區）
  var statusEl = input.parentElement ? input.parentElement.querySelector('.upload-status') : null;
  if (!statusEl) statusEl = document.getElementById('uploadStatus');
  if (!statusEl) return;
  if (file.size > 5 * 1024 * 1024) {
    statusEl.textContent = '檔案不能超過 5MB';
    statusEl.className = 'upload-status';
    return;
  }
  statusEl.textContent = '上傳中…';
  statusEl.className = 'upload-status';
  var form = new FormData();
  form.append('file', file);
  fetch('/api/partner/upload', { method: 'POST', body: form })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.ok) {
        uploadedKey = d.key;
        statusEl.textContent = '✅ ' + file.name + ' 上傳成功';
        statusEl.className = 'upload-status ok';
      } else {
        statusEl.textContent = '上傳失敗：' + (d.error || '請重試');
        statusEl.className = 'upload-status';
      }
    }).catch(function() {
      statusEl.textContent = '網絡錯誤，請重試';
      statusEl.className = 'upload-status';
    });
}

// 密碼顯示/隱藏切換
function togglePwd(inputId, btnId) {
  var el = document.getElementById(inputId);
  var btn = document.getElementById(btnId);
  if (!el) return;
  if (el.type === 'password') {
    el.type = 'text';
    if (btn) btn.innerHTML = '&#x1F576;';
  } else {
    el.type = 'password';
    if (btn) btn.innerHTML = '&#x1F441;';
  }
}

function updateDeclareBtn() {
  var agreed = document.getElementById('agreeCheck').checked;
  // Step 6 密碼已移至 Step 1，只需勾選聲明即可提交
  document.getElementById('btnNext').disabled = !agreed;
}

function submitApplication() {
  // 密碼已在 Step 1 設定，從 Step 1 欄位取值
  var pwd = (document.getElementById('applyPassword') || {}).value || '';
  var pwd2 = (document.getElementById('applyPasswordConfirm') || {}).value || '';
  if (!pwd || pwd.length < 8) { showErr('s6Err', '請返回第一步設定登入密碼（至少 8 位）'); return; }
  if (pwd !== pwd2) { showErr('s6Err', '兩次密碼不一致，請返回第一步重新設定'); return; }
  if (!document.getElementById('agreeCheck').checked) { showErr('s6Err', '請先勾選聲明'); return; }

  var btn = document.getElementById('btnNext');
  btn.disabled = true;
  btn.textContent = '提交中…';

  // 公司名稱：公司用 applyCompanyName，協會用 applyAssocName
  var companyName = '';
  var companyBR = '';
  if (selectedType === 'COMPANY') {
    companyName = (document.getElementById('applyCompanyName') || {}).value || '';
    companyBR = (document.getElementById('applyCompanyBR') || {}).value || '';
  } else if (selectedType === 'ASSOCIATION') {
    companyName = (document.getElementById('applyAssocName') || {}).value || '';
    companyBR = (document.getElementById('applyAssocRegNo') || {}).value || '';
  }

  var body = {
    member_no: memberNo,
    role: selectedRole,
    applicant_type: selectedType,
    name_zh: (document.getElementById('applyNameZh') || {}).value.trim(),
    name_en: (document.getElementById('applyNameEn') || {}).value.trim(),
    phone: (document.getElementById('applyContactPhone') || {}).value.trim(),
    address: (document.getElementById('applyDistrict') ? document.getElementById('applyDistrict').value.trim() : ''),
    password: pwd,
    id_prefix: (document.getElementById('kycIdPrefix') || {}).value.trim(),
    company_name: companyName.trim(),
    company_br: companyBR.trim(),
    industry_background: document.getElementById('applyIndustry') ? document.getElementById('applyIndustry').value.trim() : '',
    team_size: parseInt((document.getElementById('applyTeamSize') || {}).value) || null,
    team_notes: document.getElementById('applyTeamNotes') ? document.getElementById('applyTeamNotes').value.trim() : '',
    group_members: (function() {
      var rows = document.querySelectorAll('.gm-row');
      var arr = [];
      rows.forEach(function(row) {
        var mn = row.getAttribute('data-member-no') || '';
        var name = row.getAttribute('data-name') || '';
        var phone = row.getAttribute('data-phone') || row.querySelector('.gm-phone').value.replace(/\D/g, '');
        var pct = parseFloat(row.querySelector('.gm-pct').value) || 0;
        if (mn) arr.push({ member_no: mn, name_zh: name, phone: phone, share_pct: pct });
      });
      return arr;
    })(),
    bank_name: (document.getElementById('kycBankName') || {}).value,
    bank_acc_no: (document.getElementById('kycBankAcc') || {}).value.trim()
  };
  fetch('/api/partner/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (!r.ok) {
      return r.json().then(function(d) { throw new Error(d.error || 'HTTP ' + r.status); }).catch(function() { throw new Error('HTTP ' + r.status); });
    }
    return r.json();
  }).then(function(d) {
    if (d.ok) {
      document.getElementById('step6').style.display = 'none';
      document.getElementById('navBtns').style.display = 'none';
      document.getElementById('stepDots').style.display = 'none';
      // 填入審核狀態詳情
      var roleLabel = selectedRole === 'COLINKERY' ? '🤝 CoLinkery 連結者' : '🌟 CoLeadery 領航者';
      var typeMap = { INDIVIDUAL: '個人', GROUP: '小組', COMPANY: '公司', ASSOCIATION: '協會/商會' };
      var typeLabel = typeMap[selectedType] || selectedType;
      var appIdText = d.app_id ? ('APP-' + String(d.app_id).padStart(4, '0')) : '已記錄';
      document.getElementById('successTitle').textContent = '✅ 申請已成功提交！';
      document.getElementById('successDetail').innerHTML =
        '申請編號：<strong>' + appIdText + '</strong><br>' +
        '申請角色：<strong>' + roleLabel + '</strong><br>' +
        '申請類型：<strong>' + typeLabel + '</strong><br>' +
        '狀態：<span style="color:#E65100;font-weight:700;">等待審核中 ⏳</span><br>' +
        '預計時間：<strong>3–5 個工作天</strong><br><br>' +
        '批准後系統會開通你的工具帳號，<br>屆時可用你設定的密碼直接登入。';
      // 如有團隊邀請，顯示 WA 邀請區
      if (d.invites && d.invites.length > 0) {
        renderTeamInvites(d.invites, selectedRole);
      }
      // 顯示「以不同類型再次申請」提示
      var anotherBtn = document.getElementById('btnApplyAnother');
      if (anotherBtn) anotherBtn.style.display = '';
      document.getElementById('stepSuccess').style.display = '';
    } else {
      btn.disabled = false;
      btn.textContent = '\u63d0\u4ea4\u7533\u8acb';
      showErr('s6Err', d.error || '\u63d0\u4ea4\u5931\u6557\uff0c\u8acb\u518d\u8a66');
    }
  }).catch(function(err) {
    btn.disabled = false;
    btn.textContent = '\u63d0\u4ea4\u7533\u8acb';
    showErr('s6Err', '\u63d0\u4ea4\u5931\u6557\uff1a' + (err && err.message ? err.message : '\u7db2\u7d61\u932f\u8aa4\uff0c\u8acb\u91cd\u8a66'));
  });
}

function renderTeamInvites(invites, role) {
  var roleLabel = role === 'COLEADERY' ? 'CoLeadery \u9818\u822a\u8005' : 'CoLinkery \u9023\u7d50\u8005';
  var container = document.getElementById('teamInviteSection');
  if (!container) return;
  // 過濾掉申請人自己（後端已不傳，前端再做一層保險）
  var otherInvites = invites.filter(function(inv) { return inv.member_no !== memberNo; });
  if (otherInvites.length === 0) { container.innerHTML = ''; return; }
  var html = '<div style="margin-top:20px;">' +
    '<div style="font-size:17px;font-weight:900;color:#8B0000;margin-bottom:12px;">\ud83d\udce8 \u9080\u8acb\u5718\u968a\u6210\u54e1\u78ba\u8a8d\u52a0\u5165</div>' +
    '<div style="font-size:14px;color:#555;margin-bottom:14px;">\u8acb\u5411\u4ee5\u4e0b\u5718\u968a\u6210\u54e1\u767c\u9001 WhatsApp \u9080\u8acb\uff0c\u8b93\u5c0d\u65b9\u78ba\u8a8d\u52a0\u5165\u5718\u968a\u53ca\u5206\u6210\u6bd4\u4f8b\u3002</div>';
  otherInvites.forEach(function(inv, i) {
    var confirmUrl = 'https://coeldery85.com/app/team-confirm?token=' + inv.token;
    var msg = '\u4f60\u597d\uff01\u6211\u6b63\u7533\u8acb\u52a0\u5165 CoEldery 85 \u7684 ' + roleLabel + ' \u5718\u968a\uff0c\u9084\u8acb\u4f60\u4e00\u8d77\u53c3\u8207\uff01\\n\\n' +
      '\ud83d\udc64 \u6210\u54e1\uff1a' + inv.name_zh + '\\n' +
      '\ud83d\udcb0 \u4f60\u7684\u5206\u6210\uff1a' + inv.share_pct + '%\\n\\n' +
      '\u8acb\u9ede\u64ca\u9023\u7d50\u78ba\u8a8d\u6216\u62d2\u7d55\uff1a\\n' + confirmUrl;
    var waPhone = '852' + inv.phone;
    var msgId = 'inviteMsg_' + i;
    // WA link: 用 data-phone + data-msg，透過 JS 組合，避免雙引號破壞 HTML 屬性
    html += '<div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px;margin-bottom:12px;">' +
      '<div style="font-weight:700;font-size:15px;color:#1B4332;margin-bottom:6px;">' + inv.name_zh + '\uff08' + inv.member_no + '\uff09</div>' +
      '<div style="font-size:13px;color:#666;margin-bottom:10px;">\u5206\u6210\uff1a<strong style="color:#8B0000;">' + inv.share_pct + '%</strong></div>' +
      '<button class="wa-invite-btn" data-phone="' + waPhone + '" data-msg-id="' + msgId + '"' +
        ' style="display:inline-block;width:100%;padding:10px 18px;background:#25D366;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">' +
        '\ud83d\udcf2 WhatsApp \u767c\u9001\u9080\u8acb</button>' +
      '<div style="margin-top:6px;">' +
        '<div style="font-size:12px;color:#9CA3AF;margin-bottom:4px;">WhatsApp Business \u7528\u6236\u53ef\u8907\u88fd\u4ee5\u4e0b\u6587\u5b57\uff0c\u624b\u52d5\u767c\u9001\uff1a</div>' +
        '<textarea id="' + msgId + '" readonly rows="6"' +
          ' style="width:100%;background:#F3F4F6;border:none;border-radius:6px;padding:10px;font-size:12px;color:#374151;word-break:break-all;resize:none;font-family:monospace;">' +
          escHtml(msg) + '</textarea>' +
        '<button class="copy-msg-btn" data-msg-id="' + msgId + '"' +
          ' style="margin-top:6px;padding:6px 12px;background:#6B7280;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;">' +
          '\ud83d\udccb \u8907\u88fd\u6587\u5b57</button>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
  // 綁定按鈕事件（避免 inline onclick 引號問題）
  container.querySelectorAll('.wa-invite-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var phone = btn.getAttribute('data-phone');
      var msgEl = document.getElementById(btn.getAttribute('data-msg-id'));
      var text = msgEl ? msgEl.value : '';
      window.open('https://api.whatsapp.com/send?phone=' + phone + '&text=' + encodeURIComponent(text), '_blank');
    });
  });
  container.querySelectorAll('.copy-msg-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var msgEl = document.getElementById(btn.getAttribute('data-msg-id'));
      var text = msgEl ? msgEl.value : '';
      copyText(btn, text);
    });
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function copyText(btn, text) {
  var origText = btn.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = '\u2705 \u5df2\u8907\u88fd\uff01';
      setTimeout(function() { btn.textContent = origText; }, 2000);
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); btn.textContent = '\u2705 \u5df2\u8907\u88fd\uff01'; setTimeout(function() { btn.textContent = origText; }, 2000); } catch(e) {}
    document.body.removeChild(ta);
  }
}

function showWaCopyFallback(el) {
  // WA Business 用戶的備用提示（若 window.open 被攔截，文字區已常態顯示，不需額外操作）
}

// 再次以不同類型申請（重置 selectedType 返回 Step 4）
function applyAgain() {
  // 保留已驗證的 memberNo / selfName / selfPhone / selectedRole
  // 重置申請類型和 Step 5 欄位
  selectedType = '';
  uploadedKey = '';
  // 清除類型選擇視覺狀態
  ['Ind','Grp','Co','Assoc'].forEach(function(k) {
    var el = document.getElementById('type' + k);
    if (el) { el.classList.remove('selected'); el.querySelector('input').checked = false; }
  });
  // 清除 Step 5 欄位
  ['applyCompanyName','applyCompanyBR','applyAssocName','applyAssocRegNo','applyTeamNotes','applyIndustry'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var tsEl = document.getElementById('applyTeamSize');
  if (tsEl) tsEl.value = '';
  var grRows = document.getElementById('groupMemberRows');
  if (grRows) grRows.innerHTML = '';
  // 清除 Step 6 聲明
  var ck = document.getElementById('agreeCheck');
  if (ck) ck.checked = false;
  // 隱藏 success，顯示 navBtns
  document.getElementById('stepSuccess').style.display = 'none';
  document.getElementById('navBtns').style.display = '';
  document.getElementById('stepDots').style.display = '';
  // 跳回 Step 4
  showStep(4);
}

function showErr(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function clearErrors() {
  document.querySelectorAll('.err-box').forEach(function(e) { e.classList.remove('show'); });
}
</script>
</body>
</html>`
}

export function qrCompleteHtml() {
  const districtOptions = HK_DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join('')
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>完成會員登記 — CoEldery 85</title>
<meta name="theme-color" content="#1a6b1a">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:linear-gradient(160deg,#1a6b1a 0%,#388e3c 45%,#2e7d32 100%);min-height:100vh;
  font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
  display:flex;align-items:center;justify-content:center;padding:20px;}
.card{background:#fff;border-radius:24px;padding:36px 28px 32px;max-width:420px;width:100%;
  box-shadow:0 20px 60px rgba(0,0,0,0.25);}
h1{font-size:22px;font-weight:900;color:#1a6b1a;margin-bottom:6px;}
.sub{font-size:14px;color:#666;margin-bottom:24px;line-height:1.5;}
.info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:15px;}
.info-row .lbl{color:#888;font-weight:600;}
.info-row .val{font-weight:700;color:#111;}
.check-icon{color:#22c55e;margin-right:4px;}
.section{margin:22px 0 4px;font-size:16px;font-weight:700;color:#1a6b1a;}
.field{margin-bottom:18px;}
.field label{display:block;font-size:14px;font-weight:700;color:#222;margin-bottom:8px;}
.field label span{color:#c62828;}
.field select{width:100%;padding:13px 16px;font-size:16px;border:2px solid #388e3c;
  border-radius:10px;font-family:inherit;color:#111;background:#fff;outline:none;}
.btn{width:100%;padding:15px;font-size:17px;font-weight:900;color:#fff;
  background:linear-gradient(135deg,#1a6b1a,#388e3c);border:none;border-radius:12px;
  cursor:pointer;letter-spacing:1px;transition:opacity 0.2s;}
.btn:active{opacity:0.85;}
.error-box{background:#FEE2E2;border:1.5px solid #EF4444;border-radius:10px;
  padding:12px 16px;font-size:14px;color:#B91C1C;margin-bottom:16px;display:none;}
.success-box{display:none;text-align:center;padding:20px 0;}
.success-box .big-check{font-size:64px;margin-bottom:12px;}
.success-box h2{font-size:22px;font-weight:900;color:#1a6b1a;margin-bottom:8px;}
.success-box p{font-size:15px;color:#555;margin-bottom:20px;line-height:1.6;}
.go-app-btn{display:block;width:100%;padding:15px;font-size:17px;font-weight:900;
  color:#fff;background:#1a6b1a;border:none;border-radius:12px;
  text-decoration:none;text-align:center;cursor:pointer;}
</style>
</head>
<body>
<div class="card" id="mainCard">
  <h1>🎉 完成你的會員資訊</h1>
  <p class="sub">你已成功加入！請補充以下資訊以完成會員登記。</p>

  <div id="memberInfo">
    <!-- filled by JS -->
  </div>

  <p class="section">請補充以下資訊：</p>

  <div id="errorBox" class="error-box"></div>

  <div class="field">
    <label>性別 <span>✽</span></label>
    <select id="fieldGender">
      <option value="">── 請選擇 ──</option>
      <option value="M">男</option>
      <option value="F">女</option>
      <option value="Other">其他</option>
      <option value="Prefer not to say">寧願不說</option>
    </select>
  </div>

  <div class="field">
    <label>居住地區 <span>✽</span></label>
    <select id="fieldDistrict">
      <option value="">── 請選擇 ──</option>
      ${districtOptions}
    </select>
  </div>

  <button class="btn" id="submitBtn" onclick="doComplete()">保存並查看會員卡</button>
</div>

<div class="success-box" id="successBox">
  <div class="big-check">✅</div>
  <h2>會員登記完成！</h2>
  <p>你的 CoEldery 85 會員資料已完整<br>立即進入老有卡 App 查看你的會員卡</p>
  <a class="go-app-btn" id="goAppBtn" href="/app">📱 進入老有卡 App</a>
</div>

<script>
var memberNo = '';
var memberData = null;

// Get member info from sessionStorage (set by /app after token login)
try {
  var stored = sessionStorage.getItem('wa_member');
  if (stored) memberData = JSON.parse(stored);
} catch(_) {}

if (memberData) {
  memberNo = memberData.member_no || '';
  var currentYear = new Date().getFullYear();
  var age = memberData.birth_year ? currentYear - memberData.birth_year : null;
  var tierLabel = memberData.tier === 'PRIMARY' ? '主卡（55+）' : '家庭卡';
  document.getElementById('memberInfo').innerHTML =
    '<div class="info-row"><span class="lbl">姓名</span><span class="val"><span class="check-icon">✓</span>' + (memberData.name_zh||'') + '</span></div>' +
    '<div class="info-row"><span class="lbl">出生年份</span><span class="val"><span class="check-icon">✓</span>' + (memberData.birth_year||'') + '</span></div>' +
    '<div class="info-row"><span class="lbl">會員類型</span><span class="val"><span class="check-icon">✓</span>' + tierLabel + '</span></div>' +
    '<div class="info-row"><span class="lbl">會員號碼</span><span class="val"><span class="check-icon">✓</span>' + memberNo + '</span></div>';
}

function showError(msg){ var b=document.getElementById('errorBox'); b.textContent=msg; b.style.display='block'; }
function hideError(){ document.getElementById('errorBox').style.display='none'; }

function doComplete(){
  hideError();
  var gender   = document.getElementById('fieldGender').value;
  var district = document.getElementById('fieldDistrict').value;
  if (!gender)   { showError('請選擇性別'); return; }
  if (!district) { showError('請選擇居住地區'); return; }
  if (!memberNo) { showError('找不到會員資料，請重新掃描QR碼'); return; }

  var btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.textContent = '⏳ 儲存中...';

  fetch('/api/member/complete-profile', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ member_no: memberNo, gender: gender, district: district })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (d.ok){
      document.getElementById('mainCard').style.display = 'none';
      document.getElementById('successBox').style.display = 'block';
      // Update stored member data
      if (memberData){
        memberData.gender = gender; memberData.district = district;
        memberData.registration_status = 'complete';
        try { sessionStorage.setItem('wa_member', JSON.stringify(memberData)); } catch(_){}
      }
    } else {
      showError(d.error || '儲存失敗，請重試');
      btn.disabled=false; btn.textContent='保存並查看會員卡';
    }
  })
  .catch(function(){
    showError('網絡錯誤，請重試');
    btn.disabled=false; btn.textContent='保存並查看會員卡';
  });
}
</script>
</body>
</html>`
}


export function signupSubHtml() {
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

export function signupMainHtml() {
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

export function adminHtml() {
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

export function pwaAppHtml() {
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
.topbar-logo{height:40px;width:auto;object-fit:contain;flex-shrink:0;max-width:90px;}
.topbar-spacer{flex:1;}
/* Right-side topbar icon buttons (心聲/工作) */
.topbar-icons{display:flex;gap:6px;align-items:center;flex-shrink:0;}
.topbar-icon-btn{background:none;border:none;color:#fff;cursor:pointer;padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent;position:relative;line-height:1;}
.topbar-icon-btn .ti-icon{font-size:22px;line-height:1;}
@media(max-width:340px){.topbar-icon-btn .ti-icon{font-size:18px;}.topbar-icon-btn{padding:4px;}.topbar-icons{gap:2px;}}
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
  <!-- 中：彈性空間 -->
  <div class="topbar-spacer"></div>
  <!-- 右：心聲 + 工作 icon（搬自底部 tab）+ 漢堡選單 -->
  <div class="topbar-icons">
    <button class="topbar-icon-btn" onclick="switchTab('voice')" aria-label="心聲" style="position:relative;">
      <span class="ti-icon">💬</span>
      <span id="voiceRedDot" style="display:none;position:absolute;top:4px;right:4px;width:9px;height:9px;background:#e53935;border-radius:50%;border:2px solid var(--green-dark);"></span>
    </button>
    <button class="topbar-icon-btn" onclick="switchTab('work')" aria-label="工作">
      <span class="ti-icon">💼</span>
    </button>
  </div>
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

<!-- ── CoFilmery coming-soon panel ── -->
<div id="tabCoFilmery" style="display:none;padding:40px 18px 90px;">
  <div style="text-align:center;padding:48px 24px;background:#fff;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="font-size:64px;line-height:1;margin-bottom:20px;">🎬</div>
    <div style="font-size:26px;font-weight:900;color:#111827;margin-bottom:12px;letter-spacing:0.5px;">CoFilmery</div>
    <div style="font-size:18px;color:#6B7280;line-height:1.7;margin-bottom:28px;">即將推出<br>敬請期待</div>
    <div style="display:inline-block;background:#F3F4F6;border-radius:20px;padding:8px 20px;font-size:15px;color:#9CA3AF;font-weight:600;">Coming Soon</div>
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
  <button class="tab-btn" id="tabBtnFamilyTree" onclick="switchTab('familytree')">
    <span class="tab-icon">🌳</span>
    <span class="tab-label">家庭樹</span>
  </button>
  <button class="tab-btn" id="tabBtnCoFilmery" onclick="switchTab('cofilmery')">
    <span class="tab-icon">🎬</span>
    <span class="tab-label">CoFilmery</span>
  </button>
</nav>

<script>
// ── Tab 切換 ──
var TAB_PANELS = { shop:'tabShop', news:'tabNews', card:'tabCard', voice:'tabVoice', work:'tabWork' };
var TAB_BTNS   = { shop:'tabBtnShop', news:'tabBtnNews', card:'tabBtnCard', voice:'tabBtnVoice', work:'tabBtnWork' };
var currentTab = 'card';

function switchTab(name) {
  // ── 特殊 tab 攔截（在原 panel 邏輯之前）──
  if (name === 'familytree') {
    /* 先向後端申請短期簽名 handoff token，再以同頁跳轉帶 token 去家族樹 sub-app。
     * 失敗（401 未登入 / 網絡錯）時 fallback 去乾淨網址，不暴露明文 member_no。
     *
     * 流程：
     *   1. 若 localStorage 有 ce85_member_no，先 POST /api/session/init 種 app_session cookie
     *      （暫時方案：待 WA Biz API 上線後改為真驗證，此 step 可移除）
     *   2. 再 POST /api/family-tree/handoff（憑 cookie 認人）
     *   3. 成功帶 ?token= 跳 family；失敗 fallback 乾淨網址 */
    var FAMILY_URL = 'https://family.coeldery85.com';
    var memberNo = localStorage.getItem('ce85_member_no') || '';

    /* Step 1：若有 member_no，先種 app_session cookie */
    var initPromise = memberNo
      ? fetch('/api/session/init', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_no: memberNo })
        }).catch(function() { /* non-fatal：init 失敗仍嘗試 handoff */ })
      : Promise.resolve();

    /* Step 2：再 call handoff */
    initPromise
      .then(function() {
        return fetch('/api/family-tree/handoff', { method: 'POST', credentials: 'include' });
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.ok && data.token) {
          window.location.href = FAMILY_URL + '/?token=' + encodeURIComponent(data.token) + '#/enter';
        } else {
          window.location.href = FAMILY_URL;
        }
      })
      .catch(function() {
        window.location.href = FAMILY_URL;
      });
    return;
  }
  if (name === 'cofilmery') {
    if (name === currentTab) return;
    var oldPanelCf = document.getElementById(TAB_PANELS[currentTab]);
    if (oldPanelCf) oldPanelCf.style.display = 'none';
    var oldBtnCf = document.getElementById(TAB_BTNS[currentTab]);
    if (oldBtnCf) oldBtnCf.classList.remove('active');
    currentTab = 'cofilmery';
    var cfPanel = document.getElementById('tabCoFilmery');
    if (cfPanel) cfPanel.style.display = 'block';
    var cfBtn = document.getElementById('tabBtnCoFilmery');
    if (cfBtn) cfBtn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
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

export function newAdminShellHtml(): string {
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
