"use client";

import type { Card } from "@/store/useBoardStore";
import { useBoardStore } from "@/store/useBoardStore";

interface CardItemProps {
  card: Card;
}

export function CardItem({ card }: CardItemProps) {
  const updateCard = useBoardStore((s) => s.updateCard);

  return (
    <div
      className="absolute rounded-xl bg-gray-100 p-3 shadow-sm w-56 min-h-[120px]"
      style={{ left: card.x, top: card.y }}
    >
      <textarea
        className="w-full min-h-[96px] resize-none border-0 bg-transparent text-sm focus:outline-none"
        placeholder="輸入內容..."
        value={card.content}
        onChange={(e) => updateCard(card.id, e.target.value)}
      />
    </div>
  );
}
