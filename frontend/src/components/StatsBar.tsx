"use client";

interface StatsBarProps {
  total: number;
  critical: number;
  avgScore: number;
  compliant: number;
}

export default function StatsBar({ total, critical, avgScore, compliant }: StatsBarProps) {
  const stats = [
    { label: "Toplam Tarama", value: total, icon: "📍", color: "text-blue-400" },
    { label: "Kritik Sorun", value: critical, icon: "🚨", color: "text-red-400" },
    { label: "Ort. Skor", value: `${avgScore}/100`, icon: "📊", color: avgScore >= 80 ? "text-emerald-400" : avgScore >= 60 ? "text-amber-400" : "text-red-400" },
    { label: "Uyumlu Lokasyon", value: compliant, icon: "✅", color: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(stat => (
        <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{stat.icon}</span>
            <span className="text-slate-400 text-xs">{stat.label}</span>
          </div>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
