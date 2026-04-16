# 測試規範與指南

## 1. 測試目標與策略

本專案以 API 整合測試為核心：
- 透過 Supertest 直接打 `app`（非外部 HTTP server）
- 驗證真實路由、middleware、DB 行為
- 覆蓋授權、驗證、資料狀態轉換與主要錯誤情境

不在此層處理：
- 前端單元測試
- E2E 瀏覽器互動測試

## 2. 測試檔案表

| 檔案 | 主要覆蓋 | 關鍵驗證 |
| --- | --- | --- |
| `tests/auth.test.js` | 註冊/登入/profile | email 重複、錯密碼、token profile |
| `tests/products.test.js` | 商品列表/詳情 | 分頁、查無商品 404 |
| `tests/cart.test.js` | 購物車 guest + auth | dual-mode、數量更新、刪除 |
| `tests/orders.test.js` | 建單/查單/ECPay 流程 | 建單成功、空購物車失敗、checkout-data、主動查詢 verify |
| `tests/adminProducts.test.js` | 後台商品 CRUD | admin 權限、一般使用者拒絕 |
| `tests/adminOrders.test.js` | 後台訂單查詢 | status 篩選、詳情、權限 |
| `tests/setup.js` | 共用 helper | admin token、動態註冊測試帳號 |

## 3. 執行順序與依賴關係

`vitest.config.js` 已固定檔案順序（`fileParallelism: false`）：
1. `tests/auth.test.js`
2. `tests/products.test.js`
3. `tests/cart.test.js`
4. `tests/orders.test.js`
5. `tests/adminProducts.test.js`
6. `tests/adminOrders.test.js`

依賴重點：
- 所有測試共用同一 SQLite 檔，彼此可能受資料狀態影響。
- `adminProducts.test.js` 與 `adminOrders.test.js` 依賴 seed admin 帳號可登入。
- 訂單測試會動到庫存與購物車狀態，新增案例需避免假設「資料永遠乾淨」。

## 4. 輔助函式說明（`tests/setup.js`）

### `getAdminToken()`
- 透過 seed 帳號 `admin@hexschool.com / 12345678` 呼叫 `/api/auth/login`
- 回傳 JWT token
- 用途：後台 API 測試授權

### `registerUser(overrides = {})`
- 動態產生不重複 email 註冊一般使用者
- 回傳 `{ token, user }`
- 用途：需要獨立 user context 的測試（cart/order/admin deny）

## 5. 新增測試步驟

1. 明確定義「前置狀態」
- 例：下單測試需先有 product + cart item。

2. 使用 helper 建立身份
- admin 用 `getAdminToken()`。
- user 用 `registerUser()`。

3. 撰寫成功案例
- 驗 `status`、`data/error/message`、必要資料欄位。

4. 撰寫失敗案例
- 至少包含一種：驗證錯誤 / 權限錯誤 / 查無資源。

5. 避免硬編碼易衝突資料
- email 使用動態字串。
- 非必要不依賴固定商品 id。

## 6. 新測試範例

```js
const { app, request, registerUser } = require('./setup');

describe('Example API', () => {
  let token;

  beforeAll(async () => {
    ({ token } = await registerUser());
  });

  it('should do something', async () => {
    const res = await request(app)
      .get('/api/some-protected-endpoint')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('error', null);
    expect(res.body).toHaveProperty('data');
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/some-protected-endpoint');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });
});
```

## 7. 常見陷阱

- **陷阱 1：測試資料互相污染**
  - 原因：共用 SQLite 檔案、非每檔 reset DB。
  - 解法：每個測試自行建立前置資料，不依賴上一測試結果。

- **陷阱 2：重複 email 導致 register 失敗**
  - 解法：一律使用 `registerUser()` 或動態 email。

- **陷阱 3：購物車模式混淆（token vs session）**
  - 解法：測試時明確指定 header，避免同時帶錯誤 Authorization。

- **陷阱 4：商品刪除被 pending 訂單阻擋**
  - 解法：若要測刪除成功，確保測試商品未被 pending 訂單引用。

- **陷阱 5：狀態機測試未覆蓋二次付款**
  - 解法：新增 `INVALID_STATUS` 案例，確認非 pending 不能再次 pay。

## 8. 執行與輸出

### 執行
```bash
npm test
```

### 當前基線（2026-04-16）
- 測試檔：6
- 測試數：34
- 預期：全部通過
