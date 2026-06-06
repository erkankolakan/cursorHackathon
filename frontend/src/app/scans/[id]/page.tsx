"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getScan, pollScanStatus, loadStoredAuth, type Scan } from "@/lib/api";
import AppShell from "@/components/AppShell";

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: "KRİTİK", bg: "bg-red-950/50", text: "text-red-400", border: "border-red-800" },
  high:     { label: "YÜKSEK", bg: "bg-orange-950/50", text: "text-orange-400", border: "border-orange-800" },
  medium:   { label: "ORTA",   bg: "bg-amber-950/50", text: "text-amber-400", border: "border-amber-800" },
  low:      { label: "DÜŞÜK",  bg: "bg-slate-800/50", text: "text-slate-400", border: "border-slate-700" },
};

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-emerald-400", ring: "ring-emerald-500/40", bg: "bg-emerald-950/30" };
  if (score >= 60) return { text: "text-amber-400", ring: "ring-amber-500/40", bg: "bg-amber-950/30" };
  return { text: "text-red-400", ring: "ring-red-500/40", bg: "bg-red-950/30" };
}

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      loadStoredAuth();
      const s = await getScan(id);
      setScan(s);
      if (s.status === "pending" || s.status === "processing") {
        const stopPoll = pollScanStatus(id, (updated) => {
          setScan(updated);
          if (updated.status === "completed" || updated.status === "failed") stopPoll();
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tarama yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="h-10 bg-slate-800 animate-pulse rounded-xl w-48" />
          <div className="h-48 bg-slate-900 animate-pulse rounded-2xl" />
          <div className="h-64 bg-slate-900 animate-pulse rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !scan) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-slate-400">{error || "Tarama bulunamadı"}</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-400 hover:text-blue-300 text-sm">← Geri Dön</button>
        </div>
      </AppShell>
    );
  }

  const colors = scoreColor(scan.accessibility_score);
  const isProcessing = scan.status === "pending" || scan.status === "processing";
  const totalCost = (scan.issues || []).reduce((acc, i) => acc + (i.estimated_cost || 0), 0);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <span>←</span> Taramalara Dön
        </button>

        {/* Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">
                {scan.neighbourhood ? scan.neighbourhood : scan.district}
              </h1>
              <p className="text-slate-400">
                {scan.neighbourhood ? `${scan.district} — ${scan.city}` : scan.city}
              </p>
              <p className="text-slate-600 text-sm mt-1 font-mono">
                {scan.latitude.toFixed(5)}, {scan.longitude.toFixed(5)}
              </p>
            </div>

            {isProcessing ? (
              <div className="flex items-center gap-3 bg-blue-950/30 border border-blue-800 rounded-xl px-4 py-3">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-blue-400 font-medium text-sm">AI analiz ediliyor...</p>
              </div>
            ) : (
              <div className={`flex items-center gap-4 ${colors.bg} border ${colors.ring.replace("ring-", "border-").replace("/40", "/50")} rounded-xl px-5 py-3`}>
                <div className={`text-5xl font-black ${colors.text}`}>{scan.accessibility_score}</div>
                <div>
                  <p className="text-slate-400 text-xs">Erişilebilirlik</p>
                  <p className={`font-bold ${colors.text}`}>{scan.compliance_level}</p>
                  {totalCost > 0 && <p className="text-slate-500 text-xs mt-0.5">~₺{(totalCost / 1000).toFixed(0)}K tahmini maliyet</p>}
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Oluşturulma: {new Date(scan.created_at).toLocaleString("tr-TR")}</span>
            {scan.completed_at && <span>Tamamlanma: {new Date(scan.completed_at).toLocaleString("tr-TR")}</span>}
            <span>Durum: <span className="text-slate-300 font-medium">{scan.status}</span></span>
          </div>
        </div>

        {/* KVKK Anonymized Image */}
        {scan.anonymized_image_url && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-emerald-950 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-800">
                ✓ KVKK Uyumlu
              </span>
              <p className="text-slate-400 text-sm">Yüzler ve plakalar anonimleştirildi</p>
            </div>
            <img
              src={scan.anonymized_image_url}
              alt="Anonimleştirilmiş Street View"
              className="w-full rounded-xl object-cover max-h-72 border border-slate-700"
            />
          </div>
        )}

        {/* Issues */}
        {!isProcessing && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4">
              Tespit Edilen Sorunlar
              {scan.issues?.length > 0 && <span className="ml-2 text-slate-500 font-normal text-sm">({scan.issues.length})</span>}
            </h2>

            {!scan.issues || scan.issues.length === 0 ? (
              <div className="flex items-center gap-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-4">
                <span className="text-2xl">✅</span>
                <p className="text-emerald-400 font-medium">Herhangi bir erişilebilirlik sorunu tespit edilmedi. Bu alan 5378 Sayılı Kanun uyumlu görünüyor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scan.issues.map((issue, i) => {
                  const sev = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.low;
                  return (
                    <div key={i} className={`${sev.bg} border ${sev.border} rounded-xl p-4`}>
                      <div className="flex items-start gap-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sev.bg} ${sev.text} ${sev.border} shrink-0 mt-0.5`}>
                          {sev.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">{issue.description}</p>
                          <p className="text-slate-500 text-xs mt-0.5">Güven: %{Math.round(issue.confidence * 100)}</p>

                          {issue.legal_reference && (
                            <div className="mt-2 flex items-start gap-1.5">
                              <span className="text-blue-400 text-xs shrink-0">⚖️</span>
                              <p className="text-blue-400 text-xs">{issue.legal_reference}</p>
                            </div>
                          )}

                          {issue.recommendation && (
                            <div className="mt-2 bg-slate-900/50 rounded-lg p-2.5">
                              <p className="text-slate-300 text-xs font-medium mb-0.5">Öneri</p>
                              <p className="text-slate-400 text-xs">{issue.recommendation}</p>
                            </div>
                          )}

                          {issue.estimated_cost && (
                            <p className="text-amber-400 text-xs font-medium mt-2">
                              Tahmini Düzeltme Maliyeti: ₺{issue.estimated_cost.toLocaleString("tr-TR")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Street View Link */}
        {scan.street_view_url && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium text-sm">Google Street View</p>
              <p className="text-slate-500 text-xs">Ham konumu haritada görüntüle</p>
            </div>
            <a href={scan.street_view_url} target="_blank" rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              Görüntüle →
            </a>
          </div>
        )}
      </div>
    </AppShell>
  );
}
