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

export async function logChat(role: 'user' | 'agent', text: string): Promise<void> {
  await serverLog({ type: 'chat', role, text });
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
