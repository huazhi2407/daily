"use client";

import { PageShell } from "@/components/layout";
import { useTasks, useTimeLogs, useQuickLinks } from "@/hooks";
import { toDateString } from "@/types/common";
import Link from "next/link";

export default function DashboardPage() {
  const { top3, tasks, loading: tasksLoading } = useTasks();
  const { logs, totalFocusedMinutes, loading: logLoading } = useTimeLogs();
  const { links } = useQuickLinks();

  return (
    <PageShell title="儀表板">
      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">今日 Top 3</h2>
          {tasksLoading ? (
            <p className="text-sm text-zinc-500">載入中...</p>
          ) : top3.length === 0 ? (
            <p className="text-sm text-zinc-500">
              前往 <Link href="/tasks" className="text-indigo-400 underline">任務</Link> 設定今日 Top 3
            </p>
          ) : (
            <ol className="space-y-2">
              {top3.map((t, i) => (
                <li
                  key={t.id}
                  className={`flex items-center gap-2 ${t.completed ? "text-zinc-500 line-through" : ""}`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600/30 text-xs text-indigo-400">
                    {i + 1}
                  </span>
                  {t.title}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">今日時間記錄</h2>
          {logLoading ? (
            <p className="text-sm text-zinc-500">載入中...</p>
          ) : (
            <>
              <p className="text-2xl font-semibold text-white">
                {Math.floor(totalFocusedMinutes / 60)}h {Math.round(totalFocusedMinutes % 60)}m
              </p>
              <p className="text-xs text-zinc-500">專注時間</p>
              <Link href="/log" className="mt-2 inline-block text-sm text-indigo-400 hover:underline">
                查看詳情 →
              </Link>
            </>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">快速連結</h2>
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-indigo-600/50 hover:text-white"
              >
                {l.icon && <span className="mr-1">{l.icon}</span>}
                {l.label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
