# 系統架構與資料流

## 1. 架構總覽

本系統採用單體 Node.js 應用：
- `Express` 同時提供 API 與 EJS 頁面路由
- `SQLite (better-sqlite3)` 直接由應用層存取，無 ORM
- 前端互動以 `Vue 3 CDN` + `fetch` 呼叫 API
- 驗證採 JWT；購物車為 JWT/Session Header 雙模式

高層流程：
1. `server.js` 檢查必要環境變數（`JWT_SECRET`）並啟動 HTTP server
2. `app.js` 載入 middleware、初始化資料庫、掛載 API 與頁面路由
3. `src/database.js` 建表與 seed（admin + 預設商品）
4. 路由回應統一 envelope：`{ data, error, message }`
5. API 錯誤由 route 內顯式處理；未捕捉錯誤由 `errorHandler` 收斂

## 2. 目錄與檔案用途

### 2.1 根目錄核心

| 檔案 | 用途 | 關鍵注意 |
| --- | --- | --- |
| `server.js` | 啟動 server 與輸出 port | 未設定 `JWT_SECRET` 直接 `process.exit(1)` |
| `app.js` | Express 組裝入口 | 先載入 DB，再掛 middleware/routes/404/error handler |
| `package.json` | 指令與依賴定義 | `start` 會先 `css:build` |
| `.env.example` | 環境變數範本 | 含 JWT、admin seed、ECPay 預留參數 |
| `swagger-config.js` | OpenAPI 基礎定義 | 定義 `bearerAuth` 與 `sessionId` security scheme |
| `generate-openapi.js` | 產生 `openapi.json` | 讀取 route 內 `@openapi` 註解 |
| `vitest.config.js` | 測試框架設定 | 關閉 file parallel，固定測試順序 |

### 2.2 後端程式

| 路徑 | 用途 |
| --- | --- |
| `src/database.js` | DB 連線、pragma、建表、seed、交易工具 |
| `src/middleware/authMiddleware.js` | JWT 驗證與 `req.user` 注入 |
| `src/middleware/adminMiddleware.js` | 管理員權限檢查 |
| `src/middleware/sessionMiddleware.js` | 擷取 `X-Session-Id` 到 `req.sessionId` |
| `src/middleware/errorHandler.js` | 未處理錯誤統一輸出 |
| `src/routes/authRoutes.js` | 註冊/登入/個人資料 |
| `src/routes/productRoutes.js` | 前台商品查詢 |
| `src/routes/cartRoutes.js` | 購物車雙模式 API |
| `src/routes/orderRoutes.js` | 會員訂單、建單、模擬付款 |
| `src/routes/adminProductRoutes.js` | 管理員商品 CRUD |
| `src/routes/adminOrderRoutes.js` | 管理員訂單查詢 |
| `src/routes/pageRoutes.js` | 前台/後台頁面路由 |

### 2.3 前端程式

| 路徑 | 用途 |
| --- | --- |
| `views/layouts/*.ejs` | 前台/後台版型 |
| `views/pages/**/*.ejs` | 頁面結構與 Vue 掛載點 |
| `views/partials/*.ejs` | 頁首、頁尾、通知、後台側邊欄 |
| `public/js/auth.js` | Token/User/Session localStorage 管理與 guard |
| `public/js/api.js` | API 請求封裝（自動帶 auth headers、401 導向） |
| `public/js/notification.js` | 統一 toast |
| `public/js/header-init.js` | 動態 header（登入態、購物車 badge） |
| `public/js/pages/*.js` | 各頁 Vue 行為（商品、購物車、結帳、後台） |
| `public/css/input.css` | Tailwind theme token 與全域樣式入口 |
| `public/css/output.css` | 編譯後 CSS |

#### `public/js/pages/` 檔案用途（逐檔）

| 檔案 | 用途 |
| --- | --- |
| `public/js/pages/index.js` | 首頁商品載入、分頁、加入購物車、推薦區渲染 |
| `public/js/pages/product-detail.js` | 商品詳情載入、數量調整、加入購物車 |
| `public/js/pages/cart.js` | 購物車列表、數量修改、刪除、結帳導向 |
| `public/js/pages/checkout.js` | 結帳表單驗證、建單提交、空車導回 |
| `public/js/pages/login.js` | 登入/註冊 tab 切換與提交流程 |
| `public/js/pages/orders.js` | 使用者訂單列表載入與狀態顯示 |
| `public/js/pages/order-detail.js` | 訂單詳情載入與模擬付款操作 |
| `public/js/pages/admin-products.js` | 後台商品列表、新增/編輯 modal、刪除確認 |
| `public/js/pages/admin-orders.js` | 後台訂單列表、狀態篩選、詳情 modal |

#### `views/` 檔案用途（逐檔）

| 檔案 | 用途 |
| --- | --- |
| `views/layouts/front.ejs` | 前台頁面共用骨架與共用 script 掛載 |
| `views/layouts/admin.ejs` | 後台頁面骨架、admin guard 與側邊欄 |
| `views/partials/head.ejs` | `<head>`、字型、主樣式載入 |
| `views/partials/header.ejs` | 前台 header（購物車與登入區塊） |
| `views/partials/footer.ejs` | 全站 footer |
| `views/partials/notification.ejs` | 全站 toast 容器 |
| `views/partials/admin-header.ejs` | 後台頂部導覽與登出 |
| `views/partials/admin-sidebar.ejs` | 後台側邊選單與 active 狀態 |
| `views/pages/index.ejs` | 首頁內容（hero、商品、品牌與服務區塊） |
| `views/pages/product-detail.ejs` | 商品詳情頁容器與購買區塊 |
| `views/pages/cart.ejs` | 購物車頁面與摘要區塊 |
| `views/pages/checkout.ejs` | 結帳頁（收件表單 + 訂單摘要） |
| `views/pages/login.ejs` | 登入/註冊頁 |
| `views/pages/orders.ejs` | 使用者訂單列表頁 |
| `views/pages/order-detail.ejs` | 使用者訂單詳情與付款操作頁 |
| `views/pages/admin/products.ejs` | 後台商品管理頁 |
| `views/pages/admin/orders.ejs` | 後台訂單管理頁 |
| `views/pages/404.ejs` | 前台 404 頁面 |

### 2.4 測試

| 路徑 | 用途 |
| --- | --- |
| `tests/setup.js` | Supertest app 與 helper（admin token / register user） |
| `tests/auth.test.js` | Auth API 測試 |
| `tests/products.test.js` | Product API 測試 |
| `tests/cart.test.js` | Cart API（guest + auth）測試 |
| `tests/orders.test.js` | Order API 測試 |
| `tests/adminProducts.test.js` | Admin product API 測試 |
| `tests/adminOrders.test.js` | Admin order API 測試 |

## 3. 啟動流程（Startup Lifecycle）

1. `server.js` 載入 `app`。
2. 若 `require.main === module`：
- 驗證 `process.env.JWT_SECRET` 是否存在。
- 取得 `PORT`（預設 `3001`）並 `app.listen(...)`。
3. `app.js` 啟動時：
- `dotenv.config()` 載入環境變數。
- `require('./src/database')` 立刻執行 DB 初始化：
  - 開啟 SQLite 檔案
  - 設 `journal_mode = WAL`, `foreign_keys = ON`
  - `CREATE TABLE IF NOT EXISTS ...`
  - seed admin 與商品
- 設定 `view engine` 為 EJS。
- 註冊 middleware：`cors`、`express.json`、`urlencoded`、`sessionMiddleware`。
- 掛載 API routes：`/api/auth`、`/api/admin/products`、`/api/admin/orders`、`/api/products`、`/api/cart`、`/api/orders`。
- 掛載頁面路由 `/`。
- 最後掛載 404 handler 與 `errorHandler`。

## 4. API 路由總覽

| 前綴 | 路由檔案 | 認證 | 授權 | 說明 |
| --- | --- | --- | --- | --- |
| `/api/auth` | `src/routes/authRoutes.js` | register/login 不需；profile 需 JWT | 無 | 帳號註冊、登入、取得個資 |
| `/api/products` | `src/routes/productRoutes.js` | 不需 | 無 | 商品列表/商品詳情 |
| `/api/cart` | `src/routes/cartRoutes.js` | 需「JWT 或 X-Session-Id」 | 無 | 購物車查詢/新增/修改/刪除 |
| `/api/orders` | `src/routes/orderRoutes.js` | 需 JWT | 一般使用者/管理員皆可查自己的訂單 | 建單、查自己的訂單、模擬付款 |
| `/api/admin/products` | `src/routes/adminProductRoutes.js` | 需 JWT | 需 `role=admin` | 後台商品 CRUD |
| `/api/admin/orders` | `src/routes/adminOrderRoutes.js` | 需 JWT | 需 `role=admin` | 後台訂單列表、詳情 |
| `/` | `src/routes/pageRoutes.js` | 頁面本身不做 server-side 保護 | 前端 JS guard | 前台與後台頁面渲染 |

## 5. 統一回應格式

### 5.1 成功範例
```json
{
  "data": {
    "products": [],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  },
  "error": null,
  "message": "成功"
}
```

### 5.2 失敗範例（驗證錯誤）
```json
{
  "data": null,
  "error": "VALIDATION_ERROR",
  "message": "email、password、name 為必填欄位"
}
```

### 5.3 失敗範例（未授權）
```json
{
  "data": null,
  "error": "UNAUTHORIZED",
  "message": "Token 無效或已過期"
}
```

### 5.4 404（API）
```json
{
  "data": null,
  "error": "NOT_FOUND",
  "message": "找不到該路徑"
}
```

### 5.5 未處理錯誤（errorHandler）
```json
{
  "data": null,
  "error": "INTERNAL_ERROR",
  "message": "伺服器內部錯誤"
}
```

## 6. 認證與授權機制

### 6.1 JWT 參數
- 簽章演算法：`HS256`
- Secret：`process.env.JWT_SECRET`
- payload 欄位：`userId`, `email`, `role`
- 有效期：`7d`（於註冊與登入簽發）

### 6.2 `authMiddleware` 行為
1. 檢查 `Authorization` header 且須為 `Bearer <token>`。
2. `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`。
3. 二次查 DB，確認 `users.id` 仍存在。
4. 注入 `req.user = { userId, email, role }`。
5. 失敗時回 `401 UNAUTHORIZED`。

### 6.3 `adminMiddleware` 行為
- 依 `req.user.role` 驗證是否為 `admin`。
- 非 admin 回 `403 FORBIDDEN`。

### 6.4 購物車雙模式認證（`cartRoutes.dualAuth`）
優先序與規則：
1. 若帶 `Authorization: Bearer ...`：
- 驗證 JWT。
- token 無效直接 `401`（不 fallback 到 session）。
2. 否則若 `req.sessionId` 存在（由 `X-Session-Id` 提供）：通過。
3. 若兩者皆無：`401`，訊息要求提供 Token 或 `X-Session-Id`。

擁有者欄位選擇：
- JWT 模式：`cart_items.user_id = req.user.userId`
- Session 模式：`cart_items.session_id = req.sessionId`

## 7. Database Schema

> 實際 DB 檔：`database.sqlite`；初始化於 `src/database.js`。

### 7.1 `users`
| 欄位 | 型別 | 約束 | 說明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `email` | TEXT | UNIQUE, NOT NULL | 登入帳號 |
| `password_hash` | TEXT | NOT NULL | bcrypt hash |
| `name` | TEXT | NOT NULL | 使用者名稱 |
| `role` | TEXT | NOT NULL, DEFAULT `'user'`, CHECK in `('user','admin')` | 權限角色 |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | 建立時間 |

### 7.2 `products`
| 欄位 | 型別 | 約束 | 說明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `name` | TEXT | NOT NULL | 商品名 |
| `description` | TEXT | nullable | 商品描述 |
| `price` | INTEGER | NOT NULL, CHECK `> 0` | 單價 |
| `stock` | INTEGER | NOT NULL, DEFAULT `0`, CHECK `>= 0` | 庫存 |
| `image_url` | TEXT | nullable | 圖片 URL |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | 建立時間 |
| `updated_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | 更新時間 |

### 7.3 `cart_items`
| 欄位 | 型別 | 約束 | 說明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `session_id` | TEXT | nullable | guest 購物車識別 |
| `user_id` | TEXT | FK -> `users.id`, nullable | 會員購物車識別 |
| `product_id` | TEXT | NOT NULL, FK -> `products.id` | 商品 |
| `quantity` | INTEGER | NOT NULL, DEFAULT `1`, CHECK `> 0` | 數量 |

### 7.4 `orders`
| 欄位 | 型別 | 約束 | 說明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `order_no` | TEXT | UNIQUE, NOT NULL | 顯示用訂單編號（`ORD-YYYYMMDD-XXXXX`） |
| `user_id` | TEXT | NOT NULL, FK -> `users.id` | 下單者 |
| `recipient_name` | TEXT | NOT NULL | 收件人 |
| `recipient_email` | TEXT | NOT NULL | 收件 email |
| `recipient_address` | TEXT | NOT NULL | 收件地址 |
| `total_amount` | INTEGER | NOT NULL | 訂單總額 |
| `status` | TEXT | NOT NULL, DEFAULT `'pending'`, CHECK in `('pending','paid','failed')` | 付款狀態 |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | 建立時間 |

### 7.5 `order_items`
| 欄位 | 型別 | 約束 | 說明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | UUID |
| `order_id` | TEXT | NOT NULL, FK -> `orders.id` | 所屬訂單 |
| `product_id` | TEXT | NOT NULL | 商品 id 快照 |
| `product_name` | TEXT | NOT NULL | 商品名稱快照 |
| `product_price` | INTEGER | NOT NULL | 商品單價快照 |
| `quantity` | INTEGER | NOT NULL | 下單數量 |

## 8. 關鍵資料流

### 8.1 註冊 / 登入 / 取得個資
1. 註冊：驗證欄位與 email 格式 -> 檢查 email 唯一 -> bcrypt hash -> insert user -> 簽發 JWT。
2. 登入：查 user -> bcrypt compare -> 簽發 JWT。
3. profile：`authMiddleware` 驗證後查 DB 回傳。

### 8.2 商品瀏覽到加入購物車
1. 前台商品頁呼叫 `/api/products`、`/api/products/:id`。
2. 加入購物車呼叫 `/api/cart`。
3. 若同商品已存在同 owner cart，採「數量累加」而非新增新列。
4. 累加或新增前均做庫存檢查。

### 8.3 建立訂單（交易）
`POST /api/orders` 的 transaction 內容：
1. 驗證收件欄位與 email。
2. 讀取 `user_id` 對應 cart + product snapshot。
3. 檢查購物車不為空與庫存足夠。
4. 在單一 transaction 內：
- 建立 `orders`
- 寫入多筆 `order_items`
- 扣除 `products.stock`
- 清空該 user 的 `cart_items`
5. 回傳新訂單摘要。

### 8.4 訂單付款狀態流
- 初始狀態：`pending`
- `PATCH /api/orders/:id/pay`：
  - `action=success` -> `paid`
  - `action=fail` -> `failed`
- 僅 `pending` 訂單可被此 API 轉換，否則回 `INVALID_STATUS`。

### 8.5 後台資料流
- 後台頁面只做前端 guard；真正保護在後台 API middleware。
- 商品刪除前會檢查是否存在 `pending` 訂單關聯；有則 `409 CONFLICT`。
- 後台訂單列表可依 `status` 篩選並分頁。

## 9. 金流 / 第三方整合現況

目前系統採「模擬付款」而非真實金流：
- 付款按鈕觸發 `/api/orders/:id/pay`，只更新 `orders.status`。
- `.env` 雖提供 ECPay 參數（`ECPAY_MERCHANT_ID`, `ECPAY_HASH_KEY`, `ECPAY_HASH_IV`, `ECPAY_ENV`），但程式碼沒有任何 ECPay SDK 或 API 呼叫。

現行可視為三階段：
1. 建單成功（`pending`）
2. 使用者在訂單詳情頁點選「付款成功/失敗」
3. 系統更新狀態並刷新 UI

若未來接入真實金流，需新增：
- 下單後建立第三方交易單
- callback / webhook 驗章與狀態同步
- 付款結果 idempotency 與重放保護
