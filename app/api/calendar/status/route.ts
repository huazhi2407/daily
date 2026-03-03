import { NextRequest, NextResponse } from "next/server";
import { decryptToken, getTokenCookieName } from "@/lib/google-calendar/cookie";

export async function GET(request: NextRequest) {
  const secret = process.env.CALENDAR_TOKEN_SECRET;
  if (!secret) {
    return NextResponse.json({ connected: false });
  }
  const cookieHeader = request.headers.get("cookie");
  const name = getTokenCookieName();
  const match = cookieHeader?.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (!raw) {
    return NextResponse.json({ connected: false });
  }
  const payload = decryptToken(secret, raw);
  const connected = !!payload?.access_token;
  return NextResponse.json({ connected });
}
