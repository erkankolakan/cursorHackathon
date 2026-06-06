"use client";

import { useEffect, useRef } from "react";
import type { Scan } from "@/lib/api";

interface Props {
  scans: Scan[];
  onSelect?: (scan: Scan) => void;
}

function getColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

export default function LeafletMap({ scans, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then(L => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Center on Istanbul if no scans, otherwise center on mean
      const defaultCenter: [number, number] = [41.0082, 28.9784];
      const completedScans = scans.filter(s => s.status === "completed");
      const center: [number, number] = completedScans.length
        ? [
            completedScans.reduce((a, s) => a + s.latitude, 0) / completedScans.length,
            completedScans.reduce((a, s) => a + s.longitude, 0) / completedScans.length,
          ]
        : defaultCenter;

      const map = L.map(mapRef.current!, { zoomControl: true }).setView(center, completedScans.length ? 12 : 11);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      completedScans.forEach(scan => {
        const color = getColor(scan.accessibility_score);
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:36px;height:36px;
            background:${color}22;
            border:2.5px solid ${color};
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:900;color:${color};
            box-shadow:0 0 12px ${color}44;
          ">${scan.accessibility_score}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const severityLabels: Record<string, string> = {
          critical: "Kritik", high: "Yüksek", medium: "Orta", low: "Düşük"
        };
        const issueList = (scan.issues || []).slice(0, 3)
          .map(i => `<div style="color:#94a3b8;font-size:11px;margin-top:3px">• ${i.description.slice(0, 50)}${i.description.length > 50 ? "..." : ""}</div>`)
          .join("");

        const popup = L.popup({ className: "kentscan-popup", maxWidth: 260 }).setContent(`
          <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px;min-width:220px">
            <div style="font-weight:800;color:white;font-size:14px">${scan.district}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:8px">${scan.city}</div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="font-size:28px;font-weight:900;color:${color}">${scan.accessibility_score}</div>
              <div>
                <div style="color:#94a3b8;font-size:11px">Erişilebilirlik Skoru</div>
                <div style="color:${color};font-weight:700;font-size:12px">${scan.compliance_level}</div>
              </div>
            </div>
            ${issueList}
            <a href="/scans/${scan.id}" style="display:block;margin-top:10px;text-align:center;background:#3b82f6;color:white;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none">Detayları Gör</a>
          </div>
        `);

        const marker = L.marker([scan.latitude, scan.longitude], { icon }).addTo(map);
        marker.bindPopup(popup);
        if (onSelect) marker.on("click", () => onSelect(scan));
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [scans, onSelect]);

  return <div ref={mapRef} className="w-full h-full rounded-2xl" />;
}
