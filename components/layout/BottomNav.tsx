"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "儀表板", icon: "◉" },
  { href: "/tasks", label: "任務", icon: "☑" },
  { href: "/calendar", label: "日曆", icon: "📅" },
  { href: "/google-calendar", label: "Google", icon: "📆" },
  { href: "/settings", label: "設定", icon: "⚙" },
  { href: "/log", label: "時間記錄", icon: "⏱" },
  { href: "/board", label: "白板", icon: "▦" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-zinc-800 bg-zinc-950 md:hidden">
      {navItems.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
            pathname === href ? "text-indigo-400" : "text-zinc-500"
          }`}
        >
          <span className="text-lg">{icon}</span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
