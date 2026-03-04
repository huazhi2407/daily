/**
 * Persistence layer export.
 * 使用 createSyncPersistence：先打 API（登入後為雲端），未登入則用 localStorage。
 * 可改回 createLocalStoragePersistence 僅用本機。
 */

import type { IPersistence } from "./types";
import { createLocalStoragePersistence } from "./local-storage";
import { createSyncPersistence } from "./sync-storage";

export type { IPersistence } from "./types";
export { PERSISTENCE_KEYS } from "./keys";
export { createLocalStoragePersistence } from "./local-storage";
export { createSyncPersistence } from "./sync-storage";

let _instance: IPersistence | null = null;

/** Singleton getter. Lazy-init for client. Safe for SSR (methods no-op when window undefined). */
export function getPersistence(): IPersistence {
  if (!_instance) _instance = createSyncPersistence();
  return _instance;
}
