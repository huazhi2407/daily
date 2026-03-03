# Personal Life OS - 生產級架構

## 專案結構（可擴充 3 年以上）

```
/app                      # Next.js App Router - 僅路由
  layout.tsx              # 根 layout、Sidebar、BottomNav、ReminderProvider
  page.tsx                # 導向 /dashboard
  globals.css
  dashboard/page.tsx
  tasks/page.tsx
  calendar/page.tsx
  log/page.tsx
  board/page.tsx
  settings/page.tsx

/components
  layout/
    Sidebar.tsx           # 桌面導覽（手機隱藏）
    BottomNav.tsx        # 手機底部導覽（桌面隱藏）
    PageShell.tsx        # 頁面外層，標題 + padding
  providers/
    ReminderProvider.tsx  # 掛載提醒引擎（無 UI）

/hooks                    # 業務邏輯 - 單一來源
  useTasks.ts
  useTimeLogs.ts
  useBoard.ts
  useReminders.ts
  useQuickLinks.ts
  index.ts

/lib
  persistence/            # 儲存抽象 - 之後可替換為 DB
    types.ts              # IPersistence 介面
    keys.ts               # 儲存 key 常數
    local-storage.ts      # LocalStorage 實作
    index.ts
  reminder-engine/        # 通知邏輯
    scheduler.ts          # 60s 輪詢、Web Notifications、去重
    index.ts
  utils/
    date.ts               # 原生日期工具（無外部套件）
    index.ts

/types                    # 所有 TypeScript 型別 - 單一來源
  index.ts
  common.ts               # Id、DateString、generateId、toDateString
  task.ts
  time-log.ts
  board.ts
  reminder.ts
  quick-link.ts

/utils                    # App 層工具（目前為空）
```

---

## 設計決策

### 1. 無外部狀態庫
- 在自訂 hooks 中使用 React `useState` + `useCallback`
- 每個 hook 負責自己的 CRUD + 持久化
- 元件只消費 hooks；無共用全域 store

### 2. 持久層抽象
- `IPersistence`：`get`、`set`、`remove`
- 目前：`createLocalStoragePersistence()`
- 未來：`createApiPersistence()` — 在 `lib/persistence/index.ts` 替換，無需改 hooks

### 3. 邏輯在 Hooks
- `useTasks`、`useTimeLogs`、`useBoard`、`useReminders`、`useQuickLinks`
- Hooks 封裝：載入、儲存、驗證、業務規則
- UI 保持單純：渲染 + 呼叫 hook actions

### 4. 型別優先
- 所有模型在 `/types`
- `TaskRecord` / `recordToTask` 負責序列化
- 持久層存 raw records；hooks 轉成領域型別

### 5. 提醒引擎
- 獨立模組，無 React 依賴
- 直接從 persistence 讀任務（避免過期狀態）
- 每 60s 輪詢，當 `now >= dueTime - offset` 時觸發
- 透過 `PERSISTENCE_KEYS.REMINDER_DEDUPE` 去重
- 使用 Web Notifications API

---

## 資料模型

### Task
```ts
{
  id, title, description?, dueTime?, category: "top3"|"must"|"scheduled"|"backlog"|"misc",
  reminderOffsets: number[],  // 到期前幾分鐘提醒
  completed, createdAt
}
```
- `top3` 最多 3 個
- 已完成任務存在另一個 key

### TimeLog
```ts
{
  id, startTime, endTime?, title, category: "study"|"work"|"life"|"waste",
  relatedTaskId?, note?
}
```

### BoardCard
```ts
{ id, x, y, content }
```

### QuickLink
```ts
{ id, label, url, icon?, order }
```

---

## 遷移至資料庫

1. 以 API 呼叫實作 `IPersistence`：
   ```ts
   const apiPersistence: IPersistence = {
     async get(key) { const res = await fetch(`/api/data?key=${key}`); return res.json(); },
     async set(key, value) { await fetch('/api/data', { method: 'POST', body: JSON.stringify({ key, value }) }); },
     async remove(key) { await fetch(`/api/data?key=${key}`, { method: 'DELETE' }); },
   };
   ```
2. 在 `lib/persistence/index.ts` 將 `createLocalStoragePersistence` 替換為 `apiPersistence`
3. Hooks 與 UI 無需修改

---

## 頁面

| 路由 | 用途 |
|------|------|
| / | 導向 /dashboard |
| /dashboard | Top3 總覽、Time Log 摘要、快速連結 |
| /tasks | 任務 CRUD、分類篩選、跨分類移動 |
| /calendar | 月曆檢視，點日期 → 顯示該日任務（dueTime） |
| /log | Time Log：計時器、手動新增、每日時間軸 |
| /board | Canvas：新增卡片、拖曳、位置持久化 |
| /settings | 通知權限、快速連結管理 |

---

## 執行

```bash
npm install
npm run dev
```
