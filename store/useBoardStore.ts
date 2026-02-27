import { create } from "zustand";
import { getStoredCards, setStoredCards } from "@/lib/storage";

export interface Card {
  id: string;
  content: string;
  x: number;
  y: number;
  createdAt: number;
}

interface BoardState {
  cards: Card[];
  addCard: () => void;
  updateCard: (id: string, content: string) => void;
  deleteCard: (id: string) => void;
  loadFromStorage: () => void;
}

function persist(cards: Card[]) {
  setStoredCards(JSON.stringify(cards));
}

export const useBoardStore = create<BoardState>((set) => ({
  cards: [],

  addCard: () => {
    const card: Card = {
      id: crypto.randomUUID(),
      content: "",
      x: 40 + Math.random() * 260,
      y: 40 + Math.random() * 460,
      createdAt: Date.now(),
    };
    set((state) => {
      const next = { ...state, cards: [...state.cards, card] };
      persist(next.cards);
      return next;
    });
  },

  updateCard: (id: string, content: string) => {
    set((state) => {
      const cards = state.cards.map((c) =>
        c.id === id ? { ...c, content } : c
      );
      persist(cards);
      return { ...state, cards };
    });
  },

  deleteCard: (id: string) => {
    set((state) => {
      const cards = state.cards.filter((c) => c.id !== id);
      persist(cards);
      return { ...state, cards };
    });
  },

  loadFromStorage: () => {
    const raw = getStoredCards();
    if (!raw) return;
    try {
      const cards = JSON.parse(raw) as Card[];
      if (Array.isArray(cards)) set({ cards });
    } catch {
      // ignore invalid data
    }
  },
}));
