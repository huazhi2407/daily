"use client";

import { useState, useEffect, useCallback } from "react";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink?: string;
}

const fetcher = (url: string, options?: RequestInit) =>
  fetch(url, { ...options, credentials: "include" });

export function useGoogleCalendarSync() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetcher("/api/calendar/status");
      const data = await res.json();
      setConnected(!!data.connected);
      return !!data.connected;
    } catch {
      setConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const fetchEvents = useCallback(async (timeMin: string, timeMax: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher(
        `/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setEvents([]);
        setError(data.error ?? "無法載入");
        return [];
      }
      setEvents(data.events ?? []);
      return data.events ?? [];
    } catch (e) {
      setEvents([]);
      setError((e as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvent = useCallback(
    async (
      summary: string,
      start: Date,
      end: Date,
      recurrence?: { type: "daily" } | { type: "weekly"; weekdays: number[] }
    ) => {
      setError(null);
      const body: { summary: string; start: string; end: string; recurrence?: typeof recurrence } = {
        summary,
        start: start.toISOString(),
        end: end.toISOString(),
      };
      if (recurrence && (recurrence.type === "daily" || recurrence.type === "weekly")) {
        body.recurrence =
          recurrence.type === "weekly" && (!recurrence.weekdays?.length)
            ? { type: "weekly" as const, weekdays: [1, 2, 3, 4, 5] }
            : recurrence;
      }
      const res = await fetcher("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "建立失敗");
        return null;
      }
      return data.event as GoogleCalendarEvent;
    },
    []
  );

  const disconnect = useCallback(async () => {
    await fetcher("/api/calendar/disconnect", { method: "POST" });
    setConnected(false);
    setEvents([]);
  }, []);

  return {
    connected,
    events,
    loading,
    error,
    checkStatus,
    fetchEvents,
    createEvent,
    disconnect,
  };
}
