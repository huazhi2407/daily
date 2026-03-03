/**
 * Storage keys. Centralized to avoid magic strings.
 */

export const PERSISTENCE_KEYS = {
  TASKS: "life-os:tasks",
  TASKS_COMPLETED: "life-os:tasks-completed",
  TIME_LOGS: "life-os:time-logs",
  BOARD: "life-os:board",
  BOARD_CONNECTIONS: "life-os:board-connections",
  QUICK_LINKS: "life-os:quick-links",
  REMINDER_DEDUPE: "life-os:reminder-dedupe",
  /** Google 日曆嵌入用 iframe src 網址 */
  GOOGLE_CALENDAR_EMBED_URL: "life-os:google-calendar-embed-url",
} as const;
