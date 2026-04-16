# Changelog

本專案更新日誌採 Keep a Changelog 風格管理。

## [Unreleased]

### Added
- ECPay AIO 串接主流程：`/api/orders/:id/ecpay/checkout-data`（建立付款表單資料）。
- 本地主動查詢驗證流程：`/api/orders/:id/ecpay/verify` 呼叫 QueryTradeInfo 同步訂單狀態。
- 訂單詳情頁新增「前往綠界付款」與「重新查詢付款結果」互動。

### Changed
- 付款主流程由「前端模擬成功/失敗」改為「導向 ECPay + 主動查詢驗證」。
- `PATCH /api/orders/:id/pay` 改標記為 Legacy/Test 用途。

### Fixed
- 待補：問題修復

## [1.0.0] - 2026-04-16

### Added
- 建立花卉電商核心 API：
  - Auth（註冊、登入、個資）
  - Products（列表、詳情）
  - Cart（雙模式：JWT / `X-Session-Id`）
  - Orders（建單、查詢、模擬付款）
  - Admin Products（CRUD）
  - Admin Orders（列表、詳情、狀態篩選）
- 建立前台頁面：首頁、商品詳情、購物車、結帳、登入、我的訂單、訂單詳情。
- 建立後台頁面：商品管理、訂單管理。
- 建立 Tailwind 主題色票與整體 UI 風格。
- 加入 OpenAPI 註解與 `npm run openapi` 產出流程。
- 建立完整專案文件體系：
  - `AGENTS.md`
  - `docs/README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPMENT.md`
  - `docs/FEATURES.md`
  - `docs/TESTING.md`
  - `docs/plans/`、`docs/plans/archive/`

### Security
- JWT 驗證採 `HS256`，token 內含角色資訊。
- 後台 API 強制 `authMiddleware + adminMiddleware`。
- 購物車 API 實作 token 優先的雙模式驗證流程。

### Changed
- 訂單付款流程目前以模擬狀態切換取代真實金流串接。
- `.env` 保留 ECPay 參數作為未來擴充預留。

### Tests
- 建立 6 份 API 測試檔，覆蓋主要成功與錯誤情境。
- 使用 Vitest 固定測試檔順序，降低共享資料狀態造成的不穩定。
