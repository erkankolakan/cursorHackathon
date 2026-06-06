# KentScan — AI Destekli Kentsel Erişilebilirlik Denetim Platformu

> **Cursor Hackathon 2026 · Istanbul** | Takım: KentScan

Türkiye'deki 8.5 milyon engelli vatandaş için **5378 Sayılı Engelliler Kanunu** uyumluluğunu otomatik denetleyen, Google Street View + HuggingFace AI modelleri ile çalışan kurumsal bir platform.

---

## Neden KentScan?

- **Yasal zorunluluk**: 5378 Sayılı Engelliler Kanunu belediyeleri erişilebilir altyapı sağlamakla yükümlü kılar ancak sistematik denetim mekanizması yok.
- **Ölçek**: 81 il, 900+ ilçe belediyesi direkt hedef kitle.
- **Mevcut çözüm yok**: Manuel denetim pahalı, yavaş ve tutarsız.
- **KVKK uyumlu**: Yalnızca cansız kentsel objeler — kimlik/yüz tespiti yok.

---

## Mimari

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Next.js        │────▶│  Go Backend          │────▶│  Python AI Servis    │
│  (Vercel)       │◀────│  masterfabric-go     │◀────│  FastAPI             │
│  Belediye       │     │  (Render.com)        │     │  HuggingFace Models  │
│  Dashboard      │     │  scan domain         │     │  GSV API + KVKK Blur │
└─────────────────┘     └─────────────────────┘     └──────────────────────┘
                                   ▲
                         ┌─────────┴────────┐
                         │  Expo Mobile     │
                         │  Saha Doğrulama  │
                         └──────────────────┘
                                   ▲
                         ┌─────────┴────────┐
                         │  agent-orchestrator │
                         │  Cursor SDK       │
                         └──────────────────┘
```

---

## Tech Stack

| Bileşen | Teknoloji | Hosting |
|---------|-----------|---------|
| Frontend | Next.js 14 + Tailwind CSS | Vercel |
| Backend | Go 1.25 (masterfabric-go) | Render.com |
| AI Servis | Python 3.11 + FastAPI | Render.com |
| Mobile | Expo 56 (React Native) | — |
| Orchestrator | Cursor SDK (@cursor/sdk) | Local |
| DB | PostgreSQL | Render.com |
| Cache | Redis | Render.com |

---

## HuggingFace Modelleri

| Model | Kullanım |
|-------|----------|
| [`leeyunjai/yolo11-sidewalk-seg`](https://huggingface.co/leeyunjai/yolo11-sidewalk-seg) | curb, hole, sidewalk, cover, lane tespiti |
| [`projectsidewalk/rampnet-model`](https://huggingface.co/projectsidewalk/rampnet-model) | Rampa varlığı/yokluğu (210K+ GSV panoraması ile eğitilmiş) |
| [`ayoubkirouane/Segments-Sidewalk-SegFormer-B0`](https://huggingface.co/ayoubkirouane/Segments-Sidewalk-SegFormer-B0) | Semantik segmentasyon (yedek) |

---

## Erişilebilirlik Skoru (0-100)

| Kriter | Puan |
|--------|------|
| Rampa mevcut ve işlevsel | +30 |
| Kaldırım hasarsız | +25 |
| Engel yok | +20 |
| Hissedilebilir zemin yüzeyi | +15 |
| Yeterli kaldırım kapsama | +10 |

- **≥80**: Uyumlu
- **60-79**: İyileştirme Gerekli
- **<60**: Kritik

---

## KVKK Uyumluluk

```
Ham Görüntü
    │
    ▼
KVKKFilter.anonymize()   ← ZORUNLU, model öncesi
    │  ├── Yüz tespiti (Haar Cascade) → Gaussian Blur
    │  └── Plaka tespiti (Kontur analizi) → Gaussian Blur
    │
    ▼
Anonimleştirilmiş Görüntü → AI Modeli
    │
    ▼
Sadece tespit sonuçları persist edilir
Ham görüntü HİÇBİR ZAMAN DB'ye yazılmaz
```

**Hackathon sonunda**: Tüm ham GSV görüntüleri kalıcı olarak silinecek ve belgelenecektir.

---

## Kurulum

### Backend (Go)

```bash
cd backend
cp .env.example .env   # DB, Redis bağlantılarını doldur
./dev.sh               # Hot-reload geliştirme
```

### AI Servis (Python)

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env   # GOOGLE_STREET_VIEW_API_KEY ekle
uvicorn main:app --host 0.0.0.0 --port 8001
```

GSV API anahtarı olmadan **demo modu** otomatik aktif olur.

### Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL ayarla
npm run dev
```

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

### Agent Orchestrator (Cursor SDK)

```bash
cd agent-orchestrator
npm install
cp .env.example .env   # CURSOR_API_KEY ekle
npm start "KentScan backend scan domain için yeni bir özellik ekle"
```

---

## Cursor IDE Entegrasyonu

### Agentic Ruleset

Projenin her bileşeninde `.cursor/rules/` dizini altında Cursor rules tanımlanmıştır:

| Rule Dosyası | Kapsam |
|-------------|--------|
| `.cursor/rules/kentscan-project.mdc` | Proje geneli |
| `backend/.cursor/rules/scan-domain.mdc` | Go scan domain kuralları |
| `frontend/.cursor/rules/next-conventions.mdc` | Next.js bileşen standartları |
| `ai-service/.cursor/rules/ai-pipeline.mdc` | AI pipeline + KVKK kuralları |

### Cursor SDK (Bonus Puan)

`agent-orchestrator/` klasöründe `@cursor/sdk` paketi kullanılarak bir geliştirme otomasyonu oluşturulmuştur:

```typescript
// agent-orchestrator/src/agent-runner.ts
import { Agent } from "@cursor/sdk";

// Cursor Agent ile multi-step geliştirme otomasyonu:
// 1. buildPlan() — görevi alt adımlara böler
// 2. executePlan() — her adımı agentic olarak uygular
```

Kullanım:
```bash
cd agent-orchestrator
npm start "scan domain için rate limiting ekle"
npm start -- --plan-only "yeni bir feature planla"
```

### Kullanılan AI Araçları

- **Cursor Agent Mode**: Scan domain bounded context tüm dosyaları Cursor Agent ile oluşturuldu.
- **Cursor Chat (Claude Sonnet 4.6)**: KVKK pipeline ve HuggingFace model entegrasyonu için prompt mühendisliği.
- **Cursor Tab Completion**: Go repository pattern ve Python async kod tamamlama.
- **Cursor Rules**: Her bileşen için özelleştirilmiş ruleset ile tutarlı kod kalitesi.

---

## API Referansı

### Scan Endpoints

```
POST /api/v1/scans
  Body: { district, city, latitude, longitude }
  Header: Authorization: Bearer <token>
  Header: X-Organization-ID: <uuid>
  → Tarama başlatır, AI analizi yapar, sonuç döndürür.

GET  /api/v1/scans
  → Organizasyonun tüm taramalarını döndürür (sayfalı).

GET  /api/v1/scans/{id}
  → Tekil tarama detayı.
```

### AI Servis

```
POST /analyze
  Body: { latitude: float, longitude: float }
  → { accessibility_score, issues, street_view_url, anonymized_image_url }
```

---

## Deployment

- **Frontend**: `cd frontend && vercel deploy`
- **Backend + AI**: Render.com'da her iki servis için ayrı Web Service tanımı.
- **Ortam Değişkenleri**: `.env.example` dosyaları her bileşende mevcut.

---

## Lisans

MIT — Kamu yararına açık kaynak.
