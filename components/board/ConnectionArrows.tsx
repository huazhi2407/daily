"use client";

import type { BoardCard, BoardConnection } from "@/types";
import { getConnectionLine } from "@/lib/utils/connection-line";

interface ConnectionArrowsProps {
  cards: BoardCard[];
  connections: BoardConnection[];
  containerRect: { width: number; height: number };
  onConnectionClick?: (connectionId: string) => void;
}

/**
 * SVG overlay for connection arrows.
 * Renders below cards (z-index). Lines follow card positions reactively.
 */
export function ConnectionArrows({
  cards,
  connections,
  containerRect,
  onConnectionClick,
}: ConnectionArrowsProps) {
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={containerRect.width}
      height={containerRect.height}
      style={{ zIndex: 0 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="rgb(99, 102, 241)" />
        </marker>
      </defs>
      <g className="pointer-events-auto">
        {connections.map((conn) => {
          const fromCard = cardMap.get(conn.fromId);
          const toCard = cardMap.get(conn.toId);
          if (!fromCard || !toCard) return null;

          const { start, end } = getConnectionLine(
            fromCard,
            toCard,
            conn.fromSide,
            conn.toSide
          );

          return (
            <g key={conn.id}>
              {/* Invisible wide stroke for hit area */}
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="transparent"
                strokeWidth="20"
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectionClick?.(conn.id);
                }}
                style={{ cursor: onConnectionClick ? "pointer" : undefined }}
              />
              {/* Visible line with arrowhead */}
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="rgb(99, 102, 241)"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
