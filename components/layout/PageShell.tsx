"use client";

interface PageShellProps {
  title: string;
  children: React.ReactNode;
}

/** Wraps page content with consistent padding. Accounts for bottom nav on mobile. */
export function PageShell({ title, children }: PageShellProps) {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="border-b border-zinc-800 px-4 py-4 md:px-6">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
      </header>
      <main className="px-4 py-4 md:px-6 md:py-6">{children}</main>
    </div>
  );
}
