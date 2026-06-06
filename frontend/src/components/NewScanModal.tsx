"use client";

import { useState } from "react";

const ISTANBUL_LOCATIONS = [
  { district: "Kadıköy", city: "İstanbul", latitude: 40.9833, longitude: 29.0333 },
  { district: "Beşiktaş", city: "İstanbul", latitude: 41.0422, longitude: 29.0078 },
  { district: "Şişli", city: "İstanbul", latitude: 41.0602, longitude: 28.9878 },
  { district: "Üsküdar", city: "İstanbul", latitude: 41.0231, longitude: 29.0152 },
  { district: "Fatih", city: "İstanbul", latitude: 41.0186, longitude: 28.9395 },
  { district: "Başakşehir", city: "İstanbul", latitude: 41.0865, longitude: 28.8017 },
];

interface NewScanModalProps {
  onClose: () => void;
  onSubmit: (data: { district: string; city: string; latitude: number; longitude: number }) => void;
  loading: boolean;
  error?: string;
}

export default function NewScanModal({ onClose, onSubmit, loading, error }: NewScanModalProps) {
  const [form, setForm] = useState({
    district: "",
    city: "İstanbul",
    latitude: "",
    longitude: "",
  });

  function applyPreset(loc: typeof ISTANBUL_LOCATIONS[0]) {
    setForm({ district: loc.district, city: loc.city, latitude: String(loc.latitude), longitude: String(loc.longitude) });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      district: form.district,
      city: form.city,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Yeni Erişilebilirlik Taraması</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>

        <div className="mb-4">
          <p className="text-slate-400 text-xs mb-2">Hızlı Seçim — İstanbul İlçeleri</p>
          <div className="flex flex-wrap gap-2">
            {ISTANBUL_LOCATIONS.map(loc => (
              <button
                key={loc.district}
                onClick={() => applyPreset(loc)}
                className="text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
              >
                {loc.district}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">İlçe *</label>
              <input
                required
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Kadıköy"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Şehir *</label>
              <input
                required
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Enlem *</label>
              <input
                required
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="40.9833"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Boylam *</label>
              <input
                required
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="29.0333"
              />
            </div>
          </div>

          <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-3 text-xs text-blue-300">
            <strong>KVKK Uyarısı:</strong> AI analizi sırasında görüntülerdeki tüm yüzler ve araç plakaları geri döndürülemez biçimde anonimleştirilecektir.
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "AI analizi yapılıyor... (60-90 sn)" : "Taramayı Başlat"}
          </button>
        </form>
      </div>
    </div>
  );
}
