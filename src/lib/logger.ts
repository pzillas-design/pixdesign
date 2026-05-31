// Chat-Nachrichten werden gebündelt und erst nach 90s Inaktivität
// (oder beim Verlassen der Seite) als eine Telegram-Nachricht geschickt.

const FLUSH_DELAY_MS = 90_000;

type ChatEntry = { role: 'user' | 'agent'; text: string };

let buffer: ChatEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let unloadRegistered = false;
let pageLeaving = false;

// True, wenn der User die Seite gerade verlässt/in den Hintergrund schickt.
// Wird genutzt um abgebrochene Requests (kein echter Fehler) nicht zu melden.
export function isPageLeaving(): boolean {
  return pageLeaving || (typeof document !== 'undefined' && document.visibilityState === 'hidden');
}

async function serverLog(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // never throw from logger
  }
}

function formatBuffer(entries: ChatEntry[]): string {
  return entries.map((e) => `${e.role === 'user' ? '👤' : '🤖'} ${e.text}`).join('\n\n');
}

function flush(): void {
  if (buffer.length === 0) return;
  const entries = [...buffer];
  buffer = [];
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  serverLog({ type: 'chat_session', text: formatBuffer(entries) });
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

function ensureUnloadListener(): void {
  if (unloadRegistered || typeof window === 'undefined') return;
  unloadRegistered = true;
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { pageLeaving = true; flush(); }
    else { pageLeaving = false; }
  });
  window.addEventListener('pagehide', () => { pageLeaving = true; flush(); });
}

export function logChat(role: 'user' | 'agent', text: string): void {
  ensureUnloadListener();
  buffer.push({ role, text });
  scheduleFlush();
}

export async function logError(context: string, error: unknown): Promise<void> {
  console.error(`[PIX] ${context}:`, error);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack
    ? error.stack.split('\n').slice(0, 3).join('\n')
    : '';
  await serverLog({
    type: 'error',
    context,
    message,
    stack,
    href: typeof window !== 'undefined' ? window.location.href : '',
  });
}
