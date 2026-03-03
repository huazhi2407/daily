/**
 * Shared primitives and utilities.
 */

export type Id = string;

export function generateId(): Id {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 日期字串 YYYY-MM-DD，以「本地日期」為準，避免時區造成日曆往後一天 */
export type DateString = string;

export function toDateString(d: Date): DateString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateString(s: DateString): Date {
  return new Date(s + "T00:00:00");
}
