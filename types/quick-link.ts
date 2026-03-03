/**
 * Quick link model.
 */

import type { Id } from "./common";

export interface QuickLink {
  id: Id;
  label: string;
  url: string;
  icon?: string;
  order: number;
}
