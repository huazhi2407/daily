import { NextRequest, NextResponse } from "next/server";
import { setTokenCookie } from "@/lib/google-calendar/cookie";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const secret = process.env.CALENDAR_TOKEN_SECRET;

  if (error) {
    return NextResponse.redirect(
      new URL(`/google-calendar?google=denied`, request.url)
    );
  }
  if (!code || !redirectUri || !clientId || !clientSecret || !secret) {
    return NextResponse.redirect(
      new URL("/google-calendar?google=error", request.url)
    );
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Google token exchange failed:", err);
    return NextResponse.redirect(new URL("/google-calendar?google=error", request.url));
  }

  const data = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const expiry_date = Date.now() + data.expires_in * 1000;
  const payload = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date,
  };

  const response = NextResponse.redirect(new URL("/google-calendar?google=connected", request.url));
  setTokenCookie(secret, payload, response);
  return response;
}
