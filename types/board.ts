/**
 * Board / Canvas model.
 * Cards with position + connections (arrows) between them.
 */

import type { Id } from "./common";

export interface BoardCard {
  id: Id;
  x: number;
  y: number;
  content: string;
}

export type BoardConnectionSide = "top" | "right" | "bottom" | "left";

export interface BoardConnection {
  id: Id;
  fromId: Id;
  toId: Id;
  /** 連線起點在來源卡片的哪一側（可選，用於從邊緣點連線） */
  fromSide?: BoardConnectionSide;
  /** 連線終點在目標卡片的哪一側（可選） */
  toSide?: BoardConnectionSide;
}
