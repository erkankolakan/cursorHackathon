# HackathonIstanbul — AGENTS.md

Bu dosya AI coding assistant'larının (Claude, Cursor, Copilot vb.) bu proje hakkında bağlam kazanmasına yardımcı olur.

## Proje Tanımı

**HackathonIstanbul** — Cursor Hackathon İstanbul 2026 için geliştirilen Expo mobil uygulaması.

## Teknoloji Stack

| Kategori | Teknoloji | Versiyon |
|----------|-----------|----------|
| Framework | Expo | ~56.0.9 |
| Navigasyon | Expo Router (dosya tabanlı) | ~56.2.9 |
| Dil | TypeScript | ~6.0.3 |
| UI | React Native | 0.85.3 |
| React | React | 19.2.3 |
| State | Zustand | latest |
| Animasyon | React Native Reanimated | 4.3.1 |
| Form | React Hook Form + Zod | latest |
| Storage | Expo SecureStore | latest |
| Build | EAS Build | latest |

## Klasör Yapısı

```
src/
├── app/           # Expo Router sayfaları (dosya tabanlı routing)
│   ├── (tabs)/    # Tab navigator ekranları
│   └── (auth)/    # Auth ekranları (modal)
├── components/
│   └── ui/        # Button, Card, Input gibi temel bileşenler
├── constants/     # Colors, Layout, Spacing design token'ları
├── hooks/         # useThemeColor, useColors, useIsDark
├── services/      # API service katmanı (api.ts)
├── store/         # Zustand store'ları (auth + ui)
├── types/         # TypeScript tip tanımları
└── utils/         # Helper fonksiyonlar
```

## Path Aliases

```
@/*        → ./src/*
@/assets/* → ./assets/*
```

## Kod Standartları

- TypeScript strict mode açık — any kullanma
- Fonksiyon bileşenleri kullan, class component yok
- React.FC kullanma — prop tiplerini direkt tanımla
- Named export tercih et
- console.log yerine console.warn / console.error kullan

## Komutlar

```bash
npm start          # Expo dev server başlat
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web browser
npm run lint       # ESLint kontrolü
npx expo-doctor    # Bağımlılık uyumluluk kontrolü
```

## Ortam Değişkenleri

EXPO_PUBLIC_API_URL=https://api.example.com
