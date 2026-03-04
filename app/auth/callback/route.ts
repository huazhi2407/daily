import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/settings";
  const errorUrl = new URL("/settings?auth=error", request.url);
  const successUrl = new URL(next, request.url);

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback exchangeCodeForSession error:", error);
      return NextResponse.redirect(errorUrl);
    }
    return NextResponse.redirect(successUrl);
  }

  if (tokenHash && type === "email") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    if (error) {
      console.error("Auth callback verifyOtp error:", error);
      return NextResponse.redirect(errorUrl);
    }
    return NextResponse.redirect(successUrl);
  }

  return NextResponse.redirect(errorUrl);
}
