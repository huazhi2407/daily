import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getUserId() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "需要 key" }, { status: 400 });
  }
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "未設定 Supabase" }, { status: 500 });
  }
  const { data, error } = await supabase
    .from("user_data")
    .select("value")
    .eq("user_id", userId)
    .eq("key", key)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ value: null });
    }
    console.error("Sync GET error:", error);
    return NextResponse.json({ error: "讀取失敗" }, { status: 500 });
  }
  return NextResponse.json({ value: data?.value ?? null });
}

export async function POST(request: NextRequest) {
  let body: { key: string; value: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 });
  }
  if (!body.key) {
    return NextResponse.json({ error: "需要 key" }, { status: 400 });
  }
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "未設定 Supabase" }, { status: 500 });
  }
  const { error } = await supabase.from("user_data").upsert(
    {
      user_id: userId,
      key: body.key,
      value: body.value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,key" }
  );
  if (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json({ error: "寫入失敗" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  let body: { key: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 });
  }
  if (!body.key) {
    return NextResponse.json({ error: "需要 key" }, { status: 400 });
  }
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "未設定 Supabase" }, { status: 500 });
  }
  const { error } = await supabase
    .from("user_data")
    .delete()
    .eq("user_id", userId)
    .eq("key", body.key);
  if (error) {
    console.error("Sync DELETE error:", error);
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
