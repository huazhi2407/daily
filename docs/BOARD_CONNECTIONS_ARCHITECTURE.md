# Board 連線箭頭 — 架構說明

## 1. 資料模型

### BoardConnection

```ts
interface BoardConnection {
  id: string;
  fromId: string;  // 來源卡片 id
  toId: string;    // 目標卡片 id
}
```

- 與 `BoardCard` 分開儲存
- 連線僅存 ID 引用，不存座標（座標由卡片即時計算）

### 儲存

- **BOARD_CARDS**: `life-os:board` — 卡片陣列
- **BOARD_CONNECTIONS**: `life-os:board-connections` — 連線陣列

---

## 2. useBoard Hook 更新

- 新增 `connections` 狀態
- 新增 `addConnection(fromId, toId)` — 建立連線（含重複檢查）
- 新增 `deleteConnection(id)` — 刪除連線
- `deleteCard` 時會一併刪除該卡片相關連線

---

## 3. SVG 渲染策略

### 圖層順序

```
1. ConnectionArrows (SVG, z-index: 0)
2. BoardCard (absolute, 預設疊於上方)
```

### 渲染流程

1. `ConnectionArrows` 接收 `cards`、`connections`、`containerRect`
2. 依 `fromId`、`toId` 查詢卡片座標
3. 呼叫 `getConnectionLine(fromCard, toCard)` 得到 `{ start, end }`
4. 用 `<line>` 繪製，`markerEnd` 設定箭頭

### 拖曳時

- 拖曳中的卡片會傳入即時座標：`{ ...card, x: dragPos.x, y: dragPos.y }`
- 箭頭會隨卡片移動即時更新

---

## 4. 線座標計算

### 位置

`lib/utils/connection-line.ts`

### 邏輯

1. **卡片中心**：`(x + 90, y + 40)`（寬 180、高 80）
2. **方向向量**：`toCenter - fromCenter` 正規化
3. **起點**：從 `fromCenter` 沿方向射線，與 `fromCard` 矩形邊的交點（離開 from 的邊）
4. **終點**：從 `toCenter` 沿反方向射線，與 `toCard` 矩形邊的交點（進入 to 的邊）

### 邊緣交點

- 對每個矩形邊（左、右、上、下）計算射線交點
- 取最小的正 t 值（第一個碰到的邊）

---

## 5. 架構說明

### 模組化

| 模組 | 職責 |
|------|------|
| `types/board.ts` | BoardConnection 型別 |
| `lib/utils/connection-line.ts` | 純函數：座標計算 |
| `components/board/ConnectionArrows.tsx` | 純渲染：SVG 箭頭 |
| `hooks/useBoard.ts` | 連線 CRUD、持久化 |
| `app/board/page.tsx` | Connect Mode、點擊流程 |

### 連線模式流程

1. 點擊「連線模式」→ `connectMode = true`
2. 點擊卡片 A → `connectFromId = A`
3. 點擊卡片 B → `addConnection(A, B)`，`connectFromId = null`
4. 點擊空白處 → 取消選取

### 刪除連線

- **點擊箭頭**：確認後刪除
- **連線列表**：點「刪除」直接刪除

### 可擴充性

- 新增連線樣式：在 `ConnectionArrows` 加 `connection.type` 分支
- 新增曲線：`getConnectionLine` 回傳 `path` 或 `bezier` 控制點
- 多選：`connectFromId` 改為 `connectFromIds: string[]`
