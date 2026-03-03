"use client";

import { useReminders } from "@/hooks";

/**
 * Mounts reminder engine. No UI - just starts the 60s poll.
 */
export function ReminderProvider({ children }: { children: React.ReactNode }) {
  useReminders();
  return <>{children}</>;
}
