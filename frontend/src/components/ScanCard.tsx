"use client";

import Link from "next/link";
import type { Scan } from "@/lib/api";

const STATUS_CONFIG = {
  pending:    { label: "Bekliyor",    bg: "bg-slate-800",    text: "text-slate-400", dot: "bg-slate-500" },
  processing: { label: "İşleniyor",  bg: "bg-blue-950",     text: "text-blue-400",  dot: "bg-blue-400 animate-pulse" },
  completed:  { label: "Tamamlandı", bg: "bg-emerald-950",  text: "text-emerald-400", dot: "bg-emerald-400" },
  failed:     { label: "Başarısız",  bg: "bg-red-950",      text: "text-red-400",   dot: "bg-red-400" },
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function scoreRing(score: number) {
  if (score >= 80) return "ring-emerald-500/30";
  if (score >= 60) return "ring-amber-500/30";
  return "ring-red-500/30";
}

export default function ScanCard({ scan }: { scan: Scan }) {
  const status = STATUS_CONFIG[scan.status] ?? STATUS_CONFIG.pending;
  const isProcessing = scan.status === "pending" || scan.status === "processing";

  return (
    <Link href={`/scans/${scan.id}`} className="block group">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 hover:bg-slate-800/50 transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-white group-hover:text-blue-300 transition-colors">{scan.district}</h3>
            <p className="text-slate-500 text-xs">{scan.city}</p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3 mb-3">
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
              <p className="text-slate-500 text-sm">Analiz ediliyor...</p>
            </div>
          ) : (
            <>
              <div className={`w-12 h-12 rounded-full ring-2 ${scoreRing(scan.accessibility_score)} flex items-center justify-center bg-slate-800`}>
                <span className={`text-lg font-black ${scoreColor(scan.accessibility_score)}`}>
                  {scan.accessibility_score}
                </span>
              </div>
              <div>
                <p className={`font-semibold text-sm ${scoreColor(scan.accessibility_score)}`}>{scan.compliance_level}</p>
                <p className="text-slate-500 text-xs">{scan.issues?.length || 0} sorun tespit edildi</p>
              </div>
            </>
          )}
        </div>

        {/* Issues preview */}
        {!isProcessing && scan.issues && scan.issues.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {scan.issues.slice(0, 3).map((issue, i) => {
              const severity = issue.severity;
              const colorMap: Record<string, string> = {
                critical: "bg-red-950 text-red-400",
                high: "bg-orange-950 text-orange-400",
                medium: "bg-amber-950 text-amber-400",
                low: "bg-slate-800 text-slate-400",
              };
              return (
                <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colorMap[severity] || colorMap.low}`}>
                  {severity.toUpperCase()}
                </span>
              );
            })}
            {scan.issues.length > 3 && (
              <span className="text-[10px] text-slate-500 px-1 py-0.5">+{scan.issues.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
          <p className="text-slate-600 text-[10px]">
            {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
          </p>
          <p className="text-slate-600 text-[10px]">
            {new Date(scan.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>
    </Link>
  );
}
