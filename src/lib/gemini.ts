import { logError, logChat } from './logger';

export type GalleryCategory = 'web' | 'photo' | 'video';

export type RuntimeContext = {
  activeBranch?: string;
};

let runtimeContext: RuntimeContext = {};

export function setRuntimeContext(ctx: RuntimeContext) {
  runtimeContext = ctx;
}

type Turn = { role: 'user' | 'model'; text: string };
let history: Turn[] = [];

export function resetSession() {
  history = [];
}

export function appendModelTurn(text: string) {
  history.push({ role: 'model', text });
}

export type AIResponse = {
  text: string;
  gallery?: GalleryCategory;
  showImages?: string[];
  sendEmail?: Record<string, string>;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`);
  }
  return data as T;
}

export async function sendMessage(message: string): Promise<AIResponse> {
  try {
    const logText = message.includes('Nachricht des Besuchers:')
      ? (message.split('Nachricht des Besuchers:').pop()?.trim() ?? message)
      : message;
    logChat('user', logText);
    history.push({ role: 'user', text: message });
    const response = await postJson<AIResponse>('/api/chat', { history, runtimeContext });
    if (response.text) {
      logChat('agent', response.text);
      history.push({ role: 'model', text: response.text });
    }
    return response;
  } catch (error) {
    history.pop(); // remove failed user turn
    logError('sendMessage', error);
    return { text: 'Es gab einen Verbindungsfehler. Bitte nochmal versuchen.' };
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const data = await postJson<{ audio?: string }>('/api/tts', { text });
    return data.audio ?? null;
  } catch {
    return null;
  }
}

export async function sendInquiry(fields: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    return await postJson<{ ok: boolean; error?: string }>('/api/inquiry', { fields });
  } catch (error) {
    logError('sendInquiry', error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
