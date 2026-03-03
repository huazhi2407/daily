# Personal Life OS — 架構審查

**審查視角：** Principal Engineer  
**日期：** 2025  
**範圍：** 可擴充性、重構、DB 遷移、效能、安全性、測試

---

## 1. 潛在可擴充性問題

### 1.1 每次操作全量載入

**問題：** Hooks 載入並儲存整個集合。`useTimeLogs` 在每次 `startTimer`、`stopTimer`、`addManualEntry`、`updateLog`、`deleteLog` 時都呼叫 `getAllLogs()`。若有 10,000+ 筆時間記錄，每次操作會：
- 從 localStorage 讀取整個陣列
- 解析 JSON（阻塞主執行緒）
- 在記憶體中修改
- 序列化整個陣列回傳
- 寫入 localStorage（5–10MB 限制）

**影響：** 每次操作 O(n)。localStorage 約 5–10MB 限制；大量資料會觸及配額並導致靜默失敗。

**證據：**
```ts
// useTimeLogs.ts - 每次 mutation 都載入 ALL logs
const getAllLogs = useCallback(async (): Promise<TimeLog[]> => {
  const raw = await p.get<...>(PERSISTENCE_KEYS.TIME_LOGS);
  return (raw ?? []).map(recordToTimeLog);  // 整個集合
}, []);
```

### 1.2 無分頁或虛擬化

- 任務頁面渲染所有任務；無上限
- 日曆載入當月所有事件，但任務是全域儲存——篩選在記憶體中進行
- 時間記錄在載入整個集合後於記憶體中依日期篩選

**影響：** 資料成長時，初次載入與重繪效能下降。無懶載入。

### 1.3 重複 Hook 實例 = 重複載入

Dashboard 掛載 `useTasks()`、`useTimeLogs()`、`useQuickLinks()`——各自獨立載入。導航到 `/tasks` 又掛載另一個 `useTasks()`。無共用快取：
- 同一個 session 內重複取得相同資料
- 無快取失效策略
- 每頁擁有自己的狀態副本

### 1.4 提醒去重集合無界成長

```ts
// scheduler.ts
if (arr.length > 1000) arr.splice(0, 500);  // 保留 500，之後又成長
```

成長到 1000，修剪成 500，再成長。Key 從不依時間過期——幾個月前的舊提醒永遠存在。每日提醒下，500 個 slot 約 2 週就滿。

### 1.5 IPersistence Key-Value 模型與關聯式需求不符

目前模型：一個 key = 一個 JSON blob。遷移 DB 時：
- 無查詢支援（如「依日期範圍的任務」）
- 無索引
- 無部分更新
- 無跨 key 交易

用相同介面擴充到 API/DB 會迫使：
- 伺服器每次 "get" 都做全量 fetch，或
- 新介面（破壞性變更）

---

## 2. 重構改進

### 2.1 抽離 Repository 層

**現況：** Hooks 直接呼叫 `getPersistence().get/set` 並處理序列化。

**建議：** 引入 repositories，負責 persistence + 序列化。Hooks 消費 repositories。

```
/lib
  persistence/
    types.ts
    local-storage.ts
  repositories/           # 新增
    task-repository.ts    # getActive, getCompleted, saveActive, saveCompleted
    time-log-repository.ts # getByDateRange, append, update, delete
    board-repository.ts
```

好處：
- Hooks 保持 UI 導向；repositories 負責資料存取模式
- 更容易加快取、批次或替換實作
- 每個實體的儲存策略只需改一處

### 2.2 共用資料快取（Context 或模組級）

**問題：** 多個元件使用 `useTasks()` 各自擁有獨立狀態。

**選項：**
- **A) React Context：** 用 `TasksProvider` 包住 app；`useTasks()` 從 context 讀取。單次載入、共用狀態。
- **B) 模組級快取 + 失效：**
  ```ts
  // 簡單 singleton 快取 - 無外部依賴
  let tasksCache: { data: Task[]; ts: number } | null = null;
  const CACHE_TTL_MS = 30_000;
  ```
- **C) 維持現況但文件化：** 「每頁擁有自己的資料；無跨分頁同步。」對單一使用者、單一分頁可接受。

**建議：** 在「無外部狀態庫」限制下，使用 React Context。每個領域一個 provider（Tasks、TimeLogs、Board、QuickLinks）。提醒引擎已直接讀 persistence——無需改動。

### 2.3 時間記錄分離讀寫路徑

**現況：** 每次寫入都載入整個集合。

**建議：**
- **讀：** `getByDateRange(start, end)` — persistence 層支援範圍（需新介面）
- **寫：** 新項目僅 append；update/delete 只 fetch 受影響的日期範圍

localStorage 無法做真正的範圍查詢。折衷：依日期分區 key 儲存：
```
life-os:time-logs:2025-02-28  → TimeLog[]
life-os:time-logs:2025-02-27  → TimeLog[]
```
只載入需要的日期。遷移路徑：相同結構適用於有 date 索引的 DB。

### 2.4 從 Hooks 抽離業務規則

**現況：** Top3 限制（最多 3）寫在 `useTasks` callbacks 裡。

**建議：** 移到 `/lib/domain` 或 `/lib/rules` 的純函數：
```ts
// lib/domain/task-rules.ts
export function canAddToTop3(tasks: Task[]): boolean {
  return tasks.filter(t => t.category === 'top3').length < 3;
}
```
Hooks 呼叫這些；規則可單獨單元測試，無需 React。

### 2.5 提醒去重：依時間過期

用以下取代無界陣列：
```ts
interface DedupeEntry { key: string; firedAt: string }
// 每次執行時刪除超過 7 天的項目
```
或每個任務每天一個 key：`taskId:dateString`，避免同一天重複觸發。

---

## 3. 資料庫遷移策略

### 3.1 目前 IPersistence 對 DB 過於簡化

`get(key)`、`set(key, value)`、`remove(key)` 假設：
- Key 是字串
- Value 是完整替換
- 無使用者/租戶概念（未來多使用者）

**DB 實際需求：**
- 需要 user/tenant context
- 需要分頁、篩選、排序
- 需要部分更新（PATCH）
- 需要跨實體寫入的交易

### 3.2 建議遷移路徑

**Phase 1：Adapter 模式（最小變更）**

保留 `IPersistence`，但加入將 key 對應到 API endpoint 的 **後端 adapter**：

```ts
// lib/persistence/api-adapter.ts
const KEY_TO_ENDPOINT: Record<string, string> = {
  [PERSISTENCE_KEYS.TASKS]: '/api/tasks',
  [PERSISTENCE_KEYS.TASKS_COMPLETED]: '/api/tasks/completed',
  // ...
};
```

API 回傳 `{ data: T }`。介面相同，後端不同。適用 1:1 key 對應。

**Phase 2：每個實體一個 Repository**

引入 `ITaskRepository`、`ITimeLogRepository`，方法如：
- `getActive(): Promise<Task[]>`
- `getByDateRange(start: Date, end: Date): Promise<TimeLog[]>`
- `create(task: TaskPayload): Promise<Task>`
- `update(id: string, patch: Partial<Task>): Promise<Task>`

Hooks 依賴 repositories，不直接碰 persistence。LocalStorage 與 API 各自實作 repository 介面。

**Phase 3：使用者 Context**

所有 repository 呼叫加入 `userId`。localStorage 用 `life-os:${userId}:tasks`。API 用 auth header 或 session。

### 3.3 資料遷移腳本

從 localStorage 遷移到 DB 時：
1. 匯出腳本：讀取所有 key，POST 到 `/api/migrate/import` 帶 JSON payload
2. 後端：驗證、依 id 去重、插入
3. 客戶端：遷移成功後清除對應 key 的 localStorage
4. Feature flag：`USE_API_PERSISTENCE=true` 切換

---

## 4. 效能優化

### 4.1 Board 拖曳時 Debounce 儲存

**現況：** 每次 mouseup 都 persist。快速拖曳多張卡片時，N 次儲存。

**建議：** Debounce 300–500ms。或批次：在 ref 收集所有位置更新，mouseup 時一次 flush。

### 4.2 Dashboard 區塊懶載入

**現況：** Dashboard 掛載三個 hooks；全部在 mount 時載入。

**建議：** 對 below-fold 區塊用 `React.lazy`，或 Time Log / Quick Links 只在捲入視野時載入（Intersection Observer）。

### 4.3 衍生資料 Memoize

```ts
// useTasks - top3 每次 render 都重算
const top3 = tasks.filter((t) => t.category === "top3");
```
改用 `useMemo`：
```ts
const top3 = useMemo(() => tasks.filter(t => t.category === 'top3'), [tasks]);
```

### 4.4 長列表虛擬化

任務、時間記錄、已完成任務：超過 50 筆時，用 `react-window` 或 CSS `content-visibility` 處理 off-screen 列。或分頁：「載入更多」按鈕。

### 4.5 JSON.parse 在 Web Worker（未來）

對非常大的 localStorage blob，在 worker 中 parse 避免阻塞主執行緒。目前規模過度；當每 key > 1MB 時再考慮。

---

## 5. 安全性改進

### 5.1 Quick Links：開放重導風險

**現況：** 使用者提供的 `url` 用在 `<a href={l.url}>`。惡意值：`javascript:alert(1)` 或 `data:text/html,<script>...</script>`。

**修正：** 驗證 URL scheme。只允許 `https:`、`http:`（或僅 https）：
```ts
function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}
```

### 5.2 Board 卡片內容：XSS

**現況：** `content` 以文字渲染。若之後用 `dangerouslySetInnerHTML` 或富文本編輯器，使用者輸入可能注入腳本。

**緩解：** 保持內容為純文字。若之後加 markdown/HTML，需 sanitize（如 DOMPurify）。

### 5.3 localStorage：無加密

資料是純 JSON。在共用裝置上，他人可讀取。對敏感筆記可考慮：
- 儲存前加密（如 Web Crypto API、使用者衍生 key）
- 或接受「個人」app 風險；在文件中說明資料未加密

### 5.4 客戶端無 Rate Limiting

若加 API persistence，客戶端可能濫發請求。後端必須 rate limit。客戶端可加簡單 debounce 防止誤觸雙擊。

### 5.5 提醒通知內容

`task.title` 為使用者控制。通知 body 可能很長或含特殊字元。截斷至約 100 字；必要時 escape。

---

## 6. 測試策略

### 6.1 現況：無測試

無測試檔。功能成長時回歸風險高。

### 6.2 建議結構

```
/tests
  unit/
    lib/
      domain/
        task-rules.test.ts    # canAddToTop3, validation
      utils/
        date.test.ts
    types/
      task.test.ts           # taskToRecord, recordToTask 來回轉換
  integration/
    persistence/
      local-storage.test.ts   # 使用 jsdom 或 happy-dom
  e2e/
    dashboard.spec.ts        # Playwright
```

### 6.3 單元測試（優先）

| 目標 | 測試內容 |
|------|----------|
| `taskToRecord` / `recordToTask` | 來回轉換、Date 序列化 |
| `toDateString` / `parseDateString` | 邊界情況（DST、時區） |
| 任務規則 | `canAddToTop3` 在 0、2、3、4 個任務時 |
| 提醒引擎 | `checkAndNotify` 邏輯，mock persistence |

### 6.4 Hook 測試

**挑戰：** Hooks 需要 React context（act、renderHook）。

**作法：** 使用 `@testing-library/react` + `renderHook`。Mock `getPersistence()` 回傳 in-memory store：
```ts
const mockPersistence = {
  data: new Map<string, unknown>(),
  get: async (k) => mockPersistence.data.get(k) ?? null,
  set: async (k, v) => { mockPersistence.data.set(k, v); },
  remove: async (k) => { mockPersistence.data.delete(k); },
};
// 透過 module mock 或 context 注入
```

### 6.5 E2E 測試（Playwright）

關鍵路徑：
1. 新增任務 → 出現在列表
2. 完成任務 → 移到已完成
3. 開始計時 → 停止計時 → 時間記錄顯示時長
4. 新增白板卡片 → 拖曳 → 重新整理 → 位置持久化
5. 新增快速連結 → 點擊 → 開啟（驗證無 js: protocol）

### 6.6 提醒引擎：Mock 時間

用 `jest.useFakeTimers()` 或 `sinon.useFakeTimers()` 推進 60 秒並斷言通知觸發。Mock `Notification` API。

---

## 總結：優先矩陣

| 領域 | 嚴重度 | 工時 | 建議 |
|------|--------|------|------|
| Quick Links URL 驗證 | 高 | 低 | 立即做 |
| Repository 層抽離 | 中 | 中 | 規劃 v2 |
| 共用快取（Context） | 中 | 中 | 若多頁使用增加 |
| 時間記錄依日期分區 | 中 | 中 | 1000+ 筆前 |
| 提醒去重過期 | 低 | 低 | 儘快做 |
| domain/utils 單元測試 | 高 | 中 | 立即做 |
| E2E 關鍵路徑 | 中 | 高 | 單元測試後 |
| DB 遷移（repository 介面） | 高 | 高 | 多使用者前 |

---

## 結論

架構對 **MVP 而言穩固**：types、persistence 抽象、logic-in-hooks 分離清楚。未經重構無法擴充到 10k+ 筆或多使用者。

**立即行動：**
1. 為 Quick Links 加 URL 驗證
2. 為序列化與 domain 規則加單元測試
3. 文件化 localStorage 限制並建議資料保留政策

**DB 遷移前：**
1. 引入具適當介面的 repository 層
2. 為所有資料存取加 user/tenant context
3. 為時間記錄實作依日期分區儲存

**長期：**
1. 考慮共用快取（Context）減少重複載入
2. 為長列表加分頁或虛擬化
3. 為核心流程實作 E2E 測試
