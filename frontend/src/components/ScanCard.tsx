"use client";

import type { Scan } from "@/lib/api";

interface ScanCardProps {
  scan: Scan;
  onClick: () => void;
}

export default function ScanCard({ scan, onClick }: ScanCardProps) {
  const scoreColor =
    scan.accessibility_score >= 80
      ? "text-emerald-400 border-emerald-800 bg-emerald-950/30"
      : scan.accessibility_score >= 60
      ? "text-amber-400 border-amber-800 bg-amber-950/30"
      : "text-red-400 border-red-800 bg-red-950/30";

  const statusBadge =
    scan.status === "completed"
      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
      : scan.status === "processing"
      ? "bg-blue-950 text-blue-400 border-blue-800"
      : scan.status === "failed"
      ? "bg-red-950 text-red-400 border-red-800"
      : "bg-slate-800 text-slate-400 border-slate-700";

  const statusLabel: Record<string, string> = {
    completed: "Tamamlandı",
    processing: "İşleniyor",
    failed: "Başarısız",
    pending: "Bekliyor",
  };

  return (
    <div
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-blue-900/10 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
            {scan.district}
          </h3>
          <p className="text-slate-500 text-xs">{scan.city}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${statusBadge}`}>
          {statusLabel[scan.status] || scan.status}
        </span>
      </div>

      <div className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${scoreColor} mb-3`}>
        <span className="text-3xl font-black">{scan.accessibility_score}</span>
        <div>
          <p className="text-xs opacity-70">Erişilebilirlik</p>
          <p className="text-sm font-semibold">{scan.compliance_level}</p>
        </div>
      </div>

      {scan.issues && scan.issues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {scan.issues.slice(0, 3).map((issue, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-0.5 rounded-full border ${
                issue.severity === "critical"
                  ? "bg-red-950 text-red-400 border-red-800"
                  : issue.severity === "high"
                  ? "bg-orange-950 text-orange-400 border-orange-800"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {issue.severity === "critical" ? "⚠ " : ""}
              {issue.type.replace(/_/g, " ")}
            </span>
          ))}
          {scan.issues.length > 3 && (
            <span className="text-xs text-slate-500">+{scan.issues.length - 3} daha</span>
          )}
        </div>
      )}

      <p className="text-slate-600 text-xs mt-3">
        {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
      </p>
    </div>
  );
}
