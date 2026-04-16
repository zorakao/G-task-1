# AGENTS.md

## 專案概述
backend-project — Node.js + Express + SQLite（better-sqlite3）的花卉電商範例，前台以 EJS + Vue 3 呈現商品瀏覽、購物車、結帳與訂單，後台提供管理員商品與訂單管理 API。

## 常用指令
- `npm install`：安裝依賴
- `npm run start`：先編譯 Tailwind CSS，再啟動伺服器（正式或單機 demo）
- `npm run dev:server`：只啟動伺服器（不 watch CSS）
- `npm run dev:css`：Tailwind CSS watch 模式，開發前端樣式時使用
- `npm run css:build`：一次性編譯並壓縮 CSS
- `npm run openapi`：由 route 內 OpenAPI 註解生成 `openapi.json`
- `npm test`：執行 Vitest API 整合測試（固定檔案順序）

## 關鍵規則
- API 回應格式統一為 `{ data, error, message }`，新增端點時不可偏離此 envelope。
- JWT 為主要登入態；購物車路由採雙模式（Bearer Token 或 `X-Session-Id`），實作時不得破壞此相容流程。
- 後台 API 必須同時通過 `authMiddleware` 與 `adminMiddleware`，不可僅做前端頁面限制。
- 訂單建立流程需維持 transaction 原子性（建單、建明細、扣庫存、清購物車）。
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`。

## 詳細文件
- `./docs/README.md` — 項目介紹與快速開始
- `./docs/ARCHITECTURE.md` — 架構、目錄結構、資料流
- `./docs/DEVELOPMENT.md` — 開發規範、命名規則
- `./docs/FEATURES.md` — 功能列表與完成狀態
- `./docs/TESTING.md` — 測試規範與指南
- `./docs/CHANGELOG.md` — 更新日誌

## @docs 引用
- `@docs/README.md`
- `@docs/ARCHITECTURE.md`
- `@docs/DEVELOPMENT.md`
- `@docs/FEATURES.md`
- `@docs/TESTING.md`
- `@docs/CHANGELOG.md`
