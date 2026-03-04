"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 魔法連結回調頁：在瀏覽器處理 URL hash (#access_token=...) 或 query (?code=...)，
 * 建立 session 後導向設定頁。Supabase 預設用 hash 傳 token，伺服器收不到，必須在此處理。
 */
export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"處理中…" | "登入成功" | "連結無效或已過期">("處理中…");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setStatus("連結無效或已過期");
      return;
    }

    const next = searchParams.get("next") ?? "/settings";
    const code = searchParams.get("code");

    const finish = (success: boolean) => {
      if (success) setStatus("登入成功");
      else setStatus("連結無效或已過期");
      const target = success ? next : `${next}?auth=error`;
      const href = typeof window !== "undefined" && window.location.origin ? new URL(target, window.location.origin).href : target;
      window.location.replace(href);
    };

    (async () => {
      // 1. PKCE：網址帶 ?code= 時用 code 換 session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        finish(!error);
        return;
      }

      // 2. Implicit：Supabase 常把 token 放在 hash，只有瀏覽器看得到
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (!hash) {
        finish(false);
        return;
      }
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        finish(!error);
        return;
      }

      // token_hash（需在 Supabase 信箱範本改成此格式時才會出現）
      const tokenHash = params.get("token_hash") || searchParams.get("token_hash");
      const type = params.get("type") || searchParams.get("type");
      if (tokenHash && type === "email") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });
        finish(!error);
        return;
      }

      finish(false);
    })();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-zinc-300">
      <p className="text-sm">{status}</p>
    </div>
  );
}
