# 2026-04-16 ECPay 本地主動查詢驗證串接

## User Story
作為專案開發者，我需要在本地環境完成可用的金流流程。由於本專案僅在本地端執行，無法穩定接收綠界 Server Notify（ReturnURL server-to-server callback），因此付款結果不能以 callback 作為唯一依據，必須改由本地端主動呼叫 QueryTradeInfo API 驗證，才能正確更新訂單狀態並回饋前端。

## Spec

### 1) 核心目標
- 將既有「模擬付款按鈕」流程升級為「ECPay AIO 導轉 + 主動查詢驗證」。
- 不新增 DB migration，先沿用現有 `orders` 結構完成 v1。
- 保留舊 `PATCH /api/orders/:id/pay` 供測試用途，但不作為正式付款主流程。

### 2) 後端設計
- 新增 ECPay service 模組：
  - `ecpayUrlEncode`
  - `generateCheckMacValue`
  - `verifyCheckMacValue`（timing-safe）
  - `buildAioCheckoutData`
  - `queryTradeInfo`
- 新增 API：
  - `POST /api/orders/:id/ecpay/checkout-data`
    - 驗證使用者身分與訂單所有權
    - 訂單需為 `pending`
    - 回傳 `action + method + fields`，供前端直接提交到 AIO
  - `POST /api/orders/:id/ecpay/verify`
    - 主動查詢 QueryTradeInfo
    - 同步本地訂單狀態：
      - `TradeStatus=1` → `paid`
      - `TradeStatus=0` → 維持 `pending`
      - 其他（且本地仍 pending）→ `failed`
- 保留 `POST /api/orders/ecpay/notify` 回 `1|OK`，僅作相容與測試用途，不作主判斷。

### 3) 交易編號策略
- 同一筆訂單固定同一個 `MerchantTradeNo`。
- 由本地 `order_no` 正規化而來（移除非英數字、長度截至 20）。
- 目標：避免重複產生新交易號造成追蹤混亂。

### 4) 前端設計（訂單詳情頁）
- 將「付款成功 / 付款失敗」模擬按鈕改為：
  - `前往綠界付款`
  - `重新查詢付款結果`
- 使用者回到 `/orders/:id?payment=return` 時：
  - 自動執行一次 `verify`
  - 若尚未成功，允許手動重查

### 5) 環境與設定
- 使用既有 `.env`：
  - `ECPAY_MERCHANT_ID`
  - `ECPAY_HASH_KEY`
  - `ECPAY_HASH_IV`
  - `ECPAY_ENV`（stage / production）
- `BASE_URL` 用於回組 `ReturnURL` / `ClientBackURL`。

### 6) 測試與文件同步
- `tests/orders.test.js` 新增 ECPay 流程測試：
  - checkout-data
  - verify（含 mock 上游回應）
- 文件同步更新：
  - `docs/FEATURES.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPMENT.md`
  - `docs/TESTING.md`
  - `docs/CHANGELOG.md`

## Tasks

- [x] 建立 ECPay service（簽章、驗章、建單參數、主動查詢）
- [x] 新增 `checkout-data` API
- [x] 新增 `verify` API
- [x] 保留 legacy `PATCH /pay` 並標記測試用途
- [x] 將訂單詳情頁改為 ECPay 導轉 + 主動查詢
- [x] 新增/更新測試案例（orders）
- [x] 同步更新 docs 主要文件
- [x] 全測試通過（6 files, 34 tests）

## 驗收結果
- 付款主流程已切換為 ECPay AIO + QueryTradeInfo 主動驗證。
- 本地限制（無公開 callback）下可完成付款結果確認。
- 現有測試全綠：`npm test` 通過（6 files / 34 tests）。

## 後續建議
- 若未來部署公開環境：補上 callback 驗章 + 冪等寫入，主動查詢作為補償機制。
- 如需完整金流追蹤：新增 payment attempts 資料結構（每次付款嘗試與綠界 trade_no 對應）。
