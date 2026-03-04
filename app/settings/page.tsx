"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout";
import { useQuickLinks, useReminders } from "@/hooks";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function SettingsPage() {
  const { links, addLink, deleteLink } = useQuickLinks();
  const { requestPermission } = useReminders();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [notifStatus, setNotifStatus] = useState<string | null>(null);
  const [syncUser, setSyncUser] = useState<User | null | undefined>(undefined);
  const [syncEmail, setSyncEmail] = useState("");
  const [syncPassword, setSyncPassword] = useState("");
  const [syncAuthMode, setSyncAuthMode] = useState<"password" | "magiclink">("password");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (mounted) setSyncUser(null);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (mounted) setSyncUser(user ?? null);
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (mounted) setSyncUser(user ?? null);
        });
      });
      return () => {
        subscription.unsubscribe();
      };
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (params?.get("auth") === "error") setSyncMessage("登入連結無效或已過期");
  }, []);

  const handleAddLink = async () => {
    if (!label.trim() || !url.trim()) return;
    await addLink({ label: label.trim(), url: url.trim() });
    setLabel("");
    setUrl("");
  };

  const handleRequestNotif = async () => {
    const perm = await requestPermission();
    setNotifStatus(perm);
  };

  return (
    <PageShell title="設定">
      <div className="space-y-8">
        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">通知權限</h2>
          <p className="mb-2 text-sm text-zinc-300">
            提醒引擎每 60 秒檢查一次，到期時會發送瀏覽器通知。
          </p>
          <button
            onClick={handleRequestNotif}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
          >
            請求通知權限
          </button>
          {notifStatus && (
            <p className="mt-2 text-sm text-zinc-500">
              狀態: {notifStatus === "granted" ? "已授權" : notifStatus === "denied" ? "已拒絕" : "尚未設定"}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">快速連結</h2>
          <div className="mb-3 flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="名稱"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            />
            <button
              onClick={handleAddLink}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
            >
              新增
            </button>
          </div>
          <ul className="space-y-1">
            {links.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded px-2 py-1 hover:bg-zinc-800/50"
              >
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-300 hover:text-white"
                >
                  {l.label}
                </a>
                <button
                  onClick={() => deleteLink(l.id)}
                  className="text-red-400/80 hover:text-red-400"
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Google 日曆</h2>
          <p className="text-sm text-zinc-400">
            連線、嵌入、同步與已同步／待同步任務都在{" "}
            <Link href="/google-calendar" className="text-indigo-400 underline">Google 日曆</Link> 頁完成。
          </p>
        </section>

        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">帳號與同步（app 與 app）</h2>
          <p className="mb-3 text-sm text-zinc-500">
            登入後，手機與電腦使用同一帳號即可同步任務、看板、快速連結等資料。詳細設定見專案 <code className="text-zinc-400">docs/APP_SYNC.md</code>。
          </p>
          {syncUser === undefined ? (
            <p className="text-sm text-zinc-500">載入中…</p>
          ) : syncUser === null ? (
            <div className="space-y-3">
              {syncMessage && (
                <p className="text-sm text-amber-400">{syncMessage}</p>
              )}
              <div className="flex gap-2 border-b border-zinc-700 pb-2">
                <button
                  type="button"
                  onClick={() => { setSyncAuthMode("password"); setSyncMessage(null); }}
                  className={`rounded px-3 py-1.5 text-sm ${syncAuthMode === "password" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  帳號密碼
                </button>
                <button
                  type="button"
                  onClick={() => { setSyncAuthMode("magiclink"); setSyncMessage(null); }}
                  className={`rounded px-3 py-1.5 text-sm ${syncAuthMode === "magiclink" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  登入連結（寄信）
                </button>
              </div>
              {syncAuthMode === "password" ? (
                <div className="space-y-2">
                  <input
                    type="email"
                    value={syncEmail}
                    onChange={(e) => setSyncEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    value={syncPassword}
                    onChange={(e) => setSyncPassword(e.target.value)}
                    placeholder="密碼"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        const supabase = createClient();
                        if (!supabase || !syncEmail.trim() || !syncPassword) return;
                        if (syncPassword.length < 6) {
                          setSyncMessage("密碼至少 6 個字元");
                          return;
                        }
                        setSyncLoading(true);
                        setSyncMessage(null);
                        const { data, error } = await supabase.auth.signInWithPassword({
                          email: syncEmail.trim(),
                          password: syncPassword,
                        });
                        setSyncLoading(false);
                        if (error) {
                          const msg = error.message || "";
                          if (msg.includes("Invalid login credentials")) {
                            setSyncMessage("帳號或密碼錯誤，請確認 Email 與密碼（至少 6 字元）；若尚未註冊請先點「註冊」。");
                          } else {
                            setSyncMessage(error.message);
                          }
                        } else if (data.user) setSyncUser(data.user);
                      }}
                      disabled={syncLoading || !syncEmail.trim() || !syncPassword}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {syncLoading ? "登入中…" : "登入"}
                    </button>
                    <button
                      onClick={async () => {
                        const supabase = createClient();
                        if (!supabase || !syncEmail.trim() || !syncPassword) return;
                        if (syncPassword.length < 6) {
                          setSyncMessage("密碼至少 6 個字元");
                          return;
                        }
                        setSyncLoading(true);
                        setSyncMessage(null);
                        const { data, error } = await supabase.auth.signUp({
                          email: syncEmail.trim(),
                          password: syncPassword,
                        });
                        setSyncLoading(false);
                        if (error) {
                          if ((error.message || "").toLowerCase().includes("already registered")) {
                            setSyncMessage("此 Email 已註冊，請直接點「登入」。");
                          } else {
                            setSyncMessage(error.message);
                          }
                        } else if (data.user) {
                          setSyncUser(data.user);
                          setSyncMessage("註冊成功，已自動登入。");
                        } else {
                          setSyncMessage("註冊成功。若需信箱確認，請到信箱點連結後再點「登入」。");
                        }
                      }}
                      disabled={syncLoading || !syncEmail.trim() || !syncPassword}
                      className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      註冊
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">密碼至少 6 字元。不用收信、不受發信額度限制，手機與電腦用同一組帳密即可。</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    value={syncEmail}
                    onChange={(e) => setSyncEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={async () => {
                      const supabase = createClient();
                      if (!supabase || !syncEmail.trim()) return;
                      setSyncLoading(true);
                      setSyncMessage(null);
                      const baseUrl =
                        (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) ||
                        (typeof window !== "undefined" ? window.location.origin : "") ||
                        "";
                      const { error } = await supabase.auth.signInWithOtp({
                        email: syncEmail.trim(),
                        options: { emailRedirectTo: `${baseUrl}/auth/callback?next=/settings` },
                      });
                      setSyncLoading(false);
                      if (error) {
                        const msg = error.message || "";
                        if (msg.toLowerCase().includes("rate limit") || msg.includes("429")) {
                          setSyncMessage("發送次數過多：同一信箱需間隔約 1 分鐘；Supabase 免費額度每小時約 2 封，請稍後再試或設定自訂 SMTP。");
                        } else {
                          setSyncMessage(error.message);
                        }
                      } else {
                        setSyncMessage("已發送登入連結到你的信箱，請點擊連結完成登入。");
                      }
                    }}
                    disabled={syncLoading || !syncEmail.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {syncLoading ? "發送中…" : "發送登入連結"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-zinc-300">
                已登入 · {syncUser.email ?? "—"}
              </span>
              <button
                onClick={async () => {
                  const supabase = createClient();
                  if (!supabase) return;
                  await supabase.auth.signOut();
                  setSyncUser(null);
                }}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                登出
              </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-400">關於</h2>
          <p className="text-sm text-zinc-500">
            個人生活 OS · {syncUser ? "資料已同步至雲端" : "資料儲存於本機（登入後可跨裝置同步）"}
          </p>
        </section>
      </div>
    </PageShell>
  );
}
