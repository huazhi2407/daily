"use client";

import { useState, useMemo, useEffect } from "react";
import { PageShell } from "@/components/layout";
import { useTasks, useGoogleCalendarSync } from "@/hooks";
import type { Task } from "@/types";
import type { RepeatRule } from "@/types/task";
import { toDateString } from "@/types/common";
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, formatTime } from "@/lib/utils/date";
import { getTasksForDate, getEffectiveDueTime } from "@/lib/utils/recurrence";

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { tasks, updateTask } = useTasks();
  const { connected: syncConnected, events: googleEventsForDay, fetchEvents, createEvent } = useGoogleCalendarSync();

  const handleSyncTaskToGoogle = useMemo(() => {
    if (!syncConnected) return undefined;
    return async (task: Task, start: Date, end: Date) => {
      const ev = await createEvent(task.title, start, end, task.repeat);
      if (ev?.id) await updateTask(task.id, { googleEventId: ev.id, googleEventLink: ev.htmlLink });
    };
  }, [syncConnected, createEvent, updateTask]);

  const days = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfMonth(year, month);
  const padStart = firstDow;

  const cells = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < padStart; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    return arr;
  }, [padStart, days]);

  /** 當月每天對應的任務（含單次 + 重複展開） */
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month - 1, d);
      const ds = toDateString(date);
      map.set(ds, getTasksForDate(tasks, date));
    }
    return map;
  }, [tasks, year, month, days]);

  const selectedDayTasks = selectedDate
    ? getTasksForDate(tasks, selectedDate)
    : [];

  /** 當日任務依「該日有效時間」排序 */
  const selectedTasksTimeline = useMemo(() => {
    if (!selectedDate) return [];
    const sorted = [...selectedDayTasks].sort((a, b) => {
      const ta = a.dueTime ? getEffectiveDueTime(a, selectedDate).getTime() : 0;
      const tb = b.dueTime ? getEffectiveDueTime(b, selectedDate).getTime() : 0;
      return ta - tb;
    });
    return sorted;
  }, [selectedDayTasks, selectedDate]);

  useEffect(() => {
    if (!selectedDate || !syncConnected) return;
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    fetchEvents(start.toISOString(), end.toISOString());
  }, [selectedDate, syncConnected, fetchEvents]);

  const goPrev = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  return (
    <PageShell title="日曆">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            className="rounded px-3 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ‹
          </button>
          <span className="font-medium">
            {year} 年 {month} 月
          </span>
          <button
            onClick={goNext}
            className="rounded px-3 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
          {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null)
              return <div key={`pad-${i}`} className="aspect-square" />;
            const date = new Date(year, month - 1, d);
            const ds = toDateString(date);
            const dayTasks = tasksByDate.get(ds) ?? [];
            const isSelected =
              selectedDate && isSameDay(date, selectedDate);
            const isToday = isSameDay(date, now);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`aspect-square rounded text-sm ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : isToday
                      ? "border border-indigo-500/50 text-indigo-400"
                      : "hover:bg-zinc-800 text-zinc-300"
                }`}
              >
                {d}
                {dayTasks.length > 0 && (
                  <span className="block text-[10px] text-indigo-400">
                    {dayTasks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDate &&
          (selectedTasksTimeline.length > 0 || (syncConnected && googleEventsForDay.length > 0)) && (
          <section className="rounded-xl border border-zinc-800 p-4">
            <h3 className="mb-3 text-sm font-medium text-zinc-400">
              {selectedDate.toLocaleDateString("zh-TW")} 時間線
            </h3>
            <DayTimeline
              tasks={selectedTasksTimeline}
              date={selectedDate}
              googleEvents={syncConnected ? googleEventsForDay : []}
              onSyncTaskToGoogle={handleSyncTaskToGoogle}
            />
          </section>
        )}
      </div>
    </PageShell>
  );
}

function DayTimeline({
  tasks,
  date,
  googleEvents,
  onSyncTaskToGoogle,
}: {
  tasks: Task[];
  date: Date;
  googleEvents: Array<{ id: string; summary: string; start: string; end: string; htmlLink?: string }>;
  onSyncTaskToGoogle?: (task: Task, start: Date, end: Date) => Promise<void>;
}) {
  /** 已對應到本機任務的 Google 活動不重複顯示（有存 googleEventId 或同標題+同時段視為同一筆） */
  const googleEventsFiltered = useMemo(() => {
    const syncedIds = new Set(tasks.map((t) => t.googleEventId).filter(Boolean));
    return googleEvents.filter((ev) => {
      if (syncedIds.has(ev.id)) return false;
      const evStart = new Date(ev.start).getTime();
      const sameAsLocal = tasks.some((t) => {
        if (!t.dueTime) return false;
        const effective = getEffectiveDueTime(t, date).getTime();
        const sameTime = Math.abs(effective - evStart) < 60 * 1000; // 同一分鐘內
        return t.title.trim() === ev.summary.trim() && sameTime;
      });
      return !sameAsLocal;
    });
  }, [googleEvents, tasks, date]);

  type TimelineItem =
    | { type: "local"; task: Task; sortTime: number }
    | { type: "google"; event: (typeof googleEventsFiltered)[0]; sortTime: number };

  const items: TimelineItem[] = [
    ...tasks.map((t) => {
      const effective = t.dueTime ? getEffectiveDueTime(t, date) : null;
      return { type: "local" as const, task: t, sortTime: effective?.getTime() ?? 0 };
    }),
    ...googleEventsFiltered.map((ev) => ({
      type: "google" as const,
      event: ev,
      sortTime: new Date(ev.start).getTime(),
    })),
  ].sort((a, b) => a.sortTime - b.sortTime);

  const [syncingId, setSyncingId] = useState<string | null>(null);

  return (
    <div className="relative">
      <div className="absolute left-[43px] top-0 bottom-0 w-px bg-zinc-700" aria-hidden />
      <ul className="space-y-0">
        {items.map((item) => {
          if (item.type === "local") {
            const t = item.task;
            const effectiveTime = t.dueTime ? getEffectiveDueTime(t, date) : null;
            const timeLabel = effectiveTime ? formatTime(effectiveTime) : "未定";
            const isRecurring = !!t.repeat;
            const alreadySynced = !!t.googleEventId;
            const canSync = onSyncTaskToGoogle && t.dueTime && t.syncToGoogle && !alreadySynced;
            const handleSync = async () => {
              if (!onSyncTaskToGoogle || !t.dueTime) return;
              setSyncingId(t.id);
              try {
                // 重複任務用「第一次發生」作為 Google 活動的開始，單次用當日
                const start = t.repeat ? getEffectiveDueTime(t, t.dueTime) : getEffectiveDueTime(t, date);
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                await onSyncTaskToGoogle(t, start, end);
              } finally {
                setSyncingId(null);
              }
            };
            return (
              <li key={`local-${t.id}`} className="relative flex items-start gap-3 py-2 pl-0">
                <span className="absolute left-0 w-10 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                  {timeLabel}
                </span>
                <span className="absolute left-[38px] top-4 h-2 w-2 shrink-0 rounded-full bg-indigo-500 ring-2 ring-zinc-900" aria-hidden />
                <div className="ml-14 min-w-0 flex-1 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-200">{t.title}</p>
                    {alreadySynced ? (
                      <span className="shrink-0 text-xs text-emerald-400">
                        {t.googleEventLink ? (
                          <a href={t.googleEventLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            已同步 · Google 開啟
                          </a>
                        ) : (
                          "已同步"
                        )}
                      </span>
                    ) : canSync ? (
                      <button
                        type="button"
                        onClick={handleSync}
                        disabled={!!syncingId}
                        className="shrink-0 rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                      >
                        {syncingId === t.id ? "同步中…" : "同步到 Google"}
                      </button>
                    ) : null}
                  </div>
                  {isRecurring && t.repeat && (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {t.repeat.type === "daily"
                        ? "每天"
                        : `每週 ${[...t.repeat.weekdays].sort((a, b) => a - b).map((d) => "日一二三四五六"[d]).join("、")}`}
                    </p>
                  )}
                </div>
              </li>
            );
          }
          const ev = item.event;
          const timeLabel = ev.start ? formatTime(new Date(ev.start)) : "—";
          return (
            <li key={`google-${ev.id}`} className="relative flex items-start gap-3 py-2 pl-0">
              <span className="absolute left-0 w-10 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                {timeLabel}
              </span>
              <span className="absolute left-[38px] top-4 h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-zinc-900" aria-hidden />
              <div className="ml-14 min-w-0 flex-1 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-200">{ev.summary}</p>
                  {ev.htmlLink && (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-emerald-400 hover:underline"
                    >
                      Google 開啟
                    </a>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">Google 日曆</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
