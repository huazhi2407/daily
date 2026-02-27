const STORAGE_KEY = "daily-board-cards";

export function getStoredCards(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredCards(json: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, json);
}
