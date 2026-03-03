/**
 * 從 cookie 取得 token，必要時 refresh，回傳可呼叫 Calendar API 的 client。
 */

import { google } from "googleapis";
import type { TokenPayload } from "./cookie";
import { decryptToken, getTokenCookieName } from "./cookie";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  const data = (await res.json()) as { access_token: string; expires_in: number };
  return data;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO
  end: string;
  htmlLink?: string;
}

const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** 本機重複規則 → Google RRULE（RFC 5545），加 COUNT 避免無限重複造成問題 */
function toRRule(repeat: { type: "daily" } | { type: "weekly"; weekdays: number[] }): string[] {
  const count = "COUNT=365"; // 約一年
  if (repeat.type === "daily") return [`RRULE:FREQ=DAILY;${count}`];
  const weekdays = repeat.weekdays?.length ? repeat.weekdays : [1, 2, 3, 4, 5];
  const byday = [...weekdays].sort((a, b) => a - b).map((d) => RRULE_DAYS[d]).filter(Boolean).join(",");
  if (!byday) return [`RRULE:FREQ=WEEKLY;${count}`];
  return [`RRULE:FREQ=WEEKLY;BYDAY=${byday};${count}`];
}

export async function getCalendarClient(
  cookieHeader: string | null,
  res: { setHeader: (name: string, value: string) => void }
): Promise<{
  listEvents: (timeMin: string, timeMax: string) => Promise<CalendarEvent[]>;
  createEvent: (
    summary: string,
    start: Date,
    end: Date,
    recurrence?: { type: "daily" } | { type: "weekly"; weekdays: number[] }
  ) => Promise<CalendarEvent | null>;
} | null> {
  const secret = process.env.CALENDAR_TOKEN_SECRET;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret || !clientId || !clientSecret) return null;

  const cookieName = getTokenCookieName();
  const match = cookieHeader?.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (!raw) return null;

  let payload = decryptToken(secret, raw) as TokenPayload | null;
  if (!payload) return null;

  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5 min
  if (payload.expiry_date && payload.expiry_date < now + buffer && payload.refresh_token) {
    const refreshed = await refreshAccessToken(clientId, clientSecret, payload.refresh_token);
    payload = {
      access_token: refreshed.access_token,
      refresh_token: payload.refresh_token,
      expiry_date: Date.now() + refreshed.expires_in * 1000,
    };
    const { setTokenCookie } = await import("./cookie");
    setTokenCookie(secret, payload, res);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expiry_date: payload.expiry_date,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  return {
    async listEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
      const r = await calendar.events.list({
        calendarId: "primary",
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
      });
      const items = r.data.items ?? [];
      return items.map((ev) => {
        const start = ev.start?.dateTime ?? ev.start?.date ?? "";
        const end = ev.end?.dateTime ?? ev.end?.date ?? "";
        return {
          id: ev.id ?? "",
          summary: ev.summary ?? "(無標題)",
          start,
          end,
          htmlLink: ev.htmlLink ?? undefined,
        };
      });
    },
    async createEvent(
      summary: string,
      start: Date,
      end: Date,
      recurrence?: { type: "daily" } | { type: "weekly"; weekdays: number[] }
    ): Promise<CalendarEvent | null> {
      const body: {
        summary: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        recurrence?: string[];
      } = {
        summary,
        start: { dateTime: start.toISOString(), timeZone: "Asia/Taipei" },
        end: { dateTime: end.toISOString(), timeZone: "Asia/Taipei" },
      };
      if (recurrence && (recurrence.type === "daily" || recurrence.type === "weekly")) {
        body.recurrence = toRRule(recurrence);
      }
      const r = await calendar.events.insert({
        calendarId: "primary",
        requestBody: body,
      });
      const ev = r.data;
      if (!ev.id) return null;
      const startStr = ev.start?.dateTime ?? ev.start?.date ?? "";
      const endStr = ev.end?.dateTime ?? ev.end?.date ?? "";
      return {
        id: ev.id,
        summary: ev.summary ?? summary,
        start: startStr,
        end: endStr,
        htmlLink: ev.htmlLink ?? undefined,
      };
    },
  };
}
