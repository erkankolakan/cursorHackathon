"use client";

import { useState, useEffect, useCallback } from "react";
import { listScans, createScan, loadStoredAuth, type Scan } from "@/lib/api";
import ScanCard from "./ScanCard";
import NewScanModal from "./NewScanModal";
import StatsBar from "./StatsBar";
import MapView from "./MapView";

export default function Dashboard() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewScan, setShowNewScan] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scanError, setScanError] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  const loadScans = useCallback(async () => {
    try {
      const res = await listScans();
      setScans(res.data || []);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
    loadScans();
  }, [loadScans]);

  async function handleCreateScan(data: { district: string; city: string; latitude: number; longitude: number }) {
    setCreating(true);
    setScanError("");
    try {
      loadStoredAuth();
      const scan = await createScan(data);
      setScans(prev => [scan, ...prev]);
      setShowNewScan(false);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Tarama başlatılamadı");
    } finally {
      setCreating(false);
    }
  }

  const criticalCount = scans.filter(s => s.accessibility_score < 60).length;
  const avgScore = scans.length > 0 ? Math.round(scans.reduce((a, b) => a + b.accessibility_score, 0) / scans.length) : 0;
  const compliantCount = scans.filter(s => s.accessibility_score >= 80).length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-lg">♿</div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">KentScan</h1>
              <p className="text-slate-500 text-xs">Engelsiz Kent Denetim Platformu</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewScan(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span>+</span> Yeni Tarama
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <StatsBar
          total={scans.length}
          critical={criticalCount}
          avgScore={avgScore}
          compliant={compliantCount}
        />

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white bg-slate-800"}`}
          >
            Liste Görünümü
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "map" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white bg-slate-800"}`}
          >
            Harita Görünümü
          </button>
        </div>

        {/* Content */}
        {activeTab === "map" ? (
          <MapView scans={scans} onSelect={setSelectedScan} selected={selectedScan} />
        ) : (
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-slate-900 rounded-xl h-48 animate-pulse border border-slate-800" />
                ))}
              </div>
            ) : scans.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🗺️</div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">Henüz Tarama Yok</h3>
                <p className="text-slate-500 mb-6">İlk erişilebilirlik taramasını başlatmak için yukarıdaki butona tıklayın.</p>
                <button
                  onClick={() => setShowNewScan(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold"
                >
                  İlk Taramayı Başlat
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scans.map(scan => (
                  <ScanCard key={scan.id} scan={scan} onClick={() => setSelectedScan(scan)} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showNewScan && (
        <NewScanModal
          onClose={() => { setShowNewScan(false); setScanError(""); }}
          onSubmit={handleCreateScan}
          loading={creating}
          error={scanError}
        />
      )}

      {selectedScan && (
        <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />
      )}
    </div>
  );
}

function ScanDetailModal({ scan, onClose }: { scan: Scan; onClose: () => void }) {
  const scoreColor =
    scan.accessibility_score >= 80
      ? "text-emerald-400"
      : scan.accessibility_score >= 60
      ? "text-amber-400"
      : "text-red-400";

  const severityBadge = (s: string) => {
    const map: Record<string, string> = {
      critical: "bg-red-950 text-red-400 border-red-800",
      high: "bg-orange-950 text-orange-400 border-orange-800",
      medium: "bg-amber-950 text-amber-400 border-amber-800",
      low: "bg-slate-800 text-slate-400 border-slate-700",
    };
    return map[s] || map.low;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-white">{scan.district}, {scan.city}</h2>
            <p className="text-slate-500 text-sm">{scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex items-center gap-4">
          <div className={`text-4xl font-black ${scoreColor}`}>{scan.accessibility_score}</div>
          <div>
            <p className="text-slate-400 text-sm">Erişilebilirlik Skoru</p>
            <p className={`font-semibold ${scoreColor}`}>{scan.compliance_level}</p>
          </div>
        </div>

        {scan.issues && scan.issues.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-slate-300 font-semibold text-sm">Tespit Edilen Sorunlar</h3>
            {scan.issues.map((issue, i) => (
              <div key={i} className="bg-slate-800 rounded-lg p-3 flex items-start gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border mt-0.5 ${severityBadge(issue.severity)}`}>
                  {issue.severity.toUpperCase()}
                </span>
                <div>
                  <p className="text-slate-200 text-sm">{issue.description}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Güven: %{Math.round(issue.confidence * 100)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-emerald-400 text-sm">Sorun tespit edilmedi — Uyumlu</p>
        )}

        {scan.street_view_url && (
          <a
            href={scan.street_view_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-blue-400 hover:text-blue-300 text-sm underline"
          >
            Street View'da Görüntüle
          </a>
        )}
      </div>
    </div>
  );
}
