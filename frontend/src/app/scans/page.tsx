"use client";

import { useState, useEffect, useCallback } from "react";
import { listScans, createScan, createScanFromUpload, pollScanStatus, loadStoredAuth, type Scan } from "@/lib/api";
import AppShell from "@/components/AppShell";
import ScanCard from "@/components/ScanCard";
import NewScanModal from "@/components/NewScanModal";

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewScan, setShowNewScan] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scanError, setScanError] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      loadStoredAuth();
      const res = await listScans(1, 100);
      setScans(res.data || []);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startPolling(scan: Scan) {
    const stopPoll = pollScanStatus(scan.id, (updated) => {
      setScans(prev => prev.map(s => s.id === updated.id ? updated : s));
      if (updated.status === "completed" || updated.status === "failed") stopPoll();
    });
  }

  async function handleCreateScan(data: { district: string; city: string; latitude: number; longitude: number }) {
    setCreating(true);
    setScanError("");
    try {
      loadStoredAuth();
      const scan = await createScan(data);
      setScans(prev => [scan, ...prev]);
      setShowNewScan(false);
      startPolling(scan);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Tarama başlatılamadı");
    } finally {
      setCreating(false);
    }
  }

  async function handleUploadScan(data: { image: File; district: string; city: string; neighbourhood?: string }) {
    setCreating(true);
    setScanError("");
    try {
      loadStoredAuth();
      const scan = await createScanFromUpload(data);
      setScans(prev => [scan, ...prev]);
      setShowNewScan(false);
      startPolling(scan);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Fotoğraf analizi başlatılamadı");
    } finally {
      setCreating(false);
    }
  }

  const filtered = scans.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.district.toLowerCase().includes(search.toLowerCase()) && !s.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts = {
    all: scans.length,
    completed: scans.filter(s => s.status === "completed").length,
    pending: scans.filter(s => s.status === "pending" || s.status === "processing").length,
    failed: scans.filter(s => s.status === "failed").length,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Taramalar</h1>
            <p className="text-slate-400 text-sm mt-0.5">{scans.length} konum analiz edildi</p>
          </div>
          <button
            onClick={() => setShowNewScan(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow shadow-blue-600/30"
          >
            <span className="text-lg leading-none">+</span> Yeni Tarama
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            {(["all", "completed", "pending", "failed"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {f === "all" ? "Tümü" : f === "completed" ? "Tamamlandı" : f === "pending" ? "Bekliyor" : "Başarısız"}
                <span className="ml-1.5 text-xs opacity-70">({statusCounts[f === "pending" ? "pending" : f]})</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="İlçe veya şehir ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:ml-auto bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-[200px]"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-slate-900 rounded-xl h-44 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-slate-400">Eşleşen tarama bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(scan => <ScanCard key={scan.id} scan={scan} />)}
          </div>
        )}
      </div>

      {showNewScan && (
        <NewScanModal
          onClose={() => { setShowNewScan(false); setScanError(""); }}
          onSubmit={handleCreateScan}
          onUpload={handleUploadScan}
          loading={creating}
          error={scanError}
        />
      )}
    </AppShell>
  );
}
