import { handleOptions, json, pickString, readBody, telegramSend } from './_shared.js';

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;

  try {
    const body = await readBody(req);
    if (body.type === 'chat_session') {
      // Backup in Vercel Runtime Logs — VOR Telegram. Filterbar mit "PIX-CHAT".
      console.log('[PIX-CHAT]', pickString(body.text).slice(0, 3800));
      await telegramSend(`💬 Gespräch\n\n${pickString(body.text).slice(0, 3800)}`);
    } else if (body.type === 'error') {
      console.error('[PIX-ERROR]', pickString(body.context), pickString(body.message), pickString(body.href));
      await telegramSend([
        'PIX Website Fehler',
        '',
        `Kontext: ${pickString(body.context)}`,
        `Fehler: ${pickString(body.message)}`,
        pickString(body.stack),
        '',
        new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
        pickString(body.href),
      ].filter(Boolean).join('\n'));
    }
    return json(res, 200, { ok: true });
  } catch {
    return json(res, 200, { ok: false });
  }
}
