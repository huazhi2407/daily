"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimeLog, TimeLogCategory } from "@/types";
import { generateId } from "@/types/common";
import { timeLogToRecord, recordToTimeLog } from "@/types/time-log";
import { toDateString } from "@/types/common";
import { getPersistence, PERSISTENCE_KEYS } from "@/lib/persistence";

/**
 * useTimeLogs - Time tracking with timer + manual entry.
 */
export function useTimeLogs(date?: string) {
  const targetDate = date ?? toDateString(new Date());
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = getPersistence();
    const raw = await p.get<ReturnType<typeof timeLogToRecord>[]>(PERSISTENCE_KEYS.TIME_LOGS);
    const all = (raw ?? []).map(recordToTimeLog);
    const filtered = all.filter((l) => toDateString(l.startTime) === targetDate);
    setLogs(filtered.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    const active = filtered.find((l) => !l.endTime);
    setActiveLogId(active?.id ?? null);
    setLoading(false);
  }, [targetDate]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const save = useCallback(async (allLogs: TimeLog[]) => {
    const p = getPersistence();
    await p.set(PERSISTENCE_KEYS.TIME_LOGS, allLogs.map(timeLogToRecord));
  }, []);

  const getAllLogs = useCallback(async (): Promise<TimeLog[]> => {
    const p = getPersistence();
    const raw = await p.get<ReturnType<typeof timeLogToRecord>[]>(PERSISTENCE_KEYS.TIME_LOGS);
    return (raw ?? []).map(recordToTimeLog);
  }, []);

  const startTimer = useCallback(
    async (payload: { title: string; category: TimeLogCategory; relatedTaskId?: string; note?: string }) => {
      const all = await getAllLogs();
      const log: TimeLog = {
        id: generateId(),
        startTime: new Date(),
        title: payload.title,
        category: payload.category,
        relatedTaskId: payload.relatedTaskId,
        note: payload.note,
      };
      all.push(log);
      await save(all);
      setLogs((prev) => [...prev, log].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
      setActiveLogId(log.id);
      return log;
    },
    [getAllLogs, save]
  );

  const stopTimer = useCallback(
    async (id: string) => {
      const all = await getAllLogs();
      const idx = all.findIndex((l) => l.id === id);
      if (idx === -1) return;
      all[idx].endTime = new Date();
      await save(all);
      setLogs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, endTime: all[idx].endTime } : l))
      );
      setActiveLogId(null);
    },
    [getAllLogs, save]
  );

  const addManualEntry = useCallback(
    async (payload: {
      startTime: Date;
      endTime: Date;
      title: string;
      category: TimeLogCategory;
      relatedTaskId?: string;
      note?: string;
    }) => {
      const all = await getAllLogs();
      const log: TimeLog = {
        id: generateId(),
        ...payload,
      };
      all.push(log);
      await save(all);
      if (toDateString(log.startTime) === targetDate) {
        setLogs((prev) => [...prev, log].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
      }
      return log;
    },
    [getAllLogs, save, targetDate]
  );

  const updateLog = useCallback(
    async (id: string, updates: Partial<Pick<TimeLog, "title" | "category" | "note">>) => {
      const all = await getAllLogs();
      const idx = all.findIndex((l) => l.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...updates };
      await save(all);
      if (toDateString(all[idx].startTime) === targetDate) {
        setLogs((prev) =>
          prev.map((l) => (l.id === id ? all[idx] : l))
        );
      }
      return all[idx];
    },
    [getAllLogs, save, targetDate]
  );

  const deleteLog = useCallback(
    async (id: string) => {
      const all = await getAllLogs();
      const filtered = all.filter((l) => l.id !== id);
      await save(filtered);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      if (activeLogId === id) setActiveLogId(null);
    },
    [getAllLogs, save, activeLogId]
  );

  const totalFocusedMinutes = logs.reduce((acc, l) => {
    if (!l.endTime) return acc;
    return acc + (l.endTime.getTime() - l.startTime.getTime()) / 60_000;
  }, 0);

  return {
    logs,
    loading,
    activeLogId,
    totalFocusedMinutes,
    load,
    startTimer,
    stopTimer,
    addManualEntry,
    updateLog,
    deleteLog,
  };
}
