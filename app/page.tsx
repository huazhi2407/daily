"use client";

import { useEffect } from "react";
import { Canvas } from "@/components/Canvas";
import { useBoardStore } from "@/store/useBoardStore";

export default function Home() {
  const loadFromStorage = useBoardStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <main>
      <Canvas />
    </main>
  );
}
