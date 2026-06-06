import { Cursor, CursorAgentError } from "@cursor/sdk";
import { loadConfig, type AppConfig } from "./config.js";
import { AgentSession } from "./agent-runner.js";
import { buildPlan, executePlan } from "./orchestrator.js";
import { log } from "./logger.js";
import { startServer } from "./server.js";

/**
 * Exit kod sözleşmesi (CI dostu):
 *   0 = başarı
 *   1 = başlatma hatası (CursorAgentError: auth/config/network) / beklenmeyen
 *   2 = çalışma hatası (run başladı ama status === "error")
 *   3 = kullanım hatası
 */

interface ParsedArgs {
  command: string;
  prompt: string;
  cwd?: string;
  model?: string;
  planOnly: boolean;
  noPlan: boolean;
}

const HELP = `
Agent Orchestrator — Cursor SDK CLI

Kullanım:
  npm start <prompt>              Görevi planla ve uygula
  npm start run <prompt>          (yukarıdakiyle aynı)
  npm start models                Erişilebilir modelleri listele
  npm start serve [port]          HTTP API server başlat (varsayılan: 4000)
  npm start help                  Bu yardımı göster

Seçenekler:
  --cwd <yol>      Agent'ın çalışacağı klasör (TARGET_CWD'yi geçersiz kılar)
  --model <id>     Kullanılacak model (CURSOR_MODEL'i geçersiz kılar)
  --plan-only      Sadece planı üret, uygulama yapma
  --no-plan        Planlama yapma; promptu doğrudan tek görev olarak çalıştır

Örnekler:
  npm start "src altında bir toplama(a,b) fonksiyonu olan math.ts oluştur"
  npm start --no-plan "README.md'ye kurulum bölümü ekle"
  npm start --plan-only "kullanıcı kimlik doğrulama akışı ekle"
  npm start --cwd ../mobile "ana ekrana karanlık mod düğmesi ekle"
`.trim();

/** Argümanları komut + prompt + seçeneklere ayırır. */
function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const opts: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--plan-only") opts.planOnly = true;
    else if (arg === "--no-plan") opts.noPlan = true;
    else if (arg === "--cwd") opts.cwd = argv[++i] ?? "";
    else if (arg === "--model") opts.model = argv[++i] ?? "";
    else positional.push(arg);
  }

  const known = new Set(["run", "models", "help", "serve"]);
  let command = "run";
  if (positional[0] && known.has(positional[0])) {
    command = positional.shift()!;
  }

  return {
    command,
    prompt: positional.join(" ").trim(),
    cwd: typeof opts.cwd === "string" ? opts.cwd : undefined,
    model: typeof opts.model === "string" ? opts.model : undefined,
    planOnly: opts.planOnly === true,
    noPlan: opts.noPlan === true,
  };
}

/** CLI seçeneklerini config üzerine uygular. */
function applyOverrides(config: AppConfig, args: ParsedArgs): AppConfig {
  return {
    ...config,
    model: args.model || config.model,
    targetCwd: args.cwd ? resolveCwd(args.cwd) : config.targetCwd,
  };
}

function resolveCwd(p: string): string {
  return p.startsWith("/") ? p : new URL(p, `file://${process.cwd()}/`).pathname;
}

async function cmdModels(config: AppConfig): Promise<number> {
  const models = await Cursor.models.list({ apiKey: config.apiKey });
  log.info("Erişilebilir modeller:");
  for (const m of models) console.log(`  - ${typeof m === "string" ? m : m.id}`);
  return 0;
}

async function cmdRun(config: AppConfig, args: ParsedArgs): Promise<number> {
  log.info(`Hedef klasör: ${config.targetCwd}`);
  log.info(`Model: ${config.model}`);

  // `await using` dispose'u garantiler — kaynak sızdırmaz.
  await using guard = {
    session: new AgentSession(config),
    async [Symbol.asyncDispose]() {
      await this.session.dispose();
    },
  };
  await guard.session.init();

  // --no-plan: planlama yok, prompt doğrudan tek görev.
  if (args.noPlan) {
    const result = await guard.session.runTask(args.prompt);
    log.info("─".repeat(40));
    if (result.status !== "finished") {
      log.error(`Görev başarısız (status=${result.status}).`);
      return 2;
    }
    log.success("Görev tamamlandı.");
    return 0;
  }

  const steps = await buildPlan(guard.session, args.prompt);

  // --plan-only: planı göster, uygulama.
  if (args.planOnly) {
    log.success("Sadece plan istendi; uygulama yapılmadı.");
    return 0;
  }

  const outcomes = await executePlan(guard.session, steps);

  log.info("─".repeat(40));
  let failed = false;
  for (const o of outcomes) {
    const ok = o.result.status === "finished";
    failed = failed || !ok;
    log.info(`${ok ? "✓" : "✗"} Adım ${o.step.id}: ${o.step.title} (${o.result.status})`);
  }
  if (failed) {
    log.error("Pipeline bir adımda başarısız oldu.");
    return 2;
  }
  log.success("Tüm adımlar tamamlandı.");
  return 0;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "help") {
    console.log(HELP);
    return 0;
  }

  // HTTP server mode: npm start serve [port]
  if (args.command === "serve") {
    const port = parseInt(args.prompt || "4000", 10) || 4000;
    await startServer(port);
    return 0;
  }

  const config = applyOverrides(loadConfig(), args);

  if (args.command === "models") {
    return cmdModels(config);
  }

  // command === "run"
  if (!args.prompt) {
    log.error("Bir prompt vermelisin.");
    console.log("\n" + HELP);
    return 3;
  }
  return cmdRun(config, args);
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    if (err instanceof CursorAgentError) {
      log.error(`Başlatma hatası: ${err.message} (retryable=${err.isRetryable})`);
      process.exit(1);
    }
    log.error(`Beklenmeyen hata: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
