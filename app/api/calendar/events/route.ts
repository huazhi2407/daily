import { NextRequest, NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/google-calendar/client";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");
  const timeMin = request.nextUrl.searchParams.get("timeMin");
  const timeMax = request.nextUrl.searchParams.get("timeMax");

  const headers: Record<string, string> = {};
  const client = await getCalendarClient(request.headers.get("cookie") ?? null, {
    setHeader: (k, v) => {
      headers[k] = v;
    },
  });

  if (!client) {
    return NextResponse.json({ error: "未連線 Google 日曆", events: [] }, { status: 401 });
  }

  if (eventId) {
    try {
      const event = await client.getEvent(eventId);
      if (!event) {
        return NextResponse.json({ error: "找不到活動", event: null }, { status: 404 });
      }
      return NextResponse.json({ event }, { headers: Object.keys(headers).length ? headers : undefined });
    } catch (e) {
      console.error("Calendar get event error:", e);
      return NextResponse.json({ error: "無法取得活動", event: null }, { status: 500 });
    }
  }

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "需要 timeMin 與 timeMax (ISO 字串) 或 eventId" },
      { status: 400 }
    );
  }

  try {
    const events = await client.listEvents(timeMin, timeMax);
    return NextResponse.json({ events }, { headers: Object.keys(headers).length ? headers : undefined });
  } catch (e) {
    console.error("Calendar list error:", e);
    return NextResponse.json({ error: "無法取得日曆活動", events: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: {
    summary: string;
    start: string;
    end: string;
    recurrence?: { type: "daily" } | { type: "weekly"; weekdays: number[] };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 });
  }
  if (!body.summary || !body.start || !body.end) {
    return NextResponse.json({ error: "需要 summary, start, end" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  const client = await getCalendarClient(request.headers.get("cookie") ?? null, {
    setHeader: (k, v) => {
      headers[k] = v;
    },
  });

  if (!client) {
    return NextResponse.json({ error: "未連線 Google 日曆" }, { status: 401 });
  }

  try {
    const start = new Date(body.start);
    const end = new Date(body.end);
    const event = await client.createEvent(body.summary, start, end, body.recurrence);
    return NextResponse.json(event ? { event } : { error: "建立失敗" }, {
      status: event ? 200 : 500,
      headers: Object.keys(headers).length ? headers : undefined,
    });
  } catch (e) {
    console.error("Calendar create error:", e);
    return NextResponse.json({ error: "無法建立活動" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: { eventId: string; summary: string; start: string; end: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 });
  }
  if (!body.eventId || !body.summary || !body.start || !body.end) {
    return NextResponse.json({ error: "需要 eventId, summary, start, end" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  const client = await getCalendarClient(request.headers.get("cookie") ?? null, {
    setHeader: (k, v) => {
      headers[k] = v;
    },
  });

  if (!client) {
    return NextResponse.json({ error: "未連線 Google 日曆" }, { status: 401 });
  }

  try {
    const start = new Date(body.start);
    const end = new Date(body.end);
    const event = await client.updateEvent(body.eventId, body.summary, start, end);
    return NextResponse.json(event ? { event } : { error: "更新失敗" }, {
      status: event ? 200 : 500,
      headers: Object.keys(headers).length ? headers : undefined,
    });
  } catch (e) {
    console.error("Calendar update error:", e);
    return NextResponse.json({ error: "無法更新活動" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  let body: { eventId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 });
  }
  if (!body.eventId) {
    return NextResponse.json({ error: "需要 eventId" }, { status: 400 });
  }

  const client = await getCalendarClient(request.headers.get("cookie") ?? null, { setHeader: () => {} });
  if (!client) {
    return NextResponse.json({ error: "未連線 Google 日曆" }, { status: 401 });
  }

  try {
    const ok = await client.deleteEvent(body.eventId);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error("Calendar delete error:", e);
    return NextResponse.json({ error: "無法刪除活動" }, { status: 500 });
  }
}
