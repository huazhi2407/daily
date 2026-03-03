"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout";
import { useTasks, useGoogleCalendarSync, useGoogleCalendarEmbed } from "@/hooks";
import type { Task } from "@/types";
import { getEffectiveDueTime } from "@/lib/utils/recurrence";

function GoogleCalendarContent() {
  const searchParams = useSearchParams();
  const { tasks, updateTask } = useTasks();
  const {
    connected,
    checkStatus,
    disconnect,
    createEvent,
    error: syncError,
  } = useGoogleCalendarSync();
  const { embedUrl, setEmbedUrl } = useGoogleCalendarEmbed();
  const [embedInput, setEmbedInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  useEffect(() => {
    if (embedUrl != null) setEmbedInput(embedUrl);
  }, [embedUrl]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    const g = searchParams.get("google");
    if (g === "connected") setMessage("已連線，可同步任務到 Google 日曆。");
    else if (g === "denied") setMessage("已取消授權。");
    else if (g === "error") setMessage("連線失敗，請確認 .env 已設定。");
  }, [searchParams]);

  const syncedTasks = tasks.filter((t) => t.googleEventId && t.dueTime && !t.completed);
  const pendingSyncTasks = tasks.filter(
    (t) => t.syncToGoogle && !t.googleEventId && t.dueTime && !t.completed
  );

  const syncOne = useCallback(
    async (task: Task) => {
      if (!task.dueTime) return;
      setSyncingId(task.id);
      try {
        const start = task.repeat
          ? getEffectiveDueTime(task, task.dueTime)
          : task.dueTime;
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const ev = await createEvent(task.title, start, end, task.repeat);
        if (ev?.id)
          await updateTask(task.id, {
            googleEventId: ev.id,
            googleEventLink: ev.htmlLink,
          });
      } finally {
        setSyncingId(null);
      }
    },
    [createEvent, updateTask]
  );

  const syncAll = useCallback(async () => {
    setSyncingAll(true);
    try {
      for (const task of pendingSyncTasks) {
        if (!task.dueTime) continue;
        const start = task.repeat
          ? getEffectiveDueTime(task, task.dueTime)
          : task.dueTime;
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const ev = await createEvent(task.title, start, end, task.repeat);
        if (ev?.id)
          await updateTask(task.id, {
            googleEventId: ev.id,
            googleEventLink: ev.htmlLink,
          });
      }
    } finally {
      setSyncingAll(false);
    }
  }, [pendingSyncTasks, createEvent, updateTask]);

  const formatDue = (t: Task) =>
    t.dueTime ? t.dueTime.toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <PageShell title="Google 日曆">
      <div className="space-y-6">
        {/* 連線 */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">連線狀態</h2>
          {message && <p className="mb-2 text-sm text-zinc-400">{message}</p>}
          {syncError && <p className="mb-2 text-sm text-red-400">{syncError}</p>}
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">已連線</span>
              <button
                onClick={() => disconnect()}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                中斷連線
              </button>
            </div>
          ) : (
            <a
              href="/api/auth/google"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
            >
              連動 Google 日曆
            </a>
          )}
        </section>

        {/* 嵌入網址 */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">日曆嵌入</h2>
          <p className="mb-2 text-sm text-zinc-500">
            在 <Link href="/calendar" className="text-indigo-400 underline">日曆</Link> 頁可切換「Google 日曆」分頁顯示。請到 Google 日曆 → 設定 → 整合日曆 → 複製嵌入碼的 src 網址。
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={embedInput}
              onChange={(e) => setEmbedInput(e.target.value)}
              placeholder="https://calendar.google.com/calendar/embed?src=..."
              className="min-w-[240px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            />
            <button
              onClick={() => setEmbedUrl(embedInput || null)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
            >
              儲存
            </button>
          </div>
        </section>

        {/* 已同步的任務 */}
        {connected && (
          <>
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="mb-3 text-sm font-medium text-zinc-400">已同步的任務</h2>
              {syncedTasks.length === 0 ? (
                <p className="text-sm text-zinc-500">尚無已同步的任務。在任務頁勾選「Google」並同步，或於下方待同步列表操作。</p>
              ) : (
                <ul className="space-y-2">
                  {syncedTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-700/60 px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-200">{t.title}</span>
                      <span className="text-zinc-500">{formatDue(t)}</span>
                      {t.googleEventLink ? (
                        <a
                          href={t.googleEventLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline"
                        >
                          Google 開啟
                        </a>
                      ) : (
                        <span className="text-zinc-500">已同步</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 待同步的任務 */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="mb-3 text-sm font-medium text-zinc-400">待同步的任務</h2>
              <p className="mb-2 text-sm text-zinc-500">
                在 <Link href="/tasks" className="text-indigo-400 underline">任務</Link> 頁勾選「Google」的任務會出現在此，可在此或任務／日曆頁同步。
              </p>
              {pendingSyncTasks.length === 0 ? (
                <p className="text-sm text-zinc-500">目前沒有待同步的任務。</p>
              ) : (
                <>
                  <button
                    onClick={syncAll}
                    disabled={syncingAll}
                    className="mb-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {syncingAll ? "同步中…" : `全部同步（${pendingSyncTasks.length} 筆）`}
                  </button>
                  <ul className="space-y-2">
                    {pendingSyncTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-700/60 px-3 py-2 text-sm"
                      >
                        <span className="text-zinc-200">{t.title}</span>
                        <span className="text-zinc-500">{formatDue(t)}</span>
                        <button
                          onClick={() => syncOne(t)}
                          disabled={!!syncingId}
                          className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {syncingId === t.id ? "同步中…" : "立即同步"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        )}

        <p className="text-xs text-zinc-500">
          連線、同步、嵌入與檢視都在此與 <Link href="/calendar" className="text-indigo-400 underline">日曆</Link>／<Link href="/tasks" className="text-indigo-400 underline">任務</Link> 頁完成，無需另開 Google 日曆。
        </p>
      </div>
    </PageShell>
  );
}

export default function GoogleCalendarPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Google 日曆">
          <div className="flex items-center justify-center py-12 text-zinc-500">載入中…</div>
        </PageShell>
      }
    >
      <GoogleCalendarContent />
    </Suspense>
  );
}
