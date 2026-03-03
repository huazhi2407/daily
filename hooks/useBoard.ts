"use client";

import { useState, useEffect, useCallback } from "react";
import type { BoardCard, BoardConnection, BoardConnectionSide } from "@/types";
import { generateId } from "@/types/common";
import { getPersistence, PERSISTENCE_KEYS } from "@/lib/persistence";

/**
 * useBoard - Canvas cards + connections with persistence.
 * Connections stored separately; deleted when either card is removed.
 */
export function useBoard() {
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [connections, setConnections] = useState<BoardConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const p = getPersistence();
    const [rawCards, rawConnections] = await Promise.all([
      p.get<BoardCard[]>(PERSISTENCE_KEYS.BOARD),
      p.get<BoardConnection[]>(PERSISTENCE_KEYS.BOARD_CONNECTIONS),
    ]);
    setCards(rawCards ?? []);
    setConnections(rawConnections ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCards = useCallback(async (next: BoardCard[]) => {
    const p = getPersistence();
    await p.set(PERSISTENCE_KEYS.BOARD, next);
    setCards(next);
  }, []);

  const saveConnections = useCallback(async (next: BoardConnection[]) => {
    const p = getPersistence();
    await p.set(PERSISTENCE_KEYS.BOARD_CONNECTIONS, next);
    setConnections(next);
  }, []);

  const addCard = useCallback(
    async (content: string, x?: number, y?: number) => {
      const card: BoardCard = {
        id: generateId(),
        x: x ?? 20 + cards.length * 15,
        y: y ?? 20 + cards.length * 15,
        content: content || "新卡片",
      };
      const next = [...cards, card];
      await saveCards(next);
      return card;
    },
    [cards, saveCards]
  );

  const updateCard = useCallback(
    async (id: string, updates: Partial<Pick<BoardCard, "x" | "y" | "content">>) => {
      const idx = cards.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      const next = [...cards];
      next[idx] = { ...next[idx], ...updates };
      await saveCards(next);
      return next[idx];
    },
    [cards, saveCards]
  );

  const moveCard = useCallback(
    async (id: string, x: number, y: number) => {
      return updateCard(id, { x, y });
    },
    [updateCard]
  );

  const deleteCard = useCallback(
    async (id: string) => {
      const nextCards = cards.filter((c) => c.id !== id);
      const nextConnections = connections.filter(
        (conn) => conn.fromId !== id && conn.toId !== id
      );
      await saveCards(nextCards);
      await saveConnections(nextConnections);
    },
    [cards, connections, saveCards, saveConnections]
  );

  const addConnection = useCallback(
    async (
      fromId: string,
      toId: string,
      fromSide?: BoardConnectionSide,
      toSide?: BoardConnectionSide
    ) => {
      if (fromId === toId) return null;
      const exists = connections.some(
        (c) => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
      );
      if (exists) return null;
      const conn: BoardConnection = {
        id: generateId(),
        fromId,
        toId,
        ...(fromSide && { fromSide }),
        ...(toSide && { toSide }),
      };
      const next = [...connections, conn];
      await saveConnections(next);
      return conn;
    },
    [connections, saveConnections]
  );

  const deleteConnection = useCallback(
    async (id: string) => {
      const next = connections.filter((c) => c.id !== id);
      await saveConnections(next);
    },
    [connections, saveConnections]
  );

  return {
    cards,
    connections,
    loading,
    load,
    addCard,
    updateCard,
    moveCard,
    deleteCard,
    addConnection,
    deleteConnection,
  };
}
