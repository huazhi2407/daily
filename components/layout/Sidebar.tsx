"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "儀表板", icon: "◉" },
  { href: "/tasks", label: "任務", icon: "☑" },
  { href: "/calendar", label: "日曆", icon: "📅" },
  { href: "/google-calendar", label: "Google 日曆", icon: "📆" },
  { href: "/log", label: "時間記錄", icon: "⏱" },
  { href: "/board", label: "白板", icon: "▦" },
  { href: "/settings", label: "設定", icon: "⚙" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      <div className="p-4">
        <h1 className="text-lg font-bold text-white">個人生活 OS</h1>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              pathname === href
                ? "bg-indigo-600/20 text-indigo-400"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            <span>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
