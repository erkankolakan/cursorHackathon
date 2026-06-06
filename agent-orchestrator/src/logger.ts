/**
 * Basit, renkli ve yapılandırılmış log. Hackathon'da okunabilir çıktı,
 * production'da `grep`'lenebilir satırlar verir.
 */
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

export const log = {
  info(msg: string): void {
    console.log(`${colors.dim}${ts()}${colors.reset} ${colors.blue}ℹ${colors.reset} ${msg}`);
  },
  step(msg: string): void {
    console.log(`${colors.dim}${ts()}${colors.reset} ${colors.cyan}▶${colors.reset} ${msg}`);
  },
  success(msg: string): void {
    console.log(`${colors.dim}${ts()}${colors.reset} ${colors.green}✓${colors.reset} ${msg}`);
  },
  warn(msg: string): void {
    console.warn(`${colors.dim}${ts()}${colors.reset} ${colors.yellow}⚠${colors.reset} ${msg}`);
  },
  error(msg: string): void {
    console.error(`${colors.dim}${ts()}${colors.reset} ${colors.red}✗${colors.reset} ${msg}`);
  },
  /** Agent'ın canlı ürettiği metni satır içi yazar (newline eklemeden). */
  stream(text: string): void {
    process.stdout.write(`${colors.dim}${text}${colors.reset}`);
  },
};
