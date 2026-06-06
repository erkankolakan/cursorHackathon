"use client";

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import type { OrgStats, Scan } from "@/lib/api";

interface Props {
  stats: OrgStats;
  scans: Scan[];
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

function IssueDistributionChart({ scans }: { scans: Scan[] }) {
  const issueMap: Record<string, number> = {};
  const labelMap: Record<string, string> = {
    missing_ramp: "Rampa Eksik",
    damaged_sidewalk: "Hasar",
    obstruction: "Engel",
    no_tactile_paving: "Yönlendirme Yok",
    pothole: "Çukur",
    narrow_sidewalk: "Dar Kaldırım",
  };
  scans.forEach(scan => (scan.issues || []).forEach(issue => {
    const key = labelMap[issue.type] || issue.type;
    issueMap[key] = (issueMap[key] || 0) + 1;
  }));
  const data = Object.entries(issueMap).map(([name, value]) => ({ name, value }));
  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Veri yok</div>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
          formatter={(value) => [value, "Tespit"]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TrendChart({ trendData }: { trendData: OrgStats["trend_data"] }) {
  if (!trendData?.length) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Henüz trend verisi yok</div>;
  const data = trendData.map(t => ({ ...t, score: Math.round(t.score) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => v.slice(5)} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
          formatter={(value) => [value, "Ort. Skor"]}
        />
        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DistrictBarChart({ districtBreakdown }: { districtBreakdown: OrgStats["district_breakdown"] }) {
  if (!districtBreakdown?.length) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">İlçe verisi yok</div>;
  const data = districtBreakdown.map(d => ({ ...d, avg_score: Math.round(d.avg_score), compliance_rate: Math.round(d.compliance_rate) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
        <YAxis type="category" dataKey="district" tick={{ fontSize: 10, fill: "#94a3b8" }} width={72} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
          formatter={(value, name) => [name === "avg_score" ? `${value}/100` : `%${value}`, name === "avg_score" ? "Ort. Skor" : "Uyum"]}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
        <Bar dataKey="avg_score" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Ort. Skor" />
        <Bar dataKey="compliance_rate" fill="#22c55e" radius={[0, 4, 4, 0]} name="Uyum %" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ComplianceGauge({ complianceRate }: { complianceRate: number }) {
  const data = [{ value: Math.round(complianceRate), fill: complianceRate >= 70 ? "#22c55e" : complianceRate >= 40 ? "#eab308" : "#ef4444" }];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <ResponsiveContainer width="100%" height={160}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" data={data} startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#1e293b" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center -mt-8">
        <p className="text-3xl font-black" style={{ color: data[0].fill }}>%{data[0].value}</p>
        <p className="text-slate-400 text-xs">5378 Uyum Oranı</p>
      </div>
    </div>
  );
}

export default function AnalyticsCharts({ stats, scans }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-slate-300 font-semibold text-sm mb-3">Sorun Dağılımı</h3>
        <IssueDistributionChart scans={scans} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-slate-300 font-semibold text-sm mb-3">14 Günlük Skor Trendi</h3>
        <TrendChart trendData={stats.trend_data} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-slate-300 font-semibold text-sm mb-3">İlçe Karşılaştırması</h3>
        <DistrictBarChart districtBreakdown={stats.district_breakdown} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-slate-300 font-semibold text-sm mb-3">Kanun Uyumu</h3>
        <ComplianceGauge complianceRate={stats.compliance_rate} />
      </div>
    </div>
  );
}
