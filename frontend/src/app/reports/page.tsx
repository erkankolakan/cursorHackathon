"use client";

import { useState, useEffect, useCallback } from "react";
import { listScans, getStats, loadStoredAuth, type Scan, type OrgStats } from "@/lib/api";
import AppShell from "@/components/AppShell";
import AnalyticsCharts from "@/components/AnalyticsCharts";

async function generatePDF(scans: Scan[], stats: OrgStats | null) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date().toLocaleString("tr-TR");
  const completedScans = scans.filter(s => s.status === "completed");

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("KentScan", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Engelsiz Kent Erişilebilirlik Denetim Raporu", 14, 26);
  doc.text(`5378 Sayılı Engelliler Kanunu Uyumluluk Değerlendirmesi`, 14, 32);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(`Rapor Tarihi: ${now}`, 210 - 14, 32, { align: "right" });

  // Summary
  let y = 50;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Yönetici Özeti", 14, y);
  y += 8;

  const avgScore = stats?.avg_score != null ? Math.round(stats.avg_score) : (
    completedScans.length > 0 ? Math.round(completedScans.reduce((a, b) => a + b.accessibility_score, 0) / completedScans.length) : 0
  );
  const complianceRate = stats?.compliance_rate != null ? Math.round(stats.compliance_rate) : 0;
  const criticalCount = stats?.critical_count ?? completedScans.filter(s => s.accessibility_score < 60).length;
  const totalCost = completedScans.flatMap(s => s.issues || []).reduce((acc, i) => acc + (i.estimated_cost || 0), 0);

  const summaryData = [
    ["Toplam Analiz Edilen Konum", completedScans.length.toString()],
    ["Ortalama Erişilebilirlik Skoru", `${avgScore}/100`],
    ["5378 Kanun Uyum Oranı", `%${complianceRate}`],
    ["Kritik Müdahale Gereken Alan", criticalCount.toString()],
    ["Toplam Tahmini Düzeltme Maliyeti", `₺${totalCost.toLocaleString("tr-TR")}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metrik", "Değer"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10, fontStyle: "bold" },
    bodyStyles: { fontSize: 10, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // District breakdown
  if (stats?.district_breakdown && stats.district_breakdown.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("İlçe Bazlı Erişilebilirlik Değerlendirmesi", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["İlçe", "Tarama Sayısı", "Ort. Skor", "Uyum Oranı", "Değerlendirme"]],
      body: stats.district_breakdown.map(d => [
        d.district,
        d.scan_count.toString(),
        `${Math.round(d.avg_score)}/100`,
        `%${Math.round(d.compliance_rate)}`,
        d.avg_score >= 80 ? "✓ Uyumlu" : d.avg_score >= 60 ? "⚠ İyileştirme Gerekli" : "✗ Kritik",
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // Scan details (new page)
  if (completedScans.length > 0) {
    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Lokasyon Detay Raporu", 14, y);
    y += 8;

    const scanRows = completedScans.map(scan => {
      const cost = (scan.issues || []).reduce((acc, i) => acc + (i.estimated_cost || 0), 0);
      return [
        `${scan.district}, ${scan.city}`,
        scan.accessibility_score.toString(),
        scan.compliance_level,
        (scan.issues || []).length.toString(),
        cost > 0 ? `₺${(cost / 1000).toFixed(0)}K` : "-",
        new Date(scan.created_at).toLocaleDateString("tr-TR"),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Konum", "Skor", "Durum", "Sorun Sayısı", "Tahmini Maliyet", "Tarih"]],
      body: scanRows,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const score = parseInt(data.cell.text[0]);
          if (score >= 80) data.cell.styles.textColor = [22, 163, 74];
          else if (score >= 60) data.cell.styles.textColor = [202, 138, 4];
          else data.cell.styles.textColor = [220, 38, 38];
        }
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`KentScan — AI Destekli Kentsel Erişilebilirlik Denetim Platformu | Sayfa ${i}/${pageCount}`, 105, 290, { align: "center" });
    doc.text("KVKK uyumlu — Kişisel veri işlenmez — Sadece kentsel objeler analiz edilir", 105, 294, { align: "center" });
  }

  doc.save(`KentScan_Rapor_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function generateCSV(scans: Scan[]) {
  const completed = scans.filter(s => s.status === "completed");
  const headers = ["İlçe", "Şehir", "Enlem", "Boylam", "Skor", "Uyum Durumu", "Sorun Sayısı", "Tahmini Maliyet (TL)", "Tarih"];
  const rows = completed.map(s => [
    s.district,
    s.city,
    s.latitude.toFixed(6),
    s.longitude.toFixed(6),
    s.accessibility_score,
    s.compliance_level,
    (s.issues || []).length,
    (s.issues || []).reduce((acc, i) => acc + (i.estimated_cost || 0), 0),
    new Date(s.created_at).toLocaleDateString("tr-TR"),
  ]);

  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `KentScan_Veri_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

export default function ReportsPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      loadStoredAuth();
      const [scansRes, statsRes] = await Promise.allSettled([listScans(1, 200), getStats()]);
      if (scansRes.status === "fulfilled") setScans(scansRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completedScans = scans.filter(s => s.status === "completed");
  const totalCost = completedScans.flatMap(s => s.issues || []).reduce((acc, i) => acc + (i.estimated_cost || 0), 0);
  const criticalScans = completedScans.filter(s => s.accessibility_score < 60);

  async function handleExportPDF() {
    setExporting(true);
    try { await generatePDF(scans, stats); }
    catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Raporlar</h1>
            <p className="text-slate-400 text-sm mt-0.5">5378 Sayılı Kanun uyumluluk analizi ve export</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => generateCSV(scans)}
              disabled={loading || completedScans.length === 0}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              ↓ CSV İndir
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading || exporting || completedScans.length === 0}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {exporting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Oluşturuluyor...</>
              ) : (
                <>↓ PDF Raporu İndir</>
              )}
            </button>
          </div>
        </div>

        {/* KVKK Notice */}
        <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-emerald-400 text-xl shrink-0">🛡️</span>
          <div>
            <p className="text-emerald-400 font-semibold text-sm">KVKK Uyum Bildirimi</p>
            <p className="text-slate-400 text-xs mt-1">
              Bu platformda yalnızca cansız kentsel objeler (rampa, kaldırım, çukur) analiz edilmektedir.
              Tüm Street View görüntüleri işlenmeden önce yüz ve plaka anonimleştirmesinden geçirilmektedir.
              Ham görüntüler sistemde saklanmamaktadır.
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Analiz Edilen</p>
              <p className="text-2xl font-black text-blue-400">{completedScans.length}</p>
              <p className="text-slate-600 text-xs">lokasyon</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Uyum Oranı</p>
              <p className="text-2xl font-black text-emerald-400">%{stats ? Math.round(stats.compliance_rate) : 0}</p>
              <p className="text-slate-600 text-xs">≥80 puan</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Kritik Alan</p>
              <p className="text-2xl font-black text-red-400">{criticalScans.length}</p>
              <p className="text-slate-600 text-xs">acil müdahale</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Tahmini Maliyet</p>
              <p className="text-2xl font-black text-amber-400">₺{totalCost > 0 ? `${(totalCost / 1000).toFixed(0)}K` : "0"}</p>
              <p className="text-slate-600 text-xs">toplam düzeltme</p>
            </div>
          </div>
        )}

        {/* Analytics */}
        {!loading && stats && (
          <AnalyticsCharts stats={stats} scans={completedScans} />
        )}

        {/* Critical Areas Table */}
        {!loading && criticalScans.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <h3 className="text-white font-bold">Acil Müdahale Gereken Alanlar</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Konum</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Skor</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Sorun Sayısı</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Tahmini Maliyet</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Eylem</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalScans.map((scan, i) => {
                    const cost = (scan.issues || []).reduce((acc, iss) => acc + (iss.estimated_cost || 0), 0);
                    return (
                      <tr key={scan.id} className={i % 2 === 0 ? "bg-slate-900" : "bg-slate-800/30"}>
                        <td className="px-4 py-3">
                          <p className="text-white font-semibold">{scan.district}</p>
                          <p className="text-slate-500 text-xs">{scan.city}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-red-400 font-black text-lg">{scan.accessibility_score}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{(scan.issues || []).length}</td>
                        <td className="px-4 py-3 text-amber-400 font-semibold">
                          {cost > 0 ? `₺${cost.toLocaleString("tr-TR")}` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <a href={`/scans/${scan.id}`} className="text-blue-400 hover:text-blue-300 text-xs font-medium">
                            Detay →
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-slate-900 rounded-2xl h-24 animate-pulse border border-slate-800" />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
