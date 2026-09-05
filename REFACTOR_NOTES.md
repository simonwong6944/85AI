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

<!-- 以後所有搬遷時發現的可疑邏輯，照此格式新增條目 -->
