"use client";

import { useState, useEffect, useCallback } from "react";
import { getPersistence, PERSISTENCE_KEYS } from "@/lib/persistence";

/**
 * 讀寫 Google 日曆嵌入網址（iframe src）。
 * 在設定頁填寫後，日曆頁可顯示嵌入的 Google 日曆。
 */
export function useGoogleCalendarEmbed() {
  const [embedUrl, setEmbedUrlState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = getPersistence();
      const url = await p.get<string>(PERSISTENCE_KEYS.GOOGLE_CALENDAR_EMBED_URL);
      setEmbedUrlState(url ?? null);
      setLoading(false);
    };
    load();
  }, []);

  const setEmbedUrl = useCallback(async (url: string | null) => {
    const p = getPersistence();
    const value = url?.trim() || null;
    await p.set(PERSISTENCE_KEYS.GOOGLE_CALENDAR_EMBED_URL, value);
    setEmbedUrlState(value);
  }, []);

  return { embedUrl, setEmbedUrl, loading };
}
