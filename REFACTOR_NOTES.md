# REFACTOR_NOTES.md — 搬遷時發現的可疑邏輯

> **用途**：集中記錄 `src/index.tsx` 模組化搬遷過程中發現的可疑邏輯、潛在 bug、或不一致行為。
> 所有條目均在搬遷時發現，已照搬不改（純機械搬遷原則），留待 refactor 全部完成後獨立處理。
> 每條記錄標明：發現於哪個 commit、涉及哪個函數、問題描述、建議後續行動。

---

## [NOTE-001] nextMemberNo — `?? 1` 靜默 fallback，存在撞號風險

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 2 batch，commit `4880b15`（extract nextMemberNo from index.tsx） |
| **涉及函數** | `nextMemberNo(db: D1Database)` → `src/lib/members.ts` |
| **現行程式碼** | `const n = row?.next_val ?? 1` |
| **問題描述** | `UPDATE counter SET next_val = next_val + 1 WHERE id = 1 RETURNING next_val` 若 `counter` 表內無 `id = 1` 的 row（例如表未初始化、row 被誤刪），`db.prepare(...).first()` 回傳 `null`，此時 `row?.next_val ?? 1` 靜默 fallback 到 `1`，函數成功回傳 `'CE85-000001'`，不拋出任何錯誤。若多次觸發此情況，多個會員將獲得相同編號 `CE85-000001`，違反唯一性。 |
| **不一致之處** | 同樣模式的 `nextCwNo` 有明確 guard：`if (!row \|\| typeof row.next_val !== 'number') { throw new Error(...) }`，行為完全不同。 |
| **已照搬不改** | ✅ 搬遷時維持原邏輯，未作任何修改。 |
| **建議後續行動** | 在 refactor 完成後，為 `nextMemberNo` 補上與 `nextCwNo` 一致的 null guard，改為 throw error 而非靜默 fallback。同時確認 `counter` 表的初始化 migration 是否有保障 seed row 存在。 |

---

## [NOTE-002] verifySession — 呼叫點參數順序錯誤【高優先 / 疑似安全問題 / 待獨立調查】

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 2，搬遷 `verifySession` 前置審查（branch `refactor/split-index`，base commit `557a1ce`） |
| **涉及函數** | `verifySession(db: D1Database, token: string \| undefined): Promise<boolean>` |
| **正確簽名** | `verifySession(db, token)` — 第一參數為 D1Database，第二參數為 token 字串 |
| **問題描述** | 全檔 `src/index.tsx` 共有 **16 個** `verifySession` 呼叫點，分兩種模式：**Pattern A（正確，8 個）**：`verifySession(c.env.DB, token)` — 符合函數簽名；**Pattern B（錯誤，8 個）**：`verifySession(c, db)` — 將 Hono context `c` 傳入 `db` 位置、將 D1Database `db` 傳入 `token` 位置。Pattern B 中函數內 `if (!token) return false` 收到 db object（truthy）會繼續執行，再以 `c`（context，非 D1Database）呼叫 `db.prepare(...)` → runtime TypeError。實際效果：Pattern B 的 auth check 在 runtime 拋出錯誤或永遠失敗，**這 8 條 admin route 可能一直缺乏有效 auth 保護**（惟注意：上游 `app.use('/api/admin/*', ...)` middleware 可能已提供保護，待調查）。Pattern A 的 8 個呼叫點無問題。 |
| **嚴重程度** | 🔴 **高優先 / 疑似安全漏洞** |
| **已照搬不改** | ✅ 純機械搬遷原則——呼叫點一隻字都唔動，原行為照保留。 |
| **待獨立調查** | 須另開工程確認：①這 8 條 route 是否真的在 production 無 auth 保護；② benefits/hmvod 路由是否依賴上游 middleware 保護（`app.use('/api/admin/*', ...)` 已在 line ~80 設定，可能已由 middleware 覆蓋）；③ 若 middleware 已保護，Pattern B 呼叫雖錯但無害；④ 修正時須同時審查所有 16 個呼叫點。 |

> ⚠️ **補記（2026-09-05，Commit 1 原文遺漏）**：NOTE-002 初版僅列 Pattern B（8 個），未計入 Pattern A（8 個）。全檔實際呼叫點為 **16 個**（A 8 + B 8），現補全。行號為 commit `ef019b6` 搬遷後的當前行號。

**Pattern A — 正確呼叫點（`verifySession(c.env.DB, token)`，共 8 個）：**

| 行號（ef019b6 後） | Route / 用途 | 參數 |
|------------------|------------|------|
| 60 | `POST /api/admin/login` — login handler | `verifySession(c.env.DB, token)` |
| 98 | `GET /api/admin/me` — session check | `verifySession(c.env.DB, token)` |
| 20735 | admin colinkery 管理路由 | `verifySession(c.env.DB, token)` |
| 20762 | admin colinkery 管理路由 | `verifySession(c.env.DB, token)` |
| 20804 | admin colinkery 管理路由 | `verifySession(c.env.DB, token)` |
| 20830 | admin colinkery 管理路由 | `verifySession(c.env.DB, token)` |
| 20848 | admin colinkery 管理路由 | `verifySession(c.env.DB, token)` |
| 22332 | `/membership/admin` redirect guard | `verifySession(c.env.DB, token)` |

**Pattern B — 錯誤呼叫點（`verifySession(c, db)`，共 8 個）：**

| 行號（ef019b6 後） | Route handler | 參數（錯誤） |
|------------------|--------------|------------|
| 24268 | `app.get('/api/admin/benefits', ...)` | `verifySession(c, db)` |
| 24282 | `app.post('/api/admin/benefits', ...)` | `verifySession(c, db)` |
| 24298 | `app.put('/api/admin/benefits/:id', ...)` | `verifySession(c, db)` |
| 24316 | `app.delete('/api/admin/benefits/:id', ...)` | `verifySession(c, db)` |
| 24324 | `app.get('/api/admin/benefits/:id/claims', ...)` | `verifySession(c, db)` |
| 24337 | `app.get('/api/admin/benefits/claims/summary', ...)` | `verifySession(c, db)` |
| 24353 | `app.post('/api/admin/benefits/upload-image', ...)` | `verifySession(c, db)` |
| 24399 | `app.get('/api/admin/benefit-categories', ...)` | `verifySession(c, db)` |

---

## [NOTE-003] Wave 3 模板函數偵查 — inline JS 同名函數勿混淆 grep 結果

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 前置偵查，branch `refactor/split-index`，commit `8f8735b` 之後（純調查，無搬遷） |
| **涉及範圍** | `newAdminShellHtml`（行 8204–13272）及 `pwaAppHtml`（行 13807–16531）內部的 inline JS 函數定義 |
| **問題描述** | `src/index.tsx` 內有多個與 TypeScript 頂層函數同名的 **瀏覽器端 inline JS 函數**，定義在 template literal 的 `<script>` block 內。已確認以下撞名情況：① `bnfCardHtml`（JS，在 `newAdminShellHtml` Block 4，行 ~11114）── 外觀與 TS 頂層函數相同，但係 HTML template 內的 browser JS；② `appBnfMedCardPinHtml`、`appBnfMedCardAuthHtml`、`appBnfMedCardStatusHtml`、`appBnfMedCardIssuedHtml`、`appBnfMedCardApplyHtml`、`appBnfCardHtml`、`appHmvodPinHtml`、`appHmvodAuthHtml`、`appHmvodDetailHtml`（全部係 `pwaAppHtml` 內 `<script>` block 的 browser JS 函數，行 15432–16557）；③ `tstEsc`（JS escape helper，在 `newAdminShellHtml` Block 3，行 10324）；④ `switchTab`（JS tab 切換，在 `pwaAppHtml` `<script>` block，行 14267）。 |
| **影響** | Wave 3 搬遷時用 `grep -n "funcName" src/index.tsx` 確認定義數量，上述函數名會額外 match 到 inline JS 定義，令定義計數 > 1，**誤觸「定義多過 1 即停」前置閘**。 |
| **處理方式** | 閘 2 grep 時，若發現定義 > 1，先 `Read` 該行上下文確認是否在 template literal `<script>` block 內（non-TS）。若係 inline JS，唔計入「TS 頂層定義」計數，可繼續。 |
| **已照搬不改** | N/A（純調查記錄，無搬遷） |

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
| `posterHtml` | 6495–6620 | 126 | 1 |
| `sopHtml` | 6623–6678 | 56 | 0 |
| `homeHtml` | 7634–8056 | 423 | 1 |
| `loginHtml` | 8059–8201 | 143 | 1 |

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
| `posterHtml` | GET | `/poster` | Roadshow Poster |
| `sopHtml` | GET | `/sop` | Roadshow 作戰手冊 |
| `memberProfileHtml` | GET | `/member/profile` 或類似 | 會員個人頁 |
| `homeHtml` | GET | `/` | 主頁 |
| `loginHtml` | GET | `/login` | 會員登入 |
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

## [NOTE-006] Stage 4 dead code 清單（zero caller 模板照搬記錄）

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 4，搬遷前置審查 |
| **涉及函數** | `sopHtml`、`posterHtml`、`loginHtml`、`homeHtml` |
| **問題描述** | 四個模板函數在搬遷時確認為零呼叫點（dead code）：① `sopHtml` — `/sop` 路由改為 `c.redirect('/', 301)`，未呼叫此函數；② `posterHtml` — `/poster` 路由改為 `c.redirect('/', 301)`，未呼叫此函數；③ `loginHtml` — `/membership/login` 路由呼叫 `signupMainHtml()`，非此函數；④ `homeHtml` — 全檔無任何路由呼叫此函數。 |
| **已照搬不改** | ✅ 依純機械照搬原則，四個函數已搬入 `html-templates.ts`（commits `c3b708d`、`84e8292`、`7f2e6ec`、`068ecfd`），行為未變，dead code 狀態保留。 |
| **建議後續行動** | 待 Wave 3 全部搬遷完成後，獨立評估是否刪除。刪除前須確認無隱藏動態呼叫點（例如字串拼接呼叫）。 |

---

## [NOTE-007] homeHtml 硬編碼地區陣列與 HK_DISTRICTS 平行維護

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 4，`homeHtml` 搬遷前置審查（commit `068ecfd`） |
| **涉及函數** | `homeHtml` → `src/lib/html-templates.ts` |
| **問題描述** | `homeHtml` 函數體內含一份硬編碼 18 地區陣列 `['中西區','灣仔','東區','南區','油尖旺','深水埗','九龍城','黃大仙','觀塘','葵青','荃灣','屯門','元朗','北區','大埔','沙田','西貢','離島']`（以 `${[...].map(d=>...)}` 形式嵌入 template literal）。此陣列與 `src/lib/constants.ts` 的 `HK_DISTRICTS` 內容完全重複，屬平行維護，存在潛在資料不一致風險（若 `HK_DISTRICTS` 更新而 `homeHtml` 未同步）。 |
| **已照搬不改** | ✅ 搬遷時維持原硬編碼陣列，未替換為 `HK_DISTRICTS` 引用（純機械搬遷原則）。 |
| **建議後續行動** | 待 Wave 3 完成後，考慮將 `homeHtml` 內的硬編碼陣列替換為 `import { HK_DISTRICTS } from './constants'` 引用，消除 DRY 違規。 |

---

## [NOTE-008] signupMainHtml 搬遷 import 行事故（27d173a）

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 4，commit `27d173a`（`signupMainHtml` 搬遷）事後審查 |
| **涉及範圍** | `src/index.tsx` 第 14 行 import 行 |
| **問題描述** | Python surgery script 的舊 import append 邏輯（以 `.rstrip('}')` 切除閉括號後砌回）在處理行尾有 trailing space 的情況下產生 broken 語法：`} from './lib/html-templates' , signupMainHtml } from './lib/html-templates'`（雙重 `from`）。隨即以第二個 Python script 手動重寫整條 import 行（手寫死 19 symbol string）覆蓋修正。事後核實：19 symbol 齊全、每個在 `html-templates.ts` 均有對應唯一 `export function`、`from` 只出現一次，最終結果正確。 |
| **修正措施** | 於 commit `e4d7645`（`adminHtml` 搬遷）改用安全 regex insert 邏輯：`re.sub(r'\s*(} from \'./lib/html-templates\')', ' , adminHtml \1', line)`，連續兩個 commit（`27d173a` 事後核實 + `e4d7645` 實際使用）驗證正確。 |
| **遺留格式問題** | 手寫覆蓋雖未改動 symbol 1–18 的間距，但累積自 Stage 3–4 append 的格式漂移（symbol 13–19 使用 ` , symbol` 前後 space 風格，與 symbol 1–12 的 `symbol, ` 標準風格不一致）已於本次 chore commit normalize 統一。 |

---

## [NOTE-009] html-templates import 行格式漂移（已於本 commit 修正）

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 4 收尾審查 |
| **涉及範圍** | `src/index.tsx` 第 14 行 `import { ... } from './lib/html-templates'` |
| **問題描述** | Symbol 1–12（`dashboardHtml` 至 `partnerApplyHtml`）使用 `symbol, nextSymbol` 風格（逗號後一空格，逗號前無空格）；symbol 13–19（`qrCompleteHtml` 至 `adminHtml`）因歷次 append script 格式漂移，使用 ` , symbol` 風格（逗號前後各一空格）。兩種風格混雜同一行。 |
| **已修正** | ✅ 本 chore commit 以程式化 normalize（split by comma → strip → join with `', '`）統一全部 20 個 symbol 為 `symbol, symbol` 標準風格，零 symbol 內容改動。 |

---

## [NOTE-010] /app 及 /admin 頁面 pre-existing 1×404（Service Worker 生命週期觸發）

| 欄目 | 內容 |
|------|------|
| **發現於** | Wave 3 Stage 5 QA，pwaAppHtml（commit `41f232f`）及 newAdminShellHtml（commit `ecf3856`）搬遷後驗証 |
| **涉及頁面** | `GET /app`（pwaAppHtml）、`GET /admin`（newAdminShellHtml） |
| **問題描述** | PlaywrightConsoleCapture 在真實瀏覽器環境（HTTPS 公開 URL）對 `/app` 及 `/admin` 均捕獲 1×`Failed to load resource: the server responded with a status of 404 ()`，console error 各一條。所有靜態資源（`/manifest.webmanifest`、`/icon-192.png`、`/static/logo-coeldery85-white.png`、`/shared.css`、`/sw.js`、`/static/mc-sample.png`）curl 驗証全部返回 200。Python headless Playwright（`--disable-features=ServiceWorker`）捕獲不到該 404——說明 404 由 Service Worker 生命週期（install/activate/fetch 攔截）觸發，非 page JS 直接 fetch。 |
| **Baseline 對照** | 針對 `/app`：checkout `41f232f^`（`4c5f9ba`）rebuild 後用 PlaywrightConsoleCapture 同樣捕獲完全相同的 1×404；針對 `/admin`：checkout `ecf3856^`（`41f232f`）rebuild 後同樣 1×404。兩個頁面的 404 均在搬遷前已存在，**確認為 pre-existing，零 regression**。 |
| **來源未定** | `sw.js`（CACHE_NAME `coeldery85-v4`，`OFFLINE_URLS: ['/app']`）curl 返回 200；`cache.addAll(['/app'])` 在 install event 中有 `.catch(() => {})` 吞錯；404 觸發時機及具體請求 URL 尚未完全確定（headless 工具因 SW 攔截無法捕獲網絡層詳情）。 |
| **狀態** | 🟡 **pre-existing，非 regression**；來源未定，待調查。 |
| **已照搬不改** | N/A（純 QA 發現，非搬遷引入）。 |
| **建議後續行動** | Wave 4 或獨立安全調查時，在真實 Chrome DevTools Network 面板（清除 SW cache 後）確認 404 的具體請求 URL；若為非必要資源，可修改 `sw.js` 的 precache 清單或升級 CACHE_NAME 版本強制重安裝。 |

---

## [NOTE-011] Wave 3 拆檔完成摘要

| 欄目 | 內容 |
|------|------|
| **完成於** | Wave 3 Stage 5，commit `ecf3856`（newAdminShellHtml，最後一個 template） |
| **涉及範圍** | `src/index.tsx` → `src/lib/html-templates.ts`（22 個 exported functions） |
| **搬遷規模** | `src/index.tsx`：Wave 3 開始前 ~16,963 行 → 完成後 **7,227 行**（減少 **~9,736 行，約 −57%**） |

> **注意**：本條 NOTE-011 所稱「24,848 行」為本次 refactor branch 整個 session 起點（Wave 1 開始前）計算值；Wave 3 開始前基線約 16,963 行；Wave 3 完成後 7,227 行，Wave 3 本身減少約 9,736 行（−57%）。全程 index.tsx 淨減幅（含 Wave 1–3）約 −71%。

### 搬遷結果指標

| 指標 | 數值 |
|------|------|
| html-templates.ts exported functions | **22 個** |
| index.tsx 行數（Wave 3 開始前） | ~16,963 行 |
| index.tsx 行數（Wave 3 完成後） | **7,227 行** |
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

---

<!-- 以後所有搬遷時發現的可疑邏輯，照此格式新增條目 -->
