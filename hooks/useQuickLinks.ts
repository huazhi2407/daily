"use client";

import { useState, useEffect, useCallback } from "react";
import type { QuickLink } from "@/types";
import { generateId } from "@/types/common";
import { getPersistence, PERSISTENCE_KEYS } from "@/lib/persistence";

export function useQuickLinks() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const p = getPersistence();
    const raw = await p.get<QuickLink[]>(PERSISTENCE_KEYS.QUICK_LINKS);
    setLinks((raw ?? []).sort((a, b) => a.order - b.order));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (next: QuickLink[]) => {
    const p = getPersistence();
    await p.set(PERSISTENCE_KEYS.QUICK_LINKS, next);
    setLinks(next.sort((a, b) => a.order - b.order));
  }, []);

  const addLink = useCallback(
    async (payload: { label: string; url: string; icon?: string }) => {
      const link: QuickLink = {
        id: generateId(),
        ...payload,
        order: links.length,
      };
      const next = [...links, link];
      await save(next);
      return link;
    },
    [links, save]
  );

  const updateLink = useCallback(
    async (id: string, updates: Partial<Pick<QuickLink, "label" | "url" | "icon" | "order">>) => {
      const idx = links.findIndex((l) => l.id === id);
      if (idx === -1) return null;
      const next = [...links];
      next[idx] = { ...next[idx], ...updates };
      await save(next);
      return next[idx];
    },
    [links, save]
  );

  const deleteLink = useCallback(
    async (id: string) => {
      const next = links.filter((l) => l.id !== id);
      await save(next);
    },
    [links, save]
  );

  return { links, loading, load, addLink, updateLink, deleteLink };
}
