/**
 * Silent error logger — schickt Fehler per Telegram an Michael.
 * Nie im UI sichtbar, nur für Debugging.
 */
const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string;
const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID as string;

export async function logError(context: string, error: unknown): Promise<void> {
  console.error(`[PIX] ${context}:`, error);
  if (!token || !chatId) return;

  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack
      ? '\n' + error.stack.split('\n').slice(0, 3).join('\n')
      : '';
    const text = [
      '⚠️ PIX Website Fehler',
      '',
      `Kontext: ${context}`,
      `Fehler: ${message}${stack}`,
      '',
      `🕐 ${new Date().toLocaleString('de-DE')}`,
      `🌐 ${typeof window !== 'undefined' ? window.location.href : ''}`,
    ].join('\n');

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // never throw from logger
  }
}
