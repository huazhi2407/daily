/**
 * Time log model.
 * Tracks actual time spent. Supports timer + manual entry.
 */

import type { Id } from "./common";

export type TimeLogCategory = "study" | "work" | "life" | "waste";

export interface TimeLog {
  id: Id;
  startTime: Date;
  endTime?: Date;
  title: string;
  category: TimeLogCategory;
  relatedTaskId?: Id;
  note?: string;
}

export interface TimeLogRecord {
  id: Id;
  startTime: string;
  endTime?: string;
  title: string;
  category: TimeLogCategory;
  relatedTaskId?: Id;
  note?: string;
}

export function timeLogToRecord(l: TimeLog): TimeLogRecord {
  return {
    ...l,
    startTime: l.startTime.toISOString(),
    endTime: l.endTime?.toISOString(),
  };
}

export function recordToTimeLog(r: TimeLogRecord): TimeLog {
  return {
    ...r,
    startTime: new Date(r.startTime),
    endTime: r.endTime ? new Date(r.endTime) : undefined,
  };
}
