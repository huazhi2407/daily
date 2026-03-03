# Personal Life OS — 面試談話要點

用於技術面試時討論此專案。可依職位（前端、全端、架構師）調整深度。

---

## 1. 專案概述（30 秒）

> 「Personal Life OS 是我用 Next.js 14 和 TypeScript 建的生產力 Web App。包含任務系統與每日 Top 3 焦點、開始/停止計時的時間追蹤、日曆、拖曳畫布白板，以及使用 Web Notifications API 的提醒引擎。我採用清晰架構——邏輯在自訂 hooks、持久層抽象、無外部狀態庫——讓它好維護，也方便之後遷移資料庫。」

---

## 2. 架構決策

### 為什麼用自訂 hooks 而不是 Redux/Zustand？

> 「我想避免外部狀態庫。每個領域——任務、時間記錄、白板——都有一個 hook 負責狀態、載入/儲存邏輯與驗證。元件只呼叫 hooks。這樣 bundle 小、心智模型簡單：一個領域一個 hook、一個來源。對單一使用者 app 來說夠用。若需要跨多元件共用狀態，我會考慮 React Context 或輕量 store。」

**追問**：「你會怎麼加共用快取？」

> 「我會用 Context 包一層 TasksProvider。useTasks() 從 context 讀取。Provider 只載入一次，提供 state 和 actions。TimeLogs、Board 也用同樣模式。提醒引擎已經直接讀 persistence，所以不需要 React state。」

### 為什麼做持久層抽象？

> 「我定義了 IPersistence 介面，有 get、set、remove。目前用 LocalStorage 實作。之後要遷移資料庫時，實作一個 API adapter 把 key 對應到 endpoint，然後替換掉。Hooks 和 UI 都不用改。這是 Strategy 模式——換儲存實作，不動業務邏輯。」

**追問**：「查詢怎麼辦？」

> 「目前介面是 key-value。要接 DB 的話需要 getByDateRange、分頁等。我會加一層 repository——ITaskRepository、ITimeLogRepository——提供 getActive()、getByDateRange() 等方法。Hooks 依賴 repository，不直接碰 persistence。LocalStorage 和 API 各自實作 repository 介面。」

### 為什麼不用 date 套件？

> 「日期處理用原生 JS——toDateString、parseDateString，還有 lib/utils/date 裡幾個 helper。在這個範圍內不需要 moment 或 date-fns。依賴少一點。若之後要時區或複雜格式化，會加 date-fns。」

---

## 3. 技術挑戰與解法

### 挑戰：提醒引擎與 React state

> 「提醒引擎每 60 秒跑一次。若依賴 useTasks 的 React state，可能拿到過期資料——引擎可能用舊任務資料觸發。所以引擎直接讀 persistence。它是獨立模組，沒有 React 依賴。這樣永遠拿到最新資料，也不會把引擎綁在 component tree 上。」

### 挑戰：Top 3 限制（最多 3 個）

> 「規則在 useTasks 裡強制執行。新增或移動任務到 Top 3 時，會數現有 Top 3 數量，超過 3 就 throw。錯誤在 UI 被 catch 並顯示給使用者。規則只在一處——hook——所以好測也好改。」

### 挑戰：Board 拖曳持久化

> 「mouseup 時呼叫 moveCard 傳入最終位置。拖曳過程中用 local state 和 ref 存位置，不在每次 mousemove 都寫 persistence。只有使用者放開時才寫一次。這樣才不會每秒對 localStorage 寫幾十次。」

### 挑戰：Time log 日期篩選

> 「時間記錄存在一個陣列裡。useTimeLogs 接受可選的 date。載入時依該日期篩選。寫入——開始計時、手動新增——會載入整個陣列、修改、再存。目前規模夠用。若有 10k+ 筆，會依日期分區——例如 life-os:time-logs:2025-02-28——只載入需要的日期。」

---

## 4. 可擴充性與取捨

### 限制是什麼？

> 「localStorage 約 5–10MB。每次操作都載入整個集合，10k 時間記錄會遇到 O(n) 和可能超額。目前沒有分頁或虛擬化。我在架構審查裡寫了這些，並規劃了方向：repository 層、依日期分區儲存，最後接 API 後端。」

### 會怎麼改進？

> 「我會更早加 repository 層。現在 hooks 直接跟 persistence 溝通。Repository 負責資料存取模式——getByDateRange、append 等——換實作會比較容易。一開始也會加 domain 規則和序列化的單元測試。」

---

## 5. 測試（若被問到）

> 「目前沒有測試。我會優先：(1) taskToRecord/recordToTask 來回轉換的單元測試，以及 canAddToTop3 這類 domain 規則；(2) 用 mock persistence 測 hooks；(3) 關鍵流程的 E2E——新增任務、完成任務、開始/停止計時、新增白板卡片。架構讓這可行——hooks 可單獨測，persistence 可 mock。」

---

## 6. 安全性（若被問到）

> 「Quick Links 用使用者提供的 URL。應該驗證 scheme——只允許 https: 和 http:——避免 javascript: 或 data: URI。白板內容是純文字；若之後支援 markdown 或 HTML，需要 sanitize。localStorage 的資料沒加密；對個人 app 可接受，但會寫在文件裡。若接 API 後端，會加認證、rate limiting 和輸入驗證。」

---

## 7. 依職位調整的重點

### 前端

- 自訂 hooks 作為狀態與邏輯容器
- Mobile-first 版面（Sidebar vs BottomNav）
- 無外部狀態庫——純 React
- TypeScript 型別安全與序列化

### 全端

- 持久層抽象以支援 DB 遷移
- 提醒引擎作為背景流程（客戶端）
- 未來 API 設計：REST 或 tRPC、key-based 或 repository-based

### 架構師 / 資深

- 清晰架構：types、persistence、hooks、UI 分離
- 可擴充性限制與遷移路徑有文件
- 取捨：簡潔 vs 未來擴充（repository 層延後）

---

## 8. 可反問面試官的問題

- 「你們團隊對中型 app 的狀態管理怎麼做？」
- 「從客戶端儲存遷移到後端，你們的策略是什麼？」
- 「你們怎麼在出貨速度與長期維護之間取捨？」
