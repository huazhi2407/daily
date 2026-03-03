# Personal Life OS

全端個人生產力 Web App——任務系統、每日焦點（Top 3）、時間追蹤、日曆、畫布白板與提醒通知。使用 Next.js 14、TypeScript 建構，採用清晰架構以利長期維護。

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

---

## 功能

| 模組 | 說明 |
|------|------|
| **任務系統** | 分類（Top 3、Must、Scheduled、Backlog、Misc），Top 3 最多 3 個，已完成任務分開儲存 |
| **每日 Top 3** | 每天聚焦三件最重要的事 |
| **Time Log** | 開始/停止計時、手動新增、每日時間軸、總專注時間 |
| **日曆** | 月曆檢視，點選日期查看該日任務 |
| **Canvas Board** | 拖曳便籤，位置持久化 |
| **快速連結** | 常用網址書籤 |
| **提醒引擎** | 60 秒輪詢、Web Notifications API，到期前可設定多個提醒時間 |

---

## 快速開始

```bash
git clone <repo-url>
cd personal-life-os
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。資料儲存於 `localStorage`（僅客戶端）。

---

## 架構

### 概覽

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Pages     │────▶│    Hooks    │────▶│   Persistence   │
│  (僅 UI)   │     │ (邏輯 +     │     │  (IPersistence) │
│             │     │  狀態)      │     │  localStorage   │
└─────────────┘     └─────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Types    │
                    │ (領域模型)  │
                    └─────────────┘
```

- **無外部狀態庫** — 使用 React `useState` + 自訂 hooks
- **邏輯在 hooks** — CRUD、驗證、業務規則集中封裝
- **持久層抽象** — `IPersistence` 介面；可替換實作以遷移資料庫
- **型別優先** — 領域模型在 `/types`；透過 `*ToRecord` / `recordTo*` 序列化

### 專案結構

```
/app                    # Next.js App Router
  dashboard/            # 每日總覽
  tasks/                # 任務 CRUD
  calendar/             # 月曆檢視
  log/                  # 時間追蹤
  board/                # 畫布
  settings/             # 通知、快速連結

/components
  layout/               # Sidebar、BottomNav、PageShell
  providers/            # ReminderProvider（掛載引擎）

/hooks                  # 業務邏輯
  useTasks, useTimeLogs, useBoard, useReminders, useQuickLinks

/lib
  persistence/          # IPersistence + LocalStorage 實作
  reminder-engine/      # 60s 輪詢、Web Notifications、去重
  utils/                # 日期工具

/types                  # 所有 TypeScript 模型
```

詳見 [ARCHITECTURE.md](./ARCHITECTURE.md)。

---

## 技術亮點

### 1. 持久層抽象

`IPersistence` 為精簡介面（`get`、`set`、`remove`）。目前使用 `createLocalStoragePersistence()`。若要遷移至資料庫：

- 實作 `createApiPersistence()` 呼叫你的 API
- 在 `lib/persistence/index.ts` 中替換
- Hooks 與 UI 無需修改

### 2. 自訂 Hooks 作為單一來源

每個領域（Tasks、TimeLogs、Board 等）有一個 hook 負責：

- 狀態
- 載入/儲存邏輯
- 驗證（如 Top 3 最多 3 個）
- 序列化（領域 ↔ record）

元件只呼叫 hooks；不直接存取持久層。

### 3. 提醒引擎（無 React 依賴）

提醒引擎位於 `lib/reminder-engine/`，無 React 依賴。它：

- 每 60 秒輪詢
- 直接從持久層讀取任務（避免過期狀態）
- 當 `now >= dueTime - offset` 時觸發
- 透過持久化 key 去重
- 使用 Web Notifications API

### 4. Mobile-First 版面

- **桌面**：Sidebar + 主內容
- **手機**：底部導覽、響應式 padding、safe-area 支援

### 5. 型別安全序列化

領域型別使用 `Date`；持久層使用 ISO 字串。轉換明確：

```ts
// types/task.ts
export function taskToRecord(t: Task): TaskRecord { ... }
export function recordToTask(r: TaskRecord): Task { ... }
```

---

## 可擴充性

### 目前設計

- **目標**：單一使用者、單一裝置、約 1k 任務、約 10k 時間記錄
- **儲存**：localStorage（約 5–10MB 限制）
- **載入模式**：每個實體全量載入；在記憶體中篩選

### 已知限制

| 問題 | 影響 | 緩解方向 |
|------|------|----------|
| 全量載入 | 每次操作 O(n) | Repository 層 + 時間記錄依日期分區 key |
| 無分頁 | 所有項目在 DOM | 虛擬化或「載入更多」 |
| 重複 hook 實例 | 每頁重複載入相同資料 | React Context 或模組級快取 |
| 僅 key-value | 無查詢/索引 | 引入 repository 介面，如 `getByDateRange` 等 |

### 遷移至資料庫

1. **Phase 1**：以 API 呼叫實作 `IPersistence`；替換持久層
2. **Phase 2**：加入 repository 層（`ITaskRepository`、`ITimeLogRepository`）並支援查詢
3. **Phase 3**：加入使用者/租戶 context 以支援多使用者

詳見 [docs/ARCHITECTURE_REVIEW.md](./docs/ARCHITECTURE_REVIEW.md) 的可擴充性分析。

---

## 未來規劃

| 階段 | 範圍 |
|------|------|
| **v1.1** | Dashboard UX 優化（日期 hero、進度指標、開始計時 CTA） |
| **v1.2** | 單元測試（領域規則、序列化）、E2E 關鍵路徑 |
| **v1.3** | Repository 層抽離、時間記錄依日期分區 |
| **v2.0** | API 持久化、使用者認證、雲端同步 |
| **v2.1** | 專注目標 + 連續天數、下拉更新、Quick Links URL 驗證 |

---

## 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 建置正式版 |
| `npm run start` | 啟動正式版伺服器 |
| `npm run lint` | 執行 ESLint |

---

## 文件

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 專案結構、設計決策、資料模型 |
| [docs/ARCHITECTURE_REVIEW.md](./docs/ARCHITECTURE_REVIEW.md) | 可擴充性、重構、安全性、測試 |
| [docs/DASHBOARD_DESIGN_REVIEW.md](./docs/DASHBOARD_DESIGN_REVIEW.md) | UX 優化、版面、動機機制 |
| [docs/INTERVIEW_TALKING_POINTS.md](./docs/INTERVIEW_TALKING_POINTS.md) | 面試準備 |

---

## License

MIT
