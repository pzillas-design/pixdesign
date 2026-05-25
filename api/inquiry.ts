import { handleOptions, json, readBody, telegramSend } from './_shared.js';

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;

  try {
    const body = await readBody(req);
    const fields = body.fields && typeof body.fields === 'object' ? body.fields as Record<string, string> : {};
    const lines = ['Neue Anfrage via PIX Website', ''];
    for (const [key, val] of Object.entries(fields)) {
      if (val) lines.push(`${key}: ${val}`);
    }
    lines.push('', new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }));
    await telegramSend(lines.join('\n'));
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}
