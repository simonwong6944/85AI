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
  if(t==='qrgen'){ updateQr(); loadQrLinks(); }
  if(t==='settings'){ loadSettings(); loadGroups(); loadSourceStats(); }
}

// ── QR Generator
var _qrType = 'roadshow';
var _qrCanvas = null;
var _qrCurrentUrl = '';
var _qrLinks = [];

function setQrType(t){
  _qrType = t;
  ['roadshow','institution','referral','online'].forEach(function(x){
    document.getElementById('qtype-'+x).classList.toggle('active', x===t);
    document.getElementById('qfields-'+x).style.display = x===t ? '' : 'none';
  });
  updateQr();
}

function buildQrUrl(){
  var base = location.origin;
  var target = document.getElementById('qTarget').value;
  var path = target==='primary' ? '/membership/join' : target==='family' ? '/membership/join-family' : '/membership';
  var p = new URLSearchParams();

  if(_qrType==='roadshow'){
    var code = document.getElementById('qRsCode').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
    var label = document.getElementById('qRsLabel').value.trim();
    if(!code) return null;
    p.set('src','roadshow');
    p.set('rs', code);
    if(label) p.set('loc', label);

  } else if(_qrType==='institution'){
    var name = document.getElementById('qInstName').value.trim();
    var icode = document.getElementById('qInstCode').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
    if(!name) return null;
    var slug = icode || name.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,20);
    p.set('src','institution');
    p.set('rs', 'inst_'+slug);
    p.set('loc', name);

  } else if(_qrType==='referral'){
    var refno = document.getElementById('qRefNo').value.trim().toUpperCase();
    if(!refno) return null;
    p.set('src','referral');
    p.set('ref', refno);

  } else if(_qrType==='online'){
    var ch = document.getElementById('qOnlineCh').value;
    var tag = document.getElementById('qOnlineTag').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
    p.set('src','online');
    p.set('ch', ch);
    if(tag) p.set('tag', tag);
  }

  return base + path + '?' + p.toString();
}

function getQrLabel(){
  if(_qrType==='roadshow'){
    var label = document.getElementById('qRsLabel').value.trim();
    var code = document.getElementById('qRsCode').value.trim();
    return label || code || 'Roadshow';
  } else if(_qrType==='institution'){
    return document.getElementById('qInstName').value.trim() || '機構合作';
  } else if(_qrType==='referral'){
    var name = document.getElementById('qRefName').value.trim();
    var no = document.getElementById('qRefNo').value.trim();
    return name ? name + '（'+no+'）' : no || '會員介紹';
  } else {
    var ch2 = document.getElementById('qOnlineCh').value;
    var chLabel = {'facebook':'Facebook','instagram':'Instagram','whatsapp':'WhatsApp','website':'官方網站','email':'電子郵件','other':'其他'}[ch2]||ch2;
    var tag2 = document.getElementById('qOnlineTag').value.trim();
    return chLabel + (tag2 ? ' · '+tag2 : '');
  }
}

function updateQr(){
  var url = buildQrUrl();
  var wrap = document.getElementById('qrCanvasWrap');
  var urlBox = document.getElementById('qrUrlBox');
  var actionBtns = document.getElementById('qrActionBtns');
  var labelEl = document.getElementById('qrLabelText');

  if(!url){
    wrap.innerHTML = '<div style="color:#ccc;font-size:13px;text-align:center;padding:30px 0;">請填寫必填欄位<br>即時生成 QR Code</div>';
    urlBox.style.display='none';
    actionBtns.style.display='none';
    labelEl.textContent='';
    _qrCurrentUrl='';
    return;
  }

  _qrCurrentUrl = url;

  // generate QR
  try {
    var qr = qrcode(0,'M');
    qr.addData(url);
    qr.make();
    var mc = qr.getModuleCount();
    var sz = 200;
    var cell = sz/mc;

    var canvas = document.createElement('canvas');
    canvas.width = sz + 40;
    canvas.height = sz + 40;
    var ctx = canvas.getContext('2d');

    // white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // QR modules
    ctx.fillStyle = '#1B5E20';
    for(var r=0;r<mc;r++){
      for(var cc=0;cc<mc;cc++){
        if(qr.isDark(r,cc)) ctx.fillRect(20+cc*cell, 20+r*cell, cell, cell);
      }
    }

    wrap.innerHTML = '';
    canvas.style.width='200px';
    canvas.style.height='200px';
    canvas.style.imageRendering='pixelated';
    wrap.appendChild(canvas);
    _qrCanvas = canvas;

    var label = getQrLabel();
    labelEl.textContent = label;
    urlBox.textContent = url;
    urlBox.style.display = '';
    actionBtns.style.display = '';
  } catch(e){
    wrap.innerHTML = '<div style="color:#c00;font-size:12px;text-align:center;padding:20px;">QR 生成失敗：'+e.message+'</div>';
  }
}

function downloadQr(){
  if(!_qrCanvas) return;
  var label = getQrLabel().replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g,'_').slice(0,30);
  // create larger canvas for download (4x)
  var src = _qrCanvas;
  var out = document.createElement('canvas');
  var scale = 4;
  out.width = src.width * scale;
  out.height = src.height * scale;
  var ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);

  // add label text below QR
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, out.height - 60, out.width, 60);
  ctx.fillStyle = '#1B5E20';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CoEldery 85', out.width/2, out.height - 34);
  ctx.fillStyle = '#555';
  ctx.font = '16px sans-serif';
  var shortLabel = label.replace(/_/g,' ').slice(0,40);
  ctx.fillText(shortLabel, out.width/2, out.height - 12);

  var a = document.createElement('a');
  a.download = 'coeldery85_qr_' + label + '.png';
  a.href = out.toDataURL('image/png');
  a.click();
}

function copyUrl(){
  if(!_qrCurrentUrl) return;
  navigator.clipboard.writeText(_qrCurrentUrl).then(function(){
    var btn = document.getElementById('cpUrlBtn');
    btn.textContent = '✅ 已複製！';
    btn.classList.add('copied');
    setTimeout(function(){ btn.textContent='📋 複製連結'; btn.classList.remove('copied'); }, 2000);
  });
}

// ── QR Links persistence (stored in KV via API, fallback to localStorage)
function saveQrLink(){
  var url = buildQrUrl();
  if(!url){ alert('請先填寫必要欄位再儲存'); return; }
  var label = getQrLabel();
  var target = document.getElementById('qTarget').value;
  var targetLabel = {'primary':'主卡登記','family':'家庭同行卡','both':'登記主頁'}[target];
  var typeLabel = {'roadshow':'🏪 Roadshow','institution':'🏢 機構','referral':'👤 會員介紹','online':'🌐 網上'}[_qrType];
  var code = _qrType==='roadshow' ? document.getElementById('qRsCode').value.trim()
           : _qrType==='institution' ? (document.getElementById('qInstCode').value.trim()||'—')
           : _qrType==='referral' ? document.getElementById('qRefNo').value.trim()
           : document.getElementById('qOnlineCh').value;

  var entry = { type:_qrType, typeLabel:typeLabel, label:label, code:code, targetLabel:targetLabel, url:url, created:new Date().toLocaleDateString('zh-HK') };
  _qrLinks.unshift(entry);
  // persist to localStorage
  try{ localStorage.setItem('coeldery85_qr_links', JSON.stringify(_qrLinks.slice(0,50))); }catch(e){}
  renderQrLinks();
  alert('✅ 已儲存！可在下方連結記錄查看');
}

function loadQrLinks(){
  try{
    var saved = localStorage.getItem('coeldery85_qr_links');
    _qrLinks = saved ? JSON.parse(saved) : [];
  }catch(e){ _qrLinks=[]; }
  renderQrLinks();
}

function renderQrLinks(){
  var tbody = document.getElementById('qrLinksTbody');
  if(!_qrLinks.length){
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px 0;">暫無儲存連結</td></tr>';
    return;
  }
  tbody.innerHTML = _qrLinks.map(function(l,i){
    var tagClass = {'roadshow':'roadshow','institution':'institution','referral':'referral','online':'online','walk-in':'walkin'}[l.type]||'walkin';
    return `<tr>
      <td><span class="link-tag ${tagClass}">${l.typeLabel||l.type}</span></td>
      <td style="font-weight:700;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${l.label}</td>
      <td style="font-family:monospace;font-size:11px;color:#555;">${l.code||'—'}</td>
      <td style="font-size:11px;">${l.targetLabel||'—'}</td>
      <td style="font-size:11px;color:#aaa;">${l.created||'—'}</td>
      <td>
        <button class="act-btn act-edit" onclick="reloadQrLink(${i})">載入</button>
        <button class="act-btn act-kyc" onclick="copyQrLinkUrl(${i})">複製</button>
        <button class="act-btn act-deact" onclick="deleteQrLink(${i})">刪除</button>
      </td>
    </tr>`;
  }).join('');
}

function reloadQrLink(i){
  var l = _qrLinks[i];
  setQrType(l.type);
  // restore target
  var p = new URL(l.url);
  var path = p.pathname;
  var tgt = path.includes('join-family')?'family':path.includes('join')?'primary':'both';
  document.getElementById('qTarget').value = tgt;

  if(l.type==='roadshow'){
    document.getElementById('qRsCode').value = p.searchParams.get('rs')||'';
    document.getElementById('qRsLabel').value = p.searchParams.get('loc')||'';
  } else if(l.type==='institution'){
    document.getElementById('qInstName').value = p.searchParams.get('loc')||'';
    var rs2 = p.searchParams.get('rs')||'';
    document.getElementById('qInstCode').value = rs2.replace(/^inst_/,'');
  } else if(l.type==='referral'){
    document.getElementById('qRefNo').value = p.searchParams.get('ref')||'';
    document.getElementById('qRefName').value = l.label.replace(/（.*）$/,'').trim();
  } else if(l.type==='online'){
    document.getElementById('qOnlineCh').value = p.searchParams.get('ch')||'facebook';
    document.getElementById('qOnlineTag').value = p.searchParams.get('tag')||'';
  }
  updateQr();
}

function copyQrLinkUrl(i){
  navigator.clipboard.writeText(_qrLinks[i].url).then(function(){
    alert('✅ 連結已複製到剪貼簿');
  });
}

function deleteQrLink(i){
  if(!confirm('確認刪除此連結記錄？')) return;
  _qrLinks.splice(i,1);
  try{ localStorage.setItem('coeldery85_qr_links', JSON.stringify(_qrLinks)); }catch(e){}
  renderQrLinks();
}

// ── Settings ──────────────────────────────────────────────────────────────────
var _settingsDirty = false;

async function loadSettings(){
  _settingsDirty = false;
  var saveBtn = document.getElementById('saveWaBtn');
  if(saveBtn){ saveBtn.style.background='#25D366'; saveBtn.textContent='儲存'; }
  try{
    var r = await fetch('/api/admin/settings');
    var d = await r.json();
    if(!d.ok) return;
    var waNum = (d.settings && d.settings.admin_whatsapp) || '85291477341';
    document.getElementById('settingWaNum').value = waNum;
    updateSettingsPreview(waNum);
  }catch(e){ console.warn('Settings load error',e); }
}

function settingsDirty(){
  _settingsDirty = true;
  var saveBtn = document.getElementById('saveWaBtn');
  if(saveBtn){ saveBtn.style.background='#1a8a45'; }
  var waNum = document.getElementById('settingWaNum').value.replace(/\D/g,'');
  updateSettingsPreview(waNum);
}

function updateSettingsPreview(waNum){
  var preview = document.getElementById('settingPreview');
  var link = document.getElementById('settingTestLink');
  var sampleNo = 'CE85-000001';
  var msg = '你好，我剛登記了老有卡，會員編號：' + sampleNo + '，請幫我確認。';
  var num = waNum || '85291477341';
  var enc = encodeURIComponent(msg);
  if(preview) preview.textContent = msg;
  if(link) link.href = 'https://wa.me/' + num + '?text=' + enc;
}

async function saveWaNum(){
  var raw = document.getElementById('settingWaNum').value.replace(/\D/g,'');
  if(!raw || raw.length < 8){ showSettingStatus('❌ 請輸入正確的電話號碼（含國碼）', '#c00'); return; }
  var saveBtn = document.getElementById('saveWaBtn');
  saveBtn.disabled=true; saveBtn.textContent='儲存中…';
  try{
    var r = await fetch('/api/admin/settings/admin_whatsapp', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ value: raw })
    });
    var d = await r.json();
    if(d.ok){
      _settingsDirty = false;
      saveBtn.style.background='#25D366'; saveBtn.textContent='儲存';
      document.getElementById('settingWaNum').value = raw;
      updateSettingsPreview(raw);
      showSettingStatus('✅ 已儲存！WhatsApp 號碼：' + raw, '#2E7D32');
    } else {
      showSettingStatus('❌ 儲存失敗：' + (d.error||'未知錯誤'), '#c00');
    }
  }catch(e){ showSettingStatus('❌ 網絡錯誤，請再試', '#c00'); }
  finally{ saveBtn.disabled=false; saveBtn.textContent='儲存'; }
}

function showSettingStatus(msg, color){
  var el = document.getElementById('settingWaStatus');
  if(!el) return;
  el.textContent = msg;
  el.style.color = color || '#333';
  el.style.display = 'block';
  setTimeout(function(){ el.style.display='none'; }, 4000);
}

// ── Groups management
var _groups = [];
async function loadGroups(){
  var r = await fetch('/api/admin/groups');
  var d = await r.json();
  if(!d.ok) return;
  _groups = d.groups || [];
  renderGroupsList();
  renderGroupFilter(); // update members filter dropdown
}
function renderGroupsList(){
  var el = document.getElementById('groupsList');
  if(!el) return;
  if(!_groups.length){
    el.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;padding:20px;">尚未建立任何群組</div>';
    return;
  }
  el.innerHTML = _groups.map(function(g){
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f9f9f9;border-radius:7px;border:1px solid #eee;">
      <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${g.color};flex-shrink:0;"></span>
      <span style="font-weight:700;font-size:13px;flex:1;">${g.name}</span>
      <span style="font-size:11px;color:#888;flex:1;">${g.description||''}</span>
      <span style="font-size:11px;color:#555;background:#eee;padding:2px 8px;border-radius:10px;">${g.member_count} 人</span>
      <button onclick="deleteGroup(${g.id},'${g.name}')" style="background:#ffebee;color:#c62828;border:0;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;">刪除</button>
    </div>`;
  }).join('');
}
function renderGroupFilter(){
  // Update the group filter dropdown in members tab
  var sel = document.getElementById('filterGroup');
  if(!sel) return;
  sel.innerHTML = '<option value="">— 所有群組 —</option><option value="none">未分配群組</option>' +
    _groups.map(function(g){ return `<option value="${g.id}">${g.name}</option>`; }).join('');
}
async function addGroup(){
  var name = document.getElementById('newGroupName').value.trim();
  var desc = document.getElementById('newGroupDesc').value.trim();
  var color = document.getElementById('newGroupColor').value;
  if(!name){ alert('請輸入群組名稱'); return; }
  var r = await fetch('/api/admin/groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,description:desc,color})});
  var d = await r.json();
  if(d.ok){
    document.getElementById('newGroupName').value='';
    document.getElementById('newGroupDesc').value='';
    document.getElementById('groupsStatus').textContent='✅ 群組「'+name+'」已建立';
    document.getElementById('groupsStatus').style.color='#2E7D32';
    document.getElementById('groupsStatus').style.display='block';
    setTimeout(function(){document.getElementById('groupsStatus').style.display='none';},3000);
    loadGroups();
  } else {
    alert('建立失敗：'+(d.error||'未知錯誤'));
  }
}
async function deleteGroup(id, name){
  if(!confirm('確定刪除群組「'+name+'」？\n此群組下的會員將變為未分配。')) return;
  var r = await fetch('/api/admin/groups/'+id,{method:'DELETE'});
  var d = await r.json();
  if(d.ok){ loadGroups(); loadMembers(currentPage); }
  else { alert('刪除失敗'); }
}

// ── Assign group to member
async function assignGroup(memberNo, groupId){
  var body = groupId ? {group_id: parseInt(groupId)} : {group_id: null};
  var r = await fetch('/api/admin/members/'+encodeURIComponent(memberNo)+'/group',{
    method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  });
  var d = await r.json();
  if(d.ok){ loadMembers(currentPage); }
  else { alert('指派失敗：'+(d.error||'未知錯誤')); }
}

// ── Source stats
async function loadSourceStats(){
  var r = await fetch('/api/admin/source-stats');
  var d = await r.json();
  if(!d.ok) return;
  var el = document.getElementById('sourceStatsList');
  if(!el) return;
  var srcLabel = {'walk-in':'Walk-in 直接','roadshow':'Roadshow 推廣','referral':'會員介紹','whatsapp':'WhatsApp','social':'社交媒體','institution':'機構轉介','online':'網上登記'};
  if(!d.stats.length){
    el.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;padding:20px;">暫無數據</div>';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr style="background:#f5f5f5;">
      <th style="text-align:left;padding:8px 10px;font-weight:700;">來源</th>
      <th style="text-align:left;padding:8px 10px;font-weight:700;">地點/名稱</th>
      <th style="text-align:center;padding:8px 10px;font-weight:700;">總計</th>
      <th style="text-align:center;padding:8px 10px;font-weight:700;">主卡</th>
      <th style="text-align:center;padding:8px 10px;font-weight:700;">家庭</th>
      <th style="text-align:center;padding:8px 10px;font-weight:700;">首次</th>
      <th style="text-align:center;padding:8px 10px;font-weight:700;">最近</th>
    </tr></thead>
    <tbody>${d.stats.map(function(s){
      var srcName = srcLabel[s.source]||s.source;
      var loc = s.roadshow_location || s.roadshow || '—';
      var firstAt = (s.first_at||'').slice(0,10);
      var lastAt = (s.last_at||'').slice(0,10);
      return `<tr style="border-top:1px solid #f0f0f0;">
        <td style="padding:8px 10px;">${srcName}</td>
        <td style="padding:8px 10px;font-weight:600;color:#333;">${loc}</td>
        <td style="padding:8px 10px;text-align:center;font-weight:700;color:var(--forest);">${s.total}</td>
        <td style="padding:8px 10px;text-align:center;color:#555;">${s.primary_count}</td>
        <td style="padding:8px 10px;text-align:center;color:#555;">${s.family_count}</td>
        <td style="padding:8px 10px;text-align:center;font-size:11px;color:#888;">${firstAt}</td>
        <td style="padding:8px 10px;text-align:center;font-size:11px;color:#888;">${lastAt}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
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
  // Medical stats cards
  var medMap={}; (s.medStats||[]).forEach(function(x){medMap[x.status]=x.cnt;});
  document.getElementById('sMedPending').textContent=(medMap['PENDING']||0)+(medMap['SENT']||0);
  document.getElementById('sMedIssued').textContent=medMap['ISSUED']||0;
  // Source bars
  var max=Math.max(1,...(s.bySource||[]).map(x=>x.cnt));
  document.getElementById('chartSource').innerHTML=(s.bySource||[]).map(x=>`
    <div class="bar-row">
      <div class="bar-label">${srcLabel[x.source]||x.source}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.cnt/max*100)}%"></div></div>
      <div class="bar-val">${x.cnt}</div>
    </div>`).join('');
  // District bars
  var maxD=Math.max(1,...(s.byDistrict||[]).map(x=>x.cnt));
  document.getElementById('chartDistrict').innerHTML=(s.byDistrict||[]).map(x=>`
    <div class="bar-row">
      <div class="bar-label">${x.district||'未填'}</div>
      <div class="bar-track"><div class="bar-fill red" style="width:${Math.round(x.cnt/maxD*100)}%"></div></div>
      <div class="bar-val">${x.cnt}</div>
    </div>`).join('');
  // Gender bars
  var gMap={'M':'男 M','F':'女 F','X':'其他','':'未填'};
  var gColor={'M':'#1565C0','F':'#E65100','X':'#6A1B9A','':'#aaa'};
  var maxG=Math.max(1,...(s.byGender||[]).map(x=>x.cnt));
  document.getElementById('chartGender').innerHTML=(s.byGender||[]).map(x=>`
    <div class="bar-row">
      <div class="bar-label">${gMap[x.gender]||x.gender||'未填'}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.cnt/maxG*100)}%;background:${gColor[x.gender]||'#888'}"></div></div>
      <div class="bar-val">${x.cnt}</div>
    </div>`).join('');
  // Medical status bars
  var medLbl={'PENDING':'⏳ 待傳送','SENT':'📤 已傳送 NGO','ISSUED':'✅ 已發卡','DECLINED':'❌ 已拒絕'};
  var medCol={'PENDING':'#F57F17','SENT':'#1565C0','ISSUED':'#2E7D32','DECLINED':'#B71C1C'};
  var maxMed=Math.max(1,...(s.medStats||[]).map(x=>x.cnt));
  document.getElementById('chartMedical').innerHTML=(s.medStats||[]).length===0
    ? '<div style="color:#aaa;font-size:12px;padding:8px 0;">暫無醫健卡申請記錄</div>'
    : (s.medStats||[]).map(x=>`
    <div class="bar-row">
      <div class="bar-label" style="width:100px;">${medLbl[x.status]||x.status}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.cnt/maxMed*100)}%;background:${medCol[x.status]||'#888'}"></div></div>
      <div class="bar-val">${x.cnt}</div>
    </div>`).join('');
  // Monthly trend
  var months=[...(s.byMonth||[])].reverse();
  var maxM=Math.max(1,...months.map(x=>x.cnt));
  document.getElementById('chartMonth').innerHTML=months.map(x=>{
    var h=Math.round(x.cnt/maxM*100);
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px;">
      <div style="font-size:10px;color:#aaa;font-family:'Space Grotesk',sans-serif;">${x.cnt}</div>
      <div style="width:100%;background:var(--forest);border-radius:3px 3px 0 0;height:${h}px;"></div>
      <div style="font-size:9px;color:#aaa;transform:rotate(-45deg);white-space:nowrap;">${x.month}</div>
    </div>`;
  }).join('');

  // ── Roadshow / institution breakdown table
  var rsData = s.byRoadshow || [];
  var srcTagStyle = {
    'roadshow':'background:#E8F5E9;color:#1B5E20;',
    'institution':'background:#E3F2FD;color:#0D47A1;',
    'online':'background:#F3E5F5;color:#4A148C;',
    'referral':'background:#FFF3E0;color:#E65100;'
  };
  var srcTagLabel = {'roadshow':'Roadshow','institution':'機構','online':'網上','referral':'介紹'};
  if(!rsData.length){
    document.getElementById('chartRoadshow').innerHTML='<div style="color:#aaa;font-size:12px;padding:8px 0;">暫無 Roadshow / 機構場次記錄（透過 QR 連結登記後才會出現）</div>';
  } else {
    document.getElementById('chartRoadshow').innerHTML=`
      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="border-bottom:2px solid #eee;">
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;">場次代碼</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">地點 / 名稱</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">類型</th>
          <th style="text-align:right;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">今日</th>
          <th style="text-align:right;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">累計登記</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">最新登記</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">操作</th>
        </tr></thead>
        <tbody>
        ${rsData.map(function(r){
          var tagStyle = srcTagStyle[r.source]||'background:#f5f5f5;color:#666;';
          var tagLabel = srcTagLabel[r.source]||r.source||'—';
          var latestStr = (r.latest||'').slice(0,16).replace('T',' ');
          var todayBadge = r.today_cnt > 0
            ? `<span style="background:#E8F5E9;color:#2E7D32;font-weight:700;padding:1px 6px;border-radius:8px;font-size:10px;">+${r.today_cnt} 今日</span>`
            : '<span style="color:#ccc;font-size:11px;">—</span>';
          return `<tr style="border-bottom:1px solid #f5f5f5;" onmouseover="this.style.background='#f9fffe'" onmouseout="this.style.background=''">
            <td style="padding:8px 10px;font-family:monospace;font-weight:700;font-size:11px;letter-spacing:1px;color:var(--forest-deep);">${r.roadshow}</td>
            <td style="padding:8px 10px;font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.roadshow_location||'—'}</td>
            <td style="padding:8px 10px;"><span style="display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;${tagStyle}">${tagLabel}</span></td>
            <td style="padding:8px 10px;text-align:right;">${todayBadge}</td>
            <td style="padding:8px 10px;text-align:right;font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;color:var(--forest-deep);">${r.cnt}</td>
            <td style="padding:8px 10px;font-size:11px;color:#888;">${latestStr}</td>
            <td style="padding:8px 10px;">
              <button class="act-btn act-edit" style="font-size:10px;" onclick="jumpToMembersRoadshow('${r.roadshow}')">查看會員</button>
            </td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
      </div>`;
  }

  // ── Referrer leaderboard
  var refData = s.byReferrer || [];
  if(!refData.length){
    document.getElementById('chartReferrer').innerHTML='<div style="color:#aaa;font-size:12px;padding:8px 0;">暫無介紹人記錄（透過 QR 介紹連結登記後才會出現）</div>';
  } else {
    var maxRef = Math.max(1, ...refData.map(function(r){ return r.cnt; }));
    document.getElementById('chartReferrer').innerHTML=`
      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="border-bottom:2px solid #eee;">
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;width:28px;">#</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">會員編號</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">姓名</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;min-width:160px;">介紹人數</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">最新介紹</th>
          <th style="text-align:left;padding:6px 10px;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase;">操作</th>
        </tr></thead>
        <tbody>
        ${refData.map(function(r, idx){
          var pct = Math.round(r.cnt / maxRef * 100);
          var medal = idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':'';
          var latestStr = (r.latest||'').slice(0,10);
          return `<tr style="border-bottom:1px solid #f5f5f5;" onmouseover="this.style.background='#f9fffe'" onmouseout="this.style.background=''">
            <td style="padding:8px 10px;font-size:13px;">${medal||(idx+1)}</td>
            <td style="padding:8px 10px;">
              <a href="/membership/card/${r.referrer_no}" target="_blank" style="color:var(--forest);font-weight:700;font-family:monospace;">${r.referrer_no}</a>
            </td>
            <td style="padding:8px 10px;font-weight:600;">${r.name_zh||'—'}</td>
            <td style="padding:8px 10px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;background:#f0f0f0;border-radius:3px;height:12px;overflow:hidden;min-width:80px;">
                  <div style="height:100%;background:var(--forest);border-radius:3px;width:${pct}%;"></div>
                </div>
                <span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;color:var(--forest-deep);min-width:24px;">${r.cnt}</span>
                <span style="font-size:10px;color:#aaa;">人</span>
              </div>
            </td>
            <td style="padding:8px 10px;font-size:11px;color:#888;">${latestStr}</td>
            <td style="padding:8px 10px;">
              <button class="act-btn act-edit" style="font-size:10px;" onclick="jumpToMembersReferrer('${r.referrer_no}')">查看被介紹會員</button>
            </td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
      </div>`;
  }
}

// ── Dashboard jump helpers
function jumpToMembersRoadshow(rsCode){
  // switch to members tab, set search to roadshow code, reload
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-tab').forEach(function(n){ n.classList.remove('active'); });
  document.getElementById('page-members').classList.add('active');
  document.querySelectorAll('.nav-tab')[1].classList.add('active');
  document.getElementById('search').value = rsCode;
  document.getElementById('filterSource').value = '';
  loadMembers(1);
}
function jumpToMembersReferrer(refNo){
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-tab').forEach(function(n){ n.classList.remove('active'); });
  document.getElementById('page-members').classList.add('active');
  document.querySelectorAll('.nav-tab')[1].classList.add('active');
  document.getElementById('search').value = refNo;
  document.getElementById('filterSource').value = 'referral';
  loadMembers(1);
}

// ── Members list
async function loadMembers(page){
  currentPage=page||1;
  var p=new URLSearchParams({page:currentPage,limit:50});
  var s=document.getElementById('search').value.trim();
  var t=document.getElementById('filterTier').value;
  var st=document.getElementById('filterStatus').value;
  var src=document.getElementById('filterSource').value;
  var grp=document.getElementById('filterGroup').value;
  if(s)p.set('search',s); if(t)p.set('tier',t);
  if(st)p.set('status',st); if(src)p.set('source',src);
  if(grp)p.set('group_id',grp);
  var r=await fetch('/api/admin/members?'+p); var d=await r.json(); if(!d.ok)return;
  totalPages=Math.ceil(d.total/50)||1;
  document.getElementById('searchCount').textContent='共 '+d.total+' 筆記錄';
  window._members=d.members;
  document.getElementById('membersTbody').innerHTML=d.members.map(function(m,i){
    var isPrimary=m.tier==='PRIMARY';
    var familyInfo=isPrimary
      ? `<span style="cursor:pointer;color:var(--forest);font-weight:700;font-size:11px;" onclick="toggleFamily('${m.member_no}',this)">＋ 查看家庭卡</span>`
      : (m.parent_no?`<a href="/membership/card/${m.parent_no}" target="_blank" style="color:var(--ferrari);font-size:11px;font-weight:700;">${m.parent_no}</a>`:'—');
    return `
    <tr class="${m.status==='INACTIVE'?'inactive':''}" id="row-${m.member_no}">
      <td><a href="/membership/card/${m.member_no}" target="_blank" style="color:var(--forest);font-weight:700;">${m.member_no}</a></td>
      <td><span class="badge badge-${(m.status||'active').toLowerCase()}">${m.status||'ACTIVE'}</span></td>
      <td><span class="badge badge-${isPrimary?'primary':'family'}">${isPrimary?'主卡':'家庭'}</span></td>
      <td>${m.name_zh}</td>
      <td style="font-size:12px;">${m.name_en||'—'}</td>
      <td><a href="tel:+852${m.phone}" style="color:inherit;">${m.phone}</a></td>
      <td style="font-size:12px;">${m.gender==='M'?'男':m.gender==='F'?'女':m.gender==='X'?'其他':'—'}</td>
      <td style="font-size:12px;">${m.birth_year||'—'}</td>
      <td style="font-family:monospace;font-weight:700;letter-spacing:2px;">${m.id_prefix||'—'}</td>
      <td>${m.district||'—'}</td>
      <td style="font-size:11px;">${(m.role||'CoExplorery').replace('Co','').replace('ery','')}</td>
      <td><span class="badge badge-${m.kyc_status==='DONE'?'done':'pending'}">${m.kyc_status}</span></td>
      <td id="wa-cell-${m.member_no}">${m.verified_at
        ? '<span class="badge badge-done" title="'+m.verified_at.slice(0,16).replace('T',' ')+'">✅ 已驗證</span>'
        : m.wa_clicked_at
          ? '<span class="badge" style="background:#fff3e0;color:#e65100;border:1px solid #ffb74d;" title="用戶已點擊 '+m.wa_clicked_at.slice(0,16).replace('T',' ')+'">📱 待確認</span>'
          : '<span class="badge badge-pending">⏳ 未操作</span>'
      }</td>
      <td id="grp-cell-${m.member_no}">${(function(){
        var badge=m.group_name
          ? '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;background:'+(m.group_color||'#4caf50')+'">'+m.group_name+'</span> '
          : '<span style="color:#bbb;font-size:11px;">未分群</span> ';
        var opts='<option value="">— 移除群組 —</option>'+(_groups||[]).map(function(g){return '<option value="'+g.id+'"'+(m.group_id===g.id?' selected':'')+'>'+g.name+'</option>';}).join('');
        return badge+'<select style="font-size:10px;padding:1px 2px;max-width:90px;" onchange="assignGroup('+JSON.stringify(m.member_no)+',this.value)"><option value="">指派群組…</option>'+opts+'</select>';
      })()}</td>
      <td>${familyInfo}</td>
      <td style="font-size:11px;">${srcLabel[m.source]||m.source||'—'}</td>
      <td style="font-size:11px;">${m.referrer_no||'—'}</td>
      <td>${(m.expires_at||'').slice(0,10)}</td>
      <td style="font-size:11px;">${(m.created_at||'').slice(0,16).replace('T',' ')}</td>
      <td>
        <button class="act-btn act-edit" onclick="openEdit(${i})">編輯</button>
        ${m.kyc_status!=='DONE'?'<button class="act-btn act-kyc" onclick="approveKyc('+i+')">KYC✓</button>':''}
        ${!m.verified_at
          ? '<button class="act-btn" style="background:#25D366;color:#fff;" onclick="adminVerify(\''+m.member_no+'\')">WA✓</button>'
          : '<button class="act-btn" style="background:#e0e0e0;color:#555;font-size:10px;" onclick="adminUnverify(\''+m.member_no+'\')">取消驗證</button>'}
        ${m.status==='ACTIVE'?'<button class="act-btn act-deact" onclick="deactivateMember('+i+')">停用</button>':
          m.status==='INACTIVE'?'<button class="act-btn act-react" onclick="reactivateMember('+i+')">啟用</button>':''}
      </td>
    </tr>
    <tr id="family-${m.member_no}" style="display:none;background:#f9fff9;">
      <td colspan="20" style="padding:0;">
        <div id="family-content-${m.member_no}" style="padding:8px 16px 12px 40px;border-left:3px solid var(--forest);"></div>
      </td>
    </tr>`;
  }).join('');
  renderPagination();
}

function renderPagination(){
  var el=document.getElementById('pagination');
  var pages=[]; for(var i=1;i<=Math.min(totalPages,20);i++)pages.push(i);
  el.innerHTML=pages.map(p=>`<button class="${p===currentPage?'active':''}" onclick="loadMembers(${p})">${p}</button>`).join('');
}

async function toggleFamily(parentNo, btn){
  var row=document.getElementById('family-'+parentNo);
  var content=document.getElementById('family-content-'+parentNo);
  if(row.style.display!=='none'){
    row.style.display='none';
    btn.textContent='＋ 查看家庭卡';
    return;
  }
  btn.textContent='載入中…';
  var r=await fetch('/api/members/'+encodeURIComponent(parentNo)+'/family');
  var d=await r.json();
  if(!d.ok||!d.family||d.family.length===0){
    content.innerHTML='<span style="color:#aaa;font-size:12px;">此主卡暫無家庭同行卡</span>';
  } else {
    content.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--forest);letter-spacing:1px;margin-bottom:6px;">家庭同行卡（'+d.family.length+'張）</div>'
      +d.family.map(function(f){
        return `<div style="display:flex;gap:16px;align-items:center;padding:5px 0;border-bottom:1px solid #e8f5e9;font-size:12px;">
          <a href="/membership/card/${f.member_no}" target="_blank" style="color:var(--forest);font-weight:700;min-width:130px;">${f.member_no}</a>
          <span style="font-weight:700;min-width:80px;">${f.name_zh}</span>
          <span style="color:#888;min-width:120px;">${f.name_en||''}</span>
          <span style="color:#555;min-width:80px;">${f.phone}</span>
          <span class="badge badge-${f.kyc_status==='DONE'?'done':'pending'}" style="font-size:10px;">${f.kyc_status}</span>
          <span style="color:#aaa;font-size:11px;">${(f.created_at||'').slice(0,10)}</span>
        </div>`;
      }).join('');
  }
  row.style.display='';
  btn.textContent='－ 收起家庭卡';
}

// ── Actions
async function approveKyc(i){
  var no=window._members[i].member_no;
  if(!confirm('確認標記 '+no+' KYC 為 DONE？'))return;
  await fetch('/api/admin/members/'+no,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kyc_status:'DONE'})});
  loadMembers(currentPage);
}
async function adminVerify(no){
  if(!confirm('確認手動標記 '+no+' WA 驗證完成？'))return;
  var r=await fetch('/api/admin/members/'+encodeURIComponent(no)+'/verify',{method:'POST'});
  var d=await r.json();
  if(d.ok){ loadMembers(currentPage); }
  else{ alert('操作失敗：'+(d.error||'未知錯誤')); }
}
async function adminUnverify(no){
  if(!confirm('確認取消 '+no+' 的 WA 驗證？'))return;
  var r=await fetch('/api/admin/members/'+encodeURIComponent(no)+'/verify',{method:'DELETE'});
  var d=await r.json();
  if(d.ok){ loadMembers(currentPage); }
  else{ alert('操作失敗：'+(d.error||'未知錯誤')); }
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
  document.getElementById('eBirthYear').value=m.birth_year||'';
  document.getElementById('eIdPrefix').value=m.id_prefix||'';
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
  // show parent_no for FAMILY cards (read-only)
  var parentField=document.getElementById('eParentField');
  if(m.tier==='FAMILY'&&m.parent_no){
    document.getElementById('eParentNo').value=m.parent_no;
    parentField.style.display='';
  } else {
    parentField.style.display='none';
  }
  document.getElementById('editModal').classList.add('show');
}
function closeModal(){ document.getElementById('editModal').classList.remove('show'); }
document.getElementById('editModal').addEventListener('click',function(e){ if(e.target===this)closeModal(); });

async function saveEdit(){
  var no=document.getElementById('editNo').value;
  var byRaw=document.getElementById('eBirthYear').value;
  // Validate phone if changed
  var rawPhone=document.getElementById('ePhone').value.replace(/\D/g,'');
  if(rawPhone){
    var pErr=validateHKPhone(rawPhone);
    if(pErr){alert('電話號碼有誤：'+pErr);return;}
  }
  var body={
    name_zh:document.getElementById('eNameZh').value,
    name_en:document.getElementById('eNameEn').value,
    phone:rawPhone||document.getElementById('ePhone').value,
    gender:document.getElementById('eGender').value,
    birth_year:byRaw?parseInt(byRaw):null,
    id_prefix:document.getElementById('eIdPrefix').value.toUpperCase(),
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
  document.getElementById('filterGroup').value='';
  loadMembers(1);
}

function exportCsv(){
  var p=new URLSearchParams({export:'csv',limit:9999});
  var s=document.getElementById('search').value.trim();
  var t=document.getElementById('filterTier').value;
  var st=document.getElementById('filterStatus').value;
  var src=document.getElementById('filterSource').value;
  var grp=document.getElementById('filterGroup').value;
  if(s)p.set('search',s); if(t)p.set('tier',t);
  if(st)p.set('status',st); if(src)p.set('source',src);
  if(grp)p.set('group_id',grp);
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
    return `<tr>
      <td style="font-size:11px;color:#aaa;">#${m.id}</td>
      <td><a href="/membership/card/${m.member_no}" target="_blank" style="color:var(--forest);font-weight:700;">${m.member_no}</a></td>
      <td style="font-weight:700;">${m.name_zh_full}</td>
      <td style="font-size:12px;letter-spacing:1px;">${m.name_en_full}</td>
      <td style="font-family:monospace;font-size:15px;font-weight:700;letter-spacing:4px;">${m.hkid_prefix}</td>
      <td><a href="tel:+852${m.phone}">${m.phone}</a></td>
      <td><span style="color:${col};font-weight:700;font-size:12px;">${lbl}</span></td>
      <td style="font-size:11px;">${(m.applied_at||'').slice(0,16).replace('T',' ')}</td>
      <td>
        ${m.status==='PENDING'?'<button class="act-btn act-kyc" onclick="markMedSent('+i+')">標記已傳送</button>':''}
        ${m.status==='SENT'?'<button class="act-btn act-react" onclick="markMedIssued('+i+')">標記已發卡</button>':''}
      </td>
    </tr>`;
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
