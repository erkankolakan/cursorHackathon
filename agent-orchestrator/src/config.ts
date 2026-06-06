import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Minimal .env yükleyici (harici bağımlılık olmadan).
 * Sadece henüz process.env içinde olmayan anahtarları set eder.
 */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export interface AppConfig {
  apiKey: string;
  model: string;
  targetCwd: string;
}

/**
 * Ortam değişkenlerini okuyup doğrular. Eksik/yanlış kimlik bilgisi
 * varsa erkenden, net bir mesajla patlar (sessiz hata yerine).
 */
export function loadConfig(): AppConfig {
  loadEnvFile(resolve(process.cwd(), ".env"));

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "CURSOR_API_KEY tanımlı değil. `.env.example` dosyasını `.env` olarak kopyalayıp anahtarını gir.\n" +
        "Anahtar: https://cursor.com/dashboard/integrations",
    );
  }
  if (!apiKey.startsWith("cursor_") && !apiKey.startsWith("crsr_")) {
    console.warn(
      "[uyarı] CURSOR_API_KEY beklenen ön ekle (cursor_ / crsr_) başlamıyor; yanlış değer kopyalanmış olabilir.",
    );
  }

  const model = process.env.CURSOR_MODEL?.trim() || "composer-2.5";
  const targetCwd = process.env.TARGET_CWD?.trim()
    ? resolve(process.env.TARGET_CWD.trim())
    : process.cwd();

  return { apiKey, model, targetCwd };
}
