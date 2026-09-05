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
