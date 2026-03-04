"use client";

import { useState, useCallback } from "react";
import { PageShell } from "@/components/layout";
import { useTasks, useGoogleCalendarSync } from "@/hooks";
import type { Task, TaskCategory } from "@/types";
import type { RepeatRule } from "@/types/task";
import { getEffectiveDueTime } from "@/lib/utils/recurrence";

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  top3: "Top 3",
  must: "必做",
  scheduled: "排程",
  backlog: "待辦",
  misc: "其他",
};

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export default function TasksPage() {
  const {
    tasks,
    completedTasks,
    top3,
    loading,
    addTask,
    updateTask,
    moveCategory,
    completeTask,
    uncompleteTask,
    deleteTask,
  } = useTasks();
  const { connected: syncConnected, createEvent, updateEvent } = useGoogleCalendarSync();
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>("backlog");
  const [newDueDateTime, setNewDueDateTime] = useState("");
  const [newRepeat, setNewRepeat] = useState<"none" | "daily" | "weekly">("none");
  const [newRepeatWeekdays, setNewRepeatWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // 一～五
  const [newSyncToGoogle, setNewSyncToGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDueInput = newCategory === "scheduled" || newCategory === "backlog";

  const buildRepeat = (): RepeatRule | undefined => {
    if (newRepeat === "none") return undefined;
    if (newRepeat === "daily") return { type: "daily" };
    return { type: "weekly", weekdays: [...newRepeatWeekdays].sort((a, b) => a - b) };
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setError(null);
    try {
      const dueTime = showDueInput && newDueDateTime ? new Date(newDueDateTime) : undefined;
      const repeat = showDueInput && dueTime ? buildRepeat() : undefined;
      const syncToGoogle = showDueInput ? newSyncToGoogle : undefined;
      await addTask({ title: newTitle.trim(), category: newCategory, dueTime, repeat, syncToGoogle });
      setNewTitle("");
      setNewDueDateTime("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleWeekday = (d: number) => {
    setNewRepeatWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  const byCategory = (cat: TaskCategory) => tasks.filter((t) => t.category === cat);

  /** 勾選「同步到 Google」時立即推到 Google 日曆 */
  const handleSyncToGoogleNow = useCallback(
    async (task: Task) => {
      if (!syncConnected || !task.dueTime || task.googleEventId) return;
      const start = task.repeat
        ? getEffectiveDueTime(task, task.dueTime)
        : task.dueTime;
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const ev = await createEvent(task.title, start, end, task.repeat);
      if (ev?.id) await updateTask(task.id, { googleEventId: ev.id, googleEventLink: ev.htmlLink });
    },
    [syncConnected, createEvent, updateTask]
  );

  /** 已同步任務改到期日時，一併更新 Google 日曆 */
  const handleUpdateDueTime = useCallback(
    async (task: Task, dueTime: Date | undefined) => {
      await updateTask(task.id, { dueTime });
      if (syncConnected && task.googleEventId && dueTime) {
        const start = task.repeat
          ? getEffectiveDueTime({ ...task, dueTime }, dueTime)
          : dueTime;
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        await updateEvent(task.googleEventId, task.title, start, end);
      }
    },
    [syncConnected, updateTask, updateEvent]
  );

  return (
    <PageShell title="任務">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="新任務"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              新增
            </button>
          </div>
          {showDueInput && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">到期日時：</label>
                <input
                  type="datetime-local"
                  value={newDueDateTime}
                  onChange={(e) => setNewDueDateTime(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-400">重複：</span>
                <select
                  value={newRepeat}
                  onChange={(e) => setNewRepeat(e.target.value as "none" | "daily" | "weekly")}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                >
                  <option value="none">不重複</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每週指定日</option>
                </select>
                {newRepeat === "weekly" && (
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS.map((label, d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWeekday(d)}
                        className={`rounded px-2 py-1 text-xs ${
                          newRepeatWeekdays.includes(d)
                            ? "bg-indigo-600 text-white"
                            : "border border-zinc-600 text-zinc-400 hover:bg-zinc-800"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={newSyncToGoogle}
                  onChange={(e) => setNewSyncToGoogle(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                同步到 Google 日曆
              </label>
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {loading ? (
          <p className="text-sm text-zinc-500">載入中...</p>
        ) : (
          <div className="space-y-4">
            {(["top3", "must", "scheduled", "backlog", "misc"] as TaskCategory[]).map(
              (cat) => {
                const items = byCategory(cat);
                if (items.length === 0) return null;
                return (
                  <section key={cat} className="rounded-xl border border-zinc-800 p-4">
                    <h3 className="mb-2 text-sm font-medium text-zinc-400">
                      {CATEGORY_LABELS[cat]}
                    </h3>
                    <ul className="space-y-1">
                      {items.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          onComplete={() => completeTask(t.id)}
                          onDelete={() => deleteTask(t.id)}
                          onMoveCategory={(c) => moveCategory(t.id, c)}
                          onUpdateDueTime={(dueTime) => handleUpdateDueTime(t, dueTime)}
                          onUpdateRepeat={(repeat) => updateTask(t.id, { repeat })}
                          onUpdateSyncToGoogle={(syncToGoogle) => updateTask(t.id, { syncToGoogle })}
                          onSyncToGoogleNow={syncConnected ? handleSyncToGoogleNow : undefined}
                        />
                      ))}
                    </ul>
                  </section>
                );
              }
            )}

            {completedTasks.length > 0 && (
              <section className="rounded-xl border border-zinc-800 p-4">
                <h3 className="mb-2 text-sm font-medium text-zinc-500">已完成</h3>
                <ul className="space-y-1">
                  {completedTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded px-2 py-1 text-sm text-zinc-500"
                    >
                      <span className="line-through">{t.title}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => uncompleteTask(t.id)}
                          className="text-zinc-400 hover:text-white"
                        >
                          還原
                        </button>
                        <button
                          onClick={() => deleteTask(t.id)}
                          className="text-red-400/80 hover:text-red-400"
                        >
                          刪除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function formatDueTime(d: Date): string {
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const date = d.toLocaleDateString("zh-TW");
  if (!hasTime) return date;
  const time = d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function TaskRow({
  task,
  onComplete,
  onDelete,
  onMoveCategory,
  onUpdateDueTime,
  onUpdateRepeat,
  onUpdateSyncToGoogle,
  onSyncToGoogleNow,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onMoveCategory: (c: TaskCategory) => void;
  onUpdateDueTime: (dueTime: Date | undefined) => void;
  onUpdateRepeat: (repeat: RepeatRule | undefined) => void;
  onUpdateSyncToGoogle: (syncToGoogle: boolean) => void;
  onSyncToGoogleNow?: (task: Task) => void | Promise<void>;
}) {
  const showDue = task.category === "scheduled" || task.category === "backlog";
  const dueLocalValue = task.dueTime
    ? new Date(task.dueTime.getTime() - task.dueTime.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  const repeatLabel = task.repeat
    ? task.repeat.type === "daily"
      ? "每天"
      : `每週 ${[...task.repeat.weekdays].sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]).join("、")}`
    : "";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-zinc-800/50">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          onClick={onComplete}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-600 text-xs hover:border-indigo-500"
        >
          ✓
        </button>
        <span className="min-w-0 truncate">{task.title}</span>
        {showDue && (
          <span className="shrink-0 text-xs text-zinc-500">
            {task.dueTime ? (
              formatDueTime(task.dueTime)
            ) : (
              <span className="text-zinc-600">未設日期</span>
            )}
          </span>
        )}
        {showDue && repeatLabel && (
          <span className="shrink-0 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {repeatLabel}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {showDue && (
          <input
            type="datetime-local"
            value={dueLocalValue}
            onChange={(e) => {
              const v = e.target.value;
              onUpdateDueTime(v ? new Date(v) : undefined);
            }}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs"
            title="到期日時"
          />
        )}
        {showDue && (
          <select
            value={
              task.repeat
                ? task.repeat.type === "weekly"
                  ? "weekly"
                  : "daily"
                : "none"
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "none") onUpdateRepeat(undefined);
              else if (v === "daily") onUpdateRepeat({ type: "daily" });
              else
                onUpdateRepeat({
                  type: "weekly",
                  weekdays:
                    task.repeat?.type === "weekly"
                      ? task.repeat.weekdays
                      : [1, 2, 3, 4, 5],
                });
            }}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs"
            title="重複"
          >
            <option value="none">不重複</option>
            <option value="daily">每天</option>
            <option value="weekly">每週</option>
          </select>
        )}
        {showDue && (
          <label className="flex cursor-pointer items-center gap-1 text-xs text-zinc-400" title="同步到 Google 日曆（勾選後會立即同步）">
            <input
              type="checkbox"
              checked={!!task.syncToGoogle}
              onChange={(e) => {
                const checked = e.target.checked;
                onUpdateSyncToGoogle(checked);
                if (checked && onSyncToGoogleNow && task.dueTime && !task.googleEventId) {
                  onSyncToGoogleNow(task);
                }
              }}
              className="rounded border-zinc-600"
            />
            Google
          </label>
        )}
        <select
          value={task.category}
          onChange={(e) => onMoveCategory(e.target.value as TaskCategory)}
          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs"
        >
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button onClick={onDelete} className="text-red-400/80 hover:text-red-400">
          刪除
        </button>
      </div>
    </li>
  );
}
