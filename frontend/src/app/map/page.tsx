"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { listScans, loadStoredAuth, type Scan } from "@/lib/api";
import AppShell from "@/components/AppShell";

// Leaflet is browser-only; disable SSR
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-slate-800 rounded-2xl">
    <div className="text-slate-400 text-sm flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      Harita yükleniyor...
    </div>
  </div>
)});

export default function MapPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [selected, setSelected] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      loadStoredAuth();
      const res = await listScans(1, 200);
      setScans(res.data || []);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completedScans = scans.filter(s => s.status === "completed");

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Harita Görünümü</h1>
            <p className="text-slate-400 text-sm mt-0.5">{completedScans.length} konum haritalandı</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" />Uyumlu (≥80)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500" />İyileştirme (60-79)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" />Kritik (&lt;60)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
          {/* Map */}
          <div className="lg:col-span-2 h-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-sm flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Taramalar yükleniyor...
                </div>
              </div>
            ) : (
              <LeafletMap scans={completedScans} onSelect={setSelected} />
            )}
          </div>

          {/* Sidebar */}
          <div className="h-full overflow-y-auto space-y-3">
            {selected ? (
              <div className="bg-slate-900 border border-blue-700/50 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white">{selected.district}</h3>
                    <p className="text-slate-500 text-sm">{selected.city}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white">✕</button>
                </div>
                <div className={`text-3xl font-black mb-1 ${selected.accessibility_score >= 80 ? "text-emerald-400" : selected.accessibility_score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                  {selected.accessibility_score}
                </div>
                <p className="text-slate-400 text-sm mb-3">{selected.compliance_level}</p>
                <div className="space-y-1.5 mb-3">
                  {(selected.issues || []).slice(0, 4).map((issue, i) => (
                    <div key={i} className="text-xs text-slate-400 bg-slate-800 rounded-lg px-2.5 py-1.5">
                      {issue.description.slice(0, 60)}...
                    </div>
                  ))}
                </div>
                <a href={`/scans/${selected.id}`} className="block text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                  Detayları Gör →
                </a>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center text-slate-500 text-sm">
                Haritadan bir konuma tıklayın
              </div>
            )}

            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">Tarama Listesi</h3>
            {completedScans.map(scan => (
              <button
                key={scan.id}
                onClick={() => setSelected(scan)}
                className={`w-full text-left bg-slate-900 border rounded-xl p-3 hover:border-slate-600 transition-colors ${
                  selected?.id === scan.id ? "border-blue-600" : "border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">{scan.district}</p>
                    <p className="text-slate-500 text-xs">{scan.city}</p>
                  </div>
                  <span className={`text-lg font-black ${scan.accessibility_score >= 80 ? "text-emerald-400" : scan.accessibility_score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                    {scan.accessibility_score}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
