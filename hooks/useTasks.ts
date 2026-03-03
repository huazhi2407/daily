"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task, TaskCategory } from "@/types";
import type { RepeatRule } from "@/types/task";
import { generateId } from "@/types/common";
import { taskToRecord, recordToTask } from "@/types/task";
import { getPersistence, PERSISTENCE_KEYS } from "@/lib/persistence";

/**
 * useTasks - Task CRUD + validation.
 * Rules: max 3 in top3. Completed tasks stored separately.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const p = getPersistence();
    const [raw, rawCompleted] = await Promise.all([
      p.get<ReturnType<typeof taskToRecord>[]>(PERSISTENCE_KEYS.TASKS),
      p.get<ReturnType<typeof taskToRecord>[]>(PERSISTENCE_KEYS.TASKS_COMPLETED),
    ]);
    setTasks((raw ?? []).map(recordToTask));
    setCompletedTasks((rawCompleted ?? []).map(recordToTask));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (active: Task[], completed: Task[]) => {
    const p = getPersistence();
    await Promise.all([
      p.set(PERSISTENCE_KEYS.TASKS, active.map(taskToRecord)),
      p.set(PERSISTENCE_KEYS.TASKS_COMPLETED, completed.map(taskToRecord)),
    ]);
  }, []);

  const addTask = useCallback(
    async (payload: {
      title: string;
      description?: string;
      category?: TaskCategory;
      dueTime?: Date;
      repeat?: RepeatRule;
      syncToGoogle?: boolean;
      /** 從 Google 日曆加入時可帶入，避免重複顯示並保留連結 */
      googleEventId?: string;
      googleEventLink?: string;
    }) => {
      const category = payload.category ?? "backlog";
      const active = [...tasks];
      if (category === "top3") {
        const top3Count = active.filter((t) => t.category === "top3").length;
        if (top3Count >= 3) throw new Error("Top3 最多 3 個任務");
      }
      const task: Task = {
        id: generateId(),
        title: payload.title,
        description: payload.description,
        dueTime: payload.dueTime,
        repeat: payload.repeat,
        syncToGoogle: payload.syncToGoogle,
        googleEventId: payload.googleEventId,
        googleEventLink: payload.googleEventLink,
        category,
        reminderOffsets: [],
        completed: false,
        createdAt: new Date(),
      };
      active.push(task);
      setTasks(active);
      await save(active, completedTasks);
      return task;
    },
    [tasks, completedTasks, save]
  );

  const updateTask = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Task, "title" | "description" | "dueTime" | "category" | "repeat" | "syncToGoogle" | "googleEventId" | "googleEventLink" | "reminderOffsets">>
    ) => {
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      const next = [...tasks];
      const updated = { ...next[idx], ...updates };
      if (updates.category === "top3") {
        const top3Count = next.filter((t) => t.category === "top3" && t.id !== id).length;
        if (top3Count >= 3) throw new Error("Top3 最多 3 個任務");
      }
      next[idx] = updated;
      setTasks(next);
      await save(next, completedTasks);
      return updated;
    },
    [tasks, completedTasks, save]
  );

  const moveCategory = useCallback(
    async (id: string, newCategory: TaskCategory) => {
      const active = [...tasks];
      const top3Count = active.filter((t) => t.category === "top3").length;
      const task = active.find((t) => t.id === id);
      if (!task) return null;
      if (newCategory === "top3" && task.category !== "top3" && top3Count >= 3)
        throw new Error("Top3 最多 3 個任務");
      return updateTask(id, { category: newCategory });
    },
    [tasks, updateTask]
  );

  const completeTask = useCallback(
    async (id: string) => {
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const [task] = tasks.splice(idx, 1);
      task.completed = true;
      const nextActive = [...tasks];
      const nextCompleted = [...completedTasks, task];
      setTasks(nextActive);
      setCompletedTasks(nextCompleted);
      await save(nextActive, nextCompleted);
    },
    [tasks, completedTasks, save]
  );

  const uncompleteTask = useCallback(
    async (id: string) => {
      const idx = completedTasks.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const [task] = completedTasks.splice(idx, 1);
      task.completed = false;
      const nextCompleted = [...completedTasks];
      const nextActive = [...tasks, task];
      setCompletedTasks(nextCompleted);
      setTasks(nextActive);
      await save(nextActive, nextCompleted);
    },
    [tasks, completedTasks, save]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const inActive = tasks.findIndex((t) => t.id === id);
      if (inActive >= 0) {
        const next = tasks.filter((t) => t.id !== id);
        setTasks(next);
        await save(next, completedTasks);
        return;
      }
      const inCompleted = completedTasks.findIndex((t) => t.id === id);
      if (inCompleted >= 0) {
        const next = completedTasks.filter((t) => t.id !== id);
        setCompletedTasks(next);
        await save(tasks, next);
      }
    },
    [tasks, completedTasks, save]
  );

  const top3 = tasks.filter((t) => t.category === "top3");

  return {
    tasks,
    completedTasks,
    top3,
    loading,
    load,
    addTask,
    updateTask,
    moveCategory,
    completeTask,
    uncompleteTask,
    deleteTask,
  };
}
