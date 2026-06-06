# Agent Orchestrator (Cursor SDK)

Kullanıcının yüksek seviye isteğini alır, bir Cursor agent'ına **plana** böldürür ve
her adımı aynı oturumda (bağlam korunarak) uygulatır. Standalone Node.js/TypeScript.

## Mimari

```
kullanıcı isteği
   │
   ▼
cli.ts ──► config (env + doğrulama)
   │
   ▼
AgentSession  ──(Agent.create + send + stream + wait)──►  Cursor Agent (local runtime)
   │
   ▼
orchestrator
   ├─ buildPlan()    : isteği JSON adım listesine böler   (1. aşama)
   └─ executePlan()  : her adımı sırayla uygular          (2. aşama)
```

Tek bir **kalıcı (durable) agent** kullanılır → adımlar arası konuşma bağlamı korunur,
yani bot önceki adımda ne yaptığını hatırlar.

## Kurulum

```bash
cd agent-orchestrator
npm install
cp .env.example .env   # CURSOR_API_KEY değerini gir
```

API anahtarı: https://cursor.com/dashboard/integrations

## Kullanım

```bash
npm start <prompt>           # görevi planla ve uygula
npm start run <prompt>       # (aynısı)
npm start models             # erişilebilir modelleri listele
npm start help               # yardım
```

Seçenekler:

| Seçenek         | Açıklama                                              |
| --------------- | ---------------------------------------------------- |
| `--cwd <yol>`   | Agent'ın çalışacağı klasör (`TARGET_CWD`'yi ezer)    |
| `--model <id>`  | Kullanılacak model (`CURSOR_MODEL`'i ezer)           |
| `--plan-only`   | Sadece planı üret, uygulama yapma                    |
| `--no-plan`     | Planlama yapma; promptu doğrudan tek görev çalıştır  |

Örnekler:

```bash
npm start "src altında toplama(a,b) olan bir math.ts oluştur"
npm start --no-plan "README.md'ye kurulum bölümü ekle"
npm start --plan-only "kullanıcı kimlik doğrulama akışı ekle"
npm start --cwd ../mobile "ana ekrana karanlık mod düğmesi ekle"
```

## Tasarım kararları (senior notlar)

- **Runtime explicit**: her zaman `local` verilir, yoksa SDK sessizce local seçer.
- **İki hata türü ayrı**: `CursorAgentError` (başlamadı → exit 1) vs `status==="error"`
  (başladı, başarısız → exit 2).
- **Her zaman dispose**: `await using` ile kaynak sızdırılmaz.
- **`wait()` zorunlu**: stream opsiyonel ama terminal sonuç için şart.
- **`runId` hemen loglanır**: takılma durumunda inceleme için.
- **Retry yalnızca `isRetryable` ise**: kör retry'dan kaçınılır.

## Çalışma akışı

1. **Planlama** (`buildPlan`): istek, JSON adım listesine böldürülür.
2. **Uygulama** (`executePlan`): her adım aynı oturumda sırayla uygulanır;
   bağlam korunduğu için bot önceki adımları hatırlar.

`--no-plan` ile tek adımlık işlerde planlama atlanır.
