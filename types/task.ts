/**
 * Task model.
 * Rules: max 3 in "top3", completed tasks stored separately.
 */

import type { Id } from "./common";

export type TaskCategory = "top3" | "must" | "scheduled" | "backlog" | "misc";

/** 重複規則：每天 或 每週指定星期幾 (0=日, 1=一, ..., 6=六) */
export type RepeatRule =
  | { type: "daily" }
  | { type: "weekly"; weekdays: number[] };

export interface Task {
  id: Id;
  title: string;
  description?: string;
  dueTime?: Date;
  category: TaskCategory;
  /** 重複：每天 或 每週幾天。有設 dueTime 時才有效 */
  repeat?: RepeatRule;
  /** 是否要同步到 Google 日曆（有到期日時在日曆頁可一鍵同步） */
  syncToGoogle?: boolean;
  /** 已同步到 Google 日曆的活動 id，有此值時時間線只顯示本機一筆不重複 */
  googleEventId?: string;
  /** 已同步活動的 Google 日曆連結 */
  googleEventLink?: string;
  /** Minutes before dueTime to trigger reminder. e.g. [0, 15, 60] = at due, 15min before, 1hr before */
  reminderOffsets: number[];
  completed: boolean;
  createdAt: Date;
}

/** Serialized for persistence (Date → ISO string) */
export interface TaskRecord {
  id: Id;
  title: string;
  description?: string;
  dueTime?: string;
  category: TaskCategory;
  repeat?: RepeatRule;
  syncToGoogle?: boolean;
  googleEventId?: string;
  googleEventLink?: string;
  reminderOffsets: number[];
  completed: boolean;
  createdAt: string;
}

export function taskToRecord(t: Task): TaskRecord {
  return {
    ...t,
    dueTime: t.dueTime?.toISOString(),
    createdAt: t.createdAt.toISOString(),
  };
}

export function recordToTask(r: TaskRecord): Task {
  return {
    ...r,
    dueTime: r.dueTime ? new Date(r.dueTime) : undefined,
    createdAt: new Date(r.createdAt),
  };
}
