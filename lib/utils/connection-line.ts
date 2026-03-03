/**
 * Connection line geometry.
 * Computes SVG line endpoints from card positions.
 * Cards: width 180, height 80.
 */

export const CARD_WIDTH = 180;
export const CARD_HEIGHT = 80;

export type EdgeSide = "top" | "right" | "bottom" | "left";

export interface Point {
  x: number;
  y: number;
}

export interface CardRect {
  id: string;
  x: number;
  y: number;
}

/**
 * Get center of card.
 */
export function getCardCenter(card: CardRect): Point {
  return {
    x: card.x + CARD_WIDTH / 2,
    y: card.y + CARD_HEIGHT / 2,
  };
}

/**
 * Find intersection of ray (from center in direction) with card rectangle.
 * Returns the exit point on the from card, or entry point on the to card.
 */
function intersectRayWithRect(
  center: Point,
  dirX: number,
  dirY: number,
  rect: { x: number; y: number }
): Point {
  const halfW = CARD_WIDTH / 2;
  const halfH = CARD_HEIGHT / 2;
  const left = rect.x;
  const right = rect.x + CARD_WIDTH;
  const top = rect.y;
  const bottom = rect.y + CARD_HEIGHT;

  let t = Infinity;

  if (dirX > 0) t = Math.min(t, (right - center.x) / dirX);
  else if (dirX < 0) t = Math.min(t, (left - center.x) / dirX);
  if (dirY > 0) t = Math.min(t, (bottom - center.y) / dirY);
  else if (dirY < 0) t = Math.min(t, (top - center.y) / dirY);

  t = Math.max(t, 0);
  return {
    x: center.x + dirX * t,
    y: center.y + dirY * t,
  };
}

/**
 * Get the midpoint of a card edge (for connection dots).
 */
export function getEdgeMidpoint(
  card: CardRect,
  side: EdgeSide
): Point {
  const cx = card.x + CARD_WIDTH / 2;
  const cy = card.y + CARD_HEIGHT / 2;
  switch (side) {
    case "top":
      return { x: cx, y: card.y };
    case "right":
      return { x: card.x + CARD_WIDTH, y: cy };
    case "bottom":
      return { x: cx, y: card.y + CARD_HEIGHT };
    case "left":
      return { x: card.x, y: cy };
  }
}

/**
 * Compute line from card A to card B.
 * If fromSide/toSide are given, uses edge midpoints; otherwise uses center-ray intersection.
 * Returns { start, end } in SVG coordinates.
 */
export function getConnectionLine(
  fromCard: CardRect,
  toCard: CardRect,
  fromSide?: EdgeSide,
  toSide?: EdgeSide
): { start: Point; end: Point } {
  if (fromSide && toSide) {
    return {
      start: getEdgeMidpoint(fromCard, fromSide),
      end: getEdgeMidpoint(toCard, toSide),
    };
  }
  const fromCenter = getCardCenter(fromCard);
  const toCenter = getCardCenter(toCard);

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return { start: fromCenter, end: toCenter };

  const dirX = dx / len;
  const dirY = dy / len;

  const start = intersectRayWithRect(fromCenter, dirX, dirY, fromCard);
  const end = intersectRayWithRect(toCenter, -dirX, -dirY, toCard);

  return { start, end };
}
