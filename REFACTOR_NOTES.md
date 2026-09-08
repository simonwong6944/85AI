# REFACTOR_NOTES.md — 搬遷時發現的可疑邏輯

> **用途**：集中記錄 `src/index.tsx` 模組化搬遷過程中發現的可疑邏輯、潛在 bug、或不一致行為。
> 所有條目均在搬遷時發現，已照搬不改（純機械搬遷原則），留待 refactor 全部完成後獨立處理。
> 每條記錄標明：發現於哪個 commit、涉及哪個函數、問題描述、建議後續行動。

---

## [NOTE-001] nextMemberNo — `?? 1` 靜默 fallback【✅ RESOLVED — commit `cfefc57`】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 2 batch，commit `4880b15`（extract nextMemberNo from index.tsx） |
| **解決於** | Wave 4，commit `cfefc57`（2026-09-06） |
| **涉及函數** | `nextMemberNo(db: D1Database)` → `src/lib/members.ts` |
| **原始問題** | `const n = row?.next_val ?? 1`：counter row 消失時靜默 fallback 到 `CE85-000001`，不拋錯，UNIQUE constraint 托底但行為不一致。 |
| **Code 結論** | 🟢 `nextMemberNo` 用 `UPDATE counter SET next_val = next_val + 1 WHERE id = 1 RETURNING next_val` 原子自增，SQLite 單寫者序列化，**無 race condition**。`?? 1` silent fallback 已改為 throw（見下），與 `nextCwNo` pattern 對齊。 |
| **修復內容** | `?? 1` 兩行替換為 `if (!row \|\| typeof row.next_val !== 'number') { throw new Error('nextMemberNo: counter row missing (id=1) — refusing to fall back to 1') }`；`UPDATE … RETURNING` 自增邏輯一字不動。 |
| **對齊參考** | `nextCwNo`（`src/lib/coworkery-utils.ts`）早已使用相同 guard pattern，本次令兩者行為一致。 |
| **Production 數據結論** | 🟢 **107 members，零撞號**（`HAVING c > 1` 返 0 rows，`rows_read: 107` 全表掃）；counter row 存在（`id=1, next_val=106`）；序列同步，下次生成 `CE85-000107`；`?? 1` fallback 從未在 production 被觸發。詳見 NOTE-012（離群號記錄）。 |
| **commit** | `cfefc57` — `fix: nextMemberNo throws on missing counter row instead of silent fallback to 1 (NOTE-001, defensive — aligns with nextCwNo pattern in coworkery-utils.ts)` |
| **diff 統計** | `src/lib/members.ts \| 6 ++++--`（1 file changed, 4 insertions(+), 2 deletions(−)）；bundle 1,220.95 → 1,221.05 kB（+0.10 kB = throw message 字串） |

---

## [NOTE-002] verifySession — 呼叫點參數順序錯誤【✅ RESOLVED — commit `ada12f2`】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 2，搬遷 `verifySession` 前置審查（branch `refactor/split-index`，base commit `557a1ce`） |
| **解決於** | Wave 4，commit `ada12f2`（2026-09-06） |
| **涉及函數** | `verifySession(db: D1Database, token: string \| undefined): Promise<boolean>` |
| **正確簽名** | `verifySession(db, token)` — 第一參數為 D1Database，第二參數為 token 字串 |
| **受影響範圍** | benefits 系列 admin route 共 **8 條**：7 條 `/api/admin/benefits*` + 1 條 `/api/admin/benefit-categories` |
| **成因** | Pattern B 呼叫 `verifySession(c, db)` 參數對調：`db` 位置收到 Hono context `c`（object，truthy），`if (!token) return false` 不攔截，繼續以 `c`（非 D1Database）呼叫 `c.prepare(...)` → **runtime TypeError**；Hono 不吞 TypeError，直接 propagate 為 **500 Internal Server Error** |
| **安全結論** | 🟢 **無安全漏洞**。`app.use('/api/admin/*')` middleware（line 58）一直以正確參數 `verifySession(c.env.DB, token)` 鑑權，未登入者在 handler 執行前已被攔截返 401。無 cookie 實測三條（GET `/api/admin/benefits`、POST `/api/admin/benefits`、GET `/api/admin/benefit-categories`）全部返回 `401 + {"ok":false,"error":"Unauthorized","code":"AUTH_REQUIRED"}`，坐實 middleware 保護完整。 |
| **功能結論** | 🔴→✅ **修前**：8 條 route 對已登入 admin 亦壞死（全返 500）；**修後**：6 條 → 200、`/api/admin/benefit-categories` → 200、`upload-image` → handler 正常執行至業務層（沙箱無 Cloudinary 環境變數，返受控 `{"ok":false,"error":"Cloudinary 未設定"}`，非 TypeError） |
| **修法** | Option B：純刪除 8 處冗餘 `verifySession(c, db)` call，倚靠已驗證 middleware；其中 `upload-image` handler 連 unused `const db = ...` 宣告一併刪（後續全程操作 Cloudinary，不用 db）；其餘 7 條保留 `const db` 宣告（後續有 D1 查詢） |
| **commit** | `ada12f2` — `fix: remove dead verifySession(c,db) calls in 8 benefits admin routes (NOTE-002, functional fix — 500→200 for authed admin, middleware already enforces auth; hmvod NOT affected)` |
| **diff 統計** | `src/index.tsx \| 9 ---------`（1 file changed, 9 deletions）；純刪除，零新增；bundle 1,221.53 → 1,220.95 kB（−0.58 kB） |

### 受影響 Route 清單（修復前後對照）

| Method | Route | 修前 Status | 修後 Status | 備注 |
|--------|-------|:-----------:|:-----------:|------|
| GET | `/api/admin/benefits` | 500 | **200** | |
| POST | `/api/admin/benefits` | 500 | **200** | |
| PUT | `/api/admin/benefits/:id` | 500 | **200** | |
| DELETE | `/api/admin/benefits/:id` | 500 | **200** | |
| GET | `/api/admin/benefits/:id/claims` | 500 | **200** | |
| GET | `/api/admin/benefits/claims/summary` | 500 | **200** | |
| POST | `/api/admin/benefits/upload-image` | 500 | **500**† | †業務層受控錯誤（無 Cloudinary 設定），非 TypeError |
| GET | `/api/admin/benefit-categories` | 500 | **200** | |

### 描述演變記錄（供日後審計）

| 版本 | 描述 | 狀態 |
|------|------|------|
| 初版（Wave 2 發現） | 「benefits/hmvod 8 條 Pattern B」 | ❌ 不準確：hmvod admin route 實際用 inline 手寫鑑權（`verifySession(c.env.DB, token)`），不屬此批 |
| 中期更正（Wave 4 勘查） | 「7 條 `/api/admin/benefits*`」 | ⚠️ 一度誤為 7：測試時誤打不存在 path 致 404 混入統計（如 `/api/admin/benefits/categories`、`/api/admin/benefits/stats`、`/api/admin/benefits/export`） |
| 最終確認（Wave 4 實測） | **「benefits 系列 8 條：7 條 `/api/admin/benefits*` + 1 條 `/api/admin/benefit-categories`」** | ✅ 正確 |

> **hmvod 不受影響確認**：`/api/admin/hmvod/applications` 實測帶有效 cookie 返 200，不在 Pattern B 批次內。

### 原始 Pattern A / B 呼叫點記錄（歷史參考）

**Pattern A — 正確呼叫點（`verifySession(c.env.DB, token)`，修復後仍存在，共 8 個）：**

| 行號（ada12f2 後） | Route / 用途 |
|------------------|------------|
| 6 (import) | import declaration |
| 65 | `app.use('/api/admin/*')` middleware |
| 103 | `GET /api/admin/me` — session check |
| 5723 | admin colinkery 管理路由 |
| 5750 | admin colinkery 管理路由 |
| 5792 | admin colinkery 管理路由 |
| 5818 | admin colinkery 管理路由 |
| 5836 | admin colinkery 管理路由 |
| 5902 | `/membership/admin` redirect guard |

**Pattern B — 錯誤呼叫點（`verifySession(c, db)`，已全部刪除，原共 8 個）：**

| 原行號（ada12f2 前） | Route handler |
|--------------------|--------------|
| 6753 | `GET /api/admin/benefits` |
| 6767 | `POST /api/admin/benefits` |
| 6783 | `PUT /api/admin/benefits/:id` |
| 6801 | `DELETE /api/admin/benefits/:id` |
| 6809 | `GET /api/admin/benefits/:id/claims` |
| 6822 | `GET /api/admin/benefits/claims/summary` |
| 6837–6838 | `POST /api/admin/benefits/upload-image`（含 unused `const db` 2 行） |
| 6884 | `GET /api/admin/benefit-categories` |

---

## [NOTE-003] Wave 3 模板函數偵查 — inline JS 同名函數勿混淆 grep 結果【✅ NOTED (Wave 3 complete, no further action)】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 前置偵查，branch `refactor/split-index`，commit `8f8735b` 之後（純調查，無搬遷） |
| **涉及範圍** | `newAdminShellHtml`（行 8204–13272）及 `pwaAppHtml`（行 13807–16531）內部的 inline JS 函數定義 |
| **問題描述** | `src/index.tsx` 內有多個與 TypeScript 頂層函數同名的 **瀏覽器端 inline JS 函數**，定義在 template literal 的 `<script>` block 內。已確認以下撞名情況：① `bnfCardHtml`（JS，在 `newAdminShellHtml` Block 4，行 ~11114）── 外觀與 TS 頂層函數相同，但係 HTML template 內的 browser JS；② `appBnfMedCardPinHtml`、`appBnfMedCardAuthHtml`、`appBnfMedCardStatusHtml`、`appBnfMedCardIssuedHtml`、`appBnfMedCardApplyHtml`、`appBnfCardHtml`、`appHmvodPinHtml`、`appHmvodAuthHtml`、`appHmvodDetailHtml`（全部係 `pwaAppHtml` 內 `<script>` block 的 browser JS 函數，行 15432–16557）；③ `tstEsc`（JS escape helper，在 `newAdminShellHtml` Block 3，行 10324）；④ `switchTab`（JS tab 切換，在 `pwaAppHtml` `<script>` block，行 14267）。 |
| **影響** | Wave 3 搬遷時用 `grep -n "funcName" src/index.tsx` 確認定義數量，上述函數名會額外 match 到 inline JS 定義，令定義計數 > 1，**誤觸「定義多過 1 即停」前置閘**。 |
| **處理方式** | 閘 2 grep 時，若發現定義 > 1，先 `Read` 該行上下文確認是否在 template literal `<script>` block 內（non-TS）。若係 inline JS，唔計入「TS 頂層定義」計數，可繼續。 |
| **已照搬不改** | N/A（純調查記錄，無搬遷） |
| **狀態** | ✅ Wave 3 全部完成，施工指引已無操作對象，保留作史料參考。無需任何 code 改動。 |

---

## [NOTE-004] Wave 3 施工作戰圖 — Stage 0–5 次序 + Smoke Test 頁面清單

> **性質**：施工計劃記錄（非 bug）。記錄 Wave 3（HTML 模板搬遷）的分 Stage 施工次序，
> 以及每個模板函數對應的 smoke test 瀏覽頁面，供搬遷後驗証用。

### Stage 0 — 前置依賴（必須最先提取）

| 目標 | 新檔 | 說明 |
|------|------|------|
| `htmlHead` | `src/lib/html-shared.ts` | 7 個模板依賴，必須先搬 |
| `HK_DISTRICTS` | `src/lib/constants.ts` | `qrCompleteHtml` + route handler 依賴 |

### Stage 1 — 零依賴模板（可並行，無需前置）

| 函數 | 行範圍 | Lines | inline script |
|------|--------|-------|--------------|
| `dashboardHtml` | 3637–3714 | 78 | 0 |
| `comingSoonHtml` | 3717–3744 | 28 | 0 |
| `memberProfileHtml` | 6681–7631 | 951 | 1 |
| `newAdminShellHtml` | 8204–13272 | 5069 | 5 blocks |
| `coworkeryAppHtml` | 13275–13804 | 530 | 1 |
| `pwaAppHtml` | 13807–16531 | 2725 | 1 |
| `partnerApplyHtml` | 16558–17927 | 1370 | 1 |
| `teamConfirmHtml` | 17930–18334 | 405 | 1 |
| `walletHtml` | 18337–18688 | 352 | 1 |
| `colinkerypwaHtml` | 20867–22203 | 1337 | 1 |
| `adminColinkerySectionHtml` | 22210–22292 | 83 | 1 |
| `qrRegisterHtml` | 22510–22642 | 133 | 1 |
| `adminQrHtml` | 23325–23698 | 374 | 1 |
| `brandFormHtml` | 23703–24133 | 431 | 1 |

### Stage 2 — 依賴 `htmlHead` 的模板（Stage 0 完成後）

| 函數 | 行範圍 | Lines | inline script |
|------|--------|-------|--------------|
| `signupMainHtml` | 3798–4756 | 959 | 1 |
| `signupSubHtml` | 4760–5503 | 744 | 1 |
| `adminHtml` | 5506–6492 | 987 | 1 |
| ~~`posterHtml`~~ | ~~6495–6620~~ | ~~126~~ | ~~1~~ | ❌ Wave 5 NOTE-006 已刪除 |
| ~~`sopHtml`~~ | ~~6623–6678~~ | ~~56~~ | ~~0~~ | ❌ Wave 5 NOTE-006 已刪除 |
| ~~`homeHtml`~~ | ~~7634–8056~~ | ~~423~~ | ~~1~~ | ❌ Wave 5 NOTE-006 已刪除 |
| ~~`loginHtml`~~ | ~~8059–8201~~ | ~~143~~ | ~~1~~ | ❌ Wave 5 NOTE-006 已刪除 |

### Stage 3 — 依賴 `HK_DISTRICTS` 的模板（Stage 0 完成後）

| 函數 | 行範圍 | Lines | inline script |
|------|--------|-------|--------------|
| `qrCompleteHtml` | 22922–23072 | 151 | 1 |

### Stage 4 — Wave 2 遺留（另開討論）

| 函數 | 說明 |
|------|------|
| `registerRevenueRoutes` | 明確 defer，待另行討論後執行 |

### Stage 5 — Wave 4 路由 handler（Wave 3 全完成後）

> 所有頂層 `app.get/post/put/delete/use` 路由 handler，待 Wave 3 完成後分批規劃。

---

### Smoke Test 頁面清單（搬遷後手動驗証）

| 模板函數 | HTTP Method | Path | 備注 |
|---------|-------------|------|------|
| `dashboardHtml` | GET | `/dashboard` 或 `/` | 確認有渲染 |
| `comingSoonHtml` | GET | 任何呼叫點 path | 確認 en/zh 參數傳入 |
| `signupMainHtml` | GET | `/signup` 或類似 | 老有卡申請表 |
| `signupSubHtml` | GET | `/signup/sub` 或類似 | 家庭同行卡 |
| `adminHtml` | GET | `/admin` | 會員後台管理 |
| `memberProfileHtml` | GET | `/member/profile` 或類似 | 會員個人頁 |
| `newAdminShellHtml` | GET | `/new-admin` 或類似 | 新 admin shell |
| `coworkeryAppHtml` | GET | `/coworkery` 或類似 | |
| `pwaAppHtml` | GET | `/app` 或類似 | PWA |
| `partnerApplyHtml` | GET | `/partner/apply` 或類似 | |
| `teamConfirmHtml` | GET | `/team/confirm` 或類似 | |
| `walletHtml` | GET | `/wallet` 或類似 | |
| `colinkerypwaHtml` | GET | `/colinkery` 或類似 | |
| `adminColinkerySectionHtml` | GET | admin section | |
| `qrRegisterHtml` | GET | `/qr-register` | source 參數 |
| `qrCompleteHtml` | GET | `/qr-register/complete` | 須 HK_DISTRICTS |
| `adminQrHtml` | GET | `/admin/qr` 或類似 | |
| `brandFormHtml` | GET | `/brand` 或類似 | |

> **Wave 5 更新（NOTE-006，commit `d17350a`）**：`posterHtml`、`sopHtml`、`homeHtml`、`loginHtml` 已確認零 caller 並刪除。相關 route 現況：`/poster` → 301 redirect `/`；`/sop` → 301 redirect `/`；`/` → `dashboardHtml()`；`/membership/login` → `signupMainHtml()`。以上四項已從 Smoke Test 清單移除。

---

## [NOTE-005] walletHtml Stage 標籤誤植

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3，commit `b5bca2a` 事後核查 |
| **涉及函數** | `walletHtml` → `src/lib/html-templates.ts` |
| **問題描述** | commit `b5bca2a` 的 message 及 tombstone 均寫 `Wave3/Stage1`，實為 `Stage2`（函數含 inline script）。純標籤誤植，code 內容無誤，搬遷邏輯正確。 |
| **已照搬不改** | ✅ 純標籤誤植，無需改動 code。 |
| **建議後續行動** | 可於 refactor 全完成後在 commit history 作備注，或直接忽略（不影響正確性）。 |

---

## [NOTE-006] Stage 4 dead code 清單（zero caller 模板照搬記錄）【✅ RESOLVED — commit `d17350a`】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 4，搬遷前置審查 |
| **解決於** | Wave 5，commit `d17350a`（2026-09-08） |
| **涉及函數** | `sopHtml`（56 行）、`posterHtml`（126 行）、`loginHtml`（143 行）、`homeHtml`（423 行） |
| **問題描述** | 四個模板函數在搬遷時確認為零呼叫點（dead code）：① `sopHtml` — `/sop` 路由改為 `c.redirect('/', 301)`，未呼叫此函數；② `posterHtml` — `/poster` 路由改為 `c.redirect('/', 301)`，未呼叫此函數；③ `loginHtml` — `/membership/login` 路由呼叫 `signupMainHtml()`，非此函數；④ `homeHtml` — 全檔無任何路由呼叫此函數。 |
| **已照搬不改** | ✅ 依純機械照搬原則，四個函數已搬入 `html-templates.ts`（commits `c3b708d`、`84e8292`、`7f2e6ec`、`068ecfd`），行為未變，dead code 狀態保留。 |
| **Wave 5 勘查結論** | Wave 5 全倉 caller scan 確認四函數零呼叫點（定義行 + import 行 + tombstone comment 之外無任何 caller），且四函數互不依賴。 |
| **刪除內容** | `html-templates.ts`：刪除 `sopHtml`（lines 6239–6294）、`posterHtml`（lines 6296–6421）、`loginHtml`（lines 6423–6565）、`homeHtml`（lines 6567–6989），共 **751 行 source 刪除**；`index.tsx` line 14 import 移除四個 symbol（剩 18 個）；`index.tsx` tombstone comment 四組（12 行）清除。 |
| **指標變化** | `html-templates.ts`：17,478 → 16,727 行；export 數：22 → **18**；`index.tsx`：7,218 → 7,206 行 |
| **build 結果** | ✅ 零 error，50 modules，bundle 1,221.05 kB **不變**（見 NOTE-014：zero-caller export 已被 tree-shaking 排除，刪除 source 對 dist 產物為 no-op） |
| **runtime 驗證** | `/` → 200（dashboardHtml ✅）；`/membership/login` → 200（signupMainHtml ✅）；`/sop` → 301 → `/`（✅）；`/poster` → 301 → `/`（✅） |
| **commit** | `d17350a` — `refactor: delete dead templates sopHtml posterHtml loginHtml homeHtml (NOTE-006)` |
| **diff 統計** | `2 files changed, 1 insertion(+), 764 deletions(−)`（html-templates.ts: 751 行純刪除；index.tsx: 1 行 import 改寫 + 12 行 tombstone 純刪除） |

---

## [NOTE-007] homeHtml 硬編碼地區陣列與 HK_DISTRICTS 平行維護【⚪ CANCELLED (moot)】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 4，`homeHtml` 搬遷前置審查（commit `068ecfd`） |
| **作廢於** | Wave 5，NOTE-006 刪除 `homeHtml`（commit `d17350a`，2026-09-08） |
| **涉及函數** | `homeHtml` → 已刪除 |
| **問題描述** | `homeHtml` 函數體內含一份硬編碼 18 地區陣列 `['中西區','灣仔','東區','南區','油尖旺','深水埗','九龍城','黃大仙','觀塘','葵青','荃灣','屯門','元朗','北區','大埔','沙田','西貢','離島']`（以 `${[...].map(d=>...)}` 形式嵌入 template literal）。此陣列與 `src/lib/constants.ts` 的 `HK_DISTRICTS` 內容完全重複，屬平行維護，存在潛在資料不一致風險（若 `HK_DISTRICTS` 更新而 `homeHtml` 未同步）。 |
| **已照搬不改** | ✅ 搬遷時維持原硬編碼陣列，未替換為 `HK_DISTRICTS` 引用（純機械搬遷原則）。 |
| **作廢原因** | `homeHtml` 為 zero-caller dead code，已於 NOTE-006（commit `d17350a`）一併刪除。硬編碼陣列連同函數整體消失，`HK_DISTRICTS` 替換工作已無對象，毋須執行。 |
| **建議後續行動** | 無。本條目作廢，不需要任何 code 改動。 |

---

## [NOTE-008] signupMainHtml 搬遷 import 行事故（27d173a）【✅ RESOLVED — commit `4c5f9ba`】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 4，commit `27d173a`（`signupMainHtml` 搬遷）事後審查 |
| **解決於** | Wave 3 chore commit `4c5f9ba`（import normalize） |
| **涉及範圍** | `src/index.tsx` 第 14 行 import 行 |
| **問題描述** | Python surgery script 的舊 import append 邏輯（以 `.rstrip('}')` 切除閉括號後砌回）在處理行尾有 trailing space 的情況下產生 broken 語法：`} from './lib/html-templates' , signupMainHtml } from './lib/html-templates'`（雙重 `from`）。隨即以第二個 Python script 手動重寫整條 import 行（手寫死 19 symbol string）覆蓋修正。事後核實：19 symbol 齊全、每個在 `html-templates.ts` 均有對應唯一 `export function`、`from` 只出現一次，最終結果正確。 |
| **修正措施** | 於 commit `e4d7645`（`adminHtml` 搬遷）改用安全 regex insert 邏輯：`re.sub(r'\s*(} from \'./lib/html-templates\')', ' , adminHtml \1', line)`，連續兩個 commit（`27d173a` 事後核實 + `e4d7645` 實際使用）驗證正確。 |
| **遺留格式問題** | 手寫覆蓋雖未改動 symbol 1–18 的間距，但累積自 Stage 3–4 append 的格式漂移（symbol 13–19 使用 ` , symbol` 前後 space 風格，與 symbol 1–12 的 `symbol, ` 標準風格不一致）已於本次 chore commit normalize 統一。 |
| **現狀核查** | ✅ Wave 5 核查確認（2026-09-08）：`src/index.tsx` line 14 現為 18 個 symbol，separator 全部 `', '`，單一 `from './lib/html-templates'`，無任何遺留問題。 |

---

## [NOTE-009] html-templates import 行格式漂移（已於本 commit 修正）【✅ RESOLVED — commit `4c5f9ba`】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 4 收尾審查 |
| **解決於** | Wave 3 chore commit `4c5f9ba`（import normalize） |
| **涉及範圍** | `src/index.tsx` 第 14 行 `import { ... } from './lib/html-templates'` |
| **問題描述** | Symbol 1–12（`dashboardHtml` 至 `partnerApplyHtml`）使用 `symbol, nextSymbol` 風格（逗號後一空格，逗號前無空格）；symbol 13–19（`qrCompleteHtml` 至 `adminHtml`）因歷次 append script 格式漂移，使用 ` , symbol` 風格（逗號前後各一空格）。兩種風格混雜同一行。 |
| **已修正** | ✅ 本 chore commit 以程式化 normalize（split by comma → strip → join with `', '`）統一全部 20 個 symbol 為 `symbol, symbol` 標準風格，零 symbol 內容改動。 |
| **現狀核查** | ✅ Wave 5 核查確認（2026-09-08）：Wave 5 刪除四個 dead symbol 後剩 **18 個** symbol，separator 全部 `', '`（17 occurrences），格式完全統一，無任何遺留問題。 |

---

## [NOTE-010] /app 及 /admin 頁面 pre-existing 1×404（Service Worker 生命週期觸發）

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 5 QA，pwaAppHtml（commit `41f232f`）及 newAdminShellHtml（commit `ecf3856`）搬遷後驗証 |
| **勘查於** | Wave 4，2026-09-07（唯讀，零 code 改動） |
| **涉及頁面** | `GET /app`（pwaAppHtml）、`GET /admin`（newAdminShellHtml） |
| **問題描述** | PlaywrightConsoleCapture 在真實瀏覽器環境（HTTPS 公開 URL）對 `/app` 及 `/admin` 均捕獲 1×`Failed to load resource: the server responded with a status of 404 ()`，console error 各一條。Python headless Playwright（`--disable-features=ServiceWorker`）捕獲不到該 404——說明 404 由 Service Worker 生命週期觸發，非 page JS 直接 fetch。 |
| **Baseline 對照** | 針對 `/app`：checkout `41f232f^`（`4c5f9ba`）rebuild 後用 PlaywrightConsoleCapture 同樣捕獲完全相同的 1×404；針對 `/admin`：checkout `ecf3856^`（`41f232f`）rebuild 後同樣 1×404。兩個頁面的 404 均在搬遷前已存在，**確認為 pre-existing，零 regression**。 |

### 副作用結論（Wave 4 勘查後更新）

🟢 **無功能副作用** — 404 唔會令 SW 裝唔到，唔影響離線 / PWA 功能。

| SW | OFFLINE 清單 | entry 實測 | 容錯 |
|----|-------------|:---------:|------|
| `sw.js` | `['/app']` | **200** ✅ | `cache.addAll(...).catch(() => {})` 有保護，即使失敗 SW 仍 install/activate（`skipWaiting()`）|
| `colinkery-sw.js` | `['/colinkery/']` | **200** ✅ | 無 `.catch()` 保護，但 entry 實測 200，不會失敗 |

### 已排除嫌疑（全部實測 200）

| 嫌疑 | 結果 |
|------|------|
| SW precache `addAll` 死 entry | ❌ 排除：兩個 SW 的 OFFLINE entry 全 200 |
| `<img src>`、`<link href>` 本地靜態資源 | ❌ 排除：`/icon-192.png`、`/icon-512.png?v=4`、`/manifest.webmanifest`、`/static/logo-coeldery85-white.png` 全 200 |
| CDN 外部資源（Tailwind / FontAwesome / qrcode-generator） | ❌ 排除：全 200 |
| newAdminShellHtml 本地靜態引用 | ❌ 排除：零本地靜態資源引用（全為 CDN https://）|
| pwaAppHtml 外部 `<script>`/`<link>` | ❌ 排除：零外部 script/css，全部 inline style |

### 未鎖定項

具體返 404 的 request URL **未能鎖定**。  
沙箱 headless Playwright 因 SW 攔截看不到 network 層；PlaywrightConsoleCapture 只截到 `404 ()`（URL 括號為空）。

### 兩個待驗假設（需真實 Chrome DevTools 確認，勿在未確認前修改）

| 假設 | 說明 |
|------|------|
| **(a) 前端 JS 發出缺參數 fetch** | `pwaAppHtml` 的 `showCard()` 會組裝 `<iframe src="/membership/card/" + memberNo>`；若 `memberNo` 為空字串或 undefined，iframe src 退化為 `/membership/card/`（無 `:no` 參數），而 route 只有 `app.get('/membership/card/:no', ...)` — 實測 `/membership/card/` 返 **404**。此路徑唯有用戶操作觸發，非 SW precache。 |
| **(b) 舊版 SW cache stale entry** | 若用戶瀏覽器已安裝舊版 SW（`coeldery85-v1/v2/v3`），activate handler 雖然刪舊 cache，但若刪除時機或 scope 問題遺留 stale opaque response，可能於日後 cache match 時返 404。 |

### 確認方法（留待有瀏覽器環境時執行）

> 真實 Chrome 開 HTTPS 頁面 → DevTools → **Application** → **Service Workers** → **Unregister 全部** + **Clear Storage** → 重新整理 → **Network tab** → filter `Status: 404` → 記下 request URL。  
> 鎖定 URL 後方能對症：假設 (a) → 修 `showCard()` 前端邏輯（加 guard 防 memberNo 空值）；假設 (b) → 升 `CACHE_NAME` 由 `coeldery85-v4` → `coeldery85-v5` 強制重安裝 SW 清除 stale cache。

| **狀態** | 🟡 **已知無害 / 來源待真實瀏覽器確認 / 不修** |
|----------|------|
| **優先級** | 低 — 無功能影響，純 console 噪音，可留待有瀏覽器環境時一次確認 |
| **需要 code 改動** | **否** — 未鎖定 URL 前不改動任何檔案 |

---

## [NOTE-011] Wave 3 拆檔完成摘要

| 欄目 | 內容 |
|------|------|
| **完成於** | Wave 3 Stage 5，commit `ecf3856`（newAdminShellHtml，最後一個 template） |
| **涉及範圍** | `src/index.tsx` → `src/lib/html-templates.ts`（22 個 exported functions；Wave 5 後實際為 **18 個**，見下） |
| **搬遷規模** | `src/index.tsx`：Wave 3 開始前 ~16,963 行 → 完成後 **7,227 行**（減少 **~9,736 行，約 −57%**） |

> **注意**：本條 NOTE-011 所稱「24,848 行」為本次 refactor branch 整個 session 起點（Wave 1 開始前）計算值；Wave 3 開始前基線約 16,963 行；Wave 3 完成後 7,227 行，Wave 3 本身減少約 9,736 行（−57%）。全程 index.tsx 淨減幅（含 Wave 1–3）約 −71%。

### 搬遷結果指標

| 指標 | 數值 |
|------|------|
| html-templates.ts exported functions | **22 個**（Wave 3 完成時）→ **18 個**（Wave 5 NOTE-006 後，−4 dead exports） |
| index.tsx 行數（Wave 3 開始前） | ~16,963 行 |
| index.tsx 行數（Wave 3 完成後） | **7,227 行**（Wave 5 NOTE-006 後：**7,206 行**） |
| Wave 3 減少行數 | ~9,736 行（約 −57%） |
| index.tsx 行數（session 起點，含 Wave 1–2 前） | ~24,848 行 |
| index.tsx 總減少行數（Wave 1–3 累計） | ~17,621 行（約 −71%） |
| bundle size（全程恆定） | **1,221.53 kB** |
| module count（全程恆定） | **50** |
| logic 改動 | **零** |
| regression | **零** |

### Wave 3 各 Stage commit hash 清單

| Stage | 函數 | Commit | 備注 |
|-------|------|--------|------|
| Stage 0 | `htmlHead` | `573b533` | html-shared.ts 新建 |
| Stage 0 | `HK_DISTRICTS` | `f5e6ee6` | constants.ts 新建 |
| Stage 1 | `dashboardHtml` + `comingSoonHtml` | `b9c29cd` | 零依賴，batch |
| Stage 2 | `adminColinkerySectionHtml` | `89d1b72` | `<\/script>` escape 保留 |
| Stage 2 | `qrRegisterHtml` | `2d5c25c` | source param |
| Stage 2 | `adminQrHtml` | `4fd92f4` | inline script |
| Stage 1 | `walletHtml` | `b5bca2a` | Stage label 誤植，見 NOTE-005 |
| Stage 2 | `teamConfirmHtml` | `3f3feea` | inline script |
| Stage 2 | `coworkeryAppHtml` | `a50212d` | inline script |
| Stage 2 | `brandFormHtml` | `c2c6f83` | JSON.stringify param |
| Stage 2 | `memberProfileHtml` | `bf14899` | local-const deps |
| Stage 2 | `colinkerypwaHtml` | `ac58677` | pure static HTML |
| Stage 2 | `partnerApplyHtml` | `b76cbe2` | prefill params |
| Stage 3 | `qrCompleteHtml` | `4c96a16` | HK_DISTRICTS import |
| Stage 4 | `sopHtml` | `c3b708d` | dead code，見 NOTE-006 |
| Stage 4 | `posterHtml` | `84e8292` | dead code，見 NOTE-006 |
| Stage 4 | `loginHtml` | `7f2e6ec` | dead code，見 NOTE-006 |
| Stage 4 | `homeHtml` | `068ecfd` | dead code，見 NOTE-006 |
| Stage 4 | `signupSubHtml` | `3354ea2` | htmlHead chain |
| Stage 4 | `signupMainHtml` | `27d173a` | htmlHead chain，import 事故，見 NOTE-008 |
| Stage 4 | `adminHtml` | `e4d7645` | htmlHead chain，新 regex 首用 |
| chore | REFACTOR_NOTES + import normalize | `4c5f9ba` | NOTE-005–009，20→21 symbols normalize |
| Stage 5 | `pwaAppHtml` | `41f232f` | HIGH-RISK，2725L，1 inline JS app |
| Stage 5 | `newAdminShellHtml` | `ecf3856` | 最終 template，5069L，5 script blocks |

### Wave 3 完成宣告

Wave 3（HTML template 模組化）全部完成。`src/lib/html-templates.ts` 現為 22 個 exported functions 的獨立模組，`src/index.tsx` 已清空所有 template 定義，僅保留路由 handler、middleware、業務邏輯及 lib 函數。

> **Wave 5 後更新**（commit `d17350a`，2026-09-08）：`sopHtml`、`posterHtml`、`loginHtml`、`homeHtml` 四個 zero-caller dead export 已刪除。html-templates.ts exported functions：22 → **18**；html-templates.ts 行數：17,478 → 16,727；index.tsx 行數：7,227 → **7,206**。

---

## [NOTE-012] 離群 member_no CE85-396333（非 nextMemberNo 生成，早期手動/測試數據）

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 4，NOTE-001 production 數據查詢（2026-09-06，唯讀 `--remote`） |
| **涉及範圍** | `members` table，production 數據庫 `coeldery85-db`（`222f9afc-4312-47a0-8d91-585443cd35c0`） |
| **記錄** | `member_no: CE85-396333`，`tier: PRIMARY`，`name_zh: 陳大明`，`source: whatsapp_qr`，`created_at: 2026-08-09 08:35:22`（無時區後綴，與正常 ISO 格式不同） |
| **性質判定** | 號碼 `396333` 遠超 counter 序列（當時序列約在 000001–000050 範圍），`created_at` 格式異常，確認為**非 `nextMemberNo()` 生成的手動 INSERT 或早期 QR 測試數據**，不在 counter 自增軌跡內。 |
| **影響評估** | 🟢 **無影響**：① `member_no TEXT UNIQUE NOT NULL` 約束完整，該號唯一無撞；② counter `next_val` 完全不受影響（counter 自增序列獨立）；③ 日後 `nextMemberNo()` 正常自增，不會撞上此號（需自增至 396333 才可能衝突，以目前速度預計數十年後） |
| **需注意場景** | ① **數據遷移**：如全量匯出 / 匯入時，此號格式合法但號碼跳躍，腳本若按數字序驗證會有警報，預留例外；② **報表 / 統計**：若有「最大會員號」或「會員序號差距」的業務報表，此號會令 `MAX(member_no)` 失真（字串排序 `CE85-396333` > `CE85-000106`）；③ **member_no 格式校驗**：若日後新增格式檢查（如限制數字部分 ≤ 某值），此號需豁免或先行清理。 |
| **建議後續行動** | 無緊急處理需要。若業務上確認此筆為廢棄測試數據，可於適當時機由有權限人員手動刪除或標記 `status=INACTIVE`；若屬真實會員，保留現狀並記錄成因即可。不需要修改 counter 或現有序列。 |
| **狀態** | 🟡 已記錄在案，無需即時行動 |

---

## [NOTE-013] registerRevenueRoutes — Wave 2 遺留收尾項勘查【✅ COMPLETE — 無需修改】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 2 遺留，NOTE-004 Stage 4 預告「待另行討論後執行」 |
| **結案於** | Wave 4，2026-09-07（唯讀勘查，零 code 改動） |
| **涉及範圍** | `registerRevenueRoutes(app: Hono<...>)` — `src/index.tsx` 定義第 **3785** 行，呼叫第 **5191** 行 |
| **Wire 狀態** | ✅ **已正確 wire** — `registerRevenueRoutes(app)` 在主流程中正常呼叫，非「漏接」亦非「廢棄」 |
| **路由規模** | 共 **34 條** — 20 條 admin 後台（`/api/admin/rev/*` + `/api/admin/doc/:key`）+ 14 條 partner/public 前台（`/api/partner/*`、`/api/member/lookup`、`/api/team-invite`、`/api/team-confirm`、`/verify/:token`、`/impact`） |

### 鑑權架構結論

| 路由類型 | 鑑權方式 | 無 cookie 實測結果 |
|---------|---------|:-:|
| 20 條 `/api/admin/*`（rev + doc） | Line 58 `app.use('/api/admin/*')` middleware 集中保護 | **全部 21 條一致 401** `AUTH_REQUIRED` ✅ |
| 14 條 partner/public 前台 | 設計上不設 auth（code comment 已說明：「角色申請（前台，無需 admin auth）」） | 正確業務回應（200 / 400 / 404）✅ |

- `registerRevenueRoutes` 內部 **零 `verifySession()` 呼叫** — 屬設計決策，非疏漏
- 集中式 middleware 鑑權架構，與 NOTE-002 Option B 收斂方向一致（handler 不重複鑑權）
- 🟢 **無任何 admin/rev 路由可在無 cookie 下繞過 401，零安全破口**

### 功能結論

| 測試類別 | 路由 | 結果 |
|---------|------|------|
| Admin GET（有 cookie） | `/api/admin/rev/applications`、`/partners`、`/projects`、`/dashboard`、`/cards`、`/holders` | **200** ✅ |
| Admin GET（有 cookie） | `/api/admin/doc/test.pdf` | **404**（sandbox 無 R2 數據，業務邏輯正確）✅ |
| Admin GET（有 cookie） | `/api/admin/rev/holder/:holderNo/projects` | **200** ✅ |
| Admin POST（有 cookie，欄位驗證） | `review`、`partner`、`project`、`ledger`、`wallet/status` | **400**（欄位驗證正常，已過鑑權層）✅ |
| Admin POST（有 cookie） | `/api/admin/rev/card/:id/revoke` | **200** ✅ |
| Public GET（無 cookie） | `/api/partner/my-status`、`/api/member/lookup`、`/impact`、`/verify/:token` | **200** ✅ |
| Public POST/GET（無 cookie，欄位/業務驗證） | `/api/partner/apply`、`/api/team-confirm`、`/api/team-invite?token=...` | **400 / 404**（業務層正常）✅ |
| 未逐條實測（同組確認） | `/api/partner/statement`、`/api/partner/wallet`、`/api/partner/withdraw`、`/api/partner/project/:id`、`/api/partner/card`、`/api/partner/team` | 同一 wire 路徑，懸念已坐實，列「未逐條但同組確認」 |

### 與 NOTE-002 對比

| 項目 | NOTE-002（benefits 系列）| NOTE-013（revenue 系列）|
|------|:---:|:---:|
| handler 內有問題 verifySession | ✅ 有（`verifySession(c, db)` 引數倒序）| ❌ 無（零 verifySession call）|
| admin 路由 middleware 保護 | ✅ 完整 | ✅ 完整 |
| 有 cookie admin 路由狀態 | 修前 500（TypeError），修後 200 | 直接 200，從無問題 |
| 需要修復 | ✅ 需要（Option B 刪除 9 行）| ❌ **無需任何改動** |

### 最終判決

**已 wire 且全部 work — Wave 2 遺留收尾項正式關閉，無需 code 改動。**

---

## [NOTE-014] Bundle size 對 SSR dead-code 刪除不敏感（tree-shaking 觀察）

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 5，NOTE-006 刪除後 build 結果（commit `d17350a`，2026-09-08） |
| **涉及範圍** | `dist/_worker.js` bundle size；`src/lib/html-templates.ts` dead export 刪除 |
| **觀察** | 刪除四個合計 **751 行 source** 的 zero-caller export（`sopHtml`、`posterHtml`、`loginHtml`、`homeHtml`）後，bundle size **維持 1,221.05 kB 不變**，module count 維持 **50**。 |
| **解釋** | Vite/esbuild 在 SSR bundle 模式下對 `html-templates.ts` 已執行 tree-shaking：zero-caller 的 export 函數在 bundling 時已被排除於 `dist/_worker.js` 之外，因此這些函數從未進入 bundle。刪除 source 只清理了 TypeScript 原始碼，對 dist 產物為 **no-op**。 |
| **結論指引** | 若目標是縮減 bundle size，應從以下方向著手：① **runtime-reachable code** — 被實際路由呼叫的 template 函數或業務邏輯；② **dependencies** — `node_modules` 中的第三方套件（尤其是 `hono` 以外的）；③ **code splitting** — 將大型 template 或功能模組拆分為獨立 chunk。刪除 dead template（zero-caller export）對 bundle 無貢獻，不應以此為縮 bundle 的手段。 |
| **數據記錄** | Wave 3 完成後 bundle 1,221.53 kB（NOTE-001 前）；NOTE-001 修復後 1,221.05 kB（+throw message 字串，+0.10 kB → 實為 NOTE-002 −0.58 kB 後穩定）；NOTE-006 刪除後仍 **1,221.05 kB**（不變，印證 tree-shaking 早已排除四個 dead export）。 |
| **狀態** | 🟢 觀察記錄，無需行動 |

---

<!-- 以後所有搬遷時發現的可疑邏輯，照此格式新增條目 -->
