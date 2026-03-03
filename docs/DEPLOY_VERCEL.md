# 部署到 Vercel

## 方式一：透過 Vercel 網站（推薦）

1. 將此專案推送到 **GitHub**（若尚未推送）。
2. 開啟 [vercel.com](https://vercel.com) → 登入 → **Add New Project**。
3. **Import** 你的 `daily`（或對應的）Git 倉庫。
4. Vercel 會自動辨識為 Next.js，無須改 Build Command（`next build`）與 Output Directory。
5. 若使用 **Google 日曆同步**，在專案設定中新增 **Environment Variables**：
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`：改為你的 Vercel 網址，例如  
     `https://你的專案名.vercel.app/api/auth/google/callback`
   - `CALENDAR_TOKEN_SECRET`（任意長字串）
6. 在 Google Cloud Console 的 OAuth 用戶端中，**授權重新導向 URI** 新增：  
   `https://你的專案名.vercel.app/api/auth/google/callback`
7. 點 **Deploy**，完成後每次 push 到 main 會自動重新部署。

## 方式二：透過 Vercel CLI

```bash
# 首次需登入
npx vercel login

# 在專案目錄執行（會引導建立專案並部署）
npx vercel

# 正式環境部署
npx vercel --prod
```

環境變數同上，可在 Vercel 專案 **Settings → Environment Variables** 中設定。

## 注意

- 本專案資料存於 **localStorage**，部署後每位訪客的資料都在各自瀏覽器，不會跨裝置同步。
- 若僅自己使用，上述流程即可；若要多人或跨裝置，需日後改為後端／資料庫儲存。
