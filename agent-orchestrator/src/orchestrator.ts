import { AgentSession, type TaskResult } from "./agent-runner.js";
import { log } from "./logger.js";

export interface PlanStep {
  id: number;
  title: string;
  detail: string;
}

export interface StepOutcome {
  step: PlanStep;
  result: TaskResult;
}

/**
 * Agent'ın ürettiği serbest metinden JSON bloğunu güvenli biçimde çıkarır
 * (```json ... ``` çitlerini ve etrafındaki açıklamayı temizler).
 */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Plan çıktısında geçerli bir JSON dizisi bulunamadı.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * 1. AŞAMA — Planlama.
 * Kullanıcının yüksek seviye isteğini, agent'a uygulanabilir adımlara böldürür.
 * Bot kendi planını çıkarır; biz onu yapılandırılmış adımlara çeviririz.
 */
export async function buildPlan(
  session: AgentSession,
  userRequest: string,
): Promise<PlanStep[]> {
  log.step("Planlama aşaması: istek adımlara bölünüyor...");

  const prompt = [
    "Sana bir yazılım görevi vereceğim. Henüz HİÇBİR DOSYAYI DEĞİŞTİRME.",
    "Bunun yerine görevi, sırayla uygulanabilir küçük adımlara böl.",
    "Yanıtı SADECE şu şemada bir JSON dizisi olarak ver, başka hiçbir metin ekleme:",
    '[{"id": 1, "title": "kısa başlık", "detail": "adımda tam olarak ne yapılacağı"}]',
    "",
    `Görev: ${userRequest}`,
  ].join("\n");

  const result = await session.runTask(prompt);
  if (result.status !== "finished") {
    throw new Error(`Planlama başarısız oldu (status=${result.status}, runId=${result.runId}).`);
  }

  const parsed = extractJson(result.text) as PlanStep[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Plan boş döndü.");
  }
  const steps = parsed.map((s, i) => ({
    id: typeof s.id === "number" ? s.id : i + 1,
    title: String(s.title ?? `Adım ${i + 1}`),
    detail: String(s.detail ?? s.title ?? ""),
  }));

  log.success(`Plan hazır: ${steps.length} adım`);
  steps.forEach((s) => log.info(`  ${s.id}. ${s.title}`));
  return steps;
}

/**
 * 2. AŞAMA — Uygulama.
 * Her adımı aynı oturumda çalıştırır; bağlam korunduğu için bot
 * önceki adımlarda ne yaptığını bilir. Bir adım hata verirse durur.
 */
export async function executePlan(
  session: AgentSession,
  steps: PlanStep[],
): Promise<StepOutcome[]> {
  const outcomes: StepOutcome[] = [];

  for (const step of steps) {
    log.step(`Adım ${step.id}/${steps.length}: ${step.title}`);
    const prompt = [
      `Şu adımı şimdi uygula: ${step.title}`,
      step.detail,
      "Gereken dosya değişikliklerini yap. Bittiğinde ne yaptığını 1-2 cümleyle özetle.",
    ].join("\n");

    const result = await session.runTask(prompt);
    outcomes.push({ step, result });

    if (result.status !== "finished") {
      log.error(`Adım ${step.id} başarısız (status=${result.status}). Pipeline durduruluyor.`);
      break;
    }
    log.success(`Adım ${step.id} tamamlandı.`);
  }

  return outcomes;
}

/** Uçtan uca: planla → uygula → özet döndür. */
export async function runProject(
  session: AgentSession,
  userRequest: string,
): Promise<StepOutcome[]> {
  const steps = await buildPlan(session, userRequest);
  return executePlan(session, steps);
}
