/**
 * Reminder Engine.
 * - Polls every 60 seconds
 * - Reads tasks from persistence (no React dependency)
 * - Fires when now >= dueTime - offset
 * - Uses Web Notifications API
 * - Deduplicates via persistence (reminder-dedupe set)
 */

import type { TaskRecord } from "@/types/task";
import { recordToTask } from "@/types/task";
import type { IPersistence } from "@/lib/persistence";
import { PERSISTENCE_KEYS } from "@/lib/persistence/keys";

const POLL_INTERVAL_MS = 60_000;

export interface ReminderEngineConfig {
  persistence: IPersistence;
  onPermissionDenied?: () => void;
}

export function createReminderEngine(config: ReminderEngineConfig) {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  async function getTasks(): Promise<ReturnType<typeof recordToTask>[]> {
    const raw = await config.persistence.get<TaskRecord[]>(PERSISTENCE_KEYS.TASKS);
    return (raw ?? []).map(recordToTask);
  }

  async function getFiredDedupeKeys(): Promise<Set<string>> {
    const raw = await config.persistence.get<string[]>(PERSISTENCE_KEYS.REMINDER_DEDUPE);
    return new Set(raw ?? []);
  }

  async function markFired(key: string): Promise<void> {
    const set = await getFiredDedupeKeys();
    set.add(key);
    const arr = Array.from(set);
    if (arr.length > 1000) arr.splice(0, 500);
    await config.persistence.set(PERSISTENCE_KEYS.REMINDER_DEDUPE, arr);
  }

  function buildDedupeKey(taskId: string, fireAt: string): string {
    return `${taskId}:${fireAt}`;
  }

  async function checkAndNotify(): Promise<void> {
    const tasks = await getTasks();
    const now = new Date();
    const fired = await getFiredDedupeKeys();

    for (const task of tasks) {
      if (task.completed || !task.dueTime) continue;
      for (const offsetMin of task.reminderOffsets ?? []) {
        const fireAt = new Date(task.dueTime.getTime() - offsetMin * 60 * 1000);
        if (now >= fireAt) {
          const dedupeKey = buildDedupeKey(task.id, fireAt.toISOString());
          if (fired.has(dedupeKey)) continue;
          await markFired(dedupeKey);
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("個人生活 OS", {
                body: task.title,
                tag: dedupeKey,
              });
            }
          }
        }
      }
    }
  }

  function start(): void {
    if (typeof window === "undefined") return;
    if (intervalId) return;
    intervalId = setInterval(checkAndNotify, POLL_INTERVAL_MS);
    checkAndNotify();
  }

  function stop(): void {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  async function requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window))
      return "denied";
    if (Notification.permission !== "default") return Notification.permission;
    const perm = await Notification.requestPermission();
    if (perm === "denied") config.onPermissionDenied?.();
    return perm;
  }

  return { start, stop, checkAndNotify, requestPermission };
}
