"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { register, setupSession, loadStoredAuth, isAuthenticated } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", org_id: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStoredAuth();
    if (isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await setupSession(form.email, form.password, form.org_id || undefined);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (form.password.length < 8) throw new Error("Şifre en az 8 karakter olmalı");
      if (!form.first_name.trim() || !form.last_name.trim()) throw new Error("Ad ve soyad zorunludur");
      await register({ email: form.email, password: form.password, first_name: form.first_name.trim(), last_name: form.last_name.trim() });
      await setupSession(form.email, form.password, form.org_id || undefined);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-600/30">♿</div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white">KentScan</h1>
              <p className="text-blue-400 text-xs font-medium">Engelsiz Kent Denetim Platformu</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-1">5378 Sayılı Engelliler Kanunu • AI Destekli Uyumluluk Sistemi</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex gap-2 mb-6 bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "login" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "register" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-3">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Ad" required value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
                <input type="text" placeholder="Soyad" required value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            )}
            <input type="email" placeholder="E-posta" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
            <input type="password" placeholder="Şifre (min. 8 karakter)" required value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
            <input type="text" placeholder="Organizasyon ID (opsiyonel)" value={form.org_id}
              onChange={e => setForm(f => ({ ...f, org_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />

            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-lg px-3 py-2 text-red-400 text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-600/20">
              {loading ? "Lütfen bekleyin..." : mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          KVKK uyumlu • Kişisel veri işlenmez • Sadece kentsel objeler analiz edilir
        </p>
      </div>
    </main>
  );
}
