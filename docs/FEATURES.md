# 功能清單與完成狀態

> 狀態定義：
> - `完成`：功能在 API + 前端流程可用，且已有測試覆蓋核心路徑
> - `部分完成`：存在預留設定或模擬流程，尚未接入真實外部服務

## 1. Auth（完成）

### 1.1 功能行為
系統提供註冊、登入、個資查詢。註冊與登入會直接發 JWT，前端儲存在 localStorage，後續以 Bearer token 呼叫受保護 API。

### 1.2 端點與參數

#### `POST /api/auth/register`
- Request body
  - 必填：`email`, `password`, `name`
  - 規則：
    - `email` 必須通過基本 email regex
    - `password` 長度 >= 6
- 回傳：`user` 基本資料 + `token`

#### `POST /api/auth/login`
- Request body
  - 必填：`email`, `password`
- 回傳：`user` 基本資料 + `token`

#### `GET /api/auth/profile`
- Header
  - 必填：`Authorization: Bearer <token>`
- 回傳：`id/email/name/role/created_at`

### 1.3 業務邏輯
- 註冊：先檢查 email 唯一，再 bcrypt hash，插入 `users`。
- 登入：查 `users` + bcrypt compare。
- token payload 內含 `userId/email/role`，有效期 `7d`。

### 1.4 錯誤碼與情境
- `400 VALIDATION_ERROR`：缺欄位、格式錯誤、密碼長度不足
- `401 UNAUTHORIZED`：登入密碼錯誤、token 無效/過期
- `404 NOT_FOUND`：profile 查詢時 user 不存在
- `409 CONFLICT`：register email 重複

## 2. 商品瀏覽（完成）

### 2.1 功能行為
前台首頁與商品詳情頁使用此模組。商品列表支援分頁；商品詳情依 id 取得單筆資料。

### 2.2 端點與參數

#### `GET /api/products`
- Query params
  - `page`（選填，預設 1，最小 1）
  - `limit`（選填，預設 10，最小 1，最大 100）
- 回傳：`products[]` + `pagination`

#### `GET /api/products/:id`
- Path params
  - `id`（必填）
- 回傳：單一商品

### 2.3 業務邏輯
- 列表 SQL 以 `created_at DESC` 排序，前端首頁再用 `limit=9` 呈現。
- 分頁資訊統一計算 `totalPages = ceil(total/limit)`。

### 2.4 錯誤碼與情境
- `404 NOT_FOUND`：商品不存在

## 3. 購物車（完成，雙模式認證）

### 3.1 功能行為
購物車同時支援：
1. 訪客模式（`X-Session-Id`）
2. 會員模式（JWT）

前端每次 API 請求都會自動帶：
- `Authorization`（若已登入）
- `X-Session-Id`（若本機無則自動生成 UUID）

### 3.2 非標準機制：雙模式認證流程
- 若請求含 `Authorization`，系統**優先**驗 JWT。
- 若 token 無效，直接 `401`，不 fallback session。
- 只有在未帶 Authorization 時，才使用 `X-Session-Id`。

這個優先序是跨模組關鍵規則，前後端改動必須同步遵守。

### 3.3 端點與參數

#### `GET /api/cart`
- Header
  - 必填其一：`Authorization` 或 `X-Session-Id`
- 回傳：
  - `items[]`（含 product snapshot：`name/price/stock/image_url`）
  - `total`（不含運費）

#### `POST /api/cart`
- Body
  - 必填：`productId`
  - 選填：`quantity`（預設 `1`，須為正整數）

#### `PATCH /api/cart/:itemId`
- Body
  - 必填：`quantity`（正整數）

#### `DELETE /api/cart/:itemId`
- 無 body

### 3.4 業務邏輯
- 新增商品時若同 owner 同商品已存在，採「累加 quantity」。
- 累加後或直接設定新數量都會檢查 `quantity <= product.stock`。
- `GET /api/cart` 的 `total` 為 `sum(price * quantity)`。

### 3.5 錯誤碼與情境
- `400 VALIDATION_ERROR`：缺 `productId`、`quantity` 非正整數
- `400 STOCK_INSUFFICIENT`：超過庫存
- `401 UNAUTHORIZED`：未帶可用 auth、token 無效、user 不存在
- `404 NOT_FOUND`：商品不存在或 cart item 不存在

## 4. 訂單（完成，付款為模擬）

### 4.1 功能行為
使用者登入後可從購物車建立訂單，並在訂單詳情頁執行模擬付款。訂單屬於使用者本人，不可跨帳號存取。

### 4.2 端點與參數

#### `POST /api/orders`
- Auth：必須 JWT
- Body
  - 必填：`recipientName`, `recipientEmail`, `recipientAddress`
- 回傳：訂單摘要 + 訂單項目快照

#### `GET /api/orders`
- Auth：JWT
- 回傳：自己的訂單列表（`id/order_no/total_amount/status/created_at`）

#### `GET /api/orders/:id`
- Auth：JWT
- 回傳：自己的單筆訂單（含 `items`）

#### `PATCH /api/orders/:id/pay`
- Auth：JWT
- Body
  - 必填：`action`
  - 僅允許：`success` 或 `fail`

### 4.3 業務邏輯
- 建單前檢查：
  - 收件資訊完整 + email 格式
  - 購物車不可為空
  - 所有商品庫存充足
- 建單 transaction（核心）：
  - Insert `orders`
  - Insert `order_items`（保存商品名與價格快照）
  - Update `products.stock = stock - quantity`
  - Delete 該 user `cart_items`
- 付款狀態機：
  - `pending -> paid`（`action=success`）
  - `pending -> failed`（`action=fail`）
  - 非 `pending` 禁止再次付款

### 4.4 錯誤碼與情境
- `400 VALIDATION_ERROR`：收件欄位缺失、email 格式錯
- `400 CART_EMPTY`：購物車無資料
- `400 STOCK_INSUFFICIENT`：至少一個商品庫存不足
- `400 INVALID_STATUS`：訂單非 pending 卻呼叫 pay
- `401 UNAUTHORIZED`：未登入或 token 無效
- `404 NOT_FOUND`：訂單不存在（或非本人）

## 5. 後台商品管理（完成）

### 5.1 功能行為
管理員可查詢、建立、編輯、刪除商品。後台頁面僅是 UI 入口，真正權限保護在 API middleware。

### 5.2 端點與參數

#### `GET /api/admin/products`
- Query
  - `page`（預設 1）
  - `limit`（預設 10，最大 100）

#### `POST /api/admin/products`
- Body
  - 必填：`name`, `price`, `stock`
  - 選填：`description`, `image_url`
- 限制
  - `price` 正整數
  - `stock` 非負整數

#### `PUT /api/admin/products/:id`
- Body 全為選填，但若提供值需符合驗證
- `name` 不可空字串

#### `DELETE /api/admin/products/:id`
- 刪除前檢查該商品是否存在 `pending` 訂單項目

### 5.3 業務邏輯
- route 層級強制 `authMiddleware + adminMiddleware`。
- `PUT` 走 partial update：未提供欄位沿用舊值。
- 刪除保護：若 pending 訂單關聯數 > 0，拒絕刪除。

### 5.4 錯誤碼與情境
- `400 VALIDATION_ERROR`：欄位值不合法
- `401 UNAUTHORIZED`：無 token 或 token 無效
- `403 FORBIDDEN`：非 admin
- `404 NOT_FOUND`：商品不存在
- `409 CONFLICT`：商品有未完成訂單，禁止刪除

## 6. 後台訂單管理（完成）

### 6.1 功能行為
管理員可查詢全站訂單、依狀態篩選、查看訂單詳情（含買家資訊）。

### 6.2 端點與參數

#### `GET /api/admin/orders`
- Query
  - `page`（預設 1）
  - `limit`（預設 10，最大 100）
  - `status`（選填：`pending`/`paid`/`failed`）

#### `GET /api/admin/orders/:id`
- 回傳訂單本體 + `items` + `user(name,email)`

### 6.3 業務邏輯
- 列表 SQL 會動態拼接 `status` 篩選條件。
- 詳情查詢會額外 join users（採第二次 query 取得買家資料）。

### 6.4 錯誤碼與情境
- `401 UNAUTHORIZED`：無 token 或 token 無效
- `403 FORBIDDEN`：非 admin
- `404 NOT_FOUND`：訂單不存在

## 7. 前端頁面行為（完成）

### 7.1 Header 與登入態
- `header-init.js` 根據 `Auth.isLoggedIn()` 切換登入/登出區塊。
- admin 使用者顯示「後台管理」連結。
- `orders` 連結僅登入時顯示。
- header 初始化會呼叫 `/api/cart` 更新 badge。

### 7.2 登入保護
- `/checkout`、`/orders`、`/orders/:id` 由頁面 script 先執行 `Auth.requireAuth()`。
- 後台 layout 頁面 script 執行 `Auth.requireAdmin()`。

### 7.3 錯誤處理行為
- `apiFetch` 收到 `401`：清除 token/user 並導向 `/login`。
- 其他錯誤：throw 給頁面層，由 `Notification.show` 顯示訊息。

## 8. 金流整合（部分完成）

### 8.1 已完成
- 訂單狀態切換 API（模擬付款成功/失敗）。
- 前端訂單詳情頁付款按鈕與結果提示。

### 8.2 未完成
- 尚未串接 ECPay 真實交易請求與 callback 驗章。
- `.env` 的 ECPay 參數目前僅為預留。

### 8.3 影響與注意
- 現行流程可驗證訂單狀態 UI 與狀態機，不可視為真實付款流程。
- 若接入真實金流，`PATCH /pay` 可能需改為 callback 驅動，須評估對前端流程與測試的破壞性。
