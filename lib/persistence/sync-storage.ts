/**
 * 同步版 Persistence：先打 API（雲端），未登入或失敗則用 localStorage。
 * 登入後手機與電腦會讀寫同一份雲端資料，達成 app 與 app 同步。
 */

import type { IPersistence } from "./types";

const SYNC_API = "/api/sync";

function localGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function localSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function localRemove(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function createSyncPersistence(): IPersistence {
  return {
    async get<T>(key: string): Promise<T | null> {
      if (typeof window === "undefined") return null;
      try {
        const res = await fetch(`${SYNC_API}?key=${encodeURIComponent(key)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          return (data.value ?? null) as T | null;
        }
        if (res.status === 401) return localGet<T>(key);
        return localGet<T>(key);
      } catch {
        return localGet<T>(key);
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      if (typeof window === "undefined") return;
      try {
        const res = await fetch(SYNC_API, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        if (res.ok) return;
        if (res.status === 401) {
          localSet(key, value);
          return;
        }
        localSet(key, value);
      } catch {
        localSet(key, value);
      }
    },

    async remove(key: string): Promise<void> {
      if (typeof window === "undefined") return;
      try {
        const res = await fetch(SYNC_API, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (res.ok) return;
        if (res.status === 401) {
          localRemove(key);
          return;
        }
        localRemove(key);
      } catch {
        localRemove(key);
      }
    },
  };
}
