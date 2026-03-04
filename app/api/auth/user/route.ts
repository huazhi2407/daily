import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ user: null, configured: false });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return NextResponse.json({ user, configured: true });
}
