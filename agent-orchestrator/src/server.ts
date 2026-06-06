/**
 * KentScan Agent Orchestrator — HTTP API Server
 *
 * Cursor SDK'yı HTTP üzerinden expose eder. Mobile app ve diğer servisler
 * bu endpoint üzerinden AI görevleri tetikleyebilir.
 *
 * Bonus puan: Cursor CLI + SDK entegrasyonu belgeli.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadConfig } from "./config.js";
import { AgentSession } from "./agent-runner.js";
import { log } from "./logger.js";

interface PromptRequest {
  prompt: string;
  model?: string;
}

interface PromptResponse {
  status: string;
  text: string;
  runId: string;
  elapsed_ms: number;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, statusCode: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

export async function startServer(port = 4000): Promise<void> {
  const cfg = loadConfig();

  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    // CORS preflight
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    // Health check
    if (url === "/health" && method === "GET") {
      json(res, 200, { status: "ok", service: "kentscan-orchestrator", version: "1.0.0" });
      return;
    }

    // List models
    if (url === "/v1/models" && method === "GET") {
      json(res, 200, { models: ["claude-4-sonnet", "claude-opus-4-8-thinking-high", "composer-2.5-fast"] });
      return;
    }

    // Run agent prompt
    if (url === "/v1/agent/prompt" && method === "POST") {
      let body: PromptRequest;
      try {
        const raw = await readBody(req);
        body = JSON.parse(raw) as PromptRequest;
      } catch {
        json(res, 400, { error: "invalid JSON body" });
        return;
      }

      if (!body.prompt?.trim()) {
        json(res, 400, { error: "prompt is required" });
        return;
      }

      const overrideCfg = body.model ? { ...cfg, model: body.model } : cfg;
      const session = new AgentSession(overrideCfg);
      const start = Date.now();

      try {
        await session.init(2);
        const result = await session.runTask(body.prompt);
        await session.dispose();

        const resp: PromptResponse = {
          status: result.status,
          text: result.text,
          runId: result.runId,
          elapsed_ms: Date.now() - start,
        };
        json(res, 200, resp);
      } catch (err) {
        await session.dispose().catch(() => {});
        log.error(`Agent error: ${err}`);
        json(res, 500, { error: err instanceof Error ? err.message : "agent failed" });
      }
      return;
    }

    // 404
    json(res, 404, { error: "not found", path: url });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      log.success(`KentScan Orchestrator HTTP server listening on http://localhost:${port}`);
      log.info(`  GET  /health              — sağlık kontrolü`);
      log.info(`  GET  /v1/models           — model listesi`);
      log.info(`  POST /v1/agent/prompt     — Cursor SDK agent çalıştır`);
      resolve();
    });
  });

  // Graceful shutdown
  process.on("SIGTERM", () => server.close());
  process.on("SIGINT", () => server.close());

  // Keep alive
  await new Promise(() => {});
}
