# REFACTOR_PLAN.md — src/index.tsx 模組化拆分計劃

> **狀態**: Phase 0 完成，待人手確認後方可進入 Phase 1  
> **產出日期**: 2026-09-05  
> **分析基準**: commit b8dcd20，src/index.tsx 24,848 行，約 1.36 MB  
> **原則**: 純機械搬遷，每步一個 commit，每步必須 build 過，在 `refactor/split-index` branch 進行

---

## 一、現況概覽

| 指標 | 數值 |
|------|------|
| 總行數 | 24,848 |
| 檔案大小 | 1,386,706 bytes (~1.36 MB) |
| 頂層 TypeScript 函數 | ~45 個 |
| HTML 模板函數 | 23 個（最大單體：`newAdminShellHtml` 5,071 行） |
| Route handler 組 | ~20 個功能模組 |
| 單行 inline JS 函數（模板內部）| 數百個（**不屬於本次拆分對象**） |

---

## 二、頂層 TypeScript 函數清單

### 2A — 純工具函數（Leaf，無 TS 依賴，最優先抽取）

| 函數 | 行號 | 約行數 | 備注 |
|------|------|--------|------|
| `haversineMeters` | 45 | 20 | 地理距離計算 |
| `resolveRate` | 65 | 14 | CoWorkery 薪酬計算 |
| `csvCell` | 79 | 11 | CSV escape |
| `centsToStr` | 90 | 5 | 分→港幣字串 |
| `makeToken` | 96 | 6 | 隨機 hex token |
| `sessionExpiry` | 102 | 6 | Session 到期時間 |
| `getSessionToken` | 108 | 4 | 從 cookie 取 token |
| `expiryDate` | 252 | 6 | 計算到期日 |
| `validateHKPhone` | 261 | 10 | HK 電話驗證 |
| `genTestingCode` | 1715 | 8 | 生成測試活動追蹤碼 |
| `nextMemberNo` | 244 | 8 | 生成下一個會員編號 |
| `nextCwNo` | 31 | 14 | 生成 CoWorkery 編號 |
| `genToken` | 18801 | 7 | Revenue sharing token |
| `sha256hex` | 18808 | 6 | SHA-256 雜湊 |
| `nextHolderNo` | 18814 | 10 | 生成 Holder 編號 |
| `nextPartnerNo` | 18824 | 8 | 生成 Partner 編號 |
| `nextProjectCode` | 18832 | 8 | 生成 Project 編號 |
| `validateShares` | 18858 | 27 | 驗證股份百分比 |
| `pbkdf2Hash` | 20298 | 15 | CoLinkery 密碼 hash |
| `pbkdf2Verify` | 20313 | 20 | CoLinkery 密碼驗證 |
| `makeCsrpnToken` | 20334 | 6 | CoLinkery session token |
| `genBrandToken` | 1723 | 7 | 品牌表單 token |
| `generateToken` | 22622 | 7 | QR 系統 token |
| `genMemberNoQR` | 22629 | 17 | QR 系統會員編號 |
| `getFamilyTreeApiKey` | 24689 | 3 | Family Tree API key helper |

### 2B — 有 TS 依賴的工具函數

| 函數 | 行號 | 依賴 |
|------|------|------|
| `verifySession` | 112 | `makeToken`, `sessionExpiry`, `getSessionToken` |
| `appendHashChain` | 18840 | `sha256hex` |
| `verifyColinkerySess` | 20340 | leaf |
| `requireColinkery` | 20352 | `sessionExpiry`, `getSessionToken`, `verifySession`, `pbkdf2Hash`, `pbkdf2Verify`, `makeCsrpnToken`, `verifyColinkerySess` |
| `verifyCw` | 2854 | `haversineMeters`, `resolveRate`, `csvCell`, `centsToStr`（注：依賴分析顯示含大段 CoWorkery API routes body，實際 verifyCw 本身是 leaf）|
| `registerRevenueRoutes` | 18885 | `genToken`, `nextHolderNo`, `nextPartnerNo`, `nextProjectCode`, `appendHashChain`, `validateShares`, `pbkdf2Hash` |
| `adminColinkerySectionHtml` | 22351 | `getSessionToken`, `verifySession`（實為模板，內含 inline JS，非真實 TS 呼叫）|
| `brandFormHtml` | 23844 | 同上（inline JS 引用，非 TS 呼叫） |

### 2C — HTML 模板函數（按大小排序）

| 函數 | 行號 | 約行數 | 依賴 |
|------|------|--------|------|
| `newAdminShellHtml` | 8308 | 5,071 | leaf |
| `pwaAppHtml` | 13911 | 2,751 | `partnerApplyHtml`, `teamConfirmHtml`, `walletHtml` |
| `walletHtml` | 18441 | 2,567 | leaf |
| `colinkerypwaHtml` | 21008 | 1,343 | leaf |
| `partnerApplyHtml` | 16662 | 1,372 | leaf |
| `brandFormHtml` | 23844 | 1,004 | leaf（inline JS 引用不算 TS dep）|
| `memberProfileHtml` | 6785 | 953 | leaf |
| `adminHtml` | 5610 | 989 | `htmlHead` |
| `signupMainHtml` | 3902 | 962 | `htmlHead`, `validateHKPhone` |
| `signupSubHtml` | 4864 | 746 | `htmlHead`, `validateHKPhone` |
| `teamConfirmHtml` | 18034 | 407 | leaf |
| `qrRegisterHtml` | 22651 | 412 | leaf（`qrCompleteHtml` 在 inline JS 內，非 TS dep）|
| `qrCompleteHtml` | 23063 | 403 | leaf |
| `adminQrHtml` | 23466 | 378 | leaf |
| `coworkeryAppHtml` | 13379 | 532 | leaf |
| `homeHtml` | 7738 | 425 | `htmlHead` |
| `adminColinkerySectionHtml` | 22351 | 300 | leaf（TS 層面）|
| `loginHtml` | 8163 | 145 | `htmlHead` |
| `posterHtml` | 6599 | 128 | `htmlHead` |
| `htmlHead` | 3850 | 52 | leaf |
| `sopHtml` | 6727 | 58 | `htmlHead` |
| `dashboardHtml` | 3741 | 80 | leaf |
| `comingSoonHtml` | 3821 | 29 | leaf |

---

## 三、Route Handler 模組分組

| 模組 | 行範圍 | Routes 數 | 主要依賴 |
|------|--------|-----------|---------|
| Admin Auth | 138–174 | 3 | `makeToken`, `sessionExpiry`, `verifySession` |
| Member Registration | 272–435 | 1 | `nextMemberNo`, `expiryDate`, `validateHKPhone` |
| Member Lookup/Get | 437–474 | 2 | — |
| Admin Members | 476–695 | 7 | `verifySession` |
| Medical Card | 707–913 | 6 | `verifySession` |
| Family Cards | 697–1060 | 3 | `nextMemberNo`, `validateHKPhone` |
| Member Self-Update | 1062–1125 | 3 | `validateHKPhone` |
| Groups | 1127–1187 | 5 | — |
| Roadshow | 1191–1297 | 6 | — |
| Products | 1301–1391 | 5 | — |
| Useful Links | 1395–1472 | 5 | — |
| Jobs | 1476–1607 | 7 | — |
| App Contents | 1613–1709 | 5 | — |
| Product Testing | 1730–2267 | 20 | `genTestingCode`, `genBrandToken` |
| Feedback | 2273–2407 | 8 | — |
| CoWorkery Admin | 2459–2853 | 9 | `nextCwNo`, `haversineMeters`, `resolveRate`, `csvCell`, `centsToStr` |
| CoWorkery User | 2865–3148 | 5 | `verifyCw` |
| Revenue Sharing | 18885–20293 | ~30 | `registerRevenueRoutes`（自含） |
| CoLinkery | 20363–22349 | 15 | `pbkdf2Hash`, `pbkdf2Verify`, `requireColinkery` |
| QR Register | 22646–23840 | 12 | `generateToken`, `genMemberNoQR` |
| Benefits | 24281–24598 | 10 | — |
| HMVod | 24604–24686 | 6 | — |
| Family Tree API | 24694–24846 | 4 | `nextMemberNo`, `validateHKPhone`, `getFamilyTreeApiKey` |

---

## 四、建議目標目錄結構

```
src/
├── index.tsx                    ← 只剩 imports + Bindings type + app = new Hono() + route registrations + export default
├── lib/
│   ├── utils.ts                 ← haversineMeters, csvCell, centsToStr, makeToken, sessionExpiry, getSessionToken
│   ├── auth.ts                  ← verifySession, (admin auth helpers)
│   ├── members.ts               ← nextMemberNo, expiryDate, validateHKPhone
│   ├── coworkery-utils.ts       ← nextCwNo, resolveRate, verifyCw
│   ├── revenue-utils.ts         ← genToken, sha256hex, nextHolderNo, nextPartnerNo, nextProjectCode, appendHashChain, validateShares
│   ├── colinkery-auth.ts        ← pbkdf2Hash, pbkdf2Verify, makeCsrpnToken, verifyColinkerySess, requireColinkery
│   ├── testing-utils.ts         ← genTestingCode, genBrandToken
│   ├── qr-utils.ts              ← generateToken, genMemberNoQR
│   └── family-tree.ts           ← getFamilyTreeApiKey
├── templates/
│   ├── htmlHead.ts              ← htmlHead (依賴: leaf)
│   ├── dashboardHtml.ts         ← dashboardHtml, comingSoonHtml (依賴: leaf)
│   ├── memberProfileHtml.ts     ← memberProfileHtml (依賴: leaf)
│   ├── signupHtml.ts            ← signupMainHtml, signupSubHtml (依賴: htmlHead, validateHKPhone)
│   ├── adminHtml.ts             ← adminHtml (依賴: htmlHead)
│   ├── shellHtml.ts             ← newAdminShellHtml (依賴: leaf, 5071 lines)
│   ├── homeHtml.ts              ← homeHtml, loginHtml, posterHtml, sopHtml (依賴: htmlHead)
│   ├── memberCardHtml.ts        ← memberProfileHtml card section
│   ├── coworkeryAppHtml.ts      ← coworkeryAppHtml (依賴: leaf)
│   ├── pwaAppHtml.ts            ← pwaAppHtml (依賴: partnerApplyHtml, teamConfirmHtml, walletHtml)
│   ├── partnerApplyHtml.ts      ← partnerApplyHtml (依賴: leaf)
│   ├── teamConfirmHtml.ts       ← teamConfirmHtml (依賴: leaf)
│   ├── walletHtml.ts            ← walletHtml (依賴: leaf)
│   ├── colinkerypwaHtml.ts      ← colinkerypwaHtml, adminColinkerySectionHtml (依賴: leaf)
│   ├── qrHtml.ts                ← qrRegisterHtml, qrCompleteHtml, adminQrHtml (依賴: leaf)
│   └── brandFormHtml.ts         ← brandFormHtml (依賴: leaf)
└── routes/
    ├── admin-auth.ts            ← /api/admin/login|logout|me
    ├── members.ts               ← /api/members (register, lookup, get, family, self-update, wa-click, verify)
    ├── admin-members.ts         ← /api/admin/members
    ├── medical.ts               ← /api/admin/medical, /api/members/:no/medical
    ├── groups.ts                ← /api/admin/groups
    ├── roadshow.ts              ← /api/admin/roadshow, /api/admin/roadshows
    ├── products.ts              ← /api/admin/products
    ├── useful-links.ts          ← /api/useful-links, /api/admin/useful-links
    ├── jobs.ts                  ← /api/jobs, /api/admin/jobs
    ├── contents.ts              ← /api/contents, /api/admin/contents
    ├── testing.ts               ← /api/testing, /api/admin/testing
    ├── feedback.ts              ← /api/feedback, /api/admin/feedback
    ├── coworkery.ts             ← /api/coworkery, /api/admin/coworkery
    ├── revenue.ts               ← revenue sharing routes (via registerRevenueRoutes)
    ├── colinkery.ts             ← /api/colinkery, /api/admin/colinkery
    ├── qr-register.ts           ← /qr-register, /api/qr-sources, /webhooks/whatsapp
    ├── benefits.ts              ← /api/benefits, /api/admin/benefits
    ├── hmvod.ts                 ← /api/hmvod, /api/admin/hmvod
    └── family-tree.ts           ← /api/member/verify, /api/family-tree/*
```

---

## 五、抽取優先順序（由葉節點開始）

### Wave 1 — 純工具函數 Leaf（最安全，零副作用）✅ 已完成
定義：純計算、零副作用、不依賴 D1/全域狀態。每個獨立 commit。

| 優先序 | 目標函數 | 目標檔案 | 狀態 |
|--------|---------|---------|------|
| 1 | `haversineMeters`, `resolveRate`, `csvCell`, `centsToStr` | `src/lib/utils.ts` | ✅ 完成 |
| 2 | `makeToken`, `sessionExpiry`, `getSessionToken` | `src/lib/auth.ts` | ✅ 完成 |
| 3 | `validateHKPhone`, `expiryDate` | `src/lib/members.ts` | ✅ 完成 |
| 4 | `genTestingCode`, `genBrandToken` | `src/lib/testing-utils.ts` | ✅ 完成 |

> ⚠️ **原計劃錯誤更正**：`nextMemberNo`（原優先序 3）和 `nextCwNo`（原優先序 4）
> 原被錯誤分類為 Wave 1 純 Leaf。
> 實際上兩者均接受 `db: D1Database` 並執行 `UPDATE ... RETURNING`，有 **D1 寫入副作用**，
> 不符合「零副作用」定義。已移至 Wave 2 處理。

### Wave 2 — 有依賴/副作用的工具函數（Wave 1 完成後進行）

| 優先序 | 目標函數 | 依賴 / 副作用 | 目標檔案 |
|--------|---------|-------------|---------|
| 10 | `nextMemberNo` | D1 寫入副作用（UPDATE counter） | `src/lib/members.ts`（追加） |
| 11 | `nextCwNo` | D1 寫入副作用（UPDATE coworkery_counter） | `src/lib/coworkery-utils.ts` |
| 12 | `verifySession` | D1 讀取，依賴 `getSessionToken`（已移至 auth.ts） | `src/lib/auth.ts`（追加） |
| 13 | `appendHashChain` | 依賴 `sha256hex`（待 Wave 1 revenue-utils 完成後） | `src/lib/revenue-utils.ts`（追加） |
| 14 | `requireColinkery` | 依賴多個 Wave 1+2 函數 | `src/lib/colinkery-auth.ts`（追加） |
| 15 | `registerRevenueRoutes` | 依賴 Wave 1+2，接受 `app` 參數 | `src/lib/revenue-utils.ts`（追加） |

> ℹ️ Wave 2 批量限制：一次最多 2 個函數，每個獨立 commit，完成即停等 review。

### Wave 3 — HTML 模板（由小到大，leaf-first）

| 優先序 | 目標函數 | 約行數 |
|--------|---------|--------|
| 14 | `comingSoonHtml`, `dashboardHtml` | 109 |
| 15 | `htmlHead` | 52 |
| 16 | `memberProfileHtml` | 953 |
| 17 | `loginHtml`, `posterHtml`, `sopHtml` | ~331 |
| 18 | `homeHtml` | 425 |
| 19 | `adminColinkerySectionHtml` | 300 |
| 20 | `coworkeryAppHtml` | 532 |
| 21 | `adminQrHtml` | 378 |
| 22 | `qrCompleteHtml` | 403 |
| 23 | `qrRegisterHtml` | 412 |
| 24 | `brandFormHtml` | 1,004 |
| 25 | `adminHtml` | 989 |
| 26 | `signupMainHtml` + `signupSubHtml` | 1,708 |
| 27 | `teamConfirmHtml` | 407 |
| 28 | `walletHtml` | 2,567 |
| 29 | `partnerApplyHtml` | 1,372 |
| 30 | `pwaAppHtml` | 2,751 |
| 31 | `colinkerypwaHtml` | 1,343 |
| 32 | `newAdminShellHtml` | 5,071 |

### Wave 4 — Route Handlers（Wave 1–3 完成後）

留待 Wave 3 完成後再規劃具體順序，從依賴最少的葉節點 routes 開始（`useful-links`, `jobs`, `contents`, `groups` 等），最後才拆 `members`（依賴最多）。

---

## 六、已知風險與注意事項

1. **`pwaAppHtml` 直接 `include` 了 `partnerApplyHtml`、`teamConfirmHtml`、`walletHtml` 的 TS 呼叫**：必須確保三個被依賴函數先完成抽取並正確 export/import，`pwaAppHtml` 才能抽取。

2. **`newAdminShellHtml` 是 5,071 行的單一函數**：包含大量 inline JavaScript template literal，但 TS 層面是 leaf（唔呼叫任何其他 TS 函數）。可以整塊搬，但 build 後需要仔細確認 bundle size 不變。

3. **`registerRevenueRoutes(app)` 模式**：佢係唯一一個接受 `app` 做參數嘅函數，搬遷時需要同時 export/import `app` 或改用 factory pattern。**由於「純機械搬遷」原則，呢個 commit 只搬函數本身，唔改 pattern**。

4. **同名 inline JS 函數衝突**：例如 `signupMainHtml` 內有 `submitForm()`，`signupSubHtml` 內又有 `submitForm()`。呢啲係 template literal 內嘅 browser JS，唔係 TypeScript scope，搬遷時唔會影響。

5. **`Bindings` type**：每個新 `.ts` 檔需要 import `Bindings` type（或者 `D1Database` 等 CF types）。用 `import type` 唔會增加 bundle size。

6. **Build size 監控**：每個 commit 後記錄 `dist/_worker.js` 大小。任何 >5KB 差異需要調查。

---

## 七、Phase 0 完成聲明

- ✅ 完整讀取 src/index.tsx（24,848 行）
- ✅ 識別所有頂層 TypeScript 函數（~45 個）
- ✅ 分析函數間依賴關係（full body scan）
- ✅ 統計所有 HTML 模板函數大小
- ✅ 列出所有 Route Handler 模組分組
- ✅ 產出建議目錄結構
- ✅ 產出建議抽取優先順序（Wave 1–4）
- ✅ 識別已知風險
- ✅ branch `refactor/split-index` 已建立，未動任何 code

**⏸️ 等待人手確認 REFACTOR_PLAN.md 後，方可進入 Phase 1。**
