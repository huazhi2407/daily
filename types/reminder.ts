/**
 * Reminder engine types.
 * Used for scheduling and deduplication.
 */

import type { Id } from "./common";

export interface ReminderSchedule {
  taskId: Id;
  /** ISO string of when to fire */
  fireAt: string;
  /** Unique key to prevent duplicate notifications */
  dedupeKey: string;
}
