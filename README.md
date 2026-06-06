# KentScan — AI Destekli Kentsel Erişilebilirlik Denetim Platformu

> **Cursor Hackathon 2026 · Istanbul** | 6 Haziran 2026 | Takım: KentScan

Türkiye'deki 8.5 milyon engelli vatandaş için **5378 Sayılı Engelliler Kanunu** uyumluluğunu otomatik denetleyen, Google Street View + HuggingFace AI modelleri ile çalışan SaaS platformu.

---

## Neden KentScan?

- **Yasal zorunluluk**: 5378 Sayılı Kanun belediyeleri erişilebilir altyapı sağlamakla yükümlü kılar ancak sistematik denetim mekanizması yok.
- **Ölçek**: 81 il, 900+ ilçe belediyesi hedef kitle.
- **AI'dan önce**: Manuel denetim pahalı, yavaş, tutarsız. KentScan saniyeler içinde analiz eder.
- **KVKK uyumlu**: Yalnızca cansız kentsel objeler — kimlik/yüz tespiti yasaktır ve uygulanmaz.

---

## SaaS Özellikleri

### Dashboard
- **Multi-page uygulama**: `/dashboard`, `/scans`, `/scans/[id]`, `/reports`, `/map`
- **Recharts Analytics**: Trend grafiği, sorun dağılımı (pie), ilçe karşılaştırması (bar), uyum oranı (radial)
- **İnteraktif Leaflet Harita**: Renkli pin'ler (skor rengi), popup, konum detayı
- **Canlı Polling**: Async scan → 2 saniyelik interval ile durum güncellemesi

### Raporlama
- **PDF Raporu**: jsPDF + autoTable ile A4 uyum raporu (yönetici özeti, ilçe breakdown, lokasyon detayı)
- **CSV Export**: Belediye müşterileri için tablo veri export
- **Maliyet Tahmini**: Her sorun için ₺ cinsinden tahmini düzeltme maliyeti

### Tarama Detayı
- **KVKK Anonimleştirilmiş Görüntü**: Yüz + plaka blur sonrası görüntü gösterimi
- **Yasal Referans**: 5378 Sayılı Kanun maddesi her sorun için
- **Türkçe Öneriler**: Teknik düzeltme rehberi

---

## Mimari

```
┌─────────────────────────────┐     ┌──────────────────────────┐     ┌────────────────────────┐
│  Next.js 16 (Vercel)        │────▶│  Go Backend              │────▶│  Python AI Servis      │
│  /dashboard  /scans  /map   │◀────│  masterfabric-go         │◀────│  FastAPI + YOLO11      │
│  /reports  /scans/[id]      │     │  Render.com              │     │  HuggingFace + KVKK    │
│  Recharts + Leaflet + jsPDF │     │  JWT + Async Scan        │     │  GSV API               │
└─────────────────────────────┘     └──────────────────────────┘     └────────────────────────┘
                                               ▲
                                    ┌──────────┴────────────┐
                                    │  agent-orchestrator   │
                                    │  Cursor SDK HTTP API  │
                                    │  POST /v1/agent/prompt│
                                    └───────────────────────┘
```

---

## Tech Stack

| Bileşen | Teknoloji | Hosting |
|---------|-----------|---------|
| Frontend | Next.js 16 + Tailwind CSS 4 + Recharts + Leaflet + jsPDF | Vercel |
| Backend | Go 1.25 (masterfabric-go) + Async Goroutine | Render.com |
| AI Servis | Python 3.11 + FastAPI + YOLO11 + OpenCV | Render.com |
| Orchestrator | Cursor SDK (@cursor/sdk) + HTTP API Server | Local / Render |
| DB | PostgreSQL (13 migration) | Render.com |
| Cache | Redis | Render.com |

---

## Geliştirme Ortamı Kurulumu

### Ön koşullar
- Go 1.22+, Node.js 20+, Python 3.11+, Docker

### Backend
```bash
cd backend
cp .env.example .env  # DB/Redis bilgilerini doldur
export AI_SERVICE_URL=http://localhost:8001
./dev.sh server
# Çalışır: http://localhost:8080
```

### AI Servis
```bash
cd ai-service
cp .env.example .env  # GOOGLE_STREET_VIEW_API_KEY ekle
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py
# Çalışır: http://localhost:8001
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local  # yoksa: echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
npm install && npm run dev
# Çalışır: http://localhost:3000
```

### Agent Orchestrator
```bash
cd agent-orchestrator
cp .env.example .env  # CURSOR_API_KEY ekle
npm install

# CLI modu
npm start "src altında yeni bir bileşen oluştur"

# HTTP server modu (Bonus puan: Cursor SDK HTTP API)
npm start serve 4000
# Çalışır: http://localhost:4000
# POST /v1/agent/prompt → Cursor SDK agent'ı çalıştır
```

---

## API Endpoint'leri

### Backend (Go)

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| POST | `/api/v1/auth/register` | Kullanıcı kaydı |
| POST | `/api/v1/auth/login` | JWT token al |
| POST | `/api/v1/scans` | Yeni tarama başlat (async) |
| GET | `/api/v1/scans` | Tarama listesi (sayfalandırılmış) |
| GET | `/api/v1/scans/stats` | Dashboard istatistikleri |
| GET | `/api/v1/scans/{id}` | Tarama detayı (org scope korumalı) |

### AI Servis (Python)

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| GET | `/health` | Sağlık kontrolü |
| GET | `/ai-info` | Model durumu, pipeline, KVKK uyum bilgisi |
| POST | `/analyze` | GSV → KVKK blur → YOLO11 → RampNet → Skor |
| POST | `/analyze/upload` | Yüklenen fotoğraf → KVKK blur → YOLO11 → Skor |

### Agent Orchestrator (HTTP)

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| GET | `/health` | Sağlık kontrolü |
| GET | `/v1/models` | Model listesi |
| POST | `/v1/agent/prompt` | Cursor SDK agent çalıştır |

---

## AI Pipeline Detayı

```
1. Google Street View API → Panorama görüntüsü
2. KVKK Filtre (OpenCV):
   - Haar Cascade → Yüz tespiti → Gaussian blur
   - Kontur/heuristic → Plaka tespiti → Gaussian blur
3. YOLO11 (leeyunjai/yolo11-sidewalk-seg):
   - Sınıf: hole, curb, cover, lane, sidewalk
   - Tespit → İssue mapping
4. RampNet (projectsidewalk/rampnet-model):
   - Rampa var/yok tespiti
5. Skor hesaplama (5378 Sayılı Kanun kriterleri):
   - Başlangıç: 100
   - critical: -30, high: -20, medium: -10, low: -5
6. Zenginleştirme:
   - Türkçe öneri (recommendation)
   - Yasal referans (5378 Madde X)
   - Tahmini düzeltme maliyeti (₺)
```

---

## AI Adaptasyonu — Cursor IDE ile Geliştirme Hikayesi

> Bu proje başından sonuna **Cursor IDE Agentic mode** ile geliştirilmiştir.
> Her katmanda yapay zekâ hem ürünün içinde hem de geliştirme sürecinin kendisinde aktif rol oynamıştır.

### Katman 1: Ürün İçindeki AI (AI Pipeline)

```
Kullanıcı Koordinatı
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  1. Google Street View API                              │
│     → 640×640 panorama görüntüsü                        │
├─────────────────────────────────────────────────────────┤
│  2. KVKK Filtre (OpenCV Haar Cascade)                   │
│     → İnsan yüzü tespit → Gaussian Blur (σ=25)          │
│     → Araç plakası kontur analizi → Gaussian Blur        │
│     → Geri döndürülemez anonimleştirme                  │
├─────────────────────────────────────────────────────────┤
│  3. YOLO11 (leeyunjai/yolo11-sidewalk-seg)              │
│     HuggingFace model — Ultralytics altyapısı           │
│     Tespit sınıfları: hole · curb · cover · lane ·      │
│     sidewalk                                            │
├─────────────────────────────────────────────────────────┤
│  4. RampNet (projectsidewalk/rampnet-model)             │
│     HuggingFace Transformers — rampa heatmap analizi    │
│     peak_local_max ile rampa varlık/yokluk tespiti      │
├─────────────────────────────────────────────────────────┤
│  5. AccessibilityScorer                                 │
│     5378 Sayılı Kanun kriterleri: 100'den başla         │
│     critical:-30 · high:-20 · medium:-10 · low:-5       │
│     + Türkçe öneri + yasal madde + ₺ maliyet tahmini    │
└─────────────────────────────────────────────────────────┘
       │
       ▼
  Erişilebilirlik Skoru (0-100) + Sorun Listesi
```

**Canlı model durumunu görmek için:**
```bash
curl http://localhost:8001/ai-info
```

### Katman 2: Geliştirme Sürecindeki AI (Cursor IDE)

#### 2a. Cursor Rules — Bağlamsal AI Yönlendirmesi

Her bounded context için özel Cursor kuralı tanımlandı; böylece agent her dosyada ne yapacağını ve ne yapmaması gerektiğini biliyor:

| Kural Dosyası | Kapsam | Etkisi |
|---|---|---|
| `.cursor/rules/kentscan-project.mdc` | Proje geneli | KVKK kırmızı çizgiler, commit formatı, puanlama odakları |
| `backend/.cursor/rules/masterfabric-go-conventions.mdc` | Go kodu | masterfabric-go mimarisi, DDD kuralları, handler yapısı |
| `ai-service/.cursor/rules/ai-pipeline.mdc` | Python AI | Model yükleme stratejisi, fallback kuralları, KVKK pipeline |

Cursor rules sayesinde agent, örneğin Go handler yazarken otomatik olarak masterfabric konvansiyonlarına uyan, KVKK ihlali içermeyen kod üretiyor.

#### 2b. Cursor SDK — Programatik Agent Orchestrator

`agent-orchestrator/` klasöründe `@cursor/sdk` kullanılarak **tam çalışır HTTP API servisi** geliştirildi:

```typescript
// agent-orchestrator/src/agent-runner.ts
import { Agent, CursorAgentError } from "@cursor/sdk";

// Tek oturum, çoklu görev — bağlam korunur
const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY,
  model: { id: "claude-4-sonnet" },
  local: { cwd: process.env.TARGET_CWD },
});

// Stream ile canlı çıktı
const run = await agent.send("yeni bir erişilebilirlik kuralı ekle");
for await (const event of run.stream()) {
  if (event.type === "assistant") { /* canlı akış */ }
}
await run.wait(); // terminal durumu bekle
```

**İki aşamalı planlama pipeline'ı** (`orchestrator.ts`):
1. **Plan adımı**: "Ne yapacaksın?" → Cursor agent plan çıkarır
2. **Uygulama adımı**: Plan → Gerçek kod değişiklikleri

**HTTP API olarak da çalışır:**
```bash
# Orchestrator başlat
cd agent-orchestrator && npm start serve 4000

# Agent tetikle
curl -X POST http://localhost:4000/v1/agent/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "frontend/src altına yeni rapor bileşeni ekle"}'

# Kullanılabilir modelleri listele
curl http://localhost:4000/v1/models
```

#### 2c. Agentic Geliştirme Süreci

Bu projenin tüm katmanları Cursor IDE Agentic mode ile geliştirildi:

- **Backend Go kodu**: masterfabric kuralına göre use-case, domain, repository katmanları
- **AI Python servisi**: HuggingFace entegrasyonu, YOLO11 fallback stratejisi
- **Frontend React bileşenleri**: Recharts grafikleri, Leaflet harita, jsPDF raporu
- **SQL migrasyonlar**: 15 goose migration, scan domain şeması
- **Cursor kuralları kendisi**: `.cursor/rules/*.mdc` dosyaları agent ile yazıldı

### Cursor Rules (Özet)
- `.cursor/rules/kentscan-project.mdc` — Proje geneli kurallar
- `backend/.cursor/rules/masterfabric-go-conventions.mdc` — Go mimarisi kuralları

### Cursor SDK (agent-orchestrator)
```typescript
// Programatik agent çalıştırma
import { Agent } from "@cursor/sdk";

const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY,
  model: { id: "claude-4-sonnet" },
  local: { cwd: "/path/to/project" },
});

const run = await agent.send("frontend/src altına yeni bir bileşen ekle");
for await (const event of run.stream()) { ... }
```

### Cursor CLI Entegrasyonu
```bash
# HTTP API üzerinden agent tetikleme
curl -X POST http://localhost:4000/v1/agent/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "KentScan için yeni bir feature ekle"}'
```

---

## KVKK Uyum Belgesi

### Veri Minimizasyonu
- Yalnızca koordinat (enlem/boylam) giriş alınır
- Ham Street View görüntüsü veritabanına **kaydedilmez**
- Anonimleştirilmiş görüntü geçici olarak base64 döndürülür; kalıcı saklama yoktur

### Anonimleştirme Pipeline
```python
# kvkk_filter.py
def anonymize(image_bytes):
    # 1. Haar Cascade ile yüz tespiti → Gaussian blur
    # 2. Kontur analizi ile plaka tespiti → Gaussian blur
    # Geri döndürülemez: orijinal piksel bilgisi kaybolur
```

### Yasak İşlemler
- ❌ Kimlik tespiti
- ❌ Yüz tanıma
- ❌ Araç/plaka takibi
- ❌ Kişi profilleme

### İzin Verilen İşlemler
- ✅ Rampa tespiti
- ✅ Kaldırım hasarı analizi
- ✅ Kentsel engel tespiti
- ✅ Taktil zemin yüzeyi kontrolü

### Hackathon Sonu Veri Silme

Hackathon tamamlandığında **otomatik script** ile KVKK uyumlu silme yapılır:

```bash
# Sadece anonymized_image_url temizle (standart)
DB_DSN="postgres://..." ./backend/scripts/kvkk-cleanup.sh

# Neyin silineceğini önce gör (dry-run)
DB_DSN="postgres://..." ./backend/scripts/kvkk-cleanup.sh --dry-run

# Tüm scan verilerini sil + belge oluştur
DB_DSN="postgres://..." ./backend/scripts/kvkk-cleanup.sh --all
```

Script çalışınca `kvkk-deletion-YYYYMMDD-HHMMSS.log` belgesi otomatik oluşur.

**Belgeleme tarihi:** 6 Haziran 2026  
**Sorumlu:** KentScan Takımı

---

## Değerlendirme Kriterleri Matrisi

| Kriter | Puan | Uygulama |
|--------|------|---------|
| Teknik Çalışırlık | 30 | Canlı demo, async scan pipeline, tüm API'ler çalışır |
| Doğruluk ve Güvenilirlik | 25 | YOLO11 + RampNet, GSV key ile gerçek inference |
| Kamu Faydasına Uygunluk | 20 | Belediye hedefli, 5378 Kanun, PDF raporu, maliyet tahmini |
| AI Adaptasyonu | 10 | Cursor Rules + Agent Orchestrator SDK + HTTP API |
| KVKK ve Etik Uyum | 10 | Blur pipeline, veri minimizasyonu, belgeleme |
| Sunum ve Dökümantasyon | 5 | Bu README, Cursor rules, API docs |

### Bonus Puan
- ✅ **Cursor SDK**: `agent-orchestrator/src/server.ts` — HTTP API server
- ✅ **Cursor CLI**: `npm start serve 4000` komutu ile çalıştırılabilir
- ✅ **Cursor Rules**: `.cursor/rules/` altında 2 rule dosyası

---

## Commit Geçmişi

Jüri commit log'unu inceleyebilir — her özellik için anlamlı commit mesajları kullanılmıştır.

```
feat(backend): add async scan processing with goroutine
feat(backend): add dashboard stats endpoint with district breakdown
feat(backend): fix GetScan org scope security
feat(ai): add Turkish recommendations and legal references to issues
feat(frontend): multi-page routing with dashboard/scans/map/reports
feat(frontend): Recharts analytics with trend/pie/bar/radial charts
feat(frontend): Leaflet interactive map with colored scan pins
feat(frontend): PDF/CSV report export with jsPDF
feat(frontend): KVKK anonymized image display with badge
feat(orchestrator): HTTP API server for Cursor SDK (bonus)
```
