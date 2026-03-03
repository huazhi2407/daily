/**
 * LocalStorage implementation of IPersistence.
 * Client-only. SSR-safe (no-op when window undefined).
 */

import type { IPersistence } from "./types";

export function createLocalStoragePersistence(): IPersistence {
  return {
    async get<T>(key: string): Promise<T | null> {
      if (typeof window === "undefined") return null;
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, JSON.stringify(value));
    },

    async remove(key: string): Promise<void> {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
    },
  };
}
