"use client";

import type { Scan, OrgStats } from "@/lib/api";

interface Props {
  stats: OrgStats | null;
  scans: Scan[];
  loading: boolean;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </div>
  );
}

export default function StatsCards({ stats, scans, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  const total = stats?.total_scans ?? scans.length;
  const avgScore = stats?.avg_score != null ? Math.round(stats.avg_score) : (
    scans.length > 0 ? Math.round(scans.reduce((a, b) => a + b.accessibility_score, 0) / scans.length) : 0
  );
  const complianceRate = stats?.compliance_rate != null ? Math.round(stats.compliance_rate) : (
    scans.length > 0 ? Math.round((scans.filter(s => s.accessibility_score >= 80).length / scans.length) * 100) : 0
  );
  const criticalCount = stats?.critical_count ?? scans.filter(s => s.accessibility_score < 60).length;

  const totalCost = scans
    .flatMap(s => s.issues || [])
    .reduce((acc, issue) => acc + (issue.estimated_cost || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Toplam Tarama"
        value={total}
        sub="Analiz edilmiş konum"
        color="text-blue-400"
      />
      <StatCard
        label="Ortalama Skor"
        value={`${avgScore}/100`}
        sub="Erişilebilirlik puanı"
        color={avgScore >= 80 ? "text-emerald-400" : avgScore >= 60 ? "text-amber-400" : "text-red-400"}
      />
      <StatCard
        label="Uyum Oranı"
        value={`%${complianceRate}`}
        sub="≥80 puan alanlar"
        color="text-emerald-400"
      />
      <StatCard
        label="Kritik Alan"
        value={criticalCount}
        sub={totalCost > 0 ? `~₺${(totalCost / 1000).toFixed(0)}K tahmini maliyet` : "Acil müdahale gerekli"}
        color="text-red-400"
      />
    </div>
  );
}
