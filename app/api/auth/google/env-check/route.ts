import { NextResponse } from "next/server";

/**
 * 除錯用：檢查 Vercel 上 Google OAuth 環境變數是否有被讀到。
 * 僅回傳「有/無」，不洩漏實際值。確認完可刪除此檔或此 route。
 */
export async function GET() {
  const ok =
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET &&
    !!process.env.GOOGLE_REDIRECT_URI &&
    !!process.env.CALENDAR_TOKEN_SECRET;

  return NextResponse.json({
    ok,
    message: ok
      ? "所有 Google OAuth 環境變數已設定"
      : "有環境變數未設定，請檢查 Vercel → Settings → Environment Variables",
    clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUriSet: !!process.env.GOOGLE_REDIRECT_URI,
    tokenSecretSet: !!process.env.CALENDAR_TOKEN_SECRET,
  });
}
