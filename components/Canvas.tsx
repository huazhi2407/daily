"use client";

import { useBoardStore } from "@/store/useBoardStore";
import { CardItem } from "./CardItem";
import { AddButton } from "./AddButton";

export function Canvas() {
  const cards = useBoardStore((s) => s.cards);

  return (
    <div className="relative min-h-screen bg-white">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
      <AddButton />
    </div>
  );
}
