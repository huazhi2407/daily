"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout";
import { useTimeLogs } from "@/hooks";
import type { TimeLogCategory } from "@/types";
import { formatTime } from "@/lib/utils/date";

const CATEGORY_LABELS: Record<TimeLogCategory, string> = {
  study: "學習",
  work: "工作",
  life: "生活",
  waste: "浪費",
};

export default function LogPage() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const {
    logs,
    activeLogId,
    totalFocusedMinutes,
    loading,
    startTimer,
    stopTimer,
    addManualEntry,
    deleteLog,
  } = useTimeLogs(date);

  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState<TimeLogCategory>("work");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");

  const [timerTitle, setTimerTitle] = useState("");
  const [timerCategory, setTimerCategory] = useState<TimeLogCategory>("work");

  const handleStartTimer = async () => {
    if (!timerTitle.trim()) return;
    await startTimer({ title: timerTitle.trim(), category: timerCategory });
    setTimerTitle("");
  };

  const handleManualAdd = async () => {
    if (!manualTitle.trim() || !manualStart || !manualEnd) return;
    const start = new Date(`${date}T${manualStart}:00`);
    const end = new Date(`${date}T${manualEnd}:00`);
    if (end <= start) return;
    await addManualEntry({
      startTime: start,
      endTime: end,
      title: manualTitle.trim(),
      category: manualCategory,
    });
    setManualTitle("");
    setManualStart("");
    setManualEnd("");
    setShowManual(false);
  };

  return (
    <PageShell title="時間記錄">
      <div className="space-y-6">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>

        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-400">今日專注時間</h2>
          <p className="text-2xl font-semibold text-white">
            {Math.floor(totalFocusedMinutes / 60)}h {Math.round(totalFocusedMinutes % 60)}m
          </p>
        </section>

        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">計時器</h2>
          {activeLogId ? (
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">● 進行中</span>
              <button
                onClick={() => stopTimer(activeLogId)}
                className="rounded bg-red-600/80 px-4 py-2 text-sm text-white hover:bg-red-600"
              >
                停止
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <input
                value={timerTitle}
                onChange={(e) => setTimerTitle(e.target.value)}
                placeholder="正在做什麼？"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
              />
              <select
                value={timerCategory}
                onChange={(e) => setTimerCategory(e.target.value as TimeLogCategory)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStartTimer}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
              >
                開始
              </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400">時間軸</h2>
            <button
              onClick={() => setShowManual(!showManual)}
              className="text-sm text-indigo-400 hover:underline"
            >
              {showManual ? "取消" : "+ 手動新增"}
            </button>
          </div>
          {showManual && (
            <div className="mb-4 space-y-2 rounded-lg border border-zinc-700 p-3">
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="標題"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                />
              </div>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value as TimeLogCategory)}
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                onClick={handleManualAdd}
                className="rounded bg-indigo-600 px-4 py-2 text-sm text-white"
              >
                新增
              </button>
            </div>
          )}
          {loading ? (
            <p className="text-sm text-zinc-500">載入中...</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-700/50 px-3 py-2"
                >
                  <div>
                    <span className="text-zinc-200">{l.title}</span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {CATEGORY_LABELS[l.category]}
                    </span>
                    <p className="text-xs text-zinc-500">
                      {formatTime(l.startTime)}
                      {l.endTime && ` → ${formatTime(l.endTime)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteLog(l.id)}
                    className="text-red-400/80 hover:text-red-400"
                  >
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
