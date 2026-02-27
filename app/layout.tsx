import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "便籤畫布",
  description: "簡易便籤畫布",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
