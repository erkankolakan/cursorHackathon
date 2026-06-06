"use client";

import { useState, useEffect, useCallback } from "react";
import { listScans, createScan, getStats, pollScanStatus, loadStoredAuth, type Scan, type OrgStats } from "@/lib/api";
import AppShell from "@/components/AppShell";
import NewScanModal from "@/components/NewScanModal";
import StatsCards from "@/components/StatsCards";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import ScanCard from "@/components/ScanCard";

export default function DashboardPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewScan, setShowNewScan] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scanError, setScanError] = useState("");

  const loadData = useCallback(async () => {
    try {
      loadStoredAuth();
      const [scansRes, statsRes] = await Promise.allSettled([listScans(1, 50), getStats()]);
      if (scansRes.status === "fulfilled") setScans(scansRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreateScan(data: { district: string; city: string; latitude: number; longitude: number }) {
    setCreating(true);
    setScanError("");
    try {
      loadStoredAuth();
      const scan = await createScan(data);
      setScans(prev => [scan, ...prev]);
      setShowNewScan(false);

      // Start polling for async scan completion
      const stopPoll = pollScanStatus(scan.id, (updated) => {
        setScans(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (updated.status === "completed" || updated.status === "failed") {
          stopPoll();
          loadData(); // Refresh stats
        }
      });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Tarama başlatılamadı");
    } finally {
      setCreating(false);
    }
  }

  const recentScans = scans.slice(0, 6);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Kentsel erişilebilirlik denetim özeti</p>
          </div>
          <button
            onClick={() => setShowNewScan(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow shadow-blue-600/30"
          >
            <span className="text-lg leading-none">+</span> Yeni Tarama
          </button>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} scans={scans} loading={loading} />

        {/* Analytics Charts */}
        {!loading && (stats?.district_breakdown?.length || stats?.trend_data?.length) ? (
          <AnalyticsCharts stats={stats!} scans={scans} />
        ) : null}

        {/* Recent Scans */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Son Taramalar</h2>
            <a href="/scans" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
              Tümünü Gör →
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-slate-900 rounded-xl h-44 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : recentScans.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="text-5xl mb-3">🗺️</div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Henüz Tarama Yok</h3>
              <p className="text-slate-500 text-sm mb-5">İlk erişilebilirlik taramasını başlatın.</p>
              <button onClick={() => setShowNewScan(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                İlk Taramayı Başlat
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentScans.map(scan => (
                <ScanCard key={scan.id} scan={scan} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showNewScan && (
        <NewScanModal
          onClose={() => { setShowNewScan(false); setScanError(""); }}
          onSubmit={handleCreateScan}
          loading={creating}
          error={scanError}
        />
      )}
    </AppShell>
  );
}
