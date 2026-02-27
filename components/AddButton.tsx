"use client";

import { useBoardStore } from "@/store/useBoardStore";

export function AddButton() {
  const addCard = useBoardStore((s) => s.addCard);

  return (
    <button
      type="button"
      className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-black text-2xl text-white"
      onClick={addCard}
      aria-label="新增卡片"
    >
      +
    </button>
  );
}
