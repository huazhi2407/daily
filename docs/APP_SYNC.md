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

### 4. 登入方式（Magic Link）

- 在 app **設定** 頁的「帳號與同步」區塊輸入 **Email**，點「發送登入連結」。
- 到信箱點擊連結後會回到 app 並完成登入。
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
