# Google 日曆整合說明

## 目前：嵌入 Google 日曆（已實作）

在 app 裡**直接顯示**你的 Google 日曆，不必登入 API，設定一次即可。

### 使用步驟

1. 打開 [Google 日曆](https://calendar.google.com)
2. 右側齒輪 → **設定** → 左側選要顯示的**日曆**
3. 捲到 **「整合日曆」** 區塊，複製 **「嵌入碼」** 裡的 iframe 的 `src` 網址  
   - 長相類似：`https://calendar.google.com/calendar/embed?src=xxx%40group.calendar.google.com&ctz=Asia%2FTaipei`
4. 在本 app **Google 日曆** 頁（側邊欄／底部導航）→ **日曆嵌入** 區塊貼上該網址 → **儲存**
5. 嵌入網址僅供在 Google 日曆頁使用（例如預覽或新分頁開啟）；**日曆頁**僅顯示本機排程月曆與時間線（含 API 取得的 Google 活動），不顯示嵌入 iframe。

### 注意

- 若日曆為「僅限受邀者」，需在 Google 日曆設定裡將該日曆改為「可供大眾查看」或使用「僅限知道連結的使用者」等選項，嵌入的 iframe 才看得到。

---

## 雙向同步（已實作）

已支援與 Google 日曆**雙向同步**，電腦與手機透過同一 Google 帳號即可**兩邊資料互通**：

- **Google 日曆頁**（`/google-calendar`）：連線／中斷、嵌入網址、已同步／待同步任務列表與「全部同步」都在此頁；完成授權後會導回此頁，token 會加密存於 cookie。
- **日曆頁**：選一天後，時間線會同時顯示「本機排程任務」與「Google 日曆活動」（Google 活動以綠點標示，可點「Google 開啟」）。
- **同步到 Google**：任務頁可勾選「同步到 Google」即自動同步；或在 Google 日曆頁對待同步任務「立即同步」或「全部同步」。

### 兩邊資料互通

- **App → Google**：在任務頁修改已同步任務的**到期日**時，會自動更新對應的 Google 日曆活動；在手機或網頁的 Google 日曆看到的會是最新時間。
- **Google → App**：若在手機或 Google 日曆網頁上改了活動標題、時間，可在 **Google 日曆頁**的「已同步的任務」區塊點該任務的 **「從 Google 更新」**，會把 Google 上的最新標題與時間拉回 app。
- **手機與電腦**：同一 Google 帳號下，在 app 同步出去的活動會出現在手機的 Google 日曆 App；在手機 Google 日曆新增或修改的活動，可用「載入未來 30 天活動」後「加入為任務」匯入，或對已連結的任務按「從 Google 更新」同步回來。

### 環境變數（必填才能使用雙向同步）

複製 `.env.local.example` 為 `.env.local` 並填寫：

1. 至 [Google Cloud Console](https://console.cloud.google.com) 建立專案。
2. 啟用 **Google Calendar API**（API 與服務 → 啟用 API）。
3. 建立 **OAuth 2.0 用戶端 ID**（憑證 → 建立憑證 → OAuth 用戶端 ID → 網頁應用程式）。
4. **授權重新導向 URI** 加入：`http://localhost:3000/api/auth/google/callback`（本機）或你的正式網址。
5. 將用戶端 ID、用戶端密碼填進 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`。
6. `GOOGLE_REDIRECT_URI` 需與 Console 中設定的完全一致。
7. `CALENDAR_TOKEN_SECRET` 可填任意長字串（用來加密 cookie）。

### 出現「已封鎖存取權」或 403 access_denied 時

應用程式在**測試階段**時，只有**測試使用者**可以登入。請在 Google Cloud Console 把自己加為測試使用者：

1. 開啟 [Google Cloud Console](https://console.cloud.google.com) → 選你的專案。
2. 左側 **「API 和服務」** → **「OAuth 同意畫面」**。
3. 在 **「測試使用者」** 區塊點 **「新增使用者」**。
4. 輸入你的 Gmail（例如 `jerey1621@gmail.com`）→ 儲存。

儲存後再用該帳號點「連動 Google 日曆」即可通過；無須送交 Google 驗證，僅供自己使用即可。
