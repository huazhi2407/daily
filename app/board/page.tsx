"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PageShell } from "@/components/layout";
import { useBoard } from "@/hooks";
import { ConnectionArrows } from "@/components/board/ConnectionArrows";
import type { BoardConnectionSide } from "@/types";

const EDGE_SIDES: BoardConnectionSide[] = ["top", "right", "bottom", "left"];

export default function BoardPage() {
  const {
    cards,
    connections,
    loading,
    addCard,
    updateCard,
    moveCard,
    deleteCard,
    addConnection,
    deleteConnection,
  } = useBoard();
  const [newContent, setNewContent] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [connectFromSide, setConnectFromSide] = useState<BoardConnectionSide | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    lastX: number;
    lastY: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {};
      if (width && height) {
        setContainerSize((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleAdd = async () => {
    await addCard(newContent.trim() || "新卡片");
    setNewContent("");
  };

  const handleEdgeDotClick = useCallback(
    (e: React.MouseEvent, cardId: string, side: BoardConnectionSide) => {
      e.stopPropagation();
      e.preventDefault();
      if (!connectMode) return;
      if (connectFromId === null) {
        setConnectFromId(cardId);
        setConnectFromSide(side);
      } else if (connectFromId === cardId) {
        setConnectFromId(null);
        setConnectFromSide(null);
      } else {
        addConnection(connectFromId, cardId, connectFromSide ?? undefined, side);
        setConnectFromId(null);
        setConnectFromSide(null);
      }
    },
    [connectMode, connectFromId, connectFromSide, addConnection]
  );

  const handleBoardClick = useCallback(() => {
    if (connectMode && connectFromId) {
      setConnectFromId(null);
      setConnectFromSide(null);
    }
  }, [connectMode, connectFromId]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (connectMode) return;
      const card = cards.find((c) => c.id === id);
      if (!card) return;
      dragRef.current = {
        id,
        offsetX: e.clientX - card.x,
        offsetY: e.clientY - card.y,
        lastX: card.x,
        lastY: card.y,
      };
      setDragging(id);
      setDragPos({ x: card.x, y: card.y });
    },
    [cards, connectMode]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const x = e.clientX - dragRef.current.offsetX;
    const y = e.clientY - dragRef.current.offsetY;
    dragRef.current.lastX = x;
    dragRef.current.lastY = y;
    setDragPos({ x, y });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      const { id, lastX, lastY } = dragRef.current;
      moveCard(id, lastX, lastY);
      dragRef.current = null;
      setDragging(null);
    }
  }, [moveCard]);

  const handleConnectionClick = useCallback(
    (connId: string) => {
      if (window.confirm("刪除此連線？")) deleteConnection(connId);
    },
    [deleteConnection]
  );

  return (
    <PageShell title="白板">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="新增便籤..."
            className="flex-1 min-w-[120px] rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            新增
          </button>
          <button
            onClick={() => {
              setConnectMode((m) => !m);
              setConnectFromId(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              connectMode
                ? "bg-indigo-600 text-white"
                : "border border-zinc-600 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {connectMode ? "連線模式（點邊緣點連線）" : "連線模式"}
          </button>
        </div>

        {connectFromId && (
          <p className="text-sm text-indigo-400">
            已選起點，請點擊另一張卡片的邊緣點完成連線
          </p>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">載入中...</p>
        ) : (
          <div
            ref={containerRef}
            className="relative min-h-[400px] rounded-xl border border-zinc-800 bg-zinc-900/30"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleBoardClick}
          >
            <ConnectionArrows
              cards={cards.map((c) =>
                dragging === c.id ? { ...c, x: dragPos.x, y: dragPos.y } : c
              )}
              connections={connections}
              containerRect={containerSize}
              onConnectionClick={handleConnectionClick}
            />
            {cards.map((card) => {
              const pos = dragging === card.id ? dragPos : { x: card.x, y: card.y };
              return (
                <BoardCard
                  key={card.id}
                  card={{ ...card, x: pos.x, y: pos.y }}
                  isDragging={dragging === card.id}
                  connectMode={connectMode}
                  isConnectFrom={connectFromId === card.id}
                  connectFromSide={connectFromId === card.id ? connectFromSide : null}
                  showEdgeDots={connectMode && (hoveredCardId === card.id || connectFromId === card.id)}
                  onMouseDown={(e) => handleMouseDown(e, card.id)}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onEdgeDotClick={(e, side) => handleEdgeDotClick(e, card.id, side)}
                  onUpdateContent={(content) => updateCard(card.id, { content })}
                  onDelete={() => deleteCard(card.id)}
                />
              );
            })}
          </div>
        )}

        {connections.length > 0 && (
          <section className="rounded-xl border border-zinc-800 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">連線列表</h3>
            <ul className="space-y-1">
              {connections.map((conn) => {
                const from = cards.find((c) => c.id === conn.fromId);
                const to = cards.find((c) => c.id === conn.toId);
                return (
                  <li
                    key={conn.id}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm text-zinc-300"
                  >
                    <span>
                      {from?.content || "?"} → {to?.content || "?"}
                    </span>
                    <button
                      onClick={() => deleteConnection(conn.id)}
                      className="text-red-400/80 hover:text-red-400"
                    >
                      刪除
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function BoardCard({
  card,
  isDragging,
  connectMode,
  isConnectFrom,
  connectFromSide,
  showEdgeDots,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onEdgeDotClick,
  onUpdateContent,
  onDelete,
}: {
  card: { id: string; x: number; y: number; content: string };
  isDragging: boolean;
  connectMode: boolean;
  isConnectFrom: boolean;
  connectFromSide: BoardConnectionSide | null;
  showEdgeDots: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onEdgeDotClick: (e: React.MouseEvent, side: BoardConnectionSide) => void;
  onUpdateContent: (content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.content);

  const save = () => {
    if (draft.trim()) onUpdateContent(draft.trim());
    setEditing(false);
  };

  const dotPosition: Record<BoardConnectionSide, string> = {
    top: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
    right: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
    bottom: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2",
    left: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  return (
    <div
      className={`absolute rounded-lg border p-2 shadow ${
        connectMode ? "cursor-default" : "cursor-move"
      } ${
        isConnectFrom
          ? "z-10 border-indigo-500 ring-2 ring-indigo-500/50"
          : isDragging
            ? "z-10 border-indigo-500 bg-amber-500/10"
            : "border-amber-500/40 bg-amber-500/10"
      }`}
      style={{ left: card.x, top: card.y, width: 180, minHeight: 80 }}
      onMouseDown={connectMode ? undefined : onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {showEdgeDots &&
        EDGE_SIDES.map((side) => (
          <button
            key={side}
            type="button"
            className={`absolute h-3 w-3 rounded-full border-2 border-indigo-400 bg-indigo-600 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${dotPosition[side]}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEdgeDotClick(e, side);
            }}
            title={side === "top" ? "上" : side === "right" ? "右" : side === "bottom" ? "下" : "左"}
          />
        ))}
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-20 w-full resize-none rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm outline-none"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                save();
              }}
              className="text-xs text-indigo-400"
            >
              儲存
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
              }}
              className="text-xs text-zinc-500"
            >
              取消
            </button>
          </div>
        </>
      ) : (
        <>
          <p
            className="cursor-text text-sm text-zinc-200"
            onClick={(e) => {
              e.stopPropagation();
              if (!connectMode) setEditing(true);
            }}
            onMouseDown={(e) => connectMode && e.stopPropagation()}
          >
            {card.content}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute right-1 top-1 text-zinc-500 hover:text-red-400"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}
