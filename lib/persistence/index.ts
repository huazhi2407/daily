/**
 * Persistence layer export.
 * Swap createLocalStoragePersistence for createApiPersistence when migrating.
 */

import type { IPersistence } from "./types";
import { createLocalStoragePersistence } from "./local-storage";

export type { IPersistence } from "./types";
export { PERSISTENCE_KEYS } from "./keys";
export { createLocalStoragePersistence } from "./local-storage";

let _instance: IPersistence | null = null;

/** Singleton getter. Lazy-init for client. Safe for SSR (methods no-op when window undefined). */
export function getPersistence(): IPersistence {
  if (!_instance) _instance = createLocalStoragePersistence();
  return _instance;
}
