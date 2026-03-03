import { NextRequest, NextResponse } from "next/server";

const SCOPE = "https://www.googleapis.com/auth/calendar";
const PROMPT = "consent"; // 強制顯示 consent 以取得 refresh_token

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth 未設定（缺少 GOOGLE_CLIENT_ID 或 GOOGLE_REDIRECT_URI）" },
      { status: 500 }
    );
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: PROMPT,
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(url);
}
