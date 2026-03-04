# App 與 App 同步（手機／電腦）

讓同一款 app 在**手機**與**電腦**上的資料互通（任務、看板、快速連結等），透過 **Supabase** 雲端儲存與登入達成。

## 流程

- **未登入**：資料只存在本機（localStorage），與目前行為相同。
- **登入後**：讀寫改走雲端 API，同一帳號在手機與電腦會看到同一份資料。

## 設定步驟

### 1. 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com) 註冊／登入，建立新專案。
2. 在專案 **Settings → API** 取得：
   - **Project URL**
   - **anon public** key（用於前端與 API 路由）

### 2. 環境變數

在專案根目錄 `.env.local` 新增：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
# 登入連結導向用（信箱裡的連結會指向此網址，手機點連結時才能正確開啟）
NEXT_PUBLIC_APP_URL=https://你的正式站網域
```

### 3. 建立資料表

在 Supabase 專案 **SQL Editor** 執行：

```sql
create table if not exists public.user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

create policy "Users can read own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.user_data for update
  using (auth.uid() = user_id);

create policy "Users can delete own data"
  on public.user_data for delete
  using (auth.uid() = user_id);
```

### 4. 登入方式（二選一）

**推薦：帳號密碼**（不用收信、無發信額度問題）

- 在 app **設定** 頁的「帳號與同步」→ 選 **帳號密碼**，輸入 Email 與密碼。
- 第一次使用請點「註冊」，之後在手機與電腦都點「登入」、輸入同一組帳密即可。
- 若登入時出現「Invalid login credentials」：可能是密碼打錯，或 Supabase 有開啟「信箱確認」、需先到信箱點確認連結後才能登入。想註冊後直接登入、不收信，可到 Supabase → **Authentication** → **Providers** → **Email** → 關閉 **Confirm email**。

**選用：登入連結（Magic Link）**

- 選 **登入連結（寄信）**，輸入 Email 後點「發送登入連結」，到信箱點連結完成登入。
- 在 **Supabase 專案 → Authentication → URL Configuration** 中，**Redirect URLs** 需加入：
  - 本機：`http://localhost:3000/auth/callback`
  - 正式站：`https://你的網域/auth/callback`

### 5. 使用方式

- **電腦**：在設定頁登入同一個 Email。
- **手機**：用瀏覽器開同一份 app（或 PWA），在設定頁用**同一個 Email** 登入。
- 兩邊登入後，任務、看板、快速連結等會自動同步（讀寫都走雲端）。

## 注意

- 若未設定 Supabase 或未登入，app 仍只使用本機 localStorage，不影響現有使用。
- 登出後，該裝置會恢復為本機儲存；再次登入會改回雲端資料。

## 若出現「Email rate limit exceeded」

Supabase 內建信箱有發送上限，避免濫用：

- **同一信箱**：需間隔約 **1 分鐘** 才能再發一次。
- **全專案**：約 **2 封／小時**（所有登入連結、重設密碼等合計）。

**處理方式：**

1. **等一下再試**：等 1 分鐘（同信箱）或 1 小時（額度重置）。
2. **改用自訂 SMTP**（推薦）：在 Supabase 專案 → **Project Settings** → **Authentication** → **SMTP Settings** 設定自己的 SMTP（例如 Gmail、SendGrid、Resend），就不受內建 2 封／小時限制。設定方式見 [Supabase SMTP 文件](https://supabase.com/docs/guides/auth/auth-smtp)。

## 若出現「登入連結無效或已過期」

1. **Redirect URLs** 必須與實際網址完全一致：  
   Supabase → **Authentication** → **URL Configuration** → **Redirect URLs** 加入：
   - 本機：`http://localhost:3000/auth/callback`
   - 正式站：`https://daily-two-navy.vercel.app/auth/callback`（與你實際網域一致）
2. **連結有效期限** 約 1 小時，過期需重新按「發送登入連結」。
3. 點連結時請用**同一個瀏覽器／裝置**開 app（例如本機發送連結就在本機點、同一台電腦）。
