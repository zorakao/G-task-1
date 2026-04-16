# 開發規範與實作流程

## 1. 開發原則
- 優先維持既有回應格式與錯誤碼語意，避免前端/測試大面積破壞。
- 後台權限必須以 middleware 保護，不能只做頁面導向限制。
- 涉及訂單、庫存、購物車清理的操作必須具備原子性（transaction）。
- 任何新增行為都要補測試（成功路徑 + 失敗路徑至少各一）。

## 2. 命名規則對照表

| 範圍 | 規則 | 範例 | 備註 |
| --- | --- | --- | --- |
| DB Table / Column | `snake_case` | `order_items`, `recipient_email` | 與 SQLite schema 一致 |
| API Path | kebab/名詞複數為主 | `/api/admin/products` | 遵循現有資源導向設計 |
| JSON key（回應） | 以現有資料結構為準 | `order_no`, `total_amount`, `product_id` | 與 DB 快照欄位對齊 |
| JSON key（請求） | 既有 API camelCase 為主 | `recipientName`, `productId` | 需維持向後相容 |
| JS 變數/函式 | `camelCase` | `loadProducts`, `handleDelete` | 前後端皆同 |
| 常數 | `UPPER_SNAKE_CASE` | `TOKEN_KEY`, `SESSION_KEY` | 主要出現在前端 auth 模組 |
| Route 檔名 | 功能 + `Routes.js` | `authRoutes.js` | 與 `app.js` 掛載一致 |
| Middleware 檔名 | 職責 + `Middleware.js` | `adminMiddleware.js` | 單一責任 |

## 3. 模組系統說明
- 主要程式碼使用 `CommonJS`（`require/module.exports`）。
- `vitest.config.js` 使用 `ESM`（`import/export`），屬測試配置檔特例。
- 新增檔案時預設採 CommonJS，除非工具鏈要求 ESM。

## 4. 新增 API 的標準步驟

1. **定義需求與資源邊界**
- 決定路由前綴、HTTP method、是否需 auth/admin。

2. **實作 route handler**
- 在對應 `src/routes/*Routes.js` 新增端點。
- 參數驗證失敗回 `400 VALIDATION_ERROR`。
- 查無資源回 `404 NOT_FOUND`。
- 權限不足回 `401/403`。

3. **維持統一回應 envelope**
- 成功：`{ data: ..., error: null, message: '...' }`
- 失敗：`{ data: null, error: '...', message: '...' }`

4. **補 OpenAPI 註解**
- 使用 `@openapi` 區塊描述 path、requestBody、responses。

5. **補測試**
- 至少加：
  - 成功案例（2xx）
  - 主要失敗案例（驗證/權限/不存在）

6. **前端接線（如需）**
- `public/js/pages/*.js` 加入呼叫與錯誤提示。
- 保持 `apiFetch` 行為（401 自動導向登入）。

## 5. 新增 Middleware 的步驟

1. 在 `src/middleware/` 建檔，保持單一責任。
2. 若會中斷請求，使用一致錯誤 envelope。
3. 在 `app.js` 或特定 router 用 `router.use(...)` 掛載。
4. 明確記錄執行順序（例如 auth 必須先於 admin）。
5. 為 middleware 影響的路由補測試。

## 6. 新增 DB（資料表/欄位）步驟

1. 於 `src/database.js` 的 `initializeDatabase()` 調整 `CREATE TABLE IF NOT EXISTS`。
2. 如需預設資料，同步更新 `seed*` 流程。
3. 檢查約束：`NOT NULL`、`CHECK`、`UNIQUE`、`FK`。
4. 更新所有依賴 SQL：
- route 查詢
- transaction 語句
- 測試 fixture 假設
5. 更新 `docs/ARCHITECTURE.md` schema 與 `docs/FEATURES.md` 行為描述。

## 7. 環境變數表

| 變數 | 用途 | 必要性 | 預設值 | 使用位置 |
| --- | --- | --- | --- | --- |
| `JWT_SECRET` | JWT 簽章 key | 必要（啟動 hard check） | 無 | `server.js`, `authRoutes`, `authMiddleware`, `cartRoutes` |
| `PORT` | server port | 選填 | `3001` | `server.js` |
| `BASE_URL` | 服務基底 URL（預留） | 選填 | `http://localhost:3001` | 目前未在程式使用 |
| `FRONTEND_URL` | CORS allow origin | 選填 | `http://localhost:3001`（程式 fallback） | `app.js` |
| `ADMIN_EMAIL` | seed admin 帳號 | 選填 | `admin@hexschool.com` | `src/database.js` |
| `ADMIN_PASSWORD` | seed admin 密碼 | 選填 | `12345678` | `src/database.js` |
| `ECPAY_MERCHANT_ID` | 綠界商店代號 | 必要（使用 ECPay 時） | `3002607` | `src/services/ecpayService.js` |
| `ECPAY_HASH_KEY` | 綠界 hash key | 必要（使用 ECPay 時） | 範例值 | `src/services/ecpayService.js` |
| `ECPAY_HASH_IV` | 綠界 hash iv | 必要（使用 ECPay 時） | 範例值 | `src/services/ecpayService.js` |
| `ECPAY_ENV` | 綠界環境切換 | 選填 | `staging` | `src/services/ecpayService.js` |

## 8. JSDoc / OpenAPI 註解格式

本專案 API 文件依賴 route 檔的 `@openapi` 註解，請維持以下格式：

```js
/**
 * @openapi
 * /api/example:
 *   post:
 *     summary: 範例 API
 *     tags: [Example]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/example', handler);
```

撰寫要點：
- `path` 必須與實際 router 掛載後的完整路徑一致。
- `required` 與實際驗證邏輯一致，避免文件與程式不一致。
- 安全性端點要加 `security`（`bearerAuth` 或 `sessionId`）。

## 9. 計畫歸檔流程

1. 計畫檔案命名格式：YYYY-MM-DD-<feature-name>.md
2. 計畫文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 docs/plans/archive/
4. 更新 docs/FEATURES.md 和 docs/CHANGELOG.md

## 10. 文件同步規則
- 調整 API 行為：同步更新 `FEATURES.md` + `ARCHITECTURE.md`。
- 調整執行流程/約束：同步更新 `DEVELOPMENT.md`。
- 測試覆蓋變更：同步更新 `TESTING.md`。
- 版本釋出或重大完成：更新 `CHANGELOG.md`。
