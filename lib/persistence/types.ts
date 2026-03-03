/**
 * Persistence abstraction.
 * Implementations: LocalStoragePersistence (now), ApiPersistence (future).
 * Hooks depend only on this interface - migration is a swap.
 */

export interface IPersistence {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
