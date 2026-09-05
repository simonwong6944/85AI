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

<!-- 以後所有搬遷時發現的可疑邏輯，照此格式新增條目 -->
