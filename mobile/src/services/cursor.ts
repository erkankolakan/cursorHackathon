// ─── Cursor SDK Backend İstemcisi ───────────────────────────────────────────
// Mobil, @cursor/sdk'yı doğrudan çalıştıramaz (Node kütüphanesi). Bu servis
// backend'e HTTP/SSE ile konuşur. Streaming, React Native'de fetch body reader
// güvenilir olmadığından XMLHttpRequest ile yapılır.

const BASE_URL =
  process.env.EXPO_PUBLIC_CURSOR_API_URL ?? 'http://localhost:4000';

export interface ModelListItem {
  id: string;
  [key: string]: unknown;
}

export interface PromptResult {
  id: string;
  status: string;
  result?: string;
}

export class CursorBackendError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'CursorBackendError';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new CursorBackendError(
      res.status,
      (body as { error?: string }).error ?? `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

/** Backend sağlık kontrolü. */
export function health() {
  return getJson<{
    ok: boolean;
    runtime: string;
    model: string;
    workspace?: string;
  }>('/health');
}

/** Kullanılabilir modeller. */
export async function listModels(): Promise<ModelListItem[]> {
  const { data } = await getJson<{ data: ModelListItem[] }>('/v1/models');
  return data;
}

/** Tek seferlik prompt — tam sonucu döner. */
export async function prompt(text: string): Promise<PromptResult> {
  const res = await fetch(`${BASE_URL}/v1/agent/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: text }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CursorBackendError(
      res.status,
      (body as { error?: string }).error ?? `HTTP ${res.status}`
    );
  }
  return (body as { data: PromptResult }).data;
}

export interface StreamHandlers {
  onText: (chunk: string) => void;
  onIds?: (ids: { agentId: string; runId: string }) => void;
  onDone?: (info: { id: string; status: string }) => void;
  onError?: (message: string) => void;
}

/**
 * Streaming prompt — backend SSE'sini XHR ile okur.
 * Geriye iptal fonksiyonu döner.
 */
export function streamPrompt(text: string, handlers: StreamHandlers): () => void {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${BASE_URL}/v1/agent/stream`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  let processed = 0; // responseText içinde nereye kadar işledik

  const dispatch = (eventName: string, dataLine: string) => {
    let payload: unknown = {};
    try {
      payload = JSON.parse(dataLine);
    } catch {
      // yok say
    }
    switch (eventName) {
      case 'text':
        handlers.onText((payload as { text: string }).text ?? '');
        break;
      case 'ids':
        handlers.onIds?.(payload as { agentId: string; runId: string });
        break;
      case 'done':
        handlers.onDone?.(payload as { id: string; status: string });
        break;
      case 'error':
        handlers.onError?.((payload as { message: string }).message ?? 'Hata');
        break;
    }
  };

  // SSE bloklarını (çift \n ile ayrılmış) ayrıştır.
  const parseBuffer = () => {
    const full = xhr.responseText;
    const buffer = full.slice(processed);
    const blocks = buffer.split('\n\n');
    // Son parça yarım olabilir; onu bırak.
    for (let i = 0; i < blocks.length - 1; i++) {
      const block = blocks[i];
      if (!block) continue;
      let eventName = 'message';
      let dataLine = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
      }
      if (dataLine) dispatch(eventName, dataLine);
    }
    processed += blocks.slice(0, -1).join('\n\n').length;
    if (blocks.length > 1) processed += (blocks.length - 1) * 2; // ayraçlar
  };

  xhr.onprogress = parseBuffer;
  xhr.onload = () => {
    parseBuffer();
  };
  xhr.onerror = () => handlers.onError?.('Ağ hatası — backend çalışıyor mu?');

  xhr.send(JSON.stringify({ prompt: text }));

  return () => xhr.abort();
}

export const cursor = { health, listModels, prompt, streamPrompt };
