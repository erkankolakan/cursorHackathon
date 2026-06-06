"use client";

import { useState, useEffect } from "react";
import { login, register, setAuthToken, setOrgId, loadStoredAuth, isAuthenticated } from "@/lib/api";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", org_id: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStoredAuth();
    setAuthed(isAuthenticated());
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const tokens = await login(form.email, form.password);
      setAuthToken(tokens.access_token);
      if (form.org_id) setOrgId(form.org_id);
      setAuthed(true);
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
      await register({ email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name });
      const tokens = await login(form.email, form.password);
      setAuthToken(tokens.access_token);
      if (form.org_id) setOrgId(form.org_id);
      setAuthed(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  if (authed) return <Dashboard />;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">♿</span>
            </div>
            <h1 className="text-2xl font-bold text-white">KentScan</h1>
          </div>
          <p className="text-slate-400 text-sm">Engelsiz Kent Denetim Platformu</p>
          <p className="text-slate-500 text-xs mt-1">5378 Sayılı Engelliler Kanunu Uyumluluk Sistemi</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "login" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "register" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Ad"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Soyad"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
            <input
              type="email"
              placeholder="E-posta"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              placeholder="Şifre"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Organizasyon ID (UUID)"
              value={form.org_id}
              onChange={e => setForm(f => ({ ...f, org_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-lg px-3 py-2 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Lütfen bekleyin..." : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
