import { Agent, CursorAgentError } from "@cursor/sdk";
import type { AppConfig } from "./config.js";
import { log } from "./logger.js";

export interface TaskResult {
  /** Run'ın terminal durumu: "finished" başarı, "error" çalıştı ama başarısız. */
  status: string;
  /** Agent'ın son metinsel çıktısı. */
  text: string;
  /** Dashboard/inceleme için run kimliği. */
  runId: string;
}

/**
 * Tek bir kalıcı (durable) agent oturumunu sarmalar.
 *
 * Bilinçli tasarım kararları:
 * - Tek agent + birden çok `send`: görevler arası KONUŞMA BAĞLAMI korunur.
 *   Bot, önceki adımda ne yaptığını "hatırlar".
 * - `await using` ile kaynak sızdırmaz (alt process, HTTP client, run store).
 * - Başlatma hatası (CursorAgentError) ile çalışma hatası (status==="error")
 *   ayrı ele alınır — farklı sebep, farklı çözüm.
 */
export class AgentSession {
  private agent: Awaited<ReturnType<typeof Agent.create>> | null = null;

  constructor(private readonly config: AppConfig) {}

  /** Agent'ı oluşturur; başlatma hatalarında (retryable ise) geri çekilerek yeniden dener. */
  async init(maxAttempts = 3): Promise<void> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++;
      try {
        this.agent = await Agent.create({
          apiKey: this.config.apiKey,
          model: { id: this.config.model },
          // Runtime'ı HER ZAMAN explicit ver (yoksa sessizce local seçilir).
          local: {
            cwd: this.config.targetCwd,
            // Yalnızca inline config kullan; ortamdan ambient ayar yükleme.
            settingSources: [],
          },
        });
        log.success(`Agent hazır (agentId=${this.agent.agentId}, model=${this.config.model})`);
        return;
      } catch (err) {
        if (err instanceof CursorAgentError && err.isRetryable && attempt < maxAttempts) {
          const backoffMs = 1000 * attempt;
          log.warn(
            `Başlatma hatası (denenebilir): ${err.message}. ${backoffMs}ms sonra tekrar (${attempt}/${maxAttempts}).`,
          );
          await sleep(backoffMs);
          continue;
        }
        // Denenemez ya da deneme hakkı bitti: yukarı fırlat.
        throw err;
      }
    }
  }

  /**
   * Tek bir görevi agent'a gönderir, canlı çıktıyı stream eder, terminal sonucu bekler.
   * Bağlam korunur: aynı oturumda art arda çağrılabilir.
   */
  async runTask(prompt: string): Promise<TaskResult> {
    if (!this.agent) throw new Error("AgentSession.init() önce çağrılmalı.");

    const run = await this.agent.send(prompt);
    // ID'yi HEMEN logla — stream takılırsa inceleme için elimizde olsun.
    log.step(`Görev gönderildi (runId=${run.id})`);

    let collected = "";
    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text") {
            collected += block.text;
            log.stream(block.text);
          }
        }
      }
    }
    process.stdout.write("\n");

    // `wait()` olmadan run'ın gerçekten bittiğini bilemeyiz.
    const result = await run.wait();
    return {
      status: result.status,
      text: collected.trim() || (typeof result.result === "string" ? result.result : ""),
      runId: run.id,
    };
  }

  async dispose(): Promise<void> {
    if (this.agent) {
      await this.agent[Symbol.asyncDispose]();
      this.agent = null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
