import type { Metadata } from "next";
import { Sidebar, BottomNav } from "@/components/layout";
import { ReminderProvider } from "@/components/providers/ReminderProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "個人生活 OS",
  description: "任務系統 · Top 3 · 時間記錄 · 日曆 · 白板 · 提醒",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-zinc-900 text-zinc-100 antialiased">
        <ReminderProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col">
              {children}
              <BottomNav />
            </div>
          </div>
        </ReminderProvider>
      </body>
    </html>
  );
}
