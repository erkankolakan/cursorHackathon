import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KentScan — Engelsiz Kent Denetim Platformu",
  description: "AI destekli kentsel erişilebilirlik denetim platformu. 5378 Sayılı Engelliler Kanunu uyumluluğu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
