"use client";

import { useEffect, useRef, useCallback } from "react";
import { createReminderEngine } from "@/lib/reminder-engine";
import { getPersistence } from "@/lib/persistence";

/**
 * useReminders - Starts reminder engine, requests notification permission.
 * Reads tasks directly from persistence (no shared state needed).
 */
export function useReminders() {
  const engineRef = useRef<ReturnType<typeof createReminderEngine> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const engine = createReminderEngine({
      persistence: getPersistence(),
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    return engineRef.current?.requestPermission() ?? Promise.resolve("denied");
  }, []);

  return { requestPermission };
}
