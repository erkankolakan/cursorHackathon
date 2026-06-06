"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { loadStoredAuth, isAuthenticated, logout } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Özet", icon: "◈" },
  { href: "/scans", label: "Taramalar", icon: "⊞" },
  { href: "/map", label: "Harita", icon: "◉" },
  { href: "/reports", label: "Raporlar", icon: "≡" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    loadStoredAuth();
    if (!isAuthenticated()) router.replace("/");
  }, [router]);

  function handleLogout() {
    logout();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-base shadow shadow-blue-600/40 group-hover:scale-105 transition-transform">♿</div>
              <div>
                <span className="font-black text-white text-base leading-none">KentScan</span>
                <span className="block text-blue-400 text-[10px] font-medium leading-none">Engelsiz Kent Denetim</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <span className="text-xs">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
              5378 Sayılı Kanun
            </span>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Çıkış
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex border-t border-slate-800">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                pathname === item.href ? "text-blue-400" : "text-slate-500 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
