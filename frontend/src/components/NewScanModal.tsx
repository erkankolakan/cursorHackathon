"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    district?: string;
    county?: string;
    city?: string;
    town?: string;
    province?: string;
    state?: string;
  };
}

const CITY_PRESETS: Record<string, { district: string; city: string; latitude: number; longitude: number }[]> = {
  İstanbul: [
    { district: "Kadıköy", city: "İstanbul", latitude: 40.9833, longitude: 29.0333 },
    { district: "Beşiktaş", city: "İstanbul", latitude: 41.0422, longitude: 29.0078 },
    { district: "Şişli", city: "İstanbul", latitude: 41.0602, longitude: 28.9878 },
    { district: "Üsküdar", city: "İstanbul", latitude: 41.0231, longitude: 29.0152 },
    { district: "Fatih", city: "İstanbul", latitude: 41.0186, longitude: 28.9395 },
    { district: "Başakşehir", city: "İstanbul", latitude: 41.0865, longitude: 28.8017 },
    { district: "Ataşehir", city: "İstanbul", latitude: 40.9923, longitude: 29.1244 },
    { district: "Maltepe", city: "İstanbul", latitude: 40.9349, longitude: 29.1308 },
  ],
  Ankara: [
    { district: "Çankaya", city: "Ankara", latitude: 39.9055, longitude: 32.8635 },
    { district: "Keçiören", city: "Ankara", latitude: 39.9942, longitude: 32.8574 },
    { district: "Mamak", city: "Ankara", latitude: 39.9267, longitude: 32.9235 },
    { district: "Yenimahalle", city: "Ankara", latitude: 39.9667, longitude: 32.7667 },
    { district: "Etimesgut", city: "Ankara", latitude: 39.9499, longitude: 32.6748 },
    { district: "Altındağ", city: "Ankara", latitude: 39.9415, longitude: 32.8694 },
  ],
  İzmir: [
    { district: "Konak", city: "İzmir", latitude: 38.4189, longitude: 27.1287 },
    { district: "Karşıyaka", city: "İzmir", latitude: 38.4607, longitude: 27.1134 },
    { district: "Bornova", city: "İzmir", latitude: 38.4696, longitude: 27.2237 },
    { district: "Buca", city: "İzmir", latitude: 38.3834, longitude: 27.1793 },
    { district: "Bayraklı", city: "İzmir", latitude: 38.4621, longitude: 27.1701 },
  ],
  Bursa: [
    { district: "Osmangazi", city: "Bursa", latitude: 40.1826, longitude: 29.0669 },
    { district: "Nilüfer", city: "Bursa", latitude: 40.2087, longitude: 28.9724 },
    { district: "Yıldırım", city: "Bursa", latitude: 40.1908, longitude: 29.1237 },
  ],
  Antalya: [
    { district: "Muratpaşa", city: "Antalya", latitude: 36.8969, longitude: 30.7133 },
    { district: "Kepez", city: "Antalya", latitude: 36.9558, longitude: 30.7202 },
    { district: "Konyaaltı", city: "Antalya", latitude: 36.8737, longitude: 30.6475 },
  ],
};

interface NewScanModalProps {
  onClose: () => void;
  onSubmit: (data: { district: string; city: string; latitude: number; longitude: number; neighbourhood?: string }) => void;
  loading: boolean;
  error?: string;
}

export default function NewScanModal({ onClose, onSubmit, loading, error }: NewScanModalProps) {
  const [activeCity, setActiveCity] = useState<string>("İstanbul");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    district: "",
    city: "İstanbul",
    neighbourhood: "",
    latitude: "",
    longitude: "",
  });
  const [resolvedLocation, setResolvedLocation] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchNominatim = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + " Türkiye")}&format=json&countrycodes=tr&limit=8&addressdetails=1&accept-language=tr`,
        { headers: { "Accept-Language": "tr" } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    setResolvedLocation(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(val), 400);
  }

  function selectSuggestion(item: NominatimResult) {
    const addr = item.address;
    const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || "";
    const district = addr.district || addr.county || "";
    const city = addr.city || addr.town || addr.province || addr.state || "";

    setForm({
      district,
      city,
      neighbourhood,
      latitude: parseFloat(item.lat).toFixed(6),
      longitude: parseFloat(item.lon).toFixed(6),
    });

    const locationLabel = [neighbourhood, district, city].filter(Boolean).join(", ");
    setResolvedLocation(locationLabel);
    setSearchQuery(neighbourhood || district || city);
    setShowSuggestions(false);
  }

  function applyPreset(loc: { district: string; city: string; latitude: number; longitude: number }) {
    setForm({
      district: loc.district,
      city: loc.city,
      neighbourhood: "",
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
    });
    setResolvedLocation(`${loc.district}, ${loc.city}`);
    setSearchQuery(loc.district);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.latitude || !form.longitude) return;
    onSubmit({
      district: form.district,
      city: form.city,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      neighbourhood: form.neighbourhood || undefined,
    });
  }

  const isReady = form.latitude !== "" && form.longitude !== "";
  const presets = CITY_PRESETS[activeCity] ?? [];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Yeni Erişilebilirlik Taraması</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* --- KONUM ARAMA --- */}
        <div className="mb-5" ref={searchRef}>
          <label className="text-slate-300 text-sm font-medium mb-2 block">
            Mahalle veya İlçe Ara
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              🔍
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              placeholder="ör: Bağcılar, Moda mahallesi, Kızılay..."
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-xl">
                {suggestions.map((item) => {
                  const addr = item.address;
                  const primary = addr.neighbourhood || addr.suburb || addr.quarter || addr.district || addr.county;
                  const secondary = [addr.district || addr.county, addr.city || addr.town || addr.province]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <button
                      key={item.place_id}
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0"
                    >
                      <p className="text-white text-sm font-medium">{primary}</p>
                      <p className="text-slate-400 text-xs mt-0.5 truncate">{secondary}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {resolvedLocation && (
            <div className="mt-2 flex items-center gap-2 bg-green-950/40 border border-green-800/50 rounded-lg px-3 py-2">
              <span className="text-green-400 text-xs">✓</span>
              <span className="text-green-300 text-xs font-medium">{resolvedLocation}</span>
              {form.latitude && (
                <span className="text-green-600 text-xs ml-auto font-mono">
                  {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* --- HIZLI SEÇIM --- */}
        <div className="mb-5">
          <p className="text-slate-400 text-xs mb-2 font-medium">Hızlı Seçim — Popüler İlçeler</p>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {Object.keys(CITY_PRESETS).map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setActiveCity(city)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  activeCity === city
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((loc) => (
              <button
                key={loc.district}
                type="button"
                onClick={() => applyPreset(loc)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  form.district === loc.district && form.city === loc.city
                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400"
                }`}
              >
                {loc.district}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* --- GELİŞMİŞ AYARLAR --- */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              <span className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
              Gelişmiş — Manuel Koordinat / İlçe Bilgisi
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 pl-4 border-l border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Mahalle</label>
                    <input
                      value={form.neighbourhood}
                      onChange={(e) => setForm((f) => ({ ...f, neighbourhood: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Moda, Bağcılar..."
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">İlçe *</label>
                    <input
                      required
                      value={form.district}
                      onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Kadıköy"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Şehir *</label>
                    <input
                      required
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Enlem</label>
                    <input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="40.9833"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Boylam</label>
                    <input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="29.0333"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isReady && (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3 text-xs text-amber-400">
              Lütfen yukarıdan bir mahalle/ilçe arayın veya hızlı seçimden bir lokasyon seçin.
            </div>
          )}

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
            disabled={loading || !isReady}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Tarama başlatılıyor..." : "Taramayı Başlat"}
          </button>
        </form>
      </div>
    </div>
  );
}
