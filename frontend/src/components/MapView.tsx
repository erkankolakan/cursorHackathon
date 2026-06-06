"use client";

import type { Scan } from "@/lib/api";

interface MapViewProps {
  scans: Scan[];
  onSelect: (scan: Scan) => void;
  selected: Scan | null;
}

export default function MapView({ scans, onSelect, selected }: MapViewProps) {
  if (scans.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="text-5xl mb-3">🗺️</div>
        <p className="text-slate-400">Haritada gösterilecek tarama verisi yok.</p>
      </div>
    );
  }

  const minLat = Math.min(...scans.map(s => s.latitude));
  const maxLat = Math.max(...scans.map(s => s.latitude));
  const minLng = Math.min(...scans.map(s => s.longitude));
  const maxLng = Math.max(...scans.map(s => s.longitude));
  const latRange = maxLat - minLat || 0.1;
  const lngRange = maxLng - minLng || 0.1;
  const pad = 0.15;

  function toXY(lat: number, lng: number) {
    const x = ((lng - minLng) / (lngRange + pad * lngRange)) * 90 + 5;
    const y = ((maxLat - lat) / (latRange + pad * latRange)) * 85 + 5;
    return { x, y };
  }

  function dotColor(score: number) {
    if (score >= 80) return "#34d399";
    if (score >= 60) return "#fbbf24";
    return "#f87171";
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Uyumlu (≥80)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> İyileştirme (60-79)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Kritik (&lt;60)</span>
      </div>
      <div className="relative bg-slate-800 rounded-lg overflow-hidden" style={{ paddingBottom: "55%" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
          <rect width="100" height="60" fill="#1e293b" />
          {scans.map(scan => {
            const { x, y } = toXY(scan.latitude, scan.longitude);
            const isSelected = selected?.id === scan.id;
            return (
              <g key={scan.id} onClick={() => onSelect(scan)} style={{ cursor: "pointer" }}>
                {isSelected && (
                  <circle cx={x} cy={y} r={2.5} fill={dotColor(scan.accessibility_score)} opacity={0.3} />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 1.8 : 1.2}
                  fill={dotColor(scan.accessibility_score)}
                  stroke={isSelected ? "#fff" : "transparent"}
                  strokeWidth={0.3}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
        {scans.map(scan => (
          <button
            key={scan.id}
            onClick={() => onSelect(scan)}
            className={`text-left text-xs rounded-lg px-3 py-2 border transition-colors ${selected?.id === scan.id ? "border-blue-500 bg-blue-950/30" : "border-slate-700 bg-slate-800 hover:border-slate-600"}`}
          >
            <div className="font-semibold text-white">{scan.district}</div>
            <div style={{ color: dotColor(scan.accessibility_score) }} className="font-bold">
              {scan.accessibility_score}/100
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
