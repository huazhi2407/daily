/**
 * 重複任務：依日期展開，供日曆等使用。
 */

import type { Task } from "@/types";
import type { RepeatRule } from "@/types/task";
import { toDateString } from "@/types/common";

/** 該任務在 date 這天是否有發生（單次比對日期；重複則依規則） */
function taskOccursOnDate(task: Task, date: Date): boolean {
  if (!task.dueTime) return false;
  const dateStr = toDateString(date);
  const taskDateStr = toDateString(task.dueTime);

  if (!task.repeat) {
    return taskDateStr === dateStr;
  }

  const rule = task.repeat as RepeatRule;
  if (date < task.dueTime) return false; // 尚未開始

  if (rule.type === "daily") return true;
  if (rule.type === "weekly" && rule.weekdays.length > 0) {
    return rule.weekdays.includes(date.getDay());
  }
  return false;
}

/**
 * 取得在指定日期「有發生」的任務（含單次與重複）。
 * 重複任務在同一天只會出現一次。
 */
export function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter((t) => !t.completed && taskOccursOnDate(t, date));
}

/**
 * 該任務在 date 當天的「顯示用」到期時間（日期用 date，時間用 task.dueTime）。
 */
export function getEffectiveDueTime(task: Task, date: Date): Date {
  if (!task.dueTime) return date;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    task.dueTime.getHours(),
    task.dueTime.getMinutes(),
    task.dueTime.getSeconds()
  );
}
