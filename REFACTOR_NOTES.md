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
| **問題描述** | `src/index.tsx` 內 benefits + hmvod 路由共 8 個呼叫點使用了**相反參數順序** `verifySession(c, db)`，將 Hono context `c` 傳入 `db` 位置、將 D1Database `db` 傳入 `token` 位置。函數內 `if (!token) return false` 收到 db object（truthy）會繼續執行，再以 `c`（context，非 D1Database）呼叫 `db.prepare(...)` → runtime TypeError。實際效果：auth check 在 runtime 拋出錯誤或永遠失敗，**這 8 條 admin route 可能一直缺乏有效 auth 保護**。 |
| **嚴重程度** | 🔴 **高優先 / 疑似安全漏洞** |
| **已照搬不改** | ✅ 純機械搬遷原則——呼叫點一隻字都唔動，原行為照保留。 |
| **待獨立調查** | 須另開工程確認：①這 8 條 route 是否真的在 production 無 auth 保護；② benefits/hmvod 路由是否依賴上游 middleware 保護（`app.use('/api/admin/*', ...)` 已在 line ~80 設定，可能已由 middleware 覆蓋）；③ 若 middleware 已保護，Pattern B 呼叫雖錯但無害；④ 修正時須同時審查所有呼叫點。 |

**8 個錯誤呼叫點（`src/index.tsx`，逐個行號 + 所屬 route）：**

| 行號 | Route handler | 參數（錯誤） |
|------|--------------|------------|
| 24274 | `app.get('/api/admin/benefits', ...)` | `verifySession(c, db)` |
| 24288 | `app.post('/api/admin/benefits', ...)` | `verifySession(c, db)` |
| 24304 | `app.put('/api/admin/benefits/:id', ...)` | `verifySession(c, db)` |
| 24322 | `app.delete('/api/admin/benefits/:id', ...)` | `verifySession(c, db)` |
| 24330 | `app.get('/api/admin/benefits/:id/claims', ...)` | `verifySession(c, db)` |
| 24343 | `app.get('/api/admin/benefits/claims/summary', ...)` | `verifySession(c, db)` |
| 24359 | `app.post('/api/admin/benefits/upload-image', ...)` | `verifySession(c, db)` |
| 24405 | `app.get('/api/admin/benefit-categories', ...)` | `verifySession(c, db)` |

---

<!-- 以後所有搬遷時發現的可疑邏輯，照此格式新增條目 -->
